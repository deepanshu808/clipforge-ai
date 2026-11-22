import json
import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


class FFmpegNotAvailableError(RuntimeError):
    """Raised when FFmpeg or FFprobe is missing on the server."""


class VideoProcessingError(RuntimeError):
    """Raised when video probing, cutting, or verification fails."""


ASPECT_RESOLUTIONS: Dict[str, Tuple[int, int]] = {
    "9:16": (1080, 1920),
    "16:9": (1920, 1080),
    "1:1": (1080, 1080),
}

# ASS colors are &HAABBGGRR
CAPTION_STYLE_PRESETS: Dict[str, Dict[str, Any]] = {
    "Bold Viral": {
        "font": "DejaVu Sans",
        "size": 72,
        "primary": "&H00FFFFFF",
        "highlight": "&H0000F0FF",
        "outline": "&H00000000",
        "back": "&H80000000",
        "bold": -1,
        "border_style": 1,
        "outline_px": 5,
        "shadow_px": 2,
        "margin_v": 260,
        "uppercase": True,
    },
    "Word-by-Word": {
        "font": "DejaVu Sans",
        "size": 76,
        "primary": "&H00FFFFFF",
        "highlight": "&H0022EEFF",
        "outline": "&H00000000",
        "back": "&H80000000",
        "bold": -1,
        "border_style": 1,
        "outline_px": 6,
        "shadow_px": 3,
        "margin_v": 280,
        "uppercase": True,
    },
    "Podcast": {
        "font": "DejaVu Sans",
        "size": 58,
        "primary": "&H00F8FAFC",
        "highlight": "&H00F65C8B",
        "outline": "&H00121224",
        "back": "&H900A0A18",
        "bold": -1,
        "border_style": 3,
        "outline_px": 10,
        "shadow_px": 0,
        "margin_v": 220,
        "uppercase": False,
    },
    "Minimal": {
        "font": "DejaVu Sans",
        "size": 48,
        "primary": "&H00FFFFFF",
        "highlight": "&H00EED322",
        "outline": "&H00000000",
        "back": "&H66000000",
        "bold": 0,
        "border_style": 1,
        "outline_px": 2,
        "shadow_px": 1,
        "margin_v": 180,
        "uppercase": False,
    },
    "Gaming": {
        "font": "DejaVu Sans",
        "size": 70,
        "primary": "&H00EEFF22",
        "highlight": "&H0055FF00",
        "outline": "&H001A0028",
        "back": "&H88000000",
        "bold": -1,
        "border_style": 1,
        "outline_px": 6,
        "shadow_px": 3,
        "margin_v": 250,
        "uppercase": True,
    },
    "Cinematic": {
        "font": "DejaVu Serif",
        "size": 52,
        "primary": "&H00F5F0E6",
        "highlight": "&H00AADDFF",
        "outline": "&H00000000",
        "back": "&H50000000",
        "bold": 0,
        "border_style": 1,
        "outline_px": 3,
        "shadow_px": 2,
        "margin_v": 170,
        "uppercase": False,
    },
}


@dataclass
class MediaProbe:
    duration: float
    width: int
    height: int
    fps: float
    has_audio: bool
    video_codec: str
    audio_codec: Optional[str]
    file_size_bytes: int


