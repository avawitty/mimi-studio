import { 
  Plus, 
  Layers, 
  FolderOpen, 
  Scissors, 
  Shirt, 
  User, 
  Award, 
  Workflow, 
  SlidersHorizontal, 
  Book, 
  Compass, 
  Share2, 
  Edit3, 
  Sparkles, 
  ShieldCheck, 
  HelpCircle, 
  Archive, 
  Network, 
  Compass as GeoIcon, 
  Activity, 
  Terminal 
} from 'lucide-react';
import React from 'react';

export interface NavigationItem {
  mode: string;
  label: string;
  note: string;
  icon?: any;
  keywords: string[];
}

export interface NavigationSection {
  section: string;
  items: NavigationItem[];
}

export const MENU_STRUCTURE: NavigationSection[] = [
  {
    section: "Orient",
    items: [
      {
        mode: "chamber-map",
        label: "Studio Map",
        note: "see your phase, dossier, and next step",
        keywords: ["map", "orientation", "desk", "phase", "dossier", "workflow", "where am i"],
      },
    ],
  },
  {
    section: "Collect",
    items: [
      {
        mode: "scry",
        label: "Scry",
        note: "search tags, embeddings, and the web",
        keywords: ["scry", "search", "find", "specimen", "lookup", "query", "web", "grounding", "embedding", "vector", "semantic", "tags", "shadow memory", "trend", "discover"],
      },
      {
        mode: "scribe",
        label: "Scribe",
        note: "project context and atoms",
        keywords: ["memory", "project", "atoms", "cite", "save", "persistence", "research", "knowledge", "scribe", "semantic portal", "threads", "narrative"],
      },
      {
        mode: "darkroom",
        label: "Darkroom",
        note: "uploaded files and raw media",
        keywords: ["media", "uploads", "assets", "unprocessed", "fragments", "stash", "darkroom", "files"],
      },
    ]
  },
  {
    section: "Organize",
    items: [
      {
        mode: "pocket",
        label: "Pocket",
        note: "registry and saved context",
        keywords: ["exhibit", "show", "display", "zines", "archive", "shards", "registry", "pocket", "saved"],
      },
      {
        mode: "wardrobe",
        label: "Wardrobe",
        note: "saved looks and style references",
        keywords: ["wardrobe", "saved", "looks", "outfits", "style references"],
      }
    ]
  },
  {
    section: "Edit",
    items: [
      {
        mode: "the-edit",
        label: "The Edit",
        note: "editorial compile and diagnose",
        keywords: ["news", "culture", "edit", "intelligence", "curation", "the edit", "compile", "diagnose"],
      }
    ]
  },
  {
    section: "Create",
    items: [
      {
        mode: "studio",
        label: "Worktable",
        note: "create zines and prompts",
        keywords: ["create", "generate", "zines", "new", "edit", "draft", "design", "worktable"],
      },
      {
        mode: "briefs",
        label: "Brief Calibration",
        note: "reusable worktable presets",
        keywords: ["brief", "preset", "calibration", "instructions", "workflow", "gateway", "worktable"],
      },
      {
        mode: "quiet-studio",
        label: "Quiet Studio",
        note: "non-dialogic worktable",
        keywords: ["quiet", "studio", "non-dialogic", "direct", "governance", "direction", "image brief", "decisions", "seal"],
      },
      {
        mode: "moodboard",
        label: "Mood Board",
        note: "moodboard and visual workspace",
        keywords: ["moodboard", "canvas", "board", "visual", "infinite", "workspace", "dossier"],
      },
      {
        mode: "tailor",
        label: "Tailor",
        note: "profile, evidence, style lab, diagnostics",
        keywords: ["tailor", "brand", "style", "physics", "aesthetic", "voice", "references", "art-style", "scryer", "patterns", "diagnostics", "telemetry", "chromatics"],
      },
      {
        mode: "celestial-calibration",
        label: "Celestial Calibration",
        note: "tropical sun + seasonal timing for Tailor",
        keywords: [
          "celestial",
          "calibration",
          "zodiac",
          "natal",
          "birth chart",
          "sun sign",
          "astrology",
          "season",
          "timing",
          "birth date",
        ],
      },
    ]
  },
  {
    section: "Publish",
    items: [
      {
        mode: "the-press",
        label: "The Press",
        note: "export and publishing",
        keywords: ["export", "publish", "pdf", "share", "manifest", "press", "portfolio", "shopify"],
      },
      {
        mode: "editorial-home",
        label: "Front Page",
        note: "editorial homepage",
        keywords: ["publisher", "note", "editorial", "home", "essays", "briefings", "front page"],
      },
      {
        mode: "stand",
        label: "The Stand",
        note: "your published zines showcase",
        keywords: ["stand", "showcase", "issues", "covers", "profile", "shelf", "archive", "published"],
      }
    ]
  },
  {
    section: "All Chambers",
    items: [
      {
        mode: "profile",
        label: "Profile",
        note: "public identity and account",
        keywords: ["profile", "persona", "face", "identity", "user", "account", "settings"],
      },
      {
        mode: "signature",
        label: "Signature",
        note: "taste summary and stats",
        keywords: ["signature", "archetypes", "assessment", "stats", "psychographics"],
      },
      {
        mode: "taste-graph",
        label: "Taste Graph",
        note: "taste map and clusters",
        keywords: ["scale", "graph", "connections", "network", "clusters", "taste", "audience"],
      },
      {
        mode: "ward",
        label: "Ward",
        note: "IP custody and provenance",
        keywords: ["ward", "ip", "custody", "copyright", "provenance", "specimen"],
      },
      {
        mode: "sanctuary",
        label: "Sanctuary",
        note: "local-only private vault",
        keywords: ["sanctuary", "local", "private", "vault", "sensitive"],
      },
      {
        mode: "mimi-dolls",
        label: "Mimi Dolls",
        note: "editorial identity and doll archive",
        keywords: ["mimi.you", "dolls", "doll", "universe", "field notes", "creative profile", "identity"],
      },
      {
        mode: "mimi-rip",
        label: "mimi.rip",
        note: "inverse taste / dark mirror reading",
        keywords: ["mimi.rip", "rip", "inverse", "dark mirror", "anti-motif", "blind spots", "shadow"],
      },
      {
        mode: "proscenium",
        label: "Proscenium",
        note: "stage, correspondents & cliques",
        keywords: [
          "theatre",
          "curtain",
          "social",
          "public",
          "connections",
          "proscenium",
          "feed",
          "friends",
          "follow",
          "add friends",
          "network",
          "people",
          "resonators",
          "cliques",
          "groups",
          "circles",
          "inner circle",
          "correspondents",
          "stage",
        ],
      },
      {
        mode: "private-studio",
        label: "Private Studio",
        note: "services and portfolio proof",
        keywords: ["private studio", "services", "case study", "portfolio", "client"],
      },
      {
        mode: "mimi-drop",
        label: "Drop",
        note: "product/checkout",
        keywords: ["drop", "checkout", "commerce", "sales", "altar", "buy", "product"],
      },
      {
        mode: "memberships",
        label: "Memberships",
        note: "plan/access",
        keywords: [
          "pricing",
          "upgrade",
          "pro",
          "lab",
          "tier",
          "subscription",
          "membership",
          "patronage",
          "initiation",
          "optioning",
          "maison",
          "plan",
          "access",
        ],
      },
      {
        mode: "oracle",
        label: "Oracle",
        note: "ask Mimi",
        keywords: ["chat", "ask", "ai", "interpret", "oracle", "advice", "guide"],
      },
      {
        mode: "thimble",
        label: "Thimble",
        note: "sourcing/procurement",
        keywords: ["shopping", "sourcing", "buy", "items", "clothes", "thimble", "procure"],
      },
      {
        mode: "atelier",
        label: "Atelier",
        note: "taste-signal objects from zines",
        keywords: [
          "atelier",
          "objects",
          "taste objects",
          "saved products",
          "semiotic",
          "touchpoints",
          "shopify",
          "desire",
          "pin",
        ],
      },
      {
        mode: "house",
        label: "The House",
        note: "four-floor editorial loop",
        keywords: [
          "house",
          "floors",
          "ingest",
          "curate",
          "plate",
          "penthouse",
          "ascension",
          "editorial house",
          "debris",
          "issue",
        ],
      },
      {
        mode: "geo_engine",
        label: "GEO Engine",
        note: "search/signal profile",
        keywords: ["geo", "engine", "signals", "optimization", "ai", "search", "signal profile"],
      },
      {
        mode: "intel-hub",
        label: "Intel Hub",
        note: "strategy hub",
        keywords: ["intel", "hub", "campaign", "strategy", "intel hub"],
      },
      {
        mode: "residue",
        label: "Residue",
        note: "per-run cultural / emotional residue + M/M/M",
        keywords: [
          "residue",
          "cultural residue",
          "emotional residue",
          "lineage",
          "neighborhoods",
          "mmm",
          "per-run mmm",
          "provenance",
          "non-diagnostic",
          "countersignal",
          "phenomenology",
        ],
      },
      {
        mode: "observatory",
        label: "The Observatory",
        note: "collective perception · Mean Median Mode",
        keywords: [
          "observatory",
          "collective",
          "collective intelligence",
          "mean median mode",
          "central tendency",
          "atmosphere",
          "mesopic",
          "mesopic lens",
          "starry-eyed",
          "shadow fields",
        ],
      },
      {
        mode: "mean-median-mode",
        label: "Mean Median Mode",
        note: "collective statistical readout",
        keywords: [
          "mean median mode",
          "mean",
          "median",
          "mode",
          "summation",
          "collective moods",
          "central tendency",
          "observatory",
          "mesopic lens",
        ],
      },
      {
        mode: "forecast",
        label: "Forecast",
        note: "aesthetic meteorology · personal & brand drift",
        keywords: [
          "forecast",
          "the forecast",
          "meteorology",
          "aesthetic meteorology",
          "drift",
          "trends",
          "cultural shifts",
          "content forecasting",
          "weather",
          "season",
        ],
      },
      {
        mode: "brand-intake",
        label: "Intelligence Report",
        note: "brand intelligence report with format selection",
        keywords: ["brand", "intake", "report", "intelligence", "mla", "apa", "chicago", "citation", "brand report", "mimi report", "aesthetic report", "strategy report"],
      },
      {
        mode: "codex",
        label: "System",
        note: "codex, architecture, diagnostics",
        keywords: ["rules", "instructions", "system", "codex", "code", "architecture", "diagnostics"],
      },
      {
        mode: "brand-voice",
        label: "The Voice",
        note: "brand voice dossier",
        keywords: ["voice", "brand voice", "tone", "editorial", "copy", "language", "persona", "style guide", "principles"],
      },
    ]
  }
];
