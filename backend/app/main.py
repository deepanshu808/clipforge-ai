import asyncio
import hashlib
import json
import os
import shutil
import subprocess
import tempfile
import threading
import time
import uuid
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

import httpx
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field
from starlette.background import BackgroundTask

from app.clip_detector import detect_highlights, transcribe_wav
from app.payments import router as payments_router
from app.storage import (
    build_project_zip,
    check_storage_writable,
    cleanup_project_temp,
    create_job,
    create_project,
    delete_clip_record,
    ensure_storage_dirs,
    get_clip,
    get_clips_for_project,
    get_job,
    get_project,
    get_project_processed_dir,
    get_project_temp_dir,
    get_project_upload_dir,
    init_db,
    list_projects,
    replace_project_clips,
    resolve_secure_download_path,
    sanitize_filename,
    update_job,
    update_project,
    upsert_clip,
)
from app.video_processor import (
    ASPECT_RESOLUTIONS,
    CAPTION_STYLE_PRESETS,
    FFmpegNotAvailableError,
    VideoProcessingError,
    check_ffmpeg_health,
    cut_and_render_clip,
    extract_audio_wav,
    probe_video,
    require_ffmpeg,
    write_ass,
    write_srt,
)

# ---------------------------------------------------------------------------
# Public Launch Safety Configuration (override anytime in Railway Variables)
# ---------------------------------------------------------------------------
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "150"))
MAX_WORKERS = max(1, int(os.getenv("MAX_WORKERS", "2")))
MAX_ACTIVE_JOBS = max(MAX_WORKERS, int(os.getenv("MAX_ACTIVE_JOBS", "6")))
RATE_LIMIT_UPLOADS = max(1, int(os.getenv("RATE_LIMIT_UPLOADS", "5")))
RATE_LIMIT_WINDOW_MIN = max(1, int(os.getenv("RATE_LIMIT_WINDOW_MIN", "15")))
AUTO_CLEANUP_HOURS = max(1, int(os.getenv("AUTO_CLEANUP_HOURS", "3")))

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_API_KEY = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or os.getenv("SUPABASE_KEY")
    or os.getenv("SUPABASE_ANON_KEY")
    or ""
).strip()

CORS_ORIGINS_RAW = os.getenv("CORS_ORIGINS", "*")
CORS_ORIGINS = [o.strip() for o in CORS_ORIGINS_RAW.split(",") if o.strip()] or ["*"]

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv", ".avi"}

STORAGE_DIRS = ensure_storage_dirs()
init_db()

EXECUTOR = ThreadPoolExecutor(max_workers=MAX_WORKERS, thread_name_prefix="clipforge-worker")

# ---------------------------------------------------------------------------
# Per-User Project Ownership Store (Stored inside /data alongside SQLite DB)
# ---------------------------------------------------------------------------
_OWNERS_FILE = Path(STORAGE_DIRS["data_dir"]) / "project_owners.json"
_OWNERS_LOCK = threading.Lock()


def _read_owners_unlocked() -> Dict[str, str]:
    if not _OWNERS_FILE.exists():
        return {}
    try:
        raw = json.loads(_OWNERS_FILE.read_text(encoding="utf-8"))
        if isinstance(raw, dict):
            return {str(k): str(v) for k, v in raw.items() if k and v}
    except Exception:
        pass
    return {}


def _write_owners_unlocked(mapping: Dict[str, str]) -> None:
    tmp_path = _OWNERS_FILE.with_suffix(".json.tmp")
    try:
        tmp_path.write_text(json.dumps(mapping), encoding="utf-8")
        os.replace(tmp_path, _OWNERS_FILE)
    except Exception as exc:
        print(f"[ClipForge AI] Could not write project_owners.json: {exc}", flush=True)


def _set_project_owner(project_id: str, user_id: str) -> None:
    if not project_id or not user_id:
        return
    with _OWNERS_LOCK:
        mapping = _read_owners_unlocked()
        mapping[str(project_id)] = str(user_id)
        _write_owners_unlocked(mapping)


def _get_project_owner(project_id: str) -> Optional[str]:
    with _OWNERS_LOCK:
        return _read_owners_unlocked().get(str(project_id))


def _remove_project_owner(project_id: str) -> None:
    with _OWNERS_LOCK:
        mapping = _read_owners_unlocked()
        if str(project_id) in mapping:
            mapping.pop(str(project_id), None)
            _write_owners_unlocked(mapping)


# ---------------------------------------------------------------------------
# Supabase JWT Verification (with 5-minute in-memory cache)
# ---------------------------------------------------------------------------
_AUTH_CACHE_LOCK = threading.Lock()
_AUTH_CACHE: Dict[str, Tuple[str, float]] = {}  # sha256(token) -> (user_id, expires_at)
_AUTH_CACHE_TTL_SEC = 300.0


def _extract_bearer_token(request: Request) -> Optional[str]:
    auth_header = (request.headers.get("authorization") or "").strip()
    if not auth_header.lower().startswith("bearer "):
        return None
    token = auth_header[7:].strip()
    return token or None


def _verify_supabase_token_sync(token: str) -> Optional[str]:
    if not token or not SUPABASE_URL or not SUPABASE_API_KEY:
        return None

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    now = time.time()
    with _AUTH_CACHE_LOCK:
        cached = _AUTH_CACHE.get(token_hash)
        if cached and cached[1] > now:
            return cached[0]

    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": SUPABASE_API_KEY,
                },
            )
        if resp.status_code != 200:
            return None
        data = resp.json()
        user_id = str(data.get("id") or "").strip()
        if not user_id:
            return None
        with _AUTH_CACHE_LOCK:
            if len(_AUTH_CACHE) > 2000:
                _AUTH_CACHE.clear()
            _AUTH_CACHE[token_hash] = (user_id, now + _AUTH_CACHE_TTL_SEC)
        return user_id
    except Exception as exc:
        print(f"[ClipForge AI] Supabase token verify error: {exc}", flush=True)
        return None


def _get_authenticated_user_id(request: Request, required: bool = False) -> Optional[str]:
    token = _extract_bearer_token(request)
    if not token:
        if required and SUPABASE_URL and SUPABASE_API_KEY:
            raise HTTPException(
                status_code=401,
                detail="Authentication required. Please sign in to ClipForge AI and try again.",
            )
        return None

    user_id = _verify_supabase_token_sync(token)
    if not user_id and required and SUPABASE_URL and SUPABASE_API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Your session has expired. Please sign in again.",
        )
    return user_id


