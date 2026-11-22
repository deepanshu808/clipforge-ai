import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Archive,
  Bot,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Download,
  Film,
  Flame,
  FolderOpen,
  Globe,
  Hash,
  Home,
  Link2,
  Loader2,
  Menu,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Scissors,
  Server,
  Settings,
  Shield,
  Sliders,
  Sparkles,
  Subtitles,
  Trash2,
  Upload,
  Video,
  X,
  Youtube,
  Zap,
} from "lucide-react";

const CLIPPING_MODES = [
  "Best Moments",
  "Funny Moments",
  "Educational Moments",
  "Podcast Highlights",
  "Motivational Moments",
  "Emotional Moments",
  "Storytelling",
  "Gaming Highlights",
];

const DURATION_PRESETS = [15, 30, 45, 60, 90];

const CAPTION_STYLES = [
  "Bold Viral",
  "Word-by-Word",
  "Podcast",
  "Minimal",
  "Gaming",
  "Cinematic",
];

const CAPTION_LANGUAGES = ["English", "Hindi", "Hinglish"];

const ASPECT_RATIOS = [
  { value: "9:16", label: "9:16 Vertical", sub: "1080×1920 · Shorts / Reels / TikTok" },
  { value: "16:9", label: "16:9 Landscape", sub: "1920×1080 · YouTube" },
  { value: "1:1", label: "1:1 Square", sub: "1080×1080 · Feed" },
];

const PIPELINE_STAGES = [
  "Uploading Video",
  "Extracting Audio",
  "Transcribing Audio",
  "Analyzing Video",
  "Finding Best Moments",
  "Cutting Original Video",
  "Adding Captions",
  "Rendering MP4",
  "Verifying Output",
  "Completed",
];

