import base64
import json
import math
import os
import subprocess
import tempfile
import wave
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx
import numpy as np

from app.video_processor import detect_scene_changes_ffmpeg


def _get_openai_key() -> str:
    return os.getenv("OPENAI_API_KEY", "").strip()


def _get_gemini_key() -> str:
    return os.getenv("GEMINI_API_KEY", "").strip()


def _get_gemini_model() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip() or "gemini-2.5-flash"


def _prepare_audio_payload(wav_path: Path) -> Tuple[bytes, str]:
    """Compress WAV to lightweight 16kHz mono MP3 so longer videos stay within Gemini inline limits."""
    tmp_mp3: Optional[Path] = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tf:
            tmp_mp3 = Path(tf.name)
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(wav_path),
            "-ac",
            "1",
            "-ar",
            "16000",
            "-b:a",
            "32k",
            str(tmp_mp3),
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
        if res.returncode == 0 and tmp_mp3.exists() and tmp_mp3.stat().st_size > 0:
            return tmp_mp3.read_bytes(), "audio/mp3"
    except Exception as exc:
        print(f"[ClipForge AI] MP3 compression skipped, falling back to WAV: {exc}", flush=True)
    finally:
        if tmp_mp3 is not None:
            tmp_mp3.unlink(missing_ok=True)
    return wav_path.read_bytes(), "audio/wav"


def _parse_json_response(raw_text: str) -> Any:
    text = raw_text.strip()
    if text.startswith("```"):
        text = text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(text)


def _transcribe_with_gemini(wav_path: Path, language_pref: str) -> Tuple[List[Dict[str, Any]], str]:
    api_key = _get_gemini_key()
    model = _get_gemini_model()
    if not api_key:
        return [], ""

    audio_bytes, mime_type = _prepare_audio_payload(wav_path)
    if len(audio_bytes) > 15 * 1024 * 1024:
        print(
            f"[ClipForge AI] Audio payload too large for Gemini inline transcription ({len(audio_bytes)} bytes).",
            flush=True,
        )
        return [], ""

    lang_lower = (language_pref or "English").strip().lower()
    if lang_lower in ("hindi", "hinglish"):
        lang_instruction = (
            "Write spoken Hindi/Urdu dialogue in clean, natural Romanized Hinglish (Latin alphabet, e.g., "
            "'Sharma uncle ne khud ko saanp se katwa liya') so subtitles render cleanly on all video players."
        )
    else:
        lang_instruction = (
            f"Preferred caption language: {language_pref}. Transcribe spoken dialogue accurately; "
            "if the audio is in Hindi/Urdu, write it in natural Romanized Hinglish or clean English matching the speech."
        )

    prompt = (
        "Listen carefully to this audio and transcribe ALL spoken dialogue with accurate timestamps in seconds.\n"
        f"{lang_instruction}\n"
        "Break the transcript into short, punchy subtitle segments (2 to 4 seconds each, 4 to 9 words per segment) "
        "so they look great as burned-in Reels/Shorts captions.\n"
        "Return ONLY a JSON array with this exact schema:\n"
        '[{"start": 0.0, "end": 2.4, "text": "First spoken line"}, {"start": 2.4, "end": 5.1, "text": "Next spoken line"}]\n'
        "If there is no speech at all, return []."
    )

    b64_audio = base64.b64encode(audio_bytes).decode("ascii")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    try:
        resp = httpx.post(
            url,
            json={
                "contents": [
                    {
                        "parts": [
                            {"text": prompt},
                            {"inline_data": {"mime_type": mime_type, "data": b64_audio}},
                        ]
                    }
                ],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "temperature": 0.1,
                },
            },
            timeout=180.0,
        )
        if resp.status_code != 200:
            print(
                f"[ClipForge AI] Gemini transcription failed (HTTP {resp.status_code}): {resp.text[:400]}",
                flush=True,
            )
            return [], ""

        body = resp.json()
        raw_text = body["candidates"][0]["content"]["parts"][0]["text"]
        parsed = _parse_json_response(raw_text)
        if isinstance(parsed, dict):
            parsed = parsed.get("segments") or parsed.get("transcript") or []

        segs: List[Dict[str, Any]] = []
        if isinstance(parsed, list):
            for s in parsed:
                if not isinstance(s, dict):
                    continue
                txt = str(s.get("text", "")).strip()
                try:
                    st = round(max(0.0, float(s.get("start", 0.0))), 2)
                    en = round(float(s.get("end", 0.0)), 2)
                except (TypeError, ValueError):
                    continue
                if txt and en > st:
                    segs.append({"start": st, "end": en, "text": txt})

        segs.sort(key=lambda item: item["start"])
        if segs:
            print(f"[ClipForge AI] Gemini transcribed {len(segs)} subtitle segments.", flush=True)
            return segs, f"gemini-{model}"
    except Exception as exc:
        print(f"[ClipForge AI] Gemini transcription exception: {exc}", flush=True)

    return [], ""