def _assert_project_access_if_authenticated(request: Request, project_id: str) -> None:
    """If a Bearer token is supplied, ensure the caller owns the target project."""
    token = _extract_bearer_token(request)
    if not token:
        return
    user_id = _verify_supabase_token_sync(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session token.")
    owner_id = _get_project_owner(project_id)
    if owner_id and owner_id != user_id:
        raise HTTPException(status_code=403, detail="You do not have permission to access this project.")


# ---------------------------------------------------------------------------
# In-Memory Rate Limiter & Active Queue Protection
# ---------------------------------------------------------------------------
_RATE_LOCK = threading.Lock()
_IP_UPLOAD_HISTORY: Dict[str, List[float]] = defaultdict(list)

_JOB_LOCK = threading.Lock()
_ACTIVE_JOBS = 0


def _get_client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for", "").strip()
    if xff:
        return xff.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _enforce_rate_limit(request: Request) -> None:
    ip = _get_client_ip(request)
    now = time.time()
    window_sec = RATE_LIMIT_WINDOW_MIN * 60
    with _RATE_LOCK:
        recent = [ts for ts in _IP_UPLOAD_HISTORY[ip] if now - ts < window_sec]
        if len(recent) >= RATE_LIMIT_UPLOADS:
            retry_after = max(1, int(window_sec - (now - recent[0])))
            raise HTTPException(
                status_code=429,
                detail=(
                    f"Too many uploads from your connection. "
                    f"Limit is {RATE_LIMIT_UPLOADS} uploads per {RATE_LIMIT_WINDOW_MIN} minutes. "
                    f"Please wait ~{max(1, retry_after // 60)} minute(s) and try again."
                ),
            )
        recent.append(now)
        _IP_UPLOAD_HISTORY[ip] = recent


def _check_queue_capacity() -> None:
    with _JOB_LOCK:
        if _ACTIVE_JOBS >= MAX_ACTIVE_JOBS:
            raise HTTPException(
                status_code=503,
                detail="Server is currently busy processing other videos. Please try again in 1–2 minutes.",
            )


def _submit_protected_job(fn: Callable[..., Any], *args: Any) -> None:
    global _ACTIVE_JOBS
    with _JOB_LOCK:
        if _ACTIVE_JOBS >= MAX_ACTIVE_JOBS:
            raise HTTPException(
                status_code=503,
                detail="Server is currently busy processing other videos. Please try again in 1–2 minutes.",
            )
        _ACTIVE_JOBS += 1

    def _wrapped() -> None:
        global _ACTIVE_JOBS
        try:
            fn(*args)
        finally:
            with _JOB_LOCK:
                _ACTIVE_JOBS = max(0, _ACTIVE_JOBS - 1)

    try:
        EXECUTOR.submit(_wrapped)
    except Exception:
        with _JOB_LOCK:
            _ACTIVE_JOBS = max(0, _ACTIVE_JOBS - 1)
        raise


# ---------------------------------------------------------------------------
# Automatic Disk Cleanup (Prevents Railway Disk Full Errors)
# ---------------------------------------------------------------------------
def _project_age_seconds(project: Dict[str, Any], now: float) -> Optional[float]:
    source_path_str = project.get("source_path")
    if source_path_str:
        src = Path(source_path_str)
        if src.exists():
            try:
                return max(0.0, now - src.stat().st_mtime)
            except OSError:
                pass

    created_raw = project.get("created_at")
    if created_raw is None:
        return None
    if isinstance(created_raw, (int, float)):
        return max(0.0, now - float(created_raw))

    text = str(created_raw).strip()
    if not text:
        return None
    for candidate in (text.replace("Z", "+00:00"), text.replace(" ", "T")):
        try:
            dt = datetime.fromisoformat(candidate)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return max(0.0, now - dt.timestamp())
        except ValueError:
            continue
    return None


def _cleanup_old_projects_once() -> int:
    now = time.time()
    cutoff_sec = AUTO_CLEANUP_HOURS * 3600
    cleaned = 0
    try:
        projects = list_projects()
    except Exception as exc:
        print(f"[ClipForge AI] Auto-cleanup skipped (DB read error): {exc}", flush=True)
        return 0

    for proj in projects:
        status = str(proj.get("status") or "").lower()
        if status in ("queued", "processing", "expired"):
            continue

        age = _project_age_seconds(proj, now)
        if age is None or age < cutoff_sec:
            continue

        pid = proj["id"]
        try:
            cleanup_project_temp(pid)

            src_str = proj.get("source_path")
            if src_str:
                src_path = Path(src_str)
                if src_path.parent.exists() and pid in src_path.parent.name:
                    shutil.rmtree(src_path.parent, ignore_errors=True)
                elif src_path.exists():
                    src_path.unlink(missing_ok=True)

            clips = get_clips_for_project(pid)
            removed_proc_dir = False
            for clip in clips:
                for key in ("video_path", "thumbnail_path", "srt_path", "ass_path"):
                    fpath_str = clip.get(key)
                    if not fpath_str:
                        continue
                    fpath = Path(fpath_str)
                    if not removed_proc_dir and pid in fpath.parent.name and fpath.parent.exists():
                        shutil.rmtree(fpath.parent, ignore_errors=True)
                        removed_proc_dir = True
                    elif fpath.exists():
                        fpath.unlink(missing_ok=True)

            proc_dir = get_project_processed_dir(pid)
            if pid in proc_dir.name and proc_dir.exists():
                shutil.rmtree(proc_dir, ignore_errors=True)

            upload_dir = get_project_upload_dir(pid)
            if pid in upload_dir.name and upload_dir.exists():
                shutil.rmtree(upload_dir, ignore_errors=True)

            update_project(
                pid,
                status="expired",
                error_message=f"Auto-deleted after {AUTO_CLEANUP_HOURS}h to keep server storage fast.",
            )
            _remove_project_owner(pid)
            cleaned += 1
        except Exception as exc:
            print(f"[ClipForge AI] Cleanup error for {pid}: {exc}", flush=True)

    if cleaned:
        print(f"[ClipForge AI] Auto-cleanup cleared disk files for {cleaned} expired project(s).", flush=True)
    return cleaned


async def _periodic_cleanup_loop() -> None:
    while True:
        try:
            await asyncio.to_thread(_cleanup_old_projects_once)
        except asyncio.CancelledError:
            break
        except Exception as exc:
            print(f"[ClipForge AI] Periodic cleanup loop error: {exc}", flush=True)
        await asyncio.sleep(900)  # Check every 15 minutes


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    cleanup_task = asyncio.create_task(_periodic_cleanup_loop())
    try:
        yield
    finally:
        cleanup_task.cancel()
        try:
            await cleanup_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="ClipForge AI — Standalone FastAPI + FFmpeg Backend",
    version="2.3.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=(CORS_ORIGINS != ["*"]),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(payments_router)


# ---------------------------------------------------------------------------
# Serialization Helpers
# ---------------------------------------------------------------------------
def _serialize_clip(clip: Dict[str, Any]) -> Dict[str, Any]:
    mp4_path = Path(clip["video_path"])
    exists = mp4_path.exists() and mp4_path.stat().st_size > 0
    verified = bool(clip.get("file_verified") and exists)
    pid = clip["project_id"]
    cid = clip["id"]
    vid_file = clip["video_filename"]
    thumb_file = clip.get("thumbnail_filename")
    srt_file = clip.get("srt_filename")

    try:
        captions = json.loads(clip.get("captions_json") or "[]")
    except Exception:
        captions = []

    return {
        "id": cid,
        "project_id": pid,
        "clip_index": clip["clip_index"],
        "title": clip["title"],
        "highlight_description": clip["highlight_description"],
        "transcript": clip["transcript"],
        "engagement_score": clip["engagement_score"],
        "start_sec": clip["start_sec"],
        "end_sec": clip["end_sec"],
        "duration_sec": clip["duration_sec"],
        "verified_duration_sec": clip["verified_duration_sec"],
        "aspect_ratio": clip["aspect_ratio"],
        "resolution": clip["resolution"],
        "caption_style": clip["caption_style"],
        "burn_captions": bool(clip["burn_captions"]),
        "captions": captions,
        "file_size_bytes": mp4_path.stat().st_size if exists else 0,
        "file_verified": verified,
        "video_url": f"/downloads/{pid}/{vid_file}" if verified else None,
        "download_url": f"/downloads/{pid}/{vid_file}?download=1" if verified else None,
        "thumbnail_url": f"/downloads/{pid}/thumbnails/{thumb_file}" if (thumb_file and clip.get("thumbnail_path") and Path(clip["thumbnail_path"]).exists()) else None,
        "srt_url": f"/downloads/{pid}/captions/{srt_file}" if (srt_file and clip.get("srt_path") and Path(clip["srt_path"]).exists()) else None,
    }


def _serialize_project(project: Dict[str, Any], include_clips: bool = True) -> Dict[str, Any]:
    try:
        candidates = json.loads(project.get("candidates_json") or "[]")
    except Exception:
        candidates = []

    data: Dict[str, Any] = {
        "id": project["id"],
        "title": project["title"],
        "source_type": project["source_type"],
        "source_filename": project["source_filename"],
        "source_size_bytes": project["source_size_bytes"],
        "source_duration": project["source_duration"],
        "source_width": project["source_width"],
        "source_height": project["source_height"],
        "has_audio": bool(project["has_audio"]),
        "mode": project["mode"],
        "target_duration": project["target_duration"],
        "max_clips": project["max_clips"],
        "aspect_ratio": project["aspect_ratio"],
        "caption_language": project["caption_language"],
        "caption_style": project["caption_style"],
        "burn_captions": bool(project["burn_captions"]),
        "status": project["status"],
        "stage_index": project["stage_index"],
        "stage_name": project["stage_name"],
        "progress_percent": project["progress_percent"],
        "failed_stage": project["failed_stage"],
        "error_message": project["error_message"],
        "analysis_method": project["analysis_method"],
        "candidates": candidates,
        "created_at": project["created_at"],
        "zip_download_url": f"/downloads/{project['id']}/all.zip" if project["status"] == "completed" else None,
    }
    if include_clips:
        clips = [_serialize_clip(c) for c in get_clips_for_project(project["id"])]
        data["clips"] = clips
        data["verified_clip_count"] = sum(1 for c in clips if c["file_verified"])
    return data


def _serialize_job(job: Dict[str, Any]) -> Dict[str, Any]:
    try:
        result = json.loads(job.get("result_json") or "{}")
    except Exception:
        result = {}
    project = get_project(job["project_id"])
    return {
        "job_id": job["id"],
        "project_id": job["project_id"],
        "job_type": job["job_type"],
        "status": job["status"],
        "stage_index": job["stage_index"],
        "stage_name": job["stage_name"],
        "progress_percent": job["progress_percent"],
        "failed_stage": job["failed_stage"],
        "error_message": job["error_message"],
        "result": result,
        "clips": [_serialize_clip(c) for c in get_clips_for_project(job["project_id"])] if job["status"] == "completed" else [],
        "zip_download_url": f"/downloads/{job['project_id']}/all.zip" if (project and project["status"] == "completed") else None,
        "created_at": job["created_at"],
        "updated_at": job["updated_at"],
    }


# ---------------------------------------------------------------------------
# Background Worker Tasks
# ---------------------------------------------------------------------------
def _set_progress(project_id: str, job_id: Optional[str], stage_idx: int, stage_name: str, pct: int, status: str = "processing"):
    update_project(
        project_id,
        status=status,
        stage_index=stage_idx,
        stage_name=stage_name,
        progress_percent=pct,
        failed_stage=None,
        error_message=None,
    )
    if job_id:
        update_job(
            job_id,
            status=status,
            stage_index=stage_idx,
            stage_name=stage_name,
            progress_percent=pct,
            failed_stage=None,
            error_message=None,
        )


def _mark_failed(project_id: str, job_id: Optional[str], failed_stage: str, error: Exception):
    msg = str(error)
    update_project(project_id, status="failed", failed_stage=failed_stage, error_message=msg)
    if job_id:
        update_job(job_id, status="failed", failed_stage=failed_stage, error_message=msg)


def _run_analyze_worker(project_id: str, job_id: Optional[str] = None) -> List[Dict[str, Any]]:
    stage = "Extracting Audio"
    try:
        require_ffmpeg()
        project = get_project(project_id)
        if not project:
            raise ValueError("Project not found.")

        source_path = Path(project["source_path"])
        temp_dir = get_project_temp_dir(project_id)

        _set_progress(project_id, job_id, 2, "Extracting Audio", 20)
        probe = probe_video(source_path)
        update_project(
            project_id,
            source_duration=probe.duration,
            source_width=probe.width,
            source_height=probe.height,
            has_audio=1 if probe.has_audio else 0,
        )
        wav_path = extract_audio_wav(source_path, temp_dir / "audio.wav")

        stage = "Transcribing Audio"
        _set_progress(project_id, job_id, 3, "Transcribing Audio", 35)
        transcript_segments, stt_method = transcribe_wav(wav_path, language_pref=project["caption_language"])

        stage = "Analyzing Video"
        _set_progress(project_id, job_id, 4, "Analyzing Video", 48)

        stage = "Finding Best Moments"
        _set_progress(project_id, job_id, 5, "Finding Best Moments", 60)
        candidates, detect_method = detect_highlights(
            video_path=source_path,
            wav_path=wav_path,
            total_duration=probe.duration,
            transcript_segments=transcript_segments,
            target_duration=int(project["target_duration"]),
            max_clips=int(project["max_clips"]),
            mode=project["mode"],
            caption_language=project["caption_language"],
        )
        if not candidates:
            raise VideoProcessingError("No valid highlight segments could be detected.")

        update_project(
            project_id,
            analysis_method=f"{stt_method} + {detect_method}",
            transcript_json=json.dumps(transcript_segments),
            candidates_json=json.dumps(candidates),
            status="analyzed",
            stage_index=5,
            stage_name="Finding Best Moments",
            progress_percent=60,
        )
        if job_id:
            update_job(
                job_id,
                status="completed",
                stage_index=5,
                stage_name="Analysis Completed",
                progress_percent=100,
                result_json=json.dumps({"candidates": candidates, "analysis_method": f"{stt_method} + {detect_method}"}),
            )
        return candidates
    except Exception as exc:
        _mark_failed(project_id, job_id, stage, exc)
        raise
    finally:
        cleanup_project_temp(project_id)


def _run_cut_clips_worker(
    project_id: str,
    job_id: Optional[str] = None,
    custom_clips: Optional[List[Dict[str, Any]]] = None,
    aspect_ratio: Optional[str] = None,
    caption_style: Optional[str] = None,
    burn_captions: Optional[bool] = None,
) -> List[Dict[str, Any]]:
    stage = "Cutting Original Video"
    try:
        require_ffmpeg()
        project = get_project(project_id)
        if not project:
            raise ValueError("Project not found.")

        source_path = Path(project["source_path"])
        if not source_path.exists() or source_path.stat().st_size == 0:
            raise VideoProcessingError("Original uploaded video is missing or empty.")

        candidates = custom_clips
        if not candidates:
            candidates = json.loads(project.get("candidates_json") or "[]")
        if not candidates:
            raise VideoProcessingError("No clip timestamps provided. Run /analyze first or pass clips explicitly.")

        use_aspect = aspect_ratio if aspect_ratio in ASPECT_RESOLUTIONS else project["aspect_ratio"]
        use_style = caption_style if caption_style in CAPTION_STYLE_PRESETS else project["caption_style"]
        use_burn = burn_captions if burn_captions is not None else bool(project["burn_captions"])
        res_w, res_h = ASPECT_RESOLUTIONS[use_aspect]

        out_dir = get_project_processed_dir(project_id)
        created_records: List[Dict[str, Any]] = []
        total = len(candidates)

        for idx, cand in enumerate(candidates, start=1):
            start_s = float(cand["start_sec"])
            end_s = float(cand["end_sec"])
            if end_s - start_s < 0.5:
                raise VideoProcessingError(f"Clip {idx} has invalid timestamps ({start_s}s -> {end_s}s).")

            clip_file = f"clip_{idx:02d}.mp4"
            thumb_file = f"clip_{idx:02d}.jpg"
            srt_file = f"clip_{idx:02d}.srt"
            ass_file = f"clip_{idx:02d}.ass"

            mp4_path = out_dir / clip_file
            thumb_path = out_dir / "thumbnails" / thumb_file
            srt_path = out_dir / "captions" / srt_file
            ass_path = out_dir / "captions" / ass_file

            stage = "Cutting Original Video"
            pct = 62 + int(((idx - 1) / max(1, total)) * 32)
            _set_progress(project_id, job_id, 6, f"Cutting Clip {idx}/{total}", pct)

            title = str(cand.get("suggested_title") or cand.get("title") or f"Clip {idx:02d}")
            captions = cand.get("captions") or []

            stage = "Adding Captions"
            _set_progress(project_id, job_id, 7, f"Adding Captions ({idx}/{total})", min(90, pct + 4))
            write_srt(captions, srt_path)
            write_ass(captions, ass_path, style_name=use_style, play_res_x=res_w, play_res_y=res_h)

            stage = "Rendering MP4"
            _set_progress(project_id, job_id, 8, f"Rendering MP4 ({idx}/{total})", min(94, pct + 8))
            verified = cut_and_render_clip(
                source_path=source_path,
                output_mp4_path=mp4_path,
                thumbnail_path=thumb_path,
                start_sec=start_s,
                end_sec=end_s,
                aspect_ratio=use_aspect,
                ass_path=ass_path if (use_burn and captions) else None,
            )

            stage = "Verifying Output"
            _set_progress(project_id, job_id, 9, f"Verifying Output ({idx}/{total})", 97)
            if not mp4_path.exists() or verified.file_size_bytes == 0:
                raise VideoProcessingError(f"Output verification failed for {clip_file}.")

            created_records.append(
                {
                    "id": f"{project_id}_clip_{idx:02d}",
                    "project_id": project_id,
                    "clip_index": idx,
                    "title": title,
                    "highlight_description": str(cand.get("highlight_description") or ""),
                    "transcript": str(cand.get("transcript") or ""),
                    "engagement_score": int(cand.get("engagement_score") or 82),
                    "start_sec": round(start_s, 2),
                    "end_sec": round(end_s, 2),
                    "duration_sec": round(end_s - start_s, 2),
                    "verified_duration_sec": verified.duration,
                    "aspect_ratio": use_aspect,
                    "resolution": f"{res_w}x{res_h}",
                    "caption_style": use_style,
                    "burn_captions": 1 if use_burn else 0,
                    "captions_json": json.dumps(captions),
                    "video_filename": clip_file,
                    "video_path": str(mp4_path),
                    "thumbnail_filename": thumb_file if thumb_path.exists() else None,
                    "thumbnail_path": str(thumb_path) if thumb_path.exists() else None,
                    "srt_filename": srt_file,
                    "srt_path": str(srt_path),
                    "ass_path": str(ass_path),
                    "file_size_bytes": verified.file_size_bytes,
                    "file_verified": 1,
                }
            )

        if not created_records:
            raise VideoProcessingError("0 verified MP4 clips were generated.")

        replace_project_clips(project_id, created_records)
        _set_progress(project_id, job_id, 10, "Completed", 100, status="completed")
        if job_id:
            update_job(
                job_id,
                status="completed",
                stage_index=10,
                stage_name="Completed",
                progress_percent=100,
                result_json=json.dumps({"clips_generated": len(created_records)}),
            )
        return created_records
    except Exception as exc:
        _mark_failed(project_id, job_id, stage, exc)
        raise


def _run_full_pipeline_worker(project_id: str, job_id: str) -> None:
    try:
        candidates = _run_analyze_worker(project_id, job_id=None)
        _run_cut_clips_worker(project_id, job_id=job_id, custom_clips=candidates)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Upload Helper (Streams in 1 MB chunks + enforces MAX_UPLOAD_MB)
# ---------------------------------------------------------------------------
async def _save_upload_file(file: UploadFile, project_id: str) -> Tuple[str, Path, int]:
    ext = Path(file.filename or "video.mp4").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )
    safe_name = sanitize_filename(file.filename or f"{project_id}{ext}")
    dest_dir = get_project_upload_dir(project_id)
    dest_path = dest_dir / safe_name

    max_bytes = MAX_UPLOAD_MB * 1024 * 1024
    total_bytes = 0
    try:
        with open(dest_path, "wb") as out:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > max_bytes:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds maximum allowed upload size of {MAX_UPLOAD_MB} MB.",
                    )
                out.write(chunk)
    except HTTPException:
        dest_path.unlink(missing_ok=True)
        raise
    except Exception as exc:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Upload write failed: {exc}")

    if total_bytes == 0:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes).")
    return safe_name, dest_path, total_bytes


