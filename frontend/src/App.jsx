import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Crown,
  Download,
  Eye,
  EyeOff,
  FileText,
  Film,
  FolderOpen,
  Hash,
  Home,
  Key,
  Link2,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Menu,
  Plus,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Save,
  Scissors,
  Search,
  Server,
  Settings,
  Shield,
  Sliders,
  Sparkles,
  Subtitles,
  Trash2,
  Upload,
  User,
  Users,
  Video,
  X,
  Youtube,
  Zap,
} from "lucide-react";

const DEFAULT_BACKEND_URL = "https://clipforge-ai-production-b45ab787.up.railway.app";
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || "").trim().toLowerCase();
const SUPPORT_EMAIL = (import.meta.env.VITE_SUPPORT_EMAIL || ADMIN_EMAIL || "support@clipforge.ai").trim();

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const DEFAULT_PLANS = [
  {
    id: "free",
    name: "Free",
    price_inr: 0,
    price_usd: 0,
    video_limit: 5,
    duration_days: 30,
    features: [
      "5 video credits / month",
      "Standard FFmpeg MP4 exports",
      "SRT subtitle export",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price_inr: 299,
    price_usd: 5,
    video_limit: 40,
    duration_days: 30,
    features: [
      "40 video credits / month",
      "All 6 animated ASS caption styles",
      "Batch ZIP downloads & HD 1080p",
      "Priority processing queue",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price_inr: 799,
    price_usd: 12,
    video_limit: 120,
    duration_days: 30,
    features: [
      "120 video credits / month",
      "Fastest priority workers",
      "Gemini + Whisper semantic highlights",
      "All Pro features + Early access",
    ],
  },
];

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
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return normalizeBaseUrl(envUrl);
  return DEFAULT_BACKEND_URL;
}

function getPlanDaysLeft(validUntil) {
  if (!validUntil) return 0;
  const diffMs = new Date(validUntil).getTime() - Date.now();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function formatDateShort(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth & Subscription State
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [authMode, setAuthMode] = useState("login"); // login | signup | forgot
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState(null); // { type: 'confirm' | 'reset', email: string }
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Password Recovery (Set New Password) State
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");

  const [userPlan, setUserPlan] = useState(null);
  const [plansConfig, setPlansConfig] = useState(DEFAULT_PLANS);
  const [payingPlanId, setPayingPlanId] = useState(null);

  // Admin Panel State
  const [adminSubTab, setAdminSubTab] = useState("pricing"); // pricing | users | monitor | settings
  const [adminPlanDrafts, setAdminPlanDrafts] = useState(DEFAULT_PLANS);
  const [savingPlans, setSavingPlans] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [loadingAdminUsers, setLoadingAdminUsers] = useState(false);
  const [adminUserSearch, setAdminUserSearch] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState(null);

  // Policy Modal State (Privacy, Terms, Refund, Contact)
  const [policyModal, setPolicyModal] = useState(null);

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
    max_upload_mb: 150,
    active_jobs: 0,
    max_active_jobs: 6,
    rate_limit: "5 uploads / 15 min",
  });

  // Real Backend Projects
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  // Create New Clips Form
  const [importMode, setImportMode] = useState("upload");
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
  const [editingContext, setEditingContext] = useState(null);
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
  const toastTimerRef = useRef(null);

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4500);
  };

  const user = session?.user || null;
  const isAdmin = useMemo(() => {
    if (!user?.email || !ADMIN_EMAIL) return false;
    return user.email.toLowerCase() === ADMIN_EMAIL;
  }, [user]);

  const effectivePlan = useMemo(() => {
    if (!userPlan) {
      return { planId: "free", daysLeft: 0, isPaid: false, validUntil: null, videosUsed: 0 };
    }
    const daysLeft = getPlanDaysLeft(userPlan.valid_until);
    const isPaid =
      userPlan.plan_id !== "free" && userPlan.status === "active" && daysLeft > 0;
    return {
      planId: isPaid ? userPlan.plan_id : "free",
      daysLeft: isPaid ? daysLeft : 0,
      isPaid,
      validUntil: isPaid ? userPlan.valid_until : null,
      videosUsed: Number(userPlan.videos_used) || 0,
    };
  }, [userPlan]);

  // Live Credits Calculation (synced with Supabase plan_config & user_plans)
  const activePlanConfig = useMemo(() => {
    return (
      plansConfig.find((p) => p.id === effectivePlan.planId) ||
      DEFAULT_PLANS.find((p) => p.id === effectivePlan.planId) ||
      DEFAULT_PLANS[0]
    );
  }, [plansConfig, effectivePlan.planId]);

  const creditsInfo = useMemo(() => {
    const total = Math.max(1, Number(activePlanConfig?.video_limit) || 5);
    const used = Math.max(0, Number(effectivePlan.videosUsed) || 0);
    const remaining = Math.max(0, total - used);
    const usedPercent = Math.min(100, Math.round((used / total) * 100));
    const remainingPercent = Math.max(0, 100 - usedPercent);
    const isLow = remaining > 0 && remaining <= Math.max(1, Math.ceil(total * 0.2));
    const isExhausted = remaining === 0;
    return { total, used, remaining, usedPercent, remainingPercent, isLow, isExhausted };
  }, [activePlanConfig, effectivePlan.videosUsed]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Load live plans from Supabase
  const fetchPlansConfig = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("plan_config")
        .select("*")
        .order("price_inr", { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        const order = { free: 0, pro: 1, premium: 2 };
        const sorted = [...data].sort(
          (a, b) => (order[a.id] ?? 99) - (order[b.id] ?? 99)
        );
        setPlansConfig(sorted);
        setAdminPlanDrafts(sorted.map((p) => ({ ...p })));
      }
    } catch {}
  };

  const fetchUserPlan = async (userId) => {
    if (!supabase || !userId) {
      setUserPlan(null);
      return;
    }
    try {
      const { data } = await supabase
        .from("user_plans")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      setUserPlan(data || { user_id: userId, plan_id: "free", status: "active", videos_used: 0 });
    } catch {
      setUserPlan({ user_id: userId, plan_id: "free", status: "active", videos_used: 0 });
    }
  };

  const fetchAdminUsers = async () => {
    if (!supabase || !isAdmin) return;
    setLoadingAdminUsers(true);
    try {
      const { data, error } = await supabase
        .from("user_plans")
        .select("*")
        .order("updated_at", { ascending: false });
      if (!error && Array.isArray(data)) {
        setAdminUsers(data);
      }
    } catch {} finally {
      setLoadingAdminUsers(false);
    }
  };

  useEffect(() => {
    fetchPlansConfig();

    // Detect recovery link from URL hash if user came from Forgot Password email
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      setRecoveryModalOpen(true);
    }

    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      if (data.session?.user?.id) fetchUserPlan(data.session.user.id);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession || null);
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryModalOpen(true);
      }
      if (nextSession?.user?.id) {
        fetchUserPlan(nextSession.user.id);
      } else {
        setUserPlan(null);
      }
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  // Redirect away from admin tab if non-admin
  useEffect(() => {
    if (activeTab === "admin_panel" && !isAdmin) {
      setActiveTab("dashboard");
    }
    if (activeTab === "admin_panel" && isAdmin) {
      fetchAdminUsers();
    }
  }, [activeTab, isAdmin]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthNotice(null);

    if (!supabase) {
      setAuthError("Supabase keys configured nahi hain. Admin se contact karein.");
      return;
    }

    const cleanEmail = authEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setAuthError("Kripya ek valid email address daalein.");
      return;
    }

    // Forgot Password Mode
    if (authMode === "forgot") {
      setAuthSubmitting(true);
      try {
        const redirectTo =
          typeof window !== "undefined" ? window.location.origin : undefined;
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo,
        });
        if (error) throw error;
        setAuthNotice({ type: "reset", email: cleanEmail });
        showToast("Password reset link aapke Gmail par bhej diya gaya hai!", "success");
      } catch (err) {
        const raw = (err?.message || "").toLowerCase();
        if (raw.includes("rate limit")) {
          setAuthError("Bahut zyada requests ho gayi hain. Kripya 1-2 minute baad dobara try karein.");
        } else {
          setAuthError(err.message || "Reset link bhejne me dikkat aayi.");
        }
      } finally {
        setAuthSubmitting(false);
      }
      return;
    }

    if (authPassword.length < 6) {
      setAuthError("Password kam se kam 6 characters ka hona chahiye.");
      return;
    }

    setAuthSubmitting(true);
    try {
      if (authMode === "signup") {
        const emailRedirectTo =
          typeof window !== "undefined" ? window.location.origin : undefined;
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: authPassword,
          options: { emailRedirectTo },
        });
        if (error) throw error;
        if (data.session) {
          showToast("Account ban gaya! ClipForge AI me aapka swagat hai.", "success");
          setAuthPassword("");
        } else {
          setAuthNotice({ type: "confirm", email: cleanEmail });
          setAuthMode("login");
          setAuthPassword("");
          showToast("Confirmation email bhej diya gaya hai! Apna Gmail check karein.", "info");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: authPassword,
        });
        if (error) throw error;
        showToast("Login successful! Welcome to ClipForge AI.", "success");
        setAuthPassword("");
        setAuthNotice(null);
      }
    } catch (err) {
      const raw = (err?.message || "").toLowerCase();
      if (raw.includes("email not confirmed") || raw.includes("confirm")) {
        setAuthNotice({ type: "confirm", email: cleanEmail });
        setAuthError("");
      } else if (raw.includes("invalid login credentials")) {
        setAuthError(
          "Email ya password galat hai. Dobara check karein ya neeche 'Password bhool gaye?' par click karke naya password banayein."
        );
      } else if (raw.includes("already registered")) {
        setAuthError(
          "Is email se account pehle se bana hua hai. Kripya Login karein ya 'Password bhool gaye?' se reset karein."
        );
      } else if (raw.includes("502") || raw.includes("fetch") || raw.includes("network")) {
        setAuthError("Server abhi connect nahi ho paa raha. Kripya kuch seconds baad dobara try karein.");
      } else if (raw.includes("rate limit")) {
        setAuthError("Email limit temporary full hai. Kripya thodi der baad dobara koshish karein.");
      } else {
        setAuthError(err.message || "Authentication fail ho gaya. Dobara koshish karein.");
      }
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!supabase || resendCooldown > 0) return;
    const targetEmail = (authNotice?.email || authEmail || "").trim().toLowerCase();
    if (!targetEmail) {
      setAuthError("Pehle upar apna email address likhein.");
      return;
    }
    setResendingEmail(true);
    try {
      const emailRedirectTo =
        typeof window !== "undefined" ? window.location.origin : undefined;
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: targetEmail,
        options: { emailRedirectTo },
      });
      if (error) throw error;
      setResendCooldown(30);
      showToast(`Naya confirmation email ${targetEmail} par bhej diya gaya hai!`, "success");
    } catch (err) {
      showToast(err.message || "Email resend nahi ho paya. Thodi der baad try karein.", "error");
    } finally {
      setResendingEmail(false);
    }
  };

  const handleUpdateRecoveredPassword = async (e) => {
    e.preventDefault();
    setRecoveryError("");
    if (newPassword.length < 6) {
      setRecoveryError("Naya password kam se kam 6 characters ka hona chahiye.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setRecoveryError("Dono password match nahi kar rahe. Dobara check karein.");
      return;
    }
    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setRecoveryModalOpen(false);
      setNewPassword("");
      setConfirmNewPassword("");
      if (typeof window !== "undefined" && window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname);
      }
      showToast("Password successfully update ho gaya! Ab aap logged in hain.", "success");
    } catch (err) {
      setRecoveryError(err.message || "Password update fail ho gaya. Naya reset link mangwayein.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    setUserPlan(null);
    setActiveTab("dashboard");
    setAuthMode("login");
    setAuthError("");
    setAuthNotice(null);
    showToast("Aap logout ho gaye hain.", "info");
  };

  // Razorpay Checkout Flow
  const handleStartPayment = async (plan) => {
    if (plan.id === "free" || Number(plan.price_inr) <= 0) {
      showToast("Aapka Free plan active hai!", "info");
      return;
    }

    if (!user || !session?.access_token) {
      showToast("Plan active karne ke liye pehle Login karein.", "info");
      return;
    }

    setPayingPlanId(plan.id);
    try {
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) throw new Error("Razorpay checkout load nahi ho paya. Internet check karein.");

      const clean = normalizeBaseUrl(apiBaseUrl);
      const orderResp = await fetch(`${clean}/api/payments/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan_id: plan.id }),
      });
      const orderData = await orderResp.json();
      if (!orderResp.ok) {
        throw new Error(
          orderData.detail || "Backend payment endpoint abhi setup nahi hua hai."
        );
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "ClipForge AI",
        description: `${plan.name} Plan (${plan.duration_days || 30} Days · ${plan.video_limit} Credits)`,
        order_id: orderData.order_id,
        prefill: {
          email: user.email,
        },
        theme: { color: "#7c3aed" },
        handler: async (response) => {
          try {
            const verifyResp = await fetch(`${clean}/api/payments/verify`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                plan_id: plan.id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyResp.json();
            if (!verifyResp.ok) throw new Error(verifyData.detail || "Payment verification failed");
            await fetchUserPlan(user.id);
            showToast(
              `Payment successful! ${plan.name} plan (${plan.video_limit} credits) ${plan.duration_days || 30} din ke liye active ho gaya.`,
              "success"
            );
          } catch (verifyErr) {
            showToast(verifyErr.message || "Verification error. Support se contact karein.", "error");
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      showToast(err.message || "Payment start nahi ho paya.", "error");
    } finally {
      setPayingPlanId(null);
    }
  };

  // Admin: Save updated pricing to Supabase
  const handleSaveAdminPlans = async () => {
    if (!supabase || !isAdmin) return;
    setSavingPlans(true);
    try {
      for (const draft of adminPlanDrafts) {
        const { error } = await supabase
          .from("plan_config")
          .upsert({
            id: draft.id,
            name: draft.name,
            price_inr: Math.max(0, Number(draft.price_inr) || 0),
            price_usd: Math.max(0, Number(draft.price_usd) || 0),
            video_limit: Math.max(1, Number(draft.video_limit) || 5),
            duration_days: Math.max(1, Number(draft.duration_days) || 30),
            features: Array.isArray(draft.features) ? draft.features : [],
            updated_at: new Date().toISOString(),
          });
        if (error) throw error;
      }
      await fetchPlansConfig();
      showToast("All plan prices & credit limits updated live!", "success");
    } catch (err) {
      showToast(err.message || "Failed to save plan prices.", "error");
    } finally {
      setSavingPlans(false);
    }
  };

  // Admin: Manually Activate / Extend / Reset User Plan
  const handleAdminUpdateUserPlan = async (targetUser, nextPlanId, addDays = 30) => {
    if (!supabase || !isAdmin) return;
    setUpdatingUserId(targetUser.user_id);
    try {
      let validUntil = null;
      if (nextPlanId !== "free") {
        const currentEnd =
          targetUser.valid_until && new Date(targetUser.valid_until).getTime() > Date.now()
            ? new Date(targetUser.valid_until).getTime()
            : Date.now();
        validUntil = new Date(currentEnd + addDays * 24 * 60 * 60 * 1000).toISOString();
      }
      const { error } = await supabase
        .from("user_plans")
        .update({
          plan_id: nextPlanId,
          status: "active",
          valid_until: validUntil,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", targetUser.user_id);
      if (error) throw error;
      await fetchAdminUsers();
      if (user?.id === targetUser.user_id) await fetchUserPlan(user.id);
      showToast(
        nextPlanId === "free"
          ? `${targetUser.email} reset to Free plan.`
          : `${targetUser.email} upgraded to ${nextPlanId.toUpperCase()} (+${addDays} days).`,
        "success"
      );
    } catch (err) {
      showToast(err.message || "Could not update user plan.", "error");
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Admin: Reset a user's used credits to 0
  const handleAdminResetCredits = async (targetUser) => {
    if (!supabase || !isAdmin) return;
    setUpdatingUserId(targetUser.user_id);
    try {
      const { error } = await supabase
        .from("user_plans")
        .update({
          videos_used: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", targetUser.user_id);
      if (error) throw error;
      await fetchAdminUsers();
      if (user?.id === targetUser.user_id) await fetchUserPlan(user.id);
      showToast(`${targetUser.email} ke credits refill (0 used) ho gaye.`, "success");
    } catch (err) {
      showToast(err.message || "Could not reset credits.", "error");
    } finally {
      setUpdatingUserId(null);
    }
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
        max_upload_mb: data.max_upload_mb || 150,
        active_jobs: data.active_jobs ?? 0,
        max_active_jobs: data.max_active_jobs ?? 6,
        rate_limit: data.rate_limit || "5 uploads / 15 min",
      });
      return true;
    } catch (err) {
      setHealth({
        checking: false,
        online: false,
        ffmpeg_available: false,
        ffmpeg_version: null,
        ffmpeg_error: `Cannot reach backend (${err.message}).`,
        storage_writable: false,
        ai_configured: false,
        max_upload_mb: 150,
        active_jobs: 0,
        max_active_jobs: 6,
        rate_limit: "5 uploads / 15 min",
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
    } catch {} finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    checkBackendHealth(apiBaseUrl).then((ok) => {
      if (ok) fetchProjects(apiBaseUrl);
    });
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [apiBaseUrl, user?.id]);

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
        if (user?.id) fetchUserPlan(user.id);
        showToast(
          `Done! ${data.verified_clip_count || data.clips?.length || 0} real MP4 clips ready.`,
          "success"
        );
      } else if (data.status === "failed") {
        stopTracking();
        showToast(
          `Failed at ${data.failed_stage || "processing"}: ${data.error_message || "Error"}`,
          "error"
        );
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
      const resp = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`
      );
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
    if (creditsInfo.isExhausted && !isAdmin) {
      setSubmitError(
        "Aapke is mahine ke saare credits khatam ho gaye hain. Aur videos process karne ke liye Plans & Pricing se upgrade karein."
      );
      return;
    }
    if (!health.online || !health.ffmpeg_available) {
      setSubmitError("Video processing server is currently busy or offline. Please retry in a moment.");
      return;
    }
    if (!copyrightConfirmed) {
      setSubmitError("Please confirm that you own or have permission to process this video.");
      return;
    }

    const clean = normalizeBaseUrl(apiBaseUrl);
    const authHeaders = session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {};

    if (importMode === "url") {
      if (!externalUrl.startsWith("http://") && !externalUrl.startsWith("https://")) {
        setSubmitError("Enter a valid direct http(s) video URL.");
        return;
      }
      setSubmitting(true);
      try {
        const resp = await fetch(`${clean}/api/projects/import-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
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
        if (user?.id) fetchUserPlan(user.id);
        showToast("Authorized URL imported. Video processing started!", "success");
      } catch (err) {
        setSubmitError(err.message || "URL import failed.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!selectedFile) {
      setSubmitError("Please select a video file (.mp4, .mov, .webm, .mkv) to upload.");
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
        if (session?.access_token) {
          xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
        }
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
        xhr.onerror = () => reject(new Error("Network error while uploading video."));
        xhr.send(formData);
      });

      setActiveJobProject(data);
      setSelectedProjectId(data.id);
      startTrackingProject(data.id);
      if (user?.id) fetchUserPlan(user.id);
      showToast("Video uploaded! AI clipping pipeline is running.", "success");
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
      const resp = await fetch(`${clean}/api/projects/${projectId}/clips/${clipId}`, {
        method: "DELETE",
      });
      if (!resp.ok) throw new Error("Delete failed");
      await fetchProjects(clean);
      showToast("Clip deleted.", "info");
    } catch (err) {
      showToast(err.message || "Could not delete clip.", "error");
    }
  };

  const openClipInEditor = (project, clip) => {
    setEditingContext({
      projectId: project.id,
      sourceDuration: project.source_duration || clip.end_sec + 10,
      clipId: clip.id,
    });
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
      setEditorMessage("Re-rendered real MP4 and updated preview!");
      showToast("Clip re-rendered successfully!", "success");
    } catch (err) {
      setEditorMessage(`Re-render failed: ${err.message}`);
      showToast(err.message || "Re-render failed", "error");
    } finally {
      setRerendering(false);
    }
  };

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
      "Select any generated clip in Generated Clips and click 'Edit' to trim timestamps, switch 9:16/16:9/1:1, or burn Hindi/Hinglish subtitles directly.";
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

  const navItems = useMemo(() => {
    const base = [
      { id: "dashboard", label: "Home Dashboard", icon: Home },
      { id: "create", label: "Create New Clips", icon: Scissors },
      { id: "clips", label: "Generated Clips", icon: Film },
      { id: "editor", label: "Video Editor", icon: Sliders },
      { id: "captions", label: "Caption & Hashtags", icon: Hash },
      { id: "assistant", label: "AI Assistant", icon: Bot },
      { id: "plans", label: "Plans & Pricing", icon: CreditCard },
    ];
    if (isAdmin) {
      base.push({ id: "admin_panel", label: "Admin Control", icon: Shield });
    }
    return base;
  }, [isAdmin]);

  const filteredAdminUsers = useMemo(() => {
    const q = adminUserSearch.trim().toLowerCase();
    if (!q) return adminUsers;
    return adminUsers.filter(
      (u) =>
        (u.email || "").toLowerCase().includes(q) ||
        (u.plan_id || "").toLowerCase().includes(q)
    );
  }, [adminUsers, adminUserSearch]);

  const adminStats = useMemo(() => {
    const paidUsers = adminUsers.filter(
      (u) => u.plan_id !== "free" && u.status === "active" && getPlanDaysLeft(u.valid_until) > 0
    );
    return {
      total: adminUsers.length,
      paid: paidUsers.length,
      pro: paidUsers.filter((u) => u.plan_id === "pro").length,
      premium: paidUsers.filter((u) => u.plan_id === "premium").length,
    };
  }, [adminUsers]);

  const getPlanLimitById = (planId) => {
    const found =
      plansConfig.find((p) => p.id === planId) ||
      DEFAULT_PLANS.find((p) => p.id === planId) ||
      DEFAULT_PLANS[0];
    return Number(found?.video_limit) || 5;
  };

  return (
    <>
      {/* ================= 1. INITIAL AUTH LOADING SCREEN ================= */}
      {authLoading ? (
        <div className="min-h-screen bg-[#07070f] text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
          <div className="absolute -top-28 -left-24 w-96 h-96 bg-violet-600/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/15 blur-[120px] rounded-full" />
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-2xl shadow-violet-500/30 animate-pulse">
              <Scissors className="w-7 h-7 text-white" />
            </div>
            <div className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
              ClipForge AI
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              Loading your studio...
            </div>
          </div>
        </div>
      ) : !user ? (
        /* ================= 2. MANDATORY LOGIN / SIGN UP GATE ================= */
        <div className="min-h-screen bg-[#07070f] text-slate-100 flex flex-col justify-between relative overflow-hidden">
          {/* Ambient Glows */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] bg-violet-600/20 blur-[130px] rounded-full" />
            <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] bg-cyan-500/15 blur-[130px] rounded-full" />
          </div>

          {/* Top Bar */}
          <header className="relative z-10 max-w-6xl w-full mx-auto px-5 py-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Scissors className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
                  ClipForge AI
                </div>
                <div className="text-[11px] text-slate-400">AI Video Clipping Studio</div>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5" /> Free Credits Included
            </div>
          </header>

          {/* Center Split Hero + Auth Card */}
          <main className="relative z-10 max-w-6xl w-full mx-auto px-5 py-6 lg:py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left: Product Pitch */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/15 border border-violet-400/30 text-violet-200 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                AI Highlight Detection + Viral Hindi/Hinglish Captions
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                Turn Long Videos into{" "}
                <span className="bg-gradient-to-r from-violet-400 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
                  Viral Short MP4 Clips
                </span>{" "}
                in Minutes
              </h1>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                Apne long YouTube videos, podcasts ya gaming streams ko upload karein — ClipForge AI
                automatically best moments cut karke 9:16 Reels/Shorts aur animated captions ke saath
                ready kar deta hai.
              </p>

              {/* Feature Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                {[
                  {
                    icon: Scissors,
                    title: "Smart AI Cuts",
                    desc: "Best viral hooks & moments automatically detect hote hain.",
                    color: "text-violet-400",
                  },
                  {
                    icon: Subtitles,
                    title: "Hindi & Hinglish",
                    desc: "6 animated caption styles directly MP4 me burn hote hain.",
                    color: "text-cyan-400",
                  },
                  {
                    icon: Zap,
                    title: "5 Free Credits",
                    desc: "Account banate hi free plan start — kabhi bhi UPI se upgrade.",
                    color: "text-amber-400",
                  },
                ].map((f) => {
                  const Icon = f.icon;
                  return (
                    <div
                      key={f.title}
                      className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md space-y-1.5"
                    >
                      <Icon className={`w-5 h-5 ${f.color}`} />
                      <div className="font-bold text-sm text-white">{f.title}</div>
                      <div className="text-xs text-slate-400 leading-relaxed">{f.desc}</div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" /> Login required to protect your clips & credits
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Instant UPI / Razorpay activation
                </span>
              </div>
            </div>

            {/* Right: Auth Card */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl bg-[#0e0e1f]/95 border border-white/15 p-6 sm:p-7 shadow-2xl shadow-violet-950/40 backdrop-blur-xl space-y-5">
                {/* Mode Switcher Tabs (Login / Sign Up) */}
                {authMode !== "forgot" ? (
                  <div className="grid grid-cols-2 p-1 rounded-xl bg-black/40 border border-white/10 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setAuthError("");
                      }}
                      className={`py-2.5 rounded-lg transition ${
                        authMode === "login"
                          ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Login
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("signup");
                        setAuthError("");
                        setAuthNotice(null);
                      }}
                      className={`py-2.5 rounded-lg transition ${
                        authMode === "signup"
                          ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Create Free Account
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                      <Key className="w-4 h-4" /> Password Reset Karein
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setAuthError("");
                        setAuthNotice(null);
                      }}
                      className="text-xs text-slate-400 hover:text-white underline"
                    >
                      Back to Login
                    </button>
                  </div>
                )}

                <div>
                  <h2 className="text-xl font-extrabold text-white">
                    {authMode === "login"
                      ? "Studio Me Login Karein"
                      : authMode === "signup"
                      ? "Apna Free Account Banayein"
                      : "Password Bhool Gaye?"}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {authMode === "login"
                      ? "Website use karne, credits track karne aur plans manage karne ke liye login zaroori hai."
                      : authMode === "signup"
                      ? "Sign up karte hi Free Plan (5 credits) milega. Baad me kabhi bhi upgrade kar sakte hain."
                      : "Apna registered email daalein — hum aapko password reset karne ka link bhejenge."}
                  </p>
                </div>

                {/* Clear Email Confirmation / Reset Guide Box */}
                {authNotice?.type === "confirm" && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/40 space-y-2.5 text-xs">
                    <div className="flex items-center gap-2 font-bold text-amber-200">
                      <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                      Email Confirm Karna Baaki Hai!
                    </div>
                    <div className="text-amber-100/90 space-y-1.5 leading-relaxed">
                      <p>
                        <strong>Step 1:</strong> Apna Gmail inbox (ya <strong>Spam</strong> folder) kholein{" "}
                        {authNotice.email && (
                          <span className="text-cyan-300 font-semibold">({authNotice.email})</span>
                        )}.
                      </p>
                      <p>
                        <strong>Step 2:</strong> Aaye hue email me{" "}
                        <strong className="text-white">"Confirm email address"</strong> link par click karein.
                      </p>
                      <p>
                        <strong>Step 3:</strong> Confirm hote hi yahan wapas aakar apna{" "}
                        <strong className="text-white">wahi email aur password</strong> daal kar{" "}
                        <strong>Login</strong> karein.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={resendingEmail || resendCooldown > 0}
                      onClick={handleResendConfirmation}
                      className="w-full py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-100 font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {resendingEmail ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      {resendCooldown > 0
                        ? `Dobara bhejne ke liye ${resendCooldown}s rukein`
                        : "Email nahi aaya? Confirmation Email Resend Karein"}
                    </button>
                  </div>
                )}

                {authNotice?.type === "reset" && (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-400/40 space-y-2 text-xs text-emerald-100">
                    <div className="flex items-center gap-2 font-bold text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      Password Reset Link Bhej Diya Gaya Hai!
                    </div>
                    <p className="leading-relaxed text-emerald-100/90">
                      Apna Gmail inbox (ya Spam folder) check karein{" "}
                      <strong>({authNotice.email})</strong> aur link par click karein — seedha naya
                      password set karne ka option khul jayega.
                    </p>
                  </div>
                )}

                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="you@gmail.com"
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-400"
                    />
                  </div>

                  {authMode !== "forgot" && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-slate-300">Password</label>
                        {authMode === "login" && (
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode("forgot");
                              setAuthError("");
                              setAuthNotice(null);
                            }}
                            className="text-[11px] font-semibold text-cyan-300 hover:underline"
                          >
                            Password bhool gaye?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          minLength={6}
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          placeholder="Minimum 6 characters"
                          className="w-full pl-4 pr-11 py-3 rounded-xl bg-black/50 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                          title={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {authError && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-200 leading-relaxed flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 font-bold text-sm text-white shadow-lg shadow-violet-600/25 hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2 transition"
                  >
                    {authSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : authMode === "forgot" ? (
                      <Mail className="w-4 h-4" />
                    ) : (
                      <LogIn className="w-4 h-4" />
                    )}
                    {authMode === "login"
                      ? "Login & Open Studio"
                      : authMode === "signup"
                      ? "Create Free Account"
                      : "Send Password Reset Link"}
                  </button>
                </form>

                <div className="text-center text-xs text-slate-400 pt-1">
                  {authMode === "login" ? (
                    <>
                      Naye user hain?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("signup");
                          setAuthError("");
                          setAuthNotice(null);
                        }}
                        className="text-cyan-300 font-semibold hover:underline"
                      >
                        Free Account Banayein
                      </button>
                    </>
                  ) : (
                    <>
                      Pehle se account hai?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("login");
                          setAuthError("");
                          setAuthNotice(null);
                        }}
                        className="text-cyan-300 font-semibold hover:underline"
                      >
                        Login Karein
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </main>

          {/* Footer with Razorpay Compliance Links (Always Accessible) */}
          <footer className="relative z-10 border-t border-white/10 px-5 py-5 text-xs text-slate-400">
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>© {new Date().getFullYear()} ClipForge AI · Jaipur, Rajasthan, India</div>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button onClick={() => setPolicyModal("privacy")} className="hover:text-white">
                  Privacy Policy
                </button>
                <button onClick={() => setPolicyModal("terms")} className="hover:text-white">
                  Terms & Conditions
                </button>
                <button onClick={() => setPolicyModal("refund")} className="hover:text-white">
                  Cancellation & Refund Policy
                </button>
                <button onClick={() => setPolicyModal("contact")} className="hover:text-white">
                  Contact Us
                </button>
              </div>
            </div>
          </footer>
        </div>
      ) : (
        /* ================= 3. FULL AUTHENTICATED STUDIO APP ================= */
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
                  <div className="text-[11px] text-slate-400">AI Video Clipping Studio</div>
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
                const isAdminItem = item.id === "admin_panel";
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                      active
                        ? isAdminItem
                          ? "bg-amber-500/20 text-amber-200 border border-amber-400/40"
                          : "bg-gradient-to-r from-violet-600/30 to-cyan-500/20 text-white border border-violet-500/40"
                        : isAdminItem
                        ? "text-amber-300/80 hover:text-amber-200 hover:bg-amber-500/10"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isAdminItem
                          ? "text-amber-400"
                          : active
                          ? "text-cyan-300"
                          : "text-slate-400"
                      }`}
                    />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Sidebar Account + Live Credits Box */}
            <div className="p-4 border-t border-white/10">
              <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-white truncate">{user.email}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                      effectivePlan.planId === "premium"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                        : effectivePlan.planId === "pro"
                        ? "bg-violet-500/25 text-violet-200 border border-violet-400/40"
                        : "bg-white/10 text-slate-300"
                    }`}
                  >
                    {effectivePlan.planId}
                  </span>
                </div>

                {/* Mini Credits Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-cyan-400" /> Credits Left
                    </span>
                    <span
                      className={`font-bold ${
                        creditsInfo.isExhausted
                          ? "text-rose-400"
                          : creditsInfo.isLow
                          ? "text-amber-300"
                          : "text-cyan-300"
                      }`}
                    >
                      {creditsInfo.remaining} / {creditsInfo.total}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        creditsInfo.isExhausted
                          ? "bg-rose-500"
                          : creditsInfo.isLow
                          ? "bg-amber-400"
                          : "bg-gradient-to-r from-violet-500 to-cyan-400"
                      }`}
                      style={{ width: `${creditsInfo.remainingPercent}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Used: {creditsInfo.used} · Remaining: {creditsInfo.remaining}
                  </div>
                </div>

                {effectivePlan.isPaid ? (
                  <div className="flex items-center justify-between text-[11px] text-emerald-300 pt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {effectivePlan.daysLeft}d left
                    </span>
                    <span className="text-slate-400">
                      till {formatDateShort(effectivePlan.validUntil)}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setActiveTab("plans");
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-semibold text-[11px] flex items-center justify-center gap-1 hover:opacity-95"
                  >
                    <Crown className="w-3 h-3" /> Upgrade Plan
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3 h-3" /> Sign Out
                </button>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0 relative z-10">
            {/* Clean Single-Line Top Header (Mobile + Desktop Optimized) */}
            <header className="sticky top-0 z-30 bg-[#07070f]/85 backdrop-blur-xl border-b border-white/10 px-3.5 lg:px-8 py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  className="lg:hidden p-2 rounded-lg bg-white/5 border border-white/10 shrink-0"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Menu className="w-4 h-4" />
                </button>
                <h1 className="font-bold text-sm sm:text-base lg:text-lg truncate">
                  {navItems.find((n) => n.id === activeTab)?.label || "ClipForge AI"}
                </h1>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Live Credits Pill */}
                <button
                  onClick={() => setActiveTab("plans")}
                  title={`Used: ${creditsInfo.used} / Total: ${creditsInfo.total} credits`}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold border transition whitespace-nowrap ${
                    creditsInfo.isExhausted
                      ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                      : creditsInfo.isLow
                      ? "bg-amber-500/15 border-amber-400/40 text-amber-200"
                      : "bg-cyan-500/10 border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/20"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 shrink-0" />
                  <span>{creditsInfo.remaining}</span>
                  <span className="hidden sm:inline">/ {creditsInfo.total} Credits</span>
                </button>

                {/* Active Plan Badge */}
                <button
                  onClick={() => setActiveTab("plans")}
                  className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold border transition whitespace-nowrap ${
                    effectivePlan.isPaid
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                      : "bg-white/5 border-white/15 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="uppercase">{effectivePlan.planId}</span>
                  {effectivePlan.isPaid && (
                    <span className="hidden md:inline text-emerald-200/90">
                      · {effectivePlan.daysLeft}d left
                    </span>
                  )}
                </button>

                {/* Primary New Clips Button */}
                <button
                  onClick={() => setActiveTab("create")}
                  className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-violet-600/25 hover:opacity-95 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">New Clips</span>
                  <span className="sm:hidden">New</span>
                </button>
              </div>
            </header>

            {/* Service Notice */}
            {!health.checking && (!health.online || !health.ffmpeg_available) && (
              <div className="mx-4 lg:mx-8 mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-semibold text-rose-200">
                      {isAdmin
                        ? "FFmpeg Video Backend Not Connected"
                        : "Video Engine Temporarily Reconnecting"}
                    </div>
                    <div className="text-rose-200/80 text-xs mt-0.5">
                      {isAdmin
                        ? health.ffmpeg_error || "Check your backend URL inside Admin Control → Backend Settings."
                        : "Please wait a few seconds and refresh the page."}
                    </div>
                  </div>
                </div>
                {isAdmin ? (
                  <button
                    onClick={() => {
                      setActiveTab("admin_panel");
                      setAdminSubTab("settings");
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-xs font-semibold text-white shrink-0"
                  >
                    Open Admin Settings
                  </button>
                ) : (
                  <button
                    onClick={() => checkBackendHealth(apiBaseUrl)}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-xs font-semibold text-white shrink-0"
                  >
                    Retry Connection
                  </button>
                )}
              </div>
            )}

            {/* Page Content */}
            <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
              {/* ================= HOME DASHBOARD ================= */}
              {activeTab === "dashboard" && (
                <div className="space-y-6">
                  {/* Hero Banner */}
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-violet-900/35 via-[#101024] to-cyan-900/25 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl shadow-violet-950/20">
                    <div className="space-y-2.5 max-w-2xl">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-200 text-xs font-semibold">
                        <Sparkles className="w-3.5 h-3.5" /> AI Highlight & Auto-Caption Engine
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                        Turn Long Videos into Viral Short MP4 Clips
                      </h2>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        Upload your video, let ClipForge AI detect the best moments, cut crisp
                        9:16/16:9/1:1 MP4 clips, burn animated Hindi/Hinglish/English captions, and
                        download individually or as a ZIP.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab("create")}
                      className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 font-bold text-sm shadow-xl shadow-violet-600/25 hover:opacity-95 shrink-0 flex items-center justify-center gap-2 transition"
                    >
                      <Upload className="w-4 h-4" /> Upload & Cut Video
                    </button>
                  </div>

                  {/* Dedicated Credits & Usage Card */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#111127] via-[#0e1226] to-[#0b1929] border border-cyan-400/20 shadow-lg space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center shrink-0">
                          <Zap className="w-5 h-5 text-cyan-300" />
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 font-medium">
                            Your Monthly Video Credits ({effectivePlan.planId.toUpperCase()} Plan)
                          </div>
                          <div className="text-lg sm:text-xl font-extrabold text-white mt-0.5 flex items-baseline gap-2 flex-wrap">
                            <span
                              className={
                                creditsInfo.isExhausted
                                  ? "text-rose-400"
                                  : creditsInfo.isLow
                                  ? "text-amber-300"
                                  : "text-cyan-300"
                              }
                            >
                              {creditsInfo.remaining} Credits Remaining
                            </span>
                            <span className="text-xs font-normal text-slate-400">
                              ({creditsInfo.used} used out of {creditsInfo.total})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveTab("plans")}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-xs font-bold text-white flex items-center gap-1.5 hover:opacity-95 shadow-md shadow-violet-600/20"
                        >
                          <Crown className="w-3.5 h-3.5" />
                          {effectivePlan.isPaid ? "Add / Upgrade Credits" : "Get More Credits"}
                        </button>
                      </div>
                    </div>

                    {/* Visual Credit Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            creditsInfo.isExhausted
                              ? "bg-rose-500"
                              : creditsInfo.isLow
                              ? "bg-amber-400"
                              : "bg-gradient-to-r from-violet-500 via-cyan-400 to-emerald-400"
                          }`}
                          style={{ width: `${creditsInfo.remainingPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Used: {creditsInfo.used} credits ({creditsInfo.usedPercent}%)</span>
                        <span>
                          {creditsInfo.isExhausted
                            ? "Limit reached — upgrade plan to continue"
                            : `Available: ${creditsInfo.remaining} credits (${creditsInfo.remainingPercent}%)`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4 KPI Stat Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                    {[
                      {
                        label: "Videos Processed",
                        value: projects.length,
                        icon: Video,
                        color: "text-violet-400",
                      },
                      {
                        label: "Ready MP4 Clips",
                        value: totalClipsGenerated,
                        icon: Film,
                        color: "text-cyan-400",
                      },
                      {
                        label: "Source Duration",
                        value: formatTime(totalDurationSec),
                        icon: Clock,
                        color: "text-emerald-400",
                      },
                      {
                        label: "Active Plan",
                        value: effectivePlan.isPaid
                          ? `${effectivePlan.planId.toUpperCase()} (${effectivePlan.daysLeft}d)`
                          : "FREE",
                        icon: Crown,
                        color: effectivePlan.isPaid ? "text-amber-400" : "text-slate-300",
                      },
                    ].map((kpi) => {
                      const Icon = kpi.icon;
                      return (
                        <div
                          key={kpi.label}
                          className="p-4 sm:p-5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition backdrop-blur-md"
                        >
                          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                            <span>{kpi.label}</span>
                            <Icon className={`w-4 h-4 ${kpi.color}`} />
                          </div>
                          <div className="text-lg sm:text-xl font-extrabold mt-2">{kpi.value}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 3-Step Quick Start Guide Strip */}
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-cyan-400" /> 3 Easy Steps To Create Viral Shorts
                      </h3>
                      <button
                        onClick={() => setActiveTab("create")}
                        className="text-xs text-cyan-300 font-semibold hover:underline flex items-center gap-1"
                      >
                        Start Now <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        {
                          step: "01",
                          title: "Upload Long Video",
                          desc: "MP4/MOV upload karein ya direct link paste karein (1 video = 1 credit).",
                        },
                        {
                          step: "02",
                          title: "Pick Style & Captions",
                          desc: "9:16 Reels format aur Hindi/Hinglish/English animated captions chunein.",
                        },
                        {
                          step: "03",
                          title: "Edit & Download MP4",
                          desc: "Clips trim karein, preview dekhein aur single MP4 ya full ZIP download karein.",
                        },
                      ].map((item) => (
                        <div
                          key={item.step}
                          className="p-3.5 rounded-xl bg-black/30 border border-white/10 flex items-start gap-3"
                        >
                          <span className="px-2 py-1 rounded-lg bg-violet-500/20 border border-violet-400/30 text-violet-300 font-mono font-bold text-xs shrink-0">
                            {item.step}
                          </span>
                          <div>
                            <div className="font-bold text-xs text-white">{item.title}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                              {item.desc}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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
                        No processed videos yet. Click{" "}
                        <button
                          onClick={() => setActiveTab("create")}
                          className="text-cyan-300 font-semibold hover:underline"
                        >
                          New Clips
                        </button>{" "}
                        to upload your first video.
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
                    {/* Compact Credit Status Strip */}
                    <div
                      className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
                        creditsInfo.isExhausted
                          ? "bg-rose-500/10 border-rose-500/40 text-rose-200"
                          : "bg-cyan-500/10 border-cyan-400/30 text-cyan-100"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-cyan-300 shrink-0" />
                        <span>
                          <strong>{creditsInfo.remaining}</strong> of <strong>{creditsInfo.total}</strong>{" "}
                          credits available ({creditsInfo.used} used) · 1 video upload = 1 credit
                        </span>
                      </div>
                      {(creditsInfo.isLow || creditsInfo.isExhausted) && (
                        <button
                          onClick={() => setActiveTab("plans")}
                          className="px-3 py-1 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-bold text-[11px]"
                        >
                          Upgrade Plan
                        </button>
                      )}
                    </div>

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
                                  Attach your authorized local video file below to generate clips.
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
                                ? `${formatBytes(selectedFile.size)} · Ready to process`
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
                          Burn animated subtitles directly into exported MP4 clips
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
                            Uploading Video ({uploadPercent}%)...
                          </>
                        ) : (
                          <>
                            <Scissors className="w-4 h-4" />
                            Analyze & Generate Short MP4 Clips
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Live 10-Stage Progress */}
                  <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4 h-fit">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm flex items-center gap-2">
                        <Activity className="w-4 h-4 text-cyan-400" /> Live Processing Pipeline
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
                      and click <strong>Edit</strong> to trim timestamps, edit subtitles, and re-render.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-sm">Rendered Clip Preview</h3>
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
                        <h3 className="font-bold text-sm">Trim & Caption Controls</h3>

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
                              <Loader2 className="w-4 h-4 animate-spin" /> Re-rendering Clip...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4" /> Save & Re-render MP4
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
                            <span>
                              {i + 1}. {t}
                            </span>
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

              {/* ================= PLANS & PRICING (RAZORPAY CHECKOUT) ================= */}
              {activeTab === "plans" && (
                <div className="space-y-6">
                  {/* Active Subscription & Credits Banner */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-violet-900/30 via-[#101024] to-cyan-900/20 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-slate-400">Account Subscription & Credits</div>
                      <div className="text-lg font-bold mt-0.5 flex items-center gap-2 flex-wrap">
                        <Crown className="w-5 h-5 text-amber-400" />
                        {effectivePlan.isPaid ? (
                          <span>
                            {effectivePlan.planId.toUpperCase()} Plan Active ·{" "}
                            <span className="text-emerald-300">
                              {effectivePlan.daysLeft} days remaining
                            </span>
                          </span>
                        ) : (
                          <span>Free Plan ({user.email})</span>
                        )}
                      </div>
                      <div className="text-xs text-cyan-300 mt-1 font-medium">
                        Credits: {creditsInfo.remaining} remaining · {creditsInfo.used} used (Total{" "}
                        {creditsInfo.total} / month)
                      </div>
                      {effectivePlan.isPaid && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          Valid until {formatDateShort(effectivePlan.validUntil)} · Instant UPI activation supported
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {plansConfig.map((plan) => {
                      const isCurrent = effectivePlan.planId === plan.id;
                      const isPopular = plan.id === "pro";
                      const priceLabel =
                        currency === "INR"
                          ? `₹${Number(plan.price_inr || 0).toLocaleString("en-IN")}`
                          : `$${Number(plan.price_usd || 0)}`;
                      const durationDays = plan.duration_days || 30;
                      const features = Array.isArray(plan.features) ? plan.features : [];

                      return (
                        <div
                          key={plan.id}
                          className={`p-6 rounded-2xl border flex flex-col justify-between gap-5 relative ${
                            isPopular
                              ? "bg-gradient-to-b from-violet-900/25 to-white/[0.04] border-violet-400/50 shadow-xl shadow-violet-600/10"
                              : "bg-white/[0.04] border-white/10"
                          }`}
                        >
                          {isPopular && (
                            <div className="absolute -top-3 right-5 px-3 py-0.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-[11px] font-bold text-white">
                              Most Popular
                            </div>
                          )}

                          <div>
                            <div className="text-sm font-bold text-violet-300">{plan.name}</div>
                            <div className="mt-2 flex items-baseline gap-1.5">
                              <span className="text-3xl font-extrabold">{priceLabel}</span>
                              <span className="text-xs text-slate-400">/ {durationDays} days</span>
                            </div>
                            <div className="text-xs text-cyan-300 mt-1 font-semibold flex items-center gap-1">
                              <Zap className="w-3.5 h-3.5" /> {plan.video_limit} Video Credits / month
                            </div>

                            <ul className="mt-4 space-y-2 text-xs text-slate-300">
                              {features.map((f, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                                  <span>{f}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <button
                            disabled={payingPlanId === plan.id}
                            onClick={() => handleStartPayment(plan)}
                            className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                              isCurrent && plan.id !== "free"
                                ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30"
                                : isPopular
                                ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:opacity-95"
                                : "bg-white/10 hover:bg-white/15 text-white"
                            }`}
                          >
                            {payingPlanId === plan.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Opening Razorpay...
                              </>
                            ) : plan.id === "free" ? (
                              isCurrent ? "Current Plan" : "Free Tier"
                            ) : isCurrent ? (
                              `Extend Plan (+${durationDays} Days)`
                            ) : (
                              `Pay via UPI / Card (${priceLabel})`
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      100% Secure Payments powered by Razorpay (UPI QR, PhonePe, GPay, Paytm, Cards). Instant auto-activation.
                    </span>
                    <button
                      onClick={() => setPolicyModal("refund")}
                      className="text-cyan-300 hover:underline"
                    >
                      View Refund Policy
                    </button>
                  </div>
                </div>
              )}

              {/* ================= EXCLUSIVE ADMIN CONTROL PANEL ================= */}
              {activeTab === "admin_panel" && isAdmin && (
                <div className="space-y-6">
                  {/* Admin KPI Summary */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: "Total Registered Users", value: adminStats.total, icon: Users, color: "text-cyan-400" },
                      { label: "Active Paid Users", value: adminStats.paid, icon: Crown, color: "text-amber-400" },
                      { label: "Active Queue Jobs", value: `${health.active_jobs}/${health.max_active_jobs}`, icon: Activity, color: "text-violet-400" },
                      {
                        label: "FFmpeg Server",
                        value: health.online && health.ffmpeg_available ? "Online" : "Offline",
                        icon: Server,
                        color: health.online && health.ffmpeg_available ? "text-emerald-400" : "text-rose-400",
                      },
                    ].map((stat) => {
                      const Icon = stat.icon;
                      return (
                        <div key={stat.label} className="p-4 rounded-2xl bg-amber-500/[0.06] border border-amber-400/20">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>{stat.label}</span>
                            <Icon className={`w-4 h-4 ${stat.color}`} />
                          </div>
                          <div className="text-xl font-bold mt-1.5">{stat.value}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Admin Sub-Tabs */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "pricing", label: "Live Price & Credit Editor", icon: CreditCard },
                      { id: "users", label: "Users & Credits", icon: Users },
                      { id: "monitor", label: "System Monitor", icon: Shield },
                      { id: "settings", label: "Backend Settings", icon: Settings },
                    ].map((t) => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setAdminSubTab(t.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                            adminSubTab === t.id
                              ? "bg-amber-500/20 border-amber-400/50 text-amber-200"
                              : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {t.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Sub-tab 1: Live Price & Plan Editor */}
                  {adminSubTab === "pricing" && (
                    <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/10 space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-base">Manage Live Plan Prices & Credit Limits</h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Yahan se price ya credit limit change karke save karte hi public website aur checkout turant update ho jayega.
                          </p>
                        </div>
                        <button
                          disabled={savingPlans}
                          onClick={handleSaveAdminPlans}
                          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-bold flex items-center gap-2 shrink-0 disabled:opacity-50"
                        >
                          {savingPlans ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Save All Plans Live
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {adminPlanDrafts.map((draft, idx) => (
                          <div
                            key={draft.id}
                            className="p-4 rounded-xl bg-black/35 border border-white/10 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-amber-300 uppercase">
                                {draft.name} ({draft.id})
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                              <div>
                                <label className="text-[11px] text-slate-400 block mb-1">Price (INR ₹)</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={draft.price_inr}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setAdminPlanDrafts((prev) =>
                                      prev.map((p, i) => (i === idx ? { ...p, price_inr: val } : p))
                                    );
                                  }}
                                  className="w-full px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] text-slate-400 block mb-1">Price (USD $)</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={draft.price_usd}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setAdminPlanDrafts((prev) =>
                                      prev.map((p, i) => (i === idx ? { ...p, price_usd: val } : p))
                                    );
                                  }}
                                  className="w-full px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-sm"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                              <div>
                                <label className="text-[11px] text-slate-400 block mb-1">Credits / Month</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={draft.video_limit}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setAdminPlanDrafts((prev) =>
                                      prev.map((p, i) => (i === idx ? { ...p, video_limit: val } : p))
                                    );
                                  }}
                                  className="w-full px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] text-slate-400 block mb-1">Validity (Days)</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={draft.duration_days || 30}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setAdminPlanDrafts((prev) =>
                                      prev.map((p, i) => (i === idx ? { ...p, duration_days: val } : p))
                                    );
                                  }}
                                  className="w-full px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sub-tab 2: User & Plan Control */}
                  {adminSubTab === "users" && (
                    <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            value={adminUserSearch}
                            onChange={(e) => setAdminUserSearch(e.target.value)}
                            placeholder="Search user by email or plan..."
                            className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs"
                          />
                        </div>
                        <button
                          onClick={fetchAdminUsers}
                          className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingAdminUsers ? "animate-spin" : ""}`} />
                          Refresh Users
                        </button>
                      </div>

                      {filteredAdminUsers.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-400">
                          No users found yet.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-white/10 text-slate-400">
                                <th className="py-2.5 pr-4">User Email</th>
                                <th className="py-2.5 pr-4">Plan</th>
                                <th className="py-2.5 pr-4">Credits Used</th>
                                <th className="py-2.5 pr-4">Days Left</th>
                                <th className="py-2.5 text-right">Quick Controls</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {filteredAdminUsers.map((u) => {
                                const dLeft = getPlanDaysLeft(u.valid_until);
                                const busy = updatingUserId === u.user_id;
                                const uLimit = getPlanLimitById(u.plan_id);
                                const uUsed = Number(u.videos_used) || 0;
                                return (
                                  <tr key={u.user_id}>
                                    <td className="py-3 pr-4 font-medium text-white">{u.email}</td>
                                    <td className="py-3 pr-4 uppercase font-bold text-cyan-300">
                                      {u.plan_id}
                                    </td>
                                    <td className="py-3 pr-4 font-mono text-slate-300">
                                      {uUsed} / {uLimit}
                                    </td>
                                    <td className="py-3 pr-4">
                                      {u.plan_id !== "free" && dLeft > 0 ? (
                                        <span className="text-emerald-300 font-semibold">{dLeft} days</span>
                                      ) : (
                                        <span className="text-slate-500">—</span>
                                      )}
                                    </td>
                                    <td className="py-3 text-right">
                                      <div className="inline-flex flex-wrap justify-end gap-1.5">
                                        <button
                                          disabled={busy}
                                          onClick={() => handleAdminUpdateUserPlan(u, "pro", 30)}
                                          className="px-2.5 py-1 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 border border-violet-400/40 text-violet-200 font-semibold"
                                        >
                                          +30d Pro
                                        </button>
                                        <button
                                          disabled={busy}
                                          onClick={() => handleAdminUpdateUserPlan(u, "premium", 30)}
                                          className="px-2.5 py-1 rounded-lg bg-amber-500/25 hover:bg-amber-500/40 border border-amber-400/40 text-amber-200 font-semibold"
                                        >
                                          +30d Prem
                                        </button>
                                        <button
                                          disabled={busy}
                                          onClick={() => handleAdminResetCredits(u)}
                                          className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 font-semibold"
                                        >
                                          Refill Credits
                                        </button>
                                        <button
                                          disabled={busy}
                                          onClick={() => handleAdminUpdateUserPlan(u, "free", 0)}
                                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-200"
                                        >
                                          Free
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sub-tab 3: System Monitor */}
                  {adminSubTab === "monitor" && (
                    <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-base">Live FFmpeg & Storage Diagnostics</h3>
                        <button
                          onClick={() => checkBackendHealth(apiBaseUrl)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs flex items-center gap-1.5"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${health.checking ? "animate-spin" : ""}`} />
                          Refresh
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 rounded-xl bg-black/30 border border-white/10">
                          <div className="text-slate-400">Backend URL</div>
                          <div className="font-mono mt-1 text-cyan-300 break-all">{apiBaseUrl}</div>
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
                        <div className="p-3.5 rounded-xl bg-black/30 border border-white/10">
                          <div className="text-slate-400">Upload Limit</div>
                          <div className="font-semibold mt-1">{health.max_upload_mb} MB</div>
                        </div>
                        <div className="p-3.5 rounded-xl bg-black/30 border border-white/10">
                          <div className="text-slate-400">Rate Limit Protection</div>
                          <div className="font-semibold mt-1">{health.rate_limit}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sub-tab 4: Backend Settings */}
                  {adminSubTab === "settings" && (
                    <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/10 space-y-5 max-w-2xl">
                      <div>
                        <h3 className="font-bold text-base">Backend API Connection (Admin Only)</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Default live Railway server:{" "}
                          <code className="text-cyan-300">{DEFAULT_BACKEND_URL}</code>
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <input
                          type="url"
                          value={urlDraft}
                          onChange={(e) => setUrlDraft(e.target.value)}
                          placeholder={DEFAULT_BACKEND_URL}
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
                          <span
                            className={
                              health.online && health.ffmpeg_available
                                ? "text-emerald-300"
                                : "text-rose-300"
                            }
                          >
                            {health.online && health.ffmpeg_available
                              ? "Connected & FFmpeg Ready"
                              : "Offline / Not Ready"}
                          </span>
                        </div>
                        {health.ffmpeg_version && (
                          <div className="text-slate-400 font-mono">{health.ffmpeg_version}</div>
                        )}
                        {health.ffmpeg_error && <div className="text-rose-300">{health.ffmpeg_error}</div>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </main>

            {/* Public Footer with Mandatory Razorpay Policy Links */}
            <footer className="border-t border-white/10 px-4 lg:px-8 py-5 mt-8 text-xs text-slate-400">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>© {new Date().getFullYear()} ClipForge AI · Jaipur, Rajasthan, India</div>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <button onClick={() => setPolicyModal("privacy")} className="hover:text-white">
                    Privacy Policy
                  </button>
                  <button onClick={() => setPolicyModal("terms")} className="hover:text-white">
                    Terms & Conditions
                  </button>
                  <button onClick={() => setPolicyModal("refund")} className="hover:text-white">
                    Cancellation & Refund Policy
                  </button>
                  <button onClick={() => setPolicyModal("contact")} className="hover:text-white">
                    Contact Us
                  </button>
                </div>
              </div>
            </footer>
          </div>
        </div>
      )}

      {/* ================= GLOBAL TOAST NOTIFICATION ================= */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 left-5 sm:left-auto z-[70] px-4 py-3 rounded-xl border shadow-2xl text-xs sm:text-sm font-medium backdrop-blur-xl flex items-center gap-2.5 max-w-md ${
            toast.type === "success"
              ? "bg-emerald-950/95 border-emerald-500/50 text-emerald-100"
              : toast.type === "error"
              ? "bg-rose-950/95 border-rose-500/50 text-rose-100"
              : "bg-slate-900/95 border-violet-500/40 text-slate-100"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : toast.type === "error" ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ================= SET NEW PASSWORD MODAL (RECOVERY FLOW) ================= */}
      {recoveryModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0e0e1d] border border-cyan-400/30 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center">
                  <Key className="w-4 h-4 text-cyan-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Naya Password Set Karein</h3>
                  <p className="text-xs text-slate-400">
                    Apne ClipForge AI account ke liye naya password daalein.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRecoveryModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRecoveredPassword} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-black/50 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1.5">Confirm New Password</label>
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Wahi password dobara likhein"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {recoveryError && (
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-200">
                  {recoveryError}
                </div>
              )}

              <button
                type="submit"
                disabled={updatingPassword}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 font-bold text-sm text-white disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {updatingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                Update Password & Continue
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= POLICY PAGES MODAL (FOR RAZORPAY & USERS) ================= */}
      {policyModal && (
        <div className="fixed inset-0 z-[65] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-[#0e0e1d] border border-white/15 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 font-bold text-base text-white">
                <FileText className="w-4 h-4 text-cyan-400" />
                {policyModal === "privacy" && "Privacy Policy — ClipForge AI"}
                {policyModal === "terms" && "Terms & Conditions — ClipForge AI"}
                {policyModal === "refund" && "Cancellation & Refund Policy — ClipForge AI"}
                {policyModal === "contact" && "Contact Us — ClipForge AI"}
              </div>
              <button
                onClick={() => setPolicyModal(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {policyModal === "privacy" && (
              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <p><strong>Effective Date:</strong> November 2026</p>
                <p>
                  ClipForge AI respects your privacy. We collect only the minimum information required to provide our AI video clipping service: your account email address, subscription status, and temporary uploaded video files.
                </p>
                <p>
                  <strong>Automatic File Deletion:</strong> Uploaded videos and generated MP4 clips are automatically deleted from our processing servers within 3 hours to protect your content and storage privacy.
                </p>
                <p>
                  <strong>Payments:</strong> All payments are securely processed via Razorpay. ClipForge AI never stores your UPI PIN, card number, CVV, or netbanking credentials.
                </p>
                <p>
                  For data deletion requests, email us at <span className="text-cyan-300">{SUPPORT_EMAIL}</span>.
                </p>
              </div>
            )}

            {policyModal === "terms" && (
              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <p><strong>Effective Date:</strong> November 2026</p>
                <p>
                  By using ClipForge AI, you agree to upload and process only videos that you own or have explicit legal authorization to edit and redistribute.
                </p>
                <p>
                  <strong>Subscriptions & Fair Usage:</strong> Paid plans (Pro and Premium) grant access for 30 days from the date of payment confirmation, subject to the monthly video credit limits listed on our Pricing page. Automated abuse, scraping, or uploading illegal/copyright-infringing material may lead to account suspension.
                </p>
                <p>
                  <strong>Service Availability:</strong> We strive for high uptime, though occasional server maintenance or queue limits may apply during peak traffic.
                </p>
              </div>
            )}

            {policyModal === "refund" && (
              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <p><strong>Effective Date:</strong> November 2026</p>
                <p>
                  ClipForge AI provides instant digital SaaS access and cloud video rendering resources immediately upon payment.
                </p>
                <p>
                  <strong>Refund Eligibility:</strong> Refunds are provided within <strong>7 days</strong> of purchase if: (a) your account was charged twice due to a technical error, or (b) your paid plan was not activated and our support team is unable to resolve the issue within 48 hours. Once paid video processing credits have been used, the subscription is non-refundable.
                </p>
                <p>
                  <strong>Cancellation:</strong> Plans are one-time 30-day passes with no forced auto-debit. You can simply choose not to renew after your 30-day period ends.
                </p>
                <p>
                  Approved refunds are credited back to the original payment method within 5–7 business days. Contact <span className="text-cyan-300">{SUPPORT_EMAIL}</span> with your Razorpay Payment ID for assistance.
                </p>
              </div>
            )}

            {policyModal === "contact" && (
              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <p>
                  Have a question about your subscription, payment, or video processing? Reach out to our team:
                </p>
                <div className="p-4 rounded-xl bg-black/35 border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Mail className="w-4 h-4 text-cyan-400" /> {SUPPORT_EMAIL}
                  </div>
                  <div><strong>Business Name:</strong> ClipForge AI (Operated by Deepanshu Yogi)</div>
                  <div><strong>Location:</strong> Jaipur, Rajasthan, India</div>
                  <div><strong>Support Hours:</strong> Monday – Saturday, 10:00 AM – 7:00 PM IST</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