def check_ffmpeg_health() -> Dict[str, Any]:
    ffmpeg_bin = shutil.which("ffmpeg")
    ffprobe_bin = shutil.which("ffprobe")
    if not ffmpeg_bin or not ffprobe_bin:
        return {
            "available": False,
            "ffmpeg_available": bool(ffmpeg_bin),
            "ffprobe_available": bool(ffprobe_bin),
            "ffmpeg_path": ffmpeg_bin,
            "ffprobe_path": ffprobe_bin,
            "version": None,
            "error": "FFmpeg and/or FFprobe binary was not found on server PATH.",
        }
    try:
        proc = subprocess.run(
            [ffmpeg_bin, "-version"],
            capture_output=True,
            text=True,
            timeout=10,
            check=True,
        )
        version_line = proc.stdout.splitlines()[0] if proc.stdout else "ffmpeg detected"
        return {
            "available": True,
            "ffmpeg_available": True,
            "ffprobe_available": True,
            "ffmpeg_path": ffmpeg_bin,
            "ffprobe_path": ffprobe_bin,
            "version": version_line,
            "error": None,
        }
    except Exception as exc:
        return {
            "available": False,
            "ffmpeg_available": False,
            "ffprobe_available": bool(ffprobe_bin),
            "ffmpeg_path": ffmpeg_bin,
            "ffprobe_path": ffprobe_bin,
            "version": None,
            "error": f"FFmpeg health check failed: {exc}",
        }


def require_ffmpeg() -> Tuple[str, str]:
    status = check_ffmpeg_health()
    if not status["available"]:
        raise FFmpegNotAvailableError(str(status["error"]))
    return str(status["ffmpeg_path"]), str(status["ffprobe_path"])


def probe_video(video_path: Path) -> MediaProbe:
    _, ffprobe_bin = require_ffmpeg()
    if not video_path.exists() or video_path.stat().st_size == 0:
        raise VideoProcessingError(f"Video file missing or empty: {video_path}")

    cmd = [
        ffprobe_bin,
        "-v", "error",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        str(video_path),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if proc.returncode != 0:
        raise VideoProcessingError(f"FFprobe failed on {video_path.name}: {proc.stderr.strip()}")

    data = json.loads(proc.stdout or "{}")
    streams = data.get("streams", [])
    fmt = data.get("format", {})

    v_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
    a_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)
    if not v_stream:
        raise VideoProcessingError(f"No decodable video stream found in {video_path.name}")

    duration = float(fmt.get("duration") or v_stream.get("duration") or 0.0)
    width = int(v_stream.get("width") or 0)
    height = int(v_stream.get("height") or 0)

    fps = 30.0
    rate = str(v_stream.get("avg_frame_rate") or v_stream.get("r_frame_rate") or "30/1")
    if "/" in rate:
        num, den = rate.split("/", 1)
        if float(den) > 0:
            fps = float(num) / float(den)

    return MediaProbe(
        duration=round(duration, 3),
        width=width,
        height=height,
        fps=round(fps, 3),
        has_audio=a_stream is not None,
        video_codec=str(v_stream.get("codec_name") or "unknown"),
        audio_codec=str(a_stream.get("codec_name")) if a_stream else None,
        file_size_bytes=video_path.stat().st_size,
    )


def extract_audio_wav(video_path: Path, wav_path: Path) -> Optional[Path]:
    """Extract 16 kHz mono PCM WAV for audio energy & speech-to-text analysis."""
    ffmpeg_bin, _ = require_ffmpeg()
    probe = probe_video(video_path)
    if not probe.has_audio:
        return None
    wav_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        ffmpeg_bin,
        "-y",
        "-i", str(video_path),
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        str(wav_path),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if proc.returncode != 0 or not wav_path.exists() or wav_path.stat().st_size == 0:
        raise VideoProcessingError(f"Audio extraction failed: {proc.stderr[-600:]}")
    return wav_path


