import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MediaFile,
  ToneTag,
  PocketItem,
  ZineMetadata,
  ZineGenerationOptions,
} from "../types";
import { useRecorder } from "../hooks/useRecorder";
import { useTasteLogging } from "../hooks/useTasteLogging";
import {
  Plus,
  BrainCircuit,
  X,
  Globe,
  MapPin,
  Mic,
  Loader2,
  Square,
  Check,
  Download,
  Radio,
  Mail,
  Info,
  Sparkles,
  AlertCircle,
  Eraser,
  Zap,
  Image as ImageIcon,
  ImageUp,
  Link as LinkIcon,
  Twitter,
  Instagram,
  Shield,
  Users,
  ArrowUpRight,
  FolderOpen,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  Wand2,
  ChevronDown,
  Scissors,
  ShoppingBag,
  FolderPlus,
  Radar,
  Trash2,
  Eye,
  EyeOff,
  Paintbrush,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Calendar,
  Layers,
  Settings,
  FileCode,
  BookOpen,
  GitMerge,
  Menu,
  MoreHorizontal,
  PenLine,
  LayoutGrid,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  transcribeAudio,
  generateTagsFromMedia,
  analyzeImageAesthetic,
  generateZineTitle,
  applyAestheticRefraction,
  generateAutoAwesomePrompt,
  analyzeAestheticDelta,
  shapeBrief,
  mergeStyleTreatments,
} from "../services/geminiService";
import {
  getApprovedUsedContext,
  getUsedContext,
  subscribeUsedContext,
} from "../services/usedContextService";
import { TagGenerator } from "./TagGenerator";
import { StudioPocketDrawer } from "./studio/StudioPocketDrawer";
import { StudioCoverOverlayCanvas, StudioCoverOverlayPanel } from "./studio/StudioCoverOverlay";
import type { StudioCoverOverlayLayer } from "./studio/studioCoverTypes";
import { ShapeBriefReview } from "./studio/ShapeBriefReview";
import type { ShapedBriefResult } from "./studio/ShapeBriefReview";
import {
  generateStudioCover,
  mediaFileToImageReference,
} from "../services/studioCoverService";
import type { StudioCoverProvider } from "../services/studioCoverService";
import { buildStudioCoverExportMeta } from "../lib/studioCoverExport";
import { coerceToString, coerceToStringArray, splitInferredAnchors } from "../lib/utils";
import { DeltaVerdictCard } from "./DeltaVerdictCard";
import { ZineConfiguration } from "./ZineConfiguration";
import { ZineInspoCarousel } from "./ZineInspoCarousel";
import { TranslationTerminal } from "./TranslationTerminal";
import { SUPERINTELLIGENCE_PROMPTS } from "../constants";
import { CuratorNote } from "./CuratorNote";
import { useUser } from "../contexts/UserContext";
import { useTactileAudio } from "../hooks/useTactileAudio";
import { createMoodboard } from "../services/firebase";
import { LegalOverlay } from "./LegalOverlay";
import { GlossaryTooltip } from "./GlossaryTooltip";
import { UseCaseSelector, getBriefPreset } from "./UseCaseSelector";
import type { BriefPreset } from "./UseCaseSelector";
import { AestheticCustomizer } from "./AestheticCustomizer";
import { StudioChrome, StudioColumnSplitHandle } from "./studio/StudioChrome";
import { MENU_STRUCTURE } from "./navigationConfig";
import { useStudioTheme } from "../hooks/useStudioTheme";
import { useTheme } from "../contexts/ThemeContext";
import { useStudioDollSelection } from "../hooks/useStudioDollSelection";
import { StudioDollToggle } from "./StudioDollToggle";
import { PearlButton } from "./ui/PearlButton";
import { dispatchStudioAlert } from "../lib/studioAlert";
import { useUrlIngest } from "../hooks/useUrlIngest";
import { useMediaUpload } from "../hooks/useMediaUpload";

const TOOLTIPS: Record<string, string> = {
  signal: "Signal Panel: Direct inputs and uploads",
  inspo: "Inspiration: Curated references",
  treatments: "Treatments: Presets & aesthetic overrides",
  orchestrator: "Orchestrator: Prompt and thread context",
  procurement: "Procurement: Agentic execution triggers",
  telemetry: "Telemetry: Stats regarding generation",
  translation: "Translation: Advanced metadata terminal",
};

const CATEGORIES: Record<string, ToneTag[]> = {
  STYLE: ["CONTENT", "editorial", "dream", "unhinged", "research"],
  SOURCE: ["SHADOW", "SIGNAL", "ECHO"],
  FORMAT: ["MANIFESTO", "SHARD", "DOSSIER", "PROMPT"],
  ALCHEMY: ["RAW", "VINTAGE", "CONTRARY"],
};

const GUIDED_PROMPTS: Record<string, string> = {
  CONTENT: "DEFINE THE ASSIGNMENT. SPECIFY THE DIRECTIVES. OUTLINE THE OUTPUT.",
  editorial:
    "IDENTIFY YOUR VISUAL ANCHOR. DEFINE THE COMPOSITION. SET THE TYPOGRAPHIC WEIGHT.",
  dream: "TRIGGER THE MEMORY. LAYER THE ATMOSPHERE. CAPTURE THE RESONANCE.",
  unhinged: "CALIBRATE THE CHAOS. DISTORT THE VISION. INJECT THE NON-SEQUITUR.",
  research: "STATE THE CORE INQUIRY. TARGET THE SOURCES. CHOOSE THE SYNTHESIS.",
};

const DEFAULT_PROMPTS = [
  "What is the defining texture or material that anchors your current state of mind?",
  "Recall a specific light, dynamic, or shadow that shifted your mood this week. What was it?",
  "If you were to curate a single capsule representing your core aesthetic right now, what three items define it?",
  "Which memory or sensory fragment are you most actively trying to preserve or document today?",
  "What contradiction exists between the organic elements of your life and the technology you inhabit?",
  "Describe the visual atmosphere or color scale of a place where you recently felt entirely at ease.",
  "What is an underlying theme or quiet obsession that keeps surfacing in your creative thoughts?",
];

const DEFAULT_STARTERS = [
  "Right now, the material anchoring me is...",
  "The light fell across the room, reminding me of...",
  "If I had to select three objects of absolute significance, they would be...",
  "I want to capture the exact feeling of...",
  "There is a strange friction between...",
  "The color scale of that space was...",
  "Lately, I keep returning to the idea of...",
];

const PROVOCATIONS = [
  "What is the texture of the silence here?",
  "Deconstruct the primary anchor.",
  "Introduce a brutalist contradiction.",
  "Consider the artifact as a ruin.",
  "Bleed the colors into the semantic layer.",
  "Obscure the obvious.",
  "What if the subject is actually the background?",
  "Elevate the mundane to the mythological.",
  "Find the tension between the organic and the synthetic.",
  "Let the negative space dictate the narrative.",
];

const noiseSvgUrl = "data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E";

const getTreatmentBackgroundStyle = (id: string | null, savedTreatments?: any[]): React.CSSProperties => {
  if (!id) return { backgroundColor: "#ECECE8", color: "#78716C" };
  switch (id) {
    case "35mm":
      return { backgroundColor: "#F5F5F4", color: "#1C1917" };
    case "terry":
      return { backgroundColor: "#FFFAFA", color: "#E11D48" };
    case "muted":
      return { backgroundColor: "#ECECE8", color: "#78716C" };
    case "newsprint":
      return { backgroundColor: "#FAF9F6", color: "#000000" };
    case "mono":
      return { backgroundColor: "#000000", color: "#00FF00" };
    case "thermal":
      return { background: "linear-gradient(135deg, #FF5A5F, #3F51B5)", color: "#FFFFFF" };
    default: {
      const custom = savedTreatments?.find((t) => t.id === id);
      if (custom) {
        const palette = custom.canonicalTaste?.palette || [];
        const bg = palette[0] || "#FAF9F6";
        const fg = palette[1] || "#000000";
        return { backgroundColor: bg, color: fg };
      }
      return { backgroundColor: "#ECECE8", color: "#78716C" };
    }
  }
};

const getCoverBorderClass = (border: "thin" | "double" | "dashed" | "none") => {
  switch (border) {
    case "thin":
      return "border-stone-950/20 dark:border-stone-50/20";
    case "double":
      return "border-double border-4 border-stone-950/40 dark:border-stone-50/40";
    case "dashed":
      return "border-dashed border-2 border-stone-950/30 dark:border-stone-50/30";
    case "none":
      return "border-transparent";
  }
};

const getTreatmentImageFilter = (id: string | null, savedTreatments?: any[]): string => {
  if (!id) return "none";
  switch (id) {
    case "35mm":
      return "grayscale(100%) contrast(120%) brightness(105%)";
    case "terry":
      return "contrast(150%) saturate(140%) brightness(110%)";
    case "muted":
      return "sepia(10%) contrast(90%) brightness(100%) saturate(80%)";
    case "newsprint":
      return "grayscale(100%) contrast(160%) brightness(95%)";
    case "mono":
      return "grayscale(100%) brightness(120%) invert(100%) contrast(150%)";
    case "thermal":
      return "hue-rotate(180deg) saturate(200%) contrast(120%)";
    default: {
      const custom = savedTreatments?.find((t) => t.id === id);
      if (custom) {
        const d = custom.canonicalTaste?.density ?? 0.5;
        const e = custom.canonicalTaste?.entropy ?? 0.5;
        const contrast = 90 + Math.round(d * 40);
        const saturate = 70 + Math.round(e * 80);
        const brightness = 95 + Math.round((1 - d) * 15);
        return `contrast(${contrast}%) saturate(${saturate}%) brightness(${brightness}%)`;
      }
      return "none";
    }
  }
};

const getTreatmentTitleFontClass = (id: string | null, savedTreatments?: any[]): string => {
  if (!id) return "font-serif italic text-2xl";
  switch (id) {
    case "35mm":
      return "font-serif italic text-3xl font-extrabold";
    case "terry":
      return "font-sans uppercase text-3xl font-black tracking-tighter";
    case "muted":
      return "font-serif text-2xl font-light tracking-wide";
    case "newsprint":
      return "font-serif italic text-2xl font-black";
    case "mono":
      return "font-mono uppercase text-xl font-bold tracking-widest";
    case "thermal":
      return "font-sans uppercase text-3xl font-bold italic tracking-tight";
    default: {
      const custom = savedTreatments?.find((t) => t.id === id);
      if (custom) {
        const e = custom.canonicalTaste?.entropy ?? 0.5;
        if (e > 0.7) return "font-mono uppercase text-xl font-bold tracking-widest";
        if (e < 0.3) return "font-serif text-2xl font-light tracking-wide";
        return "font-serif italic text-3xl font-extrabold";
      }
      return "font-serif italic text-2xl";
    }
  }
};

const getTreatmentLabel = (id: string | null, savedTreatments?: any[]): string => {
  if (!id) return "MUTED_CHROMA";
  switch (id) {
    case "35mm":
      return "35MM_GRAIN";
    case "terry":
      return "TERRY_FLASH";
    case "muted":
      return "MUTED_CHROMA";
    case "newsprint":
      return "HALFTONE_INK";
    case "mono":
      return "SOVEREIGN_MONO";
    case "thermal":
      return "THERMAL_SCAN";
    default: {
      const custom = savedTreatments?.find((t) => t.id === id);
      if (custom) {
        return custom.treatmentName.toUpperCase().replace(/\s+/g, "_");
      }
      return "MUTED_CHROMA";
    }
  }
};

