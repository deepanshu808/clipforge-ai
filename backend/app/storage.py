import json
import os
import re
import shutil
import sqlite3
import threading
import uuid
import zipfile
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

DATA_DIR = Path(os.getenv("DATA_DIR", "/data")).resolve()
UPLOADS_DIR = DATA_DIR / "uploads"
PROCESSED_DIR = DATA_DIR / "processed"
TEMP_DIR = DATA_DIR / "temp"
DB_PATH = DATA_DIR / "clipforge.db"

_DB_LOCK = threading.RLock()
_SAFE_ID_RE = re.compile(r"^[a-zA-Z0-9_-]{3,80}$")
_SAFE_FILE_RE = re.compile(r"^[a-zA-Z0-9._-]{1,160}$")


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def sanitize_filename(filename: str, fallback: str = "video.mp4") -> str:
    base = Path(filename or fallback).name
    cleaned = re.sub(r"[^a-zA-Z0-9._-]", "_", base).strip("._")
    if not cleaned:
        cleaned = fallback
    return cleaned[:120]


def validate_identifier(value: str, label: str = "id") -> str:
    if not value or not _SAFE_ID_RE.match(value):
        raise ValueError(f"Invalid {label}.")
    return value


def ensure_storage_dirs() -> Dict[str, str]:
    for directory in (DATA_DIR, UPLOADS_DIR, PROCESSED_DIR, TEMP_DIR):
        directory.mkdir(parents=True, exist_ok=True)
    return {
        "data_dir": str(DATA_DIR),
        "uploads_dir": str(UPLOADS_DIR),
        "processed_dir": str(PROCESSED_DIR),
        "temp_dir": str(TEMP_DIR),
    }


def check_storage_writable() -> bool:
    try:
        ensure_storage_dirs()
        probe = TEMP_DIR / f".write_test_{uuid.uuid4().hex[:8]}"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink(missing_ok=True)
        return True
    except Exception:
        return False


def get_project_upload_dir(project_id: str) -> Path:
    validate_identifier(project_id, "project_id")
    path = (UPLOADS_DIR / project_id).resolve()
    if not path.is_relative_to(UPLOADS_DIR):
        raise ValueError("Invalid project upload path.")
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_project_processed_dir(project_id: str) -> Path:
    validate_identifier(project_id, "project_id")
    path = (PROCESSED_DIR / project_id).resolve()
    if not path.is_relative_to(PROCESSED_DIR):
        raise ValueError("Invalid project processed path.")
    (path / "thumbnails").mkdir(parents=True, exist_ok=True)
    (path / "captions").mkdir(parents=True, exist_ok=True)
    return path


def get_project_temp_dir(project_id: str) -> Path:
    validate_identifier(project_id, "project_id")
    path = (TEMP_DIR / project_id).resolve()
    if not path.is_relative_to(TEMP_DIR):
        raise ValueError("Invalid project temp path.")
    path.mkdir(parents=True, exist_ok=True)
    return path


def cleanup_project_temp(project_id: str) -> None:
    try:
        validate_identifier(project_id, "project_id")
        path = (TEMP_DIR / project_id).resolve()
        if path.is_relative_to(TEMP_DIR) and path.exists():
            shutil.rmtree(path, ignore_errors=True)
    except Exception:
        pass


def resolve_secure_download_path(project_id: str, filename: str, subdir: Optional[str] = None) -> Path:
    """Resolve a file strictly inside /data/processed/{project_id} and block path traversal."""
    validate_identifier(project_id, "project_id")
    if not filename or "/" in filename or "\\" in filename or ".." in filename or not _SAFE_FILE_RE.match(filename):
        raise ValueError("Invalid filename.")

    project_root = (PROCESSED_DIR / project_id).resolve()
    if not project_root.is_relative_to(PROCESSED_DIR):
        raise ValueError("Invalid project directory.")

    if subdir:
        if subdir not in ("thumbnails", "captions"):
            raise ValueError("Invalid subdirectory.")
        candidate = (project_root / subdir / filename).resolve()
    else:
        candidate = (project_root / filename).resolve()

    if not candidate.is_relative_to(project_root):
        raise ValueError("Path traversal attempt blocked.")
    if not candidate.exists() or not candidate.is_file() or candidate.stat().st_size == 0:
        raise FileNotFoundError(f"Requested file not found or empty: {filename}")
    return candidate


