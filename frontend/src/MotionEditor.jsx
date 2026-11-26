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
  Trash2,
  Upload,
  Video,
  Wand2,
  X,
  Zap,
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
    id: "pro_creator_hybrid",
    name: "Pro Creator Hybrid (Video + Motion)",
    desc: "Alternates your original talking-head video with high-end motion graphics (charts, search bar, hubs, PiP) like top YouTube & Reels editors.",
    icon: Video,
    promptRules:
      'Alternate between `video "main"` (original video cutaways for 2–3s), `pip` (video + animated headline), and rich motion graphics (`search`, `chart`, `hub`, `orbit`, `bars`, `stat`) so the viewer never gets bored.',
  },
  {
    id: "motion_graphics_dynamic",
    name: "Motion Graphics Pro (Charts, Hubs & UI)",
    desc: "Apple / Opus-style dynamic motion graphics: animated search bars with cursor clicks, glowing line charts, orbital rings, and radiating hub cards.",
    icon: Sparkles,
    promptRules:
      "Every idea becomes a rich visual motion graphic. Heavily use `search`, `chart`, `hub`, `orbit`, `bars`, `stat`, and `card` synced tightly to voice timestamps.",
  },
  {
    id: "dynamic_no_assets",
    name: "Dynamic No Assets",
    desc: "Balanced, punchy kinetic typography with varied entrances, badges, and animated stat counters — zero images required.",
    icon: Zap,
    promptRules:
      "Use NO external images. Focus on punchy kinetic typography, bold badges, clean stat counters, charts, and varied animations (pop, fadeUp, slideLeft, zoomIn).",
  },
  {
    id: "dynamic_no_assets_improved",
    name: "Dynamic No Assets Improved",
    desc: "High quality editorial motion cuts with clean cards and hero titles (non-caption style).",
    icon: Film,
    promptRules:
      "Avoid boring subtitle walls. Turn every idea into short 2–5 word hero titles, sleek cards, bar comparisons, and high-contrast typographic beats.",
  },
  {
    id: "composed",
    name: "Composed (With Custom Images)",
    desc: "Built around images or logos you upload in Assets, combined with motion graphics cards and callouts.",
    icon: Layers,
    promptRules:
      'Include an [ASSETS] section listing 5–7 image asset names and prompts, then reference them in [RECIPE] using `image "asset_name"` alongside `card`, `chart`, and `hub` beats.',
  },
];

const THEMES = {
  dark: {
    label: "Obsidian Orange",
    bg1: "#09090f",
    bg2: "#16111f",
    accent: "#f59e0b",
    accent2: "#22d3ee",
    text: "#ffffff",
    sub: "#cbd5e1",
    cardBg: "rgba(255,255,255,0.08)",
    cardBorder: "rgba(245,158,11,0.45)",
  },
  opus: {
    label: "Studio Paper (Opus Style)",
    bg1: "#f5f4f0",
    bg2: "#e7e5df",
    accent: "#ea580c",
    accent2: "#f59e0b",
    text: "#18181b",
    sub: "#52525b",
    cardBg: "rgba(255,255,255,0.92)",
    cardBorder: "rgba(234,88,12,0.35)",
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

const ANIMATIONS = [
  "fadeUp",
  "pop",
  "slideLeft",
  "slideRight",
  "zoomIn",
  "typewriter",
  "fadeIn",
  "none",
];

const CUE_TYPES = [
  { value: "text", label: "Text" },
  { value: "stat", label: "Stat Counter" },
  { value: "card", label: "Card" },
  { value: "badge", label: "Badge Hook" },
  { value: "search", label: "Search Bar UI" },
  { value: "chart", label: "Line Chart" },
  { value: "hub", label: "Starburst Hub" },
  { value: "orbit", label: "Orbital Rings" },
  { value: "bars", label: "Bar Chart" },
  { value: "video", label: "Original Video" },
  { value: "pip", label: "Video + Motion (PiP)" },
  { value: "image", label: "Image Asset" },
];

const DEMO_TEMPLATES = [
  {
    title: "Pro Motion Showcase",
    format: "9:16",
    theme: "opus",
    code: `v1
theme=opus
00:00.00 --> 00:03.20 search "animate my idea" sub="AI Motion Engine" in=pop
00:03.20 --> 00:06.80 chart "Retention Spike" sub="22,68,40,86,58,96" in=fadeUp
00:06.80 --> 00:10.00 orbit "100% Automated" sub="Smooth 60fps curves" in=zoomIn
00:10.00 --> 00:13.50 hub "ClipForge Studio" sub="Script|Motion|Video|Export" in=pop`,
  },
  {
    title: "Creator Video + Motion",
    format: "9:16",
    theme: "dark",
    code: `v1
theme=dark
00:00.00 --> 00:02.60 video "main" sub="Hook: Watch how top editors cut videos" in=zoomIn
00:02.60 --> 00:05.60 search "viral editing workflow" sub="Step 1" in=pop
00:05.60 --> 00:08.60 pip "Keep Viewers Hooked" sub="Switch between face & motion every 3s" in=slideLeft
00:08.60 --> 00:11.80 bars "Watch Time Boost" sub="Raw:28|Pro Edit:94" in=fadeUp
00:11.80 --> 00:14.50 video "main" sub="Try it free inside ClipForge AI" in=zoomIn`,
  },
  {
    title: "Finance Growth Edit",
    format: "16:9",
    theme: "emerald",
    code: `v1
theme=emerald
00:00.00 --> 00:02.80 badge "SMART MONEY" sub="You save every month, right?" in=pop
00:02.80 --> 00:06.20 chart "10-Year Compounding" sub="15,28,24,48,65,98" in=fadeUp
00:06.20 --> 00:09.20 stat "₹11,60,000" sub="From ₹5,000 / month" in=zoomIn
00:09.20 --> 00:12.40 hub "Wealth Pillars" sub="Save|Invest|Repeat|Grow" in=slideRight`,
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

function parseRecipe(rawText, fallbackTheme = "dark") {
  const result = {
    theme: fallbackTheme,
    bgColor: null,
    cues: [],
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
  let inAssetsSection = false;

  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper === "[ASSETS]") {
      inAssetsSection = true;
      continue;
    }
    if (upper === "[RECIPE]") {
      inAssetsSection = false;
      continue;
    }
    if (inAssetsSection) continue;
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
    const typeMatch = rest.match(
      /\b(text|stat|card|badge|image|video|pip|search|chart|hub|orbit|bars)\s+"([^"]*)"/i
    );
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

  result.cues = cues;
  if (cues.length > 0) {
    result.totalDuration = Math.max(3, ...cues.map((c) => c.end));
  }
  return result;
}

function serializeCuesToRecipe(cues, theme = "dark") {
  const lines = ["v1", `theme=${theme}`];
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

function splitIntoPunchyChunks(text, maxWords = 8) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const sentences = clean.split(/(?<=[.!?।])\s+/).filter(Boolean);
  const chunks = [];
  for (const s of sentences) {
    const words = s.split(/\s+/);
    if (words.length <= maxWords + 2) {
      chunks.push(s);
    } else {
      for (let i = 0; i < words.length; i += maxWords) {
        chunks.push(words.slice(i, i + maxWords).join(" "));
      }
    }
  }
  return chunks;
}

function buildRecipeFromTranscript(
  transcript,
  theme = "dark",
  editStyleId = "pro_creator_hybrid",
  includeOriginalVideo = false
) {
  const clean = normalizeSmartQuotes(transcript || "").trim();
  if (!clean) return DEMO_TEMPLATES[0].code;

  const lines = ["v1", `theme=${theme}`];
  const isHybrid = includeOriginalVideo || editStyleId === "pro_creator_hybrid";
  const isProMotion =
    editStyleId === "motion_graphics_dynamic" || editStyleId === "pro_creator_hybrid";
  const animCycle = ["pop", "fadeUp", "slideLeft", "zoomIn", "slideRight"];
  const maxWordsPerChunk = isProMotion ? 7 : 8;

  const pushCue = (start, end, text, idx) => {
    const safe = String(text || "").replace(/"/g, "'").trim();
    if (!safe || /^\d{1,2}:\d{2}(?::\d{2})?$/.test(safe)) return;
    const anim = animCycle[idx % animCycle.length];
    const hasStat = /\d+%|₹\d+|\$\d+|\d+x/i.test(safe);
    const words = safe.split(/\s+/);
    const shortTitle = words.slice(0, 4).join(" ");
    const hubNodes = words.filter((w) => w.length > 2).slice(0, 4);
    const hubLabel = hubNodes.length >= 3 ? hubNodes.join("|") : "Hook|Value|Proof|Action";

    if (isHybrid) {
      const slot = idx % 6;
      if (slot === 0) {
        lines.push(
          `${formatRecipeTime(start)} --> ${formatRecipeTime(end)} video "main" sub="${safe}" in=zoomIn`
        );
      } else if (slot === 1) {
        lines.push(
          `${formatRecipeTime(start)} --> ${formatRecipeTime(end)} search "${shortTitle}" sub="${safe}" in=pop`
        );
      } else if (slot === 2) {
        lines.push(
          `${formatRecipeTime(start)} --> ${formatRecipeTime(end)} pip "${shortTitle}" sub="${safe}" in=slideLeft`
        );
      } else if (slot === 3) {
        if (hasStat) {
          lines.push(
            `${formatRecipeTime(start)} --> ${formatRecipeTime(end)} stat "${safe}" in=zoomIn`
          );
        } else {
          lines.push(
            `${formatRecipeTime(start)} --> ${formatRecipeTime(end)} chart "${shortTitle}" sub="22,60,42,84,68,95" in=fadeUp`
          );
        }
      } else if (slot === 4) {
        lines.push(
          `${formatRecipeTime(start)} --> ${formatRecipeTime(end)} video "main" sub="${safe}" in=fadeIn`
        );
      } else {
        lines.push(
          `${formatRecipeTime(start)} --> ${formatRecipeTime(end)} hub "${shortTitle}" sub="${hubLabel}" in=pop`
        );
      }
      return;
    }

    if (isProMotion) {
      const slot = idx % 6;
      if (idx === 0) {
        lines.push(
          `${formatRecipeTime(start)} --> ${formatRecipeTime(end)} search "${shortTitle}" sub="${safe}" in=pop`
        );
      } else if (hasStat) {
        lines.push(
          `${formatRecipeTime(start)} --> ${formatRecipeTime(end)} stat "${safe}" in=zoomIn`
        );
      } else if (slot === 1) {
        lines.push(
          `${formatRecipeTime(start)} --> ${formatRecipeTime(end)} chart "${shortTitle}" sub="20,65,38,85,55,96" in=fadeUp`
        );
      } else if (slot === 2) {
        lines.push(
          `${formatRecipeTime(start)} --> ${formatRecipeTime(end)} card "${shortTitle}" sub="${safe}" in=slideLeft`
        );
      } else if (slot === 3) {
        lines.push(
          `${formatRecipeTime(start)} --> ${formatRecipeTime(end)} orbit "${shortTitle}" sub="${safe}" in=pop`
        );
      } else if (slot === 4) {
        lines.push(
          `${formatRecipeTime(start)} --> ${formatRecipeTime(end)} bars "${shortTitle}" sub="Old:30|New:95" in=fadeUp`
        );
      } else {
        lines.push(
          `${formatRecipeTime(start)} --> ${formatRecipeTime(end)} hub "${shortTitle}" sub="${hubLabel}" in=zoomIn`
        );
      }
      return;
    }

    if (idx === 0) {
      lines.push(
        `${formatRecipeTime(start)} --> ${formatRecipeTime(end)} badge "WATCH THIS" sub="${safe}" in=pop`
      );
    } else if (hasStat) {
      lines.push(
        `${formatRecipeTime(start)} --> ${formatRecipeTime(end)} stat "${safe}" in=zoomIn`
      );
    } else if (idx % 4 === 3) {
      lines.push(
        `${formatRecipeTime(start)} --> ${formatRecipeTime(end)} card "${safe}" in=${anim}`
      );
    } else {
      lines.push(
        `${formatRecipeTime(start)} --> ${formatRecipeTime(end)} text "${safe}" in=${anim}`
      );
    }
  };

  // 1. Standard SRT / VTT range format
  const srtBlocks = clean.split(/\r?\n\r?\n/);
  const srtTimeRe =
    /(\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3})/;

  let cueCount = 0;
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
      pushCue(start, end, text, cueCount);
      cueCount++;
    }
  }
  if (cueCount > 0) return lines.join("\n");

  // 2. Standalone MM:SS timestamped format
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
    let idx = 0;
    timedSections.forEach((sec, sIdx) => {
      const combinedText = sec.textParts.join(" ").trim();
      const chunks = splitIntoPunchyChunks(combinedText, maxWordsPerChunk);
      if (chunks.length === 0) return;

      const nextStart =
        sIdx + 1 < timedSections.length
          ? Math.max(sec.start + chunks.length * 1.6, timedSections[sIdx + 1].start)
          : sec.start + Math.max(2.5, chunks.length * 2.8);
      const totalSpan = Math.max(1.5, nextStart - sec.start);
      const perChunk = totalSpan / chunks.length;

      chunks.forEach((chunk, cIdx) => {
        const cStart = sec.start + cIdx * perChunk;
        const cEnd = sec.start + (cIdx + 1) * perChunk;
        pushCue(cStart, cEnd, chunk, idx);
        idx++;
      });
    });
    if (idx > 0) return lines.join("\n");
  }

  // 3. Plain text transcript
  const cleanedPlain = rawLines
    .filter((l) => !/^\[?\d{1,2}:\d{2}(?::\d{2})?\]?$/.test(l))
    .join(" ");
  const chunks = splitIntoPunchyChunks(cleanedPlain, maxWordsPerChunk);

  let cursor = 0;
  chunks.slice(0, 40).forEach((chunk, idx) => {
    const dur = Math.min(4.0, Math.max(2.2, chunk.split(/\s+/).length * 0.38));
    const start = cursor;
    const end = cursor + dur;
    cursor = end;
    pushCue(start, end, chunk, idx);
  });

  return lines.join("\n");
}

