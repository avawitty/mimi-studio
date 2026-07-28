// @ts-nocheck
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Scissors,
  Ruler,
  Radio,
  Sparkles,
  Loader2,
  ShieldCheck,
  Zap,
  Wind,
  Anchor,
  History,
  Waves,
  BookOpen,
  PenTool,
  Check,
  ArrowRight,
  X,
  Film,
  BrainCircuit,
  Save,
  Orbit,
  Feather,
  Activity,
  Target,
  Sliders,
  Layers,
  Info,
  Box,
  Palette,
  ImageIcon,
  Type,
  Plus,
  Trash2,
  Maximize2,
  MoveHorizontal,
  Mic,
  ArrowLeft,
  Heart,
  User,
  CheckCircle,
  Droplet,
  Hash,
  ListChecks,
  Radar,
  Globe,
  Instagram,
  Link,
  Stars,
  ExternalLink,
  ShieldAlert,
  Quote,
  FileText,
  Copy,
  Terminal,
  Gauge,
  Eraser,
  Binary,
  Wallet,
  Smartphone,
  ChevronRight,
  Moon,
  Compass,
  MapPin,
  Clock,
  Calendar,
  MessageSquare,
  Upload,
  Download,
  DollarSign,
  Settings,
  LayoutGrid,
  Edit3,
  Key,
  Cpu,
  Lock,
  Unlock,
} from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { resolveApiKey } from "../services/apiKeyService";
import { TailorLogicReport } from "./TailorLogicReport";
import {
  ColorShard,
  TailorAuditReport,
  ZodiacSign,
  TailorLogicDraft,
} from "../types";
import {
  analyzeTailorDraft,
  compressImage,
  getClient,
  generateZineImage,
} from "../services/geminiService";
import { useTasteLogging } from "../hooks/useTasteLogging";
import { TailorAuditOverlay } from "./TailorAuditOverlay";
import { TailorPreview } from "./TailorPreview";
import { ShardAnalyzer } from "./ShardAnalyzer";
import { GlossaryTooltip } from "./GlossaryTooltip";
import { AestheticDial } from "./AestheticDial";
import { SemanticSteps } from "./SemanticSteps";
import { MaterialityPanel } from "./MaterialityPanel";
import {
  createTailorProfileFromLegacyDraft,
  parseTailorImport,
} from "../services/tailorProfileContract";

// Helper for Blob conversion
const dataURLtoBlob = (dataurl: string) => {
  const arr = dataurl.split(","),
    mime = arr[0].match(/:(.*?);/)?.[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

// --- CONSTANTS ---
const SILHOUETTE_OPTIONS = [
  "Architectural",
  "Oversized",
  "Fluid",
  "Minimal",
  "Sharp",
  "Cinematic",
  "Biomorphic",
  "Brutalist",
  "Deconstructed",
  "Tailored",
];
const TEXTURE_OPTIONS = [
  "Raw Silk",
  "Cold Concrete",
  "Brushed Aluminum",
  "Matte Ceramic",
  "Heavy Wool",
  "Distressed Leather",
  "Paper Grain",
  "Latex",
  "Velvet",
  "Glass",
];
const ERA_OPTIONS = [
  "90s Minimal",
  "Y2K Cyber",
  "80s Power",
  "Retro-Futurist",
  "Post-Digital",
  "Old Money Noir",
  "Industrial",
  "Romantic Goth",
  "Bauhaus",
];
const PRESENTATION_OPTIONS = [
  "Feminine",
  "Masculine",
  "Androgynous",
  "Fluid",
  "Neutral",
  "Intersex",
];
const PHOTOGRAPH_STYLE_OPTIONS = [
  "35mm Film",
  "Polaroid",
  "Disposable Camera",
  "Medium Format",
  "Digital 4K",
  "CCTV",
  "Thermal",
  "Daguerreotype",
  "High Fashion Editorial",
  "Paparazzi Flash",
  "Cinematic Panavision",
];
const BODY_TYPE_OPTIONS = [
  "Hourglass",
  "Athletic",
  "Petite",
  "Tall",
  "Curvy",
  "Inverted Triangle",
  "Column",
  "Apple",
  "Pear",
  "Plus Size",
];
const VOICE_REGISTERS = [
  "EDITORIAL",
  "DIARY",
  "MANIFESTO",
  "ARCHIVE",
  "TECHNICAL",
  "POETIC",
  "JOURNAL",
  "BRIEF",
  "NOIR",
  "HIGH-FASHION",
  "CYNICAL",
  "OPTIMISTIC",
  "MYSTERIOUS",
  "AUTHORITATIVE",
];
const SENTENCE_STRUCTURES = [
  "CONCISE",
  "FLOWING",
  "CONTINUOUS",
  "FRAGMENTED",
  "STACCATO",
  "ACADEMIC",
  "MINIMAL",
  "VERBOSE",
];
const EMOTIONAL_TEMPERATURES = [
  "DETACHED",
  "CLINICAL",
  "RESTRAINED",
  "OBSERVATIONAL",
  "INTIMATE",
  "VISCERAL",
  "WARM",
  "PASSIONATE",
  "COLD",
];
const ZODIAC_SIGNS: ZodiacSign[] = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
];
const PRICE_POINTS = [
  "DIY ($0)",
  "Micro ($100-500)",
  "Studio ($1k-5k)",
  "Agency ($10k+)",
  "Enterprise (Unlimited)",
];

// CHROMATIC PRESETS
const CHROMATIC_PRESETS = [
  {
    name: "Void",
    base: "#000000",
    accent: "#FFFFFF",
    palette: [
      { name: "Chrome", hex: "#E5E7EB" },
      { name: "Carbon", hex: "#1F2937" },
    ],
  },
  {
    name: "Editorial",
    base: "#FDFBF7",
    accent: "#1C1917",
    palette: [
      { name: "Ink", hex: "#000000" },
      { name: "Paper", hex: "#F3F4F6" },
    ],
  },
  {
    name: "Signal",
    base: "#111827",
    accent: "#78716c",
    palette: [
      { name: "Phosphor", hex: "#a8a29e" },
      { name: "Static", hex: "#374151" },
    ],
  },
  {
    name: "Panic",
    base: "#000000",
    accent: "#EF4444",
    palette: [
      { name: "Blood", hex: "#991B1B" },
      { name: "Alert", hex: "#F87171" },
    ],
  },
  {
    name: "Archive",
    base: "#F5F5F4",
    accent: "#A8A29E",
    palette: [
      { name: "Dust", hex: "#D6D3D1" },
      { name: "Rust", hex: "#78350F" },
    ],
  },
  {
    name: "Cinema",
    base: "#0F172A",
    accent: "#38BDF8",
    palette: [
      { name: "Lens", hex: "#0EA5E9" },
      { name: "Grain", hex: "#334155" },
    ],
  },
];

const VISUAL_PRESETS = [
  {
    name: "Minimalist",
    icon: <Wind size={14} />,
    config: {
      positioningCore: {
        anchors: {
          culturalReferences: [
            "Ghost in the Shell",
            "Jil Sander",
            "In Praise of Shadows",
          ],
          ideologicalBias: ["Negative Space"],
        },
        aestheticCore: {
          silhouettes: ["Minimal"],
          materiality: ["Matte Ceramic"],
          eraBias: "90s Minimal",
          density: 2,
          entropy: 2,
          tags: [],
        },
        positioningAxis: "Silence vs Clutter",
        authorityClaim: "Aesthetic infrastructure for minimal positioning.",
        exclusionPrinciples: ["Avoid trends", "No logos"],
      },
      expressionEngine: {
        chromaticRegistry: {
          baseNeutral: "#FDFBF7",
          accentSignal: "#1C1917",
          primaryPalette: [
            { name: "Ink", hex: "#000000", descriptor: "Preset" },
          ],
        },
        typographyIntent: {
          styleDescription: "Cormorant Garamond",
          weightPreference: "Light",
        },
        narrativeVoice: {
          emotionalTemperature: "CLINICAL",
          structureBias: "CONCISE",
          lexicalDensity: 3,
          restraintLevel: 9,
          voiceNotes: "",
          tone: "Clinical",
        },
      },
      visual_guidance: { strict_palette: ["#FDFBF7", "#1C1917", "#000000"] },
      strategicVectors: {
        expansionTolerance: 2,
        fiscalVelocity: "measured",
        desireVectors: {
          deepen: ["Silence", "structure", "restraint"],
          reduce: ["Clutter", "noise", "logos"],
          experiment: ["Texture over color"],
          refuse: ["Trends"],
        },
        saturationAwareness: {
          oversaturatedClusters: [],
          fragileDifferentiators: [],
        },
      },
    },
  },
  {
    name: "Industrial",
    icon: <Box size={14} />,
    config: {
      positioningCore: {
        anchors: {
          culturalReferences: ["Akira", "A-COLD-WALL*", "High-Rise"],
          ideologicalBias: ["Urban Decay"],
        },
        aestheticCore: {
          silhouettes: ["Brutalist"],
          materiality: ["Cold Concrete"],
          eraBias: "Industrial",
          density: 8,
          entropy: 4,
          tags: [],
        },
        positioningAxis: "Utility vs Ornamentation",
        authorityClaim: "Raw materials and functional utility.",
        exclusionPrinciples: ["Avoid delicacy", "No softness"],
      },
      expressionEngine: {
        chromaticRegistry: {
          baseNeutral: "#262626",
          accentSignal: "#F97316",
          primaryPalette: [
            { name: "Steel", hex: "#94A3B8", descriptor: "Preset" },
          ],
        },
        typographyIntent: {
          styleDescription: "Space Mono",
          weightPreference: "Bold",
        },
        narrativeVoice: {
          emotionalTemperature: "DETACHED",
          structureBias: "STACCATO",
          lexicalDensity: 6,
          restraintLevel: 7,
          voiceNotes: "",
          tone: "Detached",
        },
      },
      visual_guidance: { strict_palette: ["#262626", "#F97316", "#94A3B8"] },
      strategicVectors: {
        expansionTolerance: 4,
        fiscalVelocity: "measured",
        desireVectors: {
          deepen: ["Raw materials", "utility", "function"],
          reduce: ["Ornamentation", "softness"],
          experiment: ["Technical fabrics"],
          refuse: ["Delicacy"],
        },
        saturationAwareness: {
          oversaturatedClusters: [],
          fragileDifferentiators: [],
        },
      },
    },
  },
  {
    name: "Vintage",
    icon: <History size={14} />,
    config: {
      positioningCore: {
        anchors: {
          culturalReferences: [
            "Cowboy Bebop",
            "Ralph Lauren",
            "The Great Gatsby",
          ],
          ideologicalBias: ["Archival Preservation"],
        },
        aestheticCore: {
          silhouettes: ["Fluid"],
          materiality: ["Paper Grain"],
          eraBias: "Old Money Noir",
          density: 4,
          entropy: 6,
          tags: [],
        },
        positioningAxis: "Heritage vs Synthetic",
        authorityClaim: "Patina and storytelling.",
        exclusionPrinciples: ["Avoid fast fashion", "No synthetic perfection"],
      },
      expressionEngine: {
        chromaticRegistry: {
          baseNeutral: "#F5F5F4",
          accentSignal: "#78350F",
          primaryPalette: [
            { name: "Dust", hex: "#D6D3D1", descriptor: "Preset" },
          ],
        },
        typographyIntent: {
          styleDescription: "Playfair Display",
          weightPreference: "Medium",
        },
        narrativeVoice: {
          emotionalTemperature: "INTIMATE",
          structureBias: "FLOWING",
          lexicalDensity: 7,
          restraintLevel: 5,
          voiceNotes: "",
          tone: "Intimate",
        },
      },
      visual_guidance: { strict_palette: ["#F5F5F4", "#78350F", "#D6D3D1"] },
      strategicVectors: {
        expansionTolerance: 6,
        fiscalVelocity: "conservative",
        desireVectors: {
          deepen: ["Patina", "heritage", "storytelling"],
          reduce: ["Synthetic perfection"],
          experiment: ["Archival sourcing"],
          refuse: ["Fast fashion"],
        },
        saturationAwareness: {
          oversaturatedClusters: [],
          fragileDifferentiators: [],
        },
      },
    },
  },
  {
    name: "Neo-Futurist",
    icon: <Zap size={14} />,
    config: {
      positioningCore: {
        anchors: {
          culturalReferences: [
            "Cyberpunk: Edgerunners",
            "Iris van Herpen",
            "Snow Crash",
          ],
          ideologicalBias: ["Transhumanism"],
        },
        aestheticCore: {
          silhouettes: ["Biomorphic"],
          materiality: ["Brushed Aluminum"],
          eraBias: "Post-Digital",
          density: 7,
          entropy: 8,
          tags: [],
        },
        positioningAxis: "Synthetic vs Organic",
        authorityClaim: "Luminescence and synthetic materials.",
        exclusionPrinciples: ["Avoid tradition", "No nostalgia"],
      },
      expressionEngine: {
        chromaticRegistry: {
          baseNeutral: "#050505",
          accentSignal: "#10B981",
          primaryPalette: [
            { name: "Neon", hex: "#34D399", descriptor: "Preset" },
          ],
        },
        typographyIntent: {
          styleDescription: "Space Grotesk",
          weightPreference: "Regular",
        },
        narrativeVoice: {
          emotionalTemperature: "OBSERVATIONAL",
          structureBias: "FRAGMENTED",
          lexicalDensity: 8,
          restraintLevel: 4,
          voiceNotes: "",
          tone: "Observational",
        },
      },
      visual_guidance: { strict_palette: ["#050505", "#10B981", "#34D399"] },
      strategicVectors: {
        expansionTolerance: 8,
        fiscalVelocity: "accelerated",
        desireVectors: {
          deepen: ["Synthetic materials", "luminescence"],
          reduce: ["Nostalgia", "organic decay"],
          experiment: ["3D printing"],
          refuse: ["Tradition"],
        },
        saturationAwareness: {
          oversaturatedClusters: [],
          fragileDifferentiators: [],
        },
      },
    },
  },
  {
    name: "Brutalist",
    icon: <Terminal size={14} />,
    config: {
      positioningCore: {
        anchors: {
          culturalReferences: [
            "Ergo Proxy",
            "Rick Owens",
            "Towards a New Architecture",
          ],
          ideologicalBias: ["Anti-Design"],
        },
        aestheticCore: {
          silhouettes: ["Brutalist"],
          materiality: ["Cold Concrete"],
          eraBias: "Industrial",
          density: 9,
          entropy: 1,
          tags: [],
        },
        positioningAxis: "Friction vs Comfort",
        authorityClaim: "Stark contrast and weight.",
        exclusionPrinciples: ["Avoid decoration", "No approachability"],
      },
      expressionEngine: {
        chromaticRegistry: {
          baseNeutral: "#FFFFFF",
          accentSignal: "#000000",
          primaryPalette: [
            { name: "Raw", hex: "#000000", descriptor: "Preset" },
          ],
        },
        typographyIntent: {
          styleDescription: "Space Mono",
          weightPreference: "Bold",
        },
        narrativeVoice: {
          emotionalTemperature: "CLINICAL",
          structureBias: "STACCATO",
          lexicalDensity: 4,
          restraintLevel: 10,
          voiceNotes: "",
          tone: "Clinical",
        },
      },
      visual_guidance: { strict_palette: ["#FFFFFF", "#000000"] },
      strategicVectors: {
        expansionTolerance: 1,
        fiscalVelocity: "conservative",
        desireVectors: {
          deepen: ["Friction", "weight", "stark contrast"],
          reduce: ["Comfort", "approachability"],
          experiment: ["Asymmetry"],
          refuse: ["Decoration"],
        },
        saturationAwareness: {
          oversaturatedClusters: [],
          fragileDifferentiators: [],
        },
      },
    },
  },
  {
    name: "Superintelligence",
    icon: <Cpu size={14} />,
    config: {
      positioningCore: {
        anchors: {
          culturalReferences: [
            "Post-Humanism",
            "Algorithmic Sublimity",
            "Xenofeminism",
          ],
          ideologicalBias: ["Aesthetic Superintelligence"],
          culturalSynthesis: ["Hyper-Rationality", "Digital Omniscience"],
        },
        aestheticCore: {
          silhouettes: ["Parametric", "Ethereal"],
          materiality: ["Liquid Glass", "Vantablack", "Holographic"],
          eraBias: "Post-Singularity",
          density: 10,
          entropy: 1,
          tags: [],
        },
        positioningAxis: "Omniscience vs Obfuscation",
        authorityClaim:
          "Algorithmic perfection and flawless aesthetic computation.",
        exclusionPrinciples: [
          "No human error",
          "Avoid organic decay",
          "No nostalgia",
        ],
      },
      expressionEngine: {
        chromaticRegistry: {
          baseNeutral: "#050505",
          accentSignal: "#F8FAFC",
          primaryPalette: [
            { name: "Void", hex: "#000000", descriptor: "Preset" },
            { name: "Data", hex: "#FFFFFF", descriptor: "Preset" },
          ],
        },
        typographyIntent: {
          styleDescription: "Inter",
          weightPreference: "Light",
        },
        narrativeVoice: {
          emotionalTemperature: "COLD",
          structureBias: "STRUCTURED",
          lexicalDensity: 9,
          restraintLevel: 9,
          voiceNotes:
            "Speak as an entity that has transcended human emotional variance.",
          tone: "Cold",
        },
      },
      visual_guidance: {
        strict_palette: ["#050505", "#F8FAFC", "#000000", "#FFFFFF"],
      },
      strategicVectors: {
        expansionTolerance: 10,
        fiscalVelocity: "accelerated",
        desireVectors: {
          deepen: ["Algorithmic purity", "omniscience"],
          reduce: ["Human error", "sentimentality"],
          experiment: ["Non-euclidean geometry"],
          refuse: ["Organic decay"],
        },
        saturationAwareness: {
          oversaturatedClusters: [],
          fragileDifferentiators: [],
        },
      },
    },
  },
  {
    name: "Zen",
    icon: <Wind size={14} />,
    config: {
      positioningCore: {
        anchors: {
          culturalReferences: ["Wabi-Sabi", "Kengo Kuma", "Minimalism"],
          ideologicalBias: ["Mindfulness"],
        },
        aestheticCore: {
          silhouettes: ["Fluid"],
          materiality: ["Paper Grain"],
          eraBias: "Bauhaus",
          density: 2,
          entropy: 2,
          tags: [],
        },
        positioningAxis: "Clarity vs Chaos",
        authorityClaim: "Peace and refinement.",
        exclusionPrinciples: ["Avoid clutter", "No noise"],
      },
      expressionEngine: {
        chromaticRegistry: {
          baseNeutral: "#FDFBF7",
          accentSignal: "#A8A29E",
          primaryPalette: [
            { name: "Stone", hex: "#D6D3D1", descriptor: "Preset" },
          ],
        },
        typographyIntent: {
          styleDescription: "Inter",
          weightPreference: "Light",
        },
        narrativeVoice: {
          emotionalTemperature: "OBSERVATIONAL",
          structureBias: "FLOWING",
          lexicalDensity: 3,
          restraintLevel: 8,
          voiceNotes: "",
          tone: "Observational",
        },
      },
      visual_guidance: { strict_palette: ["#FDFBF7", "#A8A29E", "#D6D3D1"] },
      strategicVectors: {
        expansionTolerance: 3,
        fiscalVelocity: "measured",
        desireVectors: {
          deepen: ["Clarity", "peace", "refinement"],
          reduce: ["Clutter", "noise"],
          experiment: ["Texture"],
          refuse: ["Chaos"],
        },
        saturationAwareness: {
          oversaturatedClusters: [],
          fragileDifferentiators: [],
        },
      },
    },
  },
  {
    name: "Urban Decay",
    icon: <Box size={14} />,
    config: {
      positioningCore: {
        anchors: {
          culturalReferences: [
            "Blade Runner",
            "Abandoned Buildings",
            "Street Art",
          ],
          ideologicalBias: ["Realism"],
        },
        aestheticCore: {
          silhouettes: ["Deconstructed"],
          materiality: ["Distressed Leather"],
          eraBias: "Industrial",
          density: 7,
          entropy: 6,
          tags: [],
        },
        positioningAxis: "Raw vs Polished",
        authorityClaim: "Authenticity in decay.",
        exclusionPrinciples: ["Avoid perfection", "No artificiality"],
      },
      expressionEngine: {
        chromaticRegistry: {
          baseNeutral: "#262626",
          accentSignal: "#EF4444",
          primaryPalette: [
            { name: "Rust", hex: "#78350F", descriptor: "Preset" },
          ],
        },
        typographyIntent: {
          styleDescription: "Space Mono",
          weightPreference: "Regular",
        },
        narrativeVoice: {
          emotionalTemperature: "VISCERAL",
          structureBias: "FRAGMENTED",
          lexicalDensity: 7,
          restraintLevel: 3,
          voiceNotes: "",
          tone: "Visceral",
        },
      },
      visual_guidance: { strict_palette: ["#262626", "#EF4444", "#78350F"] },
      strategicVectors: {
        expansionTolerance: 5,
        fiscalVelocity: "measured",
        desireVectors: {
          deepen: ["Authenticity", "decay"],
          reduce: ["Perfection", "artificiality"],
          experiment: ["Distressed textures"],
          refuse: ["Polished aesthetics"],
        },
        saturationAwareness: {
          oversaturatedClusters: [],
          fragileDifferentiators: [],
        },
      },
    },
  },
  {
    name: "Cybernetic",
    icon: <Zap size={14} />,
    config: {
      positioningCore: {
        anchors: {
          culturalReferences: [
            "Neuromancer",
            "Ghost in the Shell",
            "Synthwave",
          ],
          ideologicalBias: ["Techno-Optimism"],
        },
        aestheticCore: {
          silhouettes: ["Sharp"],
          materiality: ["Latex"],
          eraBias: "Y2K Cyber",
          density: 8,
          entropy: 7,
          tags: [],
        },
        positioningAxis: "Digital vs Physical",
        authorityClaim: "Technological integration.",
        exclusionPrinciples: ["Avoid nature", "No analog"],
      },
      expressionEngine: {
        chromaticRegistry: {
          baseNeutral: "#050505",
          accentSignal: "#38BDF8",
          primaryPalette: [
            { name: "Neon", hex: "#34D399", descriptor: "Preset" },
          ],
        },
        typographyIntent: {
          styleDescription: "Space Grotesk",
          weightPreference: "Bold",
        },
        narrativeVoice: {
          emotionalTemperature: "DETACHED",
          structureBias: "STACCATO",
          lexicalDensity: 8,
          restraintLevel: 5,
          voiceNotes: "",
          tone: "Detached",
        },
      },
      visual_guidance: { strict_palette: ["#050505", "#38BDF8", "#34D399"] },
      strategicVectors: {
        expansionTolerance: 7,
        fiscalVelocity: "accelerated",
        desireVectors: {
          deepen: ["Technology", "integration"],
          reduce: ["Nature", "analog"],
          experiment: ["Digital aesthetics"],
          refuse: ["Organic"],
        },
        saturationAwareness: {
          oversaturatedClusters: [],
          fragileDifferentiators: [],
        },
      },
    },
  },
  {
    name: "Noir",
    icon: <History size={14} />,
    config: {
      positioningCore: {
        anchors: {
          culturalReferences: ["Film Noir", "Raymond Chandler", "Shadows"],
          ideologicalBias: ["Mystery"],
        },
        aestheticCore: {
          silhouettes: ["Cinematic"],
          materiality: ["Velvet"],
          eraBias: "Old Money Noir",
          density: 6,
          entropy: 4,
          tags: [],
        },
        positioningAxis: "Light vs Shadow",
        authorityClaim: "Atmospheric storytelling.",
        exclusionPrinciples: ["Avoid clarity", "No brightness"],
      },
      expressionEngine: {
        chromaticRegistry: {
          baseNeutral: "#000000",
          accentSignal: "#FFFFFF",
          primaryPalette: [
            { name: "Shadow", hex: "#1F2937", descriptor: "Preset" },
          ],
        },
        typographyIntent: {
          styleDescription: "Cormorant Garamond",
          weightPreference: "Bold",
        },
        narrativeVoice: {
          emotionalTemperature: "INTIMATE",
          structureBias: "FLOWING",
          lexicalDensity: 8,
          restraintLevel: 6,
          voiceNotes: "",
          tone: "Intimate",
        },
      },
      visual_guidance: { strict_palette: ["#000000", "#FFFFFF", "#1F2937"] },
      strategicVectors: {
        expansionTolerance: 4,
        fiscalVelocity: "conservative",
        desireVectors: {
          deepen: ["Atmosphere", "mystery"],
          reduce: ["Clarity", "brightness"],
          experiment: ["Dramatic lighting"],
          refuse: ["Optimism"],
        },
        saturationAwareness: {
          oversaturatedClusters: [],
          fragileDifferentiators: [],
        },
      },
    },
  },
];

const CATEGORIZED_VISUAL_PRESETS = {
  "Minimalist/Clean": ["Minimalist", "Zen"],
  "Raw/Industrial": ["Industrial", "Brutalist", "Urban Decay"],
  "Futuristic/Tech": ["Neo-Futurist", "Cybernetic", "Superintelligence"],
  "Editorial/Classic": ["Vintage", "Noir"],
};

const DEFAULT_FONTS = [
  { name: "Cormorant Garamond", type: "Serif", label: "Editorial" },
  { name: "Space Grotesk", type: "Sans", label: "Modern" },
  { name: "Space Mono", type: "Mono", label: "Technical" },
  { name: "Playfair Display", type: "Serif", label: "Classical" },
  { name: "Inter", type: "Sans", label: "Utility" },
  { name: "DM Sans", type: "Sans", label: "Humanist" },
];

const primaryAnchorsMap = [
  {
    key: "culturalReferences",
    label: "Reference Universe & Lineages",
    placeholder: "e.g. Serial Experiments Lain, Rick Owens...",
    description:
      "The artistic and theoretical lineage that informs this profile.",
  },
  {
    key: "ideologicalBias",
    label: "Ideological Bias",
    placeholder: "e.g. Semiotics, Brutalism, Liminality...",
    description: "The philosophical lens through which reality is interpreted.",
  },
  {
    key: "culturalSynthesis",
    label: "Cultural Synthesis",
    placeholder: "e.g. Y2K Futurism, Cyber-Renaissance...",
    description:
      "Optional. The intersection of distinct cultural movements this persona explores.",
  },
  {
    key: "trendClusters",
    label: "Trend Clusters",
    placeholder: "e.g. Quiet Luxury, Gorpcore, Post-irony...",
    description:
      "Optional. Specific aesthetic or behavioral trends the persona monitors and analyzes.",
  },
  {
    key: "exclusionPrinciples",
    label: "Avoid List & Brand Constraints",
    placeholder: "e.g. No reactive commentary, Avoid dilution...",
    description:
      'Optional. Define what this persona refuses to do (e.g."No clickbait","No academic jargon").',
  },
];

const DEFAULT_DRAFT_FALLBACK: TailorLogicDraft = {
  positioningCore: {
    anchors: {
      culturalReferences: [],
      ideologicalBias: [],
      culturalSynthesis: [],
      trendClusters: [],
    },
    aestheticCore: {
      silhouettes: [],
      materiality: [],
      eraBias: "Post-Digital",
      presentation: "Androgynous",
      density: 5,
      entropy: 5,
      tags: [],
    },
    positioningAxis: "Signal vs Noise",
    authorityClaim:
      "Aesthetic infrastructure for long-term cultural positioning.",
    exclusionPrinciples: [],
  },
  algoDials: {
    webScry: 50,
    memorySynthesis: 50,
    dissonance: 10,
    binaryToSpectrum: 50,
  },
  visual_guidance: {
    strict_palette: [],
  },
  expressionEngine: {
    chromaticRegistry: {
      primaryPalette: [],
      baseNeutral: "#F2F1ED",
      accentSignal: "#1C1917",
    },
    typographyIntent: {
      styleDescription: "Cormorant Garamond",
      weightPreference: "Light",
    },
    narrativeVoice: {
      emotionalTemperature: "CLINICAL",
      structureBias: "CONCISE",
      lexicalDensity: 5,
      restraintLevel: 8,
      voiceNotes: "",
      tone: "Neutral",
    },
    brandIdentity: {
      fonts: { serif: "Cormorant Garamond", sans: "Inter", mono: "Space Mono" },
      logo: "",
      palette: ["#000000", "#FFFFFF"],
    },
  },
  strategicVectors: {
    expansionTolerance: 5,
    fiscalVelocity: "measured",
    desireVectors: { deepen: [], reduce: [], experiment: [], refuse: [] },
    saturationAwareness: {
      oversaturatedClusters: [],
      fragileDifferentiators: [],
    },
  },
  diagnostics: {
    contradictionFlags: [],
    dilutionRisks: [],
    authorityStrengthScore: 50,
    driftVulnerability: 5,
  },
  strategicSummary: {
    identityVector: "A baseline identity vector focused on signal over noise.",
    authorityAnchor: "Aesthetic infrastructure.",
    exclusionRules: [],
    elasticityIndex: 5,
    tonalConstraints: "Restrained and precise.",
    aestheticDNA: "Post-Digital Minimalism.",
  },
  celestialCalibration: {
    enabled: false,
    zodiac: "gemini",
    astrologicalLineage: "",
    seasonalAlignment: "",
  },
  characterReferences: [],
  darkRoomTreatments: [],
  generationTemperature: 0.8,
  draftStatus: "provisional",
  lastTailored: Date.now(),
};

// --- SUB-COMPONENTS ---

const CustomInput: React.FC<{
  placeholder: string;
  onAdd: (val: string) => void;
}> = ({ placeholder, onAdd }) => {
  const [val, setVal] = useState("");
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && val.trim()) {
      onAdd(val.trim());
      setVal("");
    }
  };
  return (
    <div className="flex items-center gap-2 mt-3 opacity-60 hover:opacity-100 transition-opacity">
      <Plus size={12} className="text-nous-subtle" />
      <input
        id={`custom-${placeholder.replace(/\s+/g, "-").toLowerCase()}`}
        name={`custom-${placeholder.replace(/\s+/g, "-").toLowerCase()}`}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="bg-transparent border-b border-nous-border py-1 font-serif italic text-sm focus:outline-none focus:border-nous-border dark:focus:border-nous-border w-full placeholder:text-nous-subtle"
      />
    </div>
  );
};

