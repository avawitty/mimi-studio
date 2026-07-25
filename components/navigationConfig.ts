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
    section: "Collect",
    items: [
      {
        mode: "scribe",
        label: "Scribe",
        note: "project context and atoms",
        keywords: ["memory", "project", "atoms", "cite", "save", "persistence", "research", "knowledge", "scribe", "semantic portal"],
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
        keywords: ["exhibit", "stand", "show", "display", "zines", "archive", "shards", "registry", "pocket"],
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
        keywords: ["news", "culture", "edit", "press", "intelligence", "curation", "the edit"],
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
      }
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
        mode: "proscenium",
        label: "Proscenium",
        note: "public stage/feed",
        keywords: ["theatre", "curtain", "social", "public", "connections", "proscenium", "feed"],
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
        keywords: ["pricing", "upgrade", "pro", "lab", "tier", "subscription", "membership"],
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
        mode: "threads",
        label: "Threads",
        note: "semantic/narrative mapping",
        keywords: ["threads", "semantic", "ideas", "intelligence", "narrative", "mapping"],
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
        mode: "codex",
        label: "System",
        note: "codex, architecture, diagnostics",
        keywords: ["rules", "instructions", "system", "codex", "code", "architecture", "diagnostics"],
      },
      {
        mode: "chamber-map",
        label: "Chamber Map",
        note: "canonical module registry",
        keywords: ["chamber", "map", "registry", "canon", "modules", "routes", "milestone"],
      }
    ]
  }
];
