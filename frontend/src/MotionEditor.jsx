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
  RefreshCw,
  RotateCcw,
  RotateCw,
  Save,
  Smartphone,
  Sparkles,
  Square,
  Trash2,
  Upload,
  Wand2,
  X,
  Zap,
} from "lucide-react";

const STORAGE_KEY = "clipforge_motion_projects_v1";
const TRANSCRIBE_URL = "https://aifreeforever.com/tools/free-speech-to-text";

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
    id: "dynamic_no_assets",
    name: "Dynamic No Assets",
    desc: "Balanced, punchy edit with varied entrances and tasteful emphasis. A great default WITHOUT ASSETS.",
    icon: Zap,
    promptRules:
      "Use NO external images. Focus on punchy kinetic typography, bold badges, clean stat highlights, and varied animations (pop, fadeUp, slideLeft, zoomIn).",
  },
  {
    id: "dynamic_no_assets_improved",
    name: "Dynamic No Assets Improved",
    desc: "Create video without assets — high quality non-caption editorial motion cuts.",
    icon: Film,
    promptRules:
      "Use NO external images and avoid boring subtitle walls. Turn every idea into short 2–5 word hero titles, clean cards, and high-contrast typographic beats.",
  },
  {
    id: "composed",
    name: "Composed",
    desc: "Built from images you generate. Few elements, held long enough to read. Needs 5-7 assets before it will render.",
    icon: Layers,
    promptRules:
      "Include an [ASSETS] section listing 5–7 image asset names and prompts, then reference them in [RECIPE] using `image \"asset_name\"` held for 3–5 seconds alongside crisp cards.",
  },
  {
    id: "motion_graphics",
    name: "Motion Graphics",
    desc: "Motion graphics themed with structured cards, badges, and animated stat callouts.",
    icon: Play,
    promptRules:
      "Design a sleek motion-graphics explainer using alternating `badge`, `stat`, and `card` layouts with smooth slideLeft/slideRight and zoomIn transitions.",
  },
  {
    id: "motion_graphics_dynamic",
    name: "Motion Graphics Dynamic BETA",
    desc: "Dynamic motion graphics: every idea becomes an animated visual beat, tightly timed to your voice.",
    icon: Sparkles,
    promptRules:
      "Break every spoken phrase into rapid, high-retention 1.5s–2.8s visual beats. Alternate badges, bold stats, typewriter reveals, and sleek cards synced tightly to timestamps.",
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

const ANIMATIONS = ["fadeUp", "pop", "slideLeft", "slideRight", "zoomIn", "typewriter", "fadeIn", "none"];

const DEMO_TEMPLATES = [
  {
    title: "Viral Hook Demo",
    format: "9:16",
    theme: "neon",
    code: `v1
theme=neon
00:00.00 --> 00:02.50 badge "STOP SCROLLING" sub="Here is what nobody tells you" in=pop
00:02.50 --> 00:05.50 text "Most creators spend 4 hours editing a 30-second video." in=fadeUp
00:05.50 --> 00:08.50 stat "10x Faster" sub="With AI motion recipes" in=zoomIn
00:08.50 --> 00:11.50 card "Save This Workflow" sub="Try it free inside ClipForge AI" in=slideLeft`,
  },
  {
    title: "You Save Every Month",
    format: "16:9",
    theme: "emerald",
    code: `v1
theme=emerald
00:00.00 --> 00:03.00 text "You save every month, right?" in=fadeUp
00:03.00 --> 00:06.00 stat "₹5,000 / mo" sub="Compounded over 10 years" in=pop
00:06.00 --> 00:09.50 card "Small Habits Win Big" sub="Consistency beats timing every single time" in=slideRight`,
  },
  {
    title: "Welcome Back Intro",
    format: "16:9",
    theme: "dark",
    code: `v1
theme=dark
00:00.00 --> 00:02.80 badge "WELCOME BACK" sub="New episode is live" in=zoomIn
00:02.80 --> 00:06.00 text "Today we break down 3 editing secrets." in=typewriter
00:06.00 --> 00:09.00 card "Let's Dive In" sub="Watch till the very end" in=fadeUp`,
  },
];

function hasTimestampsInText(text) {
  if (!text) return false;
  return /\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?\s*(?:-->|->)\s*\d{1,2}:\d{2}/.test(text);
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

  const lines = rawText
    .replace(/\r/g, "")
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
    const typeMatch = rest.match(/\b(text|stat|card|badge|image)\s+"([^"]*)"/i);
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
      id: `cue_${idx}_${Date.now()}`,
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

function buildRecipeFromTranscript(transcript, theme = "neon", editStyleId = "dynamic_no_assets") {
  const clean = (transcript || "").trim();
  if (!clean) return DEMO_TEMPLATES[0].code;

  const lines = ["v1", `theme=${theme}`];
  const isFast = editStyleId === "motion_graphics_dynamic";
  const isMotion = editStyleId === "motion_graphics" || editStyleId === "motion_graphics_dynamic";
  const animCycle = isMotion
    ? ["pop", "slideLeft", "zoomIn", "slideRight", "fadeUp"]
    : ["fadeUp", "pop", "zoomIn", "slideLeft", "typewriter"];

  const srtBlocks = clean.split(/\r?\n\r?\n/);
  const srtTimeRe =
    /(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3})/;

  let foundSrt = false;
  let cueCount = 0;

  for (const block of srtBlocks) {
    const blines = block
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const timeLineIdx = blines.findIndex((l) => srtTimeRe.test(l));
    if (timeLineIdx !== -1) {
      foundSrt = true;
      const m = blines[timeLineIdx].match(srtTimeRe);
      const start = parseTimestamp(m[1]);
      const end = Math.max(start + 1.0, parseTimestamp(m[2]));
      const text = blines
        .slice(timeLineIdx + 1)
        .join(" ")
        .replace(/<[^>]+>/g, "")
        .replace(/"/g, "'")
        .trim();
      if (!text) continue;

      const anim = animCycle[cueCount % animCycle.length];
      const hasNumber = /\d+%|\₹\d+|\$\d+|\d+x/i.test(text);
      const cueType =
        cueCount === 0
          ? "badge"
          : hasNumber
          ? "stat"
          : isMotion && cueCount % 2 === 1
          ? "card"
          : cueCount % 4 === 3
          ? "card"
          : "text";

      if (cueType === "badge") {
        lines.push(
          `${formatRecipeTime(start)} --> ${formatRecipeTime(end)} badge "HIGHLIGHT" sub="${text}" in=${anim}`
        );
      } else {
        lines.push(
          `${formatRecipeTime(start)} --> ${formatRecipeTime(end)} ${cueType} "${text}" in=${anim}`
        );
      }
      cueCount++;
    }
  }

  if (foundSrt && cueCount > 0) {
    return lines.join("\n");
  }

  const sentences = clean
    .replace(/\r/g, " ")
    .split(/(?<=[.!?।])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const maxWordsPerChunk = isFast ? 6 : 8;
  const chunks = [];
  for (const s of sentences) {
    const words = s.split(/\s+/);
    if (words.length <= maxWordsPerChunk + 2) {
      chunks.push(s);
    } else {
      for (let i = 0; i < words.length; i += maxWordsPerChunk) {
        chunks.push(words.slice(i, i + maxWordsPerChunk).join(" "));
      }
    }
  }

  let cursor = 0;
  chunks.slice(0, 30).forEach((chunk, idx) => {
    const pace = isFast ? 0.32 : 0.38;
    const dur = Math.min(4.0, Math.max(1.8, chunk.split(/\s+/).length * pace));
    const start = cursor;
    const end = cursor + dur;
    cursor = end;

    const safe = chunk.replace(/"/g, "'");
    const anim = animCycle[idx % animCycle.length];
    const hasStat = /\d+%|\₹\d+|\$\d+|\d+x/i.test(safe);
    if (idx === 0) {
      lines.push(
        `${formatRecipeTime(start)} --> ${formatRecipeTime(end)} badge "WATCH THIS" sub="${safe}" in=pop`
      );
    } else if (hasStat) {
      lines.push(`${formatRecipeTime(start)} --> ${formatRecipeTime(end)} stat "${safe}" in=zoomIn`);
    } else if (idx === chunks.length - 1 || (isMotion ? idx % 2 === 1 : idx % 4 === 3)) {
      lines.push(`${formatRecipeTime(start)} --> ${formatRecipeTime(end)} card "${safe}" in=${anim}`);
    } else {
      lines.push(`${formatRecipeTime(start)} --> ${formatRecipeTime(end)} text "${safe}" in=${anim}`);
    }
  });

  return lines.join("\n");
}

function buildAiHandoffPrompt(transcript, formatId, fps, editStyleId, themeId) {
  const styleObj = EDIT_STYLES.find((s) => s.id === editStyleId) || EDIT_STYLES[0];
  const synced = hasTimestampsInText(transcript);

  return `You are a professional motion graphics director for ClipForge Motion Studio.
Convert the transcript below into a high-retention animated motion edit recipe.

PROJECT SETTINGS:
- Aspect Ratio: ${formatId}
- Frame Rate: ${fps} fps
- Edit Style: ${styleObj.name}
- Theme: ${themeId}
- Style Direction: ${styleObj.promptRules}
- Timing Mode: ${
    synced
      ? "EXACT SRT TIMESTAMPS PROVIDED — keep animations tightly synced to the given timestamps."
      : "No timestamps provided — pace each visual beat naturally at 2.2s–3.5s per punchy line."
  }

STRICT OUTPUT FORMAT:
Reply ONLY with the [ASSETS] (if needed) and [RECIPE] blocks — no extra explanation.

[ASSETS]
(Only list image asset names if using Composed style; otherwise write "None")

[RECIPE]
v1
theme=${themeId}
00:00.00 --> 00:02.60 badge "HOOK LABEL" sub="Opening headline here" in=pop
00:02.60 --> 00:05.40 text "Short punchy kinetic line" in=fadeUp
00:05.40 --> 00:08.20 stat "₹10,000" sub="Key stat or proof point" in=zoomIn
00:08.20 --> 00:11.00 card "Key Takeaway" sub="Supporting insight" in=slideLeft

SUPPORTED CUE TYPES:
- text "Main kinetic headline" (optional sub="subtitle")
- stat "Big Number / Metric" sub="Short context"
- card "Card Title" sub="Short body line"
- badge "PILL TAG" sub="Hero headline below pill"
- image "asset_name" (only if referencing an asset from [ASSETS])

SUPPORTED ANIMATIONS (in=):
fadeUp, pop, slideLeft, slideRight, zoomIn, typewriter, fadeIn

OPTIONAL ATTRIBUTES:
- color=#f59e0b (custom hex highlight color)
- size=small | medium | large
- pos=top | center | bottom

RULES:
1. Never put more than 8 words in a single main headline — split long ideas into consecutive beats.
2. Vary cue types and animations so every 2–3 seconds feels fresh and cinematic on ${formatId}.
3. Use valid MM:SS.ms --> MM:SS.ms timestamps in ascending order with zero syntax errors.

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

function renderMotionFrame(ctx, width, height, currentTime, parsed, loadedImages) {
  const theme = THEMES[parsed.theme] || THEMES.dark;

  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, parsed.bgColor || theme.bg1);
  grad.addColorStop(1, parsed.bgColor || theme.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const glowX = width * (0.25 + 0.15 * Math.sin(currentTime * 0.7));
  const glowY = height * (0.3 + 0.12 * Math.cos(currentTime * 0.5));
  const rad1 = ctx.createRadialGradient(glowX, glowY, 10, glowX, glowY, width * 0.55);
  rad1.addColorStop(0, `${theme.accent}33`);
  rad1.addColorStop(1, "transparent");
  ctx.fillStyle = rad1;
  ctx.fillRect(0, 0, width, height);

  const rad2 = ctx.createRadialGradient(
    width - glowX * 0.6,
    height - glowY * 0.5,
    10,
    width - glowX * 0.6,
    height - glowY * 0.5,
    width * 0.5
  );
  rad2.addColorStop(0, `${theme.accent2}26`);
  rad2.addColorStop(1, "transparent");
  ctx.fillStyle = rad2;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.strokeStyle = parsed.theme === "light" ? "rgba(15,23,42,0.05)" : "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  const gridStep = Math.round(Math.min(width, height) / 12);
  const offset = (currentTime * 18) % gridStep;
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

  const activeCues = parsed.cues.filter((c) => currentTime >= c.start && currentTime <= c.end);
  const minDim = Math.min(width, height);

  activeCues.forEach((cue) => {
    const elapsed = currentTime - cue.start;
    const remaining = cue.end - currentTime;
    const dur = Math.max(0.4, cue.end - cue.start);
    const inDur = Math.min(0.45, dur * 0.35);
    const outDur = Math.min(0.25, dur * 0.2);

    const rawIn = Math.min(1, Math.max(0, elapsed / inDur));
    const ease = 1 - Math.pow(1 - rawIn, 3);
    const fadeOut = remaining < outDur ? Math.max(0, remaining / outDur) : 1;

    let alpha = ease * fadeOut;
    let offsetX = 0;
    let offsetY = 0;
    let scale = 1;
    let displayMain = cue.text;

    switch (cue.anim) {
      case "fadeUp":
        offsetY = (1 - ease) * (minDim * 0.08);
        break;
      case "pop":
        scale = 0.72 + 0.28 * (1 + Math.sin(rawIn * Math.PI * 0.65) * 0.12 * (1 - rawIn));
        if (rawIn >= 1) scale = 1;
        break;
      case "slideLeft":
        offsetX = (1 - ease) * (width * 0.22);
        break;
      case "slideRight":
        offsetX = -(1 - ease) * (width * 0.22);
        break;
      case "zoomIn":
        scale = 0.85 + 0.15 * ease + (elapsed / dur) * 0.04;
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
      cue.pos === "top" ? height * 0.24 : cue.pos === "bottom" ? height * 0.76 : height * 0.5;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.translate(width / 2 + offsetX, centerY + offsetY);
    ctx.scale(scale, scale);

    const sizeMult = cue.size === "small" ? 0.78 : cue.size === "medium" ? 0.9 : 1;
    const textColor = cue.color || theme.text;
    const maxTextWidth = width * 0.82;

    if (cue.type === "image") {
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
    } else if (cue.type === "stat") {
      const statSize = Math.round(minDim * 0.125 * sizeMult);
      ctx.font = `900 ${statSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const statGrad = ctx.createLinearGradient(-width * 0.3, 0, width * 0.3, 0);
      statGrad.addColorStop(0, cue.color || theme.accent);
      statGrad.addColorStop(1, theme.accent2);
      ctx.fillStyle = statGrad;

      const statLines = wrapCanvasText(ctx, displayMain, maxTextWidth);
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
    } else if (cue.type === "card") {
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

      ctx.fillStyle = theme.cardBg;
      ctx.strokeStyle = theme.cardBorder;
      ctx.lineWidth = 2.5;
      drawRoundedRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 26);
      ctx.fill();
      ctx.stroke();

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
    } else if (cue.type === "badge") {
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
    } else {
      const fontSize = Math.round(minDim * 0.074 * sizeMult);
      ctx.font = `800 ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = textColor;
      ctx.shadowColor = "rgba(0,0,0,0.45)";
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

  const progress = parsed.totalDuration > 0 ? Math.min(1, currentTime / parsed.totalDuration) : 0;
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(0, height - 6, width, 6);
  ctx.fillStyle = theme.accent;
  ctx.fillRect(0, height - 6, width * progress, 6);
}

export default function MotionEditor({ projects = [], showToast }) {
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
  const [formatId, setFormatId] = useState("16:9");
  const [fps, setFps] = useState(30);
  const [editStyleId, setEditStyleId] = useState("dynamic_no_assets");
  const [themeId, setThemeId] = useState("dark");
  const [recipeDraft, setRecipeDraft] = useState("");
  const [appliedRecipe, setAppliedRecipe] = useState("");
  const [workspaceTab, setWorkspaceTab] = useState("code"); // timeline | code | assets
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  // Playback State
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportPercent, setExportPercent] = useState(0);

  // Assets (Images + Voiceover Audio)
  const [imageAssets, setImageAssets] = useState([]);
  const loadedImagesRef = useRef({});
  const [audioAsset, setAudioAsset] = useState(null);
  const audioElRef = useRef(null);

  // Get Transcript (In-App Embedded + Confirm Modal)
  const [transcriptTab, setTranscriptTab] = useState("embed"); // embed | mic | clips
  const [iframeKey, setIframeKey] = useState(0);
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
    projects.forEach((p) => {
      if (Array.isArray(p.clips)) {
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
    setFormatId(starter?.format || formatId || "16:9");
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

  // Render canvas frame
  useEffect(() => {
    if (screen !== "workspace" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderMotionFrame(
      ctx,
      activeFormat.width,
      activeFormat.height,
      currentTime,
      parsedRecipe,
      loadedImagesRef.current
    );
  }, [screen, currentTime, parsedRecipe, activeFormat, imageAssets]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying || exporting) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioElRef.current && !audioElRef.current.paused) {
        audioElRef.current.pause();
      }
      return;
    }

    if (audioElRef.current && audioAsset) {
      try {
        audioElRef.current.currentTime = currentTimeRef.current;
        audioElRef.current.play().catch(() => {});
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
  }, [isPlaying, exporting, parsedRecipe.totalDuration, audioAsset]);

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
      } catch {
        // Clipboard permission denied — open sheet so user can paste manually
      }
    }
    setPendingTranscript(transcriptInput || "");
    setConfirmModalOpen(true);
    if (fromClipboard) {
      notify("Paste your copied transcript/SRT in the box below and tap 'Use it'.", "info");
    }
  };

  // Save transcript text as .srt or .txt file
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

  // Confirm transcript -> auto-redirect straight to Get Code
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

  // Download generated prompt as .txt (ideal for mobile Claude/ChatGPT attachment)
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

  // Paste AI code from clipboard directly into Workspace -> Code tab
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
        'No valid cues found. Example: 00:00.00 --> 00:03.00 text "Hello" in=fadeUp',
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
    notify(`Applied ${testParsed.cues.length} motion cues! Playing preview.`, "success");
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

  const handleAddTimelineCue = () => {
    const lastEnd =
      parsedRecipe.cues.length > 0 ? Math.max(...parsedRecipe.cues.map((c) => c.end)) : 0;
    const next = [
      ...parsedRecipe.cues,
      {
        id: `cue_${Date.now()}`,
        start: Number(lastEnd.toFixed(2)),
        end: Number((lastEnd + 3).toFixed(2)),
        type: "text",
        text: "New motion headline",
        sub: "",
        anim: "fadeUp",
        color: "",
        size: "large",
        pos: "center",
      },
    ];
    updateCuesFromTimeline(next);
    notify("Added new scene to timeline.", "success");
  };

  const handleDownloadProjectFile = () => {
    saveProjectToRecents();
    const payload = {
      app: "ClipForge Motion Studio",
      version: "v1",
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

  // Free Browser Canvas Video Export (Supports 30fps & 60fps + Audio Sync)
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
    setExportPercent(0);

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const videoStream = canvas.captureStream(fps);
      const tracks = [...videoStream.getVideoTracks()];

      let audioCtx = null;
      let tempAudio = null;
      if (audioAsset?.url) {
        try {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          tempAudio = new Audio(audioAsset.url);
          tempAudio.crossOrigin = "anonymous";
          const source = audioCtx.createMediaElementSource(tempAudio);
          const dest = audioCtx.createMediaStreamDestination();
          source.connect(dest);
          source.connect(audioCtx.destination);
          dest.stream.getAudioTracks().forEach((t) => tracks.push(t));
        } catch {
          tempAudio = null;
        }
      }

      const combinedStream = new MediaStream(tracks);
      const mimeTypes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm;codecs=vp9",
        "video/webm",
      ];
      const chosenMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || "";
      const recorder = chosenMime
        ? new MediaRecorder(combinedStream, {
            mimeType: chosenMime,
            videoBitsPerSecond: fps === 60 ? 6500000 : 4500000,
          })
        : new MediaRecorder(combinedStream);

      const chunks = [];
      recorder.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) chunks.push(evt.data);
      };

      const donePromise = new Promise((resolve) => {
        recorder.onstop = () => resolve();
      });

      recorder.start(200);
      if (tempAudio) {
        tempAudio.currentTime = 0;
        tempAudio.play().catch(() => {});
      }

      const totalDur = parsedRecipe.totalDuration;
      const startWall = performance.now();

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
            loadedImagesRef.current
          );
          setExportPercent(Math.min(99, Math.round((clamped / totalDur) * 100)));
          if (t < totalDur) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        };
        requestAnimationFrame(step);
      });

      if (tempAudio) tempAudio.pause();
      if (recorder.state !== "inactive") recorder.stop();
      await donePromise;
      if (audioCtx) audioCtx.close().catch(() => {});

      const blob = new Blob(chunks, { type: chosenMime || "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_") || "clipforge_motion"}_${fps}fps.webm`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      setExportPercent(100);
      notify(`Motion video (${fps}fps) exported & downloaded! (100% Free)`, "success");
    } catch (err) {
      notify(err?.message || "Export failed. Please try again in Chrome/Edge.", "error");
    } finally {
      setExporting(false);
    }
  };

  const handleTranscriptUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setTranscriptInput(String(reader.result || ""));
      notify(`Loaded ${file.name}!`, "success");
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
  // RENDER 1: LAUNCHPAD HOME ("I have code" / "Get code" / "Get transcript")
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
                  ClipForge Motion
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold uppercase">
                  100% Free
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Turn any transcript into a kinetic motion edit — zero credits used
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
                  Paste a recipe from Claude, ChatGPT, or Gemini, preview it live, and fine-tune
                  the timeline.
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
                  No code yet? Add a transcript, pick aspect ratio, FPS &amp; edit style, and get
                  your ready handoff prompt.
                </div>
              </div>
            </div>
            <span className="text-lg font-bold text-slate-400 shrink-0">→</span>
          </button>

          <button
            onClick={() => {
              setTranscriptTab("embed");
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
                  No transcript yet? Upload your audio to a free transcriber right inside this app
                  — without leaving ClipForge AI.
                </div>
              </div>
            </div>
            <span className="text-lg font-bold text-slate-400 shrink-0">→</span>
          </button>
        </div>

        {/* Starter Templates */}
        <div className="space-y-2.5 pt-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Quick Starter Templates (Try Instantly)
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
                <div className="text-[11px] text-slate-400">Click to preview &amp; edit</div>
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
              No saved motion projects yet. Start with a template or paste a recipe above.
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
  // RENDER 2: GET TRANSCRIPT (IN-APP EMBEDDED TRANSCRIBER + TAKE TEXT BAR)
  // =========================================================================
  if (screen === "get_transcript") {
    return (
      <div className="max-w-4xl mx-auto space-y-3 relative">
        {/* Top In-App Browser Header */}
        <div className="p-3 rounded-2xl bg-[#0d0d1a] border border-white/15 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setScreen("home")}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 shrink-0"
              title="Close"
            >
              <X className="w-4 h-4"/>
            </button>
            <div className="min-w-0">
              <div className="font-extrabold text-sm text-white truncate">aifreeforever.com</div>
              <div className="text-[11px] text-slate-400 truncate">
                Upload audio → select Subtitles (SRT) → copy output → tap Take text below
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIframeKey((k) => k + 1)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
              title="Reload transcriber"
            >
              <RefreshCw className="w-4 h-4"/>
            </button>
            <button
              onClick={() => {
                window.open(
                  TRANSCRIBE_URL,
                  "clipforge_transcriber",
                  "width=480,height=760,noopener,noreferrer"
                );
              }}
              className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-cyan-300 flex items-center gap-1"
              title="Open in side popup if iframe is blocked"
            >
              <ExternalLink className="w-3.5 h-3.5"/>
              <span className="hidden sm:inline">Popup</span>
            </button>
          </div>
        </div>

        {/* Source Switcher Pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: "embed", label: "In-App Speech to Text (Whisper)", icon: Sparkles },
            { id: "mic", label: "Live Mic / Manual Paste", icon: Mic },
            ...(allClipForgeClips.length > 0
              ? [{ id: "clips", label: `My ClipForge Clips (${allClipForgeClips.length})`, icon: Film }]
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

        {/* Body Area */}
        {transcriptTab === "embed" && (
          <div className="rounded-2xl overflow-hidden border border-white/15 bg-[#090914] space-y-0">
            <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-400/25 text-[11px] text-amber-200 flex flex-wrap items-center justify-between gap-2">
              <span>
                <strong>Quick Tip:</strong> Pick <strong>Subtitles (SRT)</strong> for exact timing,
                copy the generated text, then tap the orange <strong>Take text</strong> button below.
              </span>
              <button
                onClick={() =>
                  window.open(
                    TRANSCRIBE_URL,
                    "clipforge_transcriber",
                    "width=480,height=760,noopener,noreferrer"
                  )
                }
                className="underline text-amber-300 font-bold"
              >
                Not loading? Open Popup ↗
              </button>
            </div>
            <iframe
              key={iframeKey}
              src={TRANSCRIBE_URL}
              title="Free Speech to Text Transcriber"
              allow="microphone; clipboard-read; clipboard-write"
              className="w-full h-[540px] sm:h-[600px] bg-[#0b0b18]"
            />
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
                    onChange={handleTranscriptUpload}
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

        {/* Sticky Bottom Action Bar (Exact Take text + Paste Flow) */}
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
                    {pendingTranscript.length.toLocaleString()} characters · ready to edit or send
                    to Get code
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
                    <strong>SRT timestamps detected!</strong> Your motion animations will sync to
                    your voiceover.
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
  // RENDER 3: GET CODE (Format, 30/60fps, 5 Edit Styles, Handoff Ready)
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
          <div className="font-bold text-sm text-white">How this works</div>
          <ol className="space-y-1 list-decimal list-inside leading-relaxed">
            <li>Add your transcript below (or grab one from Get transcript).</li>
            <li>Pick your aspect ratio, frame rate (30 / 60 fps), and edit style.</li>
            <li>
              Tap <strong>Get Prompt</strong> — we bundle all editing rules, animation vocabulary,
              and your transcript into a single handoff file.
            </li>
            <li>Paste or attach that in Claude, ChatGPT, or Gemini. It returns the code.</li>
            <li>
              Tap <strong>Open the editor</strong>, paste the code into &quot;I have code&quot;, and
              preview or export free!
            </li>
          </ol>
        </div>

        {/* Transcript Section */}
        <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-bold text-sm text-white">Transcript</div>
              <div className="text-[11px] text-amber-300 mt-0.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 shrink-0"/>
                For a better experience, upload 30-second chunks or an .srt file for voice sync.
              </div>
            </div>
            <button
              onClick={() => {
                setTranscriptTab("embed");
                setScreen("get_transcript");
              }}
              className="text-xs text-cyan-300 font-semibold hover:underline"
            >
              Need transcript? Open Transcriber →
            </button>
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
                onChange={handleTranscriptUpload}
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
                  <Icon "text-amber-400" "text-slate-400"}`} ${active : ? className="{`w-5" h-5/>
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

        {/* Edit Style Selector (All 5 Styles) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
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
                themeId
              );
              setGeneratedPrompt(promptText);
              setShowPromptBox(false);
              navigator.clipboard?.writeText(promptText).then(() => {
                setCopiedPrompt(true);
                setTimeout(() => setCopiedPrompt(false), 2500);
              });
              notify("Handoff prompt ready & copied!", "success");
            }}
            className="w-full py-3.5 rounded-2xl bg-slate-100 hover:bg-white text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl transition"
          >
            <Wand2 className="w-4 h-4"/>
            Get Prompt
          </button>

          <button
            type="button"
            onClick={() => {
              if (!transcriptInput.trim()) {
                notify("Please paste or upload a transcript first.", "error");
                return;
              }
              const autoCode = buildRecipeFromTranscript(transcriptInput, themeId, editStyleId);
              const newId = `motion_${Date.now()}`;
              const title =
                transcriptInput
                  .replace(/\d+:\d+[^\n]*/g, "")
                  .trim()
                  .split(/\s+/)
                  .slice(0, 5)
                  .join(" ") || "Auto Motion Edit";
              setProjectId(newId);
              setProjectTitle(title);
              setRecipeDraft(autoCode);
              setAppliedRecipe(autoCode);
              setCurrentTime(0);
              currentTimeRef.current = 0;
              setWorkspaceTab("timeline");
              setScreen("workspace");
              setIsPlaying(true);
              saveProjectToRecents({
                id: newId,
                title,
                formatId,
                fps,
                themeId,
                code: autoCode,
              });
              notify("Motion edit auto-built from your transcript!", "success");
            }}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4"/>
            Or Auto-Build Motion Edit Instantly (Skip External AI)
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
                <code className="text-emerald-200">[RECIPE]</code> blocks. Copy those, then tap{" "}
                <strong>Open the editor</strong> below and paste them in.
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

            <p className="text-[11px] text-slate-400 text-center">
              Save and attach the .txt in Claude / ChatGPT — or copy &amp; open directly below:
            </p>

            {/* Quick Copy + Direct AI Launch Links */}
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
                {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400"/> : <Copy className="w-3.5 h-3.5"/>}
                {copiedPrompt ? "Copied" : "Copy Text"}
              </button>
              <a
                href="[https://claude.ai/new](https://claude.ai/new)"
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-200 text-xs font-bold flex items-center justify-center gap-1"
              >
                Claude <ExternalLink className="w-3 h-3"/>
              </a>
              <a
                href="[https://chatgpt.com/](https://chatgpt.com/)"
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-200 text-xs font-bold flex items-center justify-center gap-1"
              >
                ChatGPT <ExternalLink className="w-3 h-3"/>
              </a>
              <a
                href="[https://gemini.google.com/app](https://gemini.google.com/app)"
                target="_blank"
                rel="noreferrer"
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
              {showPromptBox ? "Hide prompt" : `Show prompt (${generatedPrompt.length.toLocaleString()} characters)`}
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
  // RENDER 4: WORKSPACE ("I have code" + Live Canvas + Timeline + Assets)
  // =========================================================================
  return (
    <div className="space-y-4">
      {audioAsset && <audio ref={audioElRef} src={audioAsset.url} preload="auto" />}

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
            disabled={history.length === 0}
            onClick={handleUndo}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30"
            title="Undo"
          >
            <RotateCcw className="w-4 h-4"/>
          </button>
          <button
            disabled={future.length === 0}
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
          <select
            value={`${formatId}_${fps}`}
            onChange={(e) => {
              const [fId, fRate] = e.target.value.split("_");
              setFormatId(fId);
              setFps(Number(fRate));
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs font-bold"
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
                <Loader2 className="w-3.5 h-3.5 animate-spin"/> Exporting {exportPercent}%
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5"/> Export
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
          </div>

          {/* Transport / Scrubber */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentTime(0);
                  currentTimeRef.current = 0;
                }}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300"
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
                min={0}
                max={parsedRecipe.totalDuration}
                step={0.05}
                value={Math.min(currentTime, parsedRecipe.totalDuration)}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCurrentTime(val);
                  currentTimeRef.current = val;
                  if (audioElRef.current && audioAsset) {
                    audioElRef.current.currentTime = val;
                  }
                }}
                className="flex-1 accent-amber-500"
              />

              <span className="text-xs font-mono text-slate-400 w-14 text-right">
                {formatClock(parsedRecipe.totalDuration)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>
                {parsedRecipe.cues.length} cues · {fps}fps · Theme:{" "}
                <strong className="text-slate-200">{THEMES[parsedRecipe.theme]?.label}</strong>
              </span>
              {audioAsset && (
                <span className="text-emerald-300 flex items-center gap-1">
                  <Music className="w-3 h-3"/> {audioAsset.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Timeline / Code / Assets Panel */}
        <div className="lg:col-span-6 p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4">
          <div className="grid grid-cols-3 p-1 rounded-xl bg-black/50 border border-white/10 text-xs font-bold">
            {[
              { id: "timeline", label: "Timeline", icon: Layers },
              { id: "code", label: "Code", icon: Code2 },
              { id: "assets", label: "Assets", icon: ImageIcon },
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
                  Paste the <code className="text-slate-200">[ASSETS] + [RECIPE]</code> reply from
                  Claude / ChatGPT
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
                placeholder={`v1\ntheme=dark\n00:00.00 --> 00:03.00 text "Hello"\nin=fadeUp`}
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
              <div className="flex items-center justify-between gap-2">
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

                <button
                  onClick={handleAddTimelineCue}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5"/> Add Scene
                </button>
              </div>

              {parsedRecipe.cues.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-black/30 border border-white/10 text-xs text-slate-400 space-y-2">
                  <div>No scenes on the timeline yet.</div>
                  <button
                    onClick={handleAddTimelineCue}
                    className="px-4 py-2 rounded-lg bg-amber-500 text-black font-bold"
                  >
                    + Add First Scene
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {parsedRecipe.cues.map((cue, idx) => {
                    const isActive = currentTime >= cue.start && currentTime <= cue.end;
                    return (
                      <div
                        key={cue.id}
                        onClick={() => {
                          setCurrentTime(cue.start + 0.05);
                          currentTimeRef.current = cue.start + 0.05;
                        }}
                        className={`p-3 rounded-xl border space-y-2 transition ${
                          isActive
                            ? "bg-amber-500/10 border-amber-400/50"
                            : "bg-black/40 border-white/10 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
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
                              <option value="text">Text</option>
                              <option value="stat">Stat</option>
                              <option value="card">Card</option>
                              <option value="badge">Badge</option>
                              <option value="image">Image</option>
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
                          placeholder="Headline or image asset name..."
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
                          placeholder="Optional subtitle..."
                          className="w-full px-2.5 py-1 rounded-lg bg-black/40 border border-white/5 text-[11px] text-slate-300"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ASSETS */}
          {workspaceTab === "assets" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-black/35 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Music className="w-4 h-4 text-emerald-400"/> Voiceover / Background Audio
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
                  Plays in sync during preview and automatically mixes into your exported video.
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
                      notify(`Voiceover "${f.name}" synced!`, "success");
                    }}
                  />
                </label>
              </div>

              <div className="p-4 rounded-xl bg-black/35 border border-white/10 space-y-3">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-cyan-400"/> Image &amp; Logo Assets
                </div>
                <p className="text-[11px] text-slate-400">
                  Upload images and reference them in recipes using{" "}
                  <code className="text-cyan-300">image &quot;asset_name&quot;</code>.
                </p>

                <label className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-dashed border-cyan-400/40 text-xs font-semibold text-cyan-200 flex items-center justify-center gap-2 cursor-pointer">
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
                        name: f.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9_-]/g, "_"),
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
                          <span className="text-[11px] font-mono text-cyan-300 truncate">
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