def transcribe_wav(wav_path: Optional[Path], language_pref: str = "English") -> Tuple[List[Dict[str, Any]], str]:
    """Transcribe extracted WAV using Gemini API or OpenAI Whisper when configured."""
    if wav_path is None or not wav_path.exists():
        return [], "no-audio-track"

    # 1. Try Gemini native audio transcription first when GEMINI_API_KEY is set
    if _get_gemini_key():
        segs, method = _transcribe_with_gemini(wav_path, language_pref)
        if segs:
            return segs, method

    # 2. Fallback to OpenAI Whisper if OPENAI_API_KEY is configured
    openai_key = _get_openai_key()
    if openai_key and wav_path.stat().st_size <= 24 * 1024 * 1024:
        lang = "en" if language_pref.lower() == "english" else ("hi" if language_pref.lower() == "hindi" else None)
        try:
            with open(wav_path, "rb") as f:
                data = {
                    "model": "whisper-1",
                    "response_format": "verbose_json",
                    "timestamp_granularities[]": "segment",
                }
                if lang:
                    data["language"] = lang
                resp = httpx.post(
                    "https://api.openai.com/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {openai_key}"},
                    data=data,
                    files={"file": ("audio.wav", f, "audio/wav")},
                    timeout=180.0,
                )
            if resp.status_code == 200:
                payload = resp.json()
                segs = []
                for s in payload.get("segments", []) or []:
                    txt = str(s.get("text", "")).strip()
                    if txt:
                        segs.append(
                            {
                                "start": round(float(s["start"]), 2),
                                "end": round(float(s["end"]), 2),
                                "text": txt,
                            }
                        )
                if segs:
                    return segs, "openai-whisper-1"
            else:
                print(
                    f"[ClipForge AI] Whisper transcription failed (HTTP {resp.status_code}): {resp.text[:300]}",
                    flush=True,
                )
        except Exception as exc:
            print(f"[ClipForge AI] Whisper transcription exception: {exc}", flush=True)

    return [], "audio-energy-analysis"


def compute_audio_energy(wav_path: Optional[Path], window_sec: float = 1.0) -> List[Tuple[float, float]]:
    """Compute per-second RMS loudness from the uploaded video's real audio track."""
    if wav_path is None or not wav_path.exists():
        return []
    try:
        with wave.open(str(wav_path), "rb") as wf:
            rate = wf.getframerate()
            raw = wf.readframes(wf.getnframes())
        samples = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
        if len(samples) == 0:
            return []
        step = max(1, int(rate * window_sec))
        out: List[Tuple[float, float]] = []
        for idx in range(0, len(samples), step):
            chunk = samples[idx : idx + step]
            rms = float(np.sqrt(np.mean(chunk * chunk))) if len(chunk) else 0.0
            out.append((round(idx / rate, 2), rms))
        return out
    except Exception:
        return []


def _slice_captions(
    transcript_segments: List[Dict[str, Any]],
    start_sec: float,
    end_sec: float,
    fallback_text: str,
) -> List[Dict[str, Any]]:
    captions: List[Dict[str, Any]] = []
    for seg in transcript_segments:
        s_start = float(seg["start"])
        s_end = float(seg["end"])
        if s_end <= start_sec or s_start >= end_sec:
            continue
        rel_start = round(max(0.0, s_start - start_sec), 2)
        rel_end = round(min(end_sec - start_sec, s_end - start_sec), 2)
        if rel_end - rel_start >= 0.1 and seg.get("text"):
            captions.append({"start": rel_start, "end": rel_end, "text": str(seg["text"]).strip()})
    return captions


