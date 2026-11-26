import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clipboard,
  Clock,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Film,
  FolderOpen,
  Image as ImageIcon,
  Layers,
  Loader2,
  Mic,
  MicOff,
  Monitor,
  Music,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Save,
  Smartphone,
  Sparkles,
  Square,
  Subtitles,
  Trash2,
  Upload,
  Video,
  Wand2,
  X,
} from "lucide-react";

const STORAGE_KEY = "clipforge_motion_projects_v1";
const TRANSCRIBE_URL = "https://riverside.fm/transcription";
const DEFAULT_MOTION_BACKEND_URL = "https://clipforge-ai-production-b45ab787.up.railway.app";

function getMotionApiBaseUrl(propUrl) {
  if (propUrl) return String(propUrl).trim().replace(/\/+$/, "");
  try {
    const saved = localStorage.getItem("clipforge_api_base_url");
    if (saved) return saved.trim().replace(/\/+$/, "");
  } catch {}
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return String(envUrl).trim().replace(/\/+$/, "");
  return DEFAULT_MOTION_BACKEND_URL;
}

const FORMAT_OPTIONS = [
  { id: "16:9", name: "16:9", desc: "Landscape", width: 1280, height: 720, icon: Monitor },
  { id: "9:16", name: "9:16", desc: "Portrait", width: 720, height: 1280, icon: Smartphone },
  { id: "1:1", name: "1:1", desc: "Square", width: 900, height: 900, icon: Square },
];

const FPS_OPTIONS = [
  { value: 30, label: "30 fps", sub: "Standard" },
  { value: 60, label: "60 fps", sub: "Smoother" },
];

const EDIT_STYLES = [
  {
    id: "video_captions_broll",
    name: "Original Video + Animated Bottom Captions + B-Roll Image Slots",
    desc: "Plays your original video with punchy word-by-word animated captions at the bottom, and inserts empty image B-roll slots (with ready AI image prompts) scaled to your video length.",
    icon: Video,
    promptRules:
      'Keep the user\'s original video (`video "main"`) as the main visual with crisp animated bottom captions, and insert well-timed `image "image_1"`, `image "image_2"`, etc. B-roll cutaways every ~12–18 seconds based on video length. Provide a detailed image generation prompt for every single image inside `[ASSETS]`.',
  },
  {
    id: "clean_text_images",
    name: "Clean Animated Text + Image Slots (Classic Style)",
    desc: "Classic clean typography & cards with word-by-word animated bottom captions + empty image slots with AI image prompts for key moments.",
    icon: Subtitles,
    promptRules:
      'Use clean kinetic typography (`text`, `badge`, `stat`, `card`) paired with animated bottom captions and `image "image_1"`, `image "image_2"`, etc. B-roll slots scaled to the video duration. Include a custom AI image generation prompt for each image in `[ASSETS]`.',
  },
  {
    id: "composed_visuals",
    name: "Visual Story (More Image Slots + Bottom Captions)",
    desc: "Frequent custom image visuals synced to every major beat of your script, with animated bottom captions and ready AI prompts under each empty image box.",
    icon: Layers,
    promptRules:
      'Build a visual-first edit using frequent `image "image_1"`, `image "image_2"`, etc. scenes (every ~8–10 seconds) combined with animated bottom captions (`sub="..."`). List every image and its detailed generation prompt in `[ASSETS]`.',
  },
];

const THEMES = {
  dark: {
    label: "Obsidian Amber",
    bg1: "#09090f",
    bg2: "#16111f",
    accent: "#f59e0b",
    accent2: "#22d3ee",
    text: "#ffffff",
    sub: "#cbd5e1",
    cardBg: "rgba(255,255,255,0.08)",
    cardBorder: "rgba(245,158,11,0.45)",
  },
  neon: {
    label: "Cyber Violet",
    bg1: "#070714",
    bg2: "#1b0d38",
    accent: "#8b5cf6",
    accent2: "#06b6d4",
    text: "#ffffff",
    sub: "#cbd5e1",
    cardBg: "rgba(139,92,246,0.14)",
    cardBorder: "rgba(34,211,238,0.5)",
  },
  emerald: {
    label: "Finance Green",
    bg1: "#061210",
    bg2: "#0c241d",
    accent: "#10b981",
    accent2: "#34d399",
    text: "#ffffff",
    sub: "#a7f3d0",
    cardBg: "rgba(16,185,129,0.12)",
    cardBorder: "rgba(52,211,153,0.45)",
  },
  light: {
    label: "Clean Minimal",
    bg1: "#f8fafc",
    bg2: "#e2e8f0",
    accent: "#4f46e5",
    accent2: "#0ea5e9",
    text: "#0f172a",
    sub: "#475569",
    cardBg: "rgba(255,255,255,0.88)",
    cardBorder: "rgba(79,70,229,0.3)",
  },
};

const ANIMATIONS = ["fadeUp", "pop", "slideLeft", "slideRight", "zoomIn", "fadeIn", "none"];

const CUE_TYPES = [
  { value: "video", label: "Original Video + Bottom Captions" },
  { value: "image", label: "Image Slot + Bottom Captions" },
  { value: "text", label: "Clean Animated Text" },
  { value: "badge", label: "Hook Badge + Text" },
  { value: "stat", label: "Big Stat Highlight" },
  { value: "card", label: "Clean Info Card" },
];

const DEMO_TEMPLATES = [
  {
    title: "Video + B-Roll Image Slots",
    format: "9:16",
    theme: "dark",
    code: `[ASSETS]
image_1: Cinematic vertical 9:16 illustration of a futuristic glowing AI video studio floating over a dark desk, dramatic amber and cyan rim lighting, ultra clean, 4K, no text
image_2: Modern minimalist 3D smartphone mockup showing viral short-form video clips popping out of the screen, moody dark aesthetic, soft studio glow, 4K, no text

[RECIPE]
v1
theme=dark
00:00.00 --> 00:03.20 video "main" sub="Aaj main aapko ek free AI hack bataunga" in=fadeIn
00:03.20 --> 00:06.80 image "image_1" sub="Jisse aap unlimited cinematic videos bana sakte hain" in=zoomIn
00:06.80 --> 00:10.00 video "main" sub="Aur ismein aapka ek bhi rupaya nahi lagega" in=fadeIn
00:10.00 --> 00:13.50 image "image_2" sub="Bas 2 minute mein viral shorts ready ho jayenge" in=zoomIn`,
  },
  {
    title: "Clean Text + Image Story",
    format: "9:16",
    theme: "neon",
    code: `[ASSETS]
image_1: Dramatic cinematic vertical 9:16 photo of a young Indian creator editing at a glowing neon workstation at night, shallow depth of field, 4K, no text
image_2: Clean glowing 3D rocket launching upward representing viral social media growth on a dark purple background, sleek minimal style, 4K, no text

[RECIPE]
v1
theme=neon
00:00.00 --> 00:02.80 badge "STOP SCROLLING" sub="Most creators waste 4 hours editing one short" in=pop
00:02.80 --> 00:06.20 image "image_1" sub="Jabki smart editors AI workflow use karte hain" in=zoomIn
00:06.20 --> 00:09.00 stat "10x Faster" sub="Clean captions aur visual B-roll ke saath" in=pop
00:09.00 --> 00:12.50 image "image_2" sub="Save this workflow aur aaj hi try karo" in=zoomIn`,
  },
  {
    title: "YouTube Explainer (16:9)",
    format: "16:9",
    theme: "emerald",
    code: `[ASSETS]
image_1: Clean 16:9 widescreen editorial illustration of stacked glowing gold coins growing into a lush green tree on a dark emerald backdrop, 4K, no text

[RECIPE]
v1
theme=emerald
00:00.00 --> 00:03.20 text "You save every month, right?" sub="Let us see what compounding actually does" in=fadeUp
00:03.20 --> 00:06.80 image "image_1" sub="Small consistent investments grow silently over 10 years" in=zoomIn
00:06.80 --> 00:10.00 stat "₹11,60,000" sub="Starting with just ₹5,000 per month" in=pop`,
  },
];

function normalizeSmartQuotes(str) {
  return String(str || "")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
}

function hasTimestampsInText(text) {
  if (!text) return false;
  const srtMatch = /\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?\s*(?:-->|->)\s*\d{1,2}:\d{2}/.test(
    text
  );
  if (srtMatch) return true;
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const standaloneCount = lines.filter((l) =>
    /^\[?\d{1,2}:\d{2}(?::\d{2})?\]?(?:\s+.*)?$/.test(l)
  ).length;
  return standaloneCount >= 2;
}

function parseTimestamp(raw) {
  if (!raw) return 0;
  const cleaned = String(raw).trim().replace(",", ".");
  const parts = cleaned.split(":").map((p) => parseFloat(p));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function formatClock(sec) {
  const s = Math.max(0, Number(sec) || 0);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, "0")}:${rem.toFixed(1).padStart(4, "0")}`;
}

function formatRecipeTime(sec) {
  const s = Math.max(0, Number(sec) || 0);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, "0")}:${rem.toFixed(2).padStart(5, "0")}`;
}

function relativeTimeLabel(iso) {
  if (!iso) return "Just now";
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function generateImagePromptForScene(sceneText, formatId = "9:16") {
  const ratioLabel =
    formatId === "9:16"
      ? "vertical 9:16 portrait composition"
      : formatId === "1:1"
      ? "square 1:1 composition"
      : "widescreen 16:9 cinematic composition";

  const cleanContext = String(sceneText || "")
    .replace(/"/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  const lower = cleanContext.toLowerCase();

  let visualConcept = `a vivid, high-impact visual scene representing: "${cleanContext || "creator storytelling moment"}"`;

  if (lower.includes("chatgpt") || lower.includes("prompt") || lower.includes("ai")) {
    visualConcept = `a sleek modern dark laptop screen glowing with a futuristic AI prompt interface, soft neon reflections on a creator's desk, representing "${cleanContext}"`;
  } else if (lower.includes("gmail") || lower.includes("google") || lower.includes("vids") || lower.includes("veo")) {
    visualConcept = `a clean futuristic 3D UI concept showing glowing cloud video studio tools and app icons floating in mid-air over a dark sleek workspace, representing "${cleanContext}"`;
  } else if (lower.includes("friend") || lower.includes("gaon") || lower.includes("village") || lower.includes("paisa") || lower.includes("paise")) {
    visualConcept = `an emotional cinematic photograph of two young Indian friends aged 22-23 in a rural Indian village during golden hour sunset, warm realistic storytelling lighting, representing "${cleanContext}"`;
  } else if (lower.includes("short") || lower.includes("reel") || lower.includes("9:16") || lower.includes("size")) {
    visualConcept = `a crisp glowing smartphone displaying a vertical viral short-form video frame with floating cinematic film strips, dark studio aesthetic, representing "${cleanContext}"`;
  } else if (lower.includes("money") || lower.includes("save") || lower.includes("rupay") || lower.includes("free") || lower.includes("unlimited")) {
    visualConcept = `a dramatic high-contrast 3D visual of unlocked golden value and infinite creative power glowing in a sleek dark studio, representing "${cleanContext}"`;
  } else if (lower.includes("result") || lower.includes("generate") || lower.includes("ready") || lower.includes("comment")) {
    visualConcept = `a cinematic studio shot of a glowing video player timeline finishing a 100% AI render with dramatic light rays and crisp modern aesthetic, representing "${cleanContext}"`;
  }

  return `Create a photorealistic, high-retention B-roll image (${ratioLabel}) depicting ${visualConcept}. Dramatic cinematic lighting, crisp focus, rich depth of field, clean composition with subtle dark space at the bottom for subtitles, 4K quality, strictly NO text or watermarks in the image.`;
}

function parseRecipe(rawText, fallbackTheme = "dark", formatId = "9:16") {
  const result = {
    theme: fallbackTheme,
    bgColor: null,
    cues: [],
    requiredAssets: [], // [{ name, prompt, start, end, sceneText }]
    totalDuration: 10,
  };
  if (!rawText || !rawText.trim()) return result;

  const normalized = normalizeSmartQuotes(rawText).replace(/\r/g, "");
  const lines = normalized
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("```") && !l.startsWith("#") && !l.startsWith("//"));

  const timeRangeRegex =
    /^(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?|\d+(?:[.,]\d+)?)\s*(?:-->|->)\s*(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?|\d+(?:[.,]\d+)?)\s*(.*)$/;

  const logicalBlocks = [];
  const assetPromptMap = {};
  const assetOrder = [];
  let inAssetsSection = false;

  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper === "[ASSETS]" || upper.startsWith("[ASSETS]")) {
      inAssetsSection = true;
      continue;
    }
    if (upper === "[RECIPE]" || upper.startsWith("[RECIPE]")) {
      inAssetsSection = false;
      continue;
    }
    if (inAssetsSection) {
      if (line.toLowerCase() === "none" || line.toLowerCase() === "(none)") continue;
      // Parse lines like: "image_1: prompt text", "- image_1 | prompt", "1. image_1 - prompt"
      const cleanedAssetLine = line.replace(/^[-*•]\s*/, "").replace(/^\d+\.\s*/, "");
      const m = cleanedAssetLine.match(/^([a-zA-Z0-9_-]+)\s*[:|\-–—]\s*(.+)$/);
      if (m) {
        const key = m[1].toLowerCase().trim();
        const promptText = m[2].trim();
        if (!assetPromptMap[key]) assetOrder.push(key);
        assetPromptMap[key] = promptText;
      }
      continue;
    }

    if (line.toLowerCase() === "v1") continue;

    if (line.toLowerCase().startsWith("theme=")) {
      const t = line.split("=")[1]?.trim().toLowerCase();
      if (t && THEMES[t]) result.theme = t;
      continue;
    }
    if (line.toLowerCase().startsWith("bg ")) {
      result.bgColor = line.slice(3).trim();
      continue;
    }

    if (timeRangeRegex.test(line)) {
      logicalBlocks.push(line);
    } else if (logicalBlocks.length > 0) {
      logicalBlocks[logicalBlocks.length - 1] += " " + line;
    }
  }

  const cues = [];
  logicalBlocks.forEach((block, idx) => {
    const match = block.match(timeRangeRegex);
    if (!match) return;
    const start = parseTimestamp(match[1]);
    const end = Math.max(start + 0.4, parseTimestamp(match[2]));
    const rest = match[3] || "";

    let type = "text";
    let mainText = "";
    const typeMatch = rest.match(/\b(video|image|text|stat|card|badge)\s+"([^"]*)"/i);
    if (typeMatch) {
      type = typeMatch[1].toLowerCase();
      mainText = typeMatch[2];
    } else {
      const anyQuote = rest.match(/"([^"]*)"/);
      mainText = anyQuote ? anyQuote[1] : rest.replace(/\b\w+=\S+/g, "").trim();
    }

    const subMatch = rest.match(/\bsub="([^"]*)"/i);
    const animMatch = rest.match(/\bin=([a-zA-Z]+)/i);
    const colorMatch = rest.match(/\bcolor=(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)/i);
    const sizeMatch = rest.match(/\bsize=(small|medium|large)/i);
    const posMatch = rest.match(/\bpos=(top|center|bottom)/i);

    cues.push({
      id: `cue_${idx}_${start}_${end}`,
      start: Number(start.toFixed(2)),
      end: Number(end.toFixed(2)),
      type,
      text: mainText || "ClipForge Motion",
      sub: subMatch ? subMatch[1] : "",
      anim: animMatch && ANIMATIONS.includes(animMatch[1]) ? animMatch[1] : "fadeUp",
      color: colorMatch ? colorMatch[1] : "",
      size: sizeMatch ? sizeMatch[1].toLowerCase() : "large",
      pos: posMatch ? posMatch[1].toLowerCase() : "center",
    });
  });

  // Build ordered list of required image slots with timestamps + prompts
  const slotInfoByKey = {};
  cues.forEach((c) => {
    if (c.type === "image") {
      const key = String(c.text || "").toLowerCase().trim();
      if (!key) return;
      if (!slotInfoByKey[key]) {
        slotInfoByKey[key] = {
          name: key,
          start: c.start,
          end: c.end,
          sceneText: c.sub || c.text,
        };
      }
      if (!assetOrder.includes(key)) {
        assetOrder.push(key);
      }
    }
  });

  result.requiredAssets = assetOrder.map((key) => {
    const info = slotInfoByKey[key];
    return {
      name: key,
      prompt:
        assetPromptMap[key] ||
        generateImagePromptForScene(info?.sceneText || key.replace(/_/g, " "), formatId),
      start: info ? info.start : null,
      end: info ? info.end : null,
      sceneText: info ? info.sceneText : "",
    };
  });

  result.cues = cues;
  if (cues.length > 0) {
    result.totalDuration = Math.max(3, ...cues.map((c) => c.end));
  }
  return result;
}