# ---------------------------------------------------------------------------
# 1. Health Endpoint (/health and /api/health)
# ---------------------------------------------------------------------------
@app.get("/health")
@app.get("/api/health")
def health_check():
    ffmpeg = check_ffmpeg_health()
    storage_ok = check_storage_writable()
    with _JOB_LOCK:
        active_jobs = _ACTIVE_JOBS
    return {
        "status": "ok" if (ffmpeg["available"] and storage_ok) else "degraded",
        "service": "ClipForge AI Backend",
        "ffmpeg_available": ffmpeg["available"],
        "ffprobe_available": ffmpeg["ffprobe_available"],
        "ffmpeg_version": ffmpeg["version"],
        "ffmpeg_error": ffmpeg["error"],
        "storage_writable": storage_ok,
        "data_dir": str(STORAGE_DIRS["data_dir"]),
        "max_upload_mb": MAX_UPLOAD_MB,
        "max_workers": MAX_WORKERS,
        "active_jobs": active_jobs,
        "max_active_jobs": MAX_ACTIVE_JOBS,
        "rate_limit": f"{RATE_LIMIT_UPLOADS} uploads / {RATE_LIMIT_WINDOW_MIN} min",
        "auto_cleanup_hours": AUTO_CLEANUP_HOURS,
        "user_isolation_enabled": bool(SUPABASE_URL and SUPABASE_API_KEY),
        "ai_configured": bool(os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")),
        "caption_styles": list(CAPTION_STYLE_PRESETS.keys()),
        "aspect_ratios": list(ASPECT_RESOLUTIONS.keys()),
    }


# ---------------------------------------------------------------------------
# 2. Standalone /upload Endpoint
# ---------------------------------------------------------------------------
@app.post("/upload")
async def upload_video(
    request: Request,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    mode: str = Form("Best Moments"),
    target_duration: int = Form(30),
    max_clips: int = Form(5),
    aspect_ratio: str = Form("9:16"),
    caption_language: str = Form("English"),
    caption_style: str = Form("Bold Viral"),
    burn_captions: bool = Form(True),
    copyright_confirmed: bool = Form(True),
):
    user_id = await asyncio.to_thread(_get_authenticated_user_id, request, True)
    _enforce_rate_limit(request)
    ffmpeg = check_ffmpeg_health()
    if not ffmpeg["available"]:
        raise HTTPException(status_code=503, detail=ffmpeg["error"])
    if not copyright_confirmed:
        raise HTTPException(status_code=400, detail="Copyright ownership/authorization confirmation is required.")

    project_id = f"project_{uuid.uuid4().hex[:10]}"
    safe_name, dest_path, total_bytes = await _save_upload_file(file, project_id)

    try:
        probe = probe_video(dest_path)
    except Exception as exc:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"Uploaded file is not a valid decodable video: {exc}")

    project = create_project(
        {
            "id": project_id,
            "title": (title or Path(safe_name).stem).strip(),
            "source_type": "upload",
            "source_filename": safe_name,
            "source_path": str(dest_path),
            "source_size_bytes": total_bytes,
            "source_duration": probe.duration,
            "source_width": probe.width,
            "source_height": probe.height,
            "has_audio": 1 if probe.has_audio else 0,
            "copyright_confirmed": 1,
            "mode": mode,
            "target_duration": max(5, min(180, int(target_duration))),
            "max_clips": max(1, min(15, int(max_clips))),
            "aspect_ratio": aspect_ratio if aspect_ratio in ASPECT_RESOLUTIONS else "9:16",
            "caption_language": caption_language,
            "caption_style": caption_style if caption_style in CAPTION_STYLE_PRESETS else "Bold Viral",
            "burn_captions": 1 if burn_captions else 0,
            "status": "uploaded",
            "stage_index": 1,
            "stage_name": "Uploaded",
            "progress_percent": 15,
        }
    )
    if user_id:
        _set_project_owner(project_id, user_id)
    return {"project_id": project["id"], "project": _serialize_project(project)}