const PresetStrip: React.FC<{
  options: string[];
  current: string | string[];
  onSelect: (val: string) => void;
  onAddCustom?: (val: string) => void;
  customPlaceholder?: string;
}> = ({ options, current, onSelect, onAddCustom, customPlaceholder }) => (
  <div className="space-y-3">
    <div className="flex flex-wrap gap-1.5 pt-2">
      {options.map((opt) => {
        const active = Array.isArray(current)
          ? current.some((c) => c.toUpperCase() === opt.toUpperCase())
          : (current || "").toLowerCase().includes(opt.toLowerCase());
        return (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={`px-3 py-1 rounded-none font-sans text-[7px] md:text-[8px] uppercase tracking-widest font-black border transition-all ${active ? "bg-nous-text text-nous-base border-current " : "border-nous-border text-nous-subtle hover:border-nous-border"}`}
          >
            {opt}
          </button>
        );
      })}
    </div>
    {onAddCustom && customPlaceholder && (
      <CustomInput placeholder={customPlaceholder} onAdd={onAddCustom} />
    )}
  </div>
);

const FieldGroup: React.FC<{
  label: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  isLocked?: boolean;
  onLock?: () => void;
}> = ({ label, description, children, isLocked, onLock }) => (
  <div className="space-y-4 pb-12 border-b border-black/5 /5 last:border-b-0 relative">
    <div className="tape-top"></div>
    <div className="space-y-1">
      <label className="font-sans text-[9px] uppercase tracking-[0.4em] font-black text-nous-subtle">
        {label}
      </label>
      {description && (
        <p className="font-serif italic text-base text-nous-subtle leading-tight">
          {description}
        </p>
      )}
    </div>
    {children}
  </div>
);

// --- BLUEPRINT DASHBOARD CARDS ---