@contextmanager
def db_conn():
    ensure_storage_dirs()
    with _DB_LOCK:
        conn = sqlite3.connect(str(DB_PATH), timeout=30, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA foreign_keys=ON;")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()


def init_db() -> None:
    with db_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                source_type TEXT NOT NULL DEFAULT 'upload',
                source_filename TEXT NOT NULL,
                source_path TEXT NOT NULL,
                source_size_bytes INTEGER NOT NULL DEFAULT 0,
                source_duration REAL NOT NULL DEFAULT 0.0,
                source_width INTEGER NOT NULL DEFAULT 0,
                source_height INTEGER NOT NULL DEFAULT 0,
                has_audio INTEGER NOT NULL DEFAULT 1,
                copyright_confirmed INTEGER NOT NULL DEFAULT 1,
                mode TEXT NOT NULL DEFAULT 'Best Moments',
                target_duration INTEGER NOT NULL DEFAULT 30,
                max_clips INTEGER NOT NULL DEFAULT 5,
                aspect_ratio TEXT NOT NULL DEFAULT '9:16',
                caption_language TEXT NOT NULL DEFAULT 'English',
                caption_style TEXT NOT NULL DEFAULT 'Bold Viral',
                burn_captions INTEGER NOT NULL DEFAULT 1,
                status TEXT NOT NULL DEFAULT 'uploaded',
                stage_index INTEGER NOT NULL DEFAULT 1,
                stage_name TEXT NOT NULL DEFAULT 'Uploading Video',
                progress_percent INTEGER NOT NULL DEFAULT 10,
                failed_stage TEXT,
                error_message TEXT,
                analysis_method TEXT,
                transcript_json TEXT NOT NULL DEFAULT '[]',
                candidates_json TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                job_type TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'queued',
                stage_index INTEGER NOT NULL DEFAULT 1,
                stage_name TEXT NOT NULL DEFAULT 'Queued',
                progress_percent INTEGER NOT NULL DEFAULT 0,
                failed_stage TEXT,
                error_message TEXT,
                result_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS clips (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                clip_index INTEGER NOT NULL,
                title TEXT NOT NULL,
                highlight_description TEXT NOT NULL DEFAULT '',
                transcript TEXT NOT NULL DEFAULT '',
                engagement_score INTEGER NOT NULL DEFAULT 80,
                start_sec REAL NOT NULL,
                end_sec REAL NOT NULL,
                duration_sec REAL NOT NULL,
                verified_duration_sec REAL NOT NULL DEFAULT 0.0,
                aspect_ratio TEXT NOT NULL DEFAULT '9:16',
                resolution TEXT NOT NULL DEFAULT '1080x1920',
                caption_style TEXT NOT NULL DEFAULT 'Bold Viral',
                burn_captions INTEGER NOT NULL DEFAULT 1,
                captions_json TEXT NOT NULL DEFAULT '[]',
                video_filename TEXT NOT NULL,
                video_path TEXT NOT NULL,
                thumbnail_filename TEXT,
                thumbnail_path TEXT,
                srt_filename TEXT,
                srt_path TEXT,
                ass_path TEXT,
                file_size_bytes INTEGER NOT NULL DEFAULT 0,
                file_verified INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );
            """
        )


def create_project(record: Dict[str, Any]) -> Dict[str, Any]:
    now = utcnow_iso()
    record.setdefault("created_at", now)
    record.setdefault("updated_at", now)
    cols = ", ".join(record.keys())
    placeholders = ", ".join("?" for _ in record)
    with db_conn() as conn:
        conn.execute(f"INSERT INTO projects ({cols}) VALUES ({placeholders})", tuple(record.values()))
    return get_project(record["id"])  # type: ignore


def update_project(project_id: str, **fields: Any) -> Optional[Dict[str, Any]]:
    if not fields:
        return get_project(project_id)
    fields["updated_at"] = utcnow_iso()
    assignments = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [project_id]
    with db_conn() as conn:
        conn.execute(f"UPDATE projects SET {assignments} WHERE id = ?", values)
    return get_project(project_id)


def get_project(project_id: str) -> Optional[Dict[str, Any]]:
    with db_conn() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        return dict(row) if row else None


def list_projects() -> List[Dict[str, Any]]:
    with db_conn() as conn:
        rows = conn.execute("SELECT * FROM projects ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows]


def create_job(project_id: str, job_type: str, stage_name: str = "Queued") -> Dict[str, Any]:
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    now = utcnow_iso()
    with db_conn() as conn:
        conn.execute(
            """
            INSERT INTO jobs (id, project_id, job_type, status, stage_index, stage_name, progress_percent, result_json, created_at, updated_at)
            VALUES (?, ?, ?, 'queued', 1, ?, 5, '{}', ?, ?)
            """,
            (job_id, project_id, job_type, stage_name, now, now),
        )
    return get_job(job_id)  # type: ignore


def update_job(job_id: str, **fields: Any) -> Optional[Dict[str, Any]]:
    if not fields:
        return get_job(job_id)
    fields["updated_at"] = utcnow_iso()
    assignments = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [job_id]
    with db_conn() as conn:
        conn.execute(f"UPDATE jobs SET {assignments} WHERE id = ?", values)
    return get_job(job_id)


def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    with db_conn() as conn:
        row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        return dict(row) if row else None


def replace_project_clips(project_id: str, clip_records: List[Dict[str, Any]]) -> None:
    with db_conn() as conn:
        conn.execute("DELETE FROM clips WHERE project_id = ?", (project_id,))
        for rec in clip_records:
            rec.setdefault("created_at", utcnow_iso())
            cols = ", ".join(rec.keys())
            placeholders = ", ".join("?" for _ in rec)
            conn.execute(f"INSERT INTO clips ({cols}) VALUES ({placeholders})", tuple(rec.values()))


def upsert_clip(rec: Dict[str, Any]) -> None:
    rec.setdefault("created_at", utcnow_iso())
    cols = ", ".join(rec.keys())
    placeholders = ", ".join("?" for _ in rec)
    with db_conn() as conn:
        conn.execute(f"INSERT OR REPLACE INTO clips ({cols}) VALUES ({placeholders})", tuple(rec.values()))


def get_clips_for_project(project_id: str) -> List[Dict[str, Any]]:
    with db_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM clips WHERE project_id = ? ORDER BY clip_index ASC",
            (project_id,),
        ).fetchall()
        return [dict(r) for r in rows]


def get_clip(project_id: str, clip_id: str) -> Optional[Dict[str, Any]]:
    with db_conn() as conn:
        row = conn.execute(
            "SELECT * FROM clips WHERE project_id = ? AND id = ?",
            (project_id, clip_id),
        ).fetchone()
        return dict(row) if row else None


def delete_clip_record(project_id: str, clip_id: str) -> bool:
    clip = get_clip(project_id, clip_id)
    if not clip:
        return False
    for key in ("video_path", "thumbnail_path", "srt_path", "ass_path"):
        p = clip.get(key)
        if p:
            Path(p).unlink(missing_ok=True)
    with db_conn() as conn:
        conn.execute("DELETE FROM clips WHERE project_id = ? AND id = ?", (project_id, clip_id))
    return True


def build_project_zip(project_id: str) -> Path:
    """Bundle all verified physical MP4 clips and SRT files into a real ZIP archive."""
    project = get_project(project_id)
    if not project:
        raise FileNotFoundError("Project not found.")

    clips = get_clips_for_project(project_id)
    valid_clips = [
        c for c in clips
        if c.get("file_verified")
        and Path(c["video_path"]).exists()
        and Path(c["video_path"]).stat().st_size > 0
    ]
    if not valid_clips:
        raise FileNotFoundError("No verified MP4 clips exist for this project.")

    out_dir = get_project_processed_dir(project_id)
    zip_path = out_dir / "all_clips.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_STORED) as zf:
        for c in valid_clips:
            mp4 = Path(c["video_path"])
            safe_title = sanitize_filename(c.get("title") or f"clip_{c['clip_index']:02d}", fallback="clip")
            zf.write(mp4, arcname=f"clip_{int(c['clip_index']):02d}_{safe_title}.mp4")
            srt = c.get("srt_path")
            if srt and Path(srt).exists():
                zf.write(Path(srt), arcname=f"captions/clip_{int(c['clip_index']):02d}.srt")

    if not zip_path.exists() or zip_path.stat().st_size == 0:
        raise RuntimeError("Failed to build non-empty ZIP archive.")
    return zip_path