def _llm_select_highlights(
    transcript_segments: List[Dict[str, Any]],
    total_duration: float,
    target_duration: int,
    max_clips: int,
    mode: str,
    caption_language: str,
) -> Optional[List[Dict[str, Any]]]:
    gemini_key = _get_gemini_key()
    openai_key = _get_openai_key()
    if not transcript_segments or not (gemini_key or openai_key):
        return None

    lines = "\n".join(
        f"[{s['start']:.2f}s - {s['end']:.2f}s] {s['text']}" for s in transcript_segments[:300]
    )
    prompt = (
        f"You are an expert short-form video editor. Analyze this real transcript of a {total_duration:.1f}s video.\n"
        f"Mode: {mode}. Target clip duration: ~{target_duration}s. Language: {caption_language}.\n"
        f"Pick up to {max_clips} non-overlapping viral moments strictly within [0, {total_duration:.2f}].\n"
        "Align to full sentence boundaries. Write catchy, short viral hook titles.\n"
        "Return ONLY a raw JSON array:\n"
        '[{"start_sec": 10.0, "end_sec": 40.0, "suggested_title": "Hook title", '
        '"highlight_description": "Why it engages", "engagement_score": 88}]\n\n'
        f"TRANSCRIPT:\n{lines}"
    )

    if gemini_key:
        try:
            model = _get_gemini_model()
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
            resp = httpx.post(
                url,
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "responseMimeType": "application/json",
                        "temperature": 0.2,
                    },
                },
                timeout=60.0,
            )
            if resp.status_code == 200:
                text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                parsed = _parse_json_response(text)
                if isinstance(parsed, dict):
                    parsed = parsed.get("clips") or parsed.get("highlights") or []
                if isinstance(parsed, list) and parsed:
                    return parsed
            else:
                print(
                    f"[ClipForge AI] Gemini highlight selection failed (HTTP {resp.status_code}): {resp.text[:300]}",
                    flush=True,
                )
        except Exception as exc:
            print(f"[ClipForge AI] Gemini highlight selection exception: {exc}", flush=True)

    if openai_key:
        try:
            resp = httpx.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {openai_key}"},
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                },
                timeout=60.0,
            )
            if resp.status_code == 200:
                text = resp.json()["choices"][0]["message"]["content"]
                parsed = _parse_json_response(text)
                if isinstance(parsed, list) and parsed:
                    return parsed
        except Exception as exc:
            print(f"[ClipForge AI] OpenAI highlight selection exception: {exc}", flush=True)

    return None