function buildAiHandoffPrompt(
  transcript,
  formatId,
  fps,
  editStyleId,
  themeId,
  includeOriginalVideo
) {
  const styleObj = EDIT_STYLES.find((s) => s.id === editStyleId) || EDIT_STYLES[0];
  const synced = hasTimestampsInText(transcript);
  const useVideo = includeOriginalVideo || editStyleId === "pro_creator_hybrid";

  return `You are a senior motion graphics director for ClipForge Motion Studio.
Convert the transcript below into a cinema-grade, high-retention animated motion edit recipe.

PROJECT SETTINGS:
- Aspect Ratio: ${formatId}
- Frame Rate: ${fps} fps
- Edit Style: ${styleObj.name}
- Theme: ${themeId}
- Original Video Cutaways: ${useVideo ? "ENABLED — alternate original video (`video` and `pip`) with full-screen motion graphics every 2–4 seconds like a pro YouTube/Reels editor." : "Motion graphics only."}
- Style Direction: ${styleObj.promptRules}
- Timing Mode: ${
    synced
      ? "EXACT TIMESTAMPS PROVIDED — keep all scenes tightly synced to the given timestamps."
      : "No timestamps provided — pace each visual beat naturally at 2.4s–3.5s."
  }

STRICT OUTPUT FORMAT:
Reply ONLY with the [ASSETS] and [RECIPE] blocks — no extra commentary.

[ASSETS]
(List image asset names if using Composed style; otherwise write "None")

[RECIPE]
v1
theme=${themeId}
${
  useVideo
    ? `00:00.00 --> 00:02.60 video "main" sub="Opening hook line" in=zoomIn`
    : `00:00.00 --> 00:02.60 badge "STOP SCROLLING" sub="Opening hook line" in=pop`
}
00:02.60 --> 00:05.80 search "animate my idea" sub="AI Workflow" in=pop
00:05.80 --> 00:09.20 chart "Growth Curve" sub="20,65,38,85,58,96" in=fadeUp
${
  useVideo
    ? `00:09.20 --> 00:12.20 pip "Key Insight" sub="Short punchy explanation" in=slideLeft`
    : `00:09.20 --> 00:12.20 orbit "100% Automated" sub="Zero manual keyframes" in=zoomIn`
}
00:12.20 --> 00:15.60 hub "Complete System" sub="Script|Motion|Video|Export" in=pop

ALL SUPPORTED PRO MOTION GRAPHICS CUES:
- video "main" sub="Optional bottom caption"  --> Shows the user's original talking-head video full-screen with smooth zoom
- pip "Headline" sub="Short subtitle"         --> Picture-in-Picture: original video frame + animated motion graphic card together
- search "Query text" sub="Top label"         --> Animated glowing search/prompt bar with typewriter + cursor click + popping cards
- chart "Chart Title" sub="20,60,35,85,95"    --> Animated line graph with glowing orb riding across peaks & valleys
- hub "Core Title" sub="Node1|Node2|Node3|Node4" --> Rotating glowing sunburst core with 4 connected animated cards
- orbit "Center Title" sub="Subtitle"         --> Concentric glowing orbital rings + rotating nodes
- bars "Comparison Title" sub="Before:25|After:95" --> Animated glowing gradient bar chart with live counters
- stat "₹50,000" sub="Live count-up metric"   --> Big animated stat with automatic number count-up
- card "Card Title" sub="Short point"         --> Sleek floating glassmorphism card
- badge "PILL TAG" sub="Hero headline"        --> High-impact pill hook + bold title
- text "Kinetic headline" sub="Optional sub"  --> Clean kinetic typography
- image "asset_name"                          --> Displays an uploaded image from Assets tab

SUPPORTED ANIMATIONS (in=):
fadeUp, pop, slideLeft, slideRight, zoomIn, typewriter, fadeIn

RULES:
1. Keep headlines crisp (2–7 words) so they look like an agency-grade motion edit on ${formatId}.
2. Mix at least 4–5 different visual cue types (search, chart, hub, orbit, bars, stat, card${
    useVideo ? ", video, pip" : ""
  }) so every 3 seconds feels dynamic.
3. Use valid ascending MM:SS.ms --> MM:SS.ms timestamps with zero syntax errors.

TRANSCRIPT:
${transcript.trim() || "(Paste your transcript here)"}`;
}

function wrapCanvasText(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/);
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

function drawCoverVideo(ctx, videoEl, x, y, w, h, zoom = 1) {
  const vw = videoEl.videoWidth || 1280;
  const vh = videoEl.videoHeight || 720;
  const targetRatio = w / h;
  const videoRatio = vw / vh;
  let drawW = w;
  let drawH = h;
  if (videoRatio > targetRatio) {
    drawH = h * zoom;
    drawW = drawH * videoRatio;
  } else {
    drawW = w * zoom;
    drawH = drawW / videoRatio;
  }
  const dx = x + (w - drawW) / 2;
  const dy = y + (h - drawH) / 2;
  ctx.drawImage(videoEl, dx, dy, drawW, drawH);
}

function drawStarburst(ctx, cx, cy, spikes, outerR, innerR, rotation, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2.5, outerR * 0.14);
  ctx.lineCap = "round";
  for (let i = 0; i < spikes; i++) {
    const angle = (i * Math.PI * 2) / spikes;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
    ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDiamond(ctx, x, y, r, fill, stroke = null) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = fill;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
  }
  ctx.restore();
}