function serializeCuesToRecipe(cues, theme = "dark", requiredAssets = []) {
  const lines = [];
  if (Array.isArray(requiredAssets) && requiredAssets.length > 0) {
    lines.push("[ASSETS]");
    requiredAssets.forEach((a) => {
      if (a?.name) {
        lines.push(`${a.name}: ${String(a.prompt || "").replace(/\r?\n/g, " ").trim()}`);
      }
    });
    lines.push("");
    lines.push("[RECIPE]");
  }
  lines.push("v1");
  lines.push(`theme=${theme}`);
  cues.forEach((c) => {
    const safeText = String(c.text || "").replace(/"/g, "'");
    let line = `${formatRecipeTime(c.start)} --> ${formatRecipeTime(c.end)} ${c.type} "${safeText}"`;
    if (c.sub) line += ` sub="${String(c.sub).replace(/"/g, "'")}"`;
    if (c.anim) line += ` in=${c.anim}`;
    if (c.color) line += ` color=${c.color}`;
    if (c.size && c.size !== "large") line += ` size=${c.size}`;
    if (c.pos && c.pos !== "center") line += ` pos=${c.pos}`;
    lines.push(line);
  });
  return lines.join("\n");
}

function splitLongSegment(start, end, text, maxWords = 10, maxDur = 4.2) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const words = clean.split(/\s+/);
  const totalDur = Math.max(1.2, end - start);

  // Split long 10-second SRT blocks into crisp 3-4s sub-segments so captions stay clean & snappy
  const piecesNeeded = Math.max(
    1,
    Math.ceil(words.length / maxWords),
    Math.ceil(totalDur / maxDur)
  );
  if (piecesNeeded <= 1) {
    return [{ start, end, text: clean }];
  }

  const wordsPerPiece = Math.ceil(words.length / piecesNeeded);
  const subParts = [];
  for (let i = 0; i < words.length; i += wordsPerPiece) {
    subParts.push(words.slice(i, i + wordsPerPiece).join(" "));
  }
  const totalChars = Math.max(
    1,
    subParts.reduce((acc, s) => acc + s.length, 0)
  );

  const out = [];
  let cursor = start;
  subParts.forEach((part, idx) => {
    const frac = part.length / totalChars;
    const partDur = idx === subParts.length - 1 ? Math.max(0.8, end - cursor) : Math.max(0.9, totalDur * frac);
    const nextEnd = idx === subParts.length - 1 ? end : Math.min(end, cursor + partDur);
    out.push({ start: cursor, end: nextEnd, text: part });
    cursor = nextEnd;
  });
  return out;
}

function extractTimedSegments(transcript) {
  const clean = normalizeSmartQuotes(transcript || "").trim();
  if (!clean) return [];

  // 1. Standard SRT / VTT format
  const srtBlocks = clean.split(/\r?\n\r?\n/);
  const srtTimeRe =
    /(\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3})/;

  const srtSegments = [];
  for (const block of srtBlocks) {
    const blines = block
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const timeLineIdx = blines.findIndex((l) => srtTimeRe.test(l));
    if (timeLineIdx !== -1) {
      const m = blines[timeLineIdx].match(srtTimeRe);
      const start = parseTimestamp(m[1]);
      const end = Math.max(start + 1.0, parseTimestamp(m[2]));
      const text = blines
        .slice(timeLineIdx + 1)
        .join(" ")
        .replace(/<[^>]+>/g, "")
        .trim();
      if (!text) continue;
      srtSegments.push(...splitLongSegment(start, end, text, 10, 4.2));
    }
  }
  if (srtSegments.length > 0) return srtSegments;

  // 2. Standalone MM:SS timestamped format (like Riverside / YouTube / Whisper)
  const rawLines = clean
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const standaloneTsRe = /^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?(?:\s+[-–—:]?\s*(.*))?$/;
  const timedSections = [];
  for (const rl of rawLines) {
    const m = rl.match(standaloneTsRe);
    if (m) {
      timedSections.push({
        start: parseTimestamp(m[1]),
        textParts: m[2] ? [m[2].trim()] : [],
      });
    } else if (timedSections.length > 0) {
      timedSections[timedSections.length - 1].textParts.push(rl);
    }
  }

  if (timedSections.length >= 2) {
    const out = [];
    timedSections.forEach((sec, sIdx) => {
      const text = sec.textParts.join(" ").trim();
      if (!text) return;
      const nextStart =
        sIdx + 1 < timedSections.length
          ? Math.max(sec.start + 1.5, timedSections[sIdx + 1].start)
          : sec.start + Math.max(3.0, text.split(/\s+/).length * 0.42);
      out.push(...splitLongSegment(sec.start, nextStart, text, 10, 4.2));
    });
    if (out.length > 0) return out;
  }

  // 3. Plain text transcript -> natural 2.8s - 3.8s speech chunks
  const cleanedPlain = rawLines
    .filter((l) => !/^\[?\d{1,2}:\d{2}(?::\d{2})?\]?$/.test(l))
    .join(" ");
  const sentences = cleanedPlain.split(/(?<=[.!?।])\s+/).filter(Boolean);
  const chunks = [];
  for (const s of sentences) {
    const words = s.split(/\s+/);
    if (words.length <= 10) {
      chunks.push(s);
    } else {
      for (let i = 0; i < words.length; i += 8) {
        chunks.push(words.slice(i, i + 8).join(" "));
      }
    }
  }

  let cursor = 0;
  return chunks.slice(0, 60).map((chunk) => {
    const dur = Math.min(4.0, Math.max(2.2, chunk.split(/\s+/).length * 0.38));
    const seg = { start: cursor, end: cursor + dur, text: chunk };
    cursor += dur;
    return seg;
  });
}