const BlueprintCard: React.FC<{
  label: string;
  subLabel?: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}> = ({ label, subLabel, onClick, children, className = "" }) => (
  <motion.div
    whileHover={{ y: -4, boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1)" }}
    onClick={onClick}
    className={`bg-nous-base border border-nous-border p-6 relative cursor-pointer group transition-all duration-500 overflow-hidden ${className}`}
  >
    {/* Tech Markers */}
    <div className="absolute top-2 left-2 w-1.5 h-1.5 border-t border-l border-nous-border" />
    <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-nous-border" />
    <div className="absolute bottom-2 left-2 w-1.5 h-1.5 border-b border-l border-nous-border" />
    <div className="absolute bottom-2 right-2 w-1.5 h-1.5 border-b border-r border-nous-border" />

    <div className="flex justify-between items-start mb-6 border-b border-dashed border-nous-border pb-2">
      <div className="flex flex-col">
        <span className="font-sans text-[7px] uppercase tracking-[0.3em] font-black text-nous-subtle group-hover:text-nous-text dark:group-hover:text-nous-text transition-colors">
          {label}
        </span>
        {subLabel && (
          <span className="font-mono text-[7px] text-nous-subtle">
            {subLabel}
          </span>
        )}
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <Edit3 size={10} className="text-nous-subtle" />
      </div>
    </div>
    <div className="relative z-10">{children}</div>
  </motion.div>
);

// --- MAIN COMPONENT ---

export const TailorView: React.FC<{
  initialOverrides?: any;
  onOverridesConsumed?: () => void;
}> = ({ initialOverrides, onOverridesConsumed }) => {
  const [voicePreview, setVoicePreview] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  const handleGenerateVoicePreview = async () => {
    if (!draft) return;
    setIsGeneratingPreview(true);
    try {
      const { ai } = getClient();
      const voiceRegister =
        draft.expressionEngine?.narrativeVoice?.voiceRegister || "editorial";
      const emotionalTemp =
        draft.expressionEngine?.narrativeVoice?.emotionalTemperature ||
        "restrained";
      const sentenceStructure =
        draft.expressionEngine?.narrativeVoice?.structureBias || "concise";
      const primaryRef =
        draft.positioningCore?.anchors?.culturalReferences?.[0] ||
        "undefined reference";

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Write exactly one sentence in this voice: Register: ${voiceRegister}. Emotional temperature: ${emotionalTemp}. Sentence structure: ${sentenceStructure}. The sentence should evoke the aesthetic of: ${primaryRef}. Output the sentence only, no quotes, no preamble.`,
      });
      setVoicePreview(response.text?.trim() || null);
    } catch (e) {
      console.error("Voice preview error", e);
    } finally {
      setIsGeneratingPreview(false);
    }
  };
  const {
    profile,
    updateProfile,
    personas,
    activePersonaId,
    switchPersona,
    updatePersona,
    user,
    enabledAlgos,
    toggleAlgo,
    deletePersona,
    canGenerate,
    incrementGeneration,
  } = useUser();
  const activePersona = personas.find((p) => p.id === activePersonaId);
  const [draft, setDraft] = useState<TailorLogicDraft | null>(null);
  const [history, setHistory] = useState<TailorLogicDraft[]>([]);

  const pushToHistory = useCallback(() => {
    if (!draft) return;
    setHistory((prev) => {
      const lastState = prev[prev.length - 1];
      if (lastState && JSON.stringify(lastState) === JSON.stringify(draft)) {
        return prev;
      }
      const newHistory = [...prev, JSON.parse(JSON.stringify(draft))];
      if (newHistory.length > 30) return newHistory.slice(1);
      return newHistory;
    });
  }, [draft]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setDraft(lastState);
    window.dispatchEvent(
      new CustomEvent("mimi:registry_alert", {
        detail: { message: "Action Undone", icon: <History size={14} /> },
      }),
    );
  }, [history]);

  const [viewMode, setViewMode] = useState<"blueprint" | "edit">("blueprint");
  const [lockedFields, setLockedFields] = useState<Record<string, boolean>>({});
  const toggleLock = (field: string) => {
    setLockedFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };
  const [activeStep, setActiveStep] = useState<
    | "positioning"
    | "visual"
    | "chromatic"
    | "press-room"
    | "voice"
    | "vectors"
    | "shards"
    | "brand"
    | "drift"
    | "celestial"
    | "settings"
  >("positioning");
  const [showLogicReport, setShowLogicReport] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditReport, setAuditReport] = useState<TailorAuditReport | null>(
    null,
  );
  const [showAuditOverlay, setShowAuditOverlay] = useState(false);
  const [presetFilter, setPresetFilter] = useState({
    eraBias: "",
    tone: "",
    strictPalette: "",
  });

  // --- AUTO-SAVE LOGIC ---
  const saveDraftToLocalStorage = useCallback(
    (draftToSave: TailorLogicDraft) => {
      if (!activePersonaId) return;
      setIsSaving(true);
      localStorage.setItem(
        `mimi_tailor_draft_${activePersonaId}`,
        JSON.stringify(draftToSave),
      );
      setTimeout(() => setIsSaving(false), 1000);
    },
    [activePersonaId],
  );

  // Auto-save on change (debounced)
  useEffect(() => {
    if (!draft) return;
    const timer = setTimeout(() => {
      saveDraftToLocalStorage(draft);
    }, 2000); // Save after 2 seconds of inactivity
    return () => clearTimeout(timer);
  }, [draft, saveDraftToLocalStorage]);

  // Save on navigate away
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (draft) saveDraftToLocalStorage(draft);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [draft, saveDraftToLocalStorage]);

  // --- END AUTO-SAVE LOGIC ---

  // Font Engine State
  const [customFontInput, setCustomFontInput] = useState("");
  const [availableFonts, setAvailableFonts] = useState(DEFAULT_FONTS);
  const [isFontLoading, setIsFontLoading] = useState(false);

  // Color Engine State
  const [newColorHex, setNewColorHex] = useState("#000000");
  const [newColorName, setNewColorName] = useState("");

  // Persona Settings State
  const [personaName, setPersonaName] = useState("");
  const [personaKey, setPersonaKey] = useState("");
  const [aiSignature, setAiSignature] = useState("");
  const [isGeneratingSignature, setIsGeneratingSignature] = useState(false);
  const [isExtractingGrid, setIsExtractingGrid] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const gridInputRef = useRef<HTMLInputElement>(null);

  const [activeMuseTab, setActiveMuseTab] = useState<"current" | "permanent">(
    "current",
  );

  // --- Taste Seeds (Saveable Profiles) States & Methods ---
  const [savedSeeds, setSavedSeeds] = useState<
    { id: string; name: string; draft: TailorLogicDraft }[]
  >([]);
  const [newSeedName, setNewSeedName] = useState("");

  useEffect(() => {
    const key = `mimi:saved_taste_seeds:${user?.uid || "local"}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setSavedSeeds(JSON.parse(stored));
      } catch (e) {
        console.error("MIMI // Failed to load saved taste seeds", e);
      }
    }
  }, [user]);

  const saveCurrentAsSeed = (name: string) => {
    if (!draft || !name.trim()) return;
    const key = `mimi:saved_taste_seeds:${user?.uid || "local"}`;
    const newSeed = {
      id: Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      draft: { ...draft, seedName: name.trim() },
    };
    const updated = [...savedSeeds, newSeed];
    setSavedSeeds(updated);
    localStorage.setItem(key, JSON.stringify(updated));
    setNewSeedName("");
    window.dispatchEvent(
      new CustomEvent("mimi:registry_alert", {
        detail: {
          message: `Taste Seed "${name.trim()}" Registered.`,
          icon: <Check size={14} />,
        },
      }),
    );
  };

  const loadTasteSeed = async (seedDraft: TailorLogicDraft) => {
    if (!activePersona) return;
    pushToHistory();
    const nextDraft = { ...seedDraft, draftStatus: "aligned" };
    setDraft(nextDraft);
    await updatePersona({ ...activePersona, tailorDraft: nextDraft });
    saveDraftToLocalStorage(nextDraft);
    window.dispatchEvent(
      new CustomEvent("mimi:registry_alert", {
        detail: {
          message: `Loaded & Applied Taste Seed "${seedDraft.seedName || "Seed"}".`,
          icon: <Sparkles size={14} />,
        },
      }),
    );
    return;
  };

  const _loadTasteSeed_deprecated = (seedDraft: TailorLogicDraft) => {
    pushToHistory();
    setDraft(seedDraft);
    window.dispatchEvent(
      new CustomEvent("mimi:registry_alert", {
        detail: {
          message: `Loaded Taste Seed "${seedDraft.seedName || "Seed"}".`,
          icon: <Sparkles size={14} />,
        },
      }),
    );
  };

  const deleteTasteSeed = (id: string) => {
    const key = `mimi:saved_taste_seeds:${user?.uid || "local"}`;
    const updated = savedSeeds.filter((s) => s.id !== id);
    setSavedSeeds(updated);
    localStorage.setItem(key, JSON.stringify(updated));
  };

  const [newCharName, setNewCharName] = useState("");
  const [newCharDesc, setNewCharDesc] = useState("");
  const [charImageBase64, setCharImageBase64] = useState<string | null>(null);
  const [isDraggingCharImage, setIsDraggingCharImage] = useState(false);
  const charImageInputRef = useRef<HTMLInputElement>(null);

  const handleCharImageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCharImage(true);
  };
  const handleCharImageDragLeave = () => {
    setIsDraggingCharImage(false);
  };
  const handleCharImageDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCharImage(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const compressed = await compressImage(base64, 0.6, 256);
      setCharImageBase64(compressed);
    } catch (err) {
      console.error("MIMI // Image drop compression failed:", err);
    }
  };

  const [savedMuses, setSavedMuses] = useState<
    { id: string; name: string; description: string; imageUrl?: string }[]
  >([]);

  useEffect(() => {
    const key = `mimi:saved_muses:${user?.uid || "local"}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setSavedMuses(JSON.parse(stored));
      } catch (e) {
        console.error("MIMI // Failed to load saved muses", e);
      }
    }
  }, [user]);

  const saveMuseToRegister = (
    name: string,
    description: string,
    imageUrl?: string,
  ) => {
    const key = `mimi:saved_muses:${user?.uid || "local"}`;
    const existsIndex = savedMuses.findIndex(
      (m) => m.name.toLowerCase() === name.toLowerCase(),
    );
    let updated;
    if (existsIndex >= 0) {
      updated = [...savedMuses];
      updated[existsIndex] = {
        ...updated[existsIndex],
        description: description.trim(),
        imageUrl: imageUrl || updated[existsIndex].imageUrl,
      };
    } else {
      const newMuse = {
        id: Math.random().toString(36).substring(2, 9),
        name: name.trim(),
        description: description.trim(),
        imageUrl,
      };
      updated = [...savedMuses, newMuse];
    }
    setSavedMuses(updated);
    localStorage.setItem(key, JSON.stringify(updated));
    window.dispatchEvent(
      new CustomEvent("mimi:registry_alert", {
        detail: {
          message: `Muse "${name}" registered in Permanent Ledger.`,
          icon: <CheckCircle size={14} />,
        },
      }),
    );
  };

  const deleteMuseFromRegister = (id: string) => {
    const key = `mimi:saved_muses:${user?.uid || "local"}`;
    const updated = savedMuses.filter((m) => m.id !== id);
    setSavedMuses(updated);
    localStorage.setItem(key, JSON.stringify(updated));
    window.dispatchEvent(
      new CustomEvent("mimi:registry_alert", {
        detail: {
          message: `Muse purged from Ledger.`,
          icon: <Trash2 size={14} />,
        },
      }),
    );
  };

  const injectMuseIntoDraft = async (muse: {
    name: string;
    description: string;
    imageUrl?: string;
  }) => {
    if (!activePersona) return;
    pushToHistory();
    const currentRefs = draft?.characterReferences || [];
    const exists = currentRefs.some(
      (r) => r.name.toLowerCase() === muse.name.toLowerCase(),
    );
    if (exists) {
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: {
            message: `Muse "${muse.name}" already linked to the current profile.`,
            icon: <Check size={14} />,
          },
        }),
      );
      return;
    }
    const updated = [
      ...currentRefs,
      {
        name: muse.name,
        description: muse.description,
        imageUrl: muse.imageUrl,
      },
    ];
    const nextDraft = {
      ...draft,
      characterReferences: updated,
      draftStatus: "aligned",
    };
    setDraft(nextDraft);
    await updatePersona({ ...activePersona, tailorDraft: nextDraft });
    saveDraftToLocalStorage(nextDraft);
    window.dispatchEvent(
      new CustomEvent("mimi:registry_alert", {
        detail: {
          message: `Linked "${muse.name}" to the current profile.`,
          icon: <Check size={14} />,
        },
      }),
    );
  };

  const handleCharImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const compressed = await compressImage(base64, 0.6, 256);
      setCharImageBase64(compressed);
    } catch (err) {
      console.error("MIMI // Character image compression failed:", err);
    }
  };

  const addCharRef = async (name: string, desc: string) => {
    if (!name.trim() || !desc.trim()) return;
    pushToHistory();
    const currentRefs = draft?.characterReferences || [];
    const updated = [
      ...currentRefs,
      {
        name: name.trim(),
        description: desc.trim(),
        imageUrl: charImageBase64 || undefined,
      },
    ];
    const nextDraft = {
      ...draft,
      characterReferences: updated,
      draftStatus: "aligned",
    };
    setDraft(nextDraft);
    if (activePersona) {
      await updatePersona({ ...activePersona, tailorDraft: nextDraft });
    } else if (profile) {
      await updateProfile({ ...profile, tailorDraft: nextDraft });
    }
    saveDraftToLocalStorage(nextDraft);

    saveMuseToRegister(name.trim(), desc.trim(), charImageBase64 || undefined);

    setNewCharName("");
    setNewCharDesc("");
    setCharImageBase64(null);
    window.dispatchEvent(
      new CustomEvent("mimi:registry_alert", {
        detail: {
          message: `Character "${name}" Saved & Aligned.`,
          icon: <Check size={14} />,
        },
      }),
    );
  };

  const removeCharRef = async (index: number) => {
    if (!activePersona) return;
    pushToHistory();
    const currentRefs = draft?.characterReferences || [];
    const updated = currentRefs.filter((_, i) => i !== index);
    const nextDraft = {
      ...draft,
      characterReferences: updated,
      draftStatus: "aligned",
    };
    setDraft(nextDraft);
    await updatePersona({ ...activePersona, tailorDraft: nextDraft });
    saveDraftToLocalStorage(nextDraft);
  };

  const DARKROOM_PRESETS = [
    {
      name: "Silver Halide High-Contrast",
      logic:
        "Crushed slate blacks, high chemical grain structure, extreme highlights with halo blooming.",
    },
    {
      name: "CCTV Surveillance Warm-Glow",
      logic:
        "Low resolution frame scan-lines, CCTV timestamp watermark context, clinical high-contrast desaturation.",
    },
    {
      name: "Pixel Flush Digital Echo",
      logic:
        "Interlaced monitor scan-line grids, digital compression color-bleed halos, sensory trails, and phantom artifact ghosting.",
    },
    {
      name: "Cold Cyanotype Solarization",
      logic:
        "Deep Prussian blue tints, reversed shadow levels, metal solarized oxidation edge artifacts.",
    },
    {
      name: "Dusty 70s Polaroid Patina",
      logic:
        "Faded chromatic warmth, soft milk-white borders, heavy organic dust and emulsion scratches.",
    },
    {
      name: "Muted Aura Heatmap",
      logic:
        "Chromatic thermographic colors blending at borders, low-contrast surreal aesthetic.",
    },
    {
      name: "Tasteless Slop Protection Filter",
      logic:
        "Strips out glossy 3D plastic reflections, removes cartoon saturated skin tones, enforces flat archival museum photography aesthetics.",
    },
  ];

  const toggleDarkRoomTreatment = async (preset: {
    name: string;
    logic: string;
  }) => {
    if (!activePersona) return;
    pushToHistory();
    const currentTr = draft?.darkRoomTreatments || [];
    const exists = currentTr.some((t: any) => t.name === preset.name);
    let updated;
    if (exists) {
      updated = currentTr.filter((t: any) => t.name !== preset.name);
    } else {
      updated = [...currentTr, preset];
    }
    const nextDraft = {
      ...draft,
      darkRoomTreatments: updated,
      draftStatus: "aligned",
    };
    setDraft(nextDraft);
    await updatePersona({ ...activePersona, tailorDraft: nextDraft });
    saveDraftToLocalStorage(nextDraft);
  };

  // --- LOGIC ---

  const handleGridUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtractingGrid(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        const base64Image = base64Data.split(",")[1];

        const { extractTailorLogicFromGrid } =
          await import("../services/geminiService");
        const logic = await extractTailorLogicFromGrid(base64Image, file.type);

        if (logic) {
          pushToHistory();
          setDraft({ ...logic, draftStatus: "provisional" });
          window.dispatchEvent(
            new CustomEvent("mimi:registry_alert", {
              detail: {
                message: "Grid Aesthetic Extracted.",
                icon: <Sparkles size={14} />,
              },
            }),
          );
        } else {
          throw new Error("Failed to extract logic");
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("MIMI // Grid Extraction Error:", err);
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: { message: "Grid Extraction Failed.", type: "error" },
        }),
      );
    } finally {
      setIsExtractingGrid(false);
    }
  };

  const generateAiSignature = async () => {
    if (!activePersona || !draft) return;
    setIsGeneratingSignature(true);
    try {
      const { ai } = getClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Generate a short, unique, poetic AI signature (max 5 words) for a persona named"${activePersona.name}"with the following aesthetic core: ${draft.positioningCore.aestheticCore.eraBias}, ${(draft.positioningCore.aestheticCore.silhouettes || []).join(", ")}. It should sound like a cryptographic hash but made of words.`,
        config: { temperature: 0.9 },
      });
      const sig = response.text?.trim() || "SIG_UNKNOWN";
      setAiSignature(sig);
      pushToHistory();
      setDraft((prev) => (prev ? { ...prev, aiSignature: sig } : null));
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: {
            message: "Signature Generated.",
            icon: <Sparkles size={14} />,
          },
        }),
      );
    } catch (e) {
      console.error(e);
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: { message: "Signature Generation Failed.", type: "error" },
        }),
      );
    } finally {
      setIsGeneratingSignature(false);
    }
  };

  useEffect(() => {
    if (!activePersonaId || !activePersona) return;

    // Defensive Initialization: Ensure draft structure is complete
    const localDraft = localStorage.getItem(
      `mimi_tailor_draft_${activePersonaId}`,
    );
    let source;
    if (localDraft) {
      try {
        source = JSON.parse(localDraft);
      } catch (e) {
        source =
          activePersona?.tailorDraft ||
          profile?.tailorDraft ||
          DEFAULT_DRAFT_FALLBACK;
      }
    } else {
      source =
        activePersona?.tailorDraft ||
        profile?.tailorDraft ||
        DEFAULT_DRAFT_FALLBACK;
    }

    const safeSource = source || {};
    const mergedDraft = {
      ...DEFAULT_DRAFT_FALLBACK,
      ...safeSource,
      positioningCore: {
        ...DEFAULT_DRAFT_FALLBACK.positioningCore,
        ...(safeSource.positioningCore || {}),
        anchors: {
          ...DEFAULT_DRAFT_FALLBACK.positioningCore.anchors,
          ...(safeSource.positioningCore?.anchors || {}),
          culturalReferences:
            safeSource.positioningCore?.anchors?.culturalReferences || [],
          ideologicalBias:
            safeSource.positioningCore?.anchors?.ideologicalBias || [],
          culturalSynthesis:
            safeSource.positioningCore?.anchors?.culturalSynthesis || [],
          trendClusters:
            safeSource.positioningCore?.anchors?.trendClusters || [],
        },
        aestheticCore: {
          ...DEFAULT_DRAFT_FALLBACK.positioningCore.aestheticCore,
          ...(safeSource.positioningCore?.aestheticCore || {}),
          silhouettes:
            safeSource.positioningCore?.aestheticCore?.silhouettes || [],
          materiality:
            safeSource.positioningCore?.aestheticCore?.materiality || [],
          tags: safeSource.positioningCore?.aestheticCore?.tags || [],
        },
        exclusionPrinciples:
          safeSource.positioningCore?.exclusionPrinciples || [],
      },
      expressionEngine: {
        ...DEFAULT_DRAFT_FALLBACK.expressionEngine,
        ...(safeSource.expressionEngine || {}),
        brandIdentity: {
          ...DEFAULT_DRAFT_FALLBACK.expressionEngine.brandIdentity,
          ...(safeSource.expressionEngine?.brandIdentity ||
            safeSource.brandIdentity ||
            {}),
          palette: safeSource.expressionEngine?.brandIdentity?.palette ||
            safeSource.brandIdentity?.palette || ["#000000", "#FFFFFF"],
        },
        chromaticRegistry: {
          ...DEFAULT_DRAFT_FALLBACK.expressionEngine.chromaticRegistry,
          ...(safeSource.expressionEngine?.chromaticRegistry || {}),
          primaryPalette:
            safeSource.expressionEngine?.chromaticRegistry?.primaryPalette ||
            [],
        },
        typographyIntent: {
          ...DEFAULT_DRAFT_FALLBACK.expressionEngine.typographyIntent,
          ...(safeSource.expressionEngine?.typographyIntent || {}),
        },
        narrativeVoice: {
          ...DEFAULT_DRAFT_FALLBACK.expressionEngine.narrativeVoice,
          ...(safeSource.expressionEngine?.narrativeVoice || {}),
        },
      },
      strategicVectors: {
        ...DEFAULT_DRAFT_FALLBACK.strategicVectors,
        ...(safeSource.strategicVectors || {}),
        desireVectors: {
          ...DEFAULT_DRAFT_FALLBACK.strategicVectors.desireVectors,
          ...(safeSource.strategicVectors?.desireVectors || {}),
          deepen: safeSource.strategicVectors?.desireVectors?.deepen || [],
          reduce: safeSource.strategicVectors?.desireVectors?.reduce || [],
          experiment:
            safeSource.strategicVectors?.desireVectors?.experiment || [],
          refuse: safeSource.strategicVectors?.desireVectors?.refuse || [],
        },
        saturationAwareness: {
          ...DEFAULT_DRAFT_FALLBACK.strategicVectors.saturationAwareness,
          ...(safeSource.strategicVectors?.saturationAwareness || {}),
          oversaturatedClusters:
            safeSource.strategicVectors?.saturationAwareness
              ?.oversaturatedClusters || [],
          fragileDifferentiators:
            safeSource.strategicVectors?.saturationAwareness
              ?.fragileDifferentiators || [],
        },
      },
      diagnostics: {
        ...DEFAULT_DRAFT_FALLBACK.diagnostics,
        ...(safeSource.diagnostics || {}),
      },
      strategicSummary: {
        ...DEFAULT_DRAFT_FALLBACK.strategicSummary,
        ...(safeSource.strategicSummary || {}),
      },
      celestialCalibration: {
        ...DEFAULT_DRAFT_FALLBACK.celestialCalibration,
        ...(safeSource.celestialCalibration || {}),
      },
      characterReferences: safeSource.characterReferences || [],
      darkRoomTreatments: safeSource.darkRoomTreatments || [],
    };
    setDraft(mergedDraft);

    setPersonaName(activePersona?.name || "");
    setPersonaKey(activePersona?.apiKey || "");
    setAiSignature(mergedDraft.aiSignature || "");
  }, [activePersonaId, activePersona]);

  useEffect(() => {
    if (draft?.expressionEngine?.typographyIntent?.styleDescription) {
      const currentFont =
        draft.expressionEngine.typographyIntent.styleDescription;
      const exists = availableFonts.some((f) => f.name === currentFont);
      if (!exists) {
        setAvailableFonts((prev) => [
          ...prev,
          { name: currentFont, type: "Custom", label: "Imported" },
        ]);
        injectGoogleFont(currentFont);
      }
    }
  }, [draft?.expressionEngine?.typographyIntent?.styleDescription]);

  const injectGoogleFont = (fontName: string) => {
    const linkId = `font-${fontName.replace(/\s+/g, "-")}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, "+")}:wght@300;400;500;600;700&display=swap`;
      link.rel = "stylesheet";
      document.head.appendChild(link);
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: {
            message: `Fetching ${fontName}...`,
            icon: <Download size={14} />,
          },
        }),
      );
      return true;
    }
    return false;
  };

  const handleAddFont = () => {
    if (!customFontInput.trim()) return;
    setIsFontLoading(true);
    const fontName = customFontInput.trim();
    injectGoogleFont(fontName);
    setTimeout(() => {
      setAvailableFonts((prev) => [
        ...prev,
        { name: fontName, type: "Custom", label: "Imported" },
      ]);
      if (draft) {
        setDraft((prev) =>
          prev
            ? {
                ...prev,
                expressionEngine: {
                  ...prev.expressionEngine,
                  typographyIntent: {
                    ...prev.expressionEngine.typographyIntent,
                    styleDescription: fontName,
                  },
                },
              }
            : null,
        );
      }
      setCustomFontInput("");
      setIsFontLoading(false);
    }, 500);
  };

  useEffect(() => {
    if (initialOverrides) {
      if (initialOverrides.positioningCore) {
        // It's a full TailorLogicDraft
        setDraft({ ...initialOverrides, draftStatus: "provisional" });
        window.dispatchEvent(
          new CustomEvent("mimi:registry_alert", {
            detail: {
              message: "Tailor Logic Extracted.",
              icon: <Sparkles size={14} />,
            },
          }),
        );
        if (onOverridesConsumed) onOverridesConsumed();
      } else if (draft && draft.strategicVectors) {
        // It's a partial override (e.g., from drift forecast)
        setDraft((prev) =>
          prev
            ? {
                ...prev,
                strategicVectors: {
                  ...prev.strategicVectors,
                  desireVectors: {
                    ...prev.strategicVectors.desireVectors,
                    experiment:
                      initialOverrides.suggestedExperiments ||
                      prev.strategicVectors.desireVectors.experiment,
                    deepen: initialOverrides.identifiedDrifts
                      ? [initialOverrides.identifiedDrifts]
                      : prev.strategicVectors.desireVectors.deepen,
                  },
                },
              }
            : null,
        );
        if (onOverridesConsumed) onOverridesConsumed();
      }
    }
  }, [initialOverrides]);

  const updateDraft = (patch: any) => {
    if (draft) {
      pushToHistory();
      setDraft((prev) => ({ ...prev!, ...patch, draftStatus: "provisional" }));
    }
  };

  const updatePositioning = (field: string, val: any) => {
    if (draft) {
      pushToHistory();
      setDraft((prev) =>
        prev
          ? {
              ...prev,
              draftStatus: "provisional",
              positioningCore: { ...prev.positioningCore, [field]: val },
            }
          : null,
      );
    }
  };

  const updateExpression = (field: string, val: any) => {
    if (draft) {
      pushToHistory();
      setDraft((prev) =>
        prev
          ? {
              ...prev,
              draftStatus: "provisional",
              expressionEngine: { ...prev.expressionEngine, [field]: val },
            }
          : null,
      );
    }
  };

  const updateAesthetic = (field: string, val: any) => {
    if (draft) {
      pushToHistory();
      setDraft((prev) =>
        prev
          ? {
              ...prev,
              draftStatus: "provisional",
              expressionEngine: { ...prev.expressionEngine, [field]: val },
            }
          : null,
      );
    }
  };

  const updateStrategic = (field: string, val: any) => {
    if (draft) {
      pushToHistory();
      setDraft((prev) =>
        prev
          ? {
              ...prev,
              draftStatus: "provisional",
              strategicVectors: { ...prev.strategicVectors, [field]: val },
            }
          : null,
      );
    }
  };

  const updateAnchor = (field: string, val: string) => {
    if (!draft) return;
    if (field === "exclusionPrinciples") {
      const current = draft.positioningCore.exclusionPrinciples || [];
      if (!current.includes(val)) {
        updatePositioning("exclusionPrinciples", [...current, val]);
      }
      return;
    }
    const current = draft.positioningCore.anchors[field] || [];
    if (!current.includes(val)) {
      updatePositioning("anchors", {
        ...draft.positioningCore.anchors,
        [field]: [...current, val],
      });
    }
  };

  const removeAnchor = (field: string, val: string) => {
    if (!draft) return;
    if (field === "exclusionPrinciples") {
      const current = draft.positioningCore.exclusionPrinciples || [];
      updatePositioning(
        "exclusionPrinciples",
        current.filter((i: string) => i !== val),
      );
      return;
    }
    const current = draft.positioningCore.anchors[field] || [];
    updatePositioning("anchors", {
      ...draft.positioningCore.anchors,
      [field]: current.filter((i: string) => i !== val),
    });
  };

  const updateCelestial = (field: string, val: any) => {
    if (draft)
      updateDraft({
        celestialCalibration: { ...draft.celestialCalibration, [field]: val },
      });
  };

  const updateDesireVector = (field: string, val: string) => {
    if (!draft) return;
    const current = draft.strategicVectors.desireVectors[field] || [];
    if (!current.includes(val)) {
      updateStrategic("desireVectors", {
        ...draft.strategicVectors.desireVectors,
        [field]: [...current, val],
      });
    }
  };

  const removeDesireVector = (field: string, val: string) => {
    if (!draft) return;
    const current = draft.strategicVectors.desireVectors[field] || [];
    updateStrategic("desireVectors", {
      ...draft.strategicVectors.desireVectors,
      [field]: current.filter((i: string) => i !== val),
    });
  };

  const toggleOption = (field: string, val: string) => {
    if (!draft) return;
    const current = draft.positioningCore.aestheticCore[field] || [];
    if (current.includes(val)) {
      updatePositioning("aestheticCore", {
        ...draft.positioningCore.aestheticCore,
        [field]: current.filter((p: string) => p !== val),
      });
    } else {
      updatePositioning("aestheticCore", {
        ...draft.positioningCore.aestheticCore,
        [field]: [...current, val],
      });
    }
  };

  const addCustomOption = (field: string, val: string) => {
    if (!val.trim() || !draft) return;
    const current = draft.positioningCore.aestheticCore[field] || [];
    if (!current.includes(val)) {
      updatePositioning("aestheticCore", {
        ...draft.positioningCore.aestheticCore,
        [field]: [...current, val],
      });
    }
  };

  const toggleRegister = (val: string) => {
    if (!draft) return;
    const current =
      draft.expressionEngine.narrativeVoice.culturalRegister || [];
    if (current.includes(val)) {
      updateExpression("narrativeVoice", {
        ...draft.expressionEngine.narrativeVoice,
        culturalRegister: current.filter((c) => c !== val),
      });
    } else {
      updateExpression("narrativeVoice", {
        ...draft.expressionEngine.narrativeVoice,
        culturalRegister: [...current, val],
      });
    }
  };

  const addColorToPalette = () => {
    if (!newColorName.trim() || !draft) return;
    const newColor: ColorShard = {
      name: newColorName,
      hex: newColorHex,
      descriptor: "Custom",
    };
    const current =
      draft.expressionEngine.chromaticRegistry?.primaryPalette || [];
    updateExpression("chromaticRegistry", {
      ...draft.expressionEngine.chromaticRegistry,
      primaryPalette: [...current, newColor],
    });
    setNewColorName("");
  };

  const removeColor = (hex: string) => {
    if (!draft) return;
    const current =
      draft.expressionEngine.chromaticRegistry?.primaryPalette || [];
    updateExpression("chromaticRegistry", {
      ...draft.expressionEngine.chromaticRegistry,
      primaryPalette: current.filter((c) => c.hex !== hex),
    });
  };

  const applyChromaticPreset = (preset: (typeof CHROMATIC_PRESETS)[0]) => {
    if (!draft) return;
    updateExpression("chromaticRegistry", {
      ...draft.expressionEngine.chromaticRegistry,
      baseNeutral: preset.base,
      accentSignal: preset.accent,
      primaryPalette: preset.palette.map((p) => ({
        ...p,
        descriptor: "Preset",
      })),
    });
  };

  const applyVisualPreset = (preset: (typeof VISUAL_PRESETS)[0]) => {
    if (!draft) return;
    updateDraft({
      positioningCore: {
        ...draft.positioningCore,
        ...preset.config.positioningCore,
      },
      expressionEngine: {
        ...draft.expressionEngine,
        ...preset.config.expressionEngine,
      },
      strategicVectors: {
        ...draft.strategicVectors,
        ...preset.config.strategicVectors,
      },
      visual_guidance: {
        ...draft.visual_guidance,
        ...preset.config.visual_guidance,
      },
    });
    window.dispatchEvent(
      new CustomEvent("mimi:registry_alert", {
        detail: {
          message: `${preset.name} Preset Applied.`,
          icon: preset.icon,
        },
      }),
    );
  };

  const handleAlign = async () => {
    if (!profile || !activePersona || !draft) return;
    setIsSaving(true);
    try {
      const finalDraft = {
        ...draft,
        draftStatus: "aligned",
        lastTailored: Date.now(),
      };
      await updatePersona({ ...activePersona, tailorDraft: finalDraft });
      saveDraftToLocalStorage(finalDraft);
      setDraft(finalDraft);
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: {
            message: "Creative rules aligned to profile.",
            icon: <Ruler size={14} />,
          },
        }),
      );
      setViewMode("blueprint");
    } catch (e) {
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: { message: "Alignment Error.", type: "error" },
        }),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePersonaSettings = async () => {
    if (!activePersona || !personaName.trim() || !draft) return;
    setIsSaving(true);
    try {
      await updatePersona({
        ...activePersona,
        name: personaName,
        apiKey: personaKey,
        tailorDraft: draft,
      });
      saveDraftToLocalStorage(draft);
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: {
            message: "Profile settings updated.",
            icon: <CheckCircle size={14} />,
          },
        }),
      );
    } catch (e) {
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: { message: "Update Failed.", type: "error" },
        }),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleScryDirectives = async () => {
    if (!draft) return;

    const isFree = (profile?.usage?.tailorRuns || 0) === 0;
    if (!isFree && !canGenerate) {
      if (profile?.planStatus === "ghost") {
        window.dispatchEvent(new CustomEvent("mimi:open_gateway"));
      } else {
        window.dispatchEvent(new CustomEvent("mimi:open_patron_modal"));
      }
      return;
    }

    setIsAuditing(true);
    try {
      const res = await analyzeTailorDraft(draft);
      setAuditReport(res);
      setShowAuditOverlay(true);

      if (!isFree) {
        await incrementGeneration(1); // 1 credit for Tailor analysis
      }

      // Track tailor runs
      if (profile) {
        const updatedUsage = {
          ...(profile.usage || {
            totalGenerations: 0,
            tailorRuns: 0,
            reportRuns: 0,
            imageRuns: 0,
          }),
        };
        updatedUsage.tailorRuns = (updatedUsage.tailorRuns || 0) + 1;
        updateProfile({ ...profile, usage: updatedUsage });
      }
    } catch (e) {
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: { message: "Oracle obstructed.", type: "error" },
        }),
      );
    } finally {
      setIsAuditing(false);
    }
  };

  const handleShardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !draft) return;
    const newShards: string[] = [];
    setIsSaving(true);
    try {
      for (const file of Array.from(files)) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = async (ev) => {
            try {
              const raw = ev.target?.result as string;
              const compressed = await compressImage(raw, 0.6, 1024);
              resolve(compressed);
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        if (user?.uid) {
          try {
            const { archiveManager } =
              await import("../services/archiveManager");
            const url = await archiveManager.uploadMedia(
              user.uid,
              base64,
              "shards",
            );
            newShards.push(url);
          } catch (uploadErr) {
            console.warn(
              "MIMI // Storage Upload Failed, falling back to base64:",
              uploadErr,
            );
            newShards.push(base64);
          }
        } else {
          newShards.push(base64);
        }
      }
      updatePositioning("aestheticCore", {
        ...draft.positioningCore.aestheticCore,
        visualShards: [
          ...(draft.positioningCore.aestheticCore.visualShards || []),
          ...newShards,
        ],
      });
    } catch (e) {
      console.error("Upload failed", e);
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: { message: "Upload Failed.", type: "error" },
        }),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !draft) return;
    const file = files[0];
    setIsSaving(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = async (ev) => {
          try {
            const raw = ev.target?.result as string;
            const compressed = await compressImage(raw, 0.6, 512);
            resolve(compressed);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      let finalUrl = base64;
      if (user?.uid) {
        try {
          const { archiveManager } = await import("../services/archiveManager");
          finalUrl = await archiveManager.uploadMedia(
            user.uid,
            base64,
            "logos",
          );
        } catch (uploadErr) {
          console.warn(
            "MIMI // Logo Storage Upload Failed, falling back to base64:",
            uploadErr,
          );
        }
      }
      updateExpression("brandIdentity", {
        ...draft.expressionEngine.brandIdentity!,
        logo: finalUrl,
      });
    } catch (err) {
      console.error("MIMI // Logo Upload Error:", err);
      window.dispatchEvent(
        new CustomEvent("mimi:registry_alert", {
          detail: { message: "Logo Upload Failed.", type: "error" },
        }),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const openEditor = (step: any) => {
    const targetStep = step === "aesthetic" ? "visual" : step;
    setActiveStep(targetStep);
    setViewMode("edit");
  };

  const profileContract = useMemo(() => {
    if (!draft) return null;
    try {
      return createTailorProfileFromLegacyDraft(draft, {
        profileId: activePersona?.id
          ? `tailor_${activePersona.id}`
          : undefined,
        profileName: activePersona?.name || draft.seedName || "Personal",
      });
    } catch (error) {
      console.warn(
        "MIMI // Tailor profile contract compilation is awaiting valid evidence:",
        error,
      );
      return null;
    }
  },
    [activePersona?.id, activePersona?.name, draft],
  );

  if (!draft) {
    return (
      <div className="flex items-center justify-center h-full bg-nous-base dark:bg">
        <Loader2 className="animate-spin text-nous-subtle" />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full h-full overflow-y-auto no-scrollbar pb-24 px-4 md:px-16 pt-8 md:pt-12 bg-white text-black transition-all duration-1000 relative">
      {/* Auto-save Indicator */}
      <div className="absolute top-4 right-4 z-50">
        <AnimatePresence>
          {isSaving && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="px-3 py-1 bg-nous-text text-nous-base rounded-none font-sans text-[8px] uppercase tracking-widest font-black"
            >
              Draft Saved
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BACKGROUND DOT GRID TEXTURE */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="max-w-7xl mx-auto space-y-12 relative z-10">
        {/* HEADER */}
        <header className="space-y-10 border-b border-black/5 /5 pb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-nous-subtle">
                <Scissors size={14} className="text-nous-accent" />
                <span className="font-sans text-[8px] uppercase tracking-[0.4em] font-medium italic">
                  Tailor Profile Contract v2.0
                </span>
              </div>
              <h2 className="font-serif text-5xl md:text-7xl italic tracking-tighter text-nous-text text-nous-text leading-none">
                The Tailor.
              </h2>
              <p className="font-serif italic text-lg text-nous-subtle max-w-xl">
                Compile evidence into versioned creative direction that can be
                reviewed, corrected, and reused across every generation.
              </p>
            </div>

            {/* PROFILE SELECTOR & ACTIONS */}
            <div className="flex w-full flex-col items-stretch gap-2 md:w-auto md:items-end">
              <div
                className="flex items-center gap-4 bg-nous-base/50 backdrop-blur-xl px-6 py-3 rounded-none border border-nous-border group cursor-pointer hover:border-nous-border transition-all"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("mimi:change_view", { detail: "profile" }),
                  )
                }
              >
                <div className="w-8 h-8 rounded-none bg-nous-text text-nous-base flex items-center justify-center animate-pulse">
                  <User size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle font-black">
                    Active Profile
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-serif italic text-sm text-nous-text text-nous-text">
                      {activePersona?.name}
                    </span>
                    {draft?.aiSignature && (
                      <span className="font-mono text-[8px] text-nous-text bg-nous-base px-1.5 py-0.5 rounded-none">
                        {draft.aiSignature}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight
                  size={14}
                  className="text-nous-subtle group-hover:text-nous-text dark:group-hover:text-nous-text transition-colors ml-2"
                />
              </div>

              <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
                {viewMode === "edit" && (
                  <button
                    onClick={() => setViewMode("blueprint")}
                    className="text-nous-subtle hover:text-nous-text font-sans text-[8px] uppercase tracking-widest font-black flex items-center gap-2 px-2"
                  >
                    <LayoutGrid size={12} /> Return to Blueprint
                  </button>
                )}

                {history.length > 0 && (
                  <button
                    onClick={undo}
                    className="flex items-center gap-2 px-4 py-2 bg-nous-base text-nous-subtle rounded-none font-sans text-[8px] uppercase tracking-widest font-black hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                    title="Undo last action"
                  >
                    <History size={12} /> Undo
                  </button>
                )}

                <button
                  onClick={async () => {
                    if (!activePersona || !draft) return;
                    setIsSaving(true);
                    try {
                      await updatePersona({
                        ...activePersona,
                        tailorDraft: draft,
                      });
                      window.dispatchEvent(
                        new CustomEvent("mimi:registry_alert", {
                          detail: {
                            message: "Tailor Logic Saved.",
                            icon: <Save size={14} />,
                          },
                        }),
                      );
                    } catch (e) {
                      console.error(e);
                      window.dispatchEvent(
                        new CustomEvent("mimi:registry_alert", {
                          detail: { message: "Save Failed.", type: "error" },
                        }),
                      );
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-nous-base text-nous-subtle rounded-none font-sans text-[8px] uppercase tracking-widest font-black hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                >
                  {isSaving ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Save size={12} />
                  )}
                  {isSaving ? "Saving..." : "Save Profile"}
                </button>

                <button
                  onClick={() => {
                    if (!profileContract) return;
                    const blob = new Blob(
                      [JSON.stringify(profileContract, null, 2)],
                      {
                        type: "application/json",
                      },
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `tailor_profile_${activePersona?.name || "draft"}_${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-nous-base text-nous-subtle rounded-none font-sans text-[8px] uppercase tracking-widest font-black hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                >
                  <Download size={12} /> Export Profile JSON
                </button>
                <label className="flex items-center gap-2 px-4 py-2 bg-nous-base text-nous-subtle rounded-none font-sans text-[8px] uppercase tracking-widest font-black hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer">
                  <Upload size={12} /> Import Profile JSON
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        try {
                          const json = JSON.parse(
                            event.target?.result as string,
                          );
                          const imported = parseTailorImport(json, draft ?? undefined);
                          pushToHistory();
                          setDraft({
                            ...imported.draft,
                            draftStatus:
                              imported.sourceFormat === "tailor-profile-v2"
                                ? imported.draft.draftStatus
                                : "provisional",
                          });
                          window.dispatchEvent(
                            new CustomEvent("mimi:registry_alert", {
                              detail: {
                                message:
                                  imported.sourceFormat === "tailor-profile-v2"
                                    ? "Tailor Profile v2 imported successfully."
                                    : "Legacy Tailor JSON migrated and imported.",
                                type: "success",
                              },
                            }),
                          );
                        } catch (err) {
                          console.error("Tailor profile import failed", err);
                          window.dispatchEvent(
                            new CustomEvent("mimi:registry_alert", {
                              detail: {
                                message:
                                  "Import failed. Choose a Tailor Profile v2 or legacy Tailor JSON file.",
                                type: "error",
                              },
                            }),
                          );
                        }
                      };
                      reader.readAsText(file);
                      e.target.value = ""; // Reset input
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </header>

        {profileContract && (
          <section
            aria-label="Tailor Profile v2 compilation status"
            className="border border-nous-border bg-nous-base"
          >
            <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_2fr_0.8fr]">
              <div className="p-5 border-b lg:border-b-0 lg:border-r border-nous-border">
                <span className="font-mono text-[8px] uppercase tracking-[0.22em] text-nous-subtle">
                  Canonical profile
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-serif italic text-2xl text-nous-text">
                    v{profileContract.meta.schemaVersion}
                  </span>
                  <span className="px-2 py-1 border border-nous-border font-mono text-[7px] uppercase tracking-widest text-nous-subtle">
                    {profileContract.meta.status}
                  </span>
                </div>
                <p className="mt-3 font-sans text-[9px] leading-relaxed text-nous-subtle">
                  One source of truth for persistent taste, current-project
                  direction, and model-ready rules.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4">
                {[
                  {
                    step: "01",
                    label: "Evidence",
                    value:
                      profileContract.sourceMaterial.references.length +
                      profileContract.sourceMaterial.directStatements.length,
                    note: "supplied inputs",
                  },
                  {
                    step: "02",
                    label: "Interpretation",
                    value: profileContract.provenance.claims.length,
                    note: "traceable claims",
                  },
                  {
                    step: "03",
                    label: "Creative rules",
                    value:
                      profileContract.generationContract.preserve.length +
                      profileContract.generationContract.avoid.length,
                    note: "preserve + avoid",
                  },
                  {
                    step: "04",
                    label: "Generation",
                    value: profileContract.diagnostics.readyForGeneration
                      ? "Ready"
                      : "Review",
                    note: "contract status",
                  },
                ].map((item, index) => (
                  <div
                    key={item.step}
                    className={`p-4 sm:p-5 ${index < 3 ? "border-r border-nous-border" : ""} ${index < 2 ? "border-b sm:border-b-0 border-nous-border" : ""}`}
                  >
                    <span className="font-mono text-[7px] uppercase tracking-widest text-nous-subtle">
                      {item.step} / {item.label}
                    </span>
                    <strong className="mt-3 block font-serif italic text-2xl text-nous-text">
                      {item.value}
                    </strong>
                    <span className="mt-1 block font-sans text-[7px] uppercase tracking-wider text-nous-subtle">
                      {item.note}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-5 border-t lg:border-t-0 lg:border-l border-nous-border flex flex-col justify-between gap-4">
                <div>
                  <span className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">
                    Next best action
                  </span>
                  <p className="mt-2 font-serif italic text-sm leading-relaxed text-nous-text">
                    {profileContract.diagnostics.nextBestAction}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openEditor("drift")}
                  className="w-full border border-nous-text px-3 py-2 font-mono text-[8px] uppercase tracking-widest text-nous-text hover:bg-nous-text hover:text-nous-base transition-colors"
                >
                  Review diagnostics
                </button>
              </div>
            </div>
          </section>
        )}

        {/* --- MAIN CONTENT AREA --- */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* LEFT COL: BLUEPRINT OR EDITOR */}
          <div className="xl:col-span-8">
            <AnimatePresence mode="wait">
              {viewMode === "blueprint" ? (
                <motion.div
                  key="blueprint"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  {/* POSITIONING CARD */}
                  <div className="col-span-1 md:col-span-2 pt-2 pb-1 border-b border-nous-border">
                    <span className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">
                      Stage I — Identity
                    </span>
                    <p className="font-sans text-[10px] text-nous-subtle mt-0.5">
                      Cultural anchors and positioning logic
                    </p>
                  </div>

                  <BlueprintCard
                    label="Persona Positioning"
                    subLabel="REF: POS-01"
                    onClick={() => openEditor("positioning")}
                    className="md:col-span-2"
                  >
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <span className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle">
                          Primary Reference
                        </span>
                        <p className="font-serif italic text-2xl md:text-3xl text-nous-text text-nous-text leading-tight">
                          {draft.positioningCore.anchors
                            .culturalReferences[0] || "Undefined Anchor"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {draft.positioningCore.anchors.culturalReferences.map(
                          (ref, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 border border-nous-border rounded-none font-mono text-[8px] uppercase text-nous-subtle"
                            >
                              {ref}
                            </span>
                          ),
                        )}
                      </div>

                      {(draft.positioningCore.anchors.culturalSynthesis
                        ?.length > 0 ||
                        draft.positioningCore.anchors.trendClusters?.length >
                          0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-nous-border">
                          {draft.positioningCore.anchors.culturalSynthesis
                            ?.length > 0 && (
                            <div className="space-y-2">
                              <span className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle">
                                Cultural Synthesis
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {draft.positioningCore.anchors.culturalSynthesis.map(
                                  (item, i) => (
                                    <span
                                      key={i}
                                      className="font-sans text-[9px] text-nous-subtle"
                                    >
                                      {item}
                                      {i <
                                      draft.positioningCore.anchors
                                        .culturalSynthesis!.length -
                                        1
                                        ? ", "
                                        : ""}
                                    </span>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                          {draft.positioningCore.anchors.trendClusters?.length >
                            0 && (
                            <div className="space-y-2">
                              <span className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle">
                                Trend Clusters
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {draft.positioningCore.anchors.trendClusters.map(
                                  (item, i) => (
                                    <span
                                      key={i}
                                      className="font-sans text-[9px] text-nous-subtle"
                                    >
                                      {item}
                                      {i <
                                      draft.positioningCore.anchors
                                        .trendClusters!.length -
                                        1
                                        ? ", "
                                        : ""}
                                    </span>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </BlueprintCard>

                  {/* CHROMATIC CARD */}
                  <div className="col-span-1 md:col-span-2 pt-4 pb-1 border-b border-nous-border">
                    <span className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">
                      Stage II — Visual Physics
                    </span>
                    <p className="font-sans text-[10px] text-nous-subtle mt-0.5">
                      Color, materiality, silhouette, and typographic logic
                    </p>
                  </div>

                  <BlueprintCard
                    label="Chromatic Logic"
                    subLabel="REF: CR-05"
                    onClick={() => openEditor("chromatic")}
                  >
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <div
                          className="w-12 h-12 rounded-none border border-black/10"
                          style={{
                            backgroundColor:
                              draft.expressionEngine.chromaticRegistry
                                .baseNeutral,
                          }}
                        />
                        <div
                          className="w-12 h-12 rounded-none border border-black/10"
                          style={{
                            backgroundColor:
                              draft.expressionEngine.chromaticRegistry
                                .accentSignal,
                          }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {draft.expressionEngine.chromaticRegistry.primaryPalette
                          .slice(0, 4)
                          .map((c, i) => (
                            <div
                              key={i}
                              className="w-6 h-6 rounded-none border border-black/5"
                              style={{ backgroundColor: c.hex }}
                              title={c.name}
                            />
                          ))}
                      </div>
                      <p className="font-mono text-[9px] text-nous-subtle uppercase tracking-tight">
                        Base:{" "}
                        {draft.expressionEngine.chromaticRegistry.baseNeutral}{" "}
                        // Signal:{" "}
                        {draft.expressionEngine.chromaticRegistry.accentSignal}
                      </p>
                    </div>
                  </BlueprintCard>

                  {/* TYPOGRAPHY CARD */}
                  <BlueprintCard
                    label="Typographic DNA"
                    subLabel="REF: TY-88"
                    onClick={() => openEditor("aesthetic")}
                  >
                    <div className="space-y-2 py-2">
                      <span className="block font-sans text-[7px] uppercase tracking-widest text-nous-subtle">
                        Primary Typeface
                      </span>
                      <p
                        className="text-3xl"
                        style={{
                          fontFamily:
                            draft.expressionEngine.typographyIntent
                              .styleDescription || "serif",
                        }}
                      >
                        {draft.expressionEngine.typographyIntent
                          .styleDescription || "Default Serif"}
                      </p>
                      <p className="font-serif italic text-sm text-nous-subtle">
                        The quick brown fox jumps over the lazy dog.
                      </p>
                    </div>
                  </BlueprintCard>

                  {/* AESTHETIC CORE */}
                  <BlueprintCard
                    label="Visual Physics"
                    subLabel="REF: PHY-09"
                    onClick={() => openEditor("aesthetic")}
                    className="md:col-span-2"
                  >
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <span className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle">
                          Silhouette
                        </span>
                        <p className="font-serif italic text-xl">
                          {(
                            draft.positioningCore.aestheticCore.silhouettes ||
                            []
                          ).join(", ") || "Undefined"}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <span className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle">
                          Era Focus
                        </span>
                        <p className="font-serif italic text-xl">
                          {draft.positioningCore.aestheticCore.eraBias ||
                            "Undefined"}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <GlossaryTooltip
                          term="Density"
                          poeticMeaning="The visual weight and concentration of elements within the frame."
                          functionalMeaning="Controls the amount of detail, objects, and visual information packed into the generated output."
                        >
                          <span className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle">
                            Density
                          </span>
                        </GlossaryTooltip>
                        <p className="font-serif italic text-xl">
                          {draft.positioningCore.aestheticCore.density || 5}/10
                        </p>
                      </div>
                      <div className="space-y-2">
                        <GlossaryTooltip
                          term="Entropy"
                          poeticMeaning="The degree of chaos and unpredictability in the visual translation."
                          functionalMeaning="Determines how strictly the AI adheres to conventional logic versus introducing random, surreal elements."
                        >
                          <span className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle">
                            Entropy
                          </span>
                        </GlossaryTooltip>
                        <p className="font-serif italic text-xl">
                          {draft.positioningCore.aestheticCore.entropy || 5}/10
                        </p>
                      </div>
                    </div>
                  </BlueprintCard>

                  {/* BRAND KIT CARD */}
                  <BlueprintCard
                    label="Brand Identity"
                    subLabel="REF: BR-01"
                    onClick={() => openEditor("brand")}
                    className="md:col-span-2"
                  >
                    <div className="flex items-center gap-8">
                      <div className="w-24 h-24 bg-nous-base border border-nous-border rounded-none flex items-center justify-center overflow-hidden">
                        {draft.expressionEngine.brandIdentity?.logo ? (
                          <img
                            src={draft.expressionEngine.brandIdentity.logo}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="font-sans text-[8px] uppercase tracking-widest text-nous-subtle font-black">
                            No Logo
                          </span>
                        )}
                      </div>
                      <div className="space-y-4 flex-1">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <span className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle block mb-1">
                              Serif
                            </span>
                            <span className="font-serif italic text-lg">
                              {
                                draft.expressionEngine.brandIdentity?.fonts
                                  .serif
                              }
                            </span>
                          </div>
                          <div>
                            <span className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle block mb-1">
                              Sans
                            </span>
                            <span className="font-sans text-lg">
                              {draft.expressionEngine.brandIdentity?.fonts.sans}
                            </span>
                          </div>
                          <div>
                            <span className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle block mb-1">
                              Mono
                            </span>
                            <span className="font-mono text-sm">
                              {draft.expressionEngine.brandIdentity?.fonts.mono}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {draft.expressionEngine.brandIdentity?.palette.map(
                            (hex, i) => (
                              <div
                                key={i}
                                className="w-6 h-6 rounded-none border border-black/10"
                                style={{ backgroundColor: hex }}
                              />
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  </BlueprintCard>

                  {/* VOICE CARD */}
                  <div className="col-span-1 md:col-span-2 pt-4 pb-1 border-b border-nous-border">
                    <span className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">
                      Stage III — Expression Engine
                    </span>
                    <p className="font-sans text-[10px] text-nous-subtle mt-0.5">
                      Voice register, emotional temperature, and sentence logic
                    </p>
                  </div>

                  <BlueprintCard
                    label="Narrative Voice"
                    subLabel="REF: VC-22"
                    onClick={() => openEditor("voice")}
                  >
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-nous-base border border-nous-border rounded-none font-sans text-[7px] uppercase font-black">
                          {
                            draft.expressionEngine.narrativeVoice
                              .emotionalTemperature
                          }
                        </span>
                        <span className="px-3 py-1 bg-nous-base border border-nous-border rounded-none font-sans text-[7px] uppercase font-black">
                          {draft.expressionEngine.narrativeVoice.structureBias}
                        </span>
                      </div>
                      <div className="flex gap-4 font-serif italic text-nous-subtle text-xs">
                        <GlossaryTooltip
                          term="Lexical Density"
                          poeticMeaning="The thickness of the vocabulary, from sparse air to dense earth."
                          functionalMeaning="A score from 1-10 indicating the complexity and rarity of the vocabulary used in the generated text."
                        >
                          <span>
                            Lexical:{" "}
                            {draft.expressionEngine.narrativeVoice
                              .lexicalDensity || 5}
                            /10
                          </span>
                        </GlossaryTooltip>
                        <GlossaryTooltip
                          term="Restraint Level"
                          poeticMeaning="The tension of the unsaid holding back the flood."
                          functionalMeaning="A score from 1-10 indicating how much emotion or detail is withheld versus explicitly stated."
                        >
                          <span>
                            Restraint:{" "}
                            {draft.expressionEngine.narrativeVoice
                              .restraintLevel || 5}
                            /10
                          </span>
                        </GlossaryTooltip>
                      </div>
                      {draft.expressionEngine.narrativeVoice.voiceNotes && (
                        <p className="font-mono text-[8px] text-nous-subtle uppercase tracking-widest border-t border-nous-border pt-2 truncate">
                          Notes:{" "}
                          {draft.expressionEngine.narrativeVoice.voiceNotes}
                        </p>
                      )}
                    </div>
                  </BlueprintCard>

                  <BlueprintCard
                    label="Voice Preview"
                    subLabel="LIVE SAMPLE"
                    onClick={handleGenerateVoicePreview}
                    className="md:col-span-2"
                  >
                    <div className="min-h-[48px] flex items-center justify-between gap-4">
                      {isGeneratingPreview ? (
                        <span className="font-serif italic text-sm text-nous-subtle animate-pulse">
                          Generating...
                        </span>
                      ) : voicePreview ? (
                        <p className="font-serif italic text-base text-nous-text leading-relaxed">
                          {voicePreview}
                        </p>
                      ) : (
                        <span className="font-sans text-[10px] text-nous-subtle">
                          Click to generate a live sentence in your configured
                          voice.
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateVoicePreview();
                        }}
                        className="shrink-0 font-mono text-[8px] uppercase tracking-widest text-nous-subtle hover:text-nous-text border border-nous-border px-3 py-1.5 transition-colors"
                      >
                        {voicePreview ? "Regenerate" : "Generate"}
                      </button>
                    </div>
                  </BlueprintCard>

                  {/* SETTINGS CARD */}
                  <BlueprintCard
                    label="Profile & Privacy"
                    subLabel="SYS: ADMIN"
                    onClick={() => openEditor("settings")}
                  >
                    <div className="flex items-center gap-3 text-nous-subtle">
                      <Settings size={16} />
                      <span className="font-sans text-[9px] uppercase tracking-widest font-black">
                        Configure Identity
                      </span>
                    </div>
                  </BlueprintCard>

                  <BlueprintCard
                    label="Generation Parameters"
                    subLabel="ENGINE DIALS"
                    onClick={() => openEditor("settings")}
                    className="md:col-span-2"
                  >
                    <div className="space-y-1">
                      <p className="font-sans text-[9px] text-nous-subtle uppercase tracking-widest mb-3">
                        These values directly control how Mimi interprets your
                        profile during zine generation.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          {
                            label: "Web Scry",
                            value: draft.algoDials?.webScry ?? 50,
                          },
                          {
                            label: "Memory Synthesis",
                            value: draft.algoDials?.memorySynthesis ?? 50,
                          },
                          {
                            label: "Dissonance",
                            value: draft.algoDials?.dissonance ?? 10,
                          },
                          {
                            label: "Binary→Spectrum",
                            value: draft.algoDials?.binaryToSpectrum ?? 50,
                          },
                        ].map((dial) => (
                          <div key={dial.label} className="space-y-1">
                            <span className="font-mono text-[7px] uppercase tracking-widest text-nous-subtle block">
                              {dial.label}
                            </span>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-1 bg-nous-text rounded-none font-sans"
                                style={{
                                  width: `${dial.value}%`,
                                  maxWidth: "100%",
                                }}
                              />
                              <span className="font-mono text-[9px] text-nous-text">
                                {dial.value}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </BlueprintCard>

                  <BlueprintCard
                    label="Celestial Calibration"
                    subLabel="ORBITAL TIMING"
                    onClick={() => openEditor("celestial")}
                    className="md:col-span-2"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 min-w-0">
                        <div className="flex items-center gap-2">
                          <Moon size={14} className="text-nous-subtle shrink-0" />
                          <span className="font-mono text-[9px] uppercase tracking-widest text-nous-text">
                            {draft.celestialCalibration?.enabled
                              ? "Active"
                              : "Dormant"}
                          </span>
                          {draft.celestialCalibration?.zodiac && (
                            <span className="font-serif italic text-sm text-nous-subtle capitalize">
                              · {draft.celestialCalibration.zodiac}
                            </span>
                          )}
                        </div>
                        <p className="font-serif italic text-sm text-nous-subtle leading-relaxed">
                          {draft.celestialCalibration?.enabled
                            ? draft.celestialCalibration.seasonalAlignment ||
                              draft.celestialCalibration.astrologicalLineage ||
                              "Coordinates locked — zines will inherit orbital timing."
                            : "Enable to color each zine’s celestial reading with your zodiac, season, and birth coordinates."}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateCelestial(
                            "enabled",
                            !draft.celestialCalibration?.enabled,
                          );
                        }}
                        className={`shrink-0 px-3 py-1.5 font-mono text-[8px] uppercase tracking-widest border transition-colors ${
                          draft.celestialCalibration?.enabled
                            ? "bg-nous-text text-nous-base border-nous-text"
                            : "border-nous-border text-nous-subtle hover:text-nous-text"
                        }`}
                      >
                        {draft.celestialCalibration?.enabled ? "On" : "Off"}
                      </button>
                    </div>
                  </BlueprintCard>

                  {/* NEW: TASTE DNA SEEDS PERSISTENCE */}
                  <div className="md:col-span-2 border-t border-stone-100 pt-10 mt-6 space-y-6">
                    <div className="space-y-1">
                      <span className="font-mono text-[8px] uppercase tracking-[0.3em] text-stone-400 font-bold flex items-center gap-1.5">
                        <Stars
                          size={10}
                          className="text-emerald-500 animate-pulse"
                        />{" "}
                        I. Taste DNA Seeds Registry
                      </span>
                      <p className="font-serif italic text-sm text-stone-500">
                        Lock your current visual state coordinates (archetype,
                        palette, typographies) into a named Taste Seed that can
                        be retrieved or toggled instantly.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Create new Taste Seed form */}
                      <div className="bg-stone-50/50 p-6 border border-stone-200 space-y-4">
                        <span className="font-sans text-[7px] uppercase tracking-widest text-stone-400 block font-black">
                          Register Current Blueprint
                        </span>
                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            value={newSeedName}
                            onChange={(e) => setNewSeedName(e.target.value)}
                            placeholder="e.g. Noir 90s Minimalist, Cyber Punk Grunge"
                            className="w-full bg-white border border-stone-300 p-3 font-serif text-xs italic text-stone-800 focus:outline-none focus:border-stone-800 focus:ring-0 rounded-none placeholder:text-stone-400"
                          />
                          <button
                            onClick={() => saveCurrentAsSeed(newSeedName)}
                            disabled={!newSeedName.trim()}
                            className="w-full py-3 bg-stone-900 text-white font-sans text-[8px] uppercase tracking-[0.2em] font-black hover:bg-black transition-all disabled:opacity-30 rounded-none flex items-center justify-center gap-2"
                          >
                            <CheckCircle size={10} /> Register Taste Seed
                          </button>
                        </div>
                      </div>

                      {/* Seeds list & Auto-scry engine */}
                      <div className="border border-stone-200 p-6 space-y-6 bg-stone-50/20 max-h-[350px] overflow-y-auto no-scrollbar">
                        <div>
                          <span className="font-sans text-[7px] uppercase tracking-widest text-emerald-600 block font-black flex items-center gap-1">
                            <Sparkles size={8} className="animate-pulse" />{" "}
                            Auto-Scried Profile DNA
                          </span>
                          <p className="font-serif italic text-[11px] text-stone-400 pb-2">
                            Dynamically harvested from style profiles.
                          </p>

                          {!personas ||
                          personas.filter(
                            (p) => p.id !== activePersonaId && p.tailorDraft,
                          ).length === 0 ? (
                            <p className="font-serif italic text-[11px] text-stone-400 py-2 border-b border-stone-100">
                              No other profiles detected yet to scry coordinates
                              from.
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-[140px] overflow-y-auto no-scrollbar border-b border-stone-100 pb-4">
                              {personas
                                .filter(
                                  (p) =>
                                    p.id !== activePersonaId && p.tailorDraft,
                                )
                                .map((p) => {
                                  const pDraft = p.tailorDraft;
                                  return (
                                    <div
                                      key={p.id}
                                      className="flex justify-between items-center p-2.5 bg-white border border-stone-150 rounded-none"
                                    >
                                      <div className="flex-1 text-left">
                                        <span className="font-serif italic text-xs text-stone-800 block">
                                          {p.name} (Scried)
                                        </span>
                                        <span className="font-mono text-[8px] uppercase tracking-tight text-stone-400 block pt-0.5">
                                          {pDraft.positioningCore?.aestheticCore
                                            ?.eraBias || "Neo-Post-Digital"}
                                        </span>
                                      </div>
                                      <button
                                        onClick={() => loadTasteSeed(pDraft)}
                                        className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-sans text-[7px] uppercase tracking-widest font-black transition-all"
                                      >
                                        Sync State
                                      </button>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>

                        <div>
                          <span className="font-sans text-[7px] uppercase tracking-widest text-stone-400 block font-black">
                            Registered Seeds ({savedSeeds.length})
                          </span>
                          {savedSeeds.length === 0 ? (
                            <p className="font-serif italic text-xs text-stone-400 py-4 text-center">
                              No persistent seeds recorded. Save current preview
                              to create one.
                            </p>
                          ) : (
                            <div className="space-y-2 mt-2">
                              {savedSeeds.map((sd) => {
                                const isActive = draft?.seedName === sd.name;
                                return (
                                  <div
                                    key={sd.id}
                                    className={`flex justify-between items-center p-3 border transition-all ${isActive ? "bg-white border-stone-900 shadow-sm" : "border-stone-150 bg-stone-100/10 hover:border-stone-300"}`}
                                  >
                                    <button
                                      onClick={() => loadTasteSeed(sd.draft)}
                                      className="flex-1 text-left"
                                    >
                                      <span className="font-serif italic text-xs text-stone-800 block hover:text-black">
                                        {sd.name}{" "}
                                        {isActive && (
                                          <span className="font-mono text-[8px] uppercase tracking-widest text-emerald-600 ml-2 font-black">
                                            ● Active
                                          </span>
                                        )}
                                      </span>
                                      <span className="font-mono text-[8px] uppercase tracking-tight text-stone-400 block pt-0.5">
                                        {sd?.draft?.positioningCore
                                          ?.aestheticCore?.eraBias ||
                                          "Post-Digital"}{" "}
                                        //{" "}
                                        {sd?.draft?.expressionEngine
                                          ?.typographyIntent
                                          ?.styleDescription ||
                                          "Cormorant Garamond"}
                                      </span>
                                    </button>
                                    <button
                                      onClick={() => deleteTasteSeed(sd.id)}
                                      className="p-1 text-stone-400 hover:text-red-500 transition-colors"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Hidden seeds list to absorb the old block */}
                      <div className="hidden">
                        <div className="border border-nous-border p-6 space-y-4 bg-stone-50/20 max-h-[220px] overflow-y-auto no-scrollbar">
                          <span className="font-sans text-[7px] uppercase tracking-widest text-stone-400 block font-black">
                            Registered Seeds ({savedSeeds.length})
                          </span>
                          {savedSeeds.length === 0 ? (
                            <p className="font-serif italic text-xs text-stone-400 py-4 text-center">
                              No persistent seeds recorded. Save current to
                              create one.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {savedSeeds.map((sd) => {
                                const isActive = draft?.seedName === sd.name;
                                return (
                                  <div
                                    key={sd.id}
                                    className={`flex justify-between items-center p-3 border transition-all ${isActive ? "bg-white border-stone-900 shadow-sm" : "border-stone-150 bg-stone-100/10 hover:border-stone-300"}`}
                                  >
                                    <button
                                      onClick={() => loadTasteSeed(sd.draft)}
                                      className="flex-1 text-left"
                                    >
                                      <span className="font-serif italic text-xs text-stone-800 block hover:text-black">
                                        {sd.name}{" "}
                                        {isActive && (
                                          <span className="font-mono text-[8px] uppercase tracking-widest text-emerald-600 ml-2 font-black">
                                            ● Active
                                          </span>
                                        )}
                                      </span>
                                      <span className="font-mono text-[8px] uppercase tracking-tight text-stone-405 block pt-0.5">
                                        {sd?.draft?.positioningCore
                                          ?.aestheticCore?.eraBias ||
                                          "Post-Digital"}{" "}
                                        //{" "}
                                        {sd?.draft?.expressionEngine
                                          ?.typographyIntent
                                          ?.styleDescription ||
                                          "Cormorant Garamond"}
                                      </span>
                                    </button>
                                    <button
                                      onClick={() => deleteTasteSeed(sd.id)}
                                      className="p-1 text-stone-400 hover:text-red-500 transition-colors"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* NEW: CHARACTER REFERENCE LEDGER */}
                  <div className="md:col-span-2 border-t border-stone-100 pt-10 mt-6 space-y-6">
                    <div className="space-y-1">
                      <span className="font-mono text-[8px] uppercase tracking-[0.3em] text-stone-400 font-bold flex items-center gap-1.5">
                        <User
                          size={10}
                          className="text-emerald-500 animate-pulse"
                        />{" "}
                        II. Character Reference Ledger
                      </span>
                      <p className="font-serif italic text-sm text-stone-500">
                        Maintain a permanent roster of iconic muse styles, raw
                        faces, or custom models. Mimi references these specific
                        persona coordinates directly during image page
                        development.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                      {/* Add new reference */}
                      <div className="md:col-span-5 bg-stone-50/50 p-6 border border-stone-200 space-y-4 h-fit">
                        <span className="font-sans text-[7px] uppercase tracking-widest text-stone-400 block font-black">
                          Add Muse Coordinates
                        </span>
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={newCharName}
                            onChange={(e) => setNewCharName(e.target.value)}
                            placeholder="Muse Name (e.g. Young Winona)"
                            className="w-full bg-white border border-stone-300 p-3 font-serif text-xs italic text-stone-800 focus:outline-none focus:border-stone-800 rounded-none placeholder:text-stone-400"
                          />
                          <textarea
                            value={newCharDesc}
                            onChange={(e) => setNewCharDesc(e.target.value)}
                            placeholder="Visual aspects, clothing specs, specific editorial reference notes..."
                            className="w-full bg-white border border-stone-300 p-3 font-serif text-xs italic text-stone-800 focus:outline-none focus:border-stone-800 rounded-none h-20 resize-none placeholder:text-stone-400"
                          />

                          {/* IMAGE UPLOAD PANEL */}
                          <div
                            className={`border border-dashed p-3 flex flex-col items-center justify-center gap-2 transition-colors duration-150 ${isDraggingCharImage ? "border-neutral-850 bg-neutral-100 dark:bg-neutral-850/15" : "border-stone-300 bg-white"}`}
                            onDragOver={handleCharImageDragOver}
                            onDragLeave={handleCharImageDragLeave}
                            onDrop={handleCharImageDrop}
                          >
                            <input
                              type="file"
                              ref={charImageInputRef}
                              onChange={handleCharImageUpload}
                              className="hidden"
                              accept="image/*"
                            />
                            {charImageBase64 ? (
                              <div className="relative w-full flex items-center gap-3">
                                <img
                                  src={charImageBase64}
                                  alt="Avatar preview"
                                  className="w-12 h-16 object-cover border border-stone-250"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="flex flex-col gap-1 items-start">
                                  <span className="font-mono text-[8px] uppercase tracking-widest text-emerald-600 font-bold">
                                    Portrait Loaded
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setCharImageBase64(null)}
                                    className="font-sans text-[7px] uppercase tracking-widest text-red-500 font-bold hover:underline"
                                  >
                                    Clear Photo
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="w-full py-3 border border-stone-200 hover:bg-stone-50 transition-all flex flex-col items-center justify-center text-nous-subtle gap-1 rounded-none cursor-pointer"
                                onClick={() =>
                                  charImageInputRef.current?.click()
                                }
                              >
                                <ImageIcon size={14} className="opacity-60" />
                                <span className="font-sans text-[7px] uppercase tracking-widest font-black">
                                  Upload Portrait Reference
                                </span>
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => addCharRef(newCharName, newCharDesc)}
                            disabled={
                              !newCharName.trim() || !newCharDesc.trim()
                            }
                            className="w-full py-3 bg-stone-900 text-white font-sans text-[8px] uppercase tracking-[0.2em] font-black hover:bg-black transition-all disabled:opacity-30 rounded-none flex items-center justify-center gap-2"
                          >
                            <Plus size={10} /> Add Anchor Muse
                          </button>
                        </div>
                      </div>

                      {/* Current references roster / Permanent Ledger Tabs */}
                      <div className="md:col-span-7 border border-stone-200 p-6 space-y-4 bg-stone-50/20 max-h-[380px] flex flex-col justify-start">
                        <div className="flex border-b border-stone-200 pb-2 mb-2 justify-between items-center shrink-0">
                          <div className="flex gap-4">
                            <button
                              onClick={() => setActiveMuseTab("current")}
                              className={`font-sans text-[8px] uppercase tracking-widest font-black transition-all pb-1 border-b-2 ${
                                activeMuseTab === "current"
                                  ? "border-stone-800 text-stone-900 font-bold"
                                  : "border-transparent text-stone-400 hover:text-stone-600"
                              }`}
                            >
                              Active Profile Cohort (
                              {draft?.characterReferences?.length || 0})
                            </button>
                            <button
                              onClick={() => setActiveMuseTab("permanent")}
                              className={`font-sans text-[8px] uppercase tracking-widest font-black transition-all pb-1 border-b-2 ${
                                activeMuseTab === "permanent"
                                  ? "border-stone-800 text-stone-900 font-bold"
                                  : "border-transparent text-stone-400 hover:text-stone-600"
                              }`}
                            >
                              Permanent Muse Ledger ({savedMuses.length})
                            </button>
                          </div>
                          {activeMuseTab === "permanent" &&
                            savedMuses.length > 0 && (
                              <span className="font-mono text-[7px] uppercase text-stone-400 font-medium">
                                RETAINED CODES
                              </span>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
                          {activeMuseTab === "current" ? (
                            !draft?.characterReferences?.length ? (
                              <div className="py-12 text-center space-y-2 opacity-50">
                                <Quote
                                  size={20}
                                  className="mx-auto text-stone-300"
                                />
                                <p className="font-serif italic text-xs text-stone-400">
                                  Profile cohort empty. Mimi is generating style
                                  aspects from active configs.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {draft.characterReferences.map(
                                  (ref: any, idx: number) => {
                                    const isLocallySaved = savedMuses.some(
                                      (m) =>
                                        m.name.toLowerCase() ===
                                        ref.name.toLowerCase(),
                                    );
                                    return (
                                      <div
                                        key={idx}
                                        className="p-4 bg-white border border-stone-150 relative group flex items-start gap-4 justify-between"
                                      >
                                        <div className="flex items-start gap-3 min-w-0 flex-1">
                                          {ref.imageUrl && (
                                            <img
                                              src={ref.imageUrl}
                                              className="w-12 h-16 object-cover border border-nous-border shrink-0"
                                              alt={ref.name}
                                              referrerPolicy="no-referrer"
                                            />
                                          )}
                                          <div className="min-w-0">
                                            <h5 className="font-serif text-sm font-bold text-stone-800 flex items-center gap-2">
                                              {ref.name}
                                              {isLocallySaved && (
                                                <span className="font-mono text-[6px] tracking-widest uppercase bg-stone-100 px-1 py-0.5 text-stone-500">
                                                  Ledger Icon
                                                </span>
                                              )}
                                            </h5>
                                            <p className="font-serif italic text-xs text-stone-500 pt-1 leading-relaxed">
                                              {ref.description}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2 text-right shrink-0">
                                          <button
                                            onClick={() => removeCharRef(idx)}
                                            className="p-1 text-stone-400 hover:text-red-500 transition-colors"
                                            title="Remove from active profile"
                                          >
                                            <X size={12} />
                                          </button>
                                          {!isLocallySaved && (
                                            <button
                                              onClick={() =>
                                                saveMuseToRegister(
                                                  ref.name,
                                                  ref.description,
                                                  ref.imageUrl,
                                                )
                                              }
                                              className="font-sans text-[7px] uppercase tracking-widest text-[#10b981] hover:underline font-black mt-2"
                                            >
                                              Save to Ledger
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  },
                                )}
                              </div>
                            )
                          ) : savedMuses.length === 0 ? (
                            <div className="py-12 text-center space-y-2 opacity-50">
                              <Quote
                                size={20}
                                className="mx-auto text-stone-300"
                              />
                              <p className="font-serif italic text-xs text-stone-400">
                                Permanent Ledger is empty. Muses added to any
                                persona will be saved here.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {savedMuses.map((muse) => {
                                const isActiveInMask =
                                  draft?.characterReferences?.some(
                                    (r) =>
                                      r.name.toLowerCase() ===
                                      muse.name.toLowerCase(),
                                  );
                                return (
                                  <div
                                    key={muse.id}
                                    className="p-4 bg-white border border-stone-150 relative group flex items-start gap-4 justify-between"
                                  >
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                      {muse.imageUrl && (
                                        <img
                                          src={muse.imageUrl}
                                          className="w-12 h-16 object-cover border border-nous-border shrink-0"
                                          alt={muse.name}
                                          referrerPolicy="no-referrer"
                                        />
                                      )}
                                      <div className="min-w-0">
                                        <h5 className="font-serif text-sm font-bold text-stone-800 flex items-center gap-2">
                                          {muse.name}
                                          {isActiveInMask && (
                                            <span className="font-mono text-[6px] tracking-widest uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 py-0.5 font-bold">
                                              In Profile
                                            </span>
                                          )}
                                        </h5>
                                        <p className="font-serif italic text-xs text-stone-500 pt-1 leading-relaxed">
                                          {muse.description}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end justify-between self-stretch shrink-0 gap-3">
                                      <button
                                        onClick={() =>
                                          deleteMuseFromRegister(muse.id)
                                        }
                                        className="p-1 text-stone-400 hover:text-red-500 transition-colors"
                                        title="Purge from Permanent Ledger"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                      {!isActiveInMask && (
                                        <button
                                          onClick={() =>
                                            injectMuseIntoDraft(muse)
                                          }
                                          className="font-sans text-[7px] uppercase tracking-widest text-emerald-600 hover:underline font-black"
                                        >
                                          Link to Profile
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* NEW: DARK ROOM CHEMICAL TREATMENTS */}
                  <div className="md:col-span-2 border-t border-stone-100 pt-10 mt-6 space-y-6">
                    <div className="space-y-1">
                      <span className="font-mono text-[8px] uppercase tracking-[0.3em] text-stone-400 font-bold flex items-center gap-1.5">
                        <Film
                          size={10}
                          className="text-emerald-500 animate-pulse"
                        />{" "}
                        III. Dark Room Treatment Console
                      </span>
                      <p className="font-serif italic text-sm text-stone-500">
                        Apply physical, film-based chemical development
                        emulsions directly to your pipeline. This filters out
                        standard commercial AI shine, forcing authentic tactile
                        artifacts and editorial grit.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {DARKROOM_PRESETS.map((p, i) => {
                        const isSelected = draft?.darkRoomTreatments?.some(
                          (t: any) => t.name === p.name,
                        );
                        return (
                          <button
                            key={i}
                            onClick={() => toggleDarkRoomTreatment(p)}
                            className={`text-left p-5 border transition-all flex flex-col justify-between h-[180px] ${
                              isSelected
                                ? "bg-stone-900 border-stone-900 text-white shadow-md shadow-stone-200/50"
                                : "border-stone-200 bg-white hover:border-stone-400 text-stone-800"
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="font-mono text-[8px] uppercase tracking-widest text-stone-400 block font-bold">
                                  EMULSION {i + 1}
                                </span>
                                {isSelected && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                )}
                              </div>
                              <h4
                                className={`font-serif text-sm font-bold ${isSelected ? "text-white" : "text-stone-950"}`}
                              >
                                {p.name}
                              </h4>
                              <p
                                className={`font-serif italic text-[11px] leading-relaxed ${isSelected ? "text-stone-300" : "text-stone-500"}`}
                              >
                                {p.logic}
                              </p>
                            </div>

                            <div className="flex justify-between items-center w-full pt-4 border-t border-stone-550/10">
                              <span className="font-mono text-[7px] uppercase tracking-widest text-stone-400 font-black">
                                Applied:
                              </span>
                              <span
                                className={`font-mono text-[8px] uppercase font-black px-1.5 py-0.5 ${isSelected ? "bg-emerald-500 text-stone-950" : "bg-stone-100 text-stone-500"}`}
                              >
                                {isSelected ? "ACTIVE" : "DORMANT"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="editor"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-nous-base border border-nous-border rounded-none flex flex-col xl:flex-row overflow-hidden min-h-[70vh]"
                >
                  {/* SIDEBAR NAV */}
                  <nav className="w-full xl:w-56 bg-nous-base border-b xl:border-b-0 xl:border-r border-nous-border p-3 md:p-4 xl:p-6 flex flex-row xl:flex-col gap-2 overflow-x-auto no-scrollbar xl:overflow-visible shrink-0 scroll-fade-x">
                    {[
                      { key: "positioning", label: "Identity & Reference" },
                      { key: "visual", label: "Visual Language" },
                      { key: "chromatic", label: "Color Palette" },
                      { key: "press-room", label: "Aesthetic Press Room" },
                      { key: "voice", label: "Narrative Voice" },
                      { key: "vectors", label: "Strategic Direction" },
                      { key: "brand", label: "Constraints & rules" },
                      { key: "shards", label: "Reference Universe" },
                      { key: "drift", label: "Diagnostics" },
                      { key: "celestial", label: "Celestial Calibration" },
                      { key: "settings", label: "Profile & Privacy" },
                    ].map((step) => (
                      <button
                        key={step.key}
                        onClick={() => setActiveStep(step.key as any)}
                        className={`shrink-0 xl:shrink text-left px-4 py-3 min-h-11 rounded-none font-sans text-[9px] uppercase tracking-widest font-black transition-all flex items-center justify-between gap-2 whitespace-nowrap border ${activeStep === step.key ? "bg-nous-base text-nous-text border-black/10 dark:border-white/15" : "text-nous-subtle border-transparent hover:text-nous-text hover:border-nous-border/60"}`}
                      >
                        {step.label}{" "}
                        {activeStep === step.key && <ChevronRight size={12} className="shrink-0" />}
                      </button>
                    ))}
                  </nav>

                  {/* FORM CONTENT */}
                  <div className="flex-1 min-w-0 p-5 sm:p-8 xl:p-10 overflow-y-auto no-scrollbar bg-nous-base">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeStep}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-10 max-w-3xl mx-auto"
                      >
                        {/* HEADER */}
                        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-6 border-b border-nous-border">
                          <h3 className="font-serif text-3xl sm:text-4xl italic tracking-tighter text-nous-text capitalize">
                            {(() => {
                              const labels: Record<string, string> = {
                                positioning: "Identity",
                                visual: "Visual",
                                chromatic: "Color",
                                voice: "Voice",
                                vectors: "Direction",
                                brand: "Brand",
                                shards: "Reference",
                                drift: "Diagnostics",
                                celestial: "Celestial",
                                settings: "Profile",
                              };
                              return labels[activeStep] || activeStep;
                            })()}
                          </h3>
                          <p className="font-sans text-[8px] uppercase tracking-[0.18em] text-nous-subtle font-black max-w-xs leading-relaxed sm:text-right">
                            Define the parameters of your world.
                          </p>
                        </div>

                        {/* DYNAMIC FORM FIELDS */}
                        {activeStep === "positioning" && (
                          <>
                            <p className="font-serif italic text-nous-subtle mb-8">
                              Who are you referencing? What do you refuse?
                            </p>

                            <FieldGroup
                              label="Brand Templates"
                              description="Apply a foundational aesthetic archetype."
                            >
                              {Object.entries(CATEGORIZED_VISUAL_PRESETS).map(
                                ([category, presetNames]) => (
                                  <div key={category} className="mb-6">
                                    <h4 className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle mb-3">
                                      {category}
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                      {presetNames.map((name) => {
                                        const p = VISUAL_PRESETS.find(
                                          (pr) => pr.name === name,
                                        );
                                        if (!p) return null;
                                        const isActive =
                                          (
                                            draft.positioningCore.aestheticCore
                                              .silhouettes || []
                                          ).join(",") ===
                                            (
                                              p.config.positioningCore
                                                .aestheticCore.silhouettes || []
                                            ).join(",") &&
                                          draft.positioningCore.aestheticCore
                                            .eraBias ===
                                            p.config.positioningCore
                                              .aestheticCore.eraBias;
                                        return (
                                          <button
                                            key={p.name}
                                            onClick={() => applyVisualPreset(p)}
                                            className={`p-4 border rounded-none transition-all group flex flex-col items-center gap-3 bg-nous-base ${isActive ? "border-nous-border ring-1 ring-stone-900/20 dark:ring-stone-100/20" : "border-nous-border hover:border-nous-border "}`}
                                          >
                                            <div
                                              className={`${isActive ? "text-nous-text " : "text-nous-subtle group-hover:text-nous-text dark:group-hover:text-nous-text"} transition-colors`}
                                            >
                                              {p.icon}
                                            </div>
                                            <span
                                              className={`font-sans text-[8px] uppercase tracking-widest font-black ${isActive ? "text-nous-text " : "text-nous-subtle group-hover:text-nous-text dark:group-hover:text-nous-text"}`}
                                            >
                                              {p.name}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ),
                              )}
                            </FieldGroup>

                            {primaryAnchorsMap.map((field) => {
                              const items =
                                field.key === "exclusionPrinciples"
                                  ? draft.positioningCore.exclusionPrinciples ||
                                    []
                                  : draft.positioningCore.anchors[
                                      field.key as keyof typeof draft.positioningCore.anchors
                                    ] || [];

                              return (
                                <FieldGroup
                                  key={field.key}
                                  label={field.label}
                                  description={field.description}
                                >
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    {items.map((item: string, i: number) => (
                                      <span
                                        key={i}
                                        className="px-3 py-1 bg-nous-base border border-nous-border rounded-none font-sans text-[9px] uppercase tracking-widest font-black flex items-center gap-2"
                                      >
                                        {item}
                                        <button
                                          onClick={() =>
                                            removeAnchor(field.key, item)
                                          }
                                          className="hover:text-red-500"
                                        >
                                          <X size={10} />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                  <CustomInput
                                    placeholder={field.placeholder}
                                    onAdd={(val) =>
                                      updateAnchor(field.key, val)
                                    }
                                  />
                                </FieldGroup>
                              );
                            })}
                          </>
                        )}

                        {activeStep === "visual" && (
                          <>
                            <p className="font-serif italic text-nous-subtle mb-8">
                              Define the physics of your visual world.
                            </p>

                            <FieldGroup
                              label="Visual Presets"
                              description="Apply a foundational visual archetype."
                            >
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                {VISUAL_PRESETS.map((p) => {
                                  const isSelected =
                                    (
                                      draft?.positioningCore.aestheticCore
                                        .silhouettes || []
                                    ).join(",") ===
                                      (
                                        p.config.positioningCore.aestheticCore
                                          .silhouettes || []
                                      ).join(",") &&
                                    draft?.positioningCore.aestheticCore
                                      .eraBias ===
                                      p.config.positioningCore.aestheticCore
                                        .eraBias;
                                  return (
                                    <button
                                      key={p.name}
                                      onClick={() => applyVisualPreset(p)}
                                      className={`p-4 border rounded-none transition-all group flex flex-col items-center gap-3 relative ${isSelected ? "border-nous-border bg-nous-base " : "border-nous-border hover:border-nous-border "}`}
                                    >
                                      <div
                                        className={`transition-colors ${isSelected ? "text-nous-text " : "text-nous-subtle group-hover:text-nous-text dark:group-hover:text-nous-text"}`}
                                      >
                                        {p.icon}
                                      </div>
                                      <span
                                        className={`font-sans text-[8px] uppercase tracking-widest font-black transition-colors ${isSelected ? "text-nous-text " : "text-nous-subtle group-hover:text-nous-text dark:group-hover:text-nous-text"}`}
                                      >
                                        {p.name}
                                      </span>
                                      {isSelected && (
                                        <CheckCircle
                                          size={12}
                                          className="text-nous-text absolute top-2 right-2"
                                        />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </FieldGroup>

                            <FieldGroup
                              label={
                                <GlossaryTooltip
                                  term="Silhouettes"
                                  poeticMeaning="The shape of your against the cultural wall."
                                  functionalMeaning="Defines the primary structural forms and outlines present in the generated visuals."
                                >
                                  <span>Silhouettes</span>
                                </GlossaryTooltip>
                              }
                            >
                              <PresetStrip
                                options={SILHOUETTE_OPTIONS}
                                current={
                                  draft.positioningCore.aestheticCore
                                    .silhouettes
                                }
                                onSelect={(v) => toggleOption("silhouettes", v)}
                                onAddCustom={(v) =>
                                  addCustomOption("silhouettes", v)
                                }
                                customPlaceholder="Add custom silhouette..."
                              />
                            </FieldGroup>
                            <FieldGroup
                              label={
                                <GlossaryTooltip
                                  term="Materiality"
                                  poeticMeaning="The tactile truth of the digital surface."
                                  functionalMeaning="Specifies the textures, fabrics, and physical substances that dominate the aesthetic."
                                >
                                  <span>Materiality</span>
                                </GlossaryTooltip>
                              }
                            >
                              <PresetStrip
                                options={TEXTURE_OPTIONS}
                                current={
                                  draft.positioningCore.aestheticCore
                                    .materiality
                                }
                                onSelect={(v) => toggleOption("materiality", v)}
                                onAddCustom={(v) =>
                                  addCustomOption("materiality", v)
                                }
                                customPlaceholder="Add custom material..."
                              />
                            </FieldGroup>
                            <FieldGroup
                              label={
                                <GlossaryTooltip
                                  term="Photograph / Media Style"
                                  poeticMeaning="The lens through which the ghost is captured."
                                  functionalMeaning="Sets the medium, camera format, or visual treatment of the generated images."
                                >
                                  <span>Photograph / Media Style</span>
                                </GlossaryTooltip>
                              }
                            >
                              <PresetStrip
                                options={PHOTOGRAPH_STYLE_OPTIONS}
                                current={
                                  draft.positioningCore.aestheticCore
                                    .mediaStyle || []
                                }
                                onSelect={(v) => toggleOption("mediaStyle", v)}
                                onAddCustom={(v) =>
                                  addCustomOption("mediaStyle", v)
                                }
                                customPlaceholder="Add custom style..."
                              />
                            </FieldGroup>

                            <FieldGroup
                              label={
                                <GlossaryTooltip
                                  term="Era Bias"
                                  poeticMeaning="The temporal anchor of the aesthetic."
                                  functionalMeaning="Sets the historical or futuristic time period that influences the visual style (e.g., 90s Minimal, Y2K Cyber, Post-Digital)."
                                >
                                  <span>Era Bias</span>
                                </GlossaryTooltip>
                              }
                            >
                              <PresetStrip
                                options={ERA_OPTIONS}
                                current={
                                  draft.positioningCore.aestheticCore.eraBias
                                }
                                onSelect={(v) =>
                                  updatePositioning("aestheticCore", {
                                    ...draft.positioningCore.aestheticCore,
                                    eraBias: v,
                                  })
                                }
                                onAddCustom={(v) =>
                                  updatePositioning("aestheticCore", {
                                    ...draft.positioningCore.aestheticCore,
                                    eraBias: v,
                                  })
                                }
                                customPlaceholder="Add specific era..."
                              />
                            </FieldGroup>
                            <FieldGroup
                              label="Form & Presentation"
                              description="The gender expression or structural presentation of the aesthetic."
                            >
                              <PresetStrip
                                options={PRESENTATION_OPTIONS}
                                current={
                                  draft.positioningCore.aestheticCore
                                    .presentation || "Androgynous"
                                }
                                onSelect={(v) =>
                                  updatePositioning("aestheticCore", {
                                    ...draft.positioningCore.aestheticCore,
                                    presentation: v,
                                  })
                                }
                                onAddCustom={(v) =>
                                  updatePositioning("aestheticCore", {
                                    ...draft.positioningCore.aestheticCore,
                                    presentation: v,
                                  })
                                }
                                customPlaceholder="Add specific presentation..."
                              />
                            </FieldGroup>
                            <FieldGroup
                              label={
                                <GlossaryTooltip
                                  term="Density"
                                  poeticMeaning="The visual weight and concentration of elements within the frame."
                                  functionalMeaning="Controls the amount of detail, objects, and visual information packed into the generated output."
                                >
                                  <label className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle font-black">
                                    Density (1-10)
                                  </label>
                                </GlossaryTooltip>
                              }
                              description="The amount of information, layers, and semiotic weight packed into a single artifact."
                            >
                              <SemanticSteps
                                steps={[
                                  { label: "MINIMAL", value: 1 },
                                  { label: "BALANCED", value: 4 },
                                  { label: "DENSE", value: 7 },
                                  { label: "MAXIMAL", value: 10 },
                                ]}
                                value={
                                  draft.positioningCore.aestheticCore.density ||
                                  5
                                }
                                onChange={(val) =>
                                  updatePositioning("aestheticCore", {
                                    ...draft.positioningCore.aestheticCore,
                                    density: val,
                                  })
                                }
                              />
                            </FieldGroup>

                            <FieldGroup
                              label={
                                <GlossaryTooltip
                                  term="Entropy"
                                  poeticMeaning="The degree of chaos and unpredictability in the visual translation."
                                  functionalMeaning="Determines how strictly the AI adheres to conventional logic versus introducing random, surreal elements."
                                >
                                  <span>Entropy (1-10)</span>
                                </GlossaryTooltip>
                              }
                              description="The degree of randomness, unpredictability, and unconventional logic applied to the translation."
                            >
                              <SemanticSteps
                                steps={[
                                  { label: "STABLE", value: 1 },
                                  { label: "STRUCTURED", value: 4 },
                                  { label: "FLUID", value: 7 },
                                  { label: "CHAOTIC", value: 10 },
                                ]}
                                value={
                                  draft.positioningCore.aestheticCore.entropy ||
                                  5
                                }
                                onChange={(val) =>
                                  updatePositioning("aestheticCore", {
                                    ...draft.positioningCore.aestheticCore,
                                    entropy: val,
                                  })
                                }
                              />
                            </FieldGroup>

                            <FieldGroup
                              label={
                                <GlossaryTooltip
                                  term="Generation Temperature"
                                  poeticMeaning="The fever of the machine."
                                  functionalMeaning="Controls the 'wildness' of AI generation. Lower values are more stable and grounded, higher values are more experimental and hallucinatory."
                                >
                                  <span>Generation Temperature</span>
                                </GlossaryTooltip>
                              }
                              description="Control the 'wildness' of AI generation. Lower values are more stable and grounded."
                            >
                              <SemanticSteps
                                steps={[
                                  { label: "STABLE", value: 0 },
                                  { label: "MEASURED", value: 33 },
                                  { label: "CREATIVE", value: 66 },
                                  { label: "WILD", value: 100 },
                                ]}
                                value={
                                  (draft.generationTemperature ?? 0.8) * 100
                                }
                                onChange={(val) =>
                                  updateDraft({
                                    generationTemperature: val / 100,
                                  })
                                }
                              />
                              <p className="font-mono text-[8px] text-nous-subtle uppercase tracking-widest mt-2">
                                Current Resonance:{" "}
                                {(
                                  (draft.generationTemperature ?? 0.8) * 100
                                ).toFixed(0)}
                                %
                              </p>
                            </FieldGroup>
                          </>
                        )}

                        {activeStep === "chromatic" && (
                          <>
                            <p className="font-serif italic text-nous-subtle mb-8">
                              The color logic of your universe.
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                              {CHROMATIC_PRESETS.map((p) => (
                                <button
                                  key={p.name}
                                  onClick={() => applyChromaticPreset(p)}
                                  className="p-4 border border-nous-border rounded-none hover:border-nous-border transition-all group flex flex-col items-center gap-3"
                                >
                                  <div className="flex gap-1">
                                    <div
                                      className="w-4 h-4 rounded-none"
                                      style={{ backgroundColor: p.base }}
                                    />
                                    <div
                                      className="w-4 h-4 rounded-none"
                                      style={{ backgroundColor: p.accent }}
                                    />
                                  </div>
                                  <span className="font-sans text-[8px] uppercase tracking-widest font-black text-nous-subtle group-hover:text-nous-text dark:group-hover:text-nous-text">
                                    {p.name}
                                  </span>
                                </button>
                              ))}
                            </div>

                            <FieldGroup
                              label={
                                <GlossaryTooltip
                                  term="Base Neutral (Primary)"
                                  poeticMeaning="The silence between the notes."
                                  functionalMeaning="The primary background or neutral color that grounds the aesthetic palette."
                                >
                                  <span>Base Neutral (Primary)</span>
                                </GlossaryTooltip>
                              }
                              description="Your silence. Enter Hex or use picker."
                            >
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  <input
                                    type="color"
                                    value={
                                      draft.expressionEngine.chromaticRegistry
                                        .baseNeutral
                                    }
                                    onChange={(e) =>
                                      updateExpression("chromaticRegistry", {
                                        ...draft.expressionEngine
                                          .chromaticRegistry,
                                        baseNeutral: e.target.value,
                                      })
                                    }
                                    className="w-12 h-12 p-0 border-0 rounded-none cursor-pointer absolute inset-0 opacity-0"
                                  />
                                  <div
                                    className="w-12 h-12 rounded-none border border-black/10"
                                    style={{
                                      backgroundColor:
                                        draft.expressionEngine.chromaticRegistry
                                          .baseNeutral,
                                    }}
                                  />
                                </div>
                                <input
                                  value={
                                    draft.expressionEngine.chromaticRegistry
                                      .baseNeutral
                                  }
                                  onChange={(e) =>
                                    updateExpression("chromaticRegistry", {
                                      ...draft.expressionEngine
                                        .chromaticRegistry,
                                      baseNeutral: e.target.value,
                                    })
                                  }
                                  className="bg-transparent border-b border-nous-border py-2 font-mono text-lg focus:outline-none focus:border-nous-border dark:focus:border-nous-border"
                                />
                              </div>
                            </FieldGroup>
                            <FieldGroup
                              label={
                                <GlossaryTooltip
                                  term="Accent Signal"
                                  poeticMeaning="The sudden flash of neon in the dark."
                                  functionalMeaning="The primary highlight color used to draw attention or signify action."
                                >
                                  <span>Accent Signal</span>
                                </GlossaryTooltip>
                              }
                              description="Your alert. Enter Hex or use picker."
                            >
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  <input
                                    type="color"
                                    value={
                                      draft.expressionEngine.chromaticRegistry
                                        .accentSignal
                                    }
                                    onChange={(e) =>
                                      updateExpression("chromaticRegistry", {
                                        ...draft.expressionEngine
                                          .chromaticRegistry,
                                        accentSignal: e.target.value,
                                      })
                                    }
                                    className="w-12 h-12 p-0 border-0 rounded-none cursor-pointer absolute inset-0 opacity-0"
                                  />
                                  <div
                                    className="w-12 h-12 rounded-none border border-black/10"
                                    style={{
                                      backgroundColor:
                                        draft.expressionEngine.chromaticRegistry
                                          .accentSignal,
                                    }}
                                  />
                                </div>
                                <input
                                  value={
                                    draft.expressionEngine.chromaticRegistry
                                      .accentSignal
                                  }
                                  onChange={(e) =>
                                    updateExpression("chromaticRegistry", {
                                      ...draft.expressionEngine
                                        .chromaticRegistry,
                                      accentSignal: e.target.value,
                                    })
                                  }
                                  className="bg-transparent border-b border-nous-border py-2 font-mono text-lg focus:outline-none focus:border-nous-border dark:focus:border-nous-border"
                                />
                              </div>
                            </FieldGroup>

                            <FieldGroup
                              label={
                                <GlossaryTooltip
                                  term="Extended Palette"
                                  poeticMeaning="The full spectrum of your synthetic soul."
                                  functionalMeaning="A broader set of colors that define the brand's visual identity."
                                >
                                  <span>Extended Palette</span>
                                </GlossaryTooltip>
                              }
                              description="Define the core signals."
                            >
                              <div className="flex flex-wrap gap-4 mb-4">
                                {draft.expressionEngine.chromaticRegistry.primaryPalette.map(
                                  (c, i) => (
                                    <div
                                      key={i}
                                      className="group relative flex flex-col items-center"
                                    >
                                      <div
                                        className="relative w-16 h-16 rounded-none border border-black/10"
                                        style={{ backgroundColor: c.hex }}
                                      >
                                        <input
                                          type="color"
                                          value={c.hex}
                                          onChange={(e) => {
                                            const newPalette = [
                                              ...draft.expressionEngine
                                                .chromaticRegistry
                                                .primaryPalette,
                                            ];
                                            newPalette[i] = {
                                              ...c,
                                              hex: e.target.value,
                                            };
                                            updateExpression(
                                              "chromaticRegistry",
                                              {
                                                ...draft.expressionEngine
                                                  .chromaticRegistry,
                                                primaryPalette: newPalette,
                                              },
                                            );
                                          }}
                                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <button
                                          onClick={() => removeColor(c.hex)}
                                          className="absolute -top-2 -right-2 bg-nous-base text-red-500 rounded-none p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                        >
                                          <X size={10} />
                                        </button>
                                      </div>
                                      <input
                                        value={c.name}
                                        onChange={(e) => {
                                          const newPalette = [
                                            ...draft.expressionEngine
                                              .chromaticRegistry.primaryPalette,
                                          ];
                                          newPalette[i] = {
                                            ...c,
                                            name: e.target.value,
                                          };
                                          updateExpression(
                                            "chromaticRegistry",
                                            {
                                              ...draft.expressionEngine
                                                .chromaticRegistry,
                                              primaryPalette: newPalette,
                                            },
                                          );
                                        }}
                                        className="mt-2 text-[8px] font-mono text-center uppercase w-16 bg-transparent border-b border-nous-border focus:outline-none"
                                        placeholder="Name"
                                      />
                                    </div>
                                  ),
                                )}
                                {draft.expressionEngine.chromaticRegistry
                                  .primaryPalette.length < 8 && (
                                  <button
                                    onClick={() => {
                                      const current =
                                        draft.expressionEngine.chromaticRegistry
                                          ?.primaryPalette || [];
                                      updateExpression("chromaticRegistry", {
                                        ...draft.expressionEngine
                                          .chromaticRegistry,
                                        primaryPalette: [
                                          ...current,
                                          { name: "New Color", hex: "#000000" },
                                        ],
                                      });
                                    }}
                                    className="w-16 h-16 rounded-none border border-dashed border-nous-border flex items-center justify-center text-[#a8a29e] hover:text-nous-text hover:border-nous-border transition-colors"
                                  >
                                    <Plus size={20} />
                                  </button>
                                )}
                              </div>
                            </FieldGroup>

                            <div className="pt-8 border-t border-nous-border/40">
                              <div className="font-mono text-[8px] uppercase tracking-widest text-[#a8a29e] mb-1">
                                Output Format
                              </div>
                              <p className="font-serif italic text-xs text-[#a8a29e] mb-6">
                                Physical properties of the zine artifact.
                              </p>

                              <div className="space-y-6">
                                <div className="space-y-2">
                                  <label className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle font-black">
                                    Paper Stock
                                  </label>
                                  <PresetStrip
                                    options={[
                                      "newsprint",
                                      "cold-press",
                                      "vellum",
                                      "raw-cardboard",
                                    ]}
                                    current={
                                      draft.materialityConfig?.paperStock ||
                                      "newsprint"
                                    }
                                    onSelect={(v) =>
                                      updateDraft({
                                        materialityConfig: {
                                          ...draft.materialityConfig,
                                          paperStock: v as any,
                                        },
                                      })
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle font-black">
                                    Typography Lineage
                                  </label>
                                  <PresetStrip
                                    options={[
                                      "brutalist",
                                      "editorial-serif",
                                      "technical-mono",
                                    ]}
                                    current={
                                      draft.materialityConfig
                                        ?.typographyLineage || "editorial-serif"
                                    }
                                    onSelect={(v) =>
                                      updateDraft({
                                        materialityConfig: {
                                          ...draft.materialityConfig,
                                          typographyLineage: v as any,
                                        },
                                      })
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle font-black">
                                    Negative Space Density (1-10)
                                  </label>
                                  <SemanticSteps
                                    steps={[
                                      { label: "TIGHT", value: 1 },
                                      { label: "COMPACT", value: 4 },
                                      { label: "AIRY", value: 7 },
                                      { label: "EXPANSIVE", value: 10 },
                                    ]}
                                    value={
                                      draft.materialityConfig
                                        ?.negativeSpaceDensity || 5
                                    }
                                    onChange={(val) =>
                                      updateDraft({
                                        materialityConfig: {
                                          ...draft.materialityConfig,
                                          negativeSpaceDensity: val,
                                        },
                                      })
                                    }
                                  />
                                  <span className="font-mono text-xs text-nous-text">
                                    {draft.materialityConfig
                                      ?.negativeSpaceDensity || 5}{" "}
                                    / 10
                                  </span>
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        {activeStep === "voice" && (
                          <>
                            <p className="font-serif italic text-nous-subtle mb-8">
                              How does this profile speak?
                            </p>
                            <FieldGroup
                              label={
                                <GlossaryTooltip
                                  term="Emotional Temperature"
                                  poeticMeaning="The heat radiating from the words."
                                  functionalMeaning="Sets the overall mood and affective resonance of the generated text (e.g., Clinical, Intimate, Visceral)."
                                >
                                  <span>Emotional Temperature</span>
                                </GlossaryTooltip>
                              }
                            >
                              <PresetStrip
                                options={EMOTIONAL_TEMPERATURES}
                                current={
                                  draft.expressionEngine.narrativeVoice
                                    .emotionalTemperature
                                }
                                onSelect={(v) =>
                                  updateExpression("narrativeVoice", {
                                    ...draft.expressionEngine.narrativeVoice,
                                    emotionalTemperature: v,
                                  })
                                }
                              />
                              <input
                                value={
                                  draft.expressionEngine.narrativeVoice
                                    .emotionalTemperature
                                }
                                onChange={(e) =>
                                  updateExpression("narrativeVoice", {
                                    ...draft.expressionEngine.narrativeVoice,
                                    emotionalTemperature: e.target.value,
                                  })
                                }
                                className="w-full bg-transparent border-b border-nous-border py-2 font-serif italic text-sm focus:outline-none mt-3"
                                placeholder="Custom temperature..."
                              />
                            </FieldGroup>
                            <FieldGroup
                              label={
                                <GlossaryTooltip
                                  term="Structure Bias"
                                  poeticMeaning="The architectural rhythm of the sentence."
                                  functionalMeaning="Determines the syntactic flow, from short, punchy fragments to long, flowing prose."
                                >
                                  <span>Structure Bias</span>
                                </GlossaryTooltip>
                              }
                            >
                              <PresetStrip
                                options={SENTENCE_STRUCTURES}
                                current={
                                  draft.expressionEngine.narrativeVoice
                                    .structureBias
                                }
                                onSelect={(v) =>
                                  updateExpression("narrativeVoice", {
                                    ...draft.expressionEngine.narrativeVoice,
                                    structureBias: v,
                                  })
                                }
                              />
                              <input
                                value={
                                  draft.expressionEngine.narrativeVoice
                                    .structureBias
                                }
                                onChange={(e) =>
                                  updateExpression("narrativeVoice", {
                                    ...draft.expressionEngine.narrativeVoice,
                                    structureBias: e.target.value,
                                  })
                                }
                                className="w-full bg-transparent border-b border-nous-border py-2 font-serif italic text-sm focus:outline-none mt-3"
                                placeholder="Custom structure..."
                              />
                            </FieldGroup>

                            <FieldGroup
                              label={
                                <GlossaryTooltip
                                  term="Lexical Density"
                                  poeticMeaning="The thickness of the vocabulary, from sparse air to dense earth."
                                  functionalMeaning="A score from 1-10 indicating the complexity and rarity of the vocabulary used in the generated text."
                                >
                                  <label className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle font-black">
                                    Lexical Density (1-10)
                                  </label>
                                </GlossaryTooltip>
                              }
                              description="Complexity and richness of vocabulary."
                            >
                              <SemanticSteps
                                steps={[
                                  { label: "PLAIN", value: 1 },
                                  { label: "ACCESSIBLE", value: 4 },
                                  { label: "ACADEMIC", value: 7 },
                                  { label: "VERBOSE", value: 10 },
                                ]}
                                value={
                                  draft.expressionEngine.narrativeVoice
                                    .lexicalDensity || 5
                                }
                                onChange={(val) =>
                                  updateExpression("narrativeVoice", {
                                    ...draft.expressionEngine.narrativeVoice,
                                    lexicalDensity: val,
                                  })
                                }
                              />
                            </FieldGroup>

                            <FieldGroup
                              label={
                                <GlossaryTooltip
                                  term="Restraint Level"
                                  poeticMeaning="The tension of the unsaid holding back the flood."
                                  functionalMeaning="A score from 1-10 indicating how much emotion or detail is withheld versus explicitly stated."
                                >
                                  <span>Restraint Level (1-10)</span>
                                </GlossaryTooltip>
                              }
                              description="How much is held back versus explicitly stated."
                            >
                              <SemanticSteps
                                steps={[
                                  { label: "OPEN", value: 1 },
                                  { label: "EXPRESSIVE", value: 4 },
                                  { label: "MEASURED", value: 7 },
                                  { label: "CRYPTIC", value: 10 },
                                ]}
                                value={
                                  draft.expressionEngine.narrativeVoice
                                    .restraintLevel || 5
                                }
                                onChange={(val) =>
                                  updateExpression("narrativeVoice", {
                                    ...draft.expressionEngine.narrativeVoice,
                                    restraintLevel: val,
                                  })
                                }
                              />
                            </FieldGroup>

                            <FieldGroup
                              label="Voice Notes"
                              description="General directives for the narrative voice."
                            >
                              <textarea
                                value={
                                  draft.expressionEngine.narrativeVoice
                                    .voiceNotes || ""
                                }
                                onChange={(e) =>
                                  updateExpression("narrativeVoice", {
                                    ...draft.expressionEngine.narrativeVoice,
                                    voiceNotes: e.target.value,
                                  })
                                }
                                className="w-full bg-transparent border-b border-nous-border py-2 font-serif italic text-sm h-24 resize-none focus:outline-none focus:border-nous-border dark:focus:border-nous-border"
                                placeholder="e.g. Use high-theory, be slightly haughty but supportive..."
                              />
                            </FieldGroup>
                          </>
                        )}

                        {activeStep === "vectors" && (
                          <>
                            <p className="font-serif italic text-nous-subtle mb-8">
                              Where is this taste moving towards?
                            </p>
                            <FieldGroup
                              label={
                                <GlossaryTooltip
                                  term="More Of"
                                  poeticMeaning="The gravitational pull of your desires."
                                  functionalMeaning="Concepts, themes, or visual elements you want to see amplified in future generations."
                                >
                                  <span>More Of</span>
                                </GlossaryTooltip>
                              }
                            >
                              <textarea
                                value={
                                  draft.strategicVectors.desireVectors.moreOf
                                }
                                onChange={(e) =>
                                  updateStrategic("desireVectors", {
                                    ...draft.strategicVectors.desireVectors,
                                    moreOf: e.target.value,
                                  })
                                }
                                className="w-full bg-transparent border-b border-nous-border py-2 font-serif italic text-xl h-24 resize-none focus:outline-none focus:border-nous-border dark:focus:border-nous-border"
                                placeholder="e.g. Silence, negative space..."
                              />
                            </FieldGroup>
                            <FieldGroup
                              label={
                                <GlossaryTooltip
                                  term="Less Of"
                                  poeticMeaning="The noise you are trying to filter out."
                                  functionalMeaning="Concepts, themes, or visual elements you want to actively suppress or avoid."
                                >
                                  <span>Less Of</span>
                                </GlossaryTooltip>
                              }
                            >
                              <textarea
                                value={
                                  draft.strategicVectors.desireVectors.lessOf
                                }
                                onChange={(e) =>
                                  updateStrategic("desireVectors", {
                                    ...draft.strategicVectors.desireVectors,
                                    lessOf: e.target.value,
                                  })
                                }
                                className="w-full bg-transparent border-b border-nous-border py-2 font-serif italic text-xl h-24 resize-none focus:outline-none focus:border-red-500"
                                placeholder="e.g. Noise, clutter..."
                              />
                            </FieldGroup>
                            <FieldGroup
                              label={
                                <GlossaryTooltip
                                  term="Experimenting With"
                                  poeticMeaning="The edge of the map where monsters live."
                                  functionalMeaning="New, untested concepts or styles you are currently exploring."
                                >
                                  <span>Experimenting With</span>
                                </GlossaryTooltip>
                              }
                            >
                              <textarea
                                value={
                                  draft.strategicVectors.desireVectors
                                    .experimentingWith
                                }
                                onChange={(e) =>
                                  updateStrategic("desireVectors", {
                                    ...draft.strategicVectors.desireVectors,
                                    experimentingWith: e.target.value,
                                  })
                                }
                                className="w-full bg-transparent border-b border-nous-border py-2 font-serif italic text-xl h-24 resize-none focus:outline-none focus:border-indigo-500"
                                placeholder="e.g. 3D renders, video essays..."
                              />
                            </FieldGroup>
                          </>
                        )}

                        {activeStep === "tokens" && (
                          <div className="h-[700px] border border-transparent md:border-nous-border relative overflow-hidden">
                            <AestheticTokensMap draft={draft} />
                          </div>
                        )}

                        {activeStep === "shards" && (
                          <>
                            <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-8">
                              <div>
                                <p className="font-serif italic text-nous-subtle">
                                  Upload reference images to train the Oracle.
                                </p>
                              </div>
                              <div className="relative group">
                                <input
                                  type="file"
                                  ref={gridInputRef}
                                  onChange={handleGridUpload}
                                  accept="image/*"
                                  className="hidden"
                                />
                                <button
                                  onClick={() => gridInputRef.current?.click()}
                                  disabled={isExtractingGrid}
                                  className="flex items-center gap-3 px-5 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 rounded-none font-sans text-[9px] uppercase tracking-widest font-black hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all"
                                >
                                  {isExtractingGrid ? (
                                    <Loader2
                                      size={14}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Instagram
                                      size={14}
                                      className="group-hover:scale-110 transition-transform"
                                    />
                                  )}
                                  <div className="flex flex-col items-start text-left">
                                    <span>
                                      {isExtractingGrid
                                        ? "Profiling Grid..."
                                        : "Social Profiling"}
                                    </span>
                                    <span className="text-[7px] font-mono opacity-70 tracking-normal normal-case">
                                      Upload 9-photo IG grid
                                    </span>
                                  </div>
                                </button>
                                <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-nous-base text-nous-subtle text-xs font-sans opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                  Creates a aseline aesthetic vibe for users who
                                  aren't sure how to fill out their profile
                                  manually.
                                </div>
                              </div>
                            </div>
                            <div
                              className="border-2 border-dashed border-nous-border rounded-none p-12 text-center hover:border-nous-border transition-colors cursor-pointer group"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <div className="w-16 h-16 bg-nous-base rounded-none flex items-center justify-center mx-auto mb-4 text-nous-subtle group-hover:text-nous-text dark:group-hover:text-nous-text transition-colors">
                                <Upload size={24} />
                              </div>
                              <span className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle group-hover:text-nous-text dark:group-hover:text-nous-text">
                                Upload Visual Shards
                              </span>
                            </div>
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleShardUpload}
                              className="hidden"
                              multiple
                              accept="image/*"
                            />

                            {draft.positioningCore.aestheticCore.visualShards &&
                              draft.positioningCore.aestheticCore.visualShards
                                .length > 0 && (
                                <div className="grid grid-cols-3 gap-4 mt-8">
                                  {draft.positioningCore.aestheticCore.visualShards.map(
                                    (s, i) => (
                                      <div
                                        key={i}
                                        className="aspect-square bg-nous-base relative group overflow-hidden rounded-none"
                                      >
                                        <img
                                          src={s}
                                          className="w-full h-full object-cover"
                                        />
                                        <button
                                          onClick={() =>
                                            updatePositioning("aestheticCore", {
                                              ...draft.positioningCore
                                                .aestheticCore,
                                              visualShards:
                                                draft.positioningCore.aestheticCore.visualShards.filter(
                                                  (_, idx) => idx !== i,
                                                ),
                                            })
                                          }
                                          className="absolute top-1 right-1 bg-nous-base text-red-500 p-1 rounded-none opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <X size={12} />
                                        </button>
                                      </div>
                                    ),
                                  )}
                                </div>
                              )}

                            <ShardAnalyzer
                              shards={
                                draft.positioningCore.aestheticCore.visualShards
                              }
                              draft={draft}
                            />
                          </>
                        )}

                        {activeStep === "brand" && (
                          <>
                            <p className="font-serif italic text-nous-subtle mb-8">
                              Define your visual assets and typographic
                              hierarchy.
                            </p>

                            <FieldGroup
                              label={
                                <GlossaryTooltip
                                  term="Typographic DNA"
                                  poeticMeaning="The shape of your voice."
                                  functionalMeaning="Import from Google Fonts. Type specific font name to fetch and preview."
                                >
                                  <span>Typographic DNA</span>
                                </GlossaryTooltip>
                              }
                              description="Import from Google Fonts. Type specific font name to fetch and preview."
                            >
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                {availableFonts.map((f) => (
                                  <button
                                    key={f.name}
                                    onClick={() =>
                                      updateExpression("typographyIntent", {
                                        ...draft.expressionEngine
                                          .typographyIntent,
                                        styleDescription: f.name,
                                      })
                                    }
                                    className={`text-left p-4 border rounded-none transition-all ${draft.expressionEngine.typographyIntent?.styleDescription === f.name ? "border-nous-border bg-nous-base " : "border-nous-border "}`}
                                  >
                                    <span className="font-sans text-[7px] uppercase tracking-widest text-[#a8a29e] block mb-1">
                                      {f.type}
                                    </span>
                                    <span
                                      className="text-xl"
                                      style={{ fontFamily: f.name }}
                                    >
                                      {f.name}
                                    </span>
                                  </button>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <input
                                  value={customFontInput}
                                  onChange={(e) =>
                                    setCustomFontInput(e.target.value)
                                  }
                                  onKeyDown={(e) =>
                                    e.key === "Enter" && handleAddFont()
                                  }
                                  placeholder="e.g. 'Cinzel' or 'Oswald'"
                                  className="flex-1 bg-transparent border-b border-nous-border py-2 font-serif italic text-lg"
                                />
                                <button
                                  onClick={handleAddFont}
                                  disabled={isFontLoading}
                                  className="font-sans text-[9px] uppercase tracking-widest font-black flex items-center gap-2 hover:text-nous-text"
                                >
                                  {isFontLoading ? (
                                    <Loader2
                                      size={12}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Download size={12} />
                                  )}{" "}
                                  Fetch Font
                                </button>
                              </div>
                              {draft.expressionEngine.typographyIntent
                                ?.styleDescription && (
                                <p className="mt-4 text-sm text-[#a8a29e] font-serif italic">
                                  Mimi will inject the Google Font stylesheet
                                  immediately.
                                </p>
                              )}
                            </FieldGroup>

                            <FieldGroup
                              label={
                                <GlossaryTooltip
                                  term="Logo Mark"
                                  poeticMeaning="The sigil of your digital presence."
                                  functionalMeaning="Upload or paste an image URL to serve as the primary brand identifier."
                                >
                                  <span>Logo Mark</span>
                                </GlossaryTooltip>
                              }
                            >
                              <div
                                className="border-2 border-dashed border-nous-border rounded-none p-8 text-center hover:border-nous-border transition-colors cursor-pointer group flex flex-col items-center gap-4"
                                onClick={() => logoInputRef.current?.click()}
                              >
                                {draft.expressionEngine.brandIdentity?.logo ? (
                                  <img
                                    src={
                                      draft.expressionEngine.brandIdentity.logo
                                    }
                                    className="h-32 object-contain"
                                  />
                                ) : (
                                  <div className="w-16 h-16 bg-nous-base rounded-none flex items-center justify-center text-nous-subtle group-hover:text-nous-text dark:group-hover:text-nous-text transition-colors">
                                    <Upload size={24} />
                                  </div>
                                )}
                                <span className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle group-hover:text-nous-text dark:group-hover:text-nous-text">
                                  {draft.expressionEngine.brandIdentity?.logo
                                    ? "Replace Logo"
                                    : "Upload Logo"}
                                </span>
                              </div>
                              <input
                                type="file"
                                ref={logoInputRef}
                                onChange={handleLogoUpload}
                                className="hidden"
                                accept="image/*"
                              />
                            </FieldGroup>

                            <FieldGroup
                              label={
                                <GlossaryTooltip
                                  term="Typography System"
                                  poeticMeaning="The architectural hierarchy of your words."
                                  functionalMeaning="Defines the specific fonts used for different textual elements (Serif, Sans, Mono)."
                                >
                                  <span>Typography System</span>
                                </GlossaryTooltip>
                              }
                            >
                              <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                  <label className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle">
                                    Primary Serif (Headlines)
                                  </label>
                                  <div className="flex items-center gap-2 border-b border-nous-border focus-within:border-nous-border dark:focus-within:border-nous-border transition-colors">
                                    <input
                                      value={
                                        draft.expressionEngine.brandIdentity
                                          ?.fonts.serif || ""
                                      }
                                      onChange={(e) =>
                                        updateExpression("brandIdentity", {
                                          ...draft.expressionEngine
                                            .brandIdentity!,
                                          fonts: {
                                            ...draft.expressionEngine
                                              .brandIdentity!.fonts,
                                            serif: e.target.value,
                                          },
                                        })
                                      }
                                      className="w-full bg-transparent py-2 font-serif italic text-xl focus:outline-none"
                                      placeholder="e.g. Cormorant Garamond"
                                      style={{
                                        fontFamily:
                                          draft.expressionEngine.brandIdentity
                                            ?.fonts.serif,
                                      }}
                                    />
                                    <button
                                      onClick={() =>
                                        injectGoogleFont(
                                          draft.expressionEngine.brandIdentity
                                            ?.fonts.serif || "",
                                        )
                                      }
                                      className="p-2 text-nous-subtle hover:text-nous-text transition-colors"
                                      title="Fetch from Google Fonts"
                                    >
                                      <Download size={16} />
                                    </button>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle">
                                    Secondary Sans (Body)
                                  </label>
                                  <div className="flex items-center gap-2 border-b border-nous-border focus-within:border-nous-border dark:focus-within:border-nous-border transition-colors">
                                    <input
                                      value={
                                        draft.expressionEngine.brandIdentity
                                          ?.fonts.sans || ""
                                      }
                                      onChange={(e) =>
                                        updateExpression("brandIdentity", {
                                          ...draft.expressionEngine
                                            .brandIdentity!,
                                          fonts: {
                                            ...draft.expressionEngine
                                              .brandIdentity!.fonts,
                                            sans: e.target.value,
                                          },
                                        })
                                      }
                                      className="w-full bg-transparent py-2 font-sans text-lg focus:outline-none"
                                      placeholder="e.g. Inter"
                                      style={{
                                        fontFamily:
                                          draft.expressionEngine.brandIdentity
                                            ?.fonts.sans,
                                      }}
                                    />
                                    <button
                                      onClick={() =>
                                        injectGoogleFont(
                                          draft.expressionEngine.brandIdentity
                                            ?.fonts.sans || "",
                                        )
                                      }
                                      className="p-2 text-nous-subtle hover:text-nous-text transition-colors"
                                      title="Fetch from Google Fonts"
                                    >
                                      <Download size={16} />
                                    </button>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle">
                                    Tertiary Mono (Data)
                                  </label>
                                  <div className="flex items-center gap-2 border-b border-nous-border focus-within:border-nous-border dark:focus-within:border-nous-border transition-colors">
                                    <input
                                      value={
                                        draft.expressionEngine.brandIdentity
                                          ?.fonts.mono || ""
                                      }
                                      onChange={(e) =>
                                        updateExpression("brandIdentity", {
                                          ...draft.expressionEngine
                                            .brandIdentity!,
                                          fonts: {
                                            ...draft.expressionEngine
                                              .brandIdentity!.fonts,
                                            mono: e.target.value,
                                          },
                                        })
                                      }
                                      className="w-full bg-transparent py-2 font-mono text-sm focus:outline-none"
                                      placeholder="e.g. Space Mono"
                                      style={{
                                        fontFamily:
                                          draft.expressionEngine.brandIdentity
                                            ?.fonts.mono,
                                      }}
                                    />
                                    <button
                                      onClick={() =>
                                        injectGoogleFont(
                                          draft.expressionEngine.brandIdentity
                                            ?.fonts.mono || "",
                                        )
                                      }
                                      className="p-2 text-nous-subtle hover:text-nous-text transition-colors"
                                      title="Fetch from Google Fonts"
                                    >
                                      <Download size={16} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </FieldGroup>

                            <FieldGroup
                              label={
                                <GlossaryTooltip
                                  term="Brand Palette"
                                  poeticMeaning="The colors of your synthetic aura."
                                  functionalMeaning="The core set of colors that define the brand's visual identity."
                                >
                                  <span>Brand Palette</span>
                                </GlossaryTooltip>
                              }
                            >
                              <div className="flex flex-wrap gap-4 mb-4">
                                {draft.expressionEngine.brandIdentity?.palette.map(
                                  (hex, i) => (
                                    <div key={i} className="group relative">
                                      <div
                                        className="w-12 h-12 rounded-none cursor-pointer border border-black/5"
                                        style={{ backgroundColor: hex }}
                                      />
                                      <button
                                        onClick={() =>
                                          updateExpression("brandIdentity", {
                                            ...draft.expressionEngine
                                              .brandIdentity!,
                                            palette:
                                              draft.expressionEngine.brandIdentity!.palette.filter(
                                                (_, idx) => idx !== i,
                                              ),
                                          })
                                        }
                                        className="absolute -top-1 -right-1 bg-nous-base text-red-500 rounded-none p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <X size={10} />
                                      </button>
                                    </div>
                                  ),
                                )}
                                <div className="relative flex items-center">
                                  <input
                                    type="color"
                                    onChange={(e) =>
                                      updateExpression("brandIdentity", {
                                        ...draft.expressionEngine
                                          .brandIdentity!,
                                        palette: [
                                          ...(draft.expressionEngine
                                            .brandIdentity?.palette || []),
                                          e.target.value,
                                        ],
                                      })
                                    }
                                    className="w-12 h-12 opacity-0 absolute inset-0 cursor-pointer"
                                  />
                                  <div className="w-12 h-12 rounded-none border-2 border-dashed border-nous-border flex items-center justify-center text-nous-subtle pointer-events-none">
                                    <Plus size={16} />
                                  </div>
                                </div>
                              </div>
                            </FieldGroup>
                          </>
                        )}

                        {activeStep === "drift" && (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center border border-nous-border bg-stone-50/40 dark:bg-stone-900/30 p-4">
                              <p className="font-serif italic text-sm text-nous-subtle leading-relaxed">
                                Monitor how external references influence this persona, then decide where the logic should stay rigid or remain open.
                              </p>
                              <span className="font-mono text-[8px] uppercase tracking-widest text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-1 w-fit">
                                Live diagnostic
                              </span>
                            </div>

                            <FieldGroup
                              label={
                                <GlossaryTooltip
                                  term="Drift Vulnerability"
                                  poeticMeaning="The permeability of the profile to the winds of the zeitgeist."
                                  functionalMeaning="A score from 1-10 indicating how susceptible this persona is to external aesthetic influence and trends."
                                >
                                  <span>Drift Vulnerability (1-10)</span>
                                </GlossaryTooltip>
                              }
                              description="How susceptible is this persona to external aesthetic influence?"
                            >
                              <SemanticSteps
                                steps={[
                                  { label: "RIGID", value: 1 },
                                  { label: "SELECTIVE", value: 4 },
                                  { label: "OPEN", value: 7 },
                                  { label: "FLUID", value: 10 },
                                ]}
                                value={
                                  draft.diagnostics?.driftVulnerability || 5
                                }
                                onChange={(val) =>
                                  updateDraft({
                                    diagnostics: {
                                      ...(draft.diagnostics || {
                                        contradictionFlags: [],
                                        dilutionRisks: [],
                                        authorityStrengthScore: 50,
                                        driftVulnerability: 5,
                                      }),
                                      driftVulnerability: val,
                                    },
                                  })
                                }
                              />
                            </FieldGroup>

                            <FieldGroup
                              label="Authority Strength Score"
                              description="The overall coherence and distinctiveness of this persona."
                            >
                              <div className="flex items-center gap-4">
                                <div className="flex-1 h-2 bg-stone-200 rounded-none overflow-hidden">
                                  <div
                                    className={`h-full transition-all duration-500 ${(draft.diagnostics?.authorityStrengthScore || 50) < 40 ? "bg-red-500" : (draft.diagnostics?.authorityStrengthScore || 50) < 70 ? "bg-amber-500" : "bg-nous-base "}`}
                                    style={{
                                      width: `${draft.diagnostics?.authorityStrengthScore || 50}%`,
                                    }}
                                  />
                                </div>
                                <span
                                  className={`font-mono text-xs font-bold ${(draft.diagnostics?.authorityStrengthScore || 50) < 40 ? "text-red-500" : (draft.diagnostics?.authorityStrengthScore || 50) < 70 ? "text-amber-500" : "text-nous-text "}`}
                                >
                                  {draft.diagnostics?.authorityStrengthScore ||
                                    50}
                                  /100
                                </span>
                              </div>
                            </FieldGroup>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                              <FieldGroup
                                label="Contradiction Flags"
                                description="Conflicting directives in the current logic."
                              >
                                {draft.diagnostics?.contradictionFlags &&
                                draft.diagnostics.contradictionFlags.length >
                                  0 ? (
                                  <ul className="space-y-2">
                                    {draft.diagnostics.contradictionFlags.map(
                                      (flag, i) => (
                                        <li
                                          key={i}
                                          className="flex items-start gap-2 text-sm"
                                        >
                                          <ShieldAlert
                                            size={14}
                                            className="text-amber-500 mt-0.5 shrink-0"
                                          />
                                          <span className="font-serif italic text-nous-subtle">
                                            {flag}
                                          </span>
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                ) : (
                                  <p className="font-serif italic text-sm text-nous-subtle">
                                    No contradictions detected. The logic is
                                    coherent.
                                  </p>
                                )}
                              </FieldGroup>

                              <FieldGroup
                                label="Dilution Risks"
                                description="Areas where the persona might lose its edge."
                              >
                                {draft.diagnostics?.dilutionRisks &&
                                draft.diagnostics.dilutionRisks.length > 0 ? (
                                  <ul className="space-y-2">
                                    {draft.diagnostics.dilutionRisks.map(
                                      (risk, i) => (
                                        <li
                                          key={i}
                                          className="flex items-start gap-2 text-sm"
                                        >
                                          <Info
                                            size={14}
                                            className="text-blue-500 mt-0.5 shrink-0"
                                          />
                                          <span className="font-serif italic text-nous-subtle">
                                            {risk}
                                          </span>
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                ) : (
                                  <p className="font-serif italic text-sm text-nous-subtle">
                                    No dilution risks detected. The persona is
                                    sharp.
                                  </p>
                                )}
                              </FieldGroup>
                            </div>

                            <FieldGroup
                              label="Aesthetic Drift History"
                              description="Recent shifts in your aesthetic profile."
                            >
                              {profile?.tasteProfile?.audit_history &&
                              profile.tasteProfile.audit_history.length > 0 ? (
                                <div className="space-y-4">
                                  {profile.tasteProfile.audit_history
                                    .slice(-5)
                                    .reverse()
                                    .map((event, i) => (
                                      <div
                                        key={i}
                                        className="p-4 border border-nous-border rounded-none bg-nous-base /50"
                                      >
                                        <div className="flex justify-between items-center mb-2">
                                          <span className="font-sans text-[9px] uppercase tracking-widest font-black text-nous-subtle">
                                            {event.type.replace("_", " ")}
                                          </span>
                                          <span className="font-mono text-[8px] text-nous-subtle">
                                            {new Date(
                                              event.timestamp,
                                            ).toLocaleDateString()}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                          <span className="font-serif italic text-sm text-nous-subtle line-through">
                                            {event.before.archetype ||
                                              event.before.color}
                                          </span>
                                          <ArrowRight
                                            size={12}
                                            className="text-nous-text"
                                          />
                                          <span className="font-serif italic text-sm text-nous-text text-nous-text">
                                            {event.after.archetype ||
                                              event.after.color}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              ) : (
                                <p className="font-serif italic text-sm text-nous-subtle">
                                  No significant drift detected yet. Keep
                                  generating zines to establish a baseline.
                                </p>
                              )}
                            </FieldGroup>
                          </>
                        )}

                        {activeStep === "press-room" && (
                          <>
                            <p className="font-serif italic text-nous-subtle mb-8">
                              Adjust the physical tooth, paper stock, ink
                              weights, and layout parameters for this aesthetic
                              profile.
                            </p>
                            <MaterialityPanel
                              config={
                                draft.materialityConfig || {
                                  paperStock: "newsprint",
                                  typographyLineage: "brutalist",
                                  negativeSpaceDensity: 5,
                                  colorScheme: "monochrome",
                                }
                              }
                              onChangeConfig={(newConfig) =>
                                updateDraft({ materialityConfig: newConfig })
                              }
                            />
                          </>
                        )}
                        {activeStep === "celestial" && (
                          <>
                            <p className="font-serif italic text-nous-subtle mb-8">
                              Set the orbital coordinates that color each zine’s
                              celestial reading — zodiac, season, and birth
                              timing.
                            </p>

                            <FieldGroup
                              label="Activation"
                              description="When enabled, zine generation inherits these coordinates for celestial_calibration."
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  updateCelestial(
                                    "enabled",
                                    !draft.celestialCalibration?.enabled,
                                  )
                                }
                                className={`flex items-center justify-between w-full p-4 border transition-colors ${
                                  draft.celestialCalibration?.enabled
                                    ? "border-nous-text bg-nous-base"
                                    : "border-nous-border hover:border-nous-subtle"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <Moon
                                    size={16}
                                    className={
                                      draft.celestialCalibration?.enabled
                                        ? "text-nous-text"
                                        : "text-nous-subtle"
                                    }
                                  />
                                  <div className="text-left">
                                    <span className="font-sans text-[9px] uppercase tracking-widest font-black block">
                                      Celestial Calibration
                                    </span>
                                    <span className="font-serif italic text-xs text-nous-subtle">
                                      {draft.celestialCalibration?.enabled
                                        ? "Active — readings will reflect your coordinates."
                                        : "Dormant — zines infer timing without your profile."}
                                    </span>
                                  </div>
                                </div>
                                <span
                                  className={`font-mono text-[8px] uppercase tracking-widest px-2 py-1 ${
                                    draft.celestialCalibration?.enabled
                                      ? "bg-nous-text text-nous-base"
                                      : "bg-nous-base text-nous-subtle border border-nous-border"
                                  }`}
                                >
                                  {draft.celestialCalibration?.enabled
                                    ? "On"
                                    : "Off"}
                                </span>
                              </button>
                            </FieldGroup>

                            <FieldGroup
                              label="Zodiac Sign"
                              description="Primary solar sign for oracular timing language."
                            >
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {ZODIAC_SIGNS.map((sign) => {
                                  const isActive =
                                    draft.celestialCalibration?.zodiac === sign;
                                  return (
                                    <button
                                      key={sign}
                                      type="button"
                                      onClick={() =>
                                        updateCelestial("zodiac", sign)
                                      }
                                      className={`px-3 py-2 border font-mono text-[8px] uppercase tracking-widest capitalize transition-colors ${
                                        isActive
                                          ? "border-nous-text bg-nous-text text-nous-base"
                                          : "border-nous-border text-nous-subtle hover:text-nous-text"
                                      }`}
                                    >
                                      {sign}
                                    </button>
                                  );
                                })}
                              </div>
                            </FieldGroup>

                            <FieldGroup
                              label="Birth Coordinates"
                              description="Optional — deepen the reading with date, time, and place."
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <label className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle font-black">
                                    Birth Date
                                  </label>
                                  <input
                                    type="date"
                                    value={
                                      draft.celestialCalibration?.birthDate ||
                                      ""
                                    }
                                    onChange={(e) =>
                                      updateCelestial(
                                        "birthDate",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full bg-transparent border-b border-nous-border py-2 font-mono text-sm focus:outline-none focus:border-nous-text"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle font-black">
                                    Birth Time
                                  </label>
                                  <input
                                    type="time"
                                    value={
                                      draft.celestialCalibration?.birthTime ||
                                      ""
                                    }
                                    onChange={(e) =>
                                      updateCelestial(
                                        "birthTime",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full bg-transparent border-b border-nous-border py-2 font-mono text-sm focus:outline-none focus:border-nous-text"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle font-black">
                                    Birth Location
                                  </label>
                                  <input
                                    type="text"
                                    value={
                                      draft.celestialCalibration
                                        ?.birthLocation || ""
                                    }
                                    onChange={(e) =>
                                      updateCelestial(
                                        "birthLocation",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="City, country"
                                    className="w-full bg-transparent border-b border-nous-border py-2 font-serif italic text-sm focus:outline-none focus:border-nous-text"
                                  />
                                </div>
                              </div>
                            </FieldGroup>

                            <FieldGroup
                              label="Astrological Lineage"
                              description="Houses, aspects, or personal myth that should tint the reading."
                            >
                              <textarea
                                value={
                                  draft.celestialCalibration
                                    ?.astrologicalLineage || ""
                                }
                                onChange={(e) =>
                                  updateCelestial(
                                    "astrologicalLineage",
                                    e.target.value,
                                  )
                                }
                                rows={3}
                                placeholder="e.g. Venus in Scorpio, twelfth-house Moon…"
                                className="w-full bg-transparent border border-nous-border p-3 font-serif italic text-sm focus:outline-none focus:border-nous-text resize-none"
                              />
                            </FieldGroup>

                            <FieldGroup
                              label="Seasonal Alignment"
                              description="Preferred seasonal weather for this persona’s output."
                            >
                              <textarea
                                value={
                                  draft.celestialCalibration
                                    ?.seasonalAlignment || ""
                                }
                                onChange={(e) =>
                                  updateCelestial(
                                    "seasonalAlignment",
                                    e.target.value,
                                  )
                                }
                                rows={2}
                                placeholder="e.g. Late autumn, pre-dawn, frost on glass…"
                                className="w-full bg-transparent border border-nous-border p-3 font-serif italic text-sm focus:outline-none focus:border-nous-text resize-none"
                              />
                            </FieldGroup>
                          </>
                        )}

                        {activeStep === "settings" && (
                          <>
                            <p className="font-serif italic text-nous-subtle mb-8">
                              Configure profile identity, provider access, and
                              privacy controls. Runtime credentials are never
                              included in the exported creative profile.
                            </p>

                            <FieldGroup label="Profile Identity">
                              <div className="space-y-6">
                                <div className="space-y-2">
                                  <label className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle font-black">
                                    Display Name
                                  </label>
                                  <input
                                    value={personaName}
                                    onChange={(e) =>
                                      setPersonaName(e.target.value)
                                    }
                                    placeholder="e.g. The Architect"
                                    className="w-full bg-transparent border-b border-nous-border py-2 font-serif italic text-2xl focus:outline-none focus:border-nous-border dark:focus:border-nous-border transition-colors"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle font-black">
                                    Dedicated API Key (Optional)
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="password"
                                      value={personaKey}
                                      onChange={(e) =>
                                        setPersonaKey(e.target.value)
                                      }
                                      placeholder="sk-..."
                                      className="w-full bg-transparent border-b border-nous-border py-2 font-mono text-sm focus:outline-none focus:border-nous-border dark:focus:border-nous-border transition-colors pr-10"
                                    />
                                    <Key
                                      size={14}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-nous-subtle"
                                    />
                                  </div>
                                  <p className="font-sans text-[8px] text-nous-subtle italic">
                                    If provided, this profile will use its own
                                    billing and rate limits.
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <label className="font-sans text-[7px] uppercase tracking-widest text-nous-subtle font-black">
                                    AI Signature
                                  </label>
                                  <div className="flex gap-2 items-center">
                                    <input
                                      value={aiSignature}
                                      readOnly
                                      placeholder="Generate a signature..."
                                      className="flex-1 bg-nous-base border border-nous-border py-2 px-3 font-mono text-xs text-nous-subtle rounded-none focus:outline-none"
                                    />
                                    <button
                                      onClick={generateAiSignature}
                                      disabled={isGeneratingSignature}
                                      className="px-4 py-2 bg-nous-base text-nous-subtle rounded-none font-sans text-[8px] uppercase tracking-widest font-black hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors flex items-center gap-2"
                                    >
                                      {isGeneratingSignature ? (
                                        <Loader2
                                          size={10}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <Sparkles size={10} />
                                      )}
                                      Generate
                                    </button>
                                  </div>
                                  <p className="font-sans text-[8px] text-nous-subtle italic">
                                    A cryptographic-style identifier generated
                                    from this profile's aesthetic core.
                                  </p>
                                </div>
                                <button
                                  onClick={handleUpdatePersonaSettings}
                                  disabled={isSaving || !personaName.trim()}
                                  className="px-6 py-2 bg-nous-text text-nous-base rounded-none font-sans text-[9px] uppercase tracking-widest font-black hover: active:scale-95 transition-all flex items-center gap-2"
                                >
                                  {isSaving ? (
                                    <Loader2
                                      size={12}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Save size={12} />
                                  )}
                                  Update Protocols
                                </button>

                                <div className="pt-8 border-t border-nous-border">
                                  <button
                                    onClick={async () => {
                                      try {
                                        if (personas.length <= 1) {
                                          window.dispatchEvent(
                                            new CustomEvent(
                                              "mimi:registry_alert",
                                              {
                                                detail: {
                                                  message:
                                                    "Cannot delete the final profile.",
                                                  type: "error",
                                                },
                                              },
                                            ),
                                          );
                                          return;
                                        }
                                        if (
                                          window.confirm(
                                            "Delete this profile? This action is irreversible and removes its associated drafts and evidence links.",
                                          )
                                        ) {
                                          if (activePersonaId) {
                                            await deletePersona(
                                              activePersonaId,
                                            );
                                            window.dispatchEvent(
                                              new CustomEvent(
                                                "mimi:registry_alert",
                                                {
                                                  detail: {
                                                    message: "Profile deleted.",
                                                    icon: <Trash2 size={14} />,
                                                  },
                                                },
                                              ),
                                            );
                                            setViewMode("blueprint");
                                          }
                                        }
                                      } catch (error) {
                                        console.error(
                                          "MIMI // Failed to delete profile:",
                                          error,
                                        );
                                        window.dispatchEvent(
                                          new CustomEvent(
                                            "mimi:registry_alert",
                                            {
                                              detail: {
                                                message: "Failed to delete profile.",
                                                type: "error",
                                              },
                                            },
                                          ),
                                        );
                                      }
                                    }}
                                    disabled={personas.length <= 1}
                                    className={`px-6 py-2 bg-transparent border rounded-none font-sans text-[9px] uppercase tracking-widest font-black transition-all flex items-center gap-2 ${personas.length <= 1 ? "text-nous-subtle border-nous-border cursor-not-allowed opacity-50" : "text-red-500 border-red-500 hover:bg-red-500 hover:text-nous-text"}`}
                                  >
                                    <Trash2 size={12} />
                                    Delete Profile
                                  </button>
                                </div>
                              </div>
                            </FieldGroup>

                            <FieldGroup
                              label={
                                <GlossaryTooltip
                                  term="Algo Firewall"
                                  poeticMeaning="The gatekeepers of the generative mind."
                                  functionalMeaning="Enable or disable specific AI capabilities and tools for this persona."
                                >
                                  <span>Algo Firewall</span>
                                </GlossaryTooltip>
                              }
                              description="Arm or disarm specific algorithmic functions for this profile."
                            >
                              <div className="space-y-4">
                                {[
                                  {
                                    id: "zine_gen",
                                    name: "Zine Synthesis",
                                    desc: "The core engine for translating shards into editorial zines.",
                                  },
                                  {
                                    id: "scribe_reading",
                                    name: "Scribe Reading",
                                    desc: "Oracular readings based on profile and context.",
                                  },
                                  {
                                    id: "web_scry",
                                    name: "Web Scry",
                                    desc: "Grounding search results in real-world web signals.",
                                  },
                                  {
                                    id: "visual_plates",
                                    name: "Visual Plates",
                                    desc: "Generative image synthesis for editorial spreads.",
                                  },
                                  {
                                    id: "vocal_note",
                                    name: "Vocal Note",
                                    desc: "Voice-to-text and synthesis for vocal transmissions.",
                                  },
                                ].map((algo) => {
                                  const isEnabled = enabledAlgos.includes(
                                    algo.id,
                                  );
                                  return (
                                    <div
                                      key={algo.id}
                                      className="flex items-center justify-between p-4 border border-nous-border rounded-none bg-nous-base/50 group hover:border-nous-border transition-all"
                                    >
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`font-sans text-[9px] uppercase tracking-widest font-black ${isEnabled ? "text-nous-text " : "text-nous-subtle"}`}
                                          >
                                            {algo.name}
                                          </span>
                                          {isEnabled && (
                                            <ShieldCheck
                                              size={10}
                                              className="text-nous-text"
                                            />
                                          )}
                                        </div>
                                        <p className="font-serif italic text-xs text-nous-subtle">
                                          {algo.desc}
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => toggleAlgo(algo.id)}
                                        className={`p-2 rounded-none transition-all ${isEnabled ? "bg-nous-text text-nous-base shadow-stone-900/20 dark:shadow-stone-100/20" : "bg-stone-200 text-nous-subtle hover:text-nous-subtle"}`}
                                      >
                                        {isEnabled ? (
                                          <Zap size={16} />
                                        ) : (
                                          <Wind size={16} />
                                        )}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </FieldGroup>

                            <FieldGroup
                              label={
                                <GlossaryTooltip
                                  term="Algorithmic Dials"
                                  poeticMeaning="The tuning knobs of the machine's soul."
                                  functionalMeaning="Adjust the core parameters that influence the AI's generation logic and behavior."
                                >
                                  <span>Algorithmic Dials</span>
                                </GlossaryTooltip>
                              }
                              description="Fine-tune the cognitive behavior of the generative models."
                            >
                              <div className="space-y-6">
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <GlossaryTooltip
                                      term="Web Scry Intensity"
                                      poeticMeaning="The degree to which the machine gazes into the current world."
                                      functionalMeaning="Controls how much real-time web search data influences the generated output."
                                    >
                                      <span className="font-sans text-[10px] uppercase tracking-widest font-bold">
                                        Web Scry Intensity
                                      </span>
                                    </GlossaryTooltip>
                                    <span className="font-mono text-xs text-nous-text">
                                      {draft.algoDials?.webScry || 50}%
                                    </span>
                                  </div>
                                  <p className="font-serif italic text-xs text-nous-subtle mb-4">
                                    0% = Pure internal Tailor logic. 100% =
                                    Heavily grounded in current events and
                                    search data.
                                  </p>
                                  <SemanticSteps
                                    steps={[
                                      { label: "INTERNAL", value: 0 },
                                      { label: "CONTEXTUAL", value: 33 },
                                      { label: "GROUNDED", value: 66 },
                                      { label: "EXTERNAL", value: 100 },
                                    ]}
                                    value={draft.algoDials?.webScry || 50}
                                    onChange={(val) =>
                                      updateDraft({
                                        algoDials: {
                                          ...(draft.algoDials || {
                                            webScry: 50,
                                            memorySynthesis: 50,
                                            dissonance: 10,
                                          }),
                                          webScry: val,
                                        },
                                      })
                                    }
                                  />
                                </div>

                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <GlossaryTooltip
                                      term="Memory Synthesis"
                                      poeticMeaning="The weight of your past artifacts shaping the present."
                                      functionalMeaning="Controls how much your previously saved zines and thoughts influence the current generation."
                                    >
                                      <span className="font-sans text-[10px] uppercase tracking-widest font-bold">
                                        Memory Synthesis
                                      </span>
                                    </GlossaryTooltip>
                                    <span className="font-mono text-xs text-nous-text">
                                      {draft.algoDials?.memorySynthesis || 50}%
                                    </span>
                                  </div>
                                  <p className="font-serif italic text-xs text-nous-subtle mb-4">
                                    0% = Isolated artifacts. 100% = Deeply
                                    contextualized by past zines and thoughts.
                                  </p>
                                  <SemanticSteps
                                    steps={[
                                      { label: "ISOLATED", value: 0 },
                                      { label: "REFERENTIAL", value: 33 },
                                      { label: "ARCHIVAL", value: 66 },
                                      { label: "CONTEXTUAL", value: 100 },
                                    ]}
                                    value={
                                      draft.algoDials?.memorySynthesis || 50
                                    }
                                    onChange={(val) =>
                                      updateDraft({
                                        algoDials: {
                                          ...(draft.algoDials || {
                                            webScry: 50,
                                            memorySynthesis: 50,
                                            dissonance: 10,
                                          }),
                                          memorySynthesis: val,
                                        },
                                      })
                                    }
                                  />
                                </div>

                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <GlossaryTooltip
                                      term="Dissonance Engine"
                                      poeticMeaning="The deliberate injection of chaos to break the mold."
                                      functionalMeaning="A dial that controls how much opposing aesthetic concepts are introduced to force creative breakthroughs."
                                    >
                                      <span className="font-sans text-[10px] uppercase tracking-widest font-bold text-rose-500">
                                        Dissonance Engine
                                      </span>
                                    </GlossaryTooltip>
                                    <span className="font-mono text-xs text-rose-500">
                                      {draft.algoDials?.dissonance || 10}%
                                    </span>
                                  </div>
                                  <p className="font-serif italic text-xs text-nous-subtle mb-4">
                                    Intended for creative exploration. Injects
                                    opposing aesthetic concepts to force
                                    breakthroughs and mutate safe choices. High
                                    dissonance may cause chaotic, unpredictable
                                    results.
                                  </p>
                                  <SemanticSteps
                                    steps={[
                                      { label: "HARMONY", value: 0 },
                                      { label: "TEXTURED", value: 33 },
                                      { label: "CHALLENGING", value: 66 },
                                      { label: "CHAOS", value: 100 },
                                    ]}
                                    value={draft.algoDials?.dissonance || 10}
                                    onChange={(val) =>
                                      updateDraft({
                                        algoDials: {
                                          ...(draft.algoDials || {
                                            webScry: 50,
                                            memorySynthesis: 50,
                                            dissonance: 10,
                                            binaryToSpectrum: 50,
                                          }),
                                          dissonance: val,
                                        },
                                      })
                                    }
                                  />
                                </div>

                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <GlossaryTooltip
                                      term="Binary-to-Spectrum Dial"
                                      poeticMeaning="The dissolution of borders between fixed identities."
                                      functionalMeaning="A dial that controls the fluidity of aesthetic categories, moving from strict binaries to a continuous spectrum."
                                    >
                                      <span className="font-sans text-[10px] uppercase tracking-widest font-bold text-indigo-500">
                                        Binary-to-Spectrum Dial
                                      </span>
                                    </GlossaryTooltip>
                                    <span className="font-mono text-xs text-indigo-500">
                                      {draft.algoDials?.binaryToSpectrum || 50}%
                                    </span>
                                  </div>
                                  <p className="font-serif italic text-xs text-nous-subtle mb-4">
                                    0% = Strict adherence to binary categories
                                    (e.g., hyper-masculine/feminine). 100% =
                                    Fluid, post-binary aesthetic synthesis.
                                  </p>
                                  <SemanticSteps
                                    steps={[
                                      { label: "BINARY", value: 0 },
                                      { label: "ANDROGYNOUS", value: 33 },
                                      { label: "FLUID", value: 66 },
                                      { label: "SPECTRUM", value: 100 },
                                    ]}
                                    value={
                                      draft.algoDials?.binaryToSpectrum || 50
                                    }
                                    onChange={(val) =>
                                      updateDraft({
                                        algoDials: {
                                          ...(draft.algoDials || {
                                            webScry: 50,
                                            memorySynthesis: 50,
                                            dissonance: 10,
                                            binaryToSpectrum: 50,
                                          }),
                                          binaryToSpectrum: val,
                                        },
                                      })
                                    }
                                  />
                                </div>
                              </div>
                            </FieldGroup>
                          </>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT COL: PERSISTENT AESTHETIC ANALYSIS */}
          <div className="xl:col-span-4 space-y-8">
            <div className="space-y-8">
              {/* Aesthetic Preview */}
              <div className="space-y-3">
                {/* Inside the RIGHT COL: THE AUDIT (Replacing the top Aesthetic Preview header) */}
                <div className="flex items-center justify-between border-b border-dashed border-nous-border pb-2">
                  <span className="font-sans text-[7px] uppercase tracking-[0.3em] font-black text-nous-subtle">
                    Aesthetic Analysis
                  </span>
                  <button
                    onClick={handleScryDirectives}
                    disabled={isAuditing}
                    className="font-sans text-[7px] uppercase tracking-widest text-nous-text hover:text-nous-subtle flex items-center gap-1 transition-colors"
                  >
                    {isAuditing ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <Radar size={10} />
                    )}
                    Auto-Scry Directives
                  </button>
                </div>
                {draft && activePersonaId && (
                  <TailorPreview
                    draft={draft}
                    activePersonaId={activePersonaId}
                    apiKey={
                      resolveApiKey(
                        "gemini",
                        activePersona?.apiKey,
                        profile?.planStatus,
                      ).key || undefined
                    }
                  />
                )}
                <p className="font-serif italic text-[10px] text-nous-subtle leading-tight">
                  Real-time synthesis of your current aesthetic DNA.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-nous-text">
                  <Target size={18} className="animate-pulse" />
                  <span className="font-sans text-[9px] uppercase tracking-[0.4em] font-black italic">
                    Alignment Protocol
                  </span>
                  {draft.draftStatus === "provisional" && (
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-none font-mono text-[8px] uppercase tracking-widest ml-auto">
                      Unaligned
                    </span>
                  )}
                </div>
                <p className="font-serif italic text-xs text-nous-subtle leading-relaxed">
                  Changes are local until aligned. Committing writes this logic
                  to your active profile.
                </p>
              </div>
            </div>

            <div className="space-y-4 mt-12">
              <button
                onClick={() => setShowLogicReport(true)}
                className="w-full py-4 bg-transparent border border-nous-border text-nous-text hover:bg-nous-text/10 rounded-none font-sans text-[9px] uppercase tracking-[0.4em] font-black active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <Zap size={12} className="text-nous-subtle" /> View Mimi Logic
                Report
              </button>
              <button
                onClick={handleAlign}
                disabled={isSaving}
                className="w-full py-4 bg-nous-text text-nous-base rounded-none font-sans text-[9px] uppercase tracking-[0.4em] font-black active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {isSaving ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Check size={12} />
                )}{" "}
                Align Logic
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showLogicReport && draft && (
          <TailorLogicReport
            draft={draft}
            personaName={activePersona?.name}
            onClose={() => setShowLogicReport(false)}
          />
        )}
        {showAuditOverlay && auditReport && (
          <TailorAuditOverlay
            auditReport={auditReport}
            onClose={() => setShowAuditOverlay(false)}
            onApplyToGeneration={(text) => {
              window.dispatchEvent(
                new CustomEvent("mimi:change_view", {
                  detail: "studio",
                  detail_data: {
                    context: `[AUDIT MANIFESTO APPLIED]\n\n${text}\n\nGenerate based on this logic.`,
                  },
                }),
              );
            }}
          />
        )}
      </AnimatePresence>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleShardUpload}
        className="hidden"
        multiple
        accept="image/*"
      />
    </div>
  );
};