# ---------------------------------------------------------------------------
# 3. Standalone /analyze Endpoint (Background Job)
# ---------------------------------------------------------------------------
class AnalyzeRequest(BaseModel):
    project_id: str
    mode: Optional[str] = None
    target_duration: Optional[int] = Field(default=None, ge=5, le=180)
    max_clips: Optional[int] = Field(default=None, ge=1, le=15)
    caption_language: Optional[str] = None


@app.post("/analyze")
def analyze_video(request: Request, req: AnalyzeRequest):
    _assert_project_access_if_authenticated(request, req.project_id)
    _check_queue_capacity()
    try:
        require_ffmpeg()
    except FFmpegNotAvailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    project = get_project(req.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    updates: Dict[str, Any] = {}
    if req.mode:
        updates["mode"] = req.mode
    if req.target_duration is not None:
        updates["target_duration"] = req.target_duration
    if req.max_clips is not None:
        updates["max_clips"] = req.max_clips
    if req.caption_language:
        updates["caption_language"] = req.caption_language
    if updates:
        update_project(req.project_id, **updates)

    job = create_job(req.project_id, job_type="analyze", stage_name="Queued for Analysis")
    _submit_protected_job(_run_analyze_worker, req.project_id, job["id"])
    return _serialize_job(job)


# ---------------------------------------------------------------------------
# 4. Standalone /cut-clips Endpoint (Background FFmpeg Job)
# ---------------------------------------------------------------------------
class ClipIntervalInput(BaseModel):
    start_sec: float = Field(..., ge=0.0)
    end_sec: float = Field(..., gt=0.0)
    title: Optional[str] = None
    highlight_description: Optional[str] = ""
    transcript: Optional[str] = ""
    engagement_score: Optional[int] = 85
    captions: Optional[List[Dict[str, Any]]] = None


class CutClipsRequest(BaseModel):
    project_id: str
    clips: Optional[List[ClipIntervalInput]] = None
    aspect_ratio: Optional[str] = None
    caption_style: Optional[str] = None
    burn_captions: Optional[bool] = None


@app.post("/cut-clips")
def cut_clips(request: Request, req: CutClipsRequest):
    _assert_project_access_if_authenticated(request, req.project_id)
    _check_queue_capacity()
    try:
        require_ffmpeg()
    except FFmpegNotAvailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    project = get_project(req.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    custom = [c.model_dump() for c in req.clips] if req.clips else None
    job = create_job(req.project_id, job_type="cut-clips", stage_name="Queued for FFmpeg Cutting")
    _submit_protected_job(
        _run_cut_clips_worker,
        req.project_id,
        job["id"],
        custom,
        req.aspect_ratio,
        req.caption_style,
        req.burn_captions,
    )
    return _serialize_job(job)


# ---------------------------------------------------------------------------
# 5. Job Status Endpoint (/jobs/{job_id})
# ---------------------------------------------------------------------------
@app.get("/jobs/{job_id}")
def get_job_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return _serialize_job(job)


# ---------------------------------------------------------------------------
# 6. Secure Download Endpoints (/downloads/...)
# ---------------------------------------------------------------------------
@app.get("/downloads/{project_id}/all.zip")
def download_project_zip(project_id: str):
    try:
        zip_path = build_project_zip(project_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    project = get_project(project_id)
    dl_name = f"{sanitize_filename(project['title'] if project else project_id)}_clips.zip"
    return FileResponse(str(zip_path), media_type="application/zip", filename=dl_name)


@app.get("/downloads/{project_id}/{subdir}/{filename}")
def download_project_asset(project_id: str, subdir: str, filename: str):
    try:
        file_path = resolve_secure_download_path(project_id, filename, subdir=subdir)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    media = "image/jpeg" if subdir == "thumbnails" else "text/plain; charset=utf-8"
    return FileResponse(str(file_path), media_type=media, filename=filename if subdir == "captions" else None)


@app.get("/downloads/{project_id}/{filename}")
def download_project_video(project_id: str, filename: str, download: int = 0):
    try:
        file_path = resolve_secure_download_path(project_id, filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    if download:
        return FileResponse(str(file_path), media_type="video/mp4", filename=filename)
    return FileResponse(str(file_path), media_type="video/mp4")


# ---------------------------------------------------------------------------
# 7. Full Compatibility Routes for ClipForge AI Frontend (/api/*)
# ---------------------------------------------------------------------------
@app.post("/api/projects/upload")
async def api_upload_and_process(
    request: Request,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    mode: str = Form("Best Moments"),
    target_duration: int = Form(30),
    max_clips: int = Form(5),
    aspect_ratio: str = Form("9:16"),
    caption_language: str = Form("English"),
    caption_style: str = Form("Bold Viral"),
    burn_captions: bool = Form(True),
    copyright_confirmed: bool = Form(True),
):
    user_id = await asyncio.to_thread(_get_authenticated_user_id, request, True)
    _enforce_rate_limit(request)
    _check_queue_capacity()
    ffmpeg = check_ffmpeg_health()
    if not ffmpeg["available"]:
        raise HTTPException(status_code=503, detail=ffmpeg["error"])
    if not copyright_confirmed:
        raise HTTPException(status_code=400, detail="Copyright ownership/authorization confirmation is required.")

    project_id = f"project_{uuid.uuid4().hex[:10]}"
    safe_name, dest_path, total_bytes = await _save_upload_file(file, project_id)

    project = create_project(
        {
            "id": project_id,
            "title": (title or Path(safe_name).stem).strip(),
            "source_type": "upload",
            "source_filename": safe_name,
            "source_path": str(dest_path),
            "source_size_bytes": total_bytes,
            "copyright_confirmed": 1,
            "mode": mode,
            "target_duration": max(5, min(180, int(target_duration))),
            "max_clips": max(1, min(15, int(max_clips))),
            "aspect_ratio": aspect_ratio if aspect_ratio in ASPECT_RESOLUTIONS else "9:16",
            "caption_language": caption_language,
            "caption_style": caption_style if caption_style in CAPTION_STYLE_PRESETS else "Bold Viral",
            "burn_captions": 1 if burn_captions else 0,
            "status": "queued",
            "stage_index": 1,
            "stage_name": "Uploading Video",
            "progress_percent": 10,
        }
    )
    if user_id:
        _set_project_owner(project_id, user_id)

    job = create_job(project_id, job_type="full-pipeline", stage_name="Uploading Video")
    _submit_protected_job(_run_full_pipeline_worker, project_id, job["id"])
    resp = _serialize_project(project)
    resp["job_id"] = job["id"]
    return resp


class ExternalImportRequest(BaseModel):
    video_url: str
    title: Optional[str] = None
    mode: str = "Best Moments"
    target_duration: int = 30
    max_clips: int = 5
    aspect_ratio: str = "9:16"
    caption_language: str = "English"
    caption_style: str = "Bold Viral"
    burn_captions: bool = True
    copyright_confirmed: bool = True


@app.post("/api/projects/import-url")
async def api_import_authorized_url(request: Request, payload: ExternalImportRequest):
    user_id = await asyncio.to_thread(_get_authenticated_user_id, request, True)
    _enforce_rate_limit(request)
    _check_queue_capacity()
    ffmpeg = check_ffmpeg_health()
    if not ffmpeg["available"]:
        raise HTTPException(status_code=503, detail=ffmpeg["error"])
    if not payload.copyright_confirmed:
        raise HTTPException(status_code=400, detail="Copyright confirmation is required.")
    if not payload.video_url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Provide a valid http(s) direct video URL.")

    project_id = f"project_{uuid.uuid4().hex[:10]}"
    dest_path = get_project_upload_dir(project_id) / "imported_video.mp4"
    max_bytes = MAX_UPLOAD_MB * 1024 * 1024
    total_bytes = 0

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=120) as client:
            async with client.stream("GET", payload.video_url) as resp:
                if resp.status_code != 200:
                    raise HTTPException(status_code=400, detail=f"URL download failed (HTTP {resp.status_code}).")
                if "text/html" in resp.headers.get("content-type", ""):
                    raise HTTPException(
                        status_code=400,
                        detail="URL returned an HTML webpage instead of a direct video file. Upload the video file directly.",
                    )
                with open(dest_path, "wb") as out:
                    async for chunk in resp.aiter_bytes(1024 * 1024):
                        total_bytes += len(chunk)
                        if total_bytes > max_bytes:
                            raise HTTPException(status_code=413, detail=f"Remote file exceeds {MAX_UPLOAD_MB} MB limit.")
                        out.write(chunk)
    except HTTPException:
        dest_path.unlink(missing_ok=True)
        raise
    except Exception as exc:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"External import failed: {exc}")

    project = create_project(
        {
            "id": project_id,
            "title": (payload.title or "Imported Video").strip(),
            "source_type": "external_url",
            "source_filename": dest_path.name,
            "source_path": str(dest_path),
            "source_size_bytes": total_bytes,
            "copyright_confirmed": 1,
            "mode": payload.mode,
            "target_duration": max(5, min(180, payload.target_duration)),
            "max_clips": max(1, min(15, payload.max_clips)),
            "aspect_ratio": payload.aspect_ratio if payload.aspect_ratio in ASPECT_RESOLUTIONS else "9:16",
            "caption_language": payload.caption_language,
            "caption_style": payload.caption_style if payload.caption_style in CAPTION_STYLE_PRESETS else "Bold Viral",
            "burn_captions": 1 if payload.burn_captions else 0,
            "status": "queued",
            "stage_index": 1,
            "stage_name": "Uploading Video",
            "progress_percent": 10,
        }
    )
    if user_id:
        _set_project_owner(project_id, user_id)

    job = create_job(project_id, job_type="full-pipeline", stage_name="Uploading Video")
    _submit_protected_job(_run_full_pipeline_worker, project_id, job["id"])
    res = _serialize_project(project)
    res["job_id"] = job["id"]
    return res


@app.get("/api/projects")
def api_list_projects(request: Request):
    all_projects = [
        p for p in list_projects() if str(p.get("status") or "").lower() != "expired"
    ]
    if SUPABASE_URL and SUPABASE_API_KEY:
        user_id = _get_authenticated_user_id(request, required=False)
        if not user_id:
            return []
        with _OWNERS_LOCK:
            owners = _read_owners_unlocked()
        user_projects = [p for p in all_projects if owners.get(str(p["id"])) == user_id]
        return [_serialize_project(p) for p in user_projects]
    return [_serialize_project(p) for p in all_projects]


@app.get("/api/projects/{project_id}")
def api_get_project(request: Request, project_id: str):
    _assert_project_access_if_authenticated(request, project_id)
    project = get_project(project_id)
    if not project or str(project.get("status") or "").lower() == "expired":
        raise HTTPException(status_code=404, detail="Project not found or expired.")
    return _serialize_project(project)


@app.get("/api/projects/{project_id}/events")
async def api_project_events(project_id: str):
    async def stream():
        while True:
            project = get_project(project_id)
            if not project:
                yield f"data: {json.dumps({'error': 'not_found'})}\n\n"
                break
            payload = _serialize_project(project, include_clips=(project["status"] == "completed"))
            yield f"data: {json.dumps(payload)}\n\n"
            if payload["status"] in ("completed", "failed", "expired"):
                break
            await asyncio.sleep(0.8)

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.post("/api/projects/{project_id}/retry")
def api_retry_project(request: Request, project_id: str):
    _assert_project_access_if_authenticated(request, project_id)
    _enforce_rate_limit(request)
    _check_queue_capacity()
    try:
        require_ffmpeg()
    except FFmpegNotAvailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    project = get_project(project_id)
    if not project or str(project.get("status") or "").lower() == "expired":
        raise HTTPException(status_code=404, detail="Project not found or expired.")
    if not Path(project["source_path"]).exists():
        raise HTTPException(status_code=400, detail="Original source file no longer exists on server.")

    update_project(
        project_id,
        status="queued",
        stage_index=1,
        stage_name="Uploading Video",
        progress_percent=10,
        failed_stage=None,
        error_message=None,
    )
    job = create_job(project_id, job_type="full-pipeline", stage_name="Retrying")
    _submit_protected_job(_run_full_pipeline_worker, project_id, job["id"])
    return _serialize_project(get_project(project_id))  # type: ignore


@app.get("/api/projects/{project_id}/download-zip")
def api_download_zip(project_id: str):
    return download_project_zip(project_id)


@app.get("/api/projects/{project_id}/clips/{clip_id}/video")
def api_stream_clip(project_id: str, clip_id: str):
    clip = get_clip(project_id, clip_id)
    if not clip or not clip.get("file_verified"):
        raise HTTPException(status_code=404, detail="Verified clip not found.")
    return download_project_video(project_id, clip["video_filename"], download=0)


@app.get("/api/projects/{project_id}/clips/{clip_id}/download")
def api_download_clip(project_id: str, clip_id: str):
    clip = get_clip(project_id, clip_id)
    if not clip or not clip.get("file_verified"):
        raise HTTPException(status_code=404, detail="Verified clip not found.")
    return download_project_video(project_id, clip["video_filename"], download=1)


@app.get("/api/projects/{project_id}/clips/{clip_id}/thumbnail")
def api_clip_thumbnail(project_id: str, clip_id: str):
    clip = get_clip(project_id, clip_id)
    if not clip or not clip.get("thumbnail_filename"):
        raise HTTPException(status_code=404, detail="Thumbnail not found.")
    return download_project_asset(project_id, "thumbnails", clip["thumbnail_filename"])


@app.get("/api/projects/{project_id}/clips/{clip_id}/srt")
def api_clip_srt(project_id: str, clip_id: str):
    clip = get_clip(project_id, clip_id)
    if not clip or not clip.get("srt_filename"):
        raise HTTPException(status_code=404, detail="SRT file not found.")
    return download_project_asset(project_id, "captions", clip["srt_filename"])


class RerenderRequest(BaseModel):
    title: Optional[str] = None
    start_sec: Optional[float] = None
    end_sec: Optional[float] = None
    aspect_ratio: Optional[str] = None
    caption_style: Optional[str] = None
    burn_captions: Optional[bool] = None
    captions: Optional[List[Dict[str, Any]]] = None


@app.post("/api/projects/{project_id}/clips/{clip_id}/rerender")
def api_rerender_clip(request: Request, project_id: str, clip_id: str, req: RerenderRequest):
    _assert_project_access_if_authenticated(request, project_id)
    try:
        require_ffmpeg()
    except FFmpegNotAvailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    project = get_project(project_id)
    clip = get_clip(project_id, clip_id)
    if not project or not clip or str(project.get("status") or "").lower() == "expired":
        raise HTTPException(status_code=404, detail="Project or clip not found (may have expired).")

    start_s = req.start_sec if req.start_sec is not None else float(clip["start_sec"])
    end_s = req.end_sec if req.end_sec is not None else float(clip["end_sec"])
    if end_s - start_s < 1.0:
        raise HTTPException(status_code=400, detail="Clip duration must be at least 1 second.")

    aspect = req.aspect_ratio if req.aspect_ratio in ASPECT_RESOLUTIONS else clip["aspect_ratio"]
    style = req.caption_style if req.caption_style in CAPTION_STYLE_PRESETS else clip["caption_style"]
    burn = req.burn_captions if req.burn_captions is not None else bool(clip["burn_captions"])
    captions = req.captions if req.captions is not None else json.loads(clip.get("captions_json") or "[]")

    res_w, res_h = ASPECT_RESOLUTIONS[aspect]
    srt_path = Path(clip["srt_path"])
    ass_path = Path(clip["ass_path"])
    write_srt(captions, srt_path)
    write_ass(captions, ass_path, style_name=style, play_res_x=res_w, play_res_y=res_h)

    verified = cut_and_render_clip(
        source_path=Path(project["source_path"]),
        output_mp4_path=Path(clip["video_path"]),
        thumbnail_path=Path(clip["thumbnail_path"]),
        start_sec=start_s,
        end_sec=end_s,
        aspect_ratio=aspect,
        ass_path=ass_path if (burn and captions) else None,
    )

    clip["title"] = req.title.strip() if req.title else clip["title"]
    clip["start_sec"] = round(start_s, 2)
    clip["end_sec"] = round(end_s, 2)
    clip["duration_sec"] = round(end_s - start_s, 2)
    clip["verified_duration_sec"] = verified.duration
    clip["aspect_ratio"] = aspect
    clip["resolution"] = f"{res_w}x{res_h}"
    clip["caption_style"] = style
    clip["burn_captions"] = 1 if burn else 0
    clip["captions_json"] = json.dumps(captions)
    clip["file_size_bytes"] = verified.file_size_bytes
    clip["file_verified"] = 1
    upsert_clip(clip)
    return _serialize_clip(clip)


@app.delete("/api/projects/{project_id}/clips/{clip_id}")
def api_delete_clip(request: Request, project_id: str, clip_id: str):
    _assert_project_access_if_authenticated(request, project_id)
    if not delete_clip_record(project_id, clip_id):
        raise HTTPException(status_code=404, detail="Clip not found.")
    return {"deleted": True, "clip_id": clip_id}


# ---------------------------------------------------------------------------
# 8. Free Motion Studio Universal MP4 Converter (Zero Credits, Auto-Cleaned)
# ---------------------------------------------------------------------------
@app.post("/api/motion/export-mp4")
async def api_motion_export_mp4(
    file: UploadFile = File(...),
    fps: int = Form(30),
    filename: str = Form("clipforge_motion.mp4"),
):
    ffmpeg = check_ffmpeg_health()
    if not ffmpeg["available"]:
        raise HTTPException(status_code=503, detail="FFmpeg is not available on server.")

    safe_fps = 60 if int(fps) >= 60 else 30
    safe_out_name = sanitize_filename(filename or "clipforge_motion.mp4")
    if not safe_out_name.lower().endswith(".mp4"):
        safe_out_name = f"{Path(safe_out_name).stem}.mp4"

    tmp_dir = Path(tempfile.mkdtemp(prefix="cf_motion_"))
    in_path = tmp_dir / "input.webm"
    out_path = tmp_dir / safe_out_name

    max_bytes = 120 * 1024 * 1024
    total_bytes = 0
    try:
        with open(in_path, "wb") as out_f:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > max_bytes:
                    raise HTTPException(status_code=413, detail="Export file exceeds 120 MB limit.")
                out_f.write(chunk)

        if total_bytes == 0:
            raise HTTPException(status_code=400, detail="Recorded video file is empty.")

        cmd = [
            "ffmpeg",
            "-y",
            "-fflags", "+genpts",
            "-i", str(in_path),
            "-map", "0:v:0",
            "-map", "0:a?",
            "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
            "-r", str(safe_fps),
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "22",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            str(out_path),
        ]

        proc = await asyncio.to_thread(
            subprocess.run,
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=180,
        )
        if proc.returncode != 0 or not out_path.exists() or out_path.stat().st_size == 0:
            err_tail = (proc.stderr or b"").decode("utf-8", errors="ignore")[-300:]
            raise HTTPException(status_code=500, detail=f"MP4 conversion failed: {err_tail}")

        return FileResponse(
            str(out_path),
            media_type="video/mp4",
            filename=safe_out_name,
            background=BackgroundTask(shutil.rmtree, str(tmp_dir), True),
        )
    except Exception:
        shutil.rmtree(str(tmp_dir), ignore_errors=True)
        raise


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)