function buildRecipeFromTranscript(
  transcript,
  theme = "dark",
  editStyleId = "video_captions_broll",
  formatId = "9:16",
  hasOriginalVideo = false
) {
  const segments = extractTimedSegments(transcript);
  if (segments.length === 0) return DEMO_TEMPLATES[0].code;

  const totalDur = Math.max(5, segments[segments.length - 1].end);
  const useVideoBase = hasOriginalVideo || editStyleId === "video_captions_broll";
  const denseImages = editStyleId === "composed_visuals";

  // Automatically compute ideal number of image B-roll slots based on video length
  const spacingSec = denseImages ? 9 : 16;
  const targetSlots = Math.max(2, Math.min(14, Math.round(totalDur / spacingSec)));

  // Pick evenly spaced segment indices for image slots (skip index 0 so hook shows speaker/badge first)
  const imageSlotBySegIdx = new Map();
  if (segments.length >= 3) {
    const step = (segments.length - 1) / targetSlots;
    let imgCounter = 1;
    for (let k = 0; k < targetSlots; k++) {
      const segIdx = Math.min(
        segments.length - 1,
        Math.max(1, Math.round(0.6 * step + k * step))
      );
      if (!imageSlotBySegIdx.has(segIdx)) {
        imageSlotBySegIdx.set(segIdx, `image_${imgCounter}`);
        imgCounter++;
      }
    }
  } else if (segments.length === 2) {
    imageSlotBySegIdx.set(1, "image_1");
  }

  const assetLines = ["[ASSETS]"];
  const recipeLines = ["", "[RECIPE]", "v1", `theme=${theme}`];

  segments.forEach((seg, idx) => {
    const safe = seg.text.replace(/"/g, "'").trim();
    if (!safe) return;
    const assignedAsset = imageSlotBySegIdx.get(idx);

    if (assignedAsset) {
      const prompt = generateImagePromptForScene(safe, formatId);
      assetLines.push(`${assignedAsset}: ${prompt}`);
      recipeLines.push(
        `${formatRecipeTime(seg.start)} --> ${formatRecipeTime(seg.end)} image "${assignedAsset}" sub="${safe}" in=zoomIn`
      );
      return;
    }

    if (useVideoBase) {
      recipeLines.push(
        `${formatRecipeTime(seg.start)} --> ${formatRecipeTime(seg.end)} video "main" sub="${safe}" in=fadeIn`
      );
      return;
    }

    // Classic clean animated text style (no fake charts/hubs!)
    const hasNumber = /\d+%|₹\d+|\$\d+|\d+x|\b100\b|\b99\b/i.test(safe);
    if (idx === 0) {
      const words = safe.split(/\s+/);
      const hook = words.slice(0, 3).join(" ").toUpperCase();
      recipeLines.push(
        `${formatRecipeTime(seg.start)} --> ${formatRecipeTime(seg.end)} badge "${hook}" sub="${safe}" in=pop`
      );
    } else if (hasNumber) {
      const numMatch = safe.match(/(₹?\d[\d,]*(?:\.\d+)?%?x?)/i);
      const bigStat = numMatch ? numMatch[1] : safe.split(/\s+/).slice(0, 3).join(" ");
      recipeLines.push(
        `${formatRecipeTime(seg.start)} --> ${formatRecipeTime(seg.end)} stat "${bigStat}" sub="${safe}" in=pop`
      );
    } else if (idx % 4 === 0) {
      const title = safe.split(/\s+/).slice(0, 4).join(" ");
      recipeLines.push(
        `${formatRecipeTime(seg.start)} --> ${formatRecipeTime(seg.end)} card "${title}" sub="${safe}" in=fadeUp`
      );
    } else {
      recipeLines.push(
        `${formatRecipeTime(seg.start)} --> ${formatRecipeTime(seg.end)} text "${safe}" in=fadeUp`
      );
    }
  });

  if (assetLines.length === 1) {
    assetLines.push(
      `image_1: ${generateImagePromptForScene(segments[0]?.text || "main visual", formatId)}`
    );
  }

  return [...assetLines, ...recipeLines].join("\n");
}

function buildAiHandoffPrompt(
  transcript,
  formatId,
  fps,
  editStyleId,
  themeId,
  hasOriginalVideo
) {
  const styleObj = EDIT_STYLES.find((s) => s.id === editStyleId) || EDIT_STYLES[0];
  const segments = extractTimedSegments(transcript);
  const estDur = segments.length > 0 ? Math.round(segments[segments.length - 1].end) : 30;
  const recommendedImages = Math.max(
    2,
    Math.min(14, Math.round(estDur / (editStyleId === "composed_visuals" ? 9 : 16)))
  );
  const useVideo = hasOriginalVideo || editStyleId === "video_captions_broll";

  return `You are a video editor for ClipForge Motion Studio.
Create a clean, engaging edit with animated bottom captions and custom image B-roll slots matched to the transcript length (~${estDur} seconds).

PROJECT SETTINGS:
- Aspect Ratio: ${formatId}
- Frame Rate: ${fps} fps
- Edit Style: ${styleObj.name}
- Theme: ${themeId}
- Recommended Image Assets for this duration: ${recommendedImages} unique image slots (image_1 to image_${recommendedImages})
- Style Rules: ${styleObj.promptRules}

IMPORTANT RULES:
1. DO NOT invent fake charts, fake search bars, or repetitive filler graphics.
2. Keep every caption line short & natural (6–10 words per 3–4 second cue) because it will animate word-by-word at the bottom of the screen.
3. For EVERY image slot used in [RECIPE], write a rich, ready-to-use AI image generation prompt in [ASSETS] (specify ${formatId} framing, subject, lighting, mood, "no text in image").

STRICT OUTPUT FORMAT (reply ONLY with [ASSETS] and [RECIPE]):

[ASSETS]
image_1: Detailed ${formatId} AI image prompt for scene 1, cinematic lighting, 4K, no text
image_2: Detailed ${formatId} AI image prompt for scene 2, cinematic lighting, 4K, no text

[RECIPE]
v1
theme=${themeId}
${
  useVideo
    ? `00:00.00 --> 00:03.50 video "main" sub="Opening spoken line here" in=fadeIn`
    : `00:00.00 --> 00:03.50 badge "HOOK" sub="Opening spoken line here" in=pop`
}
00:03.50 --> 00:07.50 image "image_1" sub="Spoken line while image_1 displays" in=zoomIn
${
  useVideo
    ? `00:07.50 --> 00:11.00 video "main" sub="Next spoken line on original video" in=fadeIn`
    : `00:07.50 --> 00:11.00 text "Next clean animated text line" in=fadeUp`
}

SUPPORTED CUE TYPES:
- video "main" sub="Spoken line for animated bottom captions"
- image "image_1" sub="Spoken line for animated bottom captions"
- text "Clean animated headline"
- badge "SHORT HOOK" sub="Spoken caption"
- stat "Big Number" sub="Spoken caption"
- card "Card Title" sub="Spoken caption"

TRANSCRIPT:
${transcript.trim() || "(Paste your transcript here)"}`;
}

function wrapCanvasText(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function easeOutCubic(t) {
  const x = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - x, 3);
}

function easeOutBack(t) {
  const x = Math.min(1, Math.max(0, t));
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function drawCoverMedia(ctx, mediaEl, mediaW, mediaH, x, y, w, h, zoom = 1) {
  const mw = mediaW || 1280;
  const mh = mediaH || 720;
  const targetRatio = w / h;
  const mediaRatio = mw / mh;
  let drawW = w;
  let drawH = h;
  if (mediaRatio > targetRatio) {
    drawH = h * zoom;
    drawW = drawH * mediaRatio;
  } else {
    drawW = w * zoom;
    drawH = drawW / mediaRatio;
  }
  const dx = x + (w - drawW) / 2;
  const dy = y + (h - drawH) / 2;
  ctx.drawImage(mediaEl, dx, dy, drawW, drawH);
}

// Crisp Word-by-Word Animated Bottom Subtitle Renderer (3-4 words per beat, never overflows!)
function drawAnimatedBottomCaption(ctx, width, height, captionText, elapsed, dur, theme) {
  const clean = String(captionText || "").trim();
  if (!clean) return;

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return;

  const wordsPerGroup = width < height ? 4 : 6;
  const groups = [];
  for (let i = 0; i < words.length; i += wordsPerGroup) {
    groups.push(words.slice(i, i + wordsPerGroup));
  }

  const progress = Math.min(0.9999, Math.max(0, elapsed / Math.max(0.4, dur)));
  const globalWordIdx = Math.floor(progress * words.length);
  const groupIdx = Math.min(groups.length - 1, Math.floor(globalWordIdx / wordsPerGroup));
  const activeWordInGroup = globalWordIdx - groupIdx * wordsPerGroup;
  const groupWords = groups[groupIdx];

  // Calculate pop-in animation for each group transition
  const groupStartFrac = (groupIdx * wordsPerGroup) / words.length;
  const groupElapsed = Math.max(0, (progress - groupStartFrac) * dur);
  const popEase = easeOutBack(Math.min(1, groupElapsed / 0.22));
  const slideY = (1 - easeOutCubic(Math.min(1, groupElapsed / 0.18))) * 16;

  const minDim = Math.min(width, height);
  let fontSize = Math.round(minDim * (width < height ? 0.056 : 0.052));
  ctx.font = `900 ${fontSize}px Inter, system-ui, sans-serif`;

  const maxLineW = width * 0.84;
  // Shrink font slightly if a 4-word group is still wide
  while (ctx.measureText(groupWords.join(" ")).width > maxLineW && fontSize > 22) {
    fontSize -= 2;
    ctx.font = `900 ${fontSize}px Inter, system-ui, sans-serif`;
  }

  const spaceW = ctx.measureText(" ").width * 1.15;
  const wordWidths = groupWords.map((w) => ctx.measureText(w).width);
  const totalTextW =
    wordWidths.reduce((a, b) => a + b, 0) + spaceW * Math.max(0, groupWords.length - 1);

  const pillPadX = Math.round(fontSize * 0.72);
  const pillPadY = Math.round(fontSize * 0.44);
  const pillW = Math.min(width * 0.92, totalTextW + pillPadX * 2);
  const pillH = fontSize + pillPadY * 2;
  const centerY = height * 0.84 + slideY;

  ctx.save();
  ctx.translate(width / 2, centerY);
  const safeScale = Math.min(1.04, 0.92 + 0.08 * popEase);
  ctx.scale(safeScale, safeScale);

  // Sleek Dark Frosted Caption Pill
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 22;
  ctx.fillStyle = "rgba(8, 8, 16, 0.82)";
  drawRoundedRect(ctx, -pillW / 2, -pillH / 2, pillW, pillH, 18);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = `${theme.accent}77`;
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, -pillW / 2, -pillH / 2, pillW, pillH, 18);
  ctx.stroke();

  // Draw Words with Active Spoken Word Highlight
  let cursorX = -totalTextW / 2;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  groupWords.forEach((word, idx) => {
    const wWidth = wordWidths[idx];
    const isActive = idx === activeWordInGroup;

    ctx.save();
    if (isActive) {
      // Soft highlight badge behind active word
      ctx.fillStyle = `${theme.accent}33`;
      drawRoundedRect(
        ctx,
        cursorX - 6,
        -fontSize * 0.62,
        wWidth + 12,
        fontSize * 1.24,
        10
      );
      ctx.fill();
    }

    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(4, Math.round(fontSize * 0.14));
    ctx.strokeStyle = "rgba(0,0,0,0.9)";
    ctx.strokeText(word, cursorX, 1);

    ctx.fillStyle = isActive ? theme.accent : "#ffffff";
    ctx.fillText(word, cursorX, 1);
    ctx.restore();

    cursorX += wWidth + spaceW;
  });

  ctx.restore();
}

function renderMotionFrame(ctx, width, height, currentTime, parsed, loadedImages, sourceVideoEl) {
  const theme = THEMES[parsed.theme] || THEMES.dark;
  const isLightTheme = parsed.theme === "light";
  const minDim = Math.min(width, height);
  const videoReady = Boolean(
    sourceVideoEl && sourceVideoEl.readyState >= 2 && sourceVideoEl.videoWidth > 0
  );

  // 1. Clean Animated Background
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, parsed.bgColor || theme.bg1);
  grad.addColorStop(1, parsed.bgColor || theme.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const glowX = width * (0.25 + 0.15 * Math.sin(currentTime * 0.65));
  const glowY = height * (0.3 + 0.12 * Math.cos(currentTime * 0.45));
  const rad1 = ctx.createRadialGradient(glowX, glowY, 10, glowX, glowY, width * 0.58);
  rad1.addColorStop(0, `${theme.accent}2e`);
  rad1.addColorStop(1, "transparent");
  ctx.fillStyle = rad1;
  ctx.fillRect(0, 0, width, height);

  const rad2 = ctx.createRadialGradient(
    width - glowX * 0.6,
    height - glowY * 0.5,
    10,
    width - glowX * 0.6,
    height - glowY * 0.5,
    width * 0.52
  );
  rad2.addColorStop(0, `${theme.accent2}24`);
  rad2.addColorStop(1, "transparent");
  ctx.fillStyle = rad2;
  ctx.fillRect(0, 0, width, height);

  // Subtle background grid
  ctx.save();
  ctx.strokeStyle = isLightTheme ? "rgba(15,23,42,0.05)" : "rgba(255,255,255,0.035)";
  ctx.lineWidth = 1;
  const gridStep = Math.round(minDim / 12);
  const offset = (currentTime * 14) % gridStep;
  for (let x = -gridStep + offset; x < width + gridStep; x += gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = -gridStep + offset; y < height + gridStep; y += gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  // 2. Active Cues
  const activeCues = parsed.cues.filter((c) => currentTime >= c.start && currentTime <= c.end);

  activeCues.forEach((cue) => {
    const elapsed = Math.max(0, currentTime - cue.start);
    const remaining = Math.max(0, cue.end - currentTime);
    const dur = Math.max(0.4, cue.end - cue.start);
    const normT = Math.min(1, elapsed / dur);
    const inDur = Math.min(0.42, dur * 0.32);
    const outDur = Math.min(0.22, dur * 0.18);

    const rawIn = Math.min(1, elapsed / inDur);
    const ease = easeOutCubic(rawIn);
    const spring = easeOutBack(rawIn);
    const fadeOut = remaining < outDur ? Math.max(0, remaining / outDur) : 1;

    // --- ORIGINAL VIDEO SCENE (`video`) ---
    if (cue.type === "video") {
      ctx.save();
      ctx.globalAlpha = Math.min(1, Math.max(0.2, rawIn * 2.5));
      if (videoReady) {
        drawCoverMedia(
          ctx,
          sourceVideoEl,
          sourceVideoEl.videoWidth,
          sourceVideoEl.videoHeight,
          0,
          0,
          width,
          height,
          1.0 + normT * 0.035
        );
        const vig = ctx.createLinearGradient(0, height * 0.62, 0, height);
        vig.addColorStop(0, "transparent");
        vig.addColorStop(1, "rgba(0,0,0,0.72)");
        ctx.fillStyle = vig;
        ctx.fillRect(0, height * 0.62, width, height * 0.38);
      } else {
        // If user hasn't attached original video yet, show clean kinetic text fallback
        const fontSize = Math.round(minDim * 0.064);
        ctx.font = `800 ${fontSize}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = theme.text;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const fallbackLines = wrapCanvasText(ctx, cue.sub || "Attach Original Video in Assets", width * 0.8);
        const lh = fontSize * 1.25;
        const sy = height * 0.42 - ((fallbackLines.length - 1) * lh) / 2;
        fallbackLines.forEach((ln, i) => ctx.fillText(ln, width / 2, sy + i * lh));
      }
      ctx.restore();

      // Animated Word-by-Word Bottom Captions
      if (cue.sub) {
        drawAnimatedBottomCaption(ctx, width, height, cue.sub, elapsed, dur, theme);
      }
      return;
    }

    // --- B-ROLL IMAGE SLOT (`image`) ---
    if (cue.type === "image") {
      const assetKey = String(cue.text || "").toLowerCase().trim();
      const img = loadedImages[assetKey];
      ctx.save();
      ctx.globalAlpha = ease * fadeOut;

      if (img && img.complete && img.naturalWidth > 0) {
        // Full-bleed crisp B-roll photo with smooth Ken Burns zoom
        drawCoverMedia(
          ctx,
          img,
          img.naturalWidth,
          img.naturalHeight,
          0,
          0,
          width,
          height,
          1.03 + normT * 0.07
        );
        const vig = ctx.createLinearGradient(0, height * 0.6, 0, height);
        vig.addColorStop(0, "transparent");
        vig.addColorStop(1, "rgba(0,0,0,0.78)");
        ctx.fillStyle = vig;
        ctx.fillRect(0, height * 0.6, width, height * 0.4);
      } else {
        // Clean Empty Image Slot Placeholder Card (tells user exact slot name to upload)
        const boxW = width * 0.82;
        const boxH = height * 0.46;
        const bx = (width - boxW) / 2;
        const by = height * 0.19;

        ctx.fillStyle = theme.cardBg;
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 10]);
        drawRoundedRect(ctx, bx, by, boxW, boxH, 28);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);

        // Badge pill inside placeholder
        const pillText = `IMAGE SLOT: ${assetKey.toUpperCase()}`;
        ctx.font = `800 ${Math.round(minDim * 0.036)}px Inter, system-ui, sans-serif`;
        const pw = Math.min(boxW * 0.85, ctx.measureText(pillText).width + 38);
        const ph = Math.round(minDim * 0.078);
        ctx.fillStyle = theme.accent;
        drawRoundedRect(ctx, width / 2 - pw / 2, by + boxH * 0.32 - ph / 2, pw, ph, ph / 2);
        ctx.fill();

        ctx.fillStyle = "#09090f";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(pillText, width / 2, by + boxH * 0.32 + 1);

        ctx.fillStyle = theme.text;
        ctx.font = `700 ${Math.round(minDim * 0.044)}px Inter, system-ui, sans-serif`;
        ctx.fillText("Upload Image in Assets Tab", width / 2, by + boxH * 0.56);

        ctx.fillStyle = theme.sub;
        ctx.font = `500 ${Math.round(minDim * 0.032)}px Inter, system-ui, sans-serif`;
        ctx.fillText("AI image prompt is ready below this slot", width / 2, by + boxH * 0.68);
      }
      ctx.restore();

      // Animated Word-by-Word Bottom Captions over Image B-Roll
      if (cue.sub) {
        drawAnimatedBottomCaption(ctx, width, height, cue.sub, elapsed, dur, theme);
      }
      return;
    }

    // --- CLEAN TEXT / BADGE / STAT / CARD CUES ---
    let alpha = ease * fadeOut;
    let offsetX = 0;
    let offsetY = 0;
    let scale = 1;

    switch (cue.anim) {
      case "fadeUp":
        offsetY = (1 - ease) * (minDim * 0.07);
        break;
      case "pop":
        scale = 0.8 + 0.2 * spring;
        break;
      case "slideLeft":
        offsetX = (1 - ease) * (width * 0.18);
        break;
      case "slideRight":
        offsetX = -(1 - ease) * (width * 0.18);
        break;
      case "zoomIn":
        scale = 0.88 + 0.12 * ease + normT * 0.03;
        break;
      case "none":
        alpha = 1;
        break;
      default:
        break;
    }

    const hasBottomCap = Boolean(cue.sub && cue.type !== "text");
    const centerY =
      cue.pos === "top"
        ? height * 0.26
        : cue.pos === "bottom"
        ? height * 0.72
        : hasBottomCap
        ? height * 0.43
        : height * 0.48;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.translate(width / 2 + offsetX, centerY + offsetY);
    ctx.scale(scale, scale);

    const sizeMult = cue.size === "small" ? 0.8 : cue.size === "medium" ? 0.9 : 1;
    const textColor = cue.color || theme.text;
    const maxTextWidth = width * 0.84;

    if (cue.type === "stat") {
      const statSize = Math.round(minDim * 0.13 * sizeMult);
      ctx.font = `900 ${statSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const statGrad = ctx.createLinearGradient(-width * 0.3, 0, width * 0.3, 0);
      statGrad.addColorStop(0, cue.color || theme.accent);
      statGrad.addColorStop(1, theme.accent2);
      ctx.fillStyle = statGrad;
      const statLines = wrapCanvasText(ctx, cue.text, maxTextWidth);
      const lineH = statSize * 1.12;
      const startY = -((statLines.length - 1) * lineH) / 2;
      statLines.forEach((ln, i) => ctx.fillText(ln, 0, startY + i * lineH));
    } else if (cue.type === "card") {
      const titleSize = Math.round(minDim * 0.064 * sizeMult);
      ctx.font = `800 ${titleSize}px Inter, system-ui, sans-serif`;
      const titleLines = wrapCanvasText(ctx, cue.text, width * 0.74);
      const padY = minDim * 0.07;
      const cardW = width * 0.84;
      const cardH = padY * 2 + titleLines.length * titleSize * 1.24;

      ctx.shadowColor = "rgba(0,0,0,0.32)";
      ctx.shadowBlur = 24;
      ctx.fillStyle = theme.cardBg;
      ctx.strokeStyle = theme.cardBorder;
      ctx.lineWidth = 2.5;
      drawRoundedRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 26);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = cue.color || theme.accent;
      drawRoundedRect(ctx, -cardW * 0.14, -cardH / 2 + 16, cardW * 0.28, 6, 4);
      ctx.fill();

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = textColor;
      let yCursor = -((titleLines.length - 1) * titleSize * 1.24) / 2 + 6;
      titleLines.forEach((ln) => {
        ctx.fillText(ln, 0, yCursor);
        yCursor += titleSize * 1.24;
      });
    } else if (cue.type === "badge") {
      const badgeFontSize = Math.round(minDim * 0.044 * sizeMult);
      ctx.font = `900 ${badgeFontSize}px Inter, system-ui, sans-serif`;
      const pillText = cue.text.toUpperCase();
      const pillW = Math.min(width * 0.84, ctx.measureText(pillText).width + minDim * 0.12);
      const pillH = badgeFontSize * 2.2;

      ctx.fillStyle = cue.color || theme.accent;
      drawRoundedRect(ctx, -pillW / 2, -pillH / 2, pillW, pillH, pillH / 2);
      ctx.fill();

      ctx.fillStyle = "#09090f";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(pillText, 0, 1);
    } else {
      // Clean animated text (also plays smoothly with animated bottom caption if sub is present)
      const fontSize = Math.round(minDim * 0.072 * sizeMult);
      ctx.font = `800 ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = textColor;
      ctx.shadowColor = isLightTheme ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 16;

      const lines = wrapCanvasText(ctx, cue.text, maxTextWidth);
      const lineH = fontSize * 1.24;
      const startY = -((lines.length - 1) * lineH) / 2;
      lines.forEach((ln, i) => ctx.fillText(ln, 0, startY + i * lineH));
    }
    ctx.restore();

    // Render crisp animated bottom caption whenever `sub` exists
    if (cue.sub) {
      drawAnimatedBottomCaption(ctx, width, height, cue.sub, elapsed, dur, theme);
    }
  });

  // Bottom Progress Line
  const progress = parsed.totalDuration > 0 ? Math.min(1, currentTime / parsed.totalDuration) : 0;
  ctx.fillStyle = isLightTheme ? "rgba(15,23,42,0.12)" : "rgba(255,255,255,0.12)";
  ctx.fillRect(0, height - 6, width, 6);
  ctx.fillStyle = theme.accent;
  ctx.fillRect(0, height - 6, width * progress, 6);
}

export default function MotionEditor({ projects = [], showToast, apiBaseUrl }) {
  // Screens: home | workspace | get_code | get_transcript
  const [screen, setScreen] = useState("home");

  // Saved Recent Projects
  const [recentProjects, setRecentProjects] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  // Current Workspace Project State
  const [projectId, setProjectId] = useState(() => `motion_${Date.now()}`);
  const [projectTitle, setProjectTitle] = useState("Untitled Motion Edit");
  const [formatId, setFormatId] = useState("9:16");
  const [fps, setFps] = useState(30);
  const [editStyleId, setEditStyleId] = useState("video_captions_broll");
  const [themeId, setThemeId] = useState("dark");
  const [recipeDraft, setRecipeDraft] = useState("");
  const [appliedRecipe, setAppliedRecipe] = useState("");
  const [workspaceTab, setWorkspaceTab] = useState("assets"); // timeline | code | assets
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  // Playback & Export State
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportLabel, setExportLabel] = useState("");
  const [videoSeekTick, setVideoSeekTick] = useState(0);

  // Assets: Original Video + Voiceover Audio + Slot-Bound Images
  const [sourceVideoAsset, setSourceVideoAsset] = useState(null);
  const [useVideoAudio, setUseVideoAudio] = useState(true);
  const sourceVideoElRef = useRef(null);

  const [imageAssets, setImageAssets] = useState([]); // [{ name, url }]
  const loadedImagesRef = useRef({});
  const [copiedSlotKey, setCopiedSlotKey] = useState(null);
  const [audioAsset, setAudioAsset] = useState(null);
  const audioElRef = useRef(null);

  // Get Transcript State
  const [transcriptTab, setTranscriptTab] = useState("riverside");
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingTranscript, setPendingTranscript] = useState("");

  // Get Code + Handoff State
  const [transcriptInput, setTranscriptInput] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [showPromptBox, setShowPromptBox] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Live Mic Dictation State
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const lastFrameTsRef = useRef(null);
  const currentTimeRef = useRef(0);

  const activeFormat = useMemo(
    () => FORMAT_OPTIONS.find((f) => f.id === formatId) || FORMAT_OPTIONS[0],
    [formatId]
  );

  const parsedRecipe = useMemo(
    () => parseRecipe(appliedRecipe, themeId, formatId),
    [appliedRecipe, themeId, formatId]
  );

  const imageByNameMap = useMemo(() => {
    const map = {};
    imageAssets.forEach((a) => {
      map[a.name.toLowerCase()] = a;
    });
    return map;
  }, [imageAssets]);

  const uploadedRequiredCount = useMemo(() => {
    return parsedRecipe.requiredAssets.filter((a) => Boolean(imageByNameMap[a.name])).length;
  }, [parsedRecipe.requiredAssets, imageByNameMap]);

  const transcriptHasTiming = useMemo(
    () => hasTimestampsInText(transcriptInput),
    [transcriptInput]
  );

  const pendingHasTiming = useMemo(
    () => hasTimestampsInText(pendingTranscript),
    [pendingTranscript]
  );

  const allClipForgeClips = useMemo(() => {
    const out = [];
    if (!Array.isArray(projects)) return out;
    projects.forEach((p) => {
      if (Array.isArray(p?.clips)) {
        p.clips.forEach((c) => {
          out.push({
            id: c.id,
            title: `${p.title} — ${c.title}`,
            captions: c.captions || [],
            transcript: c.transcript || "",
          });
        });
      }
    });
    return out;
  }, [projects]);

  const notify = (msg, type = "info") => {
    if (showToast) showToast(msg, type);
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (audioElRef.current) {
        try {
          audioElRef.current.pause();
        } catch {}
      }
      if (sourceVideoElRef.current) {
        try {
          sourceVideoElRef.current.pause();
        } catch {}
      }
    };
  }, []);

  const saveProjectToRecents = (override = {}) => {
    const nextEntry = {
      id: override.id || projectId,
      title: (override.title || projectTitle || "Untitled Motion Edit").trim(),
      formatId: override.formatId || formatId,
      fps: override.fps || fps,
      themeId: override.themeId || themeId,
      code: override.code !== undefined ? override.code : recipeDraft || appliedRecipe,
      updatedAt: new Date().toISOString(),
    };
    setRecentProjects((prev) => {
      const filtered = prev.filter((p) => p.id !== nextEntry.id);
      const updated = [nextEntry, ...filtered].slice(0, 15);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const deleteRecentProject = (id, e) => {
    e?.stopPropagation();
    setRecentProjects((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    notify("Project removed from recent list.", "info");
  };

  const openSavedProject = (proj) => {
    setIsPlaying(false);
    setProjectId(proj.id);
    setProjectTitle(proj.title || "Motion Edit");
    setFormatId(proj.formatId || "9:16");
    setFps(proj.fps || 30);
    setThemeId(proj.themeId || "dark");
    setRecipeDraft(proj.code || "");
    setAppliedRecipe(proj.code || "");
    setCurrentTime(0);
    currentTimeRef.current = 0;
    setHistory([]);
    setFuture([]);
    setWorkspaceTab("assets");
    setScreen("workspace");
  };

  const startFreshWorkspace = (tab = "code", starter = null) => {
    setIsPlaying(false);
    const newId = `motion_${Date.now()}`;
    setProjectId(newId);
    setProjectTitle(starter?.title || "Untitled Motion Edit");
    setFormatId(starter?.format || formatId || "9:16");
    setThemeId(starter?.theme || themeId || "dark");
    const starterCode = starter?.code || "";
    setRecipeDraft(starterCode);
    setAppliedRecipe(starterCode);
    setCurrentTime(0);
    currentTimeRef.current = 0;
    setHistory([]);
    setFuture([]);
    setWorkspaceTab(tab);
    setScreen("workspace");
    if (starterCode) {
      saveProjectToRecents({
        id: newId,
        title: starter.title,
        formatId: starter.format,
        themeId: starter.theme,
        code: starterCode,
      });
    }
  };

  // Preload images into HTMLImageElements and redraw when loaded
  useEffect(() => {
    const map = {};
    imageAssets.forEach((asset) => {
      const img = new Image();
      img.onload = () => setVideoSeekTick((t) => t + 1);
      img.src = asset.url;
      map[asset.name.toLowerCase()] = img;
    });
    loadedImagesRef.current = map;
  }, [imageAssets]);

  // Draw preview frame
  useEffect(() => {
    if (screen !== "workspace" || exporting || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderMotionFrame(
      ctx,
      activeFormat.width,
      activeFormat.height,
      currentTime,
      parsedRecipe,
      loadedImagesRef.current,
      sourceVideoElRef.current
    );
  }, [
    screen,
    currentTime,
    parsedRecipe,
    activeFormat,
    imageAssets,
    exporting,
    sourceVideoAsset,
    videoSeekTick,
  ]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying || exporting) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioElRef.current && !audioElRef.current.paused) audioElRef.current.pause();
      if (sourceVideoElRef.current && !sourceVideoElRef.current.paused) {
        sourceVideoElRef.current.pause();
      }
      return;
    }

    if (audioElRef.current && audioAsset) {
      try {
        audioElRef.current.currentTime = currentTimeRef.current;
        audioElRef.current.play().catch(() => {});
      } catch {}
    }

    if (sourceVideoElRef.current && sourceVideoAsset) {
      try {
        sourceVideoElRef.current.muted = !useVideoAudio || Boolean(audioAsset);
        const targetT =
          sourceVideoAsset.duration && sourceVideoAsset.duration > 0
            ? currentTimeRef.current % sourceVideoAsset.duration
            : currentTimeRef.current;
        sourceVideoElRef.current.currentTime = targetT;
        sourceVideoElRef.current.play().catch(() => {});
      } catch {}
    }

    lastFrameTsRef.current = performance.now();
    const tick = (now) => {
      const dt = (now - (lastFrameTsRef.current || now)) / 1000;
      lastFrameTsRef.current = now;
      const next = currentTimeRef.current + dt;
      if (next >= parsedRecipe.totalDuration) {
        currentTimeRef.current = parsedRecipe.totalDuration;
        setCurrentTime(parsedRecipe.totalDuration);
        setIsPlaying(false);
        return;
      }
      currentTimeRef.current = next;
      setCurrentTime(next);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [
    isPlaying,
    exporting,
    parsedRecipe.totalDuration,
    audioAsset,
    sourceVideoAsset,
    useVideoAudio,
  ]);

  const handleSourceVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSourceVideoAsset({ name: file.name, url, duration: 0 });
    notify(`Original video "${file.name}" attached!`, "success");
    e.target.value = "";
  };

  // Upload image directly into a specific required slot (auto-binds to slotName!)
  const handleUploadImageForSlot = (slotName, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const key = String(slotName).toLowerCase().trim();
    const url = URL.createObjectURL(file);
    setImageAssets((prev) => {
      const filtered = prev.filter((a) => a.name.toLowerCase() !== key);
      return [...filtered, { name: key, url }];
    });
    notify(`Image added to ${key}!`, "success");
    e.target.value = "";
  };

  const handleRemoveImageAsset = (slotName) => {
    const key = String(slotName).toLowerCase().trim();
    setImageAssets((prev) => prev.filter((a) => a.name.toLowerCase() !== key));
  };

  const handleTakeText = async (fromClipboard = true) => {
    if (fromClipboard && navigator.clipboard?.readText) {
      try {
        const clipText = await navigator.clipboard.readText();
        if (clipText && clipText.trim()) {
          setPendingTranscript(clipText.trim());
          setConfirmModalOpen(true);
          return;
        }
      } catch {}
    }
    setPendingTranscript(transcriptInput || "");
    setConfirmModalOpen(true);
    if (fromClipboard) {
      notify("Paste your copied transcript/SRT in the box below and tap 'Use it'.", "info");
    }
  };

  const handleSaveTranscriptFile = (text) => {
    if (!text.trim()) return;
    const isSrt = hasTimestampsInText(text);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clipforge_transcript.${isSrt ? "srt" : "txt"}`;
    a.click();
    URL.revokeObjectURL(url);
    notify(`Saved as clipforge_transcript.${isSrt ? "srt" : "txt"}`, "success");
  };

  const handleConfirmUseTranscript = () => {
    if (!pendingTranscript.trim()) {
      notify("Please paste or enter your transcript first.", "error");
      return;
    }
    setTranscriptInput(pendingTranscript.trim());
    setConfirmModalOpen(false);
    setGeneratedPrompt("");
    setShowPromptBox(false);
    setScreen("get_code");
    notify("Transcript loaded! Pick format & style, then build or get prompt.", "success");
  };

  const handleSavePromptTxt = () => {
    if (!generatedPrompt) return;
    const blob = new Blob([generatedPrompt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clipforge_prompt_${formatId.replace(":", "x")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Prompt saved as .txt! Attach it in Claude, ChatGPT, or Gemini.", "success");
  };

  const handlePasteCodeFromClipboard = async () => {
    if (!navigator.clipboard?.readText) {
      notify("Paste directly into the code box below.", "info");
      return;
    }
    try {
      const txt = await navigator.clipboard.readText();
      if (!txt || !txt.trim()) {
        notify("Clipboard is empty. Copy the AI reply first.", "error");
        return;
      }
      setRecipeDraft(txt.trim());
      notify("Code pasted! Tap 'Apply & preview'.", "success");
    } catch {
      notify("Tap inside the code box and paste manually.", "info");
    }
  };

  const handleApplyCode = (overrideCode = null) => {
    const codeToUse = overrideCode !== null ? overrideCode : recipeDraft;
    if (!codeToUse.trim()) {
      notify("Paste a recipe code first or pick a template.", "error");
      return;
    }
    const testParsed = parseRecipe(codeToUse, themeId, formatId);
    if (testParsed.cues.length === 0) {
      notify(
        'No valid cues found. Example: 00:00.00 --> 00:03.00 video "main" sub="Hello" in=fadeIn',
        "error"
      );
      return;
    }
    if (appliedRecipe && appliedRecipe !== codeToUse) {
      setHistory((h) => [...h.slice(-20), appliedRecipe]);
      setFuture([]);
    }
    setThemeId(testParsed.theme);
    setRecipeDraft(codeToUse);
    setAppliedRecipe(codeToUse);
    setCurrentTime(0);
    currentTimeRef.current = 0;
    setIsPlaying(true);
    saveProjectToRecents({ code: codeToUse, themeId: testParsed.theme });
    if (testParsed.requiredAssets.length > 0) {
      setWorkspaceTab("assets");
      notify(
        `Applied ${testParsed.cues.length} scenes! ${testParsed.requiredAssets.length} image slots & prompts are ready in Assets.`,
        "success"
      );
    } else {
      notify(`Applied ${testParsed.cues.length} scenes! Playing preview.`, "success");
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setFuture((f) => [appliedRecipe, ...f]);
    setAppliedRecipe(prev);
    setRecipeDraft(prev);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setHistory((h) => [...h, appliedRecipe]);
    setAppliedRecipe(next);
    setRecipeDraft(next);
  };

  const updateCuesFromTimeline = (nextCues, extraAssets = null) => {
    const assetsToKeep = extraAssets || parsedRecipe.requiredAssets;
    const newCode = serializeCuesToRecipe(nextCues, parsedRecipe.theme, assetsToKeep);
    setHistory((h) => [...h.slice(-20), appliedRecipe]);
    setFuture([]);
    setRecipeDraft(newCode);
    setAppliedRecipe(newCode);
    saveProjectToRecents({ code: newCode });
  };

  const handleAddTimelineCue = (cueType = "image") => {
    const lastEnd =
      parsedRecipe.cues.length > 0 ? Math.max(...parsedRecipe.cues.map((c) => c.end)) : 0;
    const nextImgNum = parsedRecipe.requiredAssets.length + 1;
    const newAssetName = `image_${nextImgNum}`;
    const defaultsByType = {
      video: { text: "main", sub: "Add your spoken caption line here" },
      image: { text: newAssetName, sub: "Spoken caption while this image displays" },
      text: { text: "Clean animated headline", sub: "" },
      badge: { text: "HOOK", sub: "Opening spoken line here" },
      stat: { text: "10x Faster", sub: "Key highlight caption" },
      card: { text: "Key Point", sub: "Spoken explanation caption" },
    };
    const d = defaultsByType[cueType] || defaultsByType.text;
    const next = [
      ...parsedRecipe.cues,
      {
        id: `cue_${Date.now()}`,
        start: Number(lastEnd.toFixed(2)),
        end: Number((lastEnd + 3.5).toFixed(2)),
        type: cueType,
        text: d.text,
        sub: d.sub,
        anim: cueType === "image" ? "zoomIn" : "fadeUp",
        color: "",
        size: "large",
        pos: "center",
      },
    ];
    const nextAssets =
      cueType === "image"
        ? [
            ...parsedRecipe.requiredAssets,
            {
              name: newAssetName,
              prompt: generateImagePromptForScene(d.sub, formatId),
            },
          ]
        : parsedRecipe.requiredAssets;
    updateCuesFromTimeline(next, nextAssets);
    notify(
      cueType === "image"
        ? `Added empty slot "${newAssetName}" + prompt in Assets tab.`
        : `Added new ${cueType} scene.`,
      "success"
    );
  };

  const handleDownloadProjectFile = () => {
    saveProjectToRecents();
    const payload = {
      app: "ClipForge Motion Studio",
      version: "v3",
      title: projectTitle,
      formatId,
      fps,
      themeId,
      code: recipeDraft || appliedRecipe,
      savedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_") || "motion_edit"}.clipforge.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Project saved to Recent Projects & downloaded.", "success");
  };

  const handleOpenProjectFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "{}"));
        if (!parsed.code) throw new Error("Invalid project file.");
        setProjectTitle(parsed.title || file.name.replace(/\.json$/i, ""));
        setFormatId(parsed.formatId || "9:16");
        setFps(parsed.fps || 30);
        setThemeId(parsed.themeId || "dark");
        setRecipeDraft(parsed.code);
        setAppliedRecipe(parsed.code);
        setCurrentTime(0);
        currentTimeRef.current = 0;
        notify("Project loaded successfully!", "success");
      } catch {
        notify("Could not open file. Select a valid .clipforge.json file.", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Universal H.264 MP4 Export (Video + Images + Animated Bottom Captions + Audio)
  const handleExportVideo = async () => {
    if (!canvasRef.current || parsedRecipe.cues.length === 0) {
      notify("Apply a recipe before exporting.", "error");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      notify("Your browser does not support built-in video export. Try Chrome or Edge.", "error");
      return;
    }

    setIsPlaying(false);
    setExporting(true);
    setExportLabel("Preparing...");

    const baseSlug =
      projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") ||
      "clipforge_edit";

    const triggerDownload = (blob, filename) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    };

    let audioCtx = null;
    let exportVideo = null;
    let tempAudio = null;

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (sourceVideoAsset?.url) {
        exportVideo = document.createElement("video");
        exportVideo.src = sourceVideoAsset.url;
        exportVideo.crossOrigin = "anonymous";
        exportVideo.playsInline = true;
        exportVideo.loop = true;
        exportVideo.muted = !useVideoAudio || Boolean(audioAsset?.url);
        exportVideo.preload = "auto";
        await new Promise((res) => {
          exportVideo.oncanplay = res;
          exportVideo.onerror = res;
          setTimeout(res, 2500);
        });
      }

      renderMotionFrame(
        ctx,
        activeFormat.width,
        activeFormat.height,
        0,
        parsedRecipe,
        loadedImagesRef.current,
        exportVideo
      );

      const videoStream = canvas.captureStream(fps);
      const tracks = [...videoStream.getVideoTracks()];
      let hasAudioTrack = false;

      const shouldUseSeparateAudio = Boolean(audioAsset?.url);
      const shouldUseVideoAudio = Boolean(exportVideo && useVideoAudio && !shouldUseSeparateAudio);

      if (shouldUseSeparateAudio || shouldUseVideoAudio) {
        try {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          if (audioCtx.state === "suspended") await audioCtx.resume();
          const dest = audioCtx.createMediaStreamDestination();

          if (shouldUseSeparateAudio) {
            tempAudio = new Audio(audioAsset.url);
            tempAudio.crossOrigin = "anonymous";
            await new Promise((res) => {
              tempAudio.oncanplaythrough = res;
              tempAudio.onerror = res;
              setTimeout(res, 1500);
            });
            const srcNode = audioCtx.createMediaElementSource(tempAudio);
            srcNode.connect(dest);
          } else if (shouldUseVideoAudio && exportVideo) {
            exportVideo.muted = false;
            const srcNode = audioCtx.createMediaElementSource(exportVideo);
            srcNode.connect(dest);
          }

          const aTracks = dest.stream.getAudioTracks();
          if (aTracks.length > 0) {
            aTracks.forEach((t) => tracks.push(t));
            hasAudioTrack = true;
          }
        } catch {
          hasAudioTrack = false;
        }
      }

      const combinedStream = new MediaStream(tracks);
      const mimeCandidates = hasAudioTrack
        ? [
            "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
            "video/webm;codecs=vp8,opus",
            "video/webm;codecs=vp9,opus",
            "video/webm",
          ]
        : [
            "video/mp4;codecs=avc1.42E01E",
            "video/webm;codecs=vp8",
            "video/webm;codecs=vp9",
            "video/webm",
          ];

      const chosenMime =
        typeof MediaRecorder.isTypeSupported === "function"
          ? mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || ""
          : "";

      const recorderOptions = {
        videoBitsPerSecond: fps === 60 ? 5500000 : 4200000,
      };
      if (chosenMime) recorderOptions.mimeType = chosenMime;

      let recorder;
      try {
        recorder = new MediaRecorder(combinedStream, recorderOptions);
      } catch {
        recorder = new MediaRecorder(combinedStream);
      }

      const chunks = [];
      recorder.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) chunks.push(evt.data);
      };

      const donePromise = new Promise((resolve) => {
        recorder.onstop = () => resolve();
      });

      setExportLabel("Recording 0%");
      recorder.start(1000);
      await new Promise((r) => setTimeout(r, 80));

      if (exportVideo) {
        try {
          exportVideo.currentTime = 0;
          await exportVideo.play();
        } catch {}
      }
      if (tempAudio) {
        try {
          tempAudio.currentTime = 0;
          await tempAudio.play();
        } catch {}
      }

      const totalDur = Math.max(1, parsedRecipe.totalDuration);
      const startWall = performance.now();
      let lastUiUpdate = 0;

      await new Promise((resolve) => {
        const step = (now) => {
          const t = (now - startWall) / 1000;
          const clamped = Math.min(totalDur, t);
          renderMotionFrame(
            ctx,
            activeFormat.width,
            activeFormat.height,
            clamped,
            parsedRecipe,
            loadedImagesRef.current,
            exportVideo
          );
          if (now - lastUiUpdate >= 250 || clamped >= totalDur) {
            lastUiUpdate = now;
            const pct = Math.min(99, Math.round((clamped / totalDur) * 100));
            setExportLabel(`Recording ${pct}%`);
          }
          if (t < totalDur) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        };
        requestAnimationFrame(step);
      });

      await new Promise((r) => setTimeout(r, 180));
      if (exportVideo) exportVideo.pause();
      if (tempAudio) tempAudio.pause();
      if (recorder.state !== "inactive") recorder.stop();
      await donePromise;
      videoStream.getTracks().forEach((t) => t.stop());
      if (audioCtx) audioCtx.close().catch(() => {});

      const actualMime = recorder.mimeType || chosenMime || "video/webm";
      const rawBlob = new Blob(chunks, { type: actualMime });
      if (!rawBlob || rawBlob.size === 0) {
        throw new Error("Recorded video was empty. Keep this tab open while exporting.");
      }

      setExportLabel("Converting to MP4...");
      const mp4Name = `${baseSlug}_${fps}fps.mp4`;
      try {
        const backendUrl = getMotionApiBaseUrl(apiBaseUrl);
        const fd = new FormData();
        fd.append("file", rawBlob, `${baseSlug}.webm`);
        fd.append("fps", String(fps));
        fd.append("filename", mp4Name);

        const resp = await fetch(`${backendUrl}/api/motion/export-mp4`, {
          method: "POST",
          body: fd,
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const mp4Blob = await resp.blob();
        if (mp4Blob.size > 0) {
          triggerDownload(mp4Blob, mp4Name);
          notify(`Universal MP4 (${fps}fps) downloaded!`, "success");
          return;
        }
        throw new Error("Empty MP4 returned");
      } catch {
        const isNativeMp4 = actualMime.includes("mp4");
        triggerDownload(rawBlob, `${baseSlug}_${fps}fps.${isNativeMp4 ? "mp4" : "webm"}`);
        notify(
          isNativeMp4
            ? `MP4 (${fps}fps) exported & downloaded!`
            : `Video downloaded (${fps}fps). Ensure backend is online for universal MP4 conversion.`,
          "info"
        );
      }
    } catch (err) {
      notify(err?.message || "Export failed. Keep this tab open and try again.", "error");
    } finally {
      if (exportVideo) {
        try {
          exportVideo.pause();
        } catch {}
      }
      if (tempAudio) {
        try {
          tempAudio.pause();
        } catch {}
      }
      if (audioCtx) audioCtx.close().catch(() => {});
      setExporting(false);
      setExportLabel("");
    }
  };

  const handleTranscriptUpload = (e, goToGetCode = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || "");
      setTranscriptInput(content);
      notify(`Loaded ${file.name}!`, "success");
      if (goToGetCode && content.trim()) {
        setGeneratedPrompt("");
        setShowPromptBox(false);
        setScreen("get_code");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImportFromClip = (clipId) => {
    const clip = allClipForgeClips.find((c) => c.id === clipId);
    if (!clip) return;
    if (Array.isArray(clip.captions) && clip.captions.length > 0) {
      const srt = clip.captions
        .map((c, i) => {
          const s = formatRecipeTime(c.start || 0);
          const e = formatRecipeTime(c.end || (c.start || 0) + 2);
          return `${i + 1}\n00:${s.replace(".", ",")}0 --> 00:${e.replace(".", ",")}0\n${c.text}`;
        })
        .join("\n\n");
      setTranscriptInput(srt);
    } else if (clip.transcript) {
      setTranscriptInput(clip.transcript);
    } else {
      notify("This clip has no saved captions yet.", "info");
      return;
    }
    setProjectTitle(clip.title.slice(0, 48));
    notify("Clip transcript imported!", "success");
  };

  const toggleMicDictation = () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      notify("Live mic dictation works best in Google Chrome or Edge.", "error");
      return;
    }
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    const rec = new SpeechRec();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-IN";
    rec.onresult = (event) => {
      let added = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) added += event.results[i][0].transcript + " ";
      }
      if (added.trim()) {
        setTranscriptInput((prev) => (prev ? `${prev}\n${added.trim()}` : added.trim()));
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
    notify("Listening... speak clearly to transcribe.", "info");
  };

  // =========================================================================
  // RENDER 1: LAUNCHPAD HOME
  // =========================================================================
  if (screen === "home") {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-black font-black text-sm flex items-center justify-center shadow-lg shadow-amber-500/20">
              [CF]
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white tracking-tight">
                  ClipForge Motion Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold uppercase">
                  100% Free
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Animated bottom captions + length-matched image slots &amp; AI image prompts — 0
                credits
              </p>
            </div>
          </div>
        </div>

        <div className="text-sm font-semibold text-slate-300">What do you want to do?</div>

        <div className="space-y-3">
          <button
            onClick={() => startFreshWorkspace("code")}
            className="w-full text-left p-5 rounded-2xl bg-slate-100 hover:bg-white text-slate-900 transition flex items-center justify-between gap-4 shadow-xl"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 shrink-0">
                <Code2 className="w-6 h-6"/>
              </div>
              <div>
                <div className="font-extrabold text-base">I have code</div>
                <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Paste [ASSETS] + [RECIPE] from Claude, ChatGPT, or Gemini, upload images into
                  ready slots, and export MP4.
                </div>
              </div>
            </div>
            <span className="text-lg font-bold text-slate-700 shrink-0">→</span>
          </button>

          <button
            onClick={() => setScreen("get_code")}
            className="w-full text-left p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                <Wand2 className="w-6 h-6"/>
              </div>
              <div>
                <div className="font-bold text-base text-white">Get code</div>
                <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Paste your transcript, attach your original video, and automatically get animated
                  bottom captions + empty image slots with AI prompts.
                </div>
              </div>
            </div>
            <span className="text-lg font-bold text-slate-400 shrink-0">→</span>
          </button>

          <button
            onClick={() => {
              setTranscriptTab("riverside");
              setScreen("get_transcript");
            }}
            className="w-full text-left p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0">
                <Mic className="w-6 h-6"/>
              </div>
              <div>
                <div className="font-bold text-base text-white">Get transcript</div>
                <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Open Riverside.fm free transcription, upload .srt, dictate live, or import synced
                  captions from your clips.
                </div>
              </div>
            </div>
            <span className="text-lg font-bold text-slate-400 shrink-0">→</span>
          </button>
        </div>

        {/* Starter Templates */}
        <div className="space-y-2.5 pt-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Quick Starter Templates (With Image Slots &amp; Prompts)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {DEMO_TEMPLATES.map((tpl) => (
              <button
                key={tpl.title}
                onClick={() => startFreshWorkspace("assets", tpl)}
                className="p-3.5 rounded-xl bg-black/35 hover:bg-white/[0.06] border border-white/10 hover:border-amber-400/40 text-left transition space-y-1"
              >
                <div className="flex items-center justify-between">
                  <Sparkles className="w-4 h-4 text-amber-400"/>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-slate-300 font-semibold">
                    {tpl.format}
                  </span>
                </div>
                <div className="font-bold text-xs text-white pt-1">{tpl.title}</div>
                <div className="text-[11px] text-slate-400">Click to preview &amp; add images</div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Projects */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-slate-200">Recent projects</div>
            <span className="text-[11px] text-slate-500">Saved automatically in your browser</span>
          </div>

          {recentProjects.length === 0 ? (
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 text-center text-xs text-slate-500">
              No saved motion projects yet. Click a template above or start in Get code.
            </div>
          ) : (
            <div className="space-y-2">
              {recentProjects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => openSavedProject(proj)}
                  className="p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 cursor-pointer transition flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0">
                      <Film className="w-4 h-4 text-amber-400"/>
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-white truncate">{proj.title}</div>
                      <div className="text-[11px] text-slate-400">
                        {relativeTimeLabel(proj.updatedAt)} · {proj.formatId || "9:16"} ·{" "}
                        {proj.fps || 30}fps
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => deleteRecentProject(proj.id, e)}
                      className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                      title="Delete project"
                    >
                      <Trash2 className="w-4 h-4"/>
                    </button>
                    <span className="text-slate-400 font-bold">›</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER 2: GET TRANSCRIPT (RIVERSIDE.FM FREE TRANSCRIPTION + TAKE TEXT)
  // =========================================================================
  if (screen === "get_transcript") {
    return (
      <div className="max-w-3xl mx-auto space-y-4 relative">
        <div className="p-3 rounded-2xl bg-[#0d0d1a] border border-white/15 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setScreen("home")}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 shrink-0"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4"/>
            </button>
            <div className="min-w-0">
              <div className="font-extrabold text-sm text-white truncate">Get transcript</div>
              <div className="text-[11px] text-slate-400 truncate">
                Free transcription via Riverside.fm, live mic, or your ClipForge clips
              </div>
            </div>
          </div>

          <button
            onClick={() => setScreen("get_code")}
            className="text-xs text-amber-300 font-semibold hover:underline shrink-0"
          >
            Next: Get Code →
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: "riverside", label: "Riverside.fm (Free)", icon: Sparkles },
            { id: "mic", label: "Live Mic / Manual Paste", icon: Mic },
            ...(allClipForgeClips.length > 0
              ? [
                  {
                    id: "clips",
                    label: `My ClipForge Clips (${allClipForgeClips.length})`,
                    icon: Film,
                  },
                ]
              : []),
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setTranscriptTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
                  transcriptTab === tab.id
                    ? "bg-amber-500/20 border-amber-400 text-amber-200"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5"/>
                {tab.label}
              </button>
            );
          })}
        </div>

        {transcriptTab === "riverside" && (
          <div className="space-y-4">
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-violet-900/30 via-[#0e0e1d] to-amber-900/20 border border-amber-400/35 space-y-4 shadow-xl">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[11px] font-bold">
                  <Sparkles className="w-3.5 h-3.5"/> riverside.fm/transcription
                </div>
                <h3 className="text-lg font-extrabold text-white">
                  Free Audio &amp; Video Transcription (SRT / TXT)
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Click below to open Riverside.fm free transcription. Upload your audio or video,
                  download the <strong>.SRT</strong> file (or copy the transcript), then upload or
                  paste it right here.
                </p>
              </div>

              <a
                href={TRANSCRIBE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition"
              >
                Open Free Transcription (Riverside.fm)
                <ExternalLink className="w-4 h-4"/>
              </a>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                {[
                  {
                    n: "01",
                    t: "Open & Upload",
                    d: "Upload your MP3, WAV, or MP4 file on Riverside.fm.",
                  },
                  {
                    n: "02",
                    t: "Download .SRT / Copy",
                    d: "Choose SRT for exact voice timing, or copy the text.",
                  },
                  {
                    n: "03",
                    t: "Bring It Back Here",
                    d: "Upload the .srt below or tap Take text to open Get code.",
                  },
                ].map((step) => (
                  <div
                    key={step.n}
                    className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1"
                  >
                    <span className="text-[10px] font-mono font-bold text-amber-400">
                      STEP {step.n}
                    </span>
                    <div className="font-bold text-white">{step.t}</div>
                    <div className="text-[11px] text-slate-400 leading-relaxed">{step.d}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3">
              <div className="font-bold text-sm text-white">
                Already downloaded your .SRT or .TXT from Riverside?
              </div>
              <label className="w-full py-3.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-dashed border-amber-400/45 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition">
                <Upload className="w-4 h-4"/>
                Upload Riverside Transcript (.srt or .txt) &amp; Continue →
                <input
                  type="file"
                  accept=".txt,.srt,.vtt"
                  className="hidden"
                  onChange={(e) => handleTranscriptUpload(e, true)}
                />
              </label>
            </div>
          </div>
        )}

        {transcriptTab === "mic" && (
          <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-bold text-sm text-white">Live Mic Dictation / Paste SRT</div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Speak directly or upload a .txt / .srt file, then tap Take text below.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMicDictation}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
                    listening
                      ? "bg-rose-500/25 border-rose-400 text-rose-200 animate-pulse"
                      : "bg-white/10 hover:bg-white/15 border-white/15 text-white"
                  }`}
                >
                  {listening ? <MicOff className="w-4 h-4"/> : <Mic className="w-4 h-4"/>}
                  {listening ? "Stop Recording" : "Record Now"}
                </button>
                <label className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-200 text-xs font-bold cursor-pointer flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5"/> .srt / .txt
                  <input
                    type="file"
                    accept=".txt,.srt,.vtt"
                    className="hidden"
                    onChange={(e) => handleTranscriptUpload(e, false)}
                  />
                </label>
              </div>
            </div>

            <textarea
              rows={9}
              value={transcriptInput}
              onChange={(e) => setTranscriptInput(e.target.value)}
              placeholder="Speak into your mic or paste your transcript / SRT here..."
              className="w-full p-4 rounded-xl bg-black/50 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
            />
          </div>
        )}

        {transcriptTab === "clips" && (
          <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3">
            <div className="font-bold text-sm text-white">
              Select a ClipForge Clip to Grab Its Synced SRT Captions
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {allClipForgeClips.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    handleImportFromClip(c.id);
                    setScreen("get_code");
                  }}
                  className="p-3.5 rounded-xl bg-black/40 hover:bg-white/10 border border-white/10 text-left text-xs flex items-center justify-between gap-2"
                >
                  <span className="truncate font-semibold text-slate-200">{c.title}</span>
                  <span className="text-amber-300 shrink-0 font-bold">Use SRT →</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sticky Bottom Action Bar */}
        <div className="sticky bottom-3 z-20 p-3 rounded-2xl bg-[#0c0c18]/95 backdrop-blur-xl border border-white/15 shadow-2xl flex items-center justify-between gap-3">
          <button
            onClick={() => setScreen("home")}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 shrink-0"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4"/>
          </button>

          <button
            onClick={() => handleTakeText(true)}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
          >
            <Clipboard className="w-4 h-4"/>
            Take text
          </button>

          <button
            onClick={() => handleTakeText(false)}
            className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-1.5 shrink-0"
          >
            <Copy className="w-4 h-4"/>
            Paste
          </button>
        </div>

        {/* Confirmation Modal */}
        {confirmModalOpen && (
          <div className="fixed inset-0 z-[75] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4">
            <div className="w-full max-w-xl rounded-3xl bg-[#11111e] border border-white/15 p-5 sm:p-6 space-y-4 shadow-2xl">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-extrabold text-white">Use this transcript?</h3>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {pendingTranscript.length.toLocaleString()} characters · ready to send to Get
                    code
                  </div>
                </div>
                <button
                  onClick={() => setConfirmModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400"
                >
                  <X className="w-4 h-4"/>
                </button>
              </div>

              {pendingTranscript.trim() && !pendingHasTiming ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/35 text-xs text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5"/>
                  <span>
                    <strong>No timestamps detected.</strong> An <strong>.srt</strong> syncs
                    captions precisely to your voice; plain text uses automatic pacing.
                  </span>
                </div>
              ) : pendingHasTiming ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/35 text-xs text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0"/>
                  <span>
                    <strong>Timestamps detected!</strong> Ready for synced bottom captions &amp;
                    image slots.
                  </span>
                </div>
              ) : null}

              <textarea
                rows={8}
                value={pendingTranscript}
                onChange={(e) => setPendingTranscript(e.target.value)}
                placeholder="Paste your copied transcript or .srt subtitles here..."
                className="w-full p-3.5 rounded-2xl bg-black/60 border border-white/10 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-400"
              />

              <div className="grid grid-cols-3 gap-2.5">
                <button
                  onClick={() => setConfirmModalOpen(false)}
                  className="py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300"
                >
                  Not this
                </button>
                <button
                  disabled={!pendingTranscript.trim()}
                  onClick={() => handleSaveTranscriptFile(pendingTranscript)}
                  className="py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 disabled:opacity-40"
                >
                  Save file
                </button>
                <button
                  onClick={handleConfirmUseTranscript}
                  className="py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-xs font-extrabold text-black shadow-lg"
                >
                  Use it
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // RENDER 3: GET CODE
  // =========================================================================
  if (screen === "get_code") {
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setScreen("home")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4"/> Back
          </button>
          <h2 className="font-extrabold text-base sm:text-lg text-white">Get code</h2>
          <button
            onClick={() => {
              setWorkspaceTab("code");
              setScreen("workspace");
            }}
            className="text-xs text-amber-300 font-semibold hover:underline"
          >
            Open Editor →
          </button>
        </div>

        {/* How it works */}
        <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2 text-xs text-slate-300">
          <div className="font-bold text-sm text-white">How this works</div>
          <ol className="space-y-1 list-decimal list-inside leading-relaxed">
            <li>Attach your Original Video (optional) and paste or upload your .srt transcript.</li>
            <li>
              Tap <strong>Auto-Build With Image Slots</strong> (instant) or{" "}
              <strong>Get Prompt</strong> (for Claude/ChatGPT/Gemini).
            </li>
            <li>
              Based on your video length, empty <strong>Image Slots</strong> + ready{" "}
              <strong>AI Image Prompts</strong> appear automatically in the{" "}
              <strong>Assets</strong> tab — just copy each prompt, create the image, and upload it
              into its slot!
            </li>
            <li>Preview your animated bottom captions + images, then export universal MP4.</li>
          </ol>
        </div>

        {/* Original Video Upload Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-950/40 via-[#0e0e1e] to-cyan-950/30 border border-cyan-400/30 space-y-3">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-cyan-400"/>
            <span className="font-bold text-sm text-white">
              Attach Original Video (Optional — Plays With Animated Bottom Captions)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-dashed border-cyan-400/45 text-cyan-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition">
              <Upload className="w-4 h-4"/>
              {sourceVideoAsset
                ? `Loaded: ${sourceVideoAsset.name}`
                : "Upload Original Video (.mp4 / .mov / .webm)"}
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleSourceVideoUpload}
              />
            </label>
            {sourceVideoAsset && (
              <button
                type="button"
                onClick={() => setSourceVideoAsset(null)}
                className="px-3 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-bold"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {/* Transcript Section */}
        <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-bold text-sm text-white">Transcript</div>
              <div className="text-[11px] text-amber-300 mt-0.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 shrink-0"/>
                Upload an .srt file so animated bottom captions &amp; image slots sync to your
                video length.
              </div>
            </div>
            <a
              href={TRANSCRIBE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-300 font-semibold hover:underline inline-flex items-center gap-1"
            >
              Open Free Transcription (Riverside.fm) <ExternalLink className="w-3 h-3"/>
            </a>
          </div>

          {transcriptInput.trim() && !transcriptHasTiming && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/35 text-xs text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5"/>
              <span>
                No timestamps in this text. Upload an <strong>.srt</strong> for exact voice timing,
                or continue with automatic pacing.
              </span>
            </div>
          )}

          {transcriptHasTiming && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0"/>
              <span>Timestamps detected — captions &amp; image slots will match video length.</span>
            </div>
          )}

          <textarea
            rows={5}
            value={transcriptInput}
            onChange={(e) => setTranscriptInput(e.target.value)}
            placeholder="Paste your transcript or .srt subtitles here..."
            className="w-full p-4 rounded-xl bg-black/50 border border-white/10 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />

          <div className="flex flex-wrap gap-2">
            <label className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition">
              <Upload className="w-4 h-4"/>
              Upload transcript (.txt or .srt)
              <input
                type="file"
                accept=".txt,.srt,.vtt"
                className="hidden"
                onChange={(e) => handleTranscriptUpload(e, false)}
              />
            </label>

            {allClipForgeClips.length > 0 && (
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) handleImportFromClip(e.target.value);
                }}
                className="px-3 py-2.5 rounded-xl bg-[#0d0d1d] border border-cyan-400/30 text-xs text-cyan-200"
              >
                <option value="">Import from My Clips...</option>
                {allClipForgeClips.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Aspect Ratio */}
        <div className="space-y-2.5">
          <div className="text-sm font-bold text-white">Aspect ratio</div>
          <div className="grid grid-cols-3 gap-3">
            {FORMAT_OPTIONS.map((f) => {
              const Icon = f.icon;
              const active = formatId === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormatId(f.id)}
                  className={`p-4 rounded-2xl border text-center transition space-y-1.5 flex flex-col items-center ${
                    active
                      ? "bg-amber-500/15 border-amber-400/70 text-white shadow-lg shadow-amber-500/10"
                      : "bg-white/[0.03] border-white/10 text-slate-400 hover:border-white/25"
                  }`}
                >
                  <span className={active ? "text-amber-400" : "text-slate-400"}>
                    <Icon className="w-5 h-5"/>
                  </span>
                  <div className="font-extrabold text-sm">{f.name}</div>
                  <div className="text-[11px] opacity-80">{f.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Frame Rate */}
        <div className="space-y-2.5">
          <div className="text-sm font-bold text-white">Frame rate</div>
          <div className="grid grid-cols-2 gap-3">
            {FPS_OPTIONS.map((opt) => {
              const active = fps === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFps(opt.value)}
                  className={`p-4 rounded-2xl border text-center transition space-y-1 ${
                    active
                      ? "bg-amber-500/15 border-amber-400/70 text-white shadow-lg shadow-amber-500/10"
                      : "bg-white/[0.03] border-white/10 text-slate-400 hover:border-white/25"
                  }`}
                >
                  <div className="font-extrabold text-sm">{opt.label}</div>
                  <div className="text-[11px] opacity-80">{opt.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Edit Style */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm font-bold text-white">Edit style</div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Theme:</span>
              <select
                value={themeId}
                onChange={(e) => setThemeId(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-[#0d0d1d] border border-white/10 text-xs text-white"
              >
                {Object.entries(THEMES).map(([id, t]) => (
                  <option key={id} value={id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2.5">
            {EDIT_STYLES.map((st) => {
              const Icon = st.icon;
              const active = editStyleId === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setEditStyleId(st.id)}
                  className={`w-full p-4 rounded-2xl border text-left transition flex items-center justify-between gap-3 ${
                    active
                      ? "bg-amber-500/15 border-amber-400/70 shadow-lg shadow-amber-500/10"
                      : "bg-white/[0.03] border-white/10 hover:border-white/25"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        active
                          ? "bg-amber-500/25 text-amber-300"
                          : "bg-white/5 text-amber-400/80"
                      }`}
                    >
                      <Icon className="w-5 h-5"/>
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">{st.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        {st.desc}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      active ? "border-amber-400" : "border-slate-600"
                    }`}
                  >
                    {active && <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={() => {
              if (!transcriptInput.trim()) {
                notify("Please paste or upload a transcript first.", "error");
                return;
              }
              const autoCode = buildRecipeFromTranscript(
                transcriptInput,
                themeId,
                editStyleId,
                formatId,
                Boolean(sourceVideoAsset)
              );
              const parsed = parseRecipe(autoCode, themeId, formatId);
              const newId = `motion_${Date.now()}`;
              const cleanTitle =
                transcriptInput
                  .replace(/\[?\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?\]?/g, "")
                  .replace(/-->/g, "")
                  .trim()
                  .split(/\s+/)
                  .slice(0, 5)
                  .join(" ") || "Motion Edit";
              setProjectId(newId);
              setProjectTitle(cleanTitle);
              setRecipeDraft(autoCode);
              setAppliedRecipe(autoCode);
              setCurrentTime(0);
              currentTimeRef.current = 0;
              setWorkspaceTab("assets");
              setScreen("workspace");
              setIsPlaying(false);
              saveProjectToRecents({
                id: newId,
                title: cleanTitle,
                formatId,
                fps,
                themeId,
                code: autoCode,
              });
              notify(
                `Built clean timeline with ${parsed.requiredAssets.length} image slots & ready AI image prompts!`,
                "success"
              );
            }}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl transition"
          >
            <Sparkles className="w-4 h-4"/>
            Auto-Build Edit + Image Slots &amp; Prompts Instantly
          </button>

          <button
            type="button"
            onClick={() => {
              if (!transcriptInput.trim()) {
                notify("Please paste or upload a transcript first.", "error");
                return;
              }
              const promptText = buildAiHandoffPrompt(
                transcriptInput,
                formatId,
                fps,
                editStyleId,
                themeId,
                Boolean(sourceVideoAsset)
              );
              setGeneratedPrompt(promptText);
              setShowPromptBox(false);
              navigator.clipboard?.writeText(promptText).then(() => {
                setCopiedPrompt(true);
                setTimeout(() => setCopiedPrompt(false), 2500);
              });
              notify("Handoff prompt ready & copied!", "success");
            }}
            className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2"
          >
            <Wand2 className="w-4 h-4"/>
            Or Get Prompt (For Claude / ChatGPT / Gemini)
          </button>
        </div>

        {/* Handoff Ready Panel */}
        {generatedPrompt && (
          <div className="p-5 sm:p-6 rounded-3xl bg-emerald-950/40 border border-emerald-500/40 space-y-4 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-extrabold text-base text-emerald-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-400"/>
                Handoff ready
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Send this to Claude, ChatGPT, or Gemini. It returns{" "}
                <code className="text-emerald-200">[ASSETS]</code> (image prompts) and{" "}
                <code className="text-emerald-200">[RECIPE]</code>. Paste them into the editor and
                every image slot + prompt will automatically appear in Assets.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSavePromptTxt}
              className="w-full py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg"
            >
              <Download className="w-4 h-4"/>
              Save the prompt (.txt)
            </button>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(generatedPrompt);
                  setCopiedPrompt(true);
                  setTimeout(() => setCopiedPrompt(false), 2500);
                  notify("Prompt copied!", "success");
                }}
                className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white flex items-center justify-center gap-1.5"
              >
                {copiedPrompt ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400"/>
                ) : (
                  <Copy className="w-3.5 h-3.5"/>
                )}
                {copiedPrompt ? "Copied" : "Copy Text"}
              </button>
              <a
                href="[https://claude.ai/new](https://claude.ai/new)"
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-200 text-xs font-bold flex items-center justify-center gap-1"
              >
                Claude <ExternalLink className="w-3 h-3"/>
              </a>
              <a
                href="[https://chatgpt.com/](https://chatgpt.com/)"
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-200 text-xs font-bold flex items-center justify-center gap-1"
              >
                ChatGPT <ExternalLink className="w-3 h-3"/>
              </a>
              <a
                href="[https://gemini.google.com/app](https://gemini.google.com/app)"
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-200 text-xs font-bold flex items-center justify-center gap-1"
              >
                Gemini <ExternalLink className="w-3 h-3"/>
              </a>
            </div>

            <button
              type="button"
              onClick={() => setShowPromptBox((s) => !s)}
              className="w-full py-2.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 text-amber-300 text-xs font-bold flex items-center justify-center gap-2"
            >
              {showPromptBox ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
              {showPromptBox
                ? "Hide prompt"
                : `Show prompt (${generatedPrompt.length.toLocaleString()} characters)`}
            </button>

            {showPromptBox && (
              <pre className="text-[11px] text-slate-300 whitespace-pre-wrap max-h-64 overflow-y-auto p-3.5 rounded-xl bg-black/70 border border-white/10 font-mono">
                {generatedPrompt}
              </pre>
            )}

            <button
              type="button"
              onClick={() => {
                setWorkspaceTab("code");
                setScreen("workspace");
              }}
              className="w-full py-2 text-center text-sm font-extrabold text-white hover:text-amber-300 transition"
            >
              Got the code? Open the editor →
            </button>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // RENDER 4: WORKSPACE (Live Preview + Empty Image Slots w/ Prompts + Export)
  // =========================================================================
  return (
    <div className="space-y-4">
      {audioAsset && <audio ref={audioElRef} src={audioAsset.url} preload="auto" />}
      {sourceVideoAsset && (
        <video
          ref={sourceVideoElRef}
          src={sourceVideoAsset.url}
          playsInline
          loop
          preload="auto"
          className="hidden"
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (d && Number.isFinite(d)) {
              setSourceVideoAsset((prev) => (prev ? { ...prev, duration: d } : prev));
            }
            setVideoSeekTick((t) => t + 1);
          }}
          onLoadedData={() => setVideoSeekTick((t) => t + 1)}
          onSeeked={() => setVideoSeekTick((t) => t + 1)}
        />
      )}

      {/* Top Editor Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsPlaying(false);
              setScreen("home");
            }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200"
            title="Back to Launchpad"
          >
            <ArrowLeft className="w-4 h-4"/>
          </button>
          <button
            disabled={history.length === 0 || exporting}
            onClick={handleUndo}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30"
            title="Undo"
          >
            <RotateCcw className="w-4 h-4"/>
          </button>
          <button
            disabled={future.length === 0 || exporting}
            onClick={handleRedo}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30"
            title="Redo"
          >
            <RotateCw className="w-4 h-4"/>
          </button>

          <input
            type="text"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            className="hidden sm:block px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs font-bold text-white w-44 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <Video className="w-3.5 h-3.5"/>
            <span className="max-w-[120px] truncate">
              {sourceVideoAsset ? sourceVideoAsset.name : "Add Video"}
            </span>
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleSourceVideoUpload}
            />
          </label>

          <select
            disabled={exporting}
            value={`${formatId}_${fps}`}
            onChange={(e) => {
              const [fId, fRate] = e.target.value.split("_");
              setFormatId(fId);
              setFps(Number(fRate));
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs font-bold disabled:opacity-40"
          >
            {FORMAT_OPTIONS.map((f) =>
              FPS_OPTIONS.map((fr) => (
                <option
                  key={`${f.id}_${fr.value}`}
                  value={`${f.id}_${fr.value}`}
                  className="bg-[#0d0d1d] text-white"
                >
                  {f.id} · 1080p · {fr.value}fps
                </option>
              ))
            )}
          </select>

          <button
            disabled={exporting || parsedRecipe.cues.length === 0}
            onClick={handleExportVideo}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-extrabold disabled:opacity-40 flex items-center gap-1.5"
          >
            {exporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin"/> {exportLabel || "Exporting..."}
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5"/> Export MP4
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Split: Live Preview + Assets/Timeline/Code */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Live Video Preview Canvas */}
        <div className="lg:col-span-6 p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4">
          <div className="relative rounded-xl overflow-hidden bg-black border border-white/10 flex items-center justify-center min-h-[240px]">
            <canvas
              ref={canvasRef}
              width={activeFormat.width}
              height={activeFormat.height}
              className="w-full h-auto max-h-[450px] object-contain block"
            />
            {parsedRecipe.cues.length === 0 && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-6 space-y-2">
                <Film className="w-10 h-10 text-slate-500"/>
                <div className="font-bold text-sm text-white">No recipe yet</div>
                <div className="text-xs text-slate-400 max-w-xs">
                  Paste code in the Code tab or open <strong>Get code</strong> to auto-generate
                  bottom captions &amp; image slots.
                </div>
              </div>
            )}
            {exporting && (
              <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-black/80 border border-amber-400/50 text-amber-300 text-xs font-bold flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin"/>
                {exportLabel || "Exporting MP4..."} (Keep tab open)
              </div>
            )}
          </div>

          {/* Transport / Scrubber */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <button
                disabled={exporting}
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentTime(0);
                  currentTimeRef.current = 0;
                  if (sourceVideoElRef.current) sourceVideoElRef.current.currentTime = 0;
                }}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-40"
                title="Restart"
              >
                <RotateCcw className="w-4 h-4"/>
              </button>

              <button
                disabled={parsedRecipe.cues.length === 0 || exporting}
                onClick={() => {
                  if (currentTime >= parsedRecipe.totalDuration) {
                    setCurrentTime(0);
                    currentTimeRef.current = 0;
                  }
                  setIsPlaying((p) => !p);
                }}
                className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black flex items-center justify-center disabled:opacity-40 shrink-0 shadow-lg"
              >
                {isPlaying ? <Pause className="w-4 h-4"/> : <Play className="w-4 h-4 ml-0.5"/>}
              </button>

              <span className="text-xs font-mono text-slate-300 w-14">
                {formatClock(currentTime)}
              </span>

              <input
                type="range"
                disabled={exporting}
                min={0}
                max={parsedRecipe.totalDuration}
                step={0.05}
                value={Math.min(currentTime, parsedRecipe.totalDuration)}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCurrentTime(val);
                  currentTimeRef.current = val;
                  if (audioElRef.current && audioAsset) audioElRef.current.currentTime = val;
                  if (sourceVideoElRef.current && sourceVideoAsset) {
                    const dur = sourceVideoAsset.duration;
                    sourceVideoElRef.current.currentTime = dur > 0 ? val % dur : val;
                  }
                }}
                className="flex-1 accent-amber-500"
              />

              <span className="text-xs font-mono text-slate-400 w-14 text-right">
                {formatClock(parsedRecipe.totalDuration)}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 px-1">
              <span>
                {parsedRecipe.cues.length} cues · Images:{" "}
                <strong className="text-amber-300">
                  {uploadedRequiredCount}/{parsedRecipe.requiredAssets.length}
                </strong>
              </span>
              <div className="flex items-center gap-2">
                {sourceVideoAsset && (
                  <span className="text-cyan-300 flex items-center gap-1">
                    <Video className="w-3 h-3"/> Video Synced
                  </span>
                )}
                {audioAsset && (
                  <span className="text-emerald-300 flex items-center gap-1">
                    <Music className="w-3 h-3"/> Audio Synced
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Assets & Prompts / Timeline / Code */}
        <div className="lg:col-span-6 p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4">
          <div className="grid grid-cols-3 p-1 rounded-xl bg-black/50 border border-white/10 text-xs font-bold">
            {[
              {
                id: "assets",
                label: `Assets (${uploadedRequiredCount}/${parsedRecipe.requiredAssets.length})`,
                icon: ImageIcon,
              },
              { id: "timeline", label: "Timeline", icon: Layers },
              { id: "code", label: "Code", icon: Code2 },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setWorkspaceTab(t.id)}
                  className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                    workspaceTab === t.id
                      ? "bg-white text-black shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5"/>
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: ASSETS — EMPTY IMAGE SLOTS + READY GENERATION PROMPTS */}
          {workspaceTab === "assets" && (
            <div className="space-y-4 max-h-[540px] overflow-y-auto pr-1">
              {/* Required Image Slots List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-amber-400"/>
                      Required Image Slots ({uploadedRequiredCount}/
                      {parsedRecipe.requiredAssets.length})
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Copy the prompt under each slot to generate the image, then upload it directly
                      into that slot.
                    </p>
                  </div>
                  <button
                    onClick={() => handleAddTimelineCue("image")}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-[11px] font-bold flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5"/> Add Slot
                  </button>
                </div>

                {parsedRecipe.requiredAssets.length === 0 ? (
                  <div className="p-5 rounded-xl bg-black/35 border border-white/10 text-center text-xs text-slate-400 space-y-2">
                    <div>No image slots in this recipe yet.</div>
                    <button
                      onClick={() => handleAddTimelineCue("image")}
                      className="px-3.5 py-2 rounded-lg bg-amber-500 text-black font-bold"
                    >
                      + Add Empty Image Slot
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {parsedRecipe.requiredAssets.map((slot, idx) => {
                      const uploaded = imageByNameMap[slot.name];
                      const isCopied = copiedSlotKey === slot.name;
                      return (
                        <div
                          key={slot.name}
                          className={`p-3.5 rounded-2xl border space-y-3 transition ${
                            uploaded
                              ? "bg-emerald-950/20 border-emerald-500/40"
                              : "bg-black/45 border-amber-400/35"
                          }`}
                        >
                          {/* Slot Header */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[11px] font-bold">
                                #{idx + 1} · {slot.name}
                              </span>
                              {slot.start !== null && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsPlaying(false);
                                    const t = slot.start + 0.1;
                                    setCurrentTime(t);
                                    currentTimeRef.current = t;
                                    if (sourceVideoElRef.current && sourceVideoAsset) {
                                      const d = sourceVideoAsset.duration;
                                      sourceVideoElRef.current.currentTime = d > 0 ? t % d : t;
                                    }
                                  }}
                                  className="text-[11px] font-mono text-cyan-300 hover:underline"
                                  title="Jump preview to this image slot"
                                >
                                  {formatClock(slot.start)} → {formatClock(slot.end)}
                                </button>
                              )}
                            </div>

                            {uploaded ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 px-2 py-0.5 rounded-full bg-emerald-500/15">
                                <CheckCircle2 className="w-3 h-3"/> Uploaded
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-300 px-2 py-0.5 rounded-full bg-amber-500/15">
                                Empty Slot
                              </span>
                            )}
                          </div>

                          {/* Empty Upload Box OR Uploaded Image Preview */}
                          {uploaded ? (
                            <div className="flex items-center gap-3 p-2 rounded-xl bg-black/50 border border-white/10">
                              <img
                                src={uploaded.url}
                                alt={slot.name}
                                className="w-16 h-16 rounded-lg object-cover bg-black shrink-0"
                              />
                              <div className="flex-1 min-w-0 space-y-1.5">
                                <div className="text-xs font-semibold text-white truncate">
                                  Image placed at {slot.name}
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-slate-200 cursor-pointer">
                                    Replace
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => handleUploadImageForSlot(slot.name, e)}
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImageAsset(slot.name)}
                                    className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-[11px] font-semibold text-rose-300"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <label className="w-full py-4 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border-2 border-dashed border-amber-400/45 text-amber-200 text-xs font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition text-center">
                              <Upload className="w-5 h-5 text-amber-400"/>
                              <span>Tap to Upload Image for {slot.name}</span>
                              {slot.sceneText && (
                                <span className="text-[10px] font-normal text-slate-400 max-w-xs truncate">
                                  Scene: &quot;{slot.sceneText}&quot;
                                </span>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleUploadImageForSlot(slot.name, e)}
                              />
                            </label>
                          )}

                          {/* Ready Image Generation Prompt Right Underneath This Slot */}
                          <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                                <Sparkles className="w-3 h-3"/> Image Prompt for {slot.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText(slot.prompt);
                                  setCopiedSlotKey(slot.name);
                                  setTimeout(() => setCopiedSlotKey(null), 2000);
                                  notify(`Copied image prompt for ${slot.name}!`, "success");
                                }}
                                className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/35 text-cyan-200 text-[11px] font-bold flex items-center gap-1"
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400"/> Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3"/> Copy Prompt
                                  </>
                                )}
                              </button>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-relaxed select-all">
                              {slot.prompt}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Original Video Upload */}
              <div className="p-4 rounded-xl bg-black/35 border border-cyan-400/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-cyan-400"/> Original Video (A-Roll)
                  </div>
                  {sourceVideoAsset && (
                    <button
                      onClick={() => setSourceVideoAsset(null)}
                      className="text-[11px] text-rose-400 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <label className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-dashed border-cyan-400/45 text-xs font-semibold text-cyan-200 flex items-center justify-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4"/>
                  {sourceVideoAsset
                    ? `Loaded: ${sourceVideoAsset.name}`
                    : "Upload Original Video (.mp4, .mov, .webm)"}
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleSourceVideoUpload}
                  />
                </label>

                {sourceVideoAsset && (
                  <label className="flex items-center gap-2 text-[11px] text-slate-200 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useVideoAudio}
                      onChange={(e) => setUseVideoAudio(e.target.checked)}
                      className="accent-cyan-400"
                    />
                    Keep original video audio across the entire edit (including image slots)
                  </label>
                )}
              </div>

              {/* Separate Voiceover Audio */}
              <div className="p-4 rounded-xl bg-black/35 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Music className="w-4 h-4 text-emerald-400"/> Separate Voiceover / Music
                    (Optional)
                  </div>
                  {audioAsset && (
                    <button
                      onClick={() => setAudioAsset(null)}
                      className="text-[11px] text-rose-400 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <label className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-dashed border-emerald-400/40 text-xs font-semibold text-emerald-200 flex items-center justify-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4"/>
                  {audioAsset ? `Loaded: ${audioAsset.name}` : "Upload Audio (.mp3, .wav, .m4a)"}
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const url = URL.createObjectURL(f);
                      setAudioAsset({ name: f.name, url });
                      notify(`Audio "${f.name}" synced!`, "success");
                    }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: TIMELINE */}
          {workspaceTab === "timeline" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300">Theme:</span>
                  <select
                    value={parsedRecipe.theme}
                    onChange={(e) => {
                      const nextTheme = e.target.value;
                      setThemeId(nextTheme);
                      if (parsedRecipe.cues.length > 0) {
                        const updatedCode = serializeCuesToRecipe(
                          parsedRecipe.cues,
                          nextTheme,
                          parsedRecipe.requiredAssets
                        );
                        setRecipeDraft(updatedCode);
                        setAppliedRecipe(updatedCode);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#0d0d1d] border border-white/10 text-xs"
                  >
                    {Object.entries(THEMES).map(([id, t]) => (
                      <option key={id} value={id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleAddTimelineCue("video")}
                    className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-[11px] font-bold"
                  >
                    + Video
                  </button>
                  <button
                    onClick={() => handleAddTimelineCue("image")}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-[11px] font-bold"
                  >
                    + Image Slot
                  </button>
                  <button
                    onClick={() => handleAddTimelineCue("text")}
                    className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white text-[11px] font-bold"
                  >
                    + Text
                  </button>
                </div>
              </div>

              {parsedRecipe.cues.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-black/30 border border-white/10 text-xs text-slate-400 space-y-2">
                  <div>No scenes on the timeline yet.</div>
                  <button
                    onClick={() => handleAddTimelineCue("image")}
                    className="px-4 py-2 rounded-lg bg-amber-500 text-black font-bold"
                  >
                    + Add First Scene
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {parsedRecipe.cues.map((cue, idx) => {
                    const isActive = currentTime >= cue.start && currentTime <= cue.end;
                    return (
                      <div
                        key={cue.id}
                        onClick={() => {
                          setCurrentTime(cue.start + 0.05);
                          currentTimeRef.current = cue.start + 0.05;
                          if (sourceVideoElRef.current && sourceVideoAsset) {
                            const dur = sourceVideoAsset.duration;
                            sourceVideoElRef.current.currentTime =
                              dur > 0 ? (cue.start + 0.05) % dur : cue.start + 0.05;
                          }
                        }}
                        className={`p-3 rounded-xl border space-y-2 transition ${
                          isActive
                            ? "bg-amber-500/10 border-amber-400/50"
                            : "bg-black/40 border-white/10 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-amber-300">
                              #{idx + 1}
                            </span>
                            <select
                              value={cue.type}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const nextType = e.target.value;
                                const next = parsedRecipe.cues.map((c, i) =>
                                  i === idx
                                    ? {
                                        ...c,
                                        type: nextType,
                                        text:
                                          nextType === "video"
                                            ? "main"
                                            : nextType === "image" && c.text === "main"
                                            ? `image_${parsedRecipe.requiredAssets.length + 1}`
                                            : c.text,
                                      }
                                    : c
                                );
                                updateCuesFromTimeline(next);
                              }}
                              className="px-2 py-0.5 rounded bg-[#0d0d1d] border border-white/10 text-[11px] font-semibold"
                            >
                              {CUE_TYPES.map((ct) => (
                                <option key={ct.value} value={ct.value}>
                                  {ct.label}
                                </option>
                              ))}
                            </select>
                            <select
                              value={cue.anim}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const next = parsedRecipe.cues.map((c, i) =>
                                  i === idx ? { ...c, anim: e.target.value } : c
                                );
                                updateCuesFromTimeline(next);
                              }}
                              className="px-2 py-0.5 rounded bg-[#0d0d1d] border border-white/10 text-[11px]"
                            >
                              {ANIMATIONS.map((a) => (
                                <option key={a} value={a}>
                                  {a}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.5"
                              min={0}
                              value={cue.start}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const val = Math.max(0, Number(e.target.value));
                                const next = parsedRecipe.cues.map((c, i) =>
                                  i === idx
                                    ? { ...c, start: val, end: Math.max(val + 0.5, c.end) }
                                    : c
                                );
                                updateCuesFromTimeline(next);
                              }}
                              className="w-14 px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-[11px] font-mono text-center"
                            />
                            <span className="text-slate-500 text-[10px]">→</span>
                            <input
                              type="number"
                              step="0.5"
                              min={0.5}
                              value={cue.end}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const val = Math.max(cue.start + 0.4, Number(e.target.value));
                                const next = parsedRecipe.cues.map((c, i) =>
                                  i === idx ? { ...c, end: val } : c
                                );
                                updateCuesFromTimeline(next);
                              }}
                              className="w-14 px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-[11px] font-mono text-center"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateCuesFromTimeline(
                                  parsedRecipe.cues.filter((_, i) => i !== idx)
                                );
                              }}
                              className="p-1 text-rose-400 hover:bg-rose-500/15 rounded"
                              title="Delete scene"
                            >
                              <Trash2 className="w-3.5 h-3.5"/>
                            </button>
                          </div>
                        </div>

                        {cue.type !== "video" && (
                          <input
                            type="text"
                            value={cue.text}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const val = e.target.value;
                              const next = parsedRecipe.cues.map((c, i) =>
                                i === idx ? { ...c, text: val } : c
                              );
                              updateCuesFromTimeline(next);
                            }}
                            placeholder={
                              cue.type === "image"
                                ? "Image slot name (e.g. image_1)"
                                : "Main headline text..."
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white"
                          />
                        )}

                        <input
                          type="text"
                          value={cue.sub || ""}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const val = e.target.value;
                            const next = parsedRecipe.cues.map((c, i) =>
                              i === idx ? { ...c, sub: val } : c
                            );
                            updateCuesFromTimeline(next);
                          }}
                          placeholder="Animated bottom caption line..."
                          className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/5 text-[11px] text-slate-200"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CODE */}
          {workspaceTab === "code" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-400">
                  Paste <code className="text-slate-200">[ASSETS] + [RECIPE]</code> from Claude /
                  ChatGPT / Gemini
                </span>
                <button
                  onClick={() => setScreen("get_code")}
                  className="text-amber-400 font-bold hover:underline"
                >
                  No code? Get code
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handlePasteCodeFromClipboard}
                  className="py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/35 text-amber-200 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Clipboard className="w-3.5 h-3.5"/> Paste
                </button>
                <button
                  onClick={handleDownloadProjectFile}
                  className="py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5"/> Save
                </button>
                <label className="py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                  <FolderOpen className="w-3.5 h-3.5"/> Open
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleOpenProjectFile}
                  />
                </label>
              </div>

              <textarea
                rows={11}
                value={recipeDraft}
                onChange={(e) => setRecipeDraft(e.target.value)}
                placeholder={`[ASSETS]\nimage_1: Cinematic 9:16 AI studio visual, 4K, no text\n\n[RECIPE]\nv1\ntheme=dark\n00:00.00 --> 00:03.50 video "main" sub="Opening line" in=fadeIn\n00:03.50 --> 00:07.00 image "image_1" sub="Visual B-roll line" in=zoomIn`}
                className="w-full p-3.5 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />

              <button
                onClick={() => handleApplyCode()}
                className="w-full py-3 rounded-xl bg-white hover:bg-slate-100 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition"
              >
                <CheckCircle2 className="w-4 h-4"/> Apply &amp; preview
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