function animateStatNumber(text, progress) {
  const match = String(text || "").match(/^(.*?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!match) return text;
  const prefix = match[1];
  const rawNum = match[2];
  const suffix = match[3];
  const hasComma = rawNum.includes(",");
  const decimals = rawNum.includes(".") ? rawNum.split(".")[1].length : 0;
  const target = parseFloat(rawNum.replace(/,/g, ""));
  if (Number.isNaN(target)) return text;
  const val = target * easeOutCubic(progress);
  const formatted = hasComma
    ? Math.round(val).toLocaleString("en-IN")
    : decimals > 0
    ? val.toFixed(decimals)
    : String(Math.round(val));
  return `${prefix}${formatted}${suffix}`;
}

function renderMotionFrame(ctx, width, height, currentTime, parsed, loadedImages, sourceVideoEl) {
  const theme = THEMES[parsed.theme] || THEMES.dark;
  const isLightTheme = parsed.theme === "light" || parsed.theme === "opus";
  const minDim = Math.min(width, height);
  const videoReady = Boolean(
    sourceVideoEl && sourceVideoEl.readyState >= 2 && sourceVideoEl.videoWidth > 0
  );

  // 1. Studio Animated Background
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, parsed.bgColor || theme.bg1);
  grad.addColorStop(1, parsed.bgColor || theme.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Ambient Moving Studio Glows
  const glowX = width * (0.25 + 0.15 * Math.sin(currentTime * 0.7));
  const glowY = height * (0.3 + 0.12 * Math.cos(currentTime * 0.5));
  const rad1 = ctx.createRadialGradient(glowX, glowY, 10, glowX, glowY, width * 0.6);
  rad1.addColorStop(0, `${theme.accent}${isLightTheme ? "22" : "35"}`);
  rad1.addColorStop(1, "transparent");
  ctx.fillStyle = rad1;
  ctx.fillRect(0, 0, width, height);

  const rad2 = ctx.createRadialGradient(
    width - glowX * 0.6,
    height - glowY * 0.5,
    10,
    width - glowX * 0.6,
    height - glowY * 0.5,
    width * 0.55
  );
  rad2.addColorStop(0, `${theme.accent2}${isLightTheme ? "1c" : "28"}`);
  rad2.addColorStop(1, "transparent");
  ctx.fillStyle = rad2;
  ctx.fillRect(0, 0, width, height);

  // Architectural Grid (Opus / Motion Studio Look)
  ctx.save();
  ctx.strokeStyle = isLightTheme ? "rgba(24,24,27,0.065)" : "rgba(255,255,255,0.045)";
  ctx.lineWidth = 1;
  const gridStep = Math.round(minDim / 11);
  const offset = (currentTime * 16) % gridStep;
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

  // Subtle Floating Depth Particles
  ctx.save();
  for (let i = 0; i < 14; i++) {
    const px = (Math.sin(i * 12.7 + currentTime * 0.25) * 0.5 + 0.5) * width;
    const py = ((i * 97 + currentTime * (14 + (i % 4) * 6)) % (height + 40)) - 20;
    const pr = 1.5 + (i % 3);
    ctx.fillStyle = i % 2 === 0 ? `${theme.accent}35` : `${theme.accent2}30`;
    ctx.beginPath();
    ctx.arc(px, height - py, pr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 2. Render Active Cues
  const activeCues = parsed.cues.filter((c) => currentTime >= c.start && currentTime <= c.end);

  activeCues.forEach((cue) => {
    const elapsed = Math.max(0, currentTime - cue.start);
    const remaining = Math.max(0, cue.end - currentTime);
    const dur = Math.max(0.4, cue.end - cue.start);
    const normT = Math.min(1, elapsed / dur);
    const inDur = Math.min(0.48, dur * 0.32);
    const outDur = Math.min(0.24, dur * 0.18);

    const rawIn = Math.min(1, elapsed / inDur);
    const ease = easeOutCubic(rawIn);
    const spring = easeOutBack(rawIn);
    const fadeOut = remaining < outDur ? Math.max(0, remaining / outDur) : 1;

    // --- FULL-SCREEN ORIGINAL VIDEO CUTAWAY (`video`) ---
    if (cue.type === "video") {
      ctx.save();
      ctx.globalAlpha = Math.min(1, Math.max(0, rawIn * 2.2) * fadeOut);
      if (videoReady) {
        const kenBurns = 1.0 + normT * 0.06;
        drawCoverVideo(ctx, sourceVideoEl, 0, 0, width, height, kenBurns);

        const vig = ctx.createLinearGradient(0, height * 0.58, 0, height);
        vig.addColorStop(0, "transparent");
        vig.addColorStop(1, "rgba(0,0,0,0.78)");
        ctx.fillStyle = vig;
        ctx.fillRect(0, height * 0.58, width, height * 0.42);
      } else {
        const boxW = width * 0.8;
        const boxH = minDim * 0.34;
        ctx.fillStyle = theme.cardBg;
        ctx.strokeStyle = theme.cardBorder;
        ctx.lineWidth = 2.5;
        drawRoundedRect(ctx, (width - boxW) / 2, (height - boxH) / 2, boxW, boxH, 24);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = theme.accent;
        ctx.font = `800 ${Math.round(minDim * 0.045)}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("ORIGINAL VIDEO CUTAWAY", width / 2, height / 2 - minDim * 0.04);
        ctx.fillStyle = theme.sub;
        ctx.font = `500 ${Math.round(minDim * 0.032)}px Inter, system-ui, sans-serif`;
        ctx.fillText(
          "Upload your Original Video (A-Roll) to show here",
          width / 2,
          height / 2 + minDim * 0.04
        );
      }

      if (cue.sub) {
        const capSize = Math.round(minDim * 0.044);
        ctx.font = `800 ${capSize}px Inter, system-ui, sans-serif`;
        const capLines = wrapCanvasText(ctx, cue.sub, width * 0.82);
        const pillH = capLines.length * capSize * 1.3 + 26;
        const pillW = Math.min(
          width * 0.9,
          Math.max(...capLines.map((l) => ctx.measureText(l).width)) + 52
        );
        const pillY = height * 0.84 - pillH / 2 + (1 - ease) * 24;
        ctx.fillStyle = "rgba(9, 9, 15, 0.82)";
        ctx.strokeStyle = `${theme.accent}99`;
        ctx.lineWidth = 2;
        drawRoundedRect(ctx, (width - pillW) / 2, pillY, pillW, pillH, 18);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        capLines.forEach((ln, idx) => {
          ctx.fillText(ln, width / 2, pillY + 13 + (idx + 0.5) * capSize * 1.3);
        });
      }
      ctx.restore();
      return;
    }

    // --- PICTURE-IN-PICTURE / SPLIT CREATOR MODE (`pip`) ---
    if (cue.type === "pip") {
      const isVertical = height > width;
      ctx.save();
      ctx.globalAlpha = ease * fadeOut;

      const vW = isVertical ? width * 0.82 : width * 0.44;
      const vH = isVertical ? height * 0.36 : height * 0.62;
      const vX = isVertical ? (width - vW) / 2 : width * 0.06;
      const vY = isVertical ? height * 0.11 : (height - vH) / 2;

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 28;
      drawRoundedRect(ctx, vX, vY + (1 - ease) * 20, vW, vH, 26);
      ctx.fillStyle = "#090910";
      ctx.fill();
      ctx.restore();

      ctx.save();
      drawRoundedRect(ctx, vX, vY + (1 - ease) * 20, vW, vH, 26);
      ctx.clip();
      if (videoReady) {
        drawCoverVideo(ctx, sourceVideoEl, vX, vY + (1 - ease) * 20, vW, vH, 1.0 + normT * 0.05);
      } else {
        ctx.fillStyle = "#111122";
        ctx.fillRect(vX, vY + (1 - ease) * 20, vW, vH);
        ctx.fillStyle = theme.sub;
        ctx.font = `600 ${Math.round(minDim * 0.034)}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Upload Original Video for PiP", vX + vW / 2, vY + vH / 2);
      }
      ctx.restore();

      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, vX, vY + (1 - ease) * 20, vW, vH, 26);
      ctx.stroke();

      const cX = isVertical ? width * 0.09 : width * 0.54;
      const cW = isVertical ? width * 0.82 : width * 0.4;
      const cH = isVertical ? height * 0.34 : height * 0.54;
      const cY = isVertical ? height * 0.53 : (height - cH) / 2;
      const slideOffset = (1 - ease) * 35;

      ctx.fillStyle = theme.cardBg;
      ctx.strokeStyle = theme.cardBorder;
      ctx.lineWidth = 2.5;
      drawRoundedRect(
        ctx,
        cX + (isVertical ? 0 : slideOffset),
        cY + (isVertical ? slideOffset : 0),
        cW,
        cH,
        26
      );
      ctx.fill();
      ctx.stroke();

      const cxCenter = cX + cW / 2 + (isVertical ? 0 : slideOffset);
      const cyCenter = cY + cH / 2 + (isVertical ? slideOffset : 0);

      ctx.fillStyle = theme.accent;
      drawRoundedRect(
        ctx,
        cxCenter - cW * 0.16,
        cY + 20 + (isVertical ? slideOffset : 0),
        cW * 0.32,
        6,
        3
      );
      ctx.fill();

      const tSize = Math.round(minDim * 0.058);
      ctx.font = `900 ${tSize}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = cue.color || theme.text;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const tLines = wrapCanvasText(ctx, cue.text, cW * 0.84);
      const startY =
        cyCenter - (cue.sub ? tSize * 0.6 : 0) - ((tLines.length - 1) * tSize * 1.15) / 2;
      tLines.forEach((ln, i) => ctx.fillText(ln, cxCenter, startY + i * tSize * 1.18));

      if (cue.sub) {
        const sSize = Math.round(minDim * 0.036);
        ctx.font = `500 ${sSize}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = theme.sub;
        const sLines = wrapCanvasText(ctx, cue.sub, cW * 0.84);
        const sStart = startY + tLines.length * tSize * 1.18 + 14;
        sLines.forEach((ln, i) => ctx.fillText(ln, cxCenter, sStart + i * sSize * 1.32));
      }

      ctx.restore();
      return;
    }

    // Standard Transform Calculations for Motion Graphics Cues
    let alpha = ease * fadeOut;
    let offsetX = 0;
    let offsetY = 0;
    let scale = 1;
    let displayMain = cue.text;

    switch (cue.anim) {
      case "fadeUp":
        offsetY = (1 - ease) * (minDim * 0.07);
        break;
      case "pop":
        scale = 0.78 + 0.22 * spring;
        break;
      case "slideLeft":
        offsetX = (1 - ease) * (width * 0.2);
        break;
      case "slideRight":
        offsetX = -(1 - ease) * (width * 0.2);
        break;
      case "zoomIn":
        scale = 0.86 + 0.14 * ease + normT * 0.03;
        break;
      case "typewriter": {
        const chars = Math.max(
          1,
          Math.floor(cue.text.length * Math.min(1, elapsed / Math.min(1.4, dur * 0.65)))
        );
        displayMain = cue.text.slice(0, chars);
        alpha = fadeOut;
        break;
      }
      case "none":
        alpha = 1;
        break;
      default:
        break;
    }

    const centerY =
      cue.pos === "top" ? height * 0.25 : cue.pos === "bottom" ? height * 0.75 : height * 0.5;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.translate(width / 2 + offsetX, centerY + offsetY);
    ctx.scale(scale, scale);

    const sizeMult = cue.size === "small" ? 0.78 : cue.size === "medium" ? 0.9 : 1;
    const textColor = cue.color || theme.text;
    const maxTextWidth = width * 0.84;

    // --- 1. ANIMATED SEARCH / PROMPT BAR WITH CURSOR CLICK (`search`) ---
    if (cue.type === "search") {
      const barW = Math.min(width * 0.84, 760);
      const barH = Math.round(minDim * 0.125);
      const barY = -barH * 0.8;
      const barR = barH / 2;

      if (cue.sub) {
        ctx.font = `700 ${Math.round(minDim * 0.036)}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = theme.accent;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(cue.sub.toUpperCase(), 0, barY - minDim * 0.07);
      }

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.38)";
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 12;
      ctx.fillStyle = "#111116";
      drawRoundedRect(ctx, -barW / 2, barY, barW, barH, barR);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = `${theme.accent}66`;
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, -barW / 2, barY, barW, barH, barR);
      ctx.stroke();

      const typeFrac = Math.min(1, elapsed / Math.min(1.1, dur * 0.42));
      const typedCount = Math.max(1, Math.floor(cue.text.length * typeFrac));
      const typed = cue.text.slice(0, typedCount);
      const showCaret = typeFrac < 1 || Math.floor(elapsed * 3) % 2 === 0;

      ctx.font = `600 ${Math.round(minDim * 0.044)}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(
        typed + (showCaret && normT < 0.58 ? "|" : ""),
        -barW / 2 + barH * 0.42,
        barY + barH / 2
      );

      const orbX = barW / 2 - barH * 0.52;
      const orbY = barY + barH / 2;
      const orbR = barH * 0.34;
      const clickTime = dur * 0.52;
      const clicked = elapsed >= clickTime;
      const clickProgress = clicked ? Math.min(1, (elapsed - clickTime) / 0.5) : 0;
      const orbScale = clicked ? 1 - Math.sin(clickProgress * Math.PI) * 0.16 : 1;

      if (clicked && clickProgress < 1) {
        ctx.save();
        ctx.globalAlpha = (1 - clickProgress) * 0.7;
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(orbX, orbY, orbR * (1 + clickProgress * 1.9), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      const orbGrad = ctx.createRadialGradient(orbX, orbY, 2, orbX, orbY, orbR * orbScale);
      orbGrad.addColorStop(0, "#fff7ed");
      orbGrad.addColorStop(0.5, theme.accent);
      orbGrad.addColorStop(1, "#c2410c");
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(orbX, orbY, orbR * orbScale, 0, Math.PI * 2);
      ctx.fill();

      if (clicked) {
        const cardCount = 3;
        const gap = minDim * 0.035;
        const cW = Math.min(barW * 0.29, minDim * 0.24);
        const cH = cW * 1.05;
        const totalRowW = cardCount * cW + (cardCount - 1) * gap;
        const rowY = barY + barH + minDim * 0.08;

        for (let i = 0; i < cardCount; i++) {
          const itemDelay = i * 0.08;
          const itemT = Math.min(1, Math.max(0, (elapsed - clickTime - itemDelay) / 0.45));
          const itemEase = easeOutBack(itemT);
          if (itemT <= 0) continue;

          const cx = -totalRowW / 2 + i * (cW + gap) + cW / 2;
          const cy = rowY + cH / 2 + (1 - itemEase) * 45;

          ctx.save();
          ctx.strokeStyle = `${theme.accent}66`;
          ctx.setLineDash([4, 5]);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, barY + barH + 4);
          ctx.quadraticCurveTo(cx * 0.5, rowY - 10, cx, cy - cH / 2);
          ctx.stroke();
          ctx.restore();

          ctx.save();
          ctx.globalAlpha = Math.min(1, itemT * 2);
          ctx.shadowColor = "rgba(0,0,0,0.22)";
          ctx.shadowBlur = 18;
          ctx.fillStyle = theme.cardBg;
          ctx.strokeStyle = theme.cardBorder;
          ctx.lineWidth = 2;
          drawRoundedRect(
            ctx,
            cx - (cW * itemEase) / 2,
            cy - (cH * itemEase) / 2,
            cW * itemEase,
            cH * itemEase,
            18
          );
          ctx.fill();
          ctx.stroke();

          drawStarburst(
            ctx,
            cx,
            cy,
            8,
            cW * 0.24 * itemEase,
            cW * 0.07 * itemEase,
            currentTime * 0.9 + i,
            theme.accent
          );
          ctx.restore();
        }
      }

      const cursorAppear = Math.min(1, Math.max(0, (elapsed - dur * 0.22) / (dur * 0.28)));
      if (cursorAppear > 0) {
        const ce = easeOutCubic(cursorAppear);
        const startX = orbX + minDim * 0.24;
        const startY = orbY + minDim * 0.24;
        const curX = startX + (orbX - startX) * ce;
        const curY = startY + (orbY - startY) * ce;
        const curScale = clicked && clickProgress < 0.35 ? 0.85 : 1;

        ctx.save();
        ctx.translate(curX, curY);
        ctx.scale(curScale, curScale);
        ctx.fillStyle = "#09090f";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 32);
        ctx.lineTo(9, 24);
        ctx.lineTo(16, 36);
        ctx.lineTo(22, 33);
        ctx.lineTo(15, 21);
        ctx.lineTo(25, 21);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // --- 2. ANIMATED LINE CHART WITH RIDING GLOWING ORB (`chart`) ---
    else if (cue.type === "chart") {
      const nums = String(cue.sub || "")
        .split(/[,|\s]+/)
        .map((n) => parseFloat(n))
        .filter((n) => !Number.isNaN(n));
      const pts = nums.length >= 3 ? nums.slice(0, 8) : [25, 68, 38, 84, 54, 96];
      const minV = Math.min(...pts, 0);
      const maxV = Math.max(...pts, 100);
      const span = Math.max(1, maxV - minV);

      const chartW = Math.min(width * 0.82, 840);
      const chartH = minDim * 0.4;
      const leftX = -chartW / 2;
      const topY = -chartH / 2 + minDim * 0.05;

      ctx.font = `800 ${Math.round(minDim * 0.06)}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(cue.text, 0, topY - minDim * 0.11);

      const coords = pts.map((v, i) => ({
        x: leftX + (i / (pts.length - 1)) * chartW,
        y: topY + chartH - ((v - minV) / span) * chartH,
        val: v,
      }));

      ctx.save();
      ctx.strokeStyle = isLightTheme ? "rgba(24,24,27,0.1)" : "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      for (let g = 0; g <= 4; g++) {
        const gy = topY + (g / 4) * chartH;
        ctx.beginPath();
        ctx.moveTo(leftX, gy);
        ctx.lineTo(leftX + chartW, gy);
        ctx.stroke();
      }
      ctx.restore();

      const drawProgress = easeOutCubic(Math.min(1, elapsed / Math.max(0.9, dur * 0.78)));
      const segFloat = drawProgress * (coords.length - 1);
      const activeSegIdx = Math.min(coords.length - 2, Math.floor(segFloat));
      const segFrac = segFloat - activeSegIdx;

      const ballX =
        coords[activeSegIdx].x + (coords[activeSegIdx + 1].x - coords[activeSegIdx].x) * segFrac;
      const ballY =
        coords[activeSegIdx].y + (coords[activeSegIdx + 1].y - coords[activeSegIdx].y) * segFrac;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(coords[0].x, topY + chartH);
      ctx.lineTo(coords[0].x, coords[0].y);
      for (let i = 1; i <= activeSegIdx; i++) {
        ctx.lineTo(coords[i].x, coords[i].y);
      }
      ctx.lineTo(ballX, ballY);
      ctx.lineTo(ballX, topY + chartH);
      ctx.closePath();
      const areaGrad = ctx.createLinearGradient(0, topY, 0, topY + chartH);
      areaGrad.addColorStop(0, `${theme.accent}44`);
      areaGrad.addColorStop(1, "transparent");
      ctx.fillStyle = areaGrad;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = isLightTheme ? "rgba(24,24,27,0.16)" : "rgba(255,255,255,0.14)";
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      coords.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = cue.color || theme.accent;
      ctx.lineWidth = 5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.shadowColor = theme.accent;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(coords[0].x, coords[0].y);
      for (let i = 1; i <= activeSegIdx; i++) {
        ctx.lineTo(coords[i].x, coords[i].y);
      }
      ctx.lineTo(ballX, ballY);
      ctx.stroke();
      ctx.restore();

      coords.forEach((p, i) => {
        const reached = i <= segFloat + 0.05;
        drawDiamond(
          ctx,
          p.x,
          p.y,
          reached ? 9 : 7,
          reached ? theme.accent : isLightTheme ? "#18181b" : "#334155",
          reached ? "#ffffff" : null
        );
      });

      const orbR = Math.round(minDim * 0.038);
      ctx.save();
      ctx.shadowColor = theme.accent;
      ctx.shadowBlur = 28;
      const gOrb = ctx.createRadialGradient(
        ballX - orbR * 0.25,
        ballY - orbR * 0.25,
        2,
        ballX,
        ballY,
        orbR
      );
      gOrb.addColorStop(0, "#ffffff");
      gOrb.addColorStop(0.45, theme.accent);
      gOrb.addColorStop(1, theme.accent2);
      ctx.fillStyle = gOrb;
      ctx.beginPath();
      ctx.arc(ballX, ballY, orbR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // --- 3. RADIATING STARBURST HUB + CONNECTED UI CARDS (`hub`) ---
    else if (cue.type === "hub") {
      const items = String(cue.sub || "Idea|Design|Motion|Launch")
        .split(/[|,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 4);
      while (items.length < 4) items.push(`Step ${items.length + 1}`);

      const hubY = -minDim * 0.05;
      const spreadX = Math.min(width * 0.3, minDim * 0.3);
      const spreadY = minDim * 0.2;
      const cardW = Math.min(width * 0.36, minDim * 0.32);
      const cardH = minDim * 0.135;

      const positions = [
        { x: -spreadX, y: hubY - spreadY },
        { x: spreadX, y: hubY - spreadY },
        { x: -spreadX, y: hubY + spreadY },
        { x: spreadX, y: hubY + spreadY },
      ];

      positions.forEach((pos, i) => {
        const lineT = easeOutCubic(Math.min(1, Math.max(0, (elapsed - i * 0.1) / 0.45)));
        if (lineT <= 0) return;
        ctx.save();
        ctx.strokeStyle = `${theme.accent}99`;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);
        ctx.lineDashOffset = -currentTime * 28;
        ctx.beginPath();
        ctx.moveTo(0, hubY);
        ctx.quadraticCurveTo(
          pos.x * 0.45 * lineT,
          hubY,
          pos.x * lineT,
          hubY + (pos.y - hubY) * lineT
        );
        ctx.stroke();
        ctx.restore();
      });

      const coreR = minDim * 0.11;
      const coreGlow = ctx.createRadialGradient(0, hubY, 4, 0, hubY, coreR * 1.9);
      coreGlow.addColorStop(0, `${theme.accent}88`);
      coreGlow.addColorStop(1, "transparent");
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(0, hubY, coreR * 1.9, 0, Math.PI * 2);
      ctx.fill();

      drawStarburst(
        ctx,
        0,
        hubY,
        12,
        coreR,
        coreR * 0.24,
        currentTime * 0.7,
        cue.color || theme.accent
      );

      positions.forEach((pos, i) => {
        const cardT = Math.min(1, Math.max(0, (elapsed - 0.15 - i * 0.12) / 0.45));
        if (cardT <= 0) return;
        const cScale = easeOutBack(cardT);
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.scale(cScale, cScale);
        ctx.shadowColor = "rgba(0,0,0,0.28)";
        ctx.shadowBlur = 18;
        ctx.fillStyle = theme.cardBg;
        ctx.strokeStyle = theme.cardBorder;
        ctx.lineWidth = 2.5;
        drawRoundedRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 18);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = textColor;
        ctx.font = `800 ${Math.round(minDim * 0.038)}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const ln = wrapCanvasText(ctx, items[i], cardW * 0.84)[0];
        ctx.fillText(ln, 0, 0);
        ctx.restore();
      });

      ctx.font = `900 ${Math.round(minDim * 0.062)}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(cue.text, 0, hubY + spreadY + cardH * 0.95);
    }

    // --- 4. ORBITAL PROGRESS RINGS + GLOWING CENTER SPHERE (`orbit`) ---
    else if (cue.type === "orbit") {
      const cy = -minDim * 0.07;
      const outerR = minDim * 0.21;
      const innerR = minDim * 0.14;

      ctx.save();
      ctx.strokeStyle = isLightTheme ? "rgba(24,24,27,0.14)" : "rgba(255,255,255,0.12)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, cy, outerR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(0, cy, innerR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const arcAngle =
        easeOutCubic(Math.min(1, elapsed / Math.max(0.8, dur * 0.7))) * Math.PI * 1.65;
      const startA = -Math.PI / 2 + currentTime * 0.8;
      ctx.save();
      ctx.strokeStyle = cue.color || theme.accent;
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.shadowColor = theme.accent;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(0, cy, outerR, startA, startA + arcAngle);
      ctx.stroke();
      ctx.restore();

      for (let i = 0; i < 4; i++) {
        const a = startA + (i * Math.PI) / 2;
        const dx = Math.cos(a) * outerR;
        const dy = cy + Math.sin(a) * outerR;
        drawDiamond(
          ctx,
          dx,
          dy,
          i === 0 ? 10 : 7,
          i % 2 === 0 ? theme.accent : theme.accent2,
          "#ffffff"
        );
      }

      const sphereR = minDim * 0.085;
      const pulse = 1 + Math.sin(currentTime * 4) * 0.04;
      ctx.save();
      ctx.shadowColor = theme.accent;
      ctx.shadowBlur = 30;
      const sg = ctx.createRadialGradient(
        -sphereR * 0.25,
        cy - sphereR * 0.25,
        3,
        0,
        cy,
        sphereR * pulse
      );
      sg.addColorStop(0, "#ffffff");
      sg.addColorStop(0.5, theme.accent);
      sg.addColorStop(1, theme.accent2);
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(0, cy, sphereR * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      drawStarburst(
        ctx,
        0,
        cy,
        8,
        sphereR * 0.45,
        sphereR * 0.14,
        -currentTime * 1.2,
        "#ffffff"
      );

      ctx.font = `900 ${Math.round(minDim * 0.066)}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(cue.text, 0, cy + outerR + minDim * 0.11);

      if (cue.sub) {
        ctx.font = `600 ${Math.round(minDim * 0.038)}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = theme.sub;
        ctx.fillText(cue.sub, 0, cy + outerR + minDim * 0.185);
      }
    }

    // --- 5. ANIMATED COMPARISON BAR CHART (`bars`) ---
    else if (cue.type === "bars") {
      const pairs = String(cue.sub || "Before:28|After:95")
        .split(/[|,]+/)
        .map((chunk, idx) => {
          const [lbl, valRaw] = chunk.split(":");
          const val = parseFloat(valRaw);
          return {
            label: (lbl || `Item ${idx + 1}`).trim(),
            val: Number.isNaN(val) ? (idx + 1) * 35 : Math.max(5, Math.min(100, val)),
          };
        })
        .slice(0, 4);

      const chartW = Math.min(width * 0.78, 720);
      const maxBarH = minDim * 0.36;
      const baseY = minDim * 0.18;
      const barGap = minDim * 0.06;
      const barW = Math.min(minDim * 0.18, (chartW - barGap * (pairs.length - 1)) / pairs.length);
      const totalW = pairs.length * barW + (pairs.length - 1) * barGap;

      ctx.font = `900 ${Math.round(minDim * 0.062)}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(cue.text, 0, baseY - maxBarH - minDim * 0.11);

      ctx.strokeStyle = isLightTheme ? "rgba(24,24,27,0.2)" : "rgba(255,255,255,0.2)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-totalW / 2 - 20, baseY);
      ctx.lineTo(totalW / 2 + 20, baseY);
      ctx.stroke();

      pairs.forEach((item, i) => {
        const bProgress = easeOutBack(Math.min(1, Math.max(0, (elapsed - i * 0.15) / 0.75)));
        const h = Math.max(12, (item.val / 100) * maxBarH * Math.min(1.06, bProgress));
        const bx = -totalW / 2 + i * (barW + barGap);
        const by = baseY - h;
        const isLast = i === pairs.length - 1;

        const bg = ctx.createLinearGradient(0, by, 0, baseY);
        bg.addColorStop(0, isLast ? theme.accent : theme.accent2);
        bg.addColorStop(1, isLast ? `${theme.accent}66` : `${theme.accent2}44`);
        ctx.fillStyle = bg;
        drawRoundedRect(ctx, bx, by, barW, h, 14);
        ctx.fill();

        const liveNum = Math.round(
          item.val * Math.min(1, Math.max(0, (elapsed - i * 0.15) / 0.65))
        );
        ctx.font = `800 ${Math.round(minDim * 0.044)}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = isLast ? theme.accent : textColor;
        ctx.textAlign = "center";
        ctx.fillText(`${liveNum}%`, bx + barW / 2, by - minDim * 0.038);

        ctx.font = `700 ${Math.round(minDim * 0.036)}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = theme.sub;
        ctx.fillText(item.label, bx + barW / 2, baseY + minDim * 0.05);
      });
    }

    // --- 6. IMAGE ASSET (`image`) ---
    else if (cue.type === "image") {
      const img = loadedImages[cue.text.toLowerCase()];
      if (img && img.complete && img.naturalWidth > 0) {
        const targetW = width * 0.74;
        const targetH = height * 0.56;
        const imgRatio = img.naturalWidth / img.naturalHeight;
        let drawW = targetW;
        let drawH = targetW / imgRatio;
        if (drawH > targetH) {
          drawH = targetH;
          drawW = targetH * imgRatio;
        }
        drawRoundedRect(ctx, -drawW / 2, -drawH / 2, drawW, drawH, 24);
        ctx.save();
        ctx.clip();
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
        ctx.strokeStyle = theme.cardBorder;
        ctx.lineWidth = 3;
        drawRoundedRect(ctx, -drawW / 2, -drawH / 2, drawW, drawH, 24);
        ctx.stroke();
      } else {
        const boxW = width * 0.68;
        const boxH = minDim * 0.28;
        ctx.fillStyle = theme.cardBg;
        ctx.strokeStyle = theme.cardBorder;
        ctx.lineWidth = 2;
        drawRoundedRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, 20);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = theme.sub;
        ctx.font = `600 ${Math.round(minDim * 0.036)}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`Upload image "${cue.text}" in Assets tab`, 0, 0);
      }
    }

    // --- 7. ANIMATED STAT COUNTER (`stat`) ---
    else if (cue.type === "stat") {
      const countProgress = Math.min(1, elapsed / Math.min(1.1, dur * 0.55));
      const animatedVal = animateStatNumber(displayMain, countProgress);

      const statSize = Math.round(minDim * 0.125 * sizeMult);
      ctx.font = `900 ${statSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const statGrad = ctx.createLinearGradient(-width * 0.3, 0, width * 0.3, 0);
      statGrad.addColorStop(0, cue.color || theme.accent);
      statGrad.addColorStop(1, theme.accent2);
      ctx.fillStyle = statGrad;

      const statLines = wrapCanvasText(ctx, animatedVal, maxTextWidth);
      const lineH = statSize * 1.12;
      const startY = -((statLines.length - 1) * lineH) / 2 - (cue.sub ? minDim * 0.045 : 0);

      statLines.forEach((ln, i) => {
        ctx.fillText(ln, 0, startY + i * lineH);
      });

      if (cue.sub) {
        const subSize = Math.round(minDim * 0.044 * sizeMult);
        ctx.font = `600 ${subSize}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = theme.sub;
        const subLines = wrapCanvasText(ctx, cue.sub, maxTextWidth * 0.9);
        const subStart = startY + statLines.length * lineH + minDim * 0.03;
        subLines.forEach((ln, i) => {
          ctx.fillText(ln, 0, subStart + i * subSize * 1.3);
        });
      }
    }

    // --- 8. FLOATING GLASS CARD (`card`) ---
    else if (cue.type === "card") {
      const floatY = Math.sin(currentTime * 2.4) * 5;
      const titleSize = Math.round(minDim * 0.064 * sizeMult);
      const subSize = Math.round(minDim * 0.038 * sizeMult);
      ctx.font = `800 ${titleSize}px Inter, system-ui, sans-serif`;
      const titleLines = wrapCanvasText(ctx, displayMain, width * 0.72);
      ctx.font = `500 ${subSize}px Inter, system-ui, sans-serif`;
      const subLines = cue.sub ? wrapCanvasText(ctx, cue.sub, width * 0.72) : [];

      const padY = minDim * 0.065;
      const cardW = width * 0.84;
      const cardH =
        padY * 2 +
        titleLines.length * titleSize * 1.2 +
        (subLines.length ? subLines.length * subSize * 1.35 + minDim * 0.03 : 0);

      ctx.save();
      ctx.translate(0, floatY);
      ctx.shadowColor = "rgba(0,0,0,0.3)";
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
      ctx.font = `800 ${titleSize}px Inter, system-ui, sans-serif`;
      let yCursor = -cardH / 2 + padY + titleSize * 0.55;
      titleLines.forEach((ln) => {
        ctx.fillText(ln, 0, yCursor);
        yCursor += titleSize * 1.2;
      });

      if (subLines.length) {
        yCursor += minDim * 0.02;
        ctx.fillStyle = theme.sub;
        ctx.font = `500 ${subSize}px Inter, system-ui, sans-serif`;
        subLines.forEach((ln) => {
          ctx.fillText(ln, 0, yCursor);
          yCursor += subSize * 1.35;
        });
      }
      ctx.restore();
    }

    // --- 9. HIGH-IMPACT BADGE HOOK (`badge`) ---
    else if (cue.type === "badge") {
      const badgeFontSize = Math.round(minDim * 0.038 * sizeMult);
      ctx.font = `800 ${badgeFontSize}px Inter, system-ui, sans-serif`;
      const pillText = displayMain.toUpperCase();
      const pillW = Math.min(width * 0.8, ctx.measureText(pillText).width + minDim * 0.1);
      const pillH = badgeFontSize * 2.1;
      const pillY = cue.sub ? -minDim * 0.11 : -pillH / 2;

      ctx.fillStyle = cue.color || theme.accent;
      drawRoundedRect(ctx, -pillW / 2, pillY, pillW, pillH, pillH / 2);
      ctx.fill();

      ctx.fillStyle = "#09090f";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(pillText, 0, pillY + pillH / 2 + 1);

      if (cue.sub) {
        const headlineSize = Math.round(minDim * 0.068 * sizeMult);
        ctx.font = `800 ${headlineSize}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = textColor;
        const lines = wrapCanvasText(ctx, cue.sub, maxTextWidth);
        const startY = pillY + pillH + minDim * 0.075;
        lines.forEach((ln, i) => {
          ctx.fillText(ln, 0, startY + i * headlineSize * 1.22);
        });
      }
    }

    // --- 10. KINETIC TEXT (`text`) ---
    else {
      const fontSize = Math.round(minDim * 0.074 * sizeMult);
      ctx.font = `800 ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = textColor;
      ctx.shadowColor = isLightTheme ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 18;

      const lines = wrapCanvasText(ctx, displayMain, maxTextWidth);
      const lineH = fontSize * 1.24;
      const startY = -((lines.length - 1) * lineH) / 2 - (cue.sub ? minDim * 0.03 : 0);
      lines.forEach((ln, i) => {
        ctx.fillText(ln, 0, startY + i * lineH);
      });

      if (cue.sub) {
        ctx.shadowBlur = 0;
        const subSize = Math.round(minDim * 0.04 * sizeMult);
        ctx.font = `500 ${subSize}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = theme.sub;
        const subLines = wrapCanvasText(ctx, cue.sub, maxTextWidth);
        const subStart = startY + lines.length * lineH + minDim * 0.025;
        subLines.forEach((ln, i) => {
          ctx.fillText(ln, 0, subStart + i * subSize * 1.3);
        });
      }
    }

    ctx.restore();
  });

  // Bottom Progress Line
  const progress = parsed.totalDuration > 0 ? Math.min(1, currentTime / parsed.totalDuration) : 0;
  ctx.fillStyle = isLightTheme ? "rgba(24,24,27,0.12)" : "rgba(255,255,255,0.12)";
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
  const [editStyleId, setEditStyleId] = useState("pro_creator_hybrid");
  const [mixOriginalVideo, setMixOriginalVideo] = useState(true);
  const [themeId, setThemeId] = useState("dark");
  const [recipeDraft, setRecipeDraft] = useState("");
  const [appliedRecipe, setAppliedRecipe] = useState("");
  const [workspaceTab, setWorkspaceTab] = useState("code"); // timeline | code | assets
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  // Playback & Export State
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportLabel, setExportLabel] = useState("");
  const [videoSeekTick, setVideoSeekTick] = useState(0);

  // Assets (Original Video A-Roll + Voiceover Audio + Images)
  const [sourceVideoAsset, setSourceVideoAsset] = useState(null);
  const [useVideoAudio, setUseVideoAudio] = useState(true);
  const sourceVideoElRef = useRef(null);

  const [imageAssets, setImageAssets] = useState([]);
  const loadedImagesRef = useRef({});
  const [audioAsset, setAudioAsset] = useState(null);
  const audioElRef = useRef(null);

  // Get Transcript (Riverside + Confirm Modal)
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
    () => parseRecipe(appliedRecipe, themeId),
    [appliedRecipe, themeId]
  );

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

  // Stop media & loops cleanly on unmount
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

  // Persist Recent Projects
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
    setFormatId(proj.formatId || "16:9");
    setFps(proj.fps || 30);
    setThemeId(proj.themeId || "dark");
    setRecipeDraft(proj.code || "");
    setAppliedRecipe(proj.code || "");
    setCurrentTime(0);
    currentTimeRef.current = 0;
    setHistory([]);
    setFuture([]);
    setWorkspaceTab("code");
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

  // Preload image assets for Canvas
  useEffect(() => {
    const map = {};
    imageAssets.forEach((asset) => {
      const img = new Image();
      img.src = asset.url;
      map[asset.name.toLowerCase()] = img;
    });
    loadedImagesRef.current = map;
  }, [imageAssets]);

  // Render canvas frame when idle/previewing
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

  // Playback loop (keeps Original Video + Separate Voiceover synced)
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

  // Handle Original Video (A-Roll) Upload
  const handleSourceVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSourceVideoAsset({ name: file.name, url, duration: 0 });
    setMixOriginalVideo(true);
    notify(
      `Original video "${file.name}" loaded! Use "video" or "pip" scenes to show it between motion graphics.`,
      "success"
    );
    e.target.value = "";
  };

  // 1-Click Auto-Mix Original Video Cutaways into existing timeline
  const handleAutoMixVideoCutaways = () => {
    if (parsedRecipe.cues.length === 0) {
      const dur =
        sourceVideoAsset?.duration && sourceVideoAsset.duration > 3
          ? sourceVideoAsset.duration
          : 14;
      const sample = [
        {
          id: "m1",
          start: 0,
          end: 2.8,
          type: "video",
          text: "main",
          sub: "Watch this carefully...",
          anim: "zoomIn",
          color: "",
          size: "large",
          pos: "center",
        },
        {
          id: "m2",
          start: 2.8,
          end: 6.0,
          type: "search",
          text: "pro motion graphics",
          sub: "Step 1",
          anim: "pop",
          color: "",
          size: "large",
          pos: "center",
        },
        {
          id: "m3",
          start: 6.0,
          end: 9.2,
          type: "pip",
          text: "Keep Audience Hooked",
          sub: "Mix face + graphics smoothly",
          anim: "slideLeft",
          color: "",
          size: "large",
          pos: "center",
        },
        {
          id: "m4",
          start: 9.2,
          end: Math.min(dur, 12.5),
          type: "chart",
          text: "Engagement Jump",
          sub: "20,62,40,86,65,98",
          anim: "fadeUp",
          color: "",
          size: "large",
          pos: "center",
        },
        {
          id: "m5",
          start: Math.min(dur, 12.5),
          end: Math.max(15, Math.min(dur, 15.5)),
          type: "video",
          text: "main",
          sub: "Follow for more!",
          anim: "fadeIn",
          color: "",
          size: "large",
          pos: "center",
        },
      ];
      updateCuesFromTimeline(sample);
      notify("Created a ready Video + Motion hybrid timeline!", "success");
      return;
    }

    const mixed = parsedRecipe.cues.map((cue, idx) => {
      if (idx % 3 === 0) {
        return {
          ...cue,
          type: "video",
          text: "main",
          sub: cue.type === "video" ? cue.sub : cue.text,
          anim: "zoomIn",
        };
      }
      if (idx % 3 === 2 && cue.type === "text") {
        return {
          ...cue,
          type: "pip",
          anim: "slideLeft",
        };
      }
      return cue;
    });
    updateCuesFromTimeline(mixed);
    notify("Mixed Original Video cutaways & PiP between your motion graphics!", "success");
  };

  // Take text from clipboard -> open "Use this transcript?" review sheet
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
    notify("Transcript loaded! Pick your format & style, then tap Get Prompt.", "success");
  };

  const handleSavePromptTxt = () => {
    if (!generatedPrompt) return;
    const blob = new Blob([generatedPrompt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clipforge_motion_prompt_${formatId.replace(":", "x")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Prompt saved as .txt! Attach it in Claude, ChatGPT, or Gemini.", "success");
  };

  const handlePasteCodeFromClipboard = async () => {
    if (!navigator.clipboard?.readText) {
      notify("Paste directly into the code box below using Ctrl+V / Long-press Paste.", "info");
      return;
    }
    try {
      const txt = await navigator.clipboard.readText();
      if (!txt || !txt.trim()) {
        notify("Clipboard is empty. Copy the AI reply first.", "error");
        return;
      }
      setRecipeDraft(txt.trim());
      notify("Code pasted! Tap 'Apply & preview' to watch your motion edit.", "success");
    } catch {
      notify("Tap inside the code box and paste manually.", "info");
    }
  };

  const handleApplyCode = (overrideCode = null) => {
    const codeToUse = overrideCode !== null ? overrideCode : recipeDraft;
    if (!codeToUse.trim()) {
      notify("Paste a recipe code first or pick a starter template.", "error");
      return;
    }
    const testParsed = parseRecipe(codeToUse, themeId);
    if (testParsed.cues.length === 0) {
      notify(
        'No valid cues found. Example: 00:00.00 --> 00:03.00 search "Hello" sub="Demo" in=pop',
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
    notify(`Applied ${testParsed.cues.length} scenes! Playing preview.`, "success");
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

  const updateCuesFromTimeline = (nextCues) => {
    const newCode = serializeCuesToRecipe(nextCues, parsedRecipe.theme);
    setHistory((h) => [...h.slice(-20), appliedRecipe]);
    setFuture([]);
    setRecipeDraft(newCode);
    setAppliedRecipe(newCode);
    saveProjectToRecents({ code: newCode });
  };

  const handleAddTimelineCue = (cueType = "chart") => {
    const lastEnd =
      parsedRecipe.cues.length > 0 ? Math.max(...parsedRecipe.cues.map((c) => c.end)) : 0;
    const defaultsByType = {
      video: { text: "main", sub: "Original video cutaway" },
      pip: { text: "Key Insight", sub: "Original video + motion graphic" },
      search: { text: "animate my video", sub: "AI Studio" },
      chart: { text: "Growth Spike", sub: "20,65,40,85,60,96" },
      hub: { text: "All-In-One", sub: "Script|Edit|Motion|Export" },
      orbit: { text: "100% Automated", sub: "Smooth motion graphics" },
      bars: { text: "Before vs After", sub: "Old:25|New:95" },
      stat: { text: "10x Faster", sub: "Live animated counter" },
      text: { text: "New motion headline", sub: "" },
    };
    const d = defaultsByType[cueType] || defaultsByType.text;
    const next = [
      ...parsedRecipe.cues,
      {
        id: `cue_${Date.now()}`,
        start: Number(lastEnd.toFixed(2)),
        end: Number((lastEnd + 3).toFixed(2)),
        type: cueType,
        text: d.text,
        sub: d.sub,
        anim: "pop",
        color: "",
        size: "large",
        pos: "center",
      },
    ];
    updateCuesFromTimeline(next);
    notify(`Added new ${cueType} scene to timeline.`, "success");
  };

  const handleDownloadProjectFile = () => {
    saveProjectToRecents();
    const payload = {
      app: "ClipForge Motion Studio",
      version: "v2",
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
        setFormatId(parsed.formatId || "16:9");
        setFps(parsed.fps || 30);
        setThemeId(parsed.themeId || "dark");
        setRecipeDraft(parsed.code);
        setAppliedRecipe(parsed.code);
        setCurrentTime(0);
        currentTimeRef.current = 0;
        notify("Project loaded successfully!", "success");
      } catch {
        notify("Could not open file. Please select a valid .clipforge.json file.", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Smooth Lag-Free Capture (Motion Graphics + Original Video + Audio) -> Universal H.264 MP4
  const handleExportVideo = async () => {
    if (!canvasRef.current || parsedRecipe.cues.length === 0) {
      notify("Apply a motion recipe before exporting.", "error");
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
      "clipforge_motion";

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

      // Fresh off-DOM video element for export (prevents Web Audio reconnect errors)
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

      // Mix Audio Track: Separate Voiceover Audio OR Original Video Audio
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
          notify(`Universal MP4 (${fps}fps) downloaded! Playable on all phones & apps.`, "success");
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
                  ClipForge Motion Pro
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold uppercase">
                  100% Free
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pro Motion Graphics (Charts, Hubs, Search UI) + Original Video Cutaways — 0 credits
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
                  Paste a recipe from Claude, ChatGPT, or Gemini, attach your original video, and
                  export as universal MP4.
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
                  Paste transcript, turn on Video + Motion Hybrid mode, pick aspect ratio &amp;
                  style, and generate your AI prompt or auto-build in 1 click.
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
            Pro Motion Graphics Templates (1-Click Preview)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {DEMO_TEMPLATES.map((tpl) => (
              <button
                key={tpl.title}
                onClick={() => startFreshWorkspace("timeline", tpl)}
                className="p-3.5 rounded-xl bg-black/35 hover:bg-white/[0.06] border border-white/10 hover:border-amber-400/40 text-left transition space-y-1"
              >
                <div className="flex items-center justify-between">
                  <Sparkles className="w-4 h-4 text-amber-400"/>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-slate-300 font-semibold">
                    {tpl.format}
                  </span>
                </div>
                <div className="font-bold text-xs text-white pt-1">{tpl.title}</div>
                <div className="text-[11px] text-slate-400">Click to preview &amp; export MP4</div>
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
              No saved motion projects yet. Click &quot;Pro Motion Showcase&quot; above to try it now.
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
                        {relativeTimeLabel(proj.updatedAt)} · {proj.formatId || "16:9"} ·{" "}
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

        {/* "Use this transcript?" Confirmation Modal */}
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
                    animations to your voiceover; plain text will use automatic pacing.
                  </span>
                </div>
              ) : pendingHasTiming ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/35 text-xs text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0"/>
                  <span>
                    <strong>Timestamps detected!</strong> Your motion animations will sync cleanly
                    to your voiceover.
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
  // RENDER 3: GET CODE (Format, 30/60fps, Hybrid Video + Motion Styles)
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

        {/* How this works */}
        <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2 text-xs text-slate-300">
          <div className="font-bold text-sm text-white">How Pro Motion + Video Editing works</div>
          <ol className="space-y-1 list-decimal list-inside leading-relaxed">
            <li>Paste your transcript or upload an .srt file (from Riverside.fm or your clips).</li>
            <li>
              Optionally attach your <strong>Original Video</strong> below so it automatically shows
              between motion graphics (like top YouTube &amp; Reels editors).
            </li>
            <li>Pick aspect ratio, frame rate (30 / 60 fps), theme, and edit style.</li>
            <li>
              Tap <strong>Get Prompt</strong> for Claude/ChatGPT/Gemini, or tap{" "}
              <strong>Auto-Build Pro Edit Instantly</strong> for a 1-click live edit!
            </li>
          </ol>
        </div>

        {/* Optional Original Video Attach Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-950/40 via-[#0e0e1e] to-cyan-950/30 border border-cyan-400/30 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-cyan-400"/>
              <span className="font-bold text-sm text-white">
                Original Video Cutaways (A-Roll / Talking Head)
              </span>
            </div>
            <label className="flex items-center gap-2 text-xs text-cyan-200 cursor-pointer">
              <input
                type="checkbox"
                checked={mixOriginalVideo}
                onChange={(e) => setMixOriginalVideo(e.target.checked)}
                className="accent-cyan-400"
              />
              Mix original video between motion graphics
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-dashed border-cyan-400/45 text-cyan-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition">
              <Upload className="w-4 h-4"/>
              {sourceVideoAsset
                ? `Loaded: ${sourceVideoAsset.name}`
                : "Attach Original Video (.mp4 / .mov / .webm) — Optional"}
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
                Upload an .srt file so motion graphics &amp; video cutaways sync to your voiceover.
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
                No timestamps in this text. Upload an <strong>.srt</strong> to sync animations
                precisely, or continue with automatic pacing.
              </span>
            </div>
          )}

          {transcriptHasTiming && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0"/>
              <span>Timestamps detected — ready for voice-synced motion edits.</span>
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

        {/* Aspect Ratio Cards */}
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

        {/* Frame Rate Cards */}
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

        {/* Edit Style Selector */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm font-bold text-white">Edit style</div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Visual Theme:</span>
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
                  onClick={() => {
                    setEditStyleId(st.id);
                    if (st.id === "pro_creator_hybrid") setMixOriginalVideo(true);
                  }}
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

        {/* Primary Get Prompt + Instant Auto-Build */}
        <div className="space-y-2.5 pt-1">
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
                mixOriginalVideo
              );
              setGeneratedPrompt(promptText);
              setShowPromptBox(false);
              navigator.clipboard?.writeText(promptText).then(() => {
                setCopiedPrompt(true);
                setTimeout(() => setCopiedPrompt(false), 2500);
              });
              notify("Pro Motion Graphics handoff prompt ready & copied!", "success");
            }}
            className="w-full py-3.5 rounded-2xl bg-slate-100 hover:bg-white text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl transition"
          >
            <Wand2 className="w-4 h-4"/>
            Get Prompt (For Claude / ChatGPT / Gemini)
          </button>

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
                mixOriginalVideo
              );
              const newId = `motion_${Date.now()}`;
              const cleanTitle =
                transcriptInput
                  .replace(/\[?\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?\]?/g, "")
                  .replace(/-->/g, "")
                  .trim()
                  .split(/\s+/)
                  .slice(0, 5)
                  .join(" ") || "Pro Motion Edit";
              setProjectId(newId);
              setProjectTitle(cleanTitle);
              setRecipeDraft(autoCode);
              setAppliedRecipe(autoCode);
              setCurrentTime(0);
              currentTimeRef.current = 0;
              setWorkspaceTab("timeline");
              setScreen("workspace");
              setIsPlaying(true);
              saveProjectToRecents({
                id: newId,
                title: cleanTitle,
                formatId,
                fps,
                themeId,
                code: autoCode,
              });
              notify("Pro Motion Edit auto-built from your transcript!", "success");
            }}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4"/>
            Auto-Build Pro Motion Edit Instantly (Skip External AI)
          </button>
        </div>

        {/* GREEN "Handoff ready" Panel */}
        {generatedPrompt && (
          <div className="p-5 sm:p-6 rounded-3xl bg-emerald-950/40 border border-emerald-500/40 space-y-4 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-extrabold text-base text-emerald-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-400"/>
                Handoff ready
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Send this to Claude, ChatGPT, or Gemini. It returns the{" "}
                <code className="text-emerald-200">[ASSETS]</code> and{" "}
                <code className="text-emerald-200">[RECIPE]</code> blocks with Pro Motion Graphics
                cues. Copy those, then tap <strong>Open the editor</strong> below.
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
                  notify("Prompt copied to clipboard!", "success");
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
  // RENDER 4: WORKSPACE (Live Canvas + Video Cutaways + Timeline / Code / Assets)
  // =========================================================================
  return (
    <div className="space-y-4">
      {/* Hidden Synced Media Elements for Live Preview */}
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

      {/* Main Split: Preview Canvas + Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Live Video Preview Canvas */}
        <div className="lg:col-span-6 p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4">
          <div className="relative rounded-xl overflow-hidden bg-black border border-white/10 flex items-center justify-center min-h-[240px]">
            <canvas
              ref={canvasRef}
              width={activeFormat.width}
              height={activeFormat.height}
              className="w-full h-auto max-h-[440px] object-contain block"
            />
            {parsedRecipe.cues.length === 0 && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-6 space-y-2">
                <Film className="w-10 h-10 text-slate-500"/>
                <div className="font-bold text-sm text-white">No recipe yet</div>
                <div className="text-xs text-slate-400 max-w-xs">
                  Paste code below and tap <strong>Apply &amp; preview</strong>, or tap{" "}
                  <strong>No code? Get code</strong>.
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
                {parsedRecipe.cues.length} scenes · {fps}fps · Theme:{" "}
                <strong className="text-slate-200">{THEMES[parsedRecipe.theme]?.label}</strong>
              </span>
              <div className="flex items-center gap-2">
                {sourceVideoAsset && (
                  <span className="text-cyan-300 flex items-center gap-1">
                    <Video className="w-3 h-3"/> Video Synced
                  </span>
                )}
                {audioAsset && (
                  <span className="text-emerald-300 flex items-center gap-1">
                    <Music className="w-3 h-3"/> {audioAsset.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Timeline / Code / Assets Panel */}
        <div className="lg:col-span-6 p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4">
          <div className="grid grid-cols-3 p-1 rounded-xl bg-black/50 border border-white/10 text-xs font-bold">
            {[
              { id: "timeline", label: "Timeline", icon: Layers },
              { id: "code", label: "Code", icon: Code2 },
              { id: "assets", label: "Assets & Video", icon: ImageIcon },
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

          {/* TAB 1: CODE */}
          {workspaceTab === "code" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-400">
                  Paste <code className="text-slate-200">[ASSETS] + [RECIPE]</code> from Claude /
                  ChatGPT
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
                placeholder={`v1\ntheme=opus\n00:00.00 --> 00:02.80 video "main" sub="Watch this..." in=zoomIn\n00:02.80 --> 00:06.00 search "animate my sketch" sub="AI Workflow" in=pop\n00:06.00 --> 00:09.50 chart "Growth" sub="20,65,40,85,60,96" in=fadeUp`}
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
                        const updatedCode = serializeCuesToRecipe(parsedRecipe.cues, nextTheme);
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
                    onClick={handleAutoMixVideoCutaways}
                    className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-[11px] font-bold flex items-center gap-1"
                    title="Auto-alternate Original Video & PiP between motion graphics"
                  >
                    <Video className="w-3.5 h-3.5"/> Mix Video
                  </button>
                  <button
                    onClick={() => handleAddTimelineCue("chart")}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-[11px] font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5"/> Add Scene
                  </button>
                </div>
              </div>

              {/* Quick Pro Motion Graphic Insert Pills */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { t: "video", l: "+ Video" },
                  { t: "pip", l: "+ PiP" },
                  { t: "search", l: "+ Search UI" },
                  { t: "chart", l: "+ Chart" },
                  { t: "hub", l: "+ Hub" },
                  { t: "orbit", l: "+ Orbit" },
                  { t: "bars", l: "+ Bars" },
                ].map((q) => (
                  <button
                    key={q.t}
                    onClick={() => handleAddTimelineCue(q.t)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-slate-300"
                  >
                    {q.l}
                  </button>
                ))}
              </div>

              {parsedRecipe.cues.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-black/30 border border-white/10 text-xs text-slate-400 space-y-2">
                  <div>No scenes on the timeline yet.</div>
                  <button
                    onClick={handleAutoMixVideoCutaways}
                    className="px-4 py-2 rounded-lg bg-amber-500 text-black font-bold"
                  >
                    + Create Pro Video + Motion Sample
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
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
                                const next = parsedRecipe.cues.map((c, i) =>
                                  i === idx ? { ...c, type: e.target.value } : c
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
                          placeholder="Main title / query / asset name..."
                          className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white"
                        />

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
                          placeholder={
                            cue.type === "chart"
                              ? "Chart numbers e.g. 20,65,40,85,60,96"
                              : cue.type === "hub"
                              ? "4 Nodes separated by | e.g. Script|Edit|Motion|Export"
                              : cue.type === "bars"
                              ? "Bars e.g. Before:25|After:95"
                              : "Optional subtitle / video caption..."
                          }
                          className="w-full px-2.5 py-1 rounded-lg bg-black/40 border border-white/5 text-[11px] text-slate-300"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ASSETS & ORIGINAL VIDEO */}
          {workspaceTab === "assets" && (
            <div className="space-y-4">
              {/* Original Video Upload (A-Roll Cutaways & PiP) */}
              <div className="p-4 rounded-xl bg-black/35 border border-cyan-400/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-cyan-400"/> Original Video (A-Roll Cutaways
                    &amp; PiP)
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
                <p className="text-[11px] text-slate-400">
                  Shows automatically during <code className="text-cyan-300">video</code> &amp;{" "}
                  <code className="text-cyan-300">pip</code> scenes while keeping your voice synced
                  across motion graphics.
                </p>
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
                    Keep original video audio across the entire edit (including motion graphics)
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
                <p className="text-[11px] text-slate-400">
                  Overrides original video audio if uploaded — synced in preview &amp; MP4 export.
                </p>
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

              {/* Image Assets */}
              <div className="p-4 rounded-xl bg-black/35 border border-white/10 space-y-3">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-amber-400"/> Image &amp; Logo Assets
                </div>
                <p className="text-[11px] text-slate-400">
                  Upload images and reference them in recipes using{" "}
                  <code className="text-amber-300">image &quot;asset_name&quot;</code>.
                </p>

                <label className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-dashed border-amber-400/40 text-xs font-semibold text-amber-200 flex items-center justify-center gap-2 cursor-pointer">
                  <Plus className="w-4 h-4"/> Add Image (.png, .jpg, .webp)
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (!files.length) return;
                      const added = files.map((f) => ({
                        name: f.name
                          .replace(/\.[^.]+$/, "")
                          .toLowerCase()
                          .replace(/[^a-z0-9_-]/g, "_"),
                        url: URL.createObjectURL(f),
                      }));
                      setImageAssets((prev) => [...prev, ...added]);
                      notify(`Added ${added.length} image asset(s)!`, "success");
                      e.target.value = "";
                    }}
                  />
                </label>

                {imageAssets.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {imageAssets.map((asset, idx) => (
                      <div
                        key={`${asset.name}_${idx}`}
                        className="p-2 rounded-xl bg-black/50 border border-white/10 space-y-1.5"
                      >
                        <img
                          src={asset.url}
                          alt={asset.name}
                          className="w-full h-20 object-cover rounded-lg bg-black"
                        />
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-mono text-amber-300 truncate">
                            {asset.name}
                          </span>
                          <button
                            onClick={() =>
                              setImageAssets((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="text-rose-400 hover:text-rose-300"
                          >
                            <Trash2 className="w-3 h-3"/>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