def detect_scene_changes_ffmpeg(video_path: Path, threshold: float = 0.30) -> List[float]:
    """Detect real visual scene cuts directly with FFmpeg (no heavy OpenCV binary needed)."""
    ffmpeg_bin, _ = require_ffmpeg()
    cmd = [
        ffmpeg_bin,
        "-i", str(video_path),
        "-vf", f"select='gt(scene,{threshold})',showinfo",
        "-f", "null",
        "-",
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    timestamps = [
        round(float(m.group(1)), 2)
        for m in re.finditer(r"pts_time:([0-9]+(?:\.[0-9]+)?)", proc.stderr or "")
    ]
    return sorted(set(timestamps))


def format_srt_time(seconds: float) -> str:
    seconds = max(0.0, float(seconds))
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    ms = int(round((seconds - int(seconds)) * 1000))
    if ms >= 1000:
        secs += 1
        ms = 0
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{ms:03d}"


def format_ass_time(seconds: float) -> str:
    seconds = max(0.0, float(seconds))
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    cs = int(round((seconds - int(seconds)) * 100))
    if cs >= 100:
        secs += 1
        cs = 0
    return f"{hrs}:{mins:02d}:{secs:02d}.{cs:02d}"


def _escape_ass(text: str) -> str:
    return text.replace("\\", "\\\\").replace("{", "(").replace("}", ")").replace("\n", "\\N")


def write_srt(segments: List[Dict[str, Any]], output_path: Path) -> Path:
    blocks = []
    for idx, seg in enumerate(segments, start=1):
        start_s = float(seg.get("start", 0.0))
        end_s = max(start_s + 0.1, float(seg.get("end", start_s + 1.0)))
        text = str(seg.get("text", "")).strip()
        if not text:
            continue
        blocks.append(f"{idx}\n{format_srt_time(start_s)} --> {format_srt_time(end_s)}\n{text}\n")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(blocks), encoding="utf-8")
    return output_path