export const InputStudio: React.FC<{
  onRefine: any;
  isThinking: boolean;
  initialValue?: string;
  initialMedia?: MediaFile[];
  continuumContext?: any;
  zineOptions: ZineGenerationOptions;
  setZineOptions: (options: ZineGenerationOptions) => void;
  initialHighFidelity?: boolean;
}> = ({
  onRefine,
  isThinking,
  initialValue,
  initialMedia,
  continuumContext,
  initialHighFidelity,
  zineOptions,
  setZineOptions,
}) => {
  const {
    systemStatus,
    user: currentUser,
    updateProfile,
    profile,
    activeThread,
    setActiveThread,
    apiKeys,
  } = useUser();
  const { logEvent } = useTasteLogging();
  const { playClick, startDeepDrone, stopDeepDrone } = useTactileAudio();
  const studioDoll = useStudioDollSelection(currentUser?.uid);

  // Brown-noise / deep drone must be explicitly opted-in — never auto-start on thinking alone.
  const [ambientDroneOn, setAmbientDroneOn] = useState(() => {
    try {
      return localStorage.getItem("mimi_ambient_drone") === "on";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("mimi_ambient_drone", ambientDroneOn ? "on" : "off");
    } catch {
      /* ignore */
    }
  }, [ambientDroneOn]);

  useEffect(() => {
    if (isThinking && ambientDroneOn) {
      startDeepDrone();
    } else {
      stopDeepDrone();
    }
    return () => {
      stopDeepDrone();
    };
  }, [isThinking, ambientDroneOn]);

  useEffect(() => {
    const handleButtonClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("button")) {
        playClick();
      }
    };
    window.addEventListener("click", handleButtonClick, { capture: true });
    return () => {
      window.removeEventListener("click", handleButtonClick, { capture: true });
    };
  }, [playClick]);

  // Initialize with a value if none provided
  const [input, setInput] = useState(() => {
    if (initialValue) return initialValue;
    const savedDraft = localStorage.getItem("mimi_draft_input");
    if (savedDraft) return savedDraft;
    return (
      DEFAULT_STARTERS[Math.floor(Math.random() * DEFAULT_STARTERS.length)] ||
      ""
    );
  });
  const [title, setTitle] = useState(() => {
    const savedTitle = localStorage.getItem("mimi_draft_title");
    return savedTitle || "";
  });
  const [provocationIndex, setProvocationIndex] = useState(0);
  const [activeCognitivePersona, setActiveCognitivePersona] = useState<BriefPreset>(
    () => {
      const saved = localStorage.getItem("mimi_cognitive_persona");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return getBriefPreset(parsed?.id);
        } catch (e) {}
      }
      return getBriefPreset("social-manager");
    },
  );

  // Autosave draft
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (input && !DEFAULT_STARTERS.includes(input)) {
        localStorage.setItem("mimi_draft_input", input);
      }
      if (title) {
        localStorage.setItem("mimi_draft_title", title);
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [input, title]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProvocationIndex((prev) => (prev + 1) % PROVOCATIONS.length);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleAutoGenerateTitle = async () => {
    if (!input) return;
    try {
      const generatedTitle = await generateZineTitle(input);
      setTitle(generatedTitle);
    } catch (e) {
      console.error("MIMI // Failed to generate title:", e);
    }
  };

  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMediaIndices, setSelectedMediaIndices] = useState<Set<number>>(
    new Set(),
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mediaAnalysis, setMediaAnalysis] = useState<
    Record<number, { tags: string[]; aesthetic: any; deltaVerdict?: any }>
  >({});
  const [isAnalyzing, setIsAnalyzing] = useState<Record<number, boolean>>({});
  const [deepThinking, setDeepThinking] = useState(false);
  const [liteMode, setLiteMode] = useState(false);
  const [useTailorProfile, setUseTailorProfile] = useState(true);
  const [isHighFidelity, setIsHighFidelity] = useState(
    initialHighFidelity || false,
  );
  const [freshState, setFreshState] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [useMaps, setUseMaps] = useState(false);
  const [taskMode, setTaskMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("STYLE");
  const [selectedTone, setSelectedTone] = useState<ToneTag | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [dictationInterim, setDictationInterim] = useState("");
  const recognitionRef = useRef<any>(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState<
    "idle" | "transcribing" | "success" | "error"
  >("idle");
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [showColophon, setShowColophon] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const [legalType, setLegalType] = useState<"privacy" | "terms" | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [activeTags, setActiveTags] = useState<string[]>([]);

  useEffect(() => {
    const pending = localStorage.getItem("mimi_pending_wardrobe_reference");
    if (!pending) return;

    try {
      const reference = JSON.parse(pending) as {
        id?: string;
        title?: string;
        imageUrl?: string;
        category?: string;
        tags?: string[];
      };
      if (reference.imageUrl) {
        setMediaFiles((prev) => [
          {
            url: reference.imageUrl!,
            data: "",
            mimeType: "image/jpeg",
            type: "image",
            name: `wardrobe-ref-${reference.id || Date.now()}`,
          },
          ...prev,
        ]);
      }
      if (reference.tags?.length) {
        setActiveTags((prev) => Array.from(new Set([...prev, ...reference.tags!])));
      }
    } catch (error) {
      console.warn("MIMI // Could not load Wardrobe reference into Studio.", error);
    } finally {
      localStorage.removeItem("mimi_pending_wardrobe_reference");
    }
  }, []);

  const [editorialIntention, setEditorialIntention] = useState("");
  const [centralTension, setCentralTension] = useState("");
  const [anchorsReferences, setAnchorsReferences] = useState("");
  const [desiredFeeling, setDesiredFeeling] = useState("");
  const [avoidExclude, setAvoidExclude] = useState("");
  const [outputWanted, setOutputWanted] = useState("");
  const [isBriefExpanded, setIsBriefExpanded] = useState(false);

  const [isShapingBrief, setIsShapingBrief] = useState(false);
  const [shapedBriefResult, setShapedBriefResult] = useState<ShapedBriefResult | null>(null);
  const [showShapeReview, setShowShapeReview] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [coverSubject, setCoverSubject] = useState("");
  const [coverComposition, setCoverComposition] = useState("");
  const [coverMood, setCoverMood] = useState("");
  const [coverAvoid, setCoverAvoid] = useState("");
  const [showCoverBrief, setShowCoverBrief] = useState(false);
  const [activeTreatmentId, setActiveTreatmentId] = useState<string | null>(
    null,
  );

  const [authorName, setAuthorName] = useState(() => profile?.handle || "Author");
  const [coverSystemCode, setCoverSystemCode] = useState(
    () => localStorage.getItem("mimi_cover_system_code") || "SYS // COV-INT.1",
  );
  useEffect(() => {
    if (profile?.handle) {
      setAuthorName(profile.handle);
    }
  }, [profile?.handle]);
  useEffect(() => {
    localStorage.setItem("mimi_cover_system_code", coverSystemCode);
  }, [coverSystemCode]);

  const [coverBorder, setCoverBorder] = useState<"thin" | "double" | "none" | "dashed">("thin");
  const [coverPersonalizationTab, setCoverPersonalizationTab] = useState<
    "border" | "text" | "image"
  >("border");
  const [coverOverlay, setCoverOverlay] = useState<boolean>(false);
  const [coverOverlayLayers, setCoverOverlayLayers] = useState<StudioCoverOverlayLayer[]>([]);
  const [isDraggingOverSlot, setIsDraggingOverSlot] = useState<boolean>(false);
  const [isComposingCover, setIsComposingCover] = useState(false);
  const [composeCoverError, setComposeCoverError] = useState<string | null>(null);
  const [showImageApiKeyInfo, setShowImageApiKeyInfo] = useState(false);
  const [coverProvider, setCoverProvider] = useState<StudioCoverProvider>(() => {
    const stored = localStorage.getItem("mimi_cover_provider");
    return stored === "gateway" ||
      stored === "openai" ||
      stored === "gemini" ||
      stored === "replicate"
      ? stored
      : "gateway";
  });
  useEffect(() => {
    if (systemStatus?.ai?.aiGateway && coverProvider !== "gateway") {
      setCoverProvider("gateway");
      localStorage.setItem("mimi_cover_provider", "gateway");
    }
  }, [coverProvider, systemStatus?.ai?.aiGateway]);
  const coverProviderOptions: Array<{
    id: StudioCoverProvider;
    label: string;
    shortLabel: string;
    available: boolean;
  }> = [
    {
      id: "gateway",
      label: "Gateway · GPT Image",
      shortLabel: "GATEWAY · GPT IMAGE",
      available: Boolean(apiKeys?.gateway || systemStatus?.ai?.aiGateway),
    },
    {
      id: "replicate",
      label: "Replicate · Flux",
      shortLabel: "REPLICATE · FLUX",
      available: Boolean(apiKeys?.replicate || systemStatus?.ai?.replicate),
    },
    {
      id: "openai",
      label: "OpenAI Image",
      shortLabel: "OPENAI",
      available: Boolean(apiKeys?.openai || systemStatus?.ai?.openai),
    },
    {
      id: "gemini",
      label: "Gemini Image",
      shortLabel: "GEMINI",
      available: Boolean(apiKeys?.gemini || systemStatus?.ai?.gemini),
    },
  ];
  const activeCoverProvider =
    coverProviderOptions.find((provider) => provider.id === coverProvider) ||
    coverProviderOptions[0];
  const hasLiveAi = activeCoverProvider.available;

  const handleCoverProviderChange = (provider: StudioCoverProvider) => {
    setCoverProvider(provider);
    localStorage.setItem("mimi_cover_provider", provider);
    setComposeCoverError(null);
  };
  const [grainDensity, setGrainDensity] = useState<number>(40);
  const [coverAlign, setCoverAlign] = useState<"left" | "center" | "right">("center");
  const [leftPrompt, setLeftPrompt] = useState("");
  const [mobileStudioView, setMobileStudioView] = useState<"editor" | "cover">("editor");
  const [coverPanelWidth, setCoverPanelWidth] = useState(340);
  const [isCoverExpanded, setIsCoverExpanded] = useState(false);
  const [selectedTreatmentIds, setSelectedTreatmentIds] = useState<string[]>([]);
  const [isTreatmentSelectMode, setIsTreatmentSelectMode] = useState(false);
  const [batchTagInput, setBatchTagInput] = useState("");
  const [treatmentSortKey, setTreatmentSortKey] = useState<"date" | "title" | "tags">("date");
  const [quickLookTreatmentId, setQuickLookTreatmentId] = useState<string | null>(null);
  const [isMergingTreatments, setIsMergingTreatments] = useState(false);
  const [isCompilingPDF, setIsCompilingPDF] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [lassoBox, setLassoBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const isLassoingRef = useRef(false);
  const ignoreNextClickRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [isResizingPanels, setIsResizingPanels] = useState(false);
  const [studioMenuOpen, setStudioMenuOpen] = useState(false);
  const [toolsSheetOpen, setToolsSheetOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [recentZines, setRecentZines] = useState<ZineMetadata[]>([]);

  // Mobile: swipe between the Input (editor) and Cover pages
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const handleStudioTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    swipeStartRef.current = { x: t.clientX, y: t.clientY };
  };
  const handleStudioTouchEnd = (e: React.TouchEvent) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Only react to clearly-horizontal swipes so scrolling/typing is unaffected
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    if (dx < 0 && mobileStudioView === "editor") {
      setMobileStudioView("cover");
      playClick();
    } else if (dx > 0 && mobileStudioView === "cover") {
      setMobileStudioView("editor");
      playClick();
    }
  };

  // Mobile: two-dot page indicator (also tappable) shown above each page header
  const renderStudioPager = () =>
    isMobile ? (
      <div
        className="flex items-center justify-center gap-1 mb-2 select-none"
        role="tablist"
        aria-label="Studio pages"
      >
        {(["editor", "cover"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={mobileStudioView === v}
            aria-label={v === "editor" ? "Input page" : "Cover page"}
            onClick={() => {
              setMobileStudioView(v);
              playClick();
            }}
            className="px-2 py-2.5 flex items-center justify-center"
          >
            <span
              className={`block w-1.5 h-1.5 rounded-full bg-current transition-all duration-300 ${
                mobileStudioView === v
                  ? "opacity-100 scale-125 studio-text-ink"
                  : "opacity-30 studio-text-muted"
              }`}
            />
          </button>
        ))}
      </div>
    ) : null;

  // Shared detailed-brief field panel (used on desktop in the brief section,
  // and on mobile beneath the "Context Mimi will use" header via a deep link).
  const renderDetailedBriefPanel = () => (
    <AnimatePresence>
      {isBriefExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden w-full flex flex-col gap-3 bg-[#FAF9F6] dark:bg-[#11110F] border border-stone-300 dark:border-stone-700 p-3.5 rounded-sm shrink-0 shadow-lg"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Editorial Intention */}
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[7px] uppercase tracking-wider text-stone-700 dark:text-stone-300 font-bold">Editorial Intention</span>
              <textarea
                value={editorialIntention}
                onChange={(e) => setEditorialIntention(e.target.value)}
                placeholder="Conceptual focus or creative goal?"
                rows={2}
                className="w-full bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 p-2 text-[10px] font-sans rounded-xs focus:border-stone-700 dark:focus:border-stone-500 outline-none text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:placeholder:text-stone-500"
              />
            </div>

            {/* Central Tension */}
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[7px] uppercase tracking-wider text-stone-700 dark:text-stone-300 font-bold">Central Tension</span>
              <textarea
                value={centralTension}
                onChange={(e) => setCentralTension(e.target.value)}
                placeholder="The contradiction, question, or mystery..."
                rows={2}
                className="w-full bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 p-2 text-[10px] font-sans rounded-xs focus:border-stone-700 dark:focus:border-stone-500 outline-none text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:placeholder:text-stone-500"
              />
            </div>

            {/* Anchors & References */}
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[7px] uppercase tracking-wider text-stone-700 dark:text-stone-300 font-bold">Anchors & References</span>
              <input
                type="text"
                value={anchorsReferences}
                onChange={(e) => setAnchorsReferences(e.target.value)}
                placeholder="Objects, fragments, cultural citations..."
                className="w-full bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 p-2 text-[10px] font-sans rounded-xs focus:border-stone-700 dark:focus:border-stone-500 outline-none text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:placeholder:text-stone-500"
              />
            </div>

            {/* Desired Feeling */}
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[7px] uppercase tracking-wider text-stone-700 dark:text-stone-300 font-bold">Desired Feeling</span>
              <input
                type="text"
                value={desiredFeeling}
                onChange={(e) => setDesiredFeeling(e.target.value)}
                placeholder="Qualities, mood, evocative atmospheres..."
                className="w-full bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 p-2 text-[10px] font-sans rounded-xs focus:border-stone-700 dark:focus:border-stone-500 outline-none text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:placeholder:text-stone-500"
              />
            </div>

            {/* Avoid */}
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[7px] uppercase tracking-wider text-stone-700 dark:text-stone-300 font-bold">Avoid</span>
              <input
                type="text"
                value={avoidExclude}
                onChange={(e) => setAvoidExclude(e.target.value)}
                placeholder="Clichés, styles, or specific conclusions..."
                className="w-full bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 p-2 text-[10px] font-sans rounded-xs focus:border-stone-700 dark:focus:border-stone-500 outline-none text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:placeholder:text-stone-500"
              />
            </div>

            {/* Output Wanted */}
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[7px] uppercase tracking-wider text-stone-700 dark:text-stone-300 font-bold">Output Wanted</span>
              <select
                value={outputWanted}
                onChange={(e) => setOutputWanted(e.target.value)}
                className="w-full bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 p-2 text-[10px] font-sans rounded-xs focus:border-stone-700 dark:focus:border-stone-500 outline-none text-stone-900 dark:text-stone-100 cursor-pointer"
              >
                <option value="">Poetic Complete Concept (Default)</option>
                <option value="Issue Outline">Structured Issue Outline</option>
                <option value="Editorial Essay">Full Editorial Essay</option>
                <option value="Cover Design">Cover Plate Design Brief</option>
              </select>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const [recentZinesLoading, setRecentZinesLoading] = useState(false);
  const [linkedZineIds, setLinkedZineIds] = useState<string[]>([]);
  const panelResizeRef = useRef({ startX: 0, startWidth: 340 });

  useEffect(() => {
    let cancelled = false;
    const uid = currentUser?.uid || profile?.uid || "ghost";
    setRecentZinesLoading(true);
    void import("../services/firebaseUtils")
      .then(({ fetchUserZines }) => fetchUserZines(uid))
      .then((zines) => {
        if (!cancelled) setRecentZines(zines.slice(0, 8));
      })
      .catch((error) => {
        console.warn("MIMI // Continuum recent zines unavailable", error);
        if (!cancelled) setRecentZines([]);
      })
      .finally(() => {
        if (!cancelled) setRecentZinesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, profile?.uid]);

  // Cover zooming and panning mechanics
  const [coverZoom, setCoverZoom] = useState(1);
  const [coverPan, setCoverPan] = useState({ x: 0, y: 0 });
  const [isPanningCover, setIsPanningCover] = useState(false);
  const [coverPanStart, setCoverPanStart] = useState({ x: 0, y: 0 });
  const [coverInitialPan, setCoverInitialPan] = useState({ x: 0, y: 0 });

  // Derived batch metadata calculations for selected zines (style treatments)
  const selectedTreatments = (profile?.savedTreatments || []).filter((t: any) =>
    selectedTreatmentIds.includes(t.id)
  );

  const allSelectedTags = selectedTreatments.flatMap((t: any) => t.tags || []);
  const aggregateTagCount = allSelectedTags.length;
  const uniqueTags = Array.from(new Set(allSelectedTags));

  // Compute intersections of metadata categories across selected zines
  const findIntersection = (arrays: string[][]) => {
    if (arrays.length === 0) return [];
    let result = arrays[0] || [];
    for (let i = 1; i < arrays.length; i++) {
      const current = arrays[i] || [];
      result = result.filter((item: string) => current.includes(item));
    }
    return result;
  };

  const selectedMotifsArrays = selectedTreatments.map((t: any) => t.canonicalTaste?.motifs || []);
  const selectedMoodsArrays = selectedTreatments.map((t: any) => t.canonicalTaste?.mood || []);
  const selectedPalettesArrays = selectedTreatments.map((t: any) => t.canonicalTaste?.palette || []);

  const sharedMotifs = findIntersection(selectedMotifsArrays);
  const sharedMoods = findIntersection(selectedMoodsArrays);
  const sharedPalettes = findIntersection(selectedPalettesArrays);

  const uniqueMotifs = Array.from(new Set(selectedMotifsArrays.flat()));
  const uniqueMoods = Array.from(new Set(selectedMoodsArrays.flat()));
  const uniquePalettes = Array.from(new Set(selectedPalettesArrays.flat()));

  const handleCoverPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (coverZoom <= 1) return;
    e.stopPropagation();
    setIsPanningCover(true);
    setCoverPanStart({ x: e.clientX, y: e.clientY });
    setCoverInitialPan(coverPan);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleCoverPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanningCover) return;
    e.stopPropagation();
    const dx = e.clientX - coverPanStart.x;
    const dy = e.clientY - coverPanStart.y;
    setCoverPan({
      x: coverInitialPan.x + dx,
      y: coverInitialPan.y + dy
    });
  };

  const handleCoverPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanningCover) return;
    e.stopPropagation();
    setIsPanningCover(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleSplitPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      panelResizeRef.current = { startX: event.clientX, startWidth: coverPanelWidth };
      setIsResizingPanels(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [coverPanelWidth],
  );

  useEffect(() => {
    if (!isResizingPanels) return;
    const onMove = (event: PointerEvent) => {
      const delta = panelResizeRef.current.startX - event.clientX;
      const next = Math.min(520, Math.max(240, panelResizeRef.current.startWidth + delta));
      setCoverPanelWidth(next);
    };
    const onUp = () => setIsResizingPanels(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [isResizingPanels]);

  // --- Cybernoir Telemetry & Typewriter Suggestions ---
  const [isMobile, setIsMobile] = useState(false);
  const [isTasteDrawerOpen, setIsTasteDrawerOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState("100svh");
  const [telemetryX, setTelemetryX] = useState(128.5);
  const [telemetryY, setTelemetryY] = useState(44.2);
  const [entropy, setEntropy] = useState(0.841);
  const [typewriterIndex, setTypewriterIndex] = useState(0);
  const [typewriterText, setTypewriterText] = useState("");

  const promptList = [
    "RIGHT NOW, THE MATERIAL ANCHORING ME IS...",
    "THE LIGHT FELL ACROSS THE ROOM, REMINDING ME OF...",
    "WHAT IS THE DEFINING TEXTURE OR MATERIAL THAT ANCHORS YOUR MOOD?",
    "RECALL A SPECIFIC LIGHT, DYNAMIC, OR SHADOW THAT SHIFTED YOUR MOOD.",
    "WHICH SENSORY FRAGMENT ARE YOU ACTIVELY TRYING TO PRESERVE?",
    "LATELY, I KEEP RETURNING TO THE IDEA OF...",
  ];

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    setIsMobile(media.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        setViewportHeight(`${window.visualViewport.height}px`);
      }
    };
    handleResize();
    window.visualViewport?.addEventListener("resize", handleResize);
    window.addEventListener("resize", handleResize);
    return () => {
      window.visualViewport?.removeEventListener("resize", handleResize);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!input) {
      const interval = setInterval(() => {
        setTelemetryX((prev) => +(prev + (Math.random() - 0.5) * 2).toFixed(2));
        setTelemetryY((prev) => +(prev + (Math.random() - 0.5) * 2).toFixed(2));
        setEntropy(
          (prev) =>
            +Math.max(
              0.1,
              Math.min(0.99, prev + (Math.random() - 0.5) * 0.05),
            ).toFixed(3),
        );
      }, 600);
      return () => clearInterval(interval);
    } else {
      const uniqueChars = new Set(input).size;
      const calculatedEntropy = Math.min(0.99, Math.max(0.1, (uniqueChars / 28) * 0.75 + (input.length % 100) / 1000));
      setEntropy(Number(calculatedEntropy.toFixed(3)));

      const hash = Array.from(input).reduce((acc, char) => acc + char.charCodeAt(0), 0);
      setTelemetryX(Number((128.5 + (hash % 100) / 10).toFixed(2)));
      setTelemetryY(Number((44.2 + ((hash * 7) % 100) / 10).toFixed(2)));
    }
  }, [input]);

  useEffect(() => {
    if (input) return;
    let text = promptList[typewriterIndex];
    let charIndex = 0;
    let typingTimer: any;

    const typeNextChar = () => {
      if (charIndex <= text.length) {
        setTypewriterText(text.slice(0, charIndex));
        charIndex++;
        typingTimer = setTimeout(typeNextChar, 50);
      } else {
        typingTimer = setTimeout(() => {
          let eraseIndex = text.length;
          const erase = () => {
            if (eraseIndex >= 0) {
              setTypewriterText(text.slice(0, eraseIndex));
              eraseIndex--;
              typingTimer = setTimeout(erase, 20);
            } else {
              setTypewriterIndex((prev) => (prev + 1) % promptList.length);
            }
          };
          erase();
        }, 3000);
      }
    };

    typeNextChar();
    return () => clearTimeout(typingTimer);
  }, [typewriterIndex, input]);

  const mediaInputRef = useRef<HTMLInputElement>(null);
  const skipVoiceMemoRef = useRef(false);
  const {
    isRecording,
    audioBlob,
    startRecording: startRecordingHook,
    stopRecording,
    resetRecording,
  } = useRecorder();

  useEffect(() => {
    if (!audioBlob) return;
    if (skipVoiceMemoRef.current) {
      skipVoiceMemoRef.current = false;
      resetRecording();
      return;
    }

    const processMemo = async () => {
      setIsTranscribing(true);
      setTranscriptionStatus("transcribing");
      try {
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob);
        });

        const base64 = data.split(",")[1] || data;
        let transcription = "";
        try {
          transcription = await transcribeAudio(
            base64,
            audioBlob.type || "audio/webm",
          );
        } catch (e) {
          console.error("Transcription failed", e);
          setTranscriptionStatus("error");
          dispatchStudioAlert({message: "Voice memo transcription failed. Try again.",
                type: "error",
                icon: <AlertCircle size={14} />,});
          return;
        }

        const trimmed = transcription.trim();
        if (trimmed) {
          setInput((prev) => (prev ? `${prev}\n\n${trimmed}` : trimmed));
        }

        setMediaFiles((prev) => [
          ...prev,
          {
            type: "audio",
            url: URL.createObjectURL(audioBlob),
            data: data,
            mimeType: audioBlob.type || "audio/webm",
            name: `Voice Memo ${new Date().toLocaleTimeString()}`,
            transcription: trimmed || transcription,
          } as MediaFile,
        ]);

        setTranscriptionStatus("success");
      } catch (e) {
        console.error(e);
        setTranscriptionStatus("error");
        dispatchStudioAlert({message: "Voice memo could not be processed.",
              type: "error",
              icon: <AlertCircle size={14} />,});
      } finally {
        setIsTranscribing(false);
        resetRecording();
      }
    };

    processMemo();
  }, [audioBlob, resetRecording]);

  const handleShapeBrief = async () => {
    if (!input && !editorialIntention && !centralTension) return;
    setIsShapingBrief(true);
    playClick();
    try {
      let combinedInput = `SOURCE MATERIAL:\n${input}\n\n`;
      if (editorialIntention) combinedInput += `EDITORIAL INTENTION:\n${editorialIntention}\n\n`;
      if (centralTension) combinedInput += `CENTRAL TENSION:\n${centralTension}\n\n`;
      if (anchorsReferences) combinedInput += `ANCHORS & REFERENCES:\n${anchorsReferences}\n\n`;
      if (desiredFeeling) combinedInput += `DESIRED FEELING:\n${desiredFeeling}\n\n`;
      if (avoidExclude) combinedInput += `AVOID:\n${avoidExclude}\n\n`;
      if (outputWanted) combinedInput += `OUTPUT WANTED:\n${outputWanted}\n\n`;

      const presetContext = activeCognitivePersona
        ? `${activeCognitivePersona.title}: ${activeCognitivePersona.briefInstruction} (required output: ${activeCognitivePersona.outputContract.join(", ")})`
        : undefined;
      const result = await shapeBrief(combinedInput.trim(), apiKeys?.gemini || undefined, presetContext);
      setShapedBriefResult({
        preservedLanguage: coerceToString(result.preservedLanguage),
        proposedDirection: coerceToString(result.proposedDirection),
        inferredAnchors: coerceToString(result.inferredAnchors),
        openQuestions: coerceToString(result.openQuestions),
      });
      setIsEditingReview(false);
      setShowShapeReview(true);
    } catch (err) {
      console.error("MIMI // Error shaping brief:", err);
      dispatchStudioAlert({message: "Brief shaping failed.",
            type: "error",
            icon: <AlertCircle size={14} />,});
    } finally {
      setIsShapingBrief(false);
    }
  };

  const { handleFileChange, handleOverlayLogoUpload } = useMediaUpload({
    setMediaFiles,
    setCoverOverlayLayers,
    setCoverOverlay,
  });

  const { handleUrlDrop } = useUrlIngest({
    onUrlAppend: (url) => setInput((prev) => (prev ? `${prev}\n${url}` : url)),
  });

  const triggerAccession = useCallback((isQuickPreview = false) => {
    let finalInput = input;
    if (activeThread && activeThread.narrative) {
      finalInput = `${input}\n\n[THREAD CONTEXT: ${activeThread.narrative}]`;
    }

    const briefSegments: string[] = [];
    if (editorialIntention) briefSegments.push(`EDITORIAL INTENTION: ${editorialIntention}`);
    if (centralTension) briefSegments.push(`CENTRAL TENSION: ${centralTension}`);
    if (anchorsReferences) briefSegments.push(`ANCHORS & REFERENCES: ${anchorsReferences}`);
    if (desiredFeeling) briefSegments.push(`DESIRED FEELING: ${desiredFeeling}`);
    if (avoidExclude) briefSegments.push(`AVOID: ${avoidExclude}`);
    if (outputWanted) briefSegments.push(`OUTPUT WANTED: ${outputWanted}`);
    if (briefSegments.length > 0) {
      finalInput = `[STRUCTURED BRIEF — directives for this issue]\n${briefSegments.join("\n")}\n\n[SOURCE MATERIAL]\n${finalInput}`;
    }

    const linkedZines = recentZines.filter((zine) => linkedZineIds.includes(zine.id));
    if (linkedZines.length > 0) {
      const continuumBlock = linkedZines
        .map((zine) => {
          const priorMaterial = zine.summary || zine.concept || zine.originalInput || zine.title;
          return `- ${zine.title} [${zine.id}]: ${priorMaterial.slice(0, 500)}`;
        })
        .join("\n");
      finalInput = `[CONTINUUM — linked prior zines]\n${continuumBlock}\n\nContinue the editorial thread without repeating the prior piece.\n\n${finalInput}`;
    }

    if (activeTags.length > 0) {
      finalInput = `[ANCHOR TAGS ACTIVE]: ${activeTags.join(", ")}\n\n${finalInput}`;
    }

    if (activeCognitivePersona) {
      finalInput = `[WORKTABLE BRIEF PRESET: ${activeCognitivePersona.title}]
Intent: ${activeCognitivePersona.briefInstruction}
Required output: ${activeCognitivePersona.outputContract.join(", ")}
Gateway capability: ${activeCognitivePersona.gatewayCapability}
Routing policy: AI Gateway selects a compatible connected provider and records the resolved route after execution.

${finalInput}`;
    }

    if (activeTreatmentId && profile?.savedTreatments) {
      const treatment = profile.savedTreatments.find(
        (t) => t.id === activeTreatmentId,
      );
      if (treatment) {
        finalInput = `[TREATMENT FILTER ACTIVE: ${treatment.treatmentName}]\nMotifs: ${coerceToString(treatment.canonicalTaste?.motifs)}\nPalette: ${coerceToString(treatment.canonicalTaste?.palette)}\nMood: ${coerceToString(treatment.canonicalTaste?.mood)}\n\n${finalInput}`;
      }
    }

    const approvedContext = getApprovedUsedContext("studio", currentUser?.uid);
    if (approvedContext.length > 0) {
      const block = approvedContext
        .map(
          (entry) =>
            `- ${entry.title} (${entry.source || "Scribe"}): ${entry.content}`,
        )
        .join("\n");
      finalInput = `[SCRIBE USED CONTEXT — user-approved atoms]\n${block}\n\n${finalInput}`;
    }

    if (studioDoll.enabled && studioDoll.dollPromptContext) {
      finalInput = `${studioDoll.dollPromptContext}\n\n${finalInput}`;
    }

    const coverExport = buildStudioCoverExportMeta(
      mediaFiles,
      coverOverlayLayers,
      coverOverlay,
    );

    onRefine(finalInput, mediaFiles, selectedTone || "CONTENT", {
      deepThinking,
      isPublic: false,
      isLite: isQuickPreview ? true : liteMode,
      isQuickPreview,
      bypassTailor: !useTailorProfile,
      isHighFidelity,
      useSearch,
      useMaps,
      taskMode,
      usedContext: approvedContext,
      activeDoll: studioDoll.activeDoll,
      dollPromptContext: studioDoll.dollPromptContext,
      studioCoverUrl: coverExport.coverImageUrl,
      studioCoverOverlays: coverExport.studioCoverOverlays,
      lineage: linkedZineIds,
      zineOptions: {
        ...zineOptions,
        customTitle: title,
        selectedTreatmentId:
          activeTreatmentId || zineOptions.selectedTreatmentId,
        temperature: activeCognitivePersona?.temperature,
      },
    });

    localStorage.removeItem("mimi_draft_input");
    localStorage.removeItem("mimi_draft_title");
  }, [
    onRefine,
    input,
    mediaFiles,
    selectedTone,
    deepThinking,
    liteMode,
    useTailorProfile,
    isHighFidelity,
    useSearch,
    useMaps,
    taskMode,
    zineOptions,
    title,
    activeThread,
    activeTreatmentId,
    profile,
    activeCognitivePersona,
    studioDoll.enabled,
    studioDoll.dollPromptContext,
    studioDoll.activeDoll,
    coverOverlay,
    coverOverlayLayers,
    mediaFiles,
    linkedZineIds,
    recentZines,
  ]);

  const handleComposeCover = useCallback(async () => {
    setIsComposingCover(true);
    setComposeCoverError(null);
    playClick();
    try {
      // Compile prompt from progressive fields if provided
      let prompt = "";
      const parts = [];
      if (coverSubject) parts.push(`Subject: ${coverSubject}`);
      if (coverComposition) parts.push(`Composition: ${coverComposition}`);
      if (coverMood) parts.push(`Mood: ${coverMood}`);
      if (coverAvoid) parts.push(`Avoid: ${coverAvoid}`);

      if (parts.length > 0) {
        prompt = parts.join(" ○ ");
      } else {
        prompt =
          leftPrompt.trim() ||
          title?.trim() ||
          input.trim().slice(0, 320) ||
          "Editorial zine cover plate with cinematic composition and title-safe negative space";
      }

      // Find the first user-uploaded reference file (not the generated cover) to use as reference
      const userUploadedRef = mediaFiles.find((m) => m.name !== "composed-cover" && m.type === "image");
      const reference = userUploadedRef ? await mediaFileToImageReference(userUploadedRef) : undefined;
      
      const result = await generateStudioCover({
        prompt,
        title: title || undefined,
        author: authorName || undefined,
        reference,
        provider: coverProvider,
        apiKey:
          coverProvider === "openai"
            ? undefined
            : apiKeys?.[coverProvider],
        openaiKey:
          coverProvider === "openai"
            ? apiKeys?.openai
            : undefined,
        treatmentLabel: getTreatmentLabel(activeTreatmentId, profile?.savedTreatments),
        tailorContext: useTailorProfile ? profile?.tailorDraft : undefined,
      });

      const imageUrl = result.imageUrl;
      if (result.provider === "simulated") {
        const providerWarning = result.warnings?.find((warning) =>
          warning.toLowerCase().includes("fallback"),
        );
        setComposeCoverError(
          providerWarning ||
            "The configured image provider was unavailable, so Mimi created a simulated preview.",
        );
      }
      
      setMediaFiles((prev) => {
        const cleanPrev = prev.filter((item) => item.name !== "composed-cover");
        return [
          {
            type: "image",
            url: imageUrl,
            data: imageUrl.startsWith("data:") ? imageUrl : "",
            mimeType: result.mimeType || "image/png",
            name: "composed-cover",
          },
          ...cleanPrev,
        ];
      });

      if (leftPrompt.trim()) {
        setLeftPrompt("");
      }
    } catch (error) {
      console.error("MIMI // Studio cover compose failed:", error);
      setComposeCoverError(
        error instanceof Error ? error.message : "Cover generation failed. Try uploading a reference first.",
      );
    } finally {
      setIsComposingCover(false);
    }
  }, [
    activeTreatmentId,
    apiKeys,
    authorName,
    coverProvider,
    input,
    leftPrompt,
    mediaFiles,
    playClick,
    profile?.tailorDraft,
    title,
    useTailorProfile,
    coverSubject,
    coverComposition,
    coverMood,
    coverAvoid,
  ]);

  const handleBatchDeleteTreatments = async () => {
    if (selectedTreatmentIds.length === 0) return;
    if (!profile) return;
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the ${selectedTreatmentIds.length} selected style treatment(s)? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      const remaining = (profile.savedTreatments || []).filter(
        (t: any) => !selectedTreatmentIds.includes(t.id)
      );
      
      await updateProfile({ ...profile, savedTreatments: remaining });
      
      // If the active treatment is one of the deleted ones, reset it
      if (activeTreatmentId && selectedTreatmentIds.includes(activeTreatmentId)) {
        setActiveTreatmentId(null);
      }
      
      setSelectedTreatmentIds([]);
      setIsTreatmentSelectMode(false);
      playClick();
      
      dispatchStudioAlert({message: "Aesthetic style(s) deleted successfully.",
            type: "success",});
    } catch (error) {
      console.error("MIMI // Failed to delete style treatments:", error);
      dispatchStudioAlert({message: "Failed to delete aesthetic style(s).",
            type: "error",});
    }
  };

  const handleBatchExportTreatments = () => {
    if (selectedTreatmentIds.length === 0) return;
    if (!profile) return;

    try {
      const selectedTreatments = (profile.savedTreatments || []).filter(
        (t: any) => selectedTreatmentIds.includes(t.id)
      );

      // 1. Download as a JSON file
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedTreatments, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `mimi_exported_treatments_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      // 2. Copy formatted JSON to clipboard
      const jsonText = JSON.stringify(selectedTreatments, null, 2);
      navigator.clipboard.writeText(jsonText).then(() => {
        dispatchStudioAlert({message: `${selectedTreatmentIds.length} style(s) exported. JSON downloaded and copied to clipboard.`,
              type: "success",});
      }).catch((err) => {
        console.warn("Failed to copy JSON to clipboard", err);
        dispatchStudioAlert({message: `${selectedTreatmentIds.length} style(s) exported. JSON downloaded.`,
              type: "success",});
      });

      setSelectedTreatmentIds([]);
      setIsTreatmentSelectMode(false);
      playClick();
    } catch (error) {
      console.error("MIMI // Failed to export style treatments:", error);
      dispatchStudioAlert({message: "Failed to export aesthetic style(s).",
            type: "error",});
    }
  };

  const handleBatchMergeTreatments = async () => {
    if (selectedTreatmentIds.length === 0) return;
    if (!profile) return;

    try {
      setIsMergingTreatments(true);
      setMergeError(null);
      playClick();

      const selectedTreatments = (profile.savedTreatments || []).filter(
        (t: any) => selectedTreatmentIds.includes(t.id)
      );

      const mergedTreatment = await mergeStyleTreatments(
        selectedTreatments,
        profile,
        apiKeys?.gemini || undefined
      );

      const updatedTreatments = [mergedTreatment, ...(profile.savedTreatments || [])];
      await updateProfile({ ...profile, savedTreatments: updatedTreatments });

      setSelectedTreatmentIds([]);
      setIsTreatmentSelectMode(false);
      playClick();

      dispatchStudioAlert({message: `Combined ${selectedTreatments.length} covers into a single unified editorial document: "${mergedTreatment.treatmentName}"`,
            type: "success",});
    } catch (error: any) {
      console.error("MIMI // Failed to merge style treatments:", error);
      setMergeError(error?.message || "Failed to merge styles.");
      dispatchStudioAlert({message: "Failed to merge aesthetic style(s).",
            type: "error",});
    } finally {
      setIsMergingTreatments(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (selectedTreatmentIds.length === 0) return;
    if (!profile) return;

    try {
      setIsCompilingPDF(true);
      playClick();

      const selectedTreatments = (profile.savedTreatments || []).filter(
        (t: any) => selectedTreatmentIds.includes(t.id)
      );

      const response = await fetch("/api/batch-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ treatments: selectedTreatments }),
      });

      if (!response.ok) {
        throw new Error("Failed to compile PDF document on server.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `mimi_style_compilation_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      window.URL.revokeObjectURL(url);

      dispatchStudioAlert({message: `Successfully compiled and downloaded PDF for ${selectedTreatments.length} style(s).`,
            type: "success",});
    } catch (error: any) {
      console.error("MIMI // Failed to compile PDF:", error);
      dispatchStudioAlert({message: "Failed to compile style compilation PDF.",
            type: "error",});
    } finally {
      setIsCompilingPDF(false);
    }
  };

  const handleBatchAddTags = async () => {
    if (selectedTreatmentIds.length === 0 || !batchTagInput.trim()) return;
    if (!profile) return;

    try {
      playClick();
      const newTags = batchTagInput
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      if (newTags.length === 0) return;

      const updatedTreatments = (profile.savedTreatments || []).map((t: any) => {
        if (selectedTreatmentIds.includes(t.id)) {
          const currentTags = t.tags || [];
          const mergedTags = Array.from(new Set([...currentTags, ...newTags]));
          return { ...t, tags: mergedTags };
        }
        return t;
      });

      await updateProfile({ ...profile, savedTreatments: updatedTreatments });
      setBatchTagInput("");

      dispatchStudioAlert({message: `Successfully tagged ${selectedTreatmentIds.length} style(s) with: ${newTags.join(", ")}`,
            type: "success",});
    } catch (error: any) {
      console.error("MIMI // Failed to add batch tags:", error);
      dispatchStudioAlert({message: "Failed to apply tags to selected style(s).",
            type: "error",});
    }
  };

  const handleBatchClearTags = async () => {
    if (selectedTreatmentIds.length === 0) return;
    if (!profile) return;

    try {
      playClick();
      const updatedTreatments = (profile.savedTreatments || []).map((t: any) => {
        if (selectedTreatmentIds.includes(t.id)) {
          return { ...t, tags: [] };
        }
        return t;
      });

      await updateProfile({ ...profile, savedTreatments: updatedTreatments });

      dispatchStudioAlert({message: `Cleared all tags from ${selectedTreatmentIds.length} style(s).`,
            type: "success",});
    } catch (error: any) {
      console.error("MIMI // Failed to clear batch tags:", error);
      dispatchStudioAlert({message: "Failed to clear tags.",
            type: "error",});
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isTreatmentSelectMode) return;
    
    // Only handle left clicks
    if (e.button !== 0) return;

    const container = gridContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    
    // Calculate start coordinates relative to the grid container, factoring in scroll state
    const startX = e.clientX - rect.left + container.scrollLeft;
    const startY = e.clientY - rect.top + container.scrollTop;

    dragStartRef.current = { x: startX, y: startY };
    isLassoingRef.current = false;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartRef.current) return;

      const currentX = moveEvent.clientX - rect.left + container.scrollLeft;
      const currentY = moveEvent.clientY - rect.top + container.scrollTop;

      const dx = currentX - dragStartRef.current.x;
      const dy = currentY - dragStartRef.current.y;

      // Establish a dragging threshold of 5px to distinguish drag-to-select from direct clicks
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isLassoingRef.current = true;
      }

      if (isLassoingRef.current) {
        const left = Math.min(dragStartRef.current.x, currentX);
        const top = Math.min(dragStartRef.current.y, currentY);
        const width = Math.abs(dragStartRef.current.x - currentX);
        const height = Math.abs(dragStartRef.current.y - currentY);

        setLassoBox({ left, top, width, height });

        // Calculate marquee bounding box in viewport coordinates
        const marqueeLeft = Math.min(e.clientX, moveEvent.clientX);
        const marqueeTop = Math.min(e.clientY, moveEvent.clientY);
        const marqueeWidth = Math.abs(e.clientX - moveEvent.clientX);
        const marqueeHeight = Math.abs(e.clientY - moveEvent.clientY);

        const buttons = container.querySelectorAll("[data-treatment-id]");
        const newlySelected: string[] = [];

        buttons.forEach((btn) => {
          const btnRect = btn.getBoundingClientRect();
          const intersects = !(
            btnRect.right < marqueeLeft ||
            btnRect.left > marqueeLeft + marqueeWidth ||
            btnRect.bottom < marqueeTop ||
            btnRect.top > marqueeTop + marqueeHeight
          );
          if (intersects) {
            const id = btn.getAttribute("data-treatment-id");
            if (id) newlySelected.push(id);
          }
        });

        setSelectedTreatmentIds(newlySelected);
      }
    };

    const handleMouseUp = () => {
      if (isLassoingRef.current) {
        ignoreNextClickRef.current = true;
      }
      dragStartRef.current = null;
      setLassoBox(null);

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleBatchAnalyze = async () => {
    const indices = Array.from(selectedMediaIndices);
    for (const index of indices) {
      const media = mediaFiles[index];
      if (media.type !== "image") continue;
      setIsAnalyzing((prev) => ({ ...prev, [index]: true }));
      try {
        const base64 = media.data.split(",")[1] || media.data;
        const [tags, aesthetic] = await Promise.all([
          generateTagsFromMedia(undefined, [
            { type: "image", data: base64, mimeType: "image/png" },
          ]),
          analyzeImageAesthetic(base64, "image/png", profile),
        ]);
        let deltaVerdict = undefined;
        if (profile?.tasteProfile?.aestheticSignature && aesthetic) {
          deltaVerdict = await analyzeAestheticDelta(
            profile.tasteProfile.aestheticSignature,
            aesthetic,
          );
        }
        setMediaAnalysis((prev) => ({
          ...prev,
          [index]: { tags, aesthetic, deltaVerdict },
        }));
      } catch (e) {
        console.error(e);
      } finally {
        setIsAnalyzing((prev) => ({ ...prev, [index]: false }));
      }
    }
    setSelectedMediaIndices(new Set());
  };

  const handleBatchRefract = async () => {
    const indices = Array.from(selectedMediaIndices);
    for (const index of indices) {
      const media = mediaFiles[index];
      if (media.type !== "image") continue;
      try {
        const base64 = media.data.split(",")[1] || media.data;
        const stylePrompt = coerceToString(
          mediaAnalysis[index]?.aesthetic?.culturalReferences,
        ) || "avant-garde";
        const transformed = await applyAestheticRefraction(
          media.data,
          stylePrompt,
          profile,
        );
        setMediaFiles((prev) =>
          prev.map((m, i) => (i === index ? { ...m, data: transformed } : m)),
        );
      } catch (e) {
        console.error(e);
      }
    }
    setSelectedMediaIndices(new Set());
  };

  const handleBatchExport = async () => {
    const indices = Array.from(selectedMediaIndices);
    const selectedMedia = indices.map((i) => mediaFiles[i]);

    try {
      const itemIds = [];
      for (const media of selectedMedia) {
        let finalUrl = media.url || media.data;
        if (currentUser?.uid && media.data) {
          try {
            const { archiveManager } =
              await import("../services/archiveManager");
            const path = `pocket_images/${currentUser.uid}_${Date.now()}_${media.name || "batch"}`;
            finalUrl = await archiveManager.uploadMedia(
              currentUser.uid,
              media.data,
              path,
            );
          } catch (e) {
            console.warn("Failed to upload batch media to storage", e);
            finalUrl = media.data; // fallback to base64
          }
        }

        const { archiveManager } = await import("../services/archiveManager");
        const id = await archiveManager.saveToPocket(
          currentUser?.uid || "ghost",
          media.type as any,
          {
            imageUrl: media.type === "image" ? finalUrl : undefined,
            audioUrl: media.type === "audio" ? finalUrl : undefined,
            videoUrl: media.type === "video" ? finalUrl : undefined,
            linkUrl: media.type === "file" ? finalUrl : undefined,
            prompt: media.name || "Batch Export",
            timestamp: Date.now(),
            origin: "InputStudio_Batch",
          },
        );
        if (id) itemIds.push(id);
      }

      if (itemIds.length > 0) {
        await createMoodboard(
          currentUser?.uid || "ghost",
          `Collection ${new Date().toLocaleDateString()}`,
          itemIds,
        );
        dispatchStudioAlert({message: "Collection Saved to Pocket.",
              icon: <FolderPlus size={14} />,});
      }
    } catch (e) {
      console.error(e);
    }
    setSelectedMediaIndices(new Set());
  };

  const startRecording = () => {
    if (isTranscribing) return;
    if (isRecording) {
      stopRecording();
    } else {
      setTranscriptionStatus("idle");
      startRecordingHook();
    }
  };

  const cancelVoiceMemo = () => {
    skipVoiceMemoRef.current = true;
    if (isRecording) {
       stopRecording();
    } else {
       resetRecording();
    }
    setTranscriptionStatus("idle");
    setIsTranscribing(false);
  };

  const handleDictationToggle = async () => {
    const SpeechRecognitionObj = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionObj) {
      dispatchStudioAlert({message: "Web Speech API is not supported in this browser. Try Chrome or Safari.",
            type: "error",});
      return;
    }

    if (isRecording) {
      // cancel voice memo if it is running
      cancelVoiceMemo();
    }

    if (isDictating) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsDictating(false);
    } else {
      // Prompt for microphone permission first to prevent browser silent blocking
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Stop stream so speech recognition can bind to mic cleanly
          micStream.getTracks().forEach((track) => track.stop());
        } catch (micErr: any) {
          console.warn("Microphone permission check failed:", micErr);
          dispatchStudioAlert({message: "Microphone permission required. Please allow mic access or open app in a new tab.",
                type: "warning",});
          setIsDictating(false);
          return;
        }
      }

      try {
        const rec = new SpeechRecognitionObj();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";

        rec.onstart = () => {
          setIsDictating(true);
          setDictationInterim("");
        };

        rec.onresult = (event: any) => {
          let interimText = "";
          let finalText = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalText += transcript + " ";
            } else {
              interimText += transcript;
            }
          }

          if (finalText) {
            setInput((prev) => {
              const base = prev ? prev.trim() : "";
              return base ? `${base} ${finalText.trim()}` : finalText.trim();
            });
          }
          setDictationInterim(interimText);
        };

        rec.onerror = (err: any) => {
          console.error("Speech recognition error:", err);
          setIsDictating(false);
          setDictationInterim("");

          const errType = err.error || err.type;
          if (errType === "not-allowed" || errType === "service-not-allowed") {
            dispatchStudioAlert({message: "Microphone access blocked. Please allow mic permissions in browser settings.",
                  type: "warning",});
          } else if (errType !== "aborted" && errType !== "no-speech") {
            dispatchStudioAlert({message: `Dictation notice: ${errType}`,
                  type: "info",});
          }
        };

        rec.onend = () => {
          setIsDictating(false);
          setDictationInterim("");
        };

        recognitionRef.current = rec;
        rec.start();
      } catch (e: any) {
        console.error("Failed to start dictation:", e);
        setIsDictating(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const [activeProvocation, setActiveProvocation] = useState<string | null>(
    null,
  );
  const [activePanel, setActivePanel] = useState<
    | "signal"
    | "treatments"
    | "continuum"
    | "orchestrator"
    | "procurement"
    | "inspo"
    | "telemetry"
    | "translation"
    | null
  >(null);

  const [usedContextQueue, setUsedContextQueue] = useState(() =>
    getUsedContext("studio", currentUser?.uid),
  );
  const { theme: studioTheme, setTheme: setStudioTheme } = useStudioTheme();
  const { applyPalette } = useTheme();

  useEffect(() => {
    applyPalette(studioTheme === "dark" ? "Studio Night" : "Studio Light");
  }, [studioTheme, applyPalette]);

  const handleToggleStudioTheme = () => {
    const next = studioTheme === "light" ? "dark" : "light";
    setStudioTheme(next);
    applyPalette(next === "dark" ? "Studio Night" : "Studio Light");
  };

  useEffect(() => {
    return subscribeUsedContext(() => {
      const queue = getUsedContext("studio", currentUser?.uid);
      setUsedContextQueue(queue);
      const newest = queue.find(
        (entry) => !entry.approved && Date.now() - entry.addedAt < 4000,
      );
      if (newest) {
        setActivePanel("orchestrator");
      }
    });
  }, [currentUser?.uid]);

  const togglePanel = (
    mode:
      | "signal"
      | "treatments"
      | "continuum"
      | "orchestrator"
      | "procurement"
      | "inspo"
      | "telemetry"
      | "translation",
  ) => {
    if (activePanel === mode) {
      setActivePanel(null);
    } else {
      setActivePanel(mode);
    }
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const [currentTime, setCurrentTime] = useState("10/8/2026 ○ 2:18PM");

  useEffect(() => {
    const updateClock = () => {
      const d = new Date();
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = d.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const minStr = minutes < 10 ? `0${minutes}` : minutes;
      setCurrentTime(`${month}/${day}/${year} ○ ${hours}:${minStr}${ampm}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleFileChange({ target: { files: e.dataTransfer.files } } as any);
        } else {
          const url =
            e.dataTransfer.getData("text/uri-list") ||
            e.dataTransfer.getData("text/plain");
          if (url) {
            handleUrlDrop(url);
          }
        }
      }}
      style={{ height: isMobile ? viewportHeight : "100%" }}
      data-studio-theme={studioTheme}
      className="studio-worktable w-full h-full min-h-0 flex flex-col overflow-hidden relative"
    >
      <StudioChrome
        theme={studioTheme}
        onToggleTheme={handleToggleStudioTheme}
        onOpenMenu={() => setStudioMenuOpen(true)}
        mobileStudioView={mobileStudioView}
        onMobileStudioViewChange={setMobileStudioView}
        isMobile={isMobile}
        viewMode="studio"
        isGenerating={isThinking || isGeneratingPrompt}
      />
      {/* MAIN STUDIO AREA */}
      <div
        className="flex-1 w-full flex overflow-hidden relative pb-14 md:pb-14"
        style={isMobile ? { paddingBottom: 'calc(44px + 64px + env(safe-area-inset-bottom, 0px))' } : undefined}
        {...(isMobile
          ? { onTouchStart: handleStudioTouchStart, onTouchEnd: handleStudioTouchEnd }
          : {})}
      >
        
        {/* COLUMN 2: INPUT / EDITOR */}
        {(!isMobile || mobileStudioView === "editor") && (
          <div className="flex-1 min-w-0 h-full flex overflow-hidden studio-bg-workspace border-r border-dotted studio-divider">
            {/* 3a: Vertical Icon Rail */}
            <div className="studio-rail w-[50px] studio-bg-surface border-r studio-border hidden md:flex flex-col items-center justify-start py-4 gap-2.5 shrink-0 overflow-y-auto md:overflow-visible no-scrollbar max-h-full">
              
              {/* Icon 1: Attachment clip */}
              <button
                onClick={() => mediaInputRef.current?.click()}
                data-tip="Attach Media Artifact"
                aria-label="Attach Media Artifact"
                className="w-8 h-8 rounded-none border studio-icon-btn flex items-center justify-center transition-all"
              >
                <Paperclip size={14} />
              </button>

              {/* Icon 2: Voice memo */}
              <button
                type="button"
                onClick={() => {
                  startRecording();
                  playClick();
                }}
                disabled={isTranscribing}
                data-tip={
                  isTranscribing
                    ? "Transcribing voice memo..."
                    : isRecording
                      ? "Stop recording"
                      : "Record voice memo"
                }
                aria-label={
                  isTranscribing
                    ? "Transcribing voice memo..."
                    : isRecording
                      ? "Stop recording"
                      : "Record voice memo"
                }
                className={`w-8 h-8 rounded-none border flex items-center justify-center transition-all ${
                  isTranscribing
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                    : isRecording
                      ? "border-red-500/50 bg-red-500/10 text-red-400 animate-pulse"
                      : "studio-icon-btn"
                }`}
              >
                {isTranscribing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : isRecording ? (
                  <Square size={12} fill="currentColor" />
                ) : (
                  <Mic size={14} />
                )}
              </button>

              {/* Icon 2.5: Live dictation (Web Speech API) */}
              <button
                type="button"
                onClick={() => {
                  handleDictationToggle();
                  playClick();
                }}
                data-tip={isDictating ? "Stop live dictation" : "Dictate narrative live"}
                aria-label={isDictating ? "Stop live dictation" : "Dictate narrative live"}
                className={`w-8 h-8 rounded-none border flex items-center justify-center transition-all ${
                  isDictating
                    ? "border-red-500 bg-red-500/20 text-red-500 animate-pulse"
                    : "studio-icon-btn"
                }`}
              >
                <Radio size={14} className={isDictating ? "animate-pulse" : ""} />
              </button>

              {/* Icon 3: Arrow back */}
              <button
                onClick={() => {
                  setActiveThread(null);
                  setInput("");
                  playClick();
                }}
                data-tip="Reset Workspace"
                aria-label="Reset Workspace"
                className="w-8 h-8 rounded-none border studio-icon-btn flex items-center justify-center transition-all"
              >
                <ChevronLeft size={14} />
              </button>

              <div className="w-4 h-[1px] bg-stone-850 my-1" />

              {/* Icon 3: Zap */}
              <button
                onClick={() => {
                  handleAutoGenerateTitle();
                  playClick();
                }}
                data-tip="Whip Title Spark"
                aria-label="Whip Title Spark"
                className="w-8 h-8 rounded-none border studio-icon-btn flex items-center justify-center transition-all"
              >
                <Zap size={14} />
              </button>

              {/* Icon 4: Brain */}
              <button
                onClick={() => {
                  setDeepThinking(!deepThinking);
                  playClick();
                }}
                data-tip="Superintelligence Engine"
                aria-label="Superintelligence Engine"
                className={`w-8 h-8 rounded-none border flex items-center justify-center transition-all ${
                  deepThinking 
                    ? "border-purple-500/50 bg-purple-500/10 text-purple-400" 
                    : "border-transparent text-stone-500 hover:border-stone-800 hover:bg-stone-900/40 hover:text-stone-200"
                }`}
              >
                <BrainCircuit size={14} />
              </button>

              {/* Icon 5: Globe */}
              <button
                onClick={() => {
                  setUseSearch(!useSearch);
                  playClick();
                }}
                data-tip="Semantic Web Grounding"
                aria-label="Semantic Web Grounding"
                className={`w-8 h-8 rounded-none border flex items-center justify-center transition-all ${
                  useSearch 
                    ? "border-blue-500/50 bg-blue-500/10 text-blue-400" 
                    : "border-transparent text-stone-500 hover:border-stone-800 hover:bg-stone-900/40 hover:text-stone-200"
                }`}
              >
                <Globe size={14} />
              </button>

              {/* Icon 6: Eye */}
              <button
                onClick={() => {
                  togglePanel("telemetry");
                  playClick();
                }}
                data-tip="System Optics"
                aria-label="System Optics"
                className="w-8 h-8 rounded-none border studio-icon-btn flex items-center justify-center transition-all"
              >
                <Eye size={14} />
              </button>

              {/* Icon 7: Sparkles */}
              <button
                onClick={async () => {
                  setIsGeneratingPrompt(true);
                  try {
                    const newPrompt = await generateAutoAwesomePrompt();
                    setInput(newPrompt);
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setIsGeneratingPrompt(false);
                  }
                  playClick();
                }}
                data-tip="Generate Aesthetic Spark"
                aria-label="Generate Aesthetic Spark"
                className={`w-8 h-8 rounded-none border flex items-center justify-center transition-all ${
                  isGeneratingPrompt 
                    ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-400 animate-pulse" 
                    : "border-transparent text-stone-500 hover:border-stone-800 hover:bg-stone-900/40 hover:text-stone-200"
                }`}
              >
                <Sparkles size={14} />
              </button>

              {/* Icon 8: Doll identity */}
              <StudioDollToggle
                enabled={studioDoll.enabled}
                loading={studioDoll.loading}
                dolls={studioDoll.dolls}
                activeDollId={studioDoll.activeDollId}
                onToggle={(next) => {
                  studioDoll.toggleDollInjection(next);
                  playClick();
                }}
                onSelectDoll={(id) => {
                  studioDoll.setActiveDollId(id);
                  playClick();
                }}
              />

              {/* Icon 9: Scissors */}
              <button
                onClick={() => {
                  setUseTailorProfile(!useTailorProfile);
                  playClick();
                }}
                data-tip="Custom Tailor Override"
                aria-label="Custom Tailor Override"
                className={`w-8 h-8 rounded-none border flex items-center justify-center transition-all ${
                  !useTailorProfile 
                    ? "border-orange-500/50 bg-orange-500/10 text-orange-400" 
                    : "border-transparent text-stone-500 hover:border-stone-800 hover:bg-stone-900/40 hover:text-stone-200"
                }`}
              >
                <Scissors size={14} />
              </button>

              <div className="w-4 h-[1px] bg-stone-850 my-1" />

              {/* Icon 9: FileText */}
              <button
                onClick={() => {
                  setShowColophon(true);
                  playClick();
                }}
                data-tip="Review Manifesto Colophon"
                aria-label="Review Manifesto Colophon"
                className="w-8 h-8 rounded-none border studio-icon-btn flex items-center justify-center transition-all"
              >
                <FileText size={14} />
              </button>

              {/* Icon 10: Paintbrush */}
              <button
                onClick={() => {
                  togglePanel("treatments");
                  playClick();
                }}
                data-tip="Preset Treatments Canvas"
                aria-label="Preset Treatments Canvas"
                className="w-8 h-8 rounded-none border studio-icon-btn flex items-center justify-center transition-all"
              >
                <Paintbrush size={14} />
              </button>
            </div>

            {/* 3b: Center Dark Text Area */}
            <div className={`flex-1 flex flex-col items-center px-6 relative overflow-y-auto no-scrollbar ${isMobile ? "justify-start gap-3 pt-6 pb-44" : "justify-between py-12"}`}>
              
              {/* Practical creator promise with an editorial Mimi accent. */}
              <div className="text-center studio-text-muted mb-6 select-none flex flex-col items-center gap-1.5 shrink-0">
                {renderStudioPager()}
                <span>{currentTime}</span>
                {activeThread ? (
                  <span className="font-mono uppercase studio-text-ink text-[8px] border studio-border studio-bg-surface px-2 py-0.5 tracking-[0.2em] font-bold">
                    WEAVING // {activeThread.title}
                  </span>
                ) : (
                  <span className="font-mono text-[9px] uppercase tracking-[0.22em]">PROMPT CYCLE {promptIndex + 1}</span>
                )}
                
                <div className="w-16 h-px studio-rail-track my-1.5" />
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] font-bold text-amber-600 dark:text-amber-400">
                  From fragment to finished issue
                </span>
                <h1 className="font-serif italic text-2xl md:text-3xl leading-tight studio-text-ink max-w-xl">
                  Turn source material into an editorial issue.
                </h1>
                <p className="font-sans text-[12px] tracking-wide text-stone-500 max-w-md mt-1 leading-relaxed">
                  Begin with a fragment, reference, tension, or question. Mimi helps shape it without flattening your voice.
                </p>
              </div>

              {/* Voice memo status */}
              <AnimatePresence>
                {(isRecording || isTranscribing) && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-center gap-3 mb-4 px-3 py-2 studio-bg-surface border studio-border shrink-0"
                  >
                    {isRecording ? (
                      <>
                        <Mic size={12} className="text-red-400 animate-pulse shrink-0" />
                        <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-red-400 font-bold">
                          Recording
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            startRecording();
                            playClick();
                          }}
                          className="ml-1 px-2 py-1 border border-red-500/40 text-red-400 font-mono text-[7px] uppercase tracking-widest hover:bg-red-500/10 transition-colors"
                        >
                          Stop
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            cancelVoiceMemo();
                            playClick();
                          }}
                          className="px-2 py-1 border studio-border studio-text-muted font-mono text-[7px] uppercase tracking-widest hover:studio-text-ink transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <Loader2 size={12} className="animate-spin text-amber-400 shrink-0" />
                        <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-amber-400 font-bold">
                          Transcribing voice memo...
                        </span>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Live Dictation status */}
              <AnimatePresence>
                {isDictating && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex flex-col gap-2 items-center mb-4 px-4 py-3 studio-bg-surface border border-red-500/30 rounded-sm shrink-0 w-full max-w-md shadow-sm z-20"
                  >
                    <div className="flex items-center gap-3 w-full justify-between">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-red-500 font-black">
                          Dictating Live
                        </span>
                      </div>
                      
                      {/* Real-time Waveform */}
                      <div className="flex items-end gap-1 h-3 shrink-0">
                        <div className="w-0.5 bg-red-500 rounded-full animate-pulse" style={{ height: '60%', animationDuration: '0.6s' }} />
                        <div className="w-0.5 bg-red-500 rounded-full animate-pulse" style={{ height: '100%', animationDuration: '0.4s' }} />
                        <div className="w-0.5 bg-red-500 rounded-full animate-pulse" style={{ height: '40%', animationDuration: '0.5s' }} />
                        <div className="w-0.5 bg-red-500 rounded-full animate-pulse" style={{ height: '80%', animationDuration: '0.7s' }} />
                        <div className="w-0.5 bg-red-500 rounded-full animate-pulse" style={{ height: '50%', animationDuration: '0.3s' }} />
                      </div>

                      <button
                        type="button"
                        onClick={handleDictationToggle}
                        className="px-2 py-0.5 border border-red-500/40 text-red-500 hover:bg-red-500/10 font-mono text-[7px] uppercase tracking-widest transition-colors"
                      >
                        Stop
                      </button>
                    </div>

                    {dictationInterim && (
                      <p className="text-[10px] font-sans italic text-stone-500 dark:text-stone-400 text-center line-clamp-1 w-full bg-stone-50 dark:bg-stone-900/40 p-1 border border-stone-100 dark:border-stone-850">
                        &ldquo;{dictationInterim}&rdquo;
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Progressive Editorial Brief Form Container */}
              <div className={`w-full max-w-2xl flex flex-col gap-5 relative z-15 ${isMobile ? "min-h-[160px]" : "min-h-[220px]"}`}>
                {/* Ambient brown-noise toggle — opt-in only; never auto-plays */}
                <div className="absolute -top-8 right-0 z-20">
                  <button
                    type="button"
                    onClick={() => setAmbientDroneOn((v) => !v)}
                    aria-pressed={ambientDroneOn}
                    title={ambientDroneOn ? "Brown noise on during generation" : "Brown noise off (default)"}
                    className={`flex items-center gap-1.5 px-2 py-1 border font-mono text-[7px] uppercase tracking-widest transition-colors ${
                      ambientDroneOn
                        ? "border-amber-600/50 text-amber-700 bg-amber-500/10"
                        : "border-stone-300 dark:border-stone-700 text-stone-400 hover:text-stone-600"
                    }`}
                  >
                    {ambientDroneOn ? <Volume2 size={10} /> : <VolumeX size={10} />}
                    {ambientDroneOn ? "Noise On" : "Noise Off"}
                  </button>
                </div>
                {/* Thinking Pulse Overlay */}
                {isThinking && (
                  <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center bg-transparent">
                    <div className="w-44 h-44 rounded-full border border-purple-500/10 animate-ping absolute" />
                    <div className="w-32 h-32 rounded-full border border-purple-500/5 animate-pulse absolute" />
                  </div>
                )}

                {/* Primary field: Source Material */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <label className="font-mono text-[9px] uppercase tracking-[0.22em] text-stone-400 font-extrabold shrink-0">01 / Source material</label>
                    <div className="h-px flex-1 bg-stone-200/10 dark:bg-stone-800/50" />
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={input || ""}
                    onChange={(e) => {
                      setInput(e.target.value);
                      playClick();
                    }}
                    className="w-full bg-transparent border-none focus:ring-0 text-md md:text-xl font-serif italic text-center studio-prompt-input outline-none resize-none leading-relaxed no-scrollbar select-text focus:outline-none min-h-[120px]"
                    placeholder="Paste a fragment, reference, question, or unfinished idea..."
                  />
                </div>

                {/* Expand Brief Toggle Button (desktop only) */}
                <div className="hidden md:flex justify-center select-none shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBriefExpanded(!isBriefExpanded);
                      playClick();
                    }}
                    aria-expanded={isBriefExpanded}
                    className="font-serif italic text-sm font-semibold text-white dark:text-stone-950 bg-stone-950 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white transition-colors flex items-center gap-2 py-2 px-4 border border-stone-950 dark:border-stone-200 shadow-sm"
                  >
                    <Settings size={13} strokeWidth={1.7} aria-hidden="true" />
                    <span>{isBriefExpanded ? "Hide Detailed Brief Options" : "Configure Detailed Brief"}</span>
                    <ChevronDown
                      size={13}
                      className={`transition-transform ${isBriefExpanded ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                </div>

                {/* Expandable detailed fields (desktop renders here; mobile renders under the context header) */}
                {!isMobile && renderDetailedBriefPanel()}
              </div>

              {/* Used by Mimi // Active Context Strip */}
              <div className="w-full max-w-2xl mt-4 border-t border-dotted studio-border pt-3 select-none z-10 shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-stone-500 font-extrabold">Context Mimi will use</span>
                  <div className="flex-1 h-px bg-stone-200/10 dark:bg-stone-800/50" />
                </div>

                {/* Mobile: detailed brief as a quiet deep link (replaces the large button) */}
                {isMobile && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsBriefExpanded(!isBriefExpanded);
                        playClick();
                      }}
                      aria-expanded={isBriefExpanded}
                      className="mb-3 inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-stone-500 hover:studio-text-ink underline underline-offset-4 decoration-dotted decoration-stone-500/60 transition-colors"
                    >
                      <Settings size={11} strokeWidth={1.7} aria-hidden="true" />
                      <span>{isBriefExpanded ? "Hide detailed brief" : "Configure detailed brief"}</span>
                      <ChevronDown
                        size={11}
                        className={`transition-transform ${isBriefExpanded ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      />
                    </button>
                    <div className="mb-3">{renderDetailedBriefPanel()}</div>
                  </>
                )}

                <div className="flex flex-wrap gap-2 items-center min-h-[24px]">
                  {/* Deep Reasoning */}
                  {deepThinking && (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[7px] uppercase bg-purple-500/15 border border-purple-500/35 text-purple-400 px-2 py-0.5 rounded-sm shadow-sm transition-all hover:bg-purple-500/20">
                      <span>✥ DEEP REASONING</span>
                      <button
                        type="button"
                        onClick={() => setDeepThinking(false)}
                        className="hover:text-white transition-colors ml-0.5 text-[8.5px] font-black cursor-pointer"
                        title="Disable Deep Reasoning"
                      >
                        ×
                      </button>
                    </span>
                  )}

                  {/* Web Grounding */}
                  {useSearch && (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[7px] uppercase bg-blue-500/15 border border-blue-500/35 text-blue-400 px-2 py-0.5 rounded-sm shadow-sm transition-all hover:bg-blue-500/20">
                      <span>✥ WEB GROUNDING</span>
                      <button
                        type="button"
                        onClick={() => setUseSearch(false)}
                        className="hover:text-white transition-colors ml-0.5 text-[8.5px] font-black cursor-pointer"
                        title="Disable Web Search Grounding"
                      >
                        ×
                      </button>
                    </span>
                  )}

                  {/* Tailor profile */}
                  {!useTailorProfile && (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[7px] uppercase bg-orange-500/15 border border-orange-500/35 text-orange-400 px-2 py-0.5 rounded-sm shadow-sm transition-all hover:bg-orange-500/20">
                      <span>✥ TAILOR OVERRIDE</span>
                      <button
                        type="button"
                        onClick={() => setUseTailorProfile(true)}
                        className="hover:text-white transition-colors ml-0.5 text-[8.5px] font-black cursor-pointer"
                        title="Disable Tailor Override"
                      >
                        ×
                      </button>
                    </span>
                  )}

                  {/* Active Doll Persona */}
                  {studioDoll.enabled && studioDoll.activeDoll && (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[7px] uppercase bg-amber-500/15 border border-amber-500/35 text-amber-500 px-2 py-0.5 rounded-sm shadow-sm transition-all hover:bg-amber-500/20">
                      <span>✥ PERSONA: {studioDoll.activeDoll.name}</span>
                      <button
                        type="button"
                        onClick={() => studioDoll.toggleDollInjection(false)}
                        className="hover:text-white transition-colors ml-0.5 text-[8.5px] font-black cursor-pointer"
                        title="Disable Persona"
                      >
                        ×
                      </button>
                    </span>
                  )}

                  {/* Active Preset Treatment */}
                  {activeTreatmentId && (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[7px] uppercase bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 px-2 py-0.5 rounded-sm shadow-sm transition-all hover:bg-emerald-500/20">
                      <span>✥ TREATMENT: {getTreatmentLabel(activeTreatmentId, profile?.savedTreatments)}</span>
                      <button
                        type="button"
                        onClick={() => setActiveTreatmentId(null)}
                        className="hover:text-white transition-colors ml-0.5 text-[8.5px] font-black cursor-pointer"
                        title="Clear Treatment"
                      >
                        ×
                      </button>
                    </span>
                  )}

                  {/* Active Uploaded Media references */}
                  {mediaFiles.map((media, idx) => {
                    const thumbSrc = media.type === "image" ? (media.url || media.data) : undefined;
                    return (
                      <span key={`med-${idx}`} className="inline-flex items-center gap-1.5 font-mono text-[7px] uppercase bg-stone-500/10 border border-stone-800 text-stone-300 pl-1 pr-2 py-0.5 rounded-sm shadow-sm transition-all hover:bg-stone-500/15">
                        {thumbSrc ? (
                          <img
                            src={thumbSrc || "/placeholder.svg"}
                            alt={`Reference thumbnail: ${media.name}`}
                            className="w-5 h-5 object-cover rounded-[2px] border border-stone-700 shrink-0"
                          />
                        ) : null}
                        <span className="truncate max-w-[90px]">✥ REF: {media.name}</span>
                        <button
                          type="button"
                          onClick={() => setMediaFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="hover:text-red-400 transition-colors ml-0.5 text-[8.5px] font-black cursor-pointer"
                          title="Remove Reference file"
                          aria-label={`Remove reference file: ${media.name}`}
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}

                  {/* Active Tags */}
                  {activeTags.map((tag, idx) => (
                    <span key={`tag-${idx}`} className="inline-flex items-center gap-1.5 font-mono text-[7px] uppercase bg-yellow-500/10 border border-yellow-500/25 text-yellow-500 px-2 py-0.5 rounded-sm shadow-sm transition-all hover:bg-yellow-500/15">
                      <span>#{tag}</span>
                      <button
                        type="button"
                        onClick={() => setActiveTags((prev) => prev.filter((_, i) => i !== idx))}
                        className="hover:text-red-400 transition-colors ml-0.5 text-[8.5px] font-black cursor-pointer"
                        title={`Remove Tag #${tag}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}

                  {/* If nothing active */}
                  {!deepThinking && !useSearch && useTailorProfile && (!studioDoll.enabled) && !activeTreatmentId && mediaFiles.length === 0 && activeTags.length === 0 && (
                    <p className="font-sans text-[9px] text-stone-500 italic">No context active. Mimi will generate from raw prompt text.</p>
                  )}
                </div>
              </div>

              {/* Desktop Action Area (Hidden on Mobile) */}
              {!isMobile && (
                <div className="flex flex-col items-center gap-3 mt-5 select-none shrink-0 z-10 w-full max-w-2xl">
                  <div className="grid grid-cols-3 gap-2 w-full" aria-label="Issue workflow">
                    <button
                      type="button"
                      disabled={isShapingBrief}
                      onClick={handleShapeBrief}
                      className="min-h-16 p-2.5 bg-stone-100 dark:bg-stone-900 border border-amber-500/60 hover:border-amber-500 hover:bg-stone-200 dark:hover:bg-stone-850 text-left rounded-xs transition-all cursor-pointer shadow-xs flex items-center gap-2.5"
                      title="Organize the idea without generating the issue"
                    >
                      <span className="w-8 h-8 shrink-0 border border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center" aria-hidden="true">
                        {isShapingBrief ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} strokeWidth={1.7} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-mono text-[7px] uppercase tracking-[0.16em] text-amber-600 dark:text-amber-400 font-extrabold">
                          01 / Shape
                        </span>
                        <span className="block font-serif italic text-sm studio-text-ink mt-0.5">
                          {isShapingBrief ? "Shaping..." : "Shape brief"}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={isThinking}
                      onClick={() => {
                        triggerAccession(true);
                        playClick();
                      }}
                      className="min-h-16 p-2.5 bg-purple-950/10 dark:bg-purple-950/30 border border-purple-500/40 hover:border-purple-400 hover:bg-purple-900/20 text-left rounded-xs transition-all cursor-pointer shadow-sm flex items-center gap-2.5"
                      title="Render a fast low-fidelity draft layout to verify structure before generating high-fi images"
                    >
                      <span className="w-8 h-8 shrink-0 border border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center" aria-hidden="true">
                        <Eye size={16} strokeWidth={1.7} />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-mono text-[7px] uppercase tracking-[0.16em] text-purple-600 dark:text-purple-400 font-extrabold">
                          02 / Preview
                        </span>
                        <span className="block font-serif italic text-sm studio-text-ink mt-0.5">
                          Quick preview
                        </span>
                      </span>
                    </button>
                    <PearlButton
                      type="button"
                      editorial
                      loading={isThinking}
                      disabled={isThinking}
                      likenessAccent={profile?.likenessManifest?.accentHex}
                      onClick={() => {
                        triggerAccession(false);
                        playClick();
                      }}
                      className="min-w-0 w-full shadow-md !justify-start !text-left !p-2.5 !min-h-16"
                      title="Compose the complete editorial issue"
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 shrink-0 border border-white/20 bg-white/5 flex items-center justify-center" aria-hidden="true">
                          <BookOpen size={16} strokeWidth={1.7} />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-mono text-[7px] uppercase tracking-[0.16em] opacity-70 not-italic">
                            03 / Build
                          </span>
                          <span className="block font-serif italic text-sm normal-case tracking-normal mt-0.5">Develop issue</span>
                        </span>
                      </span>
                    </PearlButton>
                  </div>
                  <span className="font-sans text-[11px] text-stone-600 dark:text-stone-400 mt-0.5 select-none">
                    Shape proposes structure. Nothing is final until you develop the issue.
                  </span>
                </div>
              )}

              {/* Mobile Sticky Action Cluster (sits directly above the bottom nav) */}
              {isMobile && (
                <div className="studio-mobile-actions fixed left-0 right-0 studio-bg-panel border-t studio-border z-[45] flex flex-col">
                  {/* Floating scrollable tools toolbar */}
                  <div className="flex items-center gap-0 overflow-x-auto no-scrollbar border-b studio-border px-2 py-1.5">
                    {([
                      {
                        key: "attach",
                        label: "Attach",
                        icon: <Paperclip size={14} strokeWidth={1.6} />,
                        active: false,
                        onClick: () => { mediaInputRef.current?.click(); playClick(); },
                      },
                      {
                        key: "voice",
                        label: isRecording ? "Stop" : "Voice",
                        icon: isTranscribing ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : isRecording ? (
                          <Square size={13} fill="currentColor" />
                        ) : (
                          <Mic size={14} strokeWidth={1.6} />
                        ),
                        active: isRecording || isTranscribing,
                        onClick: () => { startRecording(); playClick(); },
                      },
                      {
                        key: "dictate",
                        label: isDictating ? "Stop" : "Dictate",
                        icon: <Radio size={14} strokeWidth={1.6} />,
                        active: isDictating,
                        onClick: () => { handleDictationToggle(); playClick(); },
                      },
                      {
                        key: "title",
                        label: "Title",
                        icon: <Zap size={14} strokeWidth={1.6} />,
                        active: false,
                        onClick: () => { handleAutoGenerateTitle(); playClick(); },
                      },
                      {
                        key: "spark",
                        label: "Spark",
                        icon: <Sparkles size={14} strokeWidth={1.6} />,
                        active: isGeneratingPrompt,
                        onClick: async () => {
                          playClick();
                          setIsGeneratingPrompt(true);
                          try {
                            const newPrompt = await generateAutoAwesomePrompt();
                            setInput(newPrompt);
                          } catch (e) {
                            console.error(e);
                          } finally {
                            setIsGeneratingPrompt(false);
                          }
                        },
                      },
                      {
                        key: "deep",
                        label: "Deep",
                        icon: <BrainCircuit size={14} strokeWidth={1.6} />,
                        active: deepThinking,
                        onClick: () => { setDeepThinking(!deepThinking); playClick(); },
                      },
                      {
                        key: "web",
                        label: "Web",
                        icon: <Globe size={14} strokeWidth={1.6} />,
                        active: useSearch,
                        onClick: () => { setUseSearch(!useSearch); playClick(); },
                      },
                      {
                        key: "tailor",
                        label: "Tailor",
                        icon: <Scissors size={14} strokeWidth={1.6} />,
                        active: !useTailorProfile,
                        onClick: () => { setUseTailorProfile(!useTailorProfile); playClick(); },
                      },
                    ] as { key: string; label: string; icon: React.ReactNode; active: boolean; onClick: () => void }[]).map((tool) => (
                      <button
                        key={tool.key}
                        type="button"
                        onClick={tool.onClick}
                        aria-label={tool.label}
                        className={`shrink-0 flex flex-col items-center justify-center gap-0.5 w-[52px] py-1.5 rounded-sm active:scale-95 transition-all ${
                          tool.active
                            ? "text-amber-600 dark:text-amber-400"
                            : "studio-text-muted"
                        }`}
                      >
                        {tool.icon}
                        <span className="font-mono text-[6px] uppercase tracking-[0.1em] font-bold leading-none truncate w-full text-center">
                          {tool.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Primary action row */}
                  <div className="flex items-stretch gap-2 px-3 pt-2 pb-3">
                    <button
                      type="button"
                      disabled={isShapingBrief}
                      onClick={handleShapeBrief}
                      className="w-14 shrink-0 flex items-center justify-center border border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-mono uppercase tracking-wider font-extrabold rounded-sm active:scale-95 transition-transform"
                    >
                      {isShapingBrief ? <Loader2 size={13} className="animate-spin" /> : "Shape"}
                    </button>
                    <button
                      type="button"
                      disabled={isThinking}
                      onClick={() => {
                        triggerAccession(true);
                        playClick();
                      }}
                      className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 border border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-300 text-[9px] font-mono uppercase tracking-widest font-extrabold rounded-sm active:scale-95 transition-transform"
                    >
                      <Eye size={12} strokeWidth={1.8} />
                      Preview
                    </button>
                    <button
                      type="button"
                      disabled={isThinking}
                      onClick={() => {
                        triggerAccession(false);
                        playClick();
                      }}
                      className="flex-[1.4] min-h-[44px] flex items-center justify-center gap-1.5 bg-stone-900 text-stone-50 dark:bg-[#FAF9F6] dark:text-black text-[9px] font-mono uppercase tracking-widest font-extrabold rounded-sm active:scale-95 transition-transform disabled:opacity-60"
                    >
                      {isThinking ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <BookOpen size={12} strokeWidth={1.8} />
                      )}
                      {isThinking ? "Developing" : "Develop"}
                    </button>
                  </div>
                </div>
              )}

              {/* Shape Brief Review Overlay Panel */}
              {shapedBriefResult && (
                <ShapeBriefReview
                  isOpen={showShapeReview}
                  result={shapedBriefResult}
                  isEditing={isEditingReview}
                  onChange={setShapedBriefResult}
                  onEdit={() => setIsEditingReview(true)}
                  onViewReview={() => setIsEditingReview(false)}
                  onApply={(r) => {
                    if (r.proposedDirection) setEditorialIntention((prev) => prev || r.proposedDirection);
                    if (r.openQuestions) setCentralTension((prev) => prev || r.openQuestions);
                    if (r.preservedLanguage) setDesiredFeeling((prev) => prev || r.preservedLanguage);
                    const parsedAnchors = splitInferredAnchors(r.inferredAnchors)
                      .map((a) => a.replace(/^\[INFERRED\]\s*/i, "").trim())
                      .filter(Boolean);
                    if (parsedAnchors.length > 0) {
                      setAnchorsReferences((prev) => prev || parsedAnchors.join(", "));
                      setActiveTags((prev) => Array.from(new Set([...prev, ...parsedAnchors])));
                    }
                    setIsBriefExpanded(true);
                    setShowShapeReview(false);
                    setIsEditingReview(false);
                    window.dispatchEvent(new CustomEvent("mimi:sound", { detail: { type: "shimmer" } }));
                    playClick();
                  }}
                  onClose={() => {
                    setShowShapeReview(false);
                    setIsEditingReview(false);
                  }}
                  playClick={playClick}
                />
              )}

            </div>
          </div>
        )}


        {!isMobile && (
          <StudioColumnSplitHandle onPointerDown={handleSplitPointerDown} />
        )}

        {/* COLUMN 3: COVER PROFILER / PREVIEW COLUMN */}
        {(!isMobile || mobileStudioView === "cover") && (
          <div className={`w-full studio-bg-panel border-l studio-border flex flex-col p-6 md:pr-10 shrink-0 relative overflow-y-auto no-scrollbar ${isMobile ? "justify-start pb-44" : "justify-between"}`}
            style={isMobile ? undefined : { width: coverPanelWidth }}>
            {isMobile && (
              <div className="studio-mobile-actions fixed left-0 right-0 studio-bg-panel border-t studio-border z-[45] flex items-center justify-around gap-0 px-2 py-2">
                {([
                  {
                    key: "optics",
                    label: "Optics",
                    icon: <Eye size={14} strokeWidth={1.6} />,
                    active: activePanel === "telemetry",
                    onClick: () => { togglePanel("telemetry"); playClick(); },
                  },
                  {
                    key: "treatments",
                    label: "Treatments",
                    icon: <Paintbrush size={14} strokeWidth={1.6} />,
                    active: activePanel === "treatments",
                    onClick: () => { togglePanel("treatments"); playClick(); },
                  },
                  {
                    key: "colophon",
                    label: "Colophon",
                    icon: <FileText size={14} strokeWidth={1.6} />,
                    active: false,
                    onClick: () => { setShowColophon(true); playClick(); },
                  },
                  {
                    key: "doll",
                    label: studioDoll.enabled ? "Doll: On" : "Doll",
                    icon: studioDoll.loading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Users size={14} strokeWidth={1.6} />
                    ),
                    active: studioDoll.enabled,
                    onClick: () => { studioDoll.toggleDollInjection(!studioDoll.enabled); playClick(); },
                  },
                  {
                    key: "reset",
                    label: "Reset",
                    icon: <RotateCcw size={14} strokeWidth={1.6} />,
                    active: false,
                    onClick: () => { setActiveThread(null); setInput(""); playClick(); },
                  },
                ] as { key: string; label: string; icon: React.ReactNode; active: boolean; onClick: () => void }[]).map((tool) => (
                  <button
                    key={tool.key}
                    type="button"
                    onClick={tool.onClick}
                    aria-label={tool.label}
                    className={`shrink-0 flex flex-col items-center justify-center gap-0.5 min-h-[44px] w-[56px] py-1.5 rounded-sm active:scale-95 transition-all ${
                      tool.active
                        ? "text-amber-600 dark:text-amber-400"
                        : "studio-text-muted"
                    }`}
                  >
                    {tool.icon}
                    <span className="font-mono text-[6px] uppercase tracking-[0.1em] font-bold leading-none truncate w-full text-center">
                      {tool.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="space-y-6">
              {renderStudioPager()}
              {/* Zine Title Input Header */}
              <div>
                <input
                  type="text"
                  placeholder="Zine Title Here"
                  value={title || ""}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    playClick();
                  }}
                  className={`w-full bg-transparent border-none studio-text-ink placeholder:studio-text-muted outline-none p-0 focus:ring-0 leading-tight ${getTreatmentTitleFontClass(activeTreatmentId, profile?.savedTreatments)}`}
                />
                <p className="font-mono text-[7px] uppercase tracking-[0.25em] studio-text-muted mt-1">{getTreatmentLabel(activeTreatmentId, profile?.savedTreatments)}</p>
              </div>

              {/* Cover card */}
              <div className="w-full flex justify-center">
                <div className="group/cover-card w-full max-w-[280px] studio-polaroid p-4 flex flex-col justify-between shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] min-h-[480px] border border-stone-200/50 relative transition-all hover:scale-105 duration-500"
                  style={getTreatmentBackgroundStyle(activeTreatmentId, profile?.savedTreatments)}>
                  
                  {/* Hover Metadata Overlay */}
                  <div className="absolute inset-x-4 top-4 bg-stone-900/95 dark:bg-stone-950/95 text-stone-200 dark:text-stone-300 p-2.5 border border-stone-800/80 backdrop-blur-xs flex flex-col gap-1.5 opacity-0 group-hover/cover-card:opacity-100 transition-all duration-500 pointer-events-none z-40 shadow-md">
                    <div className="flex items-center justify-between border-b border-stone-800/60 pb-1">
                      <span className="font-mono text-[6px] tracking-[0.25em] text-stone-500 font-extrabold uppercase">MIMI // CHRONICLE</span>
                      <span className="font-mono text-[6.5px] tracking-[0.15em] font-extrabold text-amber-500">SYSTEM FRAGMENT</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="font-mono text-[6px] tracking-[0.2em] text-stone-400 uppercase">TITLE:</span>
                        <span className="font-sans text-[7.5px] tracking-tight font-bold text-stone-100 truncate max-w-[150px] uppercase">
                          {title || "UNTITLED ZINE"}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="font-mono text-[6px] tracking-[0.2em] text-stone-400 uppercase">COMPOSED:</span>
                        <span className="font-mono text-[6.5px] tracking-[0.1em] text-stone-300 font-medium">
                          {new Date().toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" })}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="font-mono text-[6px] tracking-[0.2em] text-stone-400 uppercase">TREATMENT:</span>
                        <span className="font-mono text-[6.5px] tracking-[0.1em] text-stone-300 uppercase">
                          {getTreatmentLabel(activeTreatmentId, profile?.savedTreatments) || "NATIVE"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expand action button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCoverExpanded(true);
                      playClick();
                    }}
                    className="absolute top-2 left-2 z-50 bg-stone-900/90 hover:bg-stone-950 text-stone-100 p-1.5 border border-stone-850 shadow-md transition-all opacity-0 group-hover/cover-card:opacity-100 duration-300 flex items-center justify-center gap-1 cursor-pointer rounded-xs"
                    title="Expand Cover & Metadata"
                  >
                    <Maximize2 size={10} className="text-amber-500" />
                    <span className="font-mono text-[6.5px] tracking-widest uppercase font-extrabold pr-0.5">EXPAND</span>
                  </button>

                  {/* Image Slot */}
                  <div 
                    onClick={() => mediaInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingOverSlot(true);
                      e.dataTransfer.dropEffect = "copy";
                    }}
                    onDragLeave={() => {
                      setIsDraggingOverSlot(false);
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingOverSlot(false);
                      
                      const pocketItemStr = e.dataTransfer.getData("application/mimi-pocket-item");
                      const pocketImage = e.dataTransfer.getData("application/mimi-pocket-image");
                      
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                      const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

                      if (pocketItemStr) {
                        try {
                          const item = JSON.parse(pocketItemStr);
                          const thumb = item.content?.thumbnailUrl || item.content?.imageUrl;
                          const label = item.content?.title || item.content?.prompt || item.content?.text || item.content?.note || item.type || "Registry fragment";
                          
                          if (coverOverlay) {
                            if (thumb) {
                              const newLayer = {
                                id: `img-${Date.now()}`,
                                kind: "image" as const,
                                url: thumb,
                                x,
                                y,
                                width: 28,
                                opacity: 0.92,
                                label: item.type || "Pocket Asset",
                              };
                              setCoverOverlayLayers((prev) => [...prev, newLayer]);
                            } else {
                              const newLayer = {
                                id: `text-${Date.now()}`,
                                kind: "text" as const,
                                text: label,
                                x,
                                y,
                                fontSize: 14,
                                color: "#FAF9F6",
                              };
                              setCoverOverlayLayers((prev) => [...prev, newLayer]);
                            }
                          } else {
                            if (thumb) {
                              setMediaFiles([
                                {
                                  url: thumb,
                                  data: "",
                                  mimeType: "image/jpeg",
                                  type: "image",
                                  name: item.type || "pocket-ref",
                                },
                              ]);
                            } else {
                              setLeftPrompt((prev) => (prev ? `${prev}\n${label}` : label));
                            }
                          }
                          playClick();
                        } catch (err) {
                          console.error("MIMI // Error processing dropped pocket item:", err);
                        }
                      } else if (pocketImage) {
                        if (coverOverlay) {
                          const newLayer = {
                            id: `img-${Date.now()}`,
                            kind: "image" as const,
                            url: pocketImage,
                            x,
                            y,
                            width: 28,
                            opacity: 0.92,
                            label: "Pocket Image",
                          };
                          setCoverOverlayLayers((prev) => [...prev, newLayer]);
                        } else {
                          setMediaFiles([
                            {
                              url: pocketImage,
                              data: "",
                              mimeType: "image/jpeg",
                              type: "image",
                              name: "pocket-ref",
                            },
                          ]);
                        }
                        playClick();
                      } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        const file = e.dataTransfer.files[0];
                        if (file.type.startsWith("image/")) {
                          if (coverOverlay) {
                            await handleOverlayLogoUpload(file);
                          } else {
                            const dataUrl = await new Promise<string>((resolve, reject) => {
                              const reader = new FileReader();
                              reader.onload = () => resolve(String(reader.result || ""));
                              reader.onerror = reject;
                              reader.readAsDataURL(file);
                            });
                            setMediaFiles([
                              {
                                url: dataUrl,
                                data: dataUrl,
                                mimeType: file.type,
                                type: "image",
                                name: file.name,
                              },
                            ]);
                          }
                          playClick();
                        }
                      } else {
                        const text = e.dataTransfer.getData("text/plain");
                        if (text) {
                          if (coverOverlay) {
                            const newLayer = {
                              id: `text-${Date.now()}`,
                              kind: "text" as const,
                              text: text,
                              x,
                              y,
                              fontSize: 14,
                              color: "#FAF9F6",
                            };
                            setCoverOverlayLayers((prev) => [...prev, newLayer]);
                          } else {
                            if (text.startsWith("http://") || text.startsWith("https://")) {
                              setMediaFiles([
                                {
                                  url: text,
                                  data: "",
                                  mimeType: "image/jpeg",
                                  type: "image",
                                  name: "dropped-ref",
                                },
                              ]);
                            } else {
                              setLeftPrompt((prev) => (prev ? `${prev} ${text}` : text));
                            }
                          }
                          playClick();
                        }
                      }
                    }}
                    className={`w-full aspect-[2/3] studio-polaroid-slot flex items-center justify-center relative cursor-pointer group border overflow-hidden transition-all duration-300 ${
                      isDraggingOverSlot 
                        ? "border-emerald-500 bg-emerald-500/10 scale-[1.02] shadow-lg shadow-emerald-500/10" 
                        : getCoverBorderClass(coverBorder)
                    }`}
                  >
                    {isComposingCover && (
                      <div className="absolute inset-0 bg-stone-950/90 backdrop-blur-xs flex flex-col items-center justify-center text-center p-4 z-40 pointer-events-none">
                        <style>{`
                          @keyframes coverShimmer {
                            0% { transform: translateX(-100%); }
                            100% { transform: translateX(100%); }
                          }
                          .cover-shimmer-sweep {
                            animation: coverShimmer 1.8s infinite linear;
                          }
                        `}</style>
                        <div className="relative w-12 h-12 flex items-center justify-center">
                          <div className="absolute inset-0 rounded-full border-2 border-stone-850 border-t-purple-500 animate-spin" />
                          <BrainCircuit size={18} className="text-purple-400 animate-pulse" />
                        </div>
                        <span className="font-mono text-[8px] tracking-[0.25em] text-purple-400 mt-4 uppercase font-bold animate-pulse">
                          Composing Cover...
                        </span>
                        <span className="font-sans text-[7px] text-stone-500 mt-1 uppercase">
                          AI is painting aesthetic spectrum
                        </span>
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                          <div className="w-[200%] h-full bg-gradient-to-r from-transparent via-purple-500/10 to-transparent absolute top-0 left-0 cover-shimmer-sweep" />
                        </div>
                      </div>
                    )}
                    {isDraggingOverSlot && (
                      <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-center p-3 z-30 pointer-events-none border-2 border-dashed border-emerald-500/80">
                        <ArrowUpRight size={24} className="text-emerald-400 animate-bounce" />
                        <span className="font-mono text-[8px] tracking-[0.2em] text-emerald-400 mt-2 uppercase font-black">
                          {coverOverlay ? "Drop to Overlay" : "Drop as Cover Base"}
                        </span>
                        <span className="font-sans text-[7px] text-emerald-500/80 mt-1 uppercase">
                          {coverOverlay ? "At exact coordinates" : "To use as base reference"}
                        </span>
                      </div>
                    )}
                    {(() => {
                      const coverImg = mediaFiles.find((m) => m.type === "image");
                      if (coverImg && (coverImg.url || coverImg.data)) {
                        return (
                          <>
                            <div 
                              className="w-full h-full overflow-hidden relative cursor-grab active:cursor-grabbing select-none"
                              onPointerDown={handleCoverPointerDown}
                              onPointerMove={handleCoverPointerMove}
                              onPointerUp={handleCoverPointerUp}
                            >
                              <img
                                src={coverImg.url || coverImg.data}
                                alt="cover artifact"
                                className="w-full h-full object-cover select-none pointer-events-none"
                                style={{ 
                                  filter: getTreatmentImageFilter(activeTreatmentId, profile?.savedTreatments),
                                  transform: `scale(${coverZoom}) translate(${coverPan.x / coverZoom}px, ${coverPan.y / coverZoom}px)`,
                                  transformOrigin: "center center",
                                  transition: isPanningCover ? "none" : "transform 0.2s ease-out"
                                }}
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <StudioCoverOverlayCanvas layers={coverOverlayLayers} visible={coverOverlay} />
                            
                            {/* Hover Overlay - only show text if not panning */}
                            {!isPanningCover && (
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[8px] font-mono tracking-widest text-[#FAF9F6] uppercase font-bold pointer-events-none">
                                REPLACE COVER / DRAG TO PAN
                              </div>
                            )}

                            {/* Zoom controls for cover image slot */}
                            <div 
                              className="absolute bottom-2 right-2 z-30 flex items-center bg-stone-950/90 border border-stone-850 text-[#FAF9F6] h-5 divide-x divide-stone-850 shadow-md text-[8px] font-mono font-bold uppercase tracking-widest select-none rounded-none pointer-events-auto"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setCoverZoom(z => Math.max(1, z - 0.15)); if (coverZoom <= 1.15) setCoverPan({ x: 0, y: 0 }); }} 
                                className="px-1.5 h-full hover:bg-stone-850 flex items-center transition-colors cursor-pointer"
                                title="Zoom Out"
                              >
                                <ZoomOut size={9} />
                              </button>
                              <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setCoverZoom(1); setCoverPan({ x: 0, y: 0 }); }} 
                                className="px-2 h-full hover:bg-stone-850 flex items-center transition-colors gap-0.5 text-[7px] cursor-pointer font-bold font-mono"
                                title="Reset Zoom"
                              >
                                <RotateCcw size={7} /> {Math.round(coverZoom * 100)}%
                              </button>
                              <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setCoverZoom(z => Math.min(3.0, z + 0.15)); }} 
                                className="px-1.5 h-full hover:bg-stone-850 flex items-center transition-colors cursor-pointer"
                                title="Zoom In"
                              >
                                <ZoomIn size={9} />
                              </button>
                            </div>

                            {/* Remove cover trigger */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMediaFiles((prev) => prev.filter((m) => m.name !== coverImg.name));
                                setCoverZoom(1);
                                setCoverPan({ x: 0, y: 0 });
                              }}
                              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-none p-1 transition-colors z-30"
                            >
                              <X size={10} />
                            </button>
                          </>
                        );
                      }
                      return (
                        <div className="flex flex-col items-center justify-center text-center p-4 w-full h-full gap-5">
                          {/* Upload Cover group */}
                          <div className="flex flex-col items-center justify-center cursor-pointer group/upload">
                            <div className="w-10 h-10 border border-[#FAF9F6]/20 flex items-center justify-center rounded-none group-hover/upload:border-[#FAF9F6]/60 transition-colors mb-2">
                              <ImageUp size={18} strokeWidth={1.6} className="text-[#FAF9F6]/55 group-hover/upload:text-[#FAF9F6]/90 transition-colors" aria-hidden="true" />
                            </div>
                            <span className="font-mono text-[7px] tracking-[0.2em] text-stone-500 uppercase select-none group-hover/upload:text-stone-300 transition-colors">
                              UPLOAD COVER
                            </span>
                          </div>

                          <div className="w-4/5 border-t border-dashed border-stone-800/60 my-0.5" />

                          {/* Generate Preview button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleComposeCover();
                            }}
                            className="px-3.5 py-2 bg-purple-950/40 hover:bg-purple-900/40 text-purple-400 border border-purple-900/60 hover:border-purple-800 font-mono text-[8px] uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 shrink-0 z-30"
                          >
                            <Sparkles size={10} />
                            <span>Generate Preview</span>
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Author / Bottom corner signature */}
                  <div className="mt-3 flex justify-end">
                    <input
                      type="text"
                      placeholder="Author Name"
                      value={authorName || ""}
                      onChange={(e) => {
                        setAuthorName(e.target.value);
                        playClick();
                      }}
                      className="w-2/3 bg-transparent border-none text-right font-serif italic text-[11px] text-stone-600 outline-none p-0 focus:ring-0 placeholder-stone-400 leading-none"
                    />
                  </div>
                </div>
              </div>

              {/* Curation Controls */}
              <div className="space-y-3">
                <div className="grid grid-cols-3 border-b studio-border" role="tablist" aria-label="Cover personalization">
                  {(["border", "text", "image"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={coverPersonalizationTab === tab}
                      onClick={() => {
                        setCoverPersonalizationTab(tab);
                        playClick();
                      }}
                      className={`py-2 font-mono text-[7.5px] tracking-[0.22em] uppercase transition-colors border-b-2 ${
                        coverPersonalizationTab === tab
                          ? "studio-text-ink border-amber-500 font-bold"
                          : "studio-text-muted border-transparent hover:studio-text-ink"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="min-h-[74px] border studio-border studio-bg-surface p-3">
                  {coverPersonalizationTab === "border" && (
                    <div>
                      <p className="font-mono text-[7px] uppercase tracking-widest studio-text-muted mb-2">
                        Cover frame
                      </p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(["thin", "double", "dashed", "none"] as const).map((border) => (
                          <button
                            key={border}
                            type="button"
                            onClick={() => {
                              setCoverBorder(border);
                              playClick();
                            }}
                            className={`py-2 border font-mono text-[7px] uppercase tracking-wider ${
                              coverBorder === border
                                ? "bg-stone-950 text-white dark:bg-stone-100 dark:text-stone-950 border-stone-950 dark:border-stone-100"
                                : "studio-border studio-text-muted hover:studio-text-ink"
                            }`}
                          >
                            {border}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {coverPersonalizationTab === "text" && (
                    <div>
                      <p className="font-mono text-[7px] uppercase tracking-widest studio-text-muted mb-2">
                        Title alignment
                      </p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(["left", "center", "right"] as const).map((alignment) => (
                          <button
                            key={alignment}
                            type="button"
                            onClick={() => {
                              setCoverAlign(alignment);
                              playClick();
                            }}
                            className={`py-2 border font-mono text-[7px] uppercase tracking-wider ${
                              coverAlign === alignment
                                ? "bg-stone-950 text-white dark:bg-stone-100 dark:text-stone-950 border-stone-950 dark:border-stone-100"
                                : "studio-border studio-text-muted hover:studio-text-ink"
                            }`}
                          >
                            {alignment}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {coverPersonalizationTab === "image" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-[7px] uppercase tracking-widest studio-text-muted mb-1.5">
                            Image treatment
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveTreatmentId("muted")}
                              title="Muted Chroma"
                              className="w-5 h-5 rounded-full bg-[#FAF9F6] border border-stone-700/60"
                            />
                            <button
                              type="button"
                              onClick={() => setActiveTreatmentId("terry")}
                              title="Terry Flash"
                              className="w-5 h-5 rounded-full bg-[#C8B195] border border-stone-700/60"
                            />
                            <button
                              type="button"
                              onClick={() => togglePanel("treatments")}
                              title="Open treatment library"
                              className="w-5 h-5 rounded-full bg-gradient-to-tr from-rose-400 via-emerald-400 to-indigo-500 border border-stone-700/60"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => togglePanel("treatments")}
                          className="px-2.5 py-2 border studio-border font-mono text-[7px] uppercase tracking-widest studio-text-ink"
                        >
                          Treatment library
                        </button>
                      </div>
                      <label className="block">
                        <span className="flex justify-between font-mono text-[7px] uppercase tracking-widest studio-text-muted mb-1">
                          <span>Grain</span>
                          <span>{grainDensity}%</span>
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={grainDensity}
                          onChange={(event) => setGrainDensity(Number(event.target.value))}
                          className="w-full accent-stone-950 dark:accent-stone-100"
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end">
                  {/* Overlay toggle — stickers, logos, text layers */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={coverOverlay}
                    aria-label="Toggle cover overlay"
                    onClick={() => {
                      setCoverOverlay((current) => !current);
                      playClick();
                    }}
                    className="group flex items-center gap-2 font-mono text-[7.5px] tracking-[0.2em] studio-text-muted uppercase select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2"
                  >
                    <span>Overlay</span>
                    <span
                      aria-hidden="true"
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200 ${
                        coverOverlay
                          ? "bg-emerald-500 border-emerald-500"
                          : "studio-bg-panel studio-border group-hover:border-stone-500"
                      }`}
                    >
                      <span
                        className={`block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                          coverOverlay ? "translate-x-[17px]" : "translate-x-[2px]"
                        }`}
                      />
                    </span>
                    <span className="sr-only">{coverOverlay ? "On" : "Off"}</span>
                  </button>
                  </div>

                {coverOverlay && (
                  <StudioCoverOverlayPanel
                    layers={coverOverlayLayers}
                    onChange={setCoverOverlayLayers}
                    onAddLogo={handleOverlayLogoUpload}
                  />
                )}

                {composeCoverError && (
                  <p className="font-mono text-[7px] text-amber-500/90 leading-snug">{composeCoverError}</p>
                )}
              </div>
            </div>

            {/* Cover compose — AI image generation / edit */}
            <div className="mt-8">
              <div className="studio-bg-surface border studio-border p-1.5 flex flex-col gap-2 rounded-md transition-shadow focus-within:shadow-[0_0_8px_rgba(250,249,246,0.15)] focus-within:border-stone-400 dark:focus-within:border-stone-500">
                <textarea
                  id="studio-cover-compose-textarea"
                  rows={2}
                  placeholder="Describe the cover to generate or edit with AI..."
                  value={leftPrompt}
                  onChange={(e) => setLeftPrompt(e.target.value)}
                  className="w-full bg-transparent border-none focus:ring-0 text-xs italic placeholder:studio-text-muted studio-text-ink p-2 resize-none min-h-[2.5rem] outline-none no-scrollbar rounded-sm focus:bg-stone-50/5 dark:focus:bg-stone-900/10 transition-colors"
                />
                
                <div className="flex justify-between items-center gap-2 border-t studio-border pt-1.5 px-1">
                  {/* Interactive Status Indicator Badge */}
                  <div className="flex min-w-0 items-center gap-1.5">
                    <label className="sr-only" htmlFor="studio-cover-provider">
                      Cover image provider
                    </label>
                    <select
                      id="studio-cover-provider"
                      value={coverProvider}
                      onChange={(event) =>
                        handleCoverProviderChange(event.target.value as StudioCoverProvider)
                      }
                      className="max-w-[8.5rem] bg-transparent border studio-border rounded-sm px-1.5 py-1 font-mono text-[6.5px] font-bold uppercase tracking-wider studio-text-ink outline-none focus:border-stone-400 dark:focus:border-stone-500"
                      title="Choose the image engine for this cover"
                    >
                      {coverProviderOptions.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.label}{provider.available ? "" : " · not connected"}
                        </option>
                      ))}
                    </select>
                    {hasLiveAi ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[6.5px] font-bold tracking-widest text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-sm">
                        <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                        COVER CONFIGURED ({activeCoverProvider.shortLabel})
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowImageApiKeyInfo(!showImageApiKeyInfo)}
                        className="inline-flex items-center gap-1 font-mono text-[6.5px] font-bold tracking-widest text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-sm hover:bg-amber-500/20 transition-all cursor-pointer"
                        title="Click to learn how to connect live API"
                      >
                        ✥ PREVIEW · {activeCoverProvider.shortLabel} NOT CONNECTED
                        <span className="underline decoration-dotted ml-0.5">(LEARN)</span>
                      </button>
                    )}
                  </div>

                  <button
                    id="studio-cover-compose-button"
                    type="button"
                    disabled={isComposingCover}
                    onClick={() => void handleComposeCover()}
                    className="px-4 py-2 bg-stone-950 dark:bg-stone-100 hover:bg-stone-850 dark:hover:bg-white text-stone-100 dark:text-stone-950 hover:text-white dark:hover:text-black font-mono text-[8px] font-extrabold uppercase tracking-widest transition-all shrink-0 disabled:opacity-50 inline-flex items-center gap-1.5 rounded-sm shadow-sm"
                  >
                    {isComposingCover ? (
                      <>
                        <Loader2 size={10} className="animate-spin text-amber-500" /> Generating
                      </>
                    ) : (
                      "Compose"
                    )}
                  </button>
                </div>
              </div>

              {/* Toggleable informative drawer/panel inside InputStudio cover compose */}
              <AnimatePresence>
                {showImageApiKeyInfo && !hasLiveAi && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-2 border studio-border bg-stone-50/50 dark:bg-stone-900/50 p-3 rounded-md shadow-inner"
                  >
                    <h5 className="font-serif italic text-xs studio-text-ink mb-1.5">How Live Cover Gen Works</h5>
                    <p className="font-sans text-[10px] studio-text-muted leading-relaxed mb-2">
                      Cover Composer uses its own image engine, independently from Mimi's writing model.
                      Gateway · Flux avoids the blocked Gemini key; OpenAI, Gemini, and Replicate remain available when connected.
                    </p>
                    <p className="font-sans text-[10px] studio-text-muted leading-relaxed">
                      Add the selected provider credential to the server environment, enable server AI, then restart Mimi.
                      Until that provider is live, Simulated Mirror Mode preserves the layout workflow without claiming a real generation.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowImageApiKeyInfo(false)}
                      className="mt-2.5 font-mono text-[7px] uppercase tracking-widest text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 underline"
                    >
                      Dismiss Guidelines
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="font-mono text-[6.5px] uppercase tracking-[0.2em] studio-text-muted mt-2 px-1">
                Upload a reference, then Compose to generate or AI-edit the cover plate
              </p>
            </div>
          </div>
        )}

        {/* COLUMN 4: RIGHT PANEL TAB - PROJECT REF */}
        <div 
          onClick={() => togglePanel("procurement")}
          className="hidden md:flex absolute right-0 top-1/3 z-40 w-6 h-32 studio-ref-tab border-l border-y studio-border rounded-l-md flex-col items-center justify-center cursor-pointer shadow-lg hover:translate-x-[-2px] transition-transform select-none group"
        >
          <span 
            style={{ writingMode: "vertical-rl" }} 
            className="rotate-180 font-mono text-[7px] tracking-[0.25em] uppercase group-hover:opacity-80 transition-colors font-bold"
          >
            Project Ref
          </span>
          <div className="w-full flex justify-center mt-2">
            <div className="w-[1px] h-4 border-l border-dashed border-stone-400" />
          </div>
        </div>

      </div>

      {/* BOTTOM CONTROL/TABS NAVIGATION (5-Column Grid Layout) — desktop only */}
      <div className="hidden md:grid md:grid-cols-5 md:overflow-hidden w-full border-t studio-border studio-bg-tab py-2 text-left px-4 absolute bottom-0 left-0 right-0 h-14 z-30 select-none shrink-0">
        
        {/* Tab 1: ANCHORS */}
        <button
          onClick={() => togglePanel("signal")}
          className={`studio-footer-tab flex flex-col items-start shrink-0 min-w-[8.5rem] md:min-w-0 border-r studio-divider pr-4 group transition-colors cursor-pointer ${
            activePanel === "signal" ? "is-active" : ""
          }`}
        >
          <span className={`font-mono text-[9px] font-bold uppercase tracking-widest block mb-0.5 transition-colors ${
            activePanel === "signal" ? "font-extrabold" : ""
          }`}>
            ANCHORS
          </span>
          <span className="font-sans text-[7px] uppercase tracking-wider studio-text-muted block leading-tight truncate w-full">
            Tags, motifs, & signals
          </span>
        </button>

        {/* Tab 2: TREATMENTS */}
        <button
          onClick={() => togglePanel("treatments")}
          className={`studio-footer-tab flex flex-col items-start shrink-0 min-w-[8.5rem] md:min-w-0 border-r studio-divider px-4 group transition-colors cursor-pointer ${
            activePanel === "treatments" ? "is-active" : ""
          }`}
        >
          <span className={`font-mono text-[9px] font-bold uppercase tracking-widest block mb-0.5 transition-colors ${
            activePanel === "treatments" ? "font-extrabold" : ""
          }`}>
            TREATMENTS
          </span>
          <span className="font-sans text-[7px] uppercase tracking-wider studio-text-muted block leading-tight truncate w-full">
            Saved presets · apply
          </span>
        </button>

        {/* Tab 3: POCKET */}
        <button
          onClick={() => togglePanel("procurement")}
          className={`studio-footer-tab flex flex-col items-start shrink-0 min-w-[8.5rem] md:min-w-0 border-r studio-divider px-4 group transition-colors cursor-pointer ${
            activePanel === "procurement" ? "is-active" : ""
          }`}
        >
          <span className={`font-mono text-[9px] font-bold uppercase tracking-widest block mb-0.5 transition-colors ${
            activePanel === "procurement" ? "font-extrabold" : ""
          }`}>
            POCKET
          </span>
          <span className="font-sans text-[7px] uppercase tracking-wider studio-text-muted block leading-tight truncate w-full">
            Saved references & assets
          </span>
        </button>

        {/* Tab 4: CONTINUUM */}
        <button
          onClick={() => togglePanel("continuum")}
          className={`studio-footer-tab flex flex-col items-start shrink-0 min-w-[8.5rem] md:min-w-0 border-r studio-divider px-4 group transition-colors cursor-pointer ${
            activePanel === "continuum" ? "is-active" : ""
          }`}
        >
          <span className={`font-mono text-[9px] font-bold uppercase tracking-widest block mb-0.5 transition-colors ${
            activePanel === "continuum" ? "font-extrabold" : ""
          }`}>
            CONTINUUM
          </span>
          <span className="font-sans text-[7px] uppercase tracking-wider studio-text-muted block leading-tight truncate w-full">
            Link recent zines
          </span>
        </button>

        {/* Tab 5: TELEMETRY */}
        <button
          onClick={() => togglePanel("telemetry")}
          className={`studio-footer-tab flex flex-col items-start shrink-0 min-w-[8.5rem] md:min-w-0 px-4 group transition-colors cursor-pointer ${
            activePanel === "telemetry" ? "is-active" : ""
          }`}
        >
          <span className={`font-mono text-[9px] font-bold uppercase tracking-widest block mb-0.5 transition-colors ${
            activePanel === "telemetry" ? "font-extrabold" : ""
          }`}>
            TELEMETRY
          </span>
          <span className="font-sans text-[7px] uppercase tracking-wider studio-text-muted block leading-tight truncate w-full">
            Aesthetic readings
          </span>
        </button>

      </div>

      {/* MOBILE BOTTOM NAV — focused, native-feeling primary navigation */}
      {isMobile && (
        <nav
          aria-label="Studio navigation"
          className="studio-mobile-nav md:hidden fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t studio-border studio-bg-tab"
        >
          {(() => {
            const composeActive = activePanel === null && mobileStudioView === "editor";
            const navItems: {
              key: string;
              label: string;
              icon: React.ReactNode;
              active: boolean;
              onClick: () => void;
            }[] = [
              {
                key: "compose",
                label: "Compose",
                icon: <PenLine size={17} strokeWidth={1.7} />,
                active: composeActive,
                onClick: () => {
                  setActivePanel(null);
                  setMobileStudioView("editor");
                },
              },
              {
                key: "anchors",
                label: "Anchors",
                icon: <Layers size={17} strokeWidth={1.7} />,
                active: activePanel === "signal",
                onClick: () => togglePanel("signal"),
              },
              {
                key: "treatments",
                label: "Treatments",
                icon: <Paintbrush size={17} strokeWidth={1.7} />,
                active: activePanel === "treatments",
                onClick: () => togglePanel("treatments"),
              },
              {
                key: "pocket",
                label: "Pocket",
                icon: <ShoppingBag size={17} strokeWidth={1.7} />,
                active: activePanel === "procurement",
                onClick: () => togglePanel("procurement"),
              },
              {
                key: "more",
                label: "More",
                icon: <MoreHorizontal size={17} strokeWidth={1.7} />,
                active: moreSheetOpen,
                onClick: () => setMoreSheetOpen(true),
              },
            ];
            return navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  item.onClick();
                  playClick();
                }}
                aria-label={item.label}
                aria-current={item.active ? "page" : undefined}
                className={`studio-mobile-nav-item flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                  item.active ? "is-active studio-text-ink" : "studio-text-muted"
                }`}
              >
                {item.icon}
                <span className="font-mono text-[7.5px] uppercase tracking-[0.12em] font-bold leading-none">
                  {item.label}
                </span>
              </button>
            ));
          })()}
        </nav>
      )}

      {/* MOBILE TOOLS SHEET */}
      {isMobile && (
        <AnimatePresence>
          {toolsSheetOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black z-[60]"
                onClick={() => setToolsSheetOpen(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 340, damping: 34 }}
                className="studio-mobile-sheet fixed bottom-0 left-0 right-0 z-[70] max-h-[80vh] overflow-y-auto no-scrollbar rounded-t-2xl border-t studio-border studio-bg-panel shadow-2xl"
              >
                <div className="sticky top-0 studio-bg-panel px-5 pt-3 pb-3 border-b studio-border">
                  <div className="w-10 h-1 rounded-full bg-current opacity-20 mx-auto mb-3" />
                  <div className="flex items-center justify-between">
                    <span className="font-serif italic text-lg studio-text-ink">Tools</span>
                    <button
                      type="button"
                      onClick={() => setToolsSheetOpen(false)}
                      aria-label="Close tools"
                      className="w-9 h-9 flex items-center justify-center border studio-border studio-text-muted hover:studio-text-ink"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2.5 p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                  {([
                    {
                      key: "attach",
                      label: "Attach Media",
                      icon: <Paperclip size={18} strokeWidth={1.6} />,
                      active: false,
                      onClick: () => {
                        mediaInputRef.current?.click();
                        setToolsSheetOpen(false);
                      },
                    },
                    {
                      key: "voice",
                      label: isRecording ? "Stop Memo" : "Voice Memo",
                      icon: isTranscribing ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : isRecording ? (
                        <Square size={16} fill="currentColor" />
                      ) : (
                        <Mic size={18} strokeWidth={1.6} />
                      ),
                      active: isRecording || isTranscribing,
                      onClick: () => startRecording(),
                    },
                    {
                      key: "dictate",
                      label: isDictating ? "Stop Dictation" : "Live Dictation",
                      icon: <Radio size={18} strokeWidth={1.6} />,
                      active: isDictating,
                      onClick: () => handleDictationToggle(),
                    },
                    {
                      key: "title",
                      label: "Title Spark",
                      icon: <Zap size={18} strokeWidth={1.6} />,
                      active: false,
                      onClick: () => {
                        handleAutoGenerateTitle();
                        setToolsSheetOpen(false);
                      },
                    },
                    {
                      key: "spark",
                      label: "Aesthetic Spark",
                      icon: <Sparkles size={18} strokeWidth={1.6} />,
                      active: isGeneratingPrompt,
                      onClick: async () => {
                        setToolsSheetOpen(false);
                        setIsGeneratingPrompt(true);
                        try {
                          const newPrompt = await generateAutoAwesomePrompt();
                          setInput(newPrompt);
                        } catch (e) {
                          console.error(e);
                        } finally {
                          setIsGeneratingPrompt(false);
                        }
                      },
                    },
                    {
                      key: "deep",
                      label: "Superintelligence",
                      icon: <BrainCircuit size={18} strokeWidth={1.6} />,
                      active: deepThinking,
                      onClick: () => setDeepThinking(!deepThinking),
                    },
                    {
                      key: "web",
                      label: "Web Grounding",
                      icon: <Globe size={18} strokeWidth={1.6} />,
                      active: useSearch,
                      onClick: () => setUseSearch(!useSearch),
                    },
                    {
                      key: "tailor",
                      label: "Tailor Override",
                      icon: <Scissors size={18} strokeWidth={1.6} />,
                      active: !useTailorProfile,
                      onClick: () => setUseTailorProfile(!useTailorProfile),
                    },
                    {
                      key: "optics",
                      label: "System Optics",
                      icon: <Eye size={18} strokeWidth={1.6} />,
                      active: activePanel === "telemetry",
                      onClick: () => {
                        togglePanel("telemetry");
                        setToolsSheetOpen(false);
                      },
                    },
                    {
                      key: "treatments",
                      label: "Treatments",
                      icon: <Paintbrush size={18} strokeWidth={1.6} />,
                      active: activePanel === "treatments",
                      onClick: () => {
                        togglePanel("treatments");
                        setToolsSheetOpen(false);
                      },
                    },
                    {
                      key: "colophon",
                      label: "Colophon",
                      icon: <FileText size={18} strokeWidth={1.6} />,
                      active: false,
                      onClick: () => {
                        setShowColophon(true);
                        setToolsSheetOpen(false);
                      },
                    },
                    {
                      key: "reset",
                      label: "Reset Workspace",
                      icon: <RotateCcw size={18} strokeWidth={1.6} />,
                      active: false,
                      onClick: () => {
                        setActiveThread(null);
                        setInput("");
                        setToolsSheetOpen(false);
                      },
                    },
                    {
                      key: "doll",
                      label: studioDoll.enabled ? "Doll: On" : "Studio Doll",
                      icon: studioDoll.loading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Users size={18} strokeWidth={1.6} />
                      ),
                      active: studioDoll.enabled,
                      onClick: () => studioDoll.toggleDollInjection(!studioDoll.enabled),
                    },
                  ] as {
                    key: string;
                    label: string;
                    icon: React.ReactNode;
                    active: boolean;
                    onClick: () => void;
                  }[]).map((tool) => (
                    <button
                      key={tool.key}
                      type="button"
                      onClick={() => {
                        tool.onClick();
                        playClick();
                      }}
                      className={`studio-tool-tile flex flex-col items-center justify-center gap-2 aspect-square border rounded-sm p-2 text-center active:scale-95 transition-all ${
                        tool.active
                          ? "border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "studio-border studio-bg-surface studio-text-ink"
                      }`}
                    >
                      {tool.icon}
                      <span className="font-mono text-[7.5px] uppercase tracking-[0.1em] font-bold leading-tight">
                        {tool.label}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}

      {/* MOBILE "MORE" SHEET */}
      {isMobile && (
        <AnimatePresence>
          {moreSheetOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black z-[60]"
                onClick={() => setMoreSheetOpen(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 340, damping: 34 }}
                className="studio-mobile-sheet fixed bottom-0 left-0 right-0 z-[70] max-h-[70vh] overflow-y-auto no-scrollbar rounded-t-2xl border-t studio-border studio-bg-panel shadow-2xl"
              >
                <div className="sticky top-0 studio-bg-panel px-5 pt-3 pb-3 border-b studio-border">
                  <div className="w-10 h-1 rounded-full bg-current opacity-20 mx-auto mb-3" />
                  <div className="flex items-center justify-between">
                    <span className="font-serif italic text-lg studio-text-ink">More</span>
                    <button
                      type="button"
                      onClick={() => setMoreSheetOpen(false)}
                      aria-label="Close more"
                      className="w-9 h-9 flex items-center justify-center border studio-border studio-text-muted hover:studio-text-ink"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
                <div className="p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-2">
                  {([
                    {
                      key: "cover",
                      label: "Cover",
                      note: "Design the issue cover plate",
                      icon: <ImageIcon size={17} strokeWidth={1.6} />,
                      onClick: () => {
                        setMobileStudioView("cover");
                        setMoreSheetOpen(false);
                      },
                    },
                    {
                      key: "continuum",
                      label: "Continuum",
                      note: "Link recent zines",
                      icon: <GitMerge size={17} strokeWidth={1.6} />,
                      onClick: () => {
                        togglePanel("continuum");
                        setMoreSheetOpen(false);
                      },
                    },
                    {
                      key: "telemetry",
                      label: "Telemetry",
                      note: "Aesthetic readings",
                      icon: <Radar size={17} strokeWidth={1.6} />,
                      onClick: () => {
                        togglePanel("telemetry");
                        setMoreSheetOpen(false);
                      },
                    },
                    {
                      key: "inspo",
                      label: "Inspo",
                      note: "Reference carousel",
                      icon: <Sparkles size={17} strokeWidth={1.6} />,
                      onClick: () => {
                        togglePanel("inspo");
                        setMoreSheetOpen(false);
                      },
                    },
                  ] as {
                    key: string;
                    label: string;
                    note: string;
                    icon: React.ReactNode;
                    onClick: () => void;
                  }[]).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        item.onClick();
                        playClick();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 border studio-border studio-bg-surface hover:studio-bg-panel active:scale-[0.99] transition-all text-left rounded-sm"
                    >
                      <span className="w-9 h-9 shrink-0 flex items-center justify-center border studio-border studio-text-ink">
                        {item.icon}
                      </span>
                      <span className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] studio-text-ink font-bold">
                          {item.label}
                        </span>
                        <span className="font-sans text-[10px] text-stone-500 leading-tight truncate">
                          {item.note}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}

      <AnimatePresence>
        {studioMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-[60]"
              onClick={() => setStudioMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 32 }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed top-0 right-0 bottom-0 z-[70] w-full max-w-sm border-l studio-border studio-bg-panel shadow-2xl flex flex-col"
            >
              <div className="flex items-start justify-between px-6 py-5 border-b studio-border shrink-0 studio-bg-surface">
                <div className="flex flex-col">
                  <span className="font-mono text-[9px] uppercase tracking-[0.28em] studio-text-muted font-bold leading-none">
                    Full Menu
                  </span>
                  <span className="font-serif italic text-2xl studio-text-ink leading-tight mt-1.5">
                    All chambers
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStudioMenuOpen(false)}
                  aria-label="Close menu"
                  className="w-10 h-10 flex items-center justify-center border studio-border studio-text-muted hover:studio-text-ink hover:studio-bg-surface transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto no-scrollbar px-6 py-6 space-y-6">
                {MENU_STRUCTURE.map((section) => (
                  <div key={section.section} className="space-y-1">
                    <div className="flex items-center gap-3 px-1 mb-2">
                      <span className="font-mono text-[9px] uppercase tracking-[0.3em] font-bold text-neutral-400 dark:text-neutral-500 shrink-0">
                        {section.section}
                      </span>
                      <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" aria-hidden="true" />
                    </div>
                    <div className="flex flex-col">
                      {section.items.map((item) => (
                        <button
                          key={item.mode}
                          type="button"
                          onClick={() => {
                            setStudioMenuOpen(false);
                            window.dispatchEvent(
                              new CustomEvent("mimi:change_view", { detail: item.mode }),
                            );
                          }}
                          className="w-full text-left group flex flex-col gap-1 py-3.5 px-1 min-h-[44px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70"
                        >
                          <span className="font-mono text-[15px] uppercase tracking-[0.18em] font-bold studio-text-ink group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {item.label}
                          </span>
                          <span className="font-sans text-[13px] leading-snug text-stone-500 dark:text-stone-400">
                            {item.note}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* PANEL CONTENT OVERLAY DRAWERS */}
      <AnimatePresence>
        {activePanel && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setActivePanel(null)}
              className="fixed inset-0 bg-black/60 z-40 pointer-events-auto"
            />

            {/* Slide-Up/Modal Box */}
            <motion.div
              style={isMobile ? { bottom: 0 } : {}}
              initial={isMobile ? { y: "100%" } : { opacity: 0, y: 20, scale: 0.95 }}
              animate={isMobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
              exit={isMobile ? { y: "100%" } : { opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className={
                isMobile
                  ? "fixed bottom-0 left-0 right-0 w-full rounded-t-2xl border-t border-stone-800 max-h-[85vh] p-6 pb-12 overflow-y-auto bg-[#111111] z-50 pointer-events-auto shadow-[0_-12px_44px_rgba(0,0,0,0.5)] flex flex-col"
                  : "fixed bottom-16 left-1/2 -translate-x-1/2 w-[440px] max-h-[60vh] bg-[#12110F] border border-[#2B2925] rounded-none pointer-events-auto overflow-y-auto p-8 flex flex-col z-50 text-[#FAF9F6]"
              }
            >
              {isMobile && (
                <div className="w-12 h-1.5 bg-stone-700 rounded-full mx-auto mb-4 shrink-0 pointer-events-none" />
              )}

              <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b border-stone-800 pb-3 shrink-0">
                  <h2 className="font-serif italic text-2xl text-[#F4F3EF] capitalize">
                    {activePanel === "procurement"
                      ? "Pocket Assets"
                      : activePanel === "continuum"
                        ? "Continue a piece"
                        : activePanel === "orchestrator"
                          ? "Used Context"
                          : activePanel}
                  </h2>
                  <button
                    onClick={() => setActivePanel(null)}
                    className="text-stone-400 hover:text-white transition-colors p-1 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar text-stone-300">
                  {activePanel === "inspo" && (
                    <div className="flex flex-col gap-6">
                      <ZineInspoCarousel />
                    </div>
                  )}

                  {activePanel === "telemetry" && (
                    <div className="flex flex-col gap-6">
                      <div className="flex justify-between items-center">
                        <GlossaryTooltip
                          term="Latent Telemetry"
                          poeticMeaning="The silent hum of the machine, listening to the space between your words."
                          functionalMeaning="A visual indicator of the system's background processing and readiness to interpret your input."
                        >
                          <div className="flex flex-col font-mono text-[10px] text-stone-400 gap-1">
                            <div className="flex justify-between">
                              <span>ENTROPY_FACTOR:</span>
                              <span className="text-yellow-500 font-bold">{entropy}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>LATITUDE_X:</span>
                              <span>{telemetryX}°N</span>
                            </div>
                            <div className="flex justify-between">
                              <span>LONGITUDE_Y:</span>
                              <span>{telemetryY}°E</span>
                            </div>
                          </div>
                        </GlossaryTooltip>
                      </div>
                      <div className="h-px bg-stone-850" />
                      <div className="font-mono text-[9px] uppercase tracking-wider text-stone-450 leading-relaxed space-y-2">
                        <p>✥ GENERATION PATH: MIMI FUNDED GATEWAY (SERVER-SIDE)</p>
                        <p>✥ TAILOR_CONTEXT_SHIELD: {useTailorProfile ? "SECURE" : "BYPASSED"}</p>
                        <p>✥ DOLL_IDENTITY: {studioDoll.enabled && studioDoll.activeDoll ? studioDoll.activeDoll.name.toUpperCase() : "OFF"}</p>
                        <p>✥ CREATOR_AUTHOR: {authorName}</p>
                        <p>✥ ZINE_TITLE: {title || "UNTITLED"}</p>
                      </div>
                    </div>
                  )}

                  {activePanel === "signal" && (
                    <div className="space-y-6">
                      {/* Active Tags Section */}
                      {activeTags.length > 0 && (
                        <div className="space-y-2 border-b border-stone-800 pb-4">
                          <span className="block font-mono text-[8.5px] uppercase tracking-widest text-stone-400 font-bold">
                            Active Anchor Tags ({activeTags.length})
                          </span>
                          <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto no-scrollbar">
                            {activeTags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 font-mono text-[8px] uppercase bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-1.5"
                              >
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => setActiveTags((prev) => prev.filter((_, i) => i !== idx))}
                                  className="hover:text-red-500 transition-colors ml-1 font-bold"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveTags([])}
                            className="font-mono text-[7px] text-red-500 hover:text-red-400 uppercase tracking-widest underline block"
                          >
                            Clear all tags
                          </button>
                        </div>
                      )}

                      <TagGenerator
                        onAddTags={(newTags) => {
                          setActiveTags((prev) => {
                            const combined = [...prev, ...newTags];
                            return Array.from(new Set(combined));
                          });
                          playClick();
                        }}
                        context={input}
                      />

                      <UseCaseSelector
                        activeId={activeCognitivePersona?.id || "social-manager"}
                        onSelectPersona={(preset) => {
                          setActiveCognitivePersona(preset);
                          localStorage.setItem(
                            "mimi_cognitive_persona",
                            JSON.stringify({ id: preset.id }),
                          );
                        }}
                      />
                    </div>
                  )}

                  {activePanel === "treatments" && (
                    <div className="space-y-6 text-stone-200">
                      <div>
                        <span className="block font-mono text-[8.5px] uppercase tracking-widest text-stone-400 font-bold mb-2">
                          Treatment library
                        </span>
                        <p className="font-sans text-[10px] text-stone-500 leading-relaxed mb-3">
                          Apply a saved Darkroom treatment or Mimi preset directly to the current zine cover.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            ...(profile?.savedTreatments || []).map((t: any) => ({
                              id: t.id,
                              label: t.treatmentName,
                              source: "Your treatment",
                            })),
                            { id: "35mm", label: "35mm Grain" },
                            { id: "terry", label: "Terry Flash" },
                            { id: "muted", label: "Muted Chroma" },
                            { id: "newsprint", label: "Newsprint Halftone" },
                            { id: "mono", label: "Sovereign Mono" },
                            { id: "thermal", label: "Thermal Scan" },
                          ].map((preset) => {
                            const isActive = activeTreatmentId === preset.id || (!activeTreatmentId && preset.id === "muted");
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => {
                                  setActiveTreatmentId(preset.id);
                                  setZineOptions({
                                    ...zineOptions,
                                    selectedTreatmentId: preset.id,
                                  });
                                  playClick();
                                }}
                                className={`py-2.5 px-3 border transition-all text-left ${
                                  isActive
                                    ? "bg-[#FAF9F6] border-[#FAF9F6] text-black"
                                    : "border-stone-800 hover:border-stone-700 text-stone-400"
                                }`}
                              >
                                <span className="block text-[9px] font-mono uppercase tracking-widest font-bold">
                                  {preset.label}
                                </span>
                                <span className={`block mt-1 text-[7px] font-sans uppercase tracking-wider ${
                                  isActive ? "text-stone-600" : "text-stone-600"
                                }`}>
                                  {isActive ? "Applied to cover" : ("source" in preset ? preset.source : "Mimi preset · apply")}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="h-px bg-stone-850" />

                      <div className="space-y-4">
                        <div>
                          <span className="block font-mono text-[8.5px] uppercase tracking-widest text-stone-400 font-bold mb-2">
                            Cover Border
                          </span>
                          <div className="grid grid-cols-4 gap-1.5">
                            {(["thin", "double", "dashed", "none"] as const).map((b) => (
                              <button
                                key={b}
                                type="button"
                                onClick={() => {
                                  setCoverBorder(b);
                                  playClick();
                                }}
                                className={`py-1.5 text-[8px] font-mono uppercase tracking-widest border transition-all ${
                                  coverBorder === b
                                    ? "bg-[#FAF9F6] border-[#FAF9F6] text-black font-extrabold"
                                    : "border-stone-800 text-stone-500"
                                }`}
                              >
                                {b}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="block font-mono text-[8.5px] uppercase tracking-widest text-stone-400 font-bold mb-2">
                            Title Alignment
                          </span>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(["left", "center", "right"] as const).map((a) => (
                              <button
                                key={a}
                                type="button"
                                onClick={() => {
                                  setCoverAlign(a);
                                  playClick();
                                }}
                                className={`py-1.5 text-[8px] font-mono uppercase tracking-widest border transition-all ${
                                  coverAlign === a
                                    ? "bg-[#FAF9F6] border-[#FAF9F6] text-black font-extrabold"
                                    : "border-stone-800 text-stone-500"
                                }`}
                              >
                                {a}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-[8.5px] uppercase tracking-widest text-stone-400 font-bold">
                              Grain Density
                            </span>
                            <span className="font-mono text-[9px] text-stone-400">
                              {grainDensity}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={grainDensity}
                            onChange={(e) => {
                              setGrainDensity(parseInt(e.target.value));
                            }}
                            className="w-full accent-[#FAF9F6] bg-stone-800 h-1 rounded-none cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="h-px bg-stone-850" />
                      
                      <button
                        type="button"
                        onClick={() => {
                          window.dispatchEvent(
                            new CustomEvent("mimi:sound", { detail: { type: "shimmer" } })
                          );
                          setActivePanel(null);
                        }}
                        className="w-full py-2.5 bg-[#FAF9F6] text-black font-mono text-[9px] uppercase tracking-widest font-bold border border-[#FAF9F6] hover:bg-stone-200 transition-colors"
                      >
                        SYNCHRONIZE COVER PRESET
                      </button>
                    </div>
                  )}

                  {activePanel === "procurement" && (
                    <div className="space-y-4">
                      {/* Active Workspace Artifacts Section */}
                      <div className="space-y-2 border-b border-stone-800 pb-4">
                        <span className="block font-mono text-[8.5px] uppercase tracking-widest text-stone-400 font-bold">
                          Workspace Artifacts ({mediaFiles.length})
                        </span>
                        {mediaFiles.length === 0 ? (
                          <p className="font-sans text-[10px] text-stone-500 italic">No files uploaded in current session.</p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto no-scrollbar">
                            {mediaFiles.map((media, idx) => (
                              <div key={idx} className="border border-stone-800 bg-stone-950/40 p-2 flex flex-col justify-between relative group">
                                <div className="flex items-center gap-2 mb-1.5 min-w-0">
                                  {media.type === "image" ? (
                                    <img src={media.url || media.data} alt="" className="w-8 h-8 object-cover border border-stone-800 shrink-0" />
                                  ) : (
                                    <div className="w-8 h-8 bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-500 shrink-0">
                                      <FileText size={14} />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="font-mono text-[8px] uppercase text-stone-400 truncate leading-none mb-0.5">{media.name || "Artifact"}</p>
                                    <p className="font-mono text-[6.5px] text-stone-600 uppercase tracking-wider">{media.type}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1">
                                  {media.type === "image" && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMediaFiles((prev) => {
                                          const next = [...prev];
                                          const [item] = next.splice(idx, 1);
                                          return [item, ...next];
                                        });
                                      }}
                                      className="font-mono text-[7px] text-emerald-500 hover:text-emerald-400 uppercase tracking-widest"
                                    >
                                      Base Ref
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMediaFiles((prev) => prev.filter((_, i) => i !== idx));
                                    }}
                                    className="font-mono text-[7px] text-red-500 hover:text-red-400 uppercase tracking-widest ml-auto"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <StudioPocketDrawer
                        onInsertText={(text) => {
                          setInput((prev) => (prev ? `${prev}\n${text}` : text));
                          playClick();
                        }}
                        onInsertImageUrl={(url) => {
                          setMediaFiles((prev) => [
                            {
                              url,
                              data: "",
                              mimeType: "image/jpeg",
                              type: "image",
                              name: "pocket-ref",
                            },
                            ...prev,
                          ]);
                          playClick();
                        }}
                        onOpenFullPocket={() => {
                          setActivePanel(null);
                          window.dispatchEvent(
                            new CustomEvent("mimi:change_view", { detail: "pocket" }),
                          );
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => mediaInputRef.current?.click()}
                        className="w-full py-3 border border-dashed border-stone-600 font-mono text-[8px] uppercase tracking-widest text-stone-400 hover:text-stone-200"
                      >
                        Upload reference asset
                      </button>
                    </div>
                  )}

                  {activePanel === "continuum" && (
                    <div className="space-y-4">
                      <div className="border-b border-stone-800 pb-3">
                        <p className="font-sans text-[11px] leading-relaxed text-stone-300">
                          Link earlier zines to carry their ideas, tone, and lineage into this issue.
                          Mimi will treat them as prior chapters—not material to repeat.
                        </p>
                      </div>

                      {recentZinesLoading ? (
                        <div className="flex items-center justify-center gap-2 py-8 text-stone-500">
                          <Loader2 size={14} className="animate-spin" />
                          <span className="font-mono text-[8px] uppercase tracking-widest">Loading recent zines</span>
                        </div>
                      ) : recentZines.length === 0 ? (
                        <div className="border border-dashed border-stone-700 p-5 text-center">
                          <BookOpen size={18} className="mx-auto mb-2 text-stone-500" />
                          <p className="font-serif italic text-sm text-stone-300">No earlier zines yet.</p>
                          <p className="font-sans text-[9px] text-stone-500 mt-1">
                            Publish your first piece, then return here to continue its thread.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                          {recentZines.map((zine) => {
                            const isLinked = linkedZineIds.includes(zine.id);
                            return (
                              <button
                                key={zine.id}
                                type="button"
                                aria-pressed={isLinked}
                                onClick={() => {
                                  setLinkedZineIds((current) =>
                                    isLinked
                                      ? current.filter((id) => id !== zine.id)
                                      : [...current, zine.id],
                                  );
                                  playClick();
                                }}
                                className={`w-full flex items-center gap-3 border p-2.5 text-left transition-colors ${
                                  isLinked
                                    ? "border-amber-500 bg-amber-500/10"
                                    : "border-stone-800 bg-stone-950/30 hover:border-stone-600"
                                }`}
                              >
                                <div className="w-12 h-14 shrink-0 border border-stone-700 bg-stone-900 overflow-hidden flex items-center justify-center">
                                  {zine.coverImageUrl ? (
                                    <img
                                      src={zine.coverImageUrl}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <BookOpen size={15} className="text-stone-500" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-serif italic text-sm text-stone-100 truncate">
                                    {zine.title || "Untitled zine"}
                                  </p>
                                  <p className="font-sans text-[9px] text-stone-500 line-clamp-2 mt-0.5">
                                    {zine.summary || zine.concept || zine.originalInput || "Prior editorial piece"}
                                  </p>
                                  <p className="font-mono text-[7px] uppercase tracking-widest text-stone-600 mt-1">
                                    {new Date(zine.timestamp || zine.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <span
                                  className={`w-7 h-7 shrink-0 border flex items-center justify-center ${
                                    isLinked
                                      ? "border-amber-500 bg-amber-500 text-black"
                                      : "border-stone-700 text-stone-500"
                                  }`}
                                  aria-hidden="true"
                                >
                                  {isLinked ? <Check size={13} /> : <LinkIcon size={13} />}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t border-stone-800 pt-3">
                        <span className="font-mono text-[8px] uppercase tracking-widest text-stone-500">
                          {linkedZineIds.length} linked
                        </span>
                        <button
                          type="button"
                          disabled={linkedZineIds.length === 0}
                          onClick={() => {
                            setActivePanel(null);
                            dispatchStudioAlert({message: `${linkedZineIds.length} prior zine${linkedZineIds.length === 1 ? "" : "s"} linked to this issue`,
                                  type: "success",});
                          }}
                          className="px-3 py-2 bg-[#FAF9F6] text-black disabled:opacity-30 font-mono text-[8px] uppercase tracking-widest font-bold"
                        >
                          Continue with selected
                        </button>
                      </div>
                    </div>
                  )}

                  {activePanel === "orchestrator" && (
                    <div className="space-y-4">
                      {/* Tailor Draft Section */}
                      <div className="space-y-2 border-b border-stone-850 pb-4">
                        <span className="block font-mono text-[8.5px] uppercase tracking-widest text-stone-400 font-bold">
                          ACTIVE TAILOR DRAFT
                        </span>
                        {profile?.tailorDraft ? (
                          <div className="bg-stone-950/40 border border-stone-850 p-3 font-mono text-[9px] text-stone-300 rounded-sm">
                            <p className="mb-2"><strong className="text-stone-400">Positioning Axis:</strong> {profile.tailorDraft.positioningCore?.positioningAxis || "None"}</p>
                            <p className="mb-2"><strong className="text-stone-400">Authority Claim:</strong> {profile.tailorDraft.positioningCore?.authorityClaim || "None"}</p>
                            <p className="mb-2"><strong className="text-stone-400">Era Bias:</strong> {profile.tailorDraft.positioningCore?.aestheticCore?.eraBias || "None"}</p>
                            <button
                              type="button"
                              onClick={() => {
                                window.dispatchEvent(
                                  new CustomEvent("mimi:change_view", { detail: "tailor" })
                                );
                                setActivePanel(null);
                              }}
                              className="mt-1 text-purple-400 hover:text-purple-300 uppercase text-[8px] tracking-widest block cursor-pointer"
                            >
                              Edit custom voice parameters →
                            </button>
                          </div>
                        ) : (
                          <div className="border border-dashed border-stone-800 p-4 text-center rounded-sm">
                            <p className="font-serif italic text-stone-500 text-[10px] mb-2">No tailor profile has been extracted yet.</p>
                            <button
                              type="button"
                              onClick={() => {
                                window.dispatchEvent(
                                  new CustomEvent("mimi:change_view", { detail: "tailor" })
                                );
                                setActivePanel(null);
                              }}
                              className="font-mono text-[8px] uppercase tracking-widest border border-stone-700 px-3 py-1.5 hover:text-stone-200 cursor-pointer"
                            >
                              Create custom voice profile
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Saved Darkroom Treatments section */}
                      <div className="space-y-2 relative">
                        <div className="flex justify-between items-center">
                          <span className="block font-mono text-[8.5px] uppercase tracking-widest text-stone-400 font-bold">
                            SAVED DARKROOM TREATMENTS
                          </span>
                          {profile?.savedTreatments && profile.savedTreatments.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsTreatmentSelectMode(!isTreatmentSelectMode);
                                setSelectedTreatmentIds([]);
                                playClick();
                              }}
                              className={`font-mono text-[7.5px] uppercase tracking-widest px-2 py-0.5 border transition-colors ${
                                isTreatmentSelectMode
                                  ? "bg-amber-500/10 border-amber-500 text-amber-500 font-bold"
                                  : "border-stone-800 hover:border-stone-750 text-stone-400 hover:text-stone-200"
                              }`}
                            >
                              {isTreatmentSelectMode ? "EXIT BATCH" : "BATCH ACTION"}
                            </button>
                          )}
                        </div>

                        {!profile?.savedTreatments?.length ? (
                          <div className="border border-dashed border-stone-800 p-4 text-center rounded-sm">
                            <p className="font-serif italic text-stone-500 text-[10px] mb-2">No saved style treatments found.</p>
                            <button
                              type="button"
                              onClick={() => {
                                window.dispatchEvent(
                                  new CustomEvent("mimi:change_view", { detail: "darkroom" })
                                );
                                setActivePanel(null);
                              }}
                              className="font-mono text-[8px] uppercase tracking-widest border border-stone-700 px-3 py-1.5 hover:text-stone-200 cursor-pointer"
                            >
                              Extract visual treatment in Darkroom
                            </button>
                          </div>
                        ) : (
                          <>
                            {(() => {
                              const sortedTreatments = [...(profile?.savedTreatments || [])].sort((a: any, b: any) => {
                                if (treatmentSortKey === "title") {
                                  return (a.treatmentName || "").localeCompare(b.treatmentName || "");
                                } else if (treatmentSortKey === "tags") {
                                  const tagsA = a.tags?.length || 0;
                                  const tagsB = b.tags?.length || 0;
                                  return tagsB - tagsA;
                                } else {
                                  // Default: date
                                  const getCreatedTimestamp = (t: any) => {
                                    if (t.createdAt) return t.createdAt;
                                    if (t.id?.startsWith("trt_")) {
                                      const parts = t.id.split("_");
                                      if (parts[1]) {
                                        const parsed = parseInt(parts[1]);
                                        if (!isNaN(parsed)) return parsed;
                                      }
                                    }
                                    return 0;
                                  };
                                  return getCreatedTimestamp(b) - getCreatedTimestamp(a);
                                }
                              });

                              return (
                                <div
                                  ref={gridContainerRef}
                                  onMouseDown={handleMouseDown}
                                  className={`grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto no-scrollbar pr-1 relative ${
                                    isTreatmentSelectMode ? "select-none" : ""
                                  }`}
                                >
                                  {lassoBox && (
                                    <div
                                      className="absolute border border-amber-500 bg-amber-500/10 pointer-events-none z-50 rounded-xs"
                                      style={{
                                        left: lassoBox.left,
                                        top: lassoBox.top,
                                        width: lassoBox.width,
                                        height: lassoBox.height,
                                      }}
                                    />
                                  )}
                                  {sortedTreatments.map((treatment: any) => {
                                    const isActive = activeTreatmentId === treatment.id;
                                    const isSelected = selectedTreatmentIds.includes(treatment.id);
                                    return (
                                      <div
                                        key={treatment.id}
                                        role="button"
                                        tabIndex={0}
                                        data-treatment-id={treatment.id}
                                        onDragStart={(e) => {
                                          if (isTreatmentSelectMode) e.preventDefault();
                                        }}
                                        onClick={() => {
                                          if (ignoreNextClickRef.current) {
                                            ignoreNextClickRef.current = false;
                                            return;
                                          }
                                          if (isTreatmentSelectMode) {
                                            if (isSelected) {
                                              setSelectedTreatmentIds((prev) => prev.filter((id) => id !== treatment.id));
                                            } else {
                                              setSelectedTreatmentIds((prev) => [...prev, treatment.id]);
                                            }
                                          } else {
                                            setActiveTreatmentId(isActive ? null : treatment.id);
                                          }
                                          playClick();
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            if (isTreatmentSelectMode) {
                                              if (isSelected) {
                                                setSelectedTreatmentIds((prev) => prev.filter((id) => id !== treatment.id));
                                              } else {
                                                setSelectedTreatmentIds((prev) => [...prev, treatment.id]);
                                              }
                                            } else {
                                              setActiveTreatmentId(isActive ? null : treatment.id);
                                            }
                                            playClick();
                                          }
                                        }}
                                        className={`text-left p-2.5 border transition-all relative group flex flex-col justify-between cursor-pointer select-none ${
                                          isSelected
                                            ? "bg-amber-950/20 border-amber-500 text-stone-100 shadow-[0_0_10px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/30"
                                            : isActive
                                            ? "bg-[#FAF9F6] border-[#FAF9F6] text-black"
                                            : "border-stone-850 hover:border-stone-750 bg-stone-950/20 text-stone-300"
                                        }`}
                                      >
                                        <div>
                                          <div className="flex justify-between items-start gap-1">
                                            <p className={`font-mono text-[8px] uppercase tracking-wide truncate flex-1 ${isActive && !isTreatmentSelectMode ? "text-black" : "text-stone-300"}`}>
                                              {treatment.treatmentName}
                                            </p>
                                            {!isTreatmentSelectMode && (
                                              <button
                                                type="button"
                                                title="Quick Look"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  e.preventDefault();
                                                  setQuickLookTreatmentId(treatment.id);
                                                  playClick();
                                                }}
                                                className={`p-0.5 rounded-xs transition-colors cursor-pointer z-10 shrink-0 ${
                                                  isActive
                                                    ? "text-stone-800 hover:bg-stone-300/60"
                                                    : "text-stone-400 hover:text-stone-100 hover:bg-stone-900"
                                                }`}
                                              >
                                                <Eye size={10} />
                                              </button>
                                            )}
                                          </div>
                                          <p className={`text-[7px] font-sans uppercase tracking-wider mt-0.5 ${isActive && !isTreatmentSelectMode ? "text-stone-700" : "text-stone-500"}`}>
                                            Saved Treatment
                                          </p>
                                          {treatment.tags && treatment.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1.5 max-h-[24px] overflow-hidden">
                                              {treatment.tags.map((tag: string) => (
                                                <span
                                                  key={tag}
                                                  className={`px-1 py-0.5 font-mono text-[6px] tracking-wider uppercase border rounded-xs ${
                                                    isActive && !isTreatmentSelectMode
                                                      ? "border-stone-400 bg-stone-200 text-stone-850"
                                                      : "border-stone-850 bg-stone-950/40 text-stone-400"
                                                  }`}
                                                >
                                                  {tag}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex justify-between items-center mt-2">
                                          <span className={`inline-flex items-center gap-1 font-mono text-[7px] uppercase tracking-widest ${isActive && !isTreatmentSelectMode ? "text-stone-800" : "text-stone-400"}`}>
                                            {isTreatmentSelectMode
                                              ? isSelected
                                                ? "✓ SELECTED"
                                                : "SELECT"
                                              : isActive
                                              ? "✓ ACTIVE"
                                              : "APPLY STYLE"}
                                          </span>
                                          
                                          {isTreatmentSelectMode && (
                                            <div className={`w-3.5 h-3.5 border flex items-center justify-center transition-all ${
                                              isSelected
                                                ? "bg-amber-500 border-amber-500 text-black"
                                                : "border-stone-700 bg-stone-900/50"
                                            }`}>
                                              {isSelected && <Check size={8} strokeWidth={3} />}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}

                            {/* Batch Action Panel */}
                            {isTreatmentSelectMode && (
                              <div className="p-3 bg-stone-900/80 border border-stone-850 flex flex-col gap-2 rounded-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex justify-between items-center border-b border-stone-850/50 pb-2 mb-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const allIds = (profile?.savedTreatments || []).map((t: any) => t.id);
                                      const areAllSelected = allIds.length > 0 && selectedTreatmentIds.length === allIds.length;
                                      if (areAllSelected) {
                                        setSelectedTreatmentIds([]);
                                      } else {
                                        setSelectedTreatmentIds(allIds);
                                      }
                                      playClick();
                                    }}
                                    className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-wider text-stone-300 hover:text-stone-100 cursor-pointer select-none"
                                  >
                                    <div className={`w-3.5 h-3.5 border flex items-center justify-center transition-all ${
                                      profile?.savedTreatments && profile.savedTreatments.length > 0 && selectedTreatmentIds.length === profile.savedTreatments.length
                                        ? "bg-amber-500 border-amber-500 text-black"
                                        : "border-stone-700 bg-stone-950/50"
                                    }`}>
                                      {profile?.savedTreatments && profile.savedTreatments.length > 0 && selectedTreatmentIds.length === profile.savedTreatments.length && (
                                        <Check size={8} strokeWidth={3} />
                                      )}
                                    </div>
                                    <span>Select All</span>
                                  </button>

                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-[8px] uppercase tracking-wider text-stone-400">
                                      {selectedTreatmentIds.length > 0
                                        ? `${selectedTreatmentIds.length} SELECTED`
                                        : "0 SELECTED"
                                      }
                                    </span>
                                    <AnimatePresence>
                                      {selectedTreatmentIds.length > 0 && (
                                        <motion.button
                                          initial={{ opacity: 0, x: 5 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          exit={{ opacity: 0, x: 5 }}
                                          transition={{ duration: 0.15 }}
                                          type="button"
                                          onClick={() => {
                                            setSelectedTreatmentIds([]);
                                            playClick();
                                          }}
                                          className="font-mono text-[7px] uppercase tracking-widest text-stone-400 hover:text-stone-200 cursor-pointer"
                                        >
                                          Clear
                                        </motion.button>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </div>

                                <div className="flex justify-between items-center bg-stone-950/40 px-2.5 py-1.5 border border-stone-850/50 rounded-xs mb-1">
                                  <span className="font-mono text-[7px] uppercase tracking-widest text-stone-500 font-bold">
                                    Sort covers by
                                  </span>
                                  <select
                                    value={treatmentSortKey}
                                    onChange={(e) => {
                                      setTreatmentSortKey(e.target.value as any);
                                      playClick();
                                    }}
                                    className="bg-transparent border-none text-stone-300 font-mono text-[8px] uppercase tracking-wider outline-none cursor-pointer pr-1 focus:ring-0"
                                  >
                                    <option value="date" className="bg-stone-900 text-stone-300">Date Created</option>
                                    <option value="title" className="bg-stone-900 text-stone-300">Title</option>
                                    <option value="tags" className="bg-stone-900 text-stone-300">Tag Count</option>
                                  </select>
                                </div>
                                
                                <AnimatePresence mode="wait">
                                  {selectedTreatmentIds.length === 0 ? (
                                    <motion.p
                                      key="instruction"
                                      initial={{ opacity: 0, y: -5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -5 }}
                                      transition={{ duration: 0.2 }}
                                      className="font-serif italic text-stone-500 text-[8.5px] text-center py-1.5 border border-dashed border-stone-850/50 rounded-xs"
                                    >
                                      Click covers below to select for batch action.
                                    </motion.p>
                                  ) : (
                                    <motion.div
                                      key="actions"
                                      initial={{ opacity: 0, y: 5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: 5 }}
                                      transition={{ duration: 0.2 }}
                                      className="space-y-2 mt-1"
                                    >
                                      {selectedTreatmentIds.length > 1 && (
                                        <div className="bg-stone-950/60 border border-stone-850 p-2 rounded-xs space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                          <div className="flex items-center gap-1.5 border-b border-stone-850/50 pb-1">
                                            <Info size={10} className="text-amber-500 shrink-0" />
                                            <span className="font-mono text-[7.5px] uppercase tracking-widest text-stone-300 font-bold">
                                              Batch Cover Info
                                            </span>
                                          </div>
                                          
                                          <div className="flex justify-between items-center text-[7.5px] font-mono uppercase tracking-wide">
                                            <span className="text-stone-500">Aggregate Tags</span>
                                            <span className="text-amber-500 font-bold">
                                              {aggregateTagCount} total {uniqueTags.length > 0 && `(${uniqueTags.length} unique)`}
                                            </span>
                                          </div>

                                          {uniqueTags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-0.5 max-h-[30px] overflow-y-auto no-scrollbar">
                                              {uniqueTags.slice(0, 5).map(tag => (
                                                <span key={tag} className="px-1 py-0.2 bg-stone-900 border border-stone-800 text-stone-400 text-[6.5px] font-mono rounded-xs">
                                                  #{tag}
                                                </span>
                                              ))}
                                              {uniqueTags.length > 5 && (
                                                <span className="text-stone-600 text-[6.5px] font-mono self-center">+{uniqueTags.length - 5} more</span>
                                              )}
                                            </div>
                                          )}

                                          <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-stone-850/50 text-[7px] font-mono">
                                            <div className="space-y-0.5">
                                              <span className="text-stone-500 uppercase tracking-wider block">Motifs</span>
                                              <span className="text-stone-300 block truncate" title={sharedMotifs.length > 0 ? sharedMotifs.join(", ") : uniqueMotifs.join(", ")}>
                                                {sharedMotifs.length > 0 ? (
                                                  <span className="text-amber-500 font-bold">✦ {sharedMotifs[0]}</span>
                                                ) : uniqueMotifs.length > 0 ? (
                                                  uniqueMotifs[0]
                                                ) : (
                                                  "—"
                                                )}
                                              </span>
                                            </div>

                                            <div className="space-y-0.5">
                                              <span className="text-stone-500 uppercase tracking-wider block">Moods</span>
                                              <span className="text-stone-300 block truncate" title={sharedMoods.length > 0 ? sharedMoods.join(", ") : uniqueMoods.join(", ")}>
                                                {sharedMoods.length > 0 ? (
                                                  <span className="text-amber-500 font-bold">✦ {sharedMoods[0]}</span>
                                                ) : uniqueMoods.length > 0 ? (
                                                  uniqueMoods[0]
                                                ) : (
                                                  "—"
                                                )}
                                              </span>
                                            </div>

                                            <div className="space-y-0.5">
                                              <span className="text-stone-500 uppercase tracking-wider block">Palette</span>
                                              <div className="flex gap-0.5 items-center h-3 mt-0.5">
                                                {sharedPalettes.length > 0 ? (
                                                  sharedPalettes.slice(0, 3).map((color, idx) => (
                                                    <div
                                                      key={idx}
                                                      className="w-2.5 h-2.5 rounded-full border border-stone-800 shrink-0"
                                                      style={{ backgroundColor: color }}
                                                      title={`Shared: ${color}`}
                                                    />
                                                  ))
                                                ) : uniquePalettes.length > 0 ? (
                                                  uniquePalettes.slice(0, 3).map((color, idx) => (
                                                    <div
                                                      key={idx}
                                                      className="w-2.5 h-2.5 rounded-full border border-stone-800 shrink-0"
                                                      style={{ backgroundColor: color }}
                                                      title={color}
                                                    />
                                                  ))
                                                ) : (
                                                  <span className="text-stone-600">—</span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      <div className="grid grid-cols-3 gap-1.5">
                                        <button
                                          type="button"
                                          disabled={selectedTreatmentIds.length === 0 || isMergingTreatments}
                                          onClick={handleBatchDeleteTreatments}
                                          className="py-1.5 flex items-center justify-center gap-1 font-mono text-[8px] uppercase tracking-widest bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/60 hover:border-red-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                          <Trash2 size={10} /> Delete
                                        </button>
                                        <button
                                          type="button"
                                          disabled={selectedTreatmentIds.length === 0 || isMergingTreatments}
                                          onClick={handleBatchExportTreatments}
                                          className="py-1.5 flex items-center justify-center gap-1 font-mono text-[8px] uppercase tracking-widest bg-stone-800 hover:bg-stone-750 text-stone-200 border border-stone-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                          <Download size={10} /> Export
                                        </button>
                                        <button
                                          type="button"
                                          disabled={selectedTreatmentIds.length === 0 || isMergingTreatments}
                                          onClick={handleBatchMergeTreatments}
                                          className="py-1.5 flex items-center justify-center gap-1 font-mono text-[8px] uppercase tracking-widest bg-amber-950/40 hover:bg-amber-900/40 text-amber-400 border border-amber-900/60 hover:border-amber-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                          {isMergingTreatments ? (
                                            <>
                                              <Loader2 size={10} className="animate-spin" /> Merging...
                                            </>
                                          ) : (
                                            <>
                                              <GitMerge size={10} /> Merge
                                            </>
                                          )}
                                        </button>
                                      </div>

                                      <button
                                        type="button"
                                        disabled={selectedTreatmentIds.length === 0 || isCompilingPDF || isMergingTreatments}
                                        onClick={handleDownloadPDF}
                                        className="py-1.5 w-full flex items-center justify-center gap-1.5 font-mono text-[8px] uppercase tracking-widest bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:border-amber-500/60 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                      >
                                        {isCompilingPDF ? (
                                          <>
                                            <Loader2 size={10} className="animate-spin" /> Compiling...
                                          </>
                                        ) : (
                                          <>
                                            <FileText size={10} /> Download as PDF
                                          </>
                                        )}
                                      </button>

                                      <div className="border-t border-stone-850/50 pt-2 space-y-1.5">
                                        <div className="flex justify-between items-center">
                                          <span className="font-mono text-[7px] uppercase tracking-widest text-stone-500 font-bold">
                                            Apply Category Tags
                                          </span>
                                          <button
                                            type="button"
                                            onClick={handleBatchClearTags}
                                            className="font-mono text-[6.5px] uppercase tracking-widest text-red-400/80 hover:text-red-400 cursor-pointer transition-colors"
                                          >
                                            Clear All Tags
                                          </button>
                                        </div>
                                        <div className="flex gap-1.5">
                                          <input
                                            type="text"
                                            value={batchTagInput}
                                            onChange={(e) => setBatchTagInput(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleBatchAddTags();
                                              }
                                            }}
                                            placeholder="vintage, dark, minimal (comma-separated)"
                                            className="flex-1 bg-stone-950/80 border border-stone-850 focus:border-stone-700 text-stone-300 font-mono text-[8.5px] px-2 py-1 outline-none transition-all placeholder:text-stone-600 rounded-xs"
                                          />
                                          <button
                                            type="button"
                                            disabled={!batchTagInput.trim()}
                                            onClick={handleBatchAddTags}
                                            className="px-3 bg-stone-800 hover:bg-stone-750 text-stone-200 border border-stone-700 font-mono text-[8px] uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                          >
                                            Apply
                                          </button>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )}
                          </>
                        )}

                        {/* Quick-Look Non-Modal Overlay */}
                        <AnimatePresence>
                          {quickLookTreatmentId && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.2, ease: "easeOut" }}
                              className="absolute inset-0 z-50 bg-stone-950/98 border border-stone-800 p-4 flex flex-col justify-between rounded-sm shadow-2xl overflow-hidden"
                            >
                              {/* Overlay Header */}
                              <div className="flex justify-between items-center border-b border-stone-850/60 pb-2 mb-2">
                                <span className="font-mono text-[7px] tracking-widest text-amber-500 font-extrabold uppercase">
                                  ✦ QUICK-LOOK SPECTRUM
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickLookTreatmentId(null);
                                    playClick();
                                  }}
                                  className="font-mono text-[7px] uppercase tracking-widest text-stone-400 hover:text-stone-200 cursor-pointer px-2 py-0.5 border border-stone-800 hover:border-stone-700 rounded-xs transition-colors"
                                >
                                  Close
                                </button>
                              </div>

                              {/* Main Display Frame */}
                              <div className="flex-1 flex flex-col items-center justify-center p-1 overflow-hidden">
                                <div 
                                  className="w-full max-w-[130px] aspect-[2/3] flex flex-col justify-between p-2.5 relative shadow-xl border border-stone-200/20 rounded-xs overflow-hidden"
                                  style={getTreatmentBackgroundStyle(quickLookTreatmentId, profile?.savedTreatments)}
                                >
                                  {/* Title only */}
                                  <div className="mb-2 border-b border-stone-800/10 pb-1">
                                    <p className={`line-clamp-2 text-center text-[9px] leading-tight tracking-tight ${getTreatmentTitleFontClass(quickLookTreatmentId, profile?.savedTreatments)}`}>
                                      {title || "UNTITLED CHRONICLE"}
                                    </p>
                                  </div>

                                  {/* Primary Artifact (Image Cover Slot) */}
                                  <div className="flex-1 w-full aspect-[4/5] relative border border-stone-950/15 overflow-hidden flex items-center justify-center bg-stone-900/10">
                                    {(() => {
                                      const coverImg = mediaFiles.find((m) => m.type === "image");
                                      if (coverImg && (coverImg.url || coverImg.data)) {
                                        return (
                                          <img
                                            src={coverImg.url || coverImg.data}
                                            alt="Zine cover artifact"
                                            className="w-full h-full object-cover select-none pointer-events-none"
                                            style={{
                                              filter: getTreatmentImageFilter(quickLookTreatmentId, profile?.savedTreatments),
                                            }}
                                            referrerPolicy="no-referrer"
                                          />
                                        );
                                      }
                                      return (
                                        <div className="text-[5.5px] font-mono tracking-widest text-stone-500 uppercase text-center px-1">
                                          No Cover Image
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {activePanel === "translation" && (
                    <div className="space-y-4">
                      <TranslationTerminal standalone={false} />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CuratorNote
        isOpen={showColophon}
        onClose={() => setShowColophon(false)}
      />
      <AnimatePresence>
        {legalType && (
          <LegalOverlay type={legalType} onClose={() => setLegalType(null)} />
        )}
      </AnimatePresence>
      
      {/* Full-size Image Preview Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={selectedImage}
              alt="Full preview"
              className="max-w-full max-h-full object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-size Cover Expanded Metadata, Artifacts & Editorial Comments Modal */}
      <AnimatePresence>
        {isCoverExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-stone-950/98 backdrop-blur-md flex items-center justify-center p-4 md:p-8 overflow-y-auto no-scrollbar"
            onClick={() => setIsCoverExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.97, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.97, y: 10 }}
              className="w-full max-w-5xl bg-stone-905 border border-stone-800 text-stone-100 flex flex-col md:flex-row h-full md:max-h-[85vh] shadow-2xl relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top status bar (editorial design) */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-purple-500 to-blue-500 z-10" />

              {/* LEFT SIDE: Tactile Cover Display */}
              <div className="w-full md:w-2/5 border-b md:border-b-0 md:border-r border-stone-800 p-6 flex flex-col items-center justify-center bg-stone-950/40 relative group shrink-0">
                <div className="absolute top-4 left-4 flex flex-col gap-0.5">
                  <span className="font-mono text-[7px] tracking-[0.25em] text-stone-500 font-extrabold uppercase">MIMI STUDIO</span>
                  <span className="font-mono text-[6px] tracking-[0.15em] text-amber-500 font-bold">COVER VERIFICATION PROFILER</span>
                </div>

                <div className="w-full max-w-[240px] studio-polaroid p-3 flex flex-col justify-between shadow-xl border border-stone-200/30 dark:border-stone-850 relative min-h-[390px] transition-all bg-stone-900"
                  style={getTreatmentBackgroundStyle(activeTreatmentId, profile?.savedTreatments)}>
                  
                  {/* Internal Cover Metadata badge */}
                  <div className="flex flex-col gap-0.5 mb-1.5 pb-1 border-b border-stone-800/10">
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="UNTITLED CHRONICLE"
                      aria-label="Cover title"
                      className="w-full bg-transparent border-0 p-0 font-mono text-[6px] tracking-widest text-stone-300 placeholder:text-stone-500 font-bold uppercase truncate focus:outline-none focus:ring-0"
                    />
                    <input
                      value={coverSystemCode}
                      onChange={(e) => setCoverSystemCode(e.target.value)}
                      aria-label="Cover registry code"
                      className="w-full bg-transparent border-0 p-0 font-mono text-[5px] tracking-wider text-stone-500 focus:text-stone-300 focus:outline-none focus:ring-0"
                    />
                  </div>

                  {/* Image render */}
                  <div className={`w-full aspect-[2/3] flex items-center justify-center border overflow-hidden relative ${getCoverBorderClass(coverBorder)}`}>
                    {isComposingCover && (
                      <div className="absolute inset-0 bg-stone-950/90 backdrop-blur-xs flex flex-col items-center justify-center text-center p-4 z-40 pointer-events-none">
                        <div className="relative w-10 h-10 flex items-center justify-center">
                          <div className="absolute inset-0 rounded-full border-2 border-stone-850 border-t-purple-500 animate-spin" />
                          <BrainCircuit size={16} className="text-purple-400 animate-pulse" />
                        </div>
                        <span className="font-mono text-[7px] tracking-[0.2em] text-purple-400 mt-3 uppercase font-bold animate-pulse">
                          Composing...
                        </span>
                      </div>
                    )}
                    {(() => {
                      const coverImg = mediaFiles.find((m) => m.type === "image");
                      if (coverImg && (coverImg.url || coverImg.data)) {
                        return (
                          <div className="w-full h-full relative">
                            <img
                              src={coverImg.url || coverImg.data}
                              alt="zine cover"
                              className="w-full h-full object-cover select-none pointer-events-none"
                              style={{ 
                                filter: getTreatmentImageFilter(activeTreatmentId, profile?.savedTreatments),
                                transform: `scale(${coverZoom}) translate(${coverPan.x / coverZoom}px, ${coverPan.y / coverZoom}px)`,
                                transformOrigin: "center center",
                              }}
                              referrerPolicy="no-referrer"
                            />
                            <StudioCoverOverlayCanvas layers={coverOverlayLayers} visible={coverOverlay} />
                          </div>
                        );
                      }
                      return (
                        <div className="text-stone-600 font-mono text-[7px] tracking-widest uppercase">
                          NO BASE COVER IMAGE
                        </div>
                      );
                    })()}
                  </div>

                  {/* Author / Signature block */}
                  <div className="mt-2.5 flex justify-between items-baseline">
                    <span className="font-mono text-[6px] tracking-widest text-stone-400 uppercase">
                      AUTHOR FRAGMENT
                    </span>
                    <input
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Anonymous"
                      aria-label="Cover author"
                      className="w-24 bg-transparent border-0 p-0 text-right font-serif italic text-[10px] text-stone-400 placeholder:text-stone-600 focus:text-stone-200 focus:outline-none focus:ring-0"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-col items-center gap-1">
                  <p className="font-mono text-[7px] text-stone-500 uppercase tracking-widest">
                    Zine Cover Viewport Zoom: {Math.round(coverZoom * 100)}%
                  </p>
                  <p className="font-mono text-[6px] text-stone-600 uppercase">
                    OFFSETS X: {coverPan.x} | Y: {coverPan.y}
                  </p>
                </div>
              </div>

              {/* RIGHT SIDE: Comprehensive Details, Artifacts, and Editorial Comments */}
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header panel */}
                <div className="p-6 border-b border-stone-800 flex justify-between items-center shrink-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[7px] bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-0.5 font-bold uppercase tracking-widest">
                        METADATA DOSSIER
                      </span>
                      <span className="font-mono text-[7px] bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-0.5 font-bold uppercase tracking-widest">
                        MIMI INTEGRATION
                      </span>
                    </div>
                    <h2 className="font-serif italic text-xl text-[#F4F3EF] mt-1.5 uppercase tracking-wide">
                      {title || "UNTITLED ZINE"}
                    </h2>
                    <p className="font-mono text-[8px] text-stone-400 tracking-wider mt-0.5">
                      COMPOSED ON: {new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setIsCoverExpanded(false);
                      playClick();
                    }}
                    className="h-8 w-8 rounded-none border border-stone-850 hover:border-stone-700 hover:text-white text-stone-400 flex items-center justify-center transition-colors cursor-pointer bg-stone-950/20"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Main scrollable body */}
                <div className="flex-1 p-6 overflow-y-auto no-scrollbar space-y-8 bg-stone-900/40">
                  
                  {/* AI Cover Composition Panel */}
                  <div className="border border-stone-800 bg-stone-950/30 p-5 space-y-4 rounded-xs">
                    <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={11} className="text-amber-500 animate-pulse" />
                        <span className="font-mono text-[8px] tracking-widest uppercase font-extrabold text-[#F4F3EF]">
                          AI COVER COMPOSITION ENGINE
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {hasLiveAi ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[6.5px] font-bold tracking-widest text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-sm border border-emerald-500/20">
                            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                            AI CONFIGURED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-mono text-[6.5px] font-bold tracking-widest text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-sm border border-amber-500/20">
                            SIMULATED MODE
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <textarea
                        rows={3}
                        placeholder="Describe the cover to generate or edit with AI..."
                        value={leftPrompt}
                        onChange={(e) => setLeftPrompt(e.target.value)}
                        className="w-full bg-stone-950/40 border border-stone-800 text-xs italic placeholder:text-stone-600 text-stone-100 p-3 resize-none outline-none focus:border-stone-600 transition-colors rounded-none"
                      />

                      <div className="flex justify-between items-center">
                        <div className="text-[8px] text-stone-500 font-mono">
                          {leftPrompt.length > 0 ? `${leftPrompt.length} characters` : "Using default/progressive parameters"}
                        </div>
                        <button
                          type="button"
                          disabled={isComposingCover}
                          onClick={() => void handleComposeCover()}
                          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/40 text-stone-950 font-mono text-[9px] font-extrabold uppercase tracking-widest transition-all inline-flex items-center gap-1.5 rounded-none shadow-md cursor-pointer"
                        >
                          {isComposingCover ? (
                            <>
                              <Loader2 size={11} className="animate-spin text-stone-950" /> COMPOSING...
                            </>
                          ) : (
                            <>
                              <Sparkles size={11} /> COMPOSE COVER IMAGE
                            </>
                          )}
                        </button>
                      </div>

                      {composeCoverError && (
                        <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-none mt-2">
                          <p className="font-mono text-[8px] text-red-400 leading-snug">{composeCoverError}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Grid section 1: Basic Technical Specifications & Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Visual Attributes */}
                    <div className="border border-stone-800/80 bg-stone-950/20 p-4 space-y-3">
                      <div className="flex items-center gap-1.5 border-b border-stone-800/60 pb-1.5">
                        <Layers size={10} className="text-amber-500" />
                        <span className="font-mono text-[8px] tracking-wider uppercase font-extrabold text-stone-300">
                          VISUAL SPECS
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-y-2 text-[10px]">
                        <div className="flex flex-col">
                          <span className="font-mono text-[6.5px] text-stone-500 uppercase tracking-widest">AESTHETIC STYLE</span>
                          <span className="font-sans text-stone-300 uppercase font-bold text-[9px] truncate">
                            {getTreatmentLabel(activeTreatmentId, profile?.savedTreatments) || "NATIVE STYLE"}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono text-[6.5px] text-stone-500 uppercase tracking-widest">BORDER TREATMENT</span>
                          <span className="font-sans text-stone-300 uppercase font-bold text-[9px]">
                            {coverBorder} MODE
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono text-[6.5px] text-stone-500 uppercase tracking-widest">TEXT ALIGNMENT</span>
                          <span className="font-sans text-stone-300 uppercase font-bold text-[9px]">
                            {coverAlign}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono text-[6.5px] text-stone-500 uppercase tracking-widest">OVERLAY LAYERS</span>
                          <span className="font-sans text-stone-300 uppercase font-bold text-[9px]">
                            {coverOverlayLayers.length} FRAGMENTS
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Brief preset and provider-neutral gateway settings */}
                    <div className="border border-stone-800/80 bg-stone-950/20 p-4 space-y-3">
                      <div className="flex items-center gap-1.5 border-b border-stone-800/60 pb-1.5">
                        <Settings size={10} className="text-purple-400" />
                        <span className="font-mono text-[8px] tracking-wider uppercase font-extrabold text-stone-300">
                          BRIEF CALIBRATION
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-y-2 text-[10px]">
                        <div className="flex flex-col col-span-2">
                          <span className="font-mono text-[6.5px] text-stone-500 uppercase tracking-widest">ACTIVE BRIEF PRESET</span>
                          <span className="font-sans text-stone-300 font-bold text-[9px]">
                            {activeCognitivePersona?.title || "Sovereign Scribe"}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono text-[6.5px] text-stone-500 uppercase tracking-widest">AI GATEWAY ROLE</span>
                          <span className="font-sans text-stone-300 font-bold text-[9px] uppercase">
                            {activeCognitivePersona?.gatewayCapability || "text-fast"}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono text-[6.5px] text-stone-500 uppercase tracking-widest">CREATIVE RANGE</span>
                          <span className="font-sans text-stone-300 font-bold text-[9px]">
                            {activeCognitivePersona?.temperature || 0.85}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: List of Artifacts */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 border-b border-stone-800 pb-2">
                      <FileCode size={11} className="text-blue-400" />
                      <span className="font-mono text-[9px] tracking-widest uppercase font-extrabold text-[#F4F3EF]">
                        COLLECTED ARTIFACT REGISTRY ({mediaFiles.length})
                      </span>
                    </div>

                    {mediaFiles.length === 0 ? (
                      <p className="font-serif italic text-stone-500 text-[10.5px] py-2">
                        No artifacts currently registered. Drag or upload visual items to embed them in the zine chronicle.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {mediaFiles.map((file, idx) => {
                          const analysis = mediaAnalysis[idx];
                          return (
                            <div key={idx} className="border border-stone-850 bg-stone-950/10 p-3 flex gap-3 items-start hover:border-stone-800 transition-colors">
                              {file.type === "image" && (file.url || file.data) ? (
                                <img
                                  src={file.url || file.data}
                                  alt={file.name}
                                  className="w-12 h-12 object-cover border border-stone-800 shrink-0 bg-stone-900"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-12 h-12 border border-stone-800 flex items-center justify-center bg-stone-900 shrink-0">
                                  <FileText size={16} className="text-stone-500" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1 space-y-1">
                                <p className="font-mono text-[8px] text-[#FAF9F6] font-bold truncate uppercase tracking-wider">
                                  {file.name || `FRAGMENT #${idx + 1}`}
                                </p>
                                <p className="font-mono text-[6.5px] text-stone-500 uppercase">
                                  KIND: {file.type || "unknown"} ({file.mimeType || "raw"})
                                </p>
                                
                                {(() => {
                                  const tags = coerceToStringArray(analysis?.tags);
                                  if (tags.length === 0) return null;
                                  return (
                                  <div className="flex flex-wrap gap-1 pt-1">
                                    {tags.slice(0, 3).map((tag, tIdx) => (
                                      <span key={tIdx} className="font-mono text-[5.5px] uppercase tracking-widest bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded-none border border-stone-750">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                  );
                                })()}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Section 3: Editorial Comments & Intentions */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-1.5 border-b border-stone-800 pb-2">
                      <BookOpen size={11} className="text-amber-500" />
                      <span className="font-mono text-[9px] tracking-widest uppercase font-extrabold text-[#F4F3EF]">
                        EDITORIAL MANUSCRIPT & DIRECTIONS
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Left: Raw Draft / Manuscript text */}
                      <div className="md:col-span-2 border border-stone-800 bg-stone-950/20 p-4 space-y-2 flex flex-col min-h-[220px]">
                        <span className="font-mono text-[7px] uppercase tracking-widest text-stone-400 font-extrabold block">
                          RAW TEXT / COMPOSITION MATERIAL
                        </span>
                        <textarea
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="Draft is currently empty. Provide textual prompts or narratives in the workspace to initiate shaping."
                          aria-label="Raw composition material"
                          className="flex-1 min-h-[180px] max-h-[240px] resize-y bg-stone-950/40 p-3 text-[11px] font-serif text-stone-200 placeholder:text-stone-600 leading-relaxed overflow-y-auto border border-stone-900 rounded-none focus:outline-none focus:border-amber-500/60"
                        />
                      </div>

                      {/* Right: Editorial Metadata & Comments */}
                      <div className="border border-stone-800 bg-stone-950/20 p-4 space-y-4">
                        <span className="font-mono text-[7px] uppercase tracking-widest text-amber-500 font-extrabold block border-b border-stone-800/40 pb-1">
                          EDITORIAL PROFILE & GUIDELINES
                        </span>

                        <div className="space-y-3.5 text-[10px]">
                          {editorialIntention && (
                            <div className="space-y-0.5">
                              <span className="font-mono text-[6.5px] text-stone-500 uppercase tracking-widest block font-bold">EDITORIAL INTENTION</span>
                              <p className="font-serif italic text-stone-300 leading-normal">{editorialIntention}</p>
                            </div>
                          )}

                          {centralTension && (
                            <div className="space-y-0.5">
                              <span className="font-mono text-[6.5px] text-purple-400 uppercase tracking-widest block font-bold">CENTRAL TENSION</span>
                              <p className="font-sans text-stone-300 leading-normal">{centralTension}</p>
                            </div>
                          )}

                          {desiredFeeling && (
                            <div className="space-y-0.5">
                              <span className="font-mono text-[6.5px] text-blue-400 uppercase tracking-widest block font-bold">DESIRED FEELING</span>
                              <p className="font-sans text-stone-300 leading-normal">{desiredFeeling}</p>
                            </div>
                          )}

                          {(avoidExclude || coverAvoid) && (
                            <div className="space-y-0.5">
                              <span className="font-mono text-[6.5px] text-red-500 uppercase tracking-widest block font-bold">AVOIDANCES / NEGATIVE SPACE</span>
                              <p className="font-sans text-stone-350 leading-normal">{avoidExclude || coverAvoid}</p>
                            </div>
                          )}

                          {!editorialIntention && !centralTension && !desiredFeeling && !avoidExclude && !coverAvoid && (
                            <p className="font-serif italic text-stone-500 leading-relaxed text-[10.5px]">
                              No explicit editorial filters applied yet. Use the Signal and Orchestrator sidebars to declare creative restrictions and goals.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Footer panel */}
                <div className="p-4 bg-stone-950/40 border-t border-stone-800 flex justify-between items-center shrink-0">
                  <span className="font-mono text-[6.5px] tracking-widest text-stone-500 font-extrabold uppercase">
                    SYSTEM ATOMS STABILIZED // MIMI PRESS
                  </span>
                  <button
                    onClick={() => {
                      setIsCoverExpanded(false);
                      playClick();
                    }}
                    className="px-6 py-2 bg-[#FAF9F6] text-black text-[8px] font-mono uppercase tracking-widest font-extrabold hover:bg-stone-200 transition-colors"
                  >
                    CLOSE PROFILER
                  </button>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        type="file"
        id="media-upload"
        name="mediaUpload"
        ref={mediaInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
        accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt,*/*"
      />
    </div>
  );
};