def detect_highlights(
    video_path: Path,
    wav_path: Optional[Path],
    total_duration: float,
    transcript_segments: List[Dict[str, Any]],
    target_duration: int = 30,
    max_clips: int = 5,
    mode: str = "Best Moments",
    caption_language: str = "English",
    scene_cuts: Optional[List[float]] = None,
) -> Tuple[List[Dict[str, Any]], str]:
    """Select real, non-overlapping highlight intervals from THIS uploaded video."""
    if total_duration <= 1.0:
        raise ValueError("Uploaded video must be longer than 1 second.")

    clip_len = min(float(target_duration), max(2.0, total_duration * 0.45))
    if total_duration <= target_duration:
        clip_len = max(2.0, min(total_duration, total_duration / max(1, min(max_clips, 2))))

    # 1. Semantic LLM highlight selection when transcript + API key are available
    llm_picks = _llm_select_highlights(
        transcript_segments=transcript_segments,
        total_duration=total_duration,
        target_duration=target_duration,
        max_clips=max_clips,
        mode=mode,
        caption_language=caption_language,
    )
    if llm_picks:
        candidates: List[Dict[str, Any]] = []
        for idx, item in enumerate(llm_picks[:max_clips], start=1):
            st = max(0.0, min(float(item.get("start_sec", 0.0)), total_duration - 1.0))
            en = max(st + 1.5, min(float(item.get("end_sec", st + clip_len)), total_duration))
            seg_text = " ".join(
                s["text"] for s in transcript_segments if s["end"] > st and s["start"] < en
            ).strip()
            title = str(item.get("suggested_title") or f"{mode} Clip {idx:02d}")
            desc = str(item.get("highlight_description") or "AI-detected high-engagement moment.")
            score = int(max(1, min(99, int(item.get("engagement_score", 84)))))
            candidates.append(
                {
                    "clip_index": idx,
                    "start_sec": round(st, 2),
                    "end_sec": round(en, 2),
                    "duration_sec": round(en - st, 2),
                    "transcript": seg_text,
                    "highlight_description": desc,
                    "suggested_title": title,
                    "engagement_score": score,
                    "captions": _slice_captions(transcript_segments, st, en, title),
                }
            )
        if candidates:
            return candidates, "llm-semantic-transcript"

    # 2. Deterministic signal analysis derived directly from uploaded video's audio RMS + visual scene cuts
    energies = compute_audio_energy(wav_path)
    if scene_cuts is None:
        try:
            scene_cuts = detect_scene_changes_ffmpeg(video_path)
        except Exception:
            scene_cuts = []

    possible_count = max(1, min(max_clips, int(math.floor(total_duration / max(2.0, clip_len)))))
    scored_windows: List[Tuple[float, float, float]] = []
    step = max(1.0, clip_len / 2.0)

    t = 0.0
    while t + 2.0 <= total_duration:
        win_end = min(total_duration, t + clip_len)
        if win_end - t < 2.0:
            break
        win_rms = [rms for ts, rms in energies if t <= ts < win_end]
        avg_e = float(np.mean(win_rms)) if win_rms else 0.1
        peak_e = float(np.max(win_rms)) if win_rms else 0.1
        cuts_in_win = sum(1 for c in scene_cuts if t <= c < win_end)
        words_in_win = sum(
            len(str(s["text"]).split())
            for s in transcript_segments
            if s["end"] > t and s["start"] < win_end
        )
        score = (avg_e * 45.0) + (peak_e * 30.0) + min(cuts_in_win * 6.0, 20.0) + min(words_in_win * 0.5, 25.0)
        scored_windows.append((score, round(t, 2), round(win_end, 2)))
        t += step

    scored_windows.sort(key=lambda item: item[0], reverse=True)
    selected: List[Tuple[float, float, float]] = []
    for sc, st, en in scored_windows:
        if len(selected) >= possible_count:
            break
        if not any(not (en <= s_st or st >= s_en) for _, s_st, s_en in selected):
            selected.append((sc, st, en))

    selected.sort(key=lambda item: item[1])
    max_sc = max((s[0] for s in selected), default=1.0) or 1.0

    results: List[Dict[str, Any]] = []
    for idx, (raw_sc, st, en) in enumerate(selected, start=1):
        if transcript_segments:
            overlap = [s for s in transcript_segments if s["end"] > st and s["start"] < en]
            if overlap:
                st = max(0.0, float(overlap[0]["start"]))
                en = min(total_duration, float(overlap[-1]["end"]))
                if en - st < 1.5:
                    en = min(total_duration, st + clip_len)

        seg_text = " ".join(
            s["text"] for s in transcript_segments if s["end"] > st and s["start"] < en
        ).strip()
        norm_score = int(min(96, max(62, round(65 + (raw_sc / max_sc) * 28))))
        title = (seg_text[:55] + "...") if len(seg_text) > 55 else (seg_text or f"{mode} Clip {idx:02d} ({int(st)}s-{int(en)}s)")
        desc = f"Detected from real audio energy and scene transitions ({st:.1f}s-{en:.1f}s, {mode} mode)."
        results.append(
            {
                "clip_index": idx,
                "start_sec": round(st, 2),
                "end_sec": round(en, 2),
                "duration_sec": round(en - st, 2),
                "transcript": seg_text or f"[Highlight {st:.1f}s-{en:.1f}s]",
                "highlight_description": desc,
                "suggested_title": title,
                "engagement_score": norm_score,
                "captions": _slice_captions(transcript_segments, st, en, title),
            }
        )
    return results, "audio-scene-signal-analysis"