def write_ass(
    segments: List[Dict[str, Any]],
    output_path: Path,
    style_name: str = "Bold Viral",
    play_res_x: int = 1080,
    play_res_y: int = 1920,
) -> Path:
    preset = CAPTION_STYLE_PRESETS.get(style_name, CAPTION_STYLE_PRESETS["Bold Viral"])
    scale = min(play_res_x, play_res_y) / 1080.0
    font_size = max(28, int(preset["size"] * scale))
    margin_v = max(60, int(preset["margin_v"] * (play_res_y / 1920.0)))

    header = (
        "[Script Info]\n"
        "ScriptType: v4.00+\n"
        f"PlayResX: {play_res_x}\n"
        f"PlayResY: {play_res_y}\n"
        "WrapStyle: 0\n"
        "ScaledBorderAndShadow: yes\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
        "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, "
        "Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
        f"Style: Default,{preset['font']},{font_size},{preset['primary']},{preset['highlight']},"
        f"{preset['outline']},{preset['back']},{preset['bold']},0,0,0,100,100,0,0,"
        f"{preset['border_style']},{preset['outline_px']},{preset['shadow_px']},2,60,60,{margin_v},1\n\n"
        "[Events]\n"
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )

    events = []
    for seg in segments:
        start_s = max(0.0, float(seg.get("start", 0.0)))
        end_s = max(start_s + 0.1, float(seg.get("end", start_s + 1.0)))
        raw_text = str(seg.get("text", "")).strip()
        if not raw_text:
            continue
        if preset["uppercase"]:
            raw_text = raw_text.upper()

        words = raw_text.split()
        if style_name in ("Bold Viral", "Word-by-Word", "Gaming") and len(words) > 1:
            total_cs = max(10, int(round((end_s - start_s) * 100)))
            per_word = max(5, total_cs // len(words))
            payload = " ".join(f"{{\\kf{per_word}}}{_escape_ass(w)}" for w in words)
        else:
            payload = _escape_ass(raw_text)

        events.append(
            f"Dialogue: 0,{format_ass_time(start_s)},{format_ass_time(end_s)},Default,,0,0,0,,{payload}"
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(header + "\n".join(events) + "\n", encoding="utf-8")
    return output_path


def build_video_filter(
    aspect_ratio: str = "9:16",
    ass_path: Optional[Path] = None,
) -> Tuple[str, int, int]:
    """Non-stretching center crop filter for 9:16, 16:9, or 1:1 with optional ASS subtitles."""
    target_w, target_h = ASPECT_RESOLUTIONS.get(aspect_ratio, (1080, 1920))
    parts = [
        f"scale={target_w}:{target_h}:force_original_aspect_ratio=increase",
        f"crop={target_w}:{target_h}",
        "setsar=1",
    ]
    if ass_path is not None:
        escaped = (
            str(ass_path.resolve())
            .replace("\\", "/")
            .replace(":", "\\:")
            .replace("'", "\\'")
        )
        parts.append(f"ass='{escaped}'")
    return ",".join(parts), target_w, target_h


def verify_output_mp4(clip_path: Path, expected_duration: float, expect_audio: bool) -> MediaProbe:
    """Post-render integrity gate: ensures the MP4 exists, is non-empty, decodable, and in sync."""
    if not clip_path.exists():
        raise VideoProcessingError(f"Rendered clip file missing: {clip_path}")
    size = clip_path.stat().st_size
    if size < 1024:
        clip_path.unlink(missing_ok=True)
        raise VideoProcessingError(f"Rendered clip is empty or corrupt ({size} bytes).")

    probe = probe_video(clip_path)
    if probe.duration <= 0.2:
        clip_path.unlink(missing_ok=True)
        raise VideoProcessingError(f"Rendered clip has invalid duration: {probe.duration}s")
    if expected_duration > 2.0 and abs(probe.duration - expected_duration) > max(3.5, expected_duration * 0.25):
        clip_path.unlink(missing_ok=True)
        raise VideoProcessingError(
            f"Clip duration mismatch: expected ~{expected_duration:.2f}s, got {probe.duration:.2f}s"
        )
    if expect_audio and not probe.has_audio:
        clip_path.unlink(missing_ok=True)
        raise VideoProcessingError("Rendered clip is missing its audio track.")
    return probe


def cut_and_render_clip(
    source_path: Path,
    output_mp4_path: Path,
    thumbnail_path: Path,
    start_sec: float,
    end_sec: float,
    aspect_ratio: str = "9:16",
    ass_path: Optional[Path] = None,
) -> MediaProbe:
    """Physically cut [start_sec, end_sec] from source_path into H.264/AAC MP4 using FFmpeg."""
    ffmpeg_bin, _ = require_ffmpeg()
    src_probe = probe_video(source_path)

    clamped_start = max(0.0, min(float(start_sec), max(0.0, src_probe.duration - 0.5)))
    clamped_end = max(clamped_start + 0.5, min(float(end_sec), src_probe.duration))
    clip_duration = round(clamped_end - clamped_start, 3)

    vf_graph, _, _ = build_video_filter(aspect_ratio=aspect_ratio, ass_path=ass_path)

    output_mp4_path.parent.mkdir(parents=True, exist_ok=True)
    thumbnail_path.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        ffmpeg_bin,
        "-y",
        "-ss", f"{clamped_start:.3f}",
        "-i", str(source_path),
        "-t", f"{clip_duration:.3f}",
        "-vf", vf_graph,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "22",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
    ]
    if src_probe.has_audio:
        cmd += [
            "-c:a", "aac",
            "-b:a", "128k",
            "-ac", "2",
            "-af", "aresample=async=1:first_pts=0",
        ]
    else:
        cmd += ["-an"]

    cmd.append(str(output_mp4_path))

    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if proc.returncode != 0:
        output_mp4_path.unlink(missing_ok=True)
        raise VideoProcessingError(f"FFmpeg render failed: {proc.stderr[-800:]}")

    verified_probe = verify_output_mp4(
        output_mp4_path,
        expected_duration=clip_duration,
        expect_audio=src_probe.has_audio,
    )

    # Extract a real frame thumbnail from the rendered MP4
    thumb_sec = min(1.0, max(0.0, verified_probe.duration * 0.25))
    thumb_cmd = [
        ffmpeg_bin,
        "-y",
        "-ss", f"{thumb_sec:.2f}",
        "-i", str(output_mp4_path),
        "-vframes", "1",
        "-q:v", "3",
        str(thumbnail_path),
    ]
    subprocess.run(thumb_cmd, capture_output=True, text=True, timeout=60)
    return verified_probe