function formatTime(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatBytes(bytes) {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(2)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function normalizeBaseUrl(raw) {
  return (raw || "").trim().replace(/\/+$/, "");
}

function resolveApiUrl(baseUrl, path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${normalizeBaseUrl(baseUrl)}${path.startsWith("/") ? "" : "/"}${path}`;
}

function getDefaultBaseUrl() {
  try {
    const saved = localStorage.getItem("clipforge_api_base_url");
    if (saved) return normalizeBaseUrl(saved);
  } catch {}
  const envUrl = import.meta?.env?.VITE_API_BASE_URL;
  if (envUrl) return normalizeBaseUrl(envUrl);
  return "http://localhost:8000";
}

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Backend Connection & Health
  const [apiBaseUrl, setApiBaseUrl] = useState(getDefaultBaseUrl);
  const [urlDraft, setUrlDraft] = useState(getDefaultBaseUrl);
  const [health, setHealth] = useState({
    checking: true,
    online: false,
    ffmpeg_available: false,
    ffmpeg_version: null,
    ffmpeg_error: null,
    storage_writable: false,
    ai_configured: false,
    max_upload_mb: 1024,
  });

  // Real Backend Projects
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  // Create New Clips Form
  const [importMode, setImportMode] = useState("upload"); // upload | url | youtube
  const [selectedFile, setSelectedFile] = useState(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [ytMeta, setYtMeta] = useState(null);
  const [ytError, setYtError] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [clipMode, setClipMode] = useState("Best Moments");
  const [targetDuration, setTargetDuration] = useState(30);
  const [customDuration, setCustomDuration] = useState("");
  const [maxClips, setMaxClips] = useState(5);
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [captionLanguage, setCaptionLanguage] = useState("English");
  const [captionStyle, setCaptionStyle] = useState("Bold Viral");
  const [burnCaptions, setBurnCaptions] = useState(true);
  const [copyrightConfirmed, setCopyrightConfirmed] = useState(false);

  // Active Job Tracking
  const [submitting, setSubmitting] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [activeJobProject, setActiveJobProject] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const eventSourceRef = useRef(null);
  const pollTimerRef = useRef(null);

  // Video Editor State
  const [editingContext, setEditingContext] = useState(null); // { projectId, clip }
  const [editDraft, setEditDraft] = useState(null);
  const [editHistory, setEditHistory] = useState([]);
  const [editFuture, setEditFuture] = useState([]);
  const [rerendering, setRerendering] = useState(false);
  const [editorMessage, setEditorMessage] = useState("");
  const [cacheBuster, setCacheBuster] = useState(Date.now());

  // Caption & Hashtag Generator State
  const [captionInputTopic, setCaptionInputTopic] = useState("");
  const [captionPlatform, setCaptionPlatform] = useState("YouTube Shorts");
  const [generatedSocialPack, setGeneratedSocialPack] = useState(null);

  // AI Assistant State
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantMessages, setAssistantMessages] = useState([
    {
      role: "assistant",
      text: "Ask me to suggest hooks, Hindi/Hinglish subtitles, clip titles, or FFmpeg cut settings for any of your real uploaded clips.",
    },
  ]);

  // Billing Currency Toggle
  const [currency, setCurrency] = useState("INR");
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const checkBackendHealth = async (targetUrl = apiBaseUrl) => {
    const clean = normalizeBaseUrl(targetUrl);
    setHealth((prev) => ({ ...prev, checking: true }));
    try {
      const resp = await fetch(`${clean}/api/health`, { method: "GET" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setHealth({
        checking: false,
        online: true,
        ffmpeg_available: Boolean(data.ffmpeg_available),
        ffmpeg_version: data.ffmpeg_version || null,
        ffmpeg_error: data.ffmpeg_error || null,
        storage_writable: Boolean(data.storage_writable ?? true),
        ai_configured: Boolean(data.ai_configured),
        max_upload_mb: data.max_upload_mb || 1024,
      });
      return true;
    } catch (err) {
      setHealth({
        checking: false,
        online: false,
        ffmpeg_available: false,
        ffmpeg_version: null,
        ffmpeg_error: `Cannot reach backend at ${clean} (${err.message}).`,
        storage_writable: false,
        ai_configured: false,
        max_upload_mb: 1024,
      });
      return false;
    }
  };

  const fetchProjects = async (targetUrl = apiBaseUrl) => {
    const clean = normalizeBaseUrl(targetUrl);
    setLoadingProjects(true);
    try {
      const resp = await fetch(`${clean}/api/projects`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const list = await resp.json();
      setProjects(Array.isArray(list) ? list : []);
      if (Array.isArray(list) && list.length > 0 && !selectedProjectId) {
        setSelectedProjectId(list[0].id);
      }
    } catch {
      // Keep existing state if backend is offline
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    checkBackendHealth(apiBaseUrl).then((ok) => {
      if (ok) fetchProjects(apiBaseUrl);
    });
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!selectedFile) {
      setLocalPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setLocalPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const stopTracking = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const startTrackingProject = (projectId) => {
    stopTracking();
    const clean = normalizeBaseUrl(apiBaseUrl);

    const handleProjectUpdate = (data) => {
      if (!data || data.error) return;
      setActiveJobProject(data);
      setProjects((prev) => {
        const exists = prev.some((p) => p.id === data.id);
        return exists ? prev.map((p) => (p.id === data.id ? data : p)) : [data, ...prev];
      });
      if (data.status === "completed") {
        stopTracking();
        setSelectedProjectId(data.id);
        fetchProjects(clean);
        showToast(`Done! ${data.verified_clip_count || data.clips?.length || 0} real MP4 clips ready.`, "success");
      } else if (data.status === "failed") {
        stopTracking();
        showToast(`Failed at ${data.failed_stage || "processing"}: ${data.error_message || "Error"}`, "error");
      }
    };

    try {
      const es = new EventSource(`${clean}/api/projects/${projectId}/events`);
      eventSourceRef.current = es;
      es.onmessage = (evt) => {
        try {
          handleProjectUpdate(JSON.parse(evt.data));
        } catch {}
      };
      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        // Fallback to HTTP polling
        if (!pollTimerRef.current) {
          pollTimerRef.current = setInterval(async () => {
            try {
              const r = await fetch(`${clean}/api/projects/${projectId}`);
              if (r.ok) handleProjectUpdate(await r.json());
            } catch {}
          }, 1500);
        }
      };
    } catch {
      pollTimerRef.current = setInterval(async () => {
        try {
          const r = await fetch(`${clean}/api/projects/${projectId}`);
          if (r.ok) handleProjectUpdate(await r.json());
        } catch {}
      }, 1500);
    }
  };

  const handleSaveBackendUrl = async () => {
    const clean = normalizeBaseUrl(urlDraft);
    if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
      showToast("URL must start with http:// or https://", "error");
      return;
    }
    try {
      localStorage.setItem("clipforge_api_base_url", clean);
    } catch {}
    setApiBaseUrl(clean);
    const ok = await checkBackendHealth(clean);
    if (ok) {
      await fetchProjects(clean);
      showToast("Connected to FFmpeg backend!", "success");
    } else {
      showToast("Could not connect to backend URL.", "error");
    }
  };

  const fetchYouTubeMeta = async () => {
    setYtError("");
    setYtMeta(null);
    if (!youtubeUrl.includes("youtube.com") && !youtubeUrl.includes("youtu.be")) {
      setYtError("Please paste a valid YouTube video URL.");
      return;
    }
    try {
      const resp = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`);
      if (!resp.ok) throw new Error("Could not fetch public metadata.");
      const data = await resp.json();
      setYtMeta(data);
      if (!projectTitle) setProjectTitle(data.title || "");
    } catch {
      setYtError("Metadata unavailable. You can still upload your authorized video file below.");
    }
  };

  const effectiveDuration = useMemo(() => {
    const c = parseInt(customDuration, 10);
    return !Number.isNaN(c) && c >= 5 && c <= 180 ? c : targetDuration;
  }, [customDuration, targetDuration]);

  const handleStartProcessing = async () => {
    setSubmitError("");
    if (!health.online || !health.ffmpeg_available) {
      setSubmitError("FFmpeg backend is not connected or FFmpeg is unavailable. Configure your backend URL in Settings first.");
      return;
    }
    if (!copyrightConfirmed) {
      setSubmitError("Please confirm that you own or have permission to process this video.");
      return;
    }

    const clean = normalizeBaseUrl(apiBaseUrl);

    if (importMode === "url") {
      if (!externalUrl.startsWith("http://") && !externalUrl.startsWith("https://")) {
        setSubmitError("Enter a valid direct http(s) video URL.");
        return;
      }
      setSubmitting(true);
      try {
        const resp = await fetch(`${clean}/api/projects/import-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            video_url: externalUrl.trim(),
            title: projectTitle.trim() || undefined,
            mode: clipMode,
            target_duration: effectiveDuration,
            max_clips: maxClips,
            aspect_ratio: aspectRatio,
            caption_language: captionLanguage,
            caption_style: captionStyle,
            burn_captions: burnCaptions,
            copyright_confirmed: true,
          }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.detail || `HTTP ${resp.status}`);
        setActiveJobProject(data);
        setSelectedProjectId(data.id);
        startTrackingProject(data.id);
        showToast("Authorized URL imported. FFmpeg pipeline started!", "success");
      } catch (err) {
        setSubmitError(err.message || "URL import failed.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Direct upload (also used after YouTube metadata preview)
    if (!selectedFile) {
      setSubmitError("Please select a real video file (.mp4, .mov, .webm, .mkv) to upload and cut.");
      return;
    }

    setSubmitting(true);
    setUploadPercent(0);
    const formData = new FormData();
    formData.append("file", selectedFile);
    if (projectTitle.trim()) formData.append("title", projectTitle.trim());
    formData.append("mode", clipMode);
    formData.append("target_duration", String(effectiveDuration));
    formData.append("max_clips", String(maxClips));
    formData.append("aspect_ratio", aspectRatio);
    formData.append("caption_language", captionLanguage);
    formData.append("caption_style", captionStyle);
    formData.append("burn_captions", String(burnCaptions));
    formData.append("copyright_confirmed", "true");

    try {
      const data = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${clean}/api/projects/upload`);
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            setUploadPercent(Math.round((evt.loaded / evt.total) * 100));
          }
        };
        xhr.onload = () => {
          try {
            const parsed = JSON.parse(xhr.responseText || "{}");
            if (xhr.status >= 200 && xhr.status < 300) resolve(parsed);
            else reject(new Error(parsed.detail || `Upload failed (HTTP ${xhr.status})`));
          } catch {
            reject(new Error(`Unexpected server response (HTTP ${xhr.status})`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error while uploading video to backend."));
        xhr.send(formData);
      });

      setActiveJobProject(data);
      setSelectedProjectId(data.id);
      startTrackingProject(data.id);
      showToast("Video uploaded! FFmpeg cutting pipeline is running.", "success");
    } catch (err) {
      setSubmitError(err.message || "Upload failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetryProject = async (projectId) => {
    const clean = normalizeBaseUrl(apiBaseUrl);
    try {
      const resp = await fetch(`${clean}/api/projects/${projectId}/retry`, { method: "POST" });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || "Retry failed");
      setActiveJobProject(data);
      startTrackingProject(projectId);
      showToast("Job restarted.", "info");
    } catch (err) {
      showToast(err.message || "Could not retry job.", "error");
    }
  };

  const handleDeleteClip = async (projectId, clipId) => {
    const clean = normalizeBaseUrl(apiBaseUrl);
    try {
      const resp = await fetch(`${clean}/api/projects/${projectId}/clips/${clipId}`, { method: "DELETE" });
      if (!resp.ok) throw new Error("Delete failed");
      await fetchProjects(clean);
      showToast("Clip deleted from server storage.", "info");
    } catch (err) {
      showToast(err.message || "Could not delete clip.", "error");
    }
  };

  // Editor helpers
  const openClipInEditor = (project, clip) => {
    setEditingContext({ projectId: project.id, sourceDuration: project.source_duration || clip.end_sec + 10, clipId: clip.id });
    const initial = {
      title: clip.title,
      start_sec: clip.start_sec,
      end_sec: clip.end_sec,
      aspect_ratio: clip.aspect_ratio || "9:16",
      caption_style: clip.caption_style || "Bold Viral",
      burn_captions: Boolean(clip.burn_captions),
      captions: Array.isArray(clip.captions) ? clip.captions.map((c) => ({ ...c })) : [],
      video_url: clip.video_url,
      download_url: clip.download_url,
      srt_url: clip.srt_url,
    };
    setEditDraft(initial);
    setEditHistory([]);
    setEditFuture([]);
    setEditorMessage("");
    setActiveTab("editor");
  };

  const updateEditDraft = (updater) => {
    setEditDraft((prev) => {
      if (!prev) return prev;
      setEditHistory((h) => [...h.slice(-20), prev]);
      setEditFuture([]);
      return typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
    });
  };

  const undoEdit = () => {
    if (editHistory.length === 0) return;
    const previous = editHistory[editHistory.length - 1];
    setEditHistory((h) => h.slice(0, -1));
    setEditFuture((f) => [editDraft, ...f]);
    setEditDraft(previous);
  };

  const redoEdit = () => {
    if (editFuture.length === 0) return;
    const next = editFuture[0];
    setEditFuture((f) => f.slice(1));
    setEditHistory((h) => [...h, editDraft]);
    setEditDraft(next);
  };

  const handleRerenderClip = async () => {
    if (!editingContext || !editDraft) return;
    setRerendering(true);
    setEditorMessage("");
    const clean = normalizeBaseUrl(apiBaseUrl);
    try {
      const resp = await fetch(
        `${clean}/api/projects/${editingContext.projectId}/clips/${editingContext.clipId}/rerender`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editDraft.title,
            start_sec: Number(editDraft.start_sec),
            end_sec: Number(editDraft.end_sec),
            aspect_ratio: editDraft.aspect_ratio,
            caption_style: editDraft.caption_style,
            burn_captions: Boolean(editDraft.burn_captions),
            captions: editDraft.captions,
          }),
        }
      );
      const updated = await resp.json();
      if (!resp.ok) throw new Error(updated.detail || `HTTP ${resp.status}`);
      setEditDraft((prev) => ({
        ...prev,
        video_url: updated.video_url,
        download_url: updated.download_url,
        srt_url: updated.srt_url,
      }));
      setCacheBuster(Date.now());
      await fetchProjects(clean);
      setEditorMessage("Re-rendered real MP4 with FFmpeg and updated preview!");
      showToast("Clip re-rendered with FFmpeg!", "success");
    } catch (err) {
      setEditorMessage(`Re-render failed: ${err.message}`);
      showToast(err.message || "Re-render failed", "error");
    } finally {
      setRerendering(false);
    }
  };

  // Social Pack Generator (grounded in selected clip/topic)
  const handleGenerateSocialPack = () => {
    const topic = captionInputTopic.trim() || selectedProject?.title || "Viral Short Clip";
    const cleanWords = topic
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 6);
    const baseTags = cleanWords.map((w) => `#${w.toLowerCase()}`);
    const platformTag =
      captionPlatform === "YouTube Shorts"
        ? "#youtubeshorts"
        : captionPlatform === "Instagram Reels"
        ? "#reelsindia"
        : "#tiktok";

    setGeneratedSocialPack({
      updatedAt: new Date().toLocaleString(),
      titles: [
        `Wait till the end: ${topic}`,
        `Nobody talks about this part of ${topic}`,
        `30 seconds that explain ${topic} clearly`,
        `The exact moment ${topic} changed everything`,
        `Watch this before you skip ${topic}`,
      ],
      captions: [
        `Most people miss the key takeaway in ${topic}. Watch all the way through and drop your thoughts below.`,
        `Clipped the sharpest highlight from "${topic}" so you get the full context in under a minute.`,
        `Agree or disagree with this take on ${topic}? Comment your view.`,
        `Save this clip on ${topic} so you can come back to it later.`,
        `Quick breakdown of ${topic} — straight to the point, zero fluff.`,
      ],
      hooks: [
        `Stop scrolling — look at what just happened in ${topic}...`,
        `Here is the 15-second part of ${topic} everyone replayed.`,
        `Most people get ${topic} completely wrong — here is why.`,
      ],
      hashtags: Array.from(
        new Set([
          ...baseTags,
          platformTag,
          "#shorts",
          "#shortformvideo",
          "#podcastclips",
          "#videoclips",
          "#contentcreator",
          "#editing",
          "#highlights",
          "#creator",
          "#clipforge",
        ])
      ).slice(0, 15),
    });
  };

  const handleAssistantSend = () => {
    const q = assistantPrompt.trim();
    if (!q) return;
    const userMsg = { role: "user", text: q };
    const lower = q.toLowerCase();
    let reply =
      "Select any generated clip in Generated Clips and click 'Edit & Re-render' to trim timestamps, switch 9:16/16:9/1:1, or burn Hindi/Hinglish subtitles directly with FFmpeg.";
    if (lower.includes("hinglish") || lower.includes("hindi")) {
      reply =
        'Hinglish caption idea:\n"Ruko! Aakhiri 5 second bilkul miss mat karna — yahi asli twist hai!"\nTip: Create New Clips me Caption Language "Hinglish" aur style "Bold Viral" select karein.';
    } else if (lower.includes("hook")) {
      reply =
        '3 High-Retention Opening Hooks:\n1. "Wait 3 seconds before scrolling — this changes everything."\n2. "90% log yeh galti karte hain..."\n3. "Here is the exact moment the whole conversation flipped."';
    } else if (lower.includes("title")) {
      reply =
        'YouTube Shorts Title Ideas:\n• "The Moment Everyone Replayed"\n• "30 Seconds of Pure Value"\n• "Why Nobody Saw This Coming"';
    }
    setAssistantMessages((prev) => [...prev, userMsg, { role: "assistant", text: reply }]);
    setAssistantPrompt("");
  };

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || projects[0] || null,
    [projects, selectedProjectId]
  );

  const totalClipsGenerated = useMemo(
    () => projects.reduce((sum, p) => sum + (p.verified_clip_count || p.clips?.length || 0), 0),
    [projects]
  );

  const totalDurationSec = useMemo(
    () => projects.reduce((sum, p) => sum + (Number(p.source_duration) || 0), 0),
    [projects]
  );

  const navItems = [
    { id: "dashboard", label: "Home Dashboard", icon: Home },
    { id: "create", label: "Create New Clips", icon: Scissors },
    { id: "clips", label: "Generated Clips", icon: Film },
    { id: "editor", label: "Video Editor", icon: Sliders },
    { id: "captions", label: "Caption & Hashtags", icon: Hash },
    { id: "assistant", label: "AI Assistant", icon: Bot },
    { id: "plans", label: "Plans & Credits", icon: CreditCard },
    { id: "admin", label: "System Monitor", icon: Shield },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#07070f] text-slate-100 flex">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-24 w-96 h-96 bg-violet-600/15 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/10 blur-[120px] rounded-full" />
      </div>

      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-[#0b0b18]/95 backdrop-blur-xl border-r border-white/10 flex flex-col transition-transform duration-200 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-base tracking-tight bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
                ClipForge AI
              </div>
              <div className="text-[11px] text-slate-400">Real FFmpeg Studio</div>
            </div>
          </div>
          <button
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  active
                    ? "bg-gradient-to-r from-violet-600/30 to-cyan-500/20 text-white border border-violet-500/40"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-cyan-300" : "text-slate-400"}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1">
            <div className="flex items-center justify-between text-slate-300 font-medium">
              <span>Backend Engine</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  health.online && health.ffmpeg_available ? "bg-emerald-400" : "bg-rose-400"
                }`}
              />
            </div>
            <div className="text-[11px] text-slate-400 truncate">{apiBaseUrl}</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-[#07070f]/80 backdrop-blur-xl border-b border-white/10 px-4 lg:px-8 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg bg-white/5 border border-white/10"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-semibold text-base lg:text-lg capitalize">
              {navItems.find((n) => n.id === activeTab)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                health.checking
                  ? "bg-white/5 border-white/10 text-slate-300"
                  : health.online && health.ffmpeg_available
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                  : "bg-rose-500/15 border-rose-500/40 text-rose-300"
              }`}
            >
              {health.checking ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : health.online && health.ffmpeg_available ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {health.checking
                  ? "Checking FFmpeg..."
                  : health.online && health.ffmpeg_available
                  ? "FFmpeg Engine Ready"
                  : "Backend Offline / Configure URL"}
              </span>
            </button>

            <button
              onClick={() => checkBackendHealth(apiBaseUrl).then((ok) => ok && fetchProjects(apiBaseUrl))}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300"
              title="Refresh backend status"
            >
              <RefreshCw className={`w-4 h-4 ${health.checking ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={() => setActiveTab("create")}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-violet-600/25 hover:opacity-95"
            >
              <Plus className="w-4 h-4" />
              <span>New Clips</span>
            </button>
          </div>
        </header>

        {/* Offline Warning Banner */}
        {!health.checking && (!health.online || !health.ffmpeg_available) && (
          <div className="mx-4 lg:mx-8 mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-rose-200">
                  Real FFmpeg Video Backend Not Connected
                </div>
                <div className="text-rose-200/80 text-xs mt-0.5">
                  {health.ffmpeg_error || "Connect your deployed Railway URL or local FastAPI server in Settings."}
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveTab("settings")}
              className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-xs font-semibold text-white shrink-0"
            >
              Configure Backend URL
            </button>
          </div>
        )}

        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl border shadow-2xl text-sm font-medium backdrop-blur-xl ${
              toast.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
                : toast.type === "error"
                ? "bg-rose-950/90 border-rose-500/50 text-rose-200"
                : "bg-slate-900/90 border-violet-500/40 text-slate-100"
            }`}
          >
            {toast.msg}
          </div>
        )}

        {/* Page Content */}
        <main className="p-4 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* ================= HOME DASHBOARD ================= */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-gradient-to-br from-violet-900/30 via-[#101024] to-cyan-900/20 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-200 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" /> Real FFmpeg + AI Highlight Engine
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    Turn Long Videos into Verified Short MP4 Clips
                  </h2>
                  <p className="text-sm text-slate-300">
                    Upload your video, let the backend analyze audio & scenes, physically cut multiple 9:16/16:9/1:1 MP4 files with FFmpeg, burn animated captions, and download individually or as a ZIP.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("create")}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 font-bold text-sm shadow-xl shadow-violet-600/25 hover:opacity-95 shrink-0 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" /> Upload & Cut Video
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Videos Processed", value: projects.length, icon: Video, color: "text-violet-400" },
                  { label: "Verified MP4 Clips", value: totalClipsGenerated, icon: Film, color: "text-cyan-400" },
                  { label: "Total Source Duration", value: formatTime(totalDurationSec), icon: Clock, color: "text-emerald-400" },
                  {
                    label: "FFmpeg Engine",
                    value: health.online && health.ffmpeg_available ? "Online" : "Offline",
                    icon: Server,
                    color: health.online && health.ffmpeg_available ? "text-emerald-400" : "text-rose-400",
                  },
                ].map((kpi) => {
                  const Icon = kpi.icon;
                  return (
                    <div
                      key={kpi.label}
                      className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md"
                    >
                      <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                        <span>{kpi.label}</span>
                        <Icon className={`w-4 h-4 ${kpi.color}`} />
                      </div>
                      <div className="text-2xl font-bold mt-2">{kpi.value}</div>
                    </div>
                  );
                })}
              </div>

              {/* Recent Projects */}
              <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base">Recent Projects</h3>
                  <button
                    onClick={() => fetchProjects(apiBaseUrl)}
                    className="text-xs text-cyan-300 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingProjects ? "animate-spin" : ""}`} /> Refresh
                  </button>
                </div>

                {projects.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">
                    No processed videos yet. Click <span className="text-white font-semibold">New Clips</span> to upload your first video.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map((proj) => (
                      <div
                        key={proj.id}
                        className="p-4 rounded-xl bg-black/30 border border-white/10 hover:border-violet-500/40 transition flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold text-sm truncate">{proj.title}</div>
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                                proj.status === "completed"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : proj.status === "failed"
                                  ? "bg-rose-500/20 text-rose-300"
                                  : "bg-violet-500/20 text-violet-300"
                              }`}
                            >
                              {proj.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {proj.mode} · {proj.aspect_ratio} · {proj.verified_clip_count || 0} clips
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedProjectId(proj.id);
                              setActiveTab("clips");
                            }}
                            className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold"
                          >
                            View Clips
                          </button>
                          {proj.status === "failed" && (
                            <button
                              onClick={() => handleRetryProject(proj.id)}
                              className="px-3 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold"
                            >
                              Retry
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= CREATE NEW CLIPS ================= */}
          {activeTab === "create" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-5">
                {/* Input Mode Tabs */}
                <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-5">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "upload", label: "Direct Upload", icon: Upload },
                      { id: "url", label: "Authorized Direct URL", icon: Link2 },
                      { id: "youtube", label: "YouTube Metadata", icon: Youtube },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setImportMode(tab.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                            importMode === tab.id
                              ? "bg-violet-600/30 border-violet-400 text-white"
                              : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {importMode === "youtube" && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={youtubeUrl}
                          onChange={(e) => setYoutubeUrl(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm focus:outline-none focus:border-violet-400"
                        />
                        <button
                          onClick={fetchYouTubeMeta}
                          className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold"
                        >
                          Fetch Info
                        </button>
                      </div>
                      {ytError && <div className="text-xs text-rose-300">{ytError}</div>}
                      {ytMeta && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/10">
                          <img src={ytMeta.thumbnail_url} alt="thumb" className="w-24 rounded-lg" />
                          <div className="text-xs">
                            <div className="font-semibold text-white">{ytMeta.title}</div>
                            <div className="text-slate-400 mt-0.5">{ytMeta.author_name}</div>
                            <div className="text-cyan-300 mt-1">
                              Attach your authorized local video file below to run FFmpeg cutting.
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {importMode === "url" ? (
                    <div className="space-y-2">
                      <label className="text-xs text-slate-300 font-medium">
                        Direct MP4 / MOV / WEBM URL (Google Drive direct download, Dropbox `dl=1`, or S3 URL)
                      </label>
                      <input
                        type="url"
                        value={externalUrl}
                        onChange={(e) => setExternalUrl(e.target.value)}
                        placeholder="https://example.com/my-authorized-video.mp4"
                        className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-sm focus:outline-none focus:border-violet-400"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="block border-2 border-dashed border-violet-500/40 hover:border-violet-400 rounded-2xl p-8 text-center cursor-pointer bg-violet-500/5 transition">
                        <input
                          type="file"
                          accept=".mp4,.mov,.webm,.mkv,video/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              setSelectedFile(f);
                              if (!projectTitle) setProjectTitle(f.name.replace(/\.[^.]+$/, ""));
                            }
                          }}
                        />
                        <Upload className="w-8 h-8 mx-auto text-violet-400 mb-2" />
                        <div className="font-semibold text-sm">
                          {selectedFile ? selectedFile.name : "Drop or click to upload your video"}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {selectedFile
                            ? `${formatBytes(selectedFile.size)} · Ready for FFmpeg cutting`
                            : `MP4, MOV, WEBM, MKV · Max ${health.max_upload_mb} MB`}
                        </div>
                      </label>

                      {localPreviewUrl && (
                        <video
                          src={localPreviewUrl}
                          controls
                          className="w-full max-h-64 rounded-xl bg-black border border-white/10"
                        />
                      )}
                    </div>
                  )}

                  {/* Project Title */}
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1.5">
                      Project Title
                    </label>
                    <input
                      type="text"
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      placeholder="e.g., Podcast Episode 14 Highlights"
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm focus:outline-none focus:border-violet-400"
                    />
                  </div>

                  {/* Clipping Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-300 font-medium block mb-1.5">
                        Clipping Mode
                      </label>
                      <select
                        value={clipMode}
                        onChange={(e) => setClipMode(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0d1d] border border-white/10 text-sm"
                      >
                        {CLIPPING_MODES.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 font-medium block mb-1.5">
                        Max Clips to Cut ({maxClips})
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={12}
                        value={maxClips}
                        onChange={(e) => setMaxClips(Number(e.target.value))}
                        className="w-full accent-violet-500 mt-2"
                      />
                    </div>
                  </div>

                  {/* Duration Presets */}
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-2">
                      Target Clip Duration
                    </label>
                    <div className="flex flex-wrap gap-2 items-center">
                      {DURATION_PRESETS.map((sec) => (
                        <button
                          key={sec}
                          onClick={() => {
                            setTargetDuration(sec);
                            setCustomDuration("");
                          }}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border ${
                            !customDuration && targetDuration === sec
                              ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                              : "bg-white/5 border-white/10 text-slate-400"
                          }`}
                        >
                          {sec}s
                        </button>
                      ))}
                      <input
                        type="number"
                        min={5}
                        max={180}
                        value={customDuration}
                        onChange={(e) => setCustomDuration(e.target.value)}
                        placeholder="Custom (sec)"
                        className="w-32 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs"
                      />
                    </div>
                  </div>

                  {/* Aspect Ratio */}
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-2">
                      Export Video Format
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {ASPECT_RATIOS.map((ar) => (
                        <button
                          key={ar.value}
                          onClick={() => setAspectRatio(ar.value)}
                          className={`p-3 rounded-xl text-left border transition ${
                            aspectRatio === ar.value
                              ? "bg-violet-600/25 border-violet-400"
                              : "bg-white/5 border-white/10 hover:border-white/20"
                          }`}
                        >
                          <div className="text-sm font-bold">{ar.label}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{ar.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Captions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-300 font-medium block mb-1.5">
                        Caption Language
                      </label>
                      <select
                        value={captionLanguage}
                        onChange={(e) => setCaptionLanguage(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0d1d] border border-white/10 text-sm"
                      >
                        {CAPTION_LANGUAGES.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 font-medium block mb-1.5">
                        Animated Subtitle Style
                      </label>
                      <select
                        value={captionStyle}
                        onChange={(e) => setCaptionStyle(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0d1d] border border-white/10 text-sm"
                      >
                        {CAPTION_STYLES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-white/10">
                    <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={burnCaptions}
                        onChange={(e) => setBurnCaptions(e.target.checked)}
                        className="rounded accent-violet-500"
                      />
                      Burn animated subtitles directly into exported MP4 clips via FFmpeg
                    </label>
                    <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={copyrightConfirmed}
                        onChange={(e) => setCopyrightConfirmed(e.target.checked)}
                        className="rounded accent-cyan-500"
                      />
                      I confirm I own this video or have legal authorization to process and clip it.
                    </label>
                  </div>

                  {submitError && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-200">
                      {submitError}
                    </div>
                  )}

                  <button
                    disabled={submitting}
                    onClick={handleStartProcessing}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 font-bold text-sm shadow-lg shadow-violet-600/30 hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading to FFmpeg Server ({uploadPercent}%)...
                      </>
                    ) : (
                      <>
                        <Scissors className="w-4 h-4" />
                        Analyze & Cut Real MP4 Clips with FFmpeg
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column: Live 10-Stage Backend Progress */}
              <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4 h-fit">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" /> Live Backend Pipeline
                  </h3>
                  {activeJobProject && (
                    <span className="text-xs font-mono text-cyan-300">
                      {activeJobProject.progress_percent || 0}%
                    </span>
                  )}
                </div>

                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-300"
                    style={{ width: `${activeJobProject?.progress_percent || 0}%` }}
                  />
                </div>

                <div className="space-y-2">
                  {PIPELINE_STAGES.map((stageName, i) => {
                    const num = i + 1;
                    const currentIdx = activeJobProject?.stage_index || 0;
                    const isDone = activeJobProject?.status === "completed" || currentIdx > num;
                    const isCurrent = activeJobProject?.status === "processing" && currentIdx === num;
                    const isFailed =
                      activeJobProject?.status === "failed" &&
                      activeJobProject?.failed_stage === stageName;

                    return (
                      <div
                        key={stageName}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs border ${
                          isFailed
                            ? "bg-rose-500/15 border-rose-500/40 text-rose-200"
                            : isDone
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                            : isCurrent
                            ? "bg-violet-500/20 border-violet-400/50 text-white"
                            : "bg-black/20 border-white/5 text-slate-500"
                        }`}
                      >
                        <span>
                          {num}. {stageName}
                        </span>
                        {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        {isCurrent && <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-300" />}
                        {isFailed && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                      </div>
                    );
                  })}
                </div>

                {activeJobProject?.status === "failed" && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 space-y-2 text-xs text-rose-200">
                    <div className="font-semibold">
                      Failed at: {activeJobProject.failed_stage}
                    </div>
                    <div>{activeJobProject.error_message}</div>
                    <button
                      onClick={() => handleRetryProject(activeJobProject.id)}
                      className="w-full py-2 rounded-lg bg-rose-500/30 hover:bg-rose-500/40 font-semibold text-white"
                    >
                      Retry Job
                    </button>
                  </div>
                )}

                {activeJobProject?.status === "completed" && (
                  <button
                    onClick={() => {
                      setSelectedProjectId(activeJobProject.id);
                      setActiveTab("clips");
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-xs font-bold"
                  >
                    Open Generated MP4 Clips →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ================= GENERATED CLIPS ================= */}
          {activeTab === "clips" && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white/[0.04] border border-white/10">
                <div className="flex items-center gap-3 flex-wrap">
                  <FolderOpen className="w-5 h-5 text-violet-400" />
                  <select
                    value={selectedProject?.id || ""}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="px-3.5 py-2 rounded-xl bg-[#0d0d1d] border border-white/10 text-sm font-medium"
                  >
                    {projects.length === 0 && <option value="">No projects yet</option>}
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.verified_clip_count || 0} clips · {p.status})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProject?.status === "completed" &&
                  (selectedProject.verified_clip_count || 0) > 0 &&
                  selectedProject.zip_download_url && (
                    <a
                      href={resolveApiUrl(apiBaseUrl, selectedProject.zip_download_url)}
                      download
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-xs font-bold text-white shadow-lg shadow-violet-600/20"
                    >
                      <Archive className="w-4 h-4" />
                      Download All Clips as ZIP ({selectedProject.verified_clip_count} MP4s)
                    </a>
                  )}
              </div>

              {!selectedProject || !selectedProject.clips?.length ? (
                <div className="p-12 text-center rounded-2xl bg-white/[0.03] border border-white/10 text-slate-400 text-sm">
                  No verified MP4 clips found for this project yet. Upload a video in{" "}
                  <button
                    onClick={() => setActiveTab("create")}
                    className="text-cyan-300 underline font-semibold"
                  >
                    Create New Clips
                  </button>
                  .
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {selectedProject.clips
                    .filter((c) => c.file_verified && c.file_size_bytes > 0)
                    .map((clip) => (
                      <div
                        key={clip.id}
                        className="rounded-2xl overflow-hidden bg-white/[0.04] border border-white/10 flex flex-col justify-between"
                      >
                        <div>
                          <div className="bg-black relative">
                            <video
                              controls
                              preload="metadata"
                              poster={
                                clip.thumbnail_url
                                  ? resolveApiUrl(apiBaseUrl, clip.thumbnail_url)
                                  : undefined
                              }
                              src={`${resolveApiUrl(apiBaseUrl, clip.video_url)}?v=${cacheBuster}`}
                              className="w-full max-h-80 object-contain mx-auto"
                            />
                            <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/75 border border-cyan-400/40 text-[11px] font-bold text-cyan-300">
                              Score {clip.engagement_score}/100
                            </div>
                          </div>

                          <div className="p-4 space-y-2">
                            <div className="font-bold text-sm leading-snug">{clip.title}</div>
                            <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                              <span className="px-2 py-0.5 rounded bg-white/5">
                                {formatTime(clip.start_sec)} → {formatTime(clip.end_sec)}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-white/5">
                                {Number(clip.verified_duration_sec || clip.duration_sec).toFixed(1)}s
                              </span>
                              <span className="px-2 py-0.5 rounded bg-white/5">
                                {clip.resolution}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-white/5">
                                {formatBytes(clip.file_size_bytes)}
                              </span>
                            </div>
                            {clip.highlight_description && (
                              <p className="text-xs text-slate-400 line-clamp-2">
                                {clip.highlight_description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="p-4 pt-0 flex flex-wrap gap-2">
                          <a
                            href={resolveApiUrl(apiBaseUrl, clip.download_url)}
                            download
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white"
                          >
                            <Download className="w-3.5 h-3.5" /> MP4
                          </a>
                          {clip.srt_url && (
                            <a
                              href={resolveApiUrl(apiBaseUrl, clip.srt_url)}
                              download
                              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold"
                              title="Download SRT Subtitles"
                            >
                              SRT
                            </a>
                          )}
                          <button
                            onClick={() => openClipInEditor(selectedProject, clip)}
                            className="px-3 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-200 text-xs font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClip(selectedProject.id, clip.id)}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300"
                            title="Delete clip"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* ================= INTERACTIVE VIDEO EDITOR ================= */}
          {activeTab === "editor" && (
            <div className="space-y-5">
              {!editDraft || !editingContext ? (
                <div className="p-12 text-center rounded-2xl bg-white/[0.04] border border-white/10 text-slate-400 text-sm">
                  Open any clip from{" "}
                  <button
                    onClick={() => setActiveTab("clips")}
                    className="text-cyan-300 underline font-semibold"
                  >
                    Generated Clips
                  </button>{" "}
                  and click <strong>Edit</strong> to trim timestamps, edit subtitles, and re-render with FFmpeg.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm">Real Rendered Clip Preview</h3>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={editHistory.length === 0}
                          onClick={undoEdit}
                          className="p-2 rounded-lg bg-white/5 disabled:opacity-30 hover:bg-white/10"
                          title="Undo"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          disabled={editFuture.length === 0}
                          onClick={redoEdit}
                          className="p-2 rounded-lg bg-white/5 disabled:opacity-30 hover:bg-white/10"
                          title="Redo"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <video
                      key={cacheBuster}
                      controls
                      src={`${resolveApiUrl(apiBaseUrl, editDraft.video_url)}?v=${cacheBuster}`}
                      className="w-full max-h-[460px] rounded-xl bg-black border border-white/10"
                    />

                    <div className="flex gap-2">
                      <a
                        href={resolveApiUrl(apiBaseUrl, editDraft.download_url)}
                        download
                        className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-center text-xs font-semibold"
                      >
                        Download Latest MP4
                      </a>
                      {editDraft.srt_url && (
                        <a
                          href={resolveApiUrl(apiBaseUrl, editDraft.srt_url)}
                          download
                          className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold"
                        >
                          Download SRT
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4">
                    <h3 className="font-bold text-sm">FFmpeg Trim & Caption Controls</h3>

                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Clip Title</label>
                      <input
                        type="text"
                        value={editDraft.title}
                        onChange={(e) => updateEditDraft({ title: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Start (sec)</label>
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          value={editDraft.start_sec}
                          onChange={(e) => updateEditDraft({ start_sec: Number(e.target.value) })}
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">End (sec)</label>
                        <input
                          type="number"
                          step="0.5"
                          min={1}
                          value={editDraft.end_sec}
                          onChange={(e) => updateEditDraft({ end_sec: Number(e.target.value) })}
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Aspect Ratio</label>
                        <select
                          value={editDraft.aspect_ratio}
                          onChange={(e) => updateEditDraft({ aspect_ratio: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-[#0d0d1d] border border-white/10 text-sm"
                        >
                          {ASPECT_RATIOS.map((ar) => (
                            <option key={ar.value} value={ar.value}>
                              {ar.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Caption Style</label>
                        <select
                          value={editDraft.caption_style}
                          onChange={(e) => updateEditDraft({ caption_style: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-[#0d0d1d] border border-white/10 text-sm"
                        >
                          {CAPTION_STYLES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-slate-200">
                      <input
                        type="checkbox"
                        checked={editDraft.burn_captions}
                        onChange={(e) => updateEditDraft({ burn_captions: e.target.checked })}
                        className="accent-violet-500"
                      />
                      Burn captions into MP4 video
                    </label>

                    {/* Editable Subtitle Cues */}
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <Subtitles className="w-3.5 h-3.5 text-cyan-400" /> Subtitle Lines
                        </span>
                        <button
                          onClick={() =>
                            updateEditDraft((prev) => ({
                              ...prev,
                              captions: [
                                ...prev.captions,
                                { start: 0, end: 2, text: "New caption line" },
                              ],
                            }))
                          }
                          className="text-xs text-cyan-300 hover:underline"
                        >
                          + Add Cue
                        </button>
                      </div>
                      {editDraft.captions.map((cue, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={cue.text}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateEditDraft((prev) => ({
                                ...prev,
                                captions: prev.captions.map((c, i) =>
                                  i === idx ? { ...c, text: val } : c
                                ),
                              }));
                            }}
                            className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs"
                          />
                          <button
                            onClick={() =>
                              updateEditDraft((prev) => ({
                                ...prev,
                                captions: prev.captions.filter((_, i) => i !== idx),
                              }))
                            }
                            className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {editorMessage && (
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-cyan-200">
                        {editorMessage}
                      </div>
                    )}

                    <button
                      disabled={rerendering}
                      onClick={handleRerenderClip}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {rerendering ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Re-rendering with FFmpeg...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" /> Save & Re-render Real MP4
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= CAPTION & HASHTAG GENERATOR ================= */}
          {activeTab === "captions" && (
            <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/10 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={captionInputTopic}
                  onChange={(e) => setCaptionInputTopic(e.target.value)}
                  placeholder="Enter your clip topic or transcript summary..."
                  className="md:col-span-2 px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
                />
                <select
                  value={captionPlatform}
                  onChange={(e) => setCaptionPlatform(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#0d0d1d] border border-white/10 text-sm"
                >
                  <option>YouTube Shorts</option>
                  <option>Instagram Reels</option>
                  <option>TikTok</option>
                </select>
              </div>

              <button
                onClick={handleGenerateSocialPack}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-xs font-bold"
              >
                Generate Titles, Hooks, Captions & 15 Hashtags
              </button>

              {generatedSocialPack && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-2">
                    <div className="text-xs font-bold text-cyan-300">5 Suggested Titles</div>
                    {generatedSocialPack.titles.map((t, i) => (
                      <div key={i} className="text-xs text-slate-200 flex justify-between gap-2">
                        <span>{i + 1}. {t}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard?.writeText(t);
                            showToast("Copied title!", "success");
                          }}
                          className="text-slate-400 hover:text-white"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-2">
                    <div className="text-xs font-bold text-violet-300">15 Content-Matched Hashtags</div>
                    <div className="flex flex-wrap gap-1.5">
                      {generatedSocialPack.hashtags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-[11px] text-violet-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= AI CONTENT ASSISTANT ================= */}
          {activeTab === "assistant" && (
            <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {assistantMessages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl text-sm whitespace-pre-line ${
                      m.role === "user"
                        ? "bg-violet-600/25 border border-violet-500/40 ml-8"
                        : "bg-black/35 border border-white/10 mr-8 text-slate-200"
                    }`}
                  >
                    {m.text}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={assistantPrompt}
                  onChange={(e) => setAssistantPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAssistantSend()}
                  placeholder="Ask for Hindi/Hinglish captions, viral hooks, or Shorts titles..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
                />
                <button
                  onClick={handleAssistantSend}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* ================= PLANS & CREDITS ================= */}
          {activeTab === "plans" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg">Subscription Plans</h2>
                <div className="flex rounded-xl bg-white/5 border border-white/10 p-1 text-xs">
                  {["INR", "USD"].map((cur) => (
                    <button
                      key={cur}
                      onClick={() => setCurrency(cur)}
                      className={`px-3 py-1 rounded-lg font-semibold ${
                        currency === cur ? "bg-violet-600 text-white" : "text-slate-400"
                      }`}
                    >
                      {cur}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  {
                    name: "Free",
                    price: currency === "INR" ? "₹0 / mo" : "$0 / mo",
                    features: ["Up to 5 videos / month", "Standard FFmpeg MP4 exports", "SRT subtitle export"],
                  },
                  {
                    name: "Pro",
                    price: currency === "INR" ? "₹799 / mo" : "$12 / mo",
                    features: ["50 videos / month", "All 6 animated ASS caption styles", "Batch ZIP downloads & HD 1080p"],
                  },
                  {
                    name: "Premium",
                    price: currency === "INR" ? "₹1,999 / mo" : "$29 / mo",
                    features: ["Unlimited priority workers", "Gemini + Whisper semantic highlights", "Team & API access"],
                  },
                ].map((plan) => (
                  <div
                    key={plan.name}
                    className="p-6 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between gap-5"
                  >
                    <div>
                      <div className="text-sm font-bold text-violet-300">{plan.name}</div>
                      <div className="text-3xl font-extrabold mt-2">{plan.price}</div>
                      <ul className="mt-4 space-y-2 text-xs text-slate-300">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button
                      onClick={() =>
                        showToast("Configure Razorpay or Stripe live keys on your backend to enable checkout.", "info")
                      }
                      className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold"
                    >
                      Configure Gateway
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= SYSTEM MONITOR ================= */}
          {activeTab === "admin" && (
            <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4">
              <h3 className="font-bold text-base">Live FFmpeg & Storage Diagnostics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-black/30 border border-white/10">
                  <div className="text-slate-400">Backend URL</div>
                  <div className="font-mono mt-1 text-cyan-300">{apiBaseUrl}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-black/30 border border-white/10">
                  <div className="text-slate-400">FFmpeg Version</div>
                  <div className="font-mono mt-1 text-emerald-300">
                    {health.ffmpeg_version || "Not detected"}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-black/30 border border-white/10">
                  <div className="text-slate-400">/data Volume Writable</div>
                  <div className="font-semibold mt-1">
                    {health.storage_writable ? "Yes" : "No / Offline"}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-black/30 border border-white/10">
                  <div className="text-slate-400">LLM API Key Configured</div>
                  <div className="font-semibold mt-1">
                    {health.ai_configured ? "Yes (Semantic Mode)" : "Fallback Audio/Scene Mode"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= SETTINGS ================= */}
          {activeTab === "settings" && (
            <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/10 space-y-5 max-w-2xl">
              <div>
                <h3 className="font-bold text-base">Backend API Connection</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Paste your live Railway backend URL (e.g.{" "}
                  <code className="text-cyan-300">https://your-service.up.railway.app</code>) or{" "}
                  <code className="text-cyan-300">http://localhost:8000</code> for local testing.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="url"
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                  placeholder="https://clipforge-backend-production.up.railway.app"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm font-mono"
                />
                <button
                  onClick={handleSaveBackendUrl}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-xs font-bold shrink-0"
                >
                  Save & Test Connection
                </button>
              </div>

              <div className="p-4 rounded-xl bg-black/30 border border-white/10 text-xs space-y-1.5">
                <div className="font-semibold text-slate-200">Current Health Check Result</div>
                <div className="text-slate-400">
                  Status:{" "}
                  <span className={health.online && health.ffmpeg_available ? "text-emerald-300" : "text-rose-300"}>
                    {health.online && health.ffmpeg_available ? "Connected & FFmpeg Ready" : "Offline / Not Ready"}
                  </span>
                </div>
                {health.ffmpeg_version && (
                  <div className="text-slate-400 font-mono">{health.ffmpeg_version}</div>
                )}
                {health.ffmpeg_error && <div className="text-rose-300">{health.ffmpeg_error}</div>}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
