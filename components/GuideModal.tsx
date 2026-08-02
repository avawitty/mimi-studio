import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Search, 
  BookOpen, 
  HelpCircle, 
  Terminal
} from "lucide-react";

interface GuideItem {
  id: string;
  title: string;
  category: "chambers" | "input-studio";
  description: string;
  details: string[];
  keywords: string[];
}

/**
 * Application Guide index — mirrors `MENU_STRUCTURE` in navigationConfig.ts.
 * One entry per menu section (not per chamber), so wings/aliases are not
 * re-listed as separate chambers (Proscenium wings, Threads→Scribe, etc.).
 */
const GUIDE_DATA: GuideItem[] = [
  {
    id: "chambers-collect",
    title: "Collect: Scry · Scribe · Darkroom",
    category: "chambers",
    description: "Bring source material in: search, memory atoms, and raw media.",
    details: [
      "Scry: Search tags, embeddings, and the web for specimens and drift signals.",
      "Scribe: Project context and memory atoms — including narrative Threads as a tab, not a separate chamber.",
      "Darkroom: Staging for uploads, file fragments, and unprocessed media."
    ],
    keywords: ["scry", "scribe", "darkroom", "collect", "atoms", "uploads", "threads", "research"]
  },
  {
    id: "chambers-organize",
    title: "Organize: Pocket · Wardrobe",
    category: "chambers",
    description: "Catalog saved zines, context, and style references for later handoff.",
    details: [
      "Pocket: Registry of saved zines, audits, and compiled context.",
      "Wardrobe: Saved looks and style references drawn from active work.",
      "Handoff: Pocket items feed Create and Edit chambers — not a public showcase (that is The Stand)."
    ],
    keywords: ["pocket", "wardrobe", "organize", "saved", "archive", "registry", "looks"]
  },
  {
    id: "chambers-edit",
    title: "Edit: The Edit",
    category: "chambers",
    description: "Editorial compile and diagnose — thesis, fragments, and layout alignment.",
    details: [
      "Compile: Assemble thesis, opening remarks, and featured narratives.",
      "Diagnose: Review text blocks and visual curation before export.",
      "Handoff: Push a finished compile toward The Press — export lives there, not here."
    ],
    keywords: ["edit", "the edit", "editorial", "compile", "diagnose", "thesis"]
  },
  {
    id: "chambers-create",
    title: "Create: Worktable · Briefs · Mood Board · Tailor",
    category: "chambers",
    description: "Make artifacts: zines, presets, visual boards, and taste constraints.",
    details: [
      "Worktable: Primary studio for zine structures, covers, and prompt generation.",
      "Brief Calibration & Quiet Studio: Reusable presets and a non-dialogic worktable variant — not separate product lines.",
      "Mood Board: Spatial canvas for visual stories; Tailor locks profile, evidence, and style diagnostics."
    ],
    keywords: ["worktable", "studio", "brief", "quiet studio", "moodboard", "tailor", "create", "zine"]
  },
  {
    id: "chambers-publish",
    title: "Publish: Press · Front Page · Stand",
    category: "chambers",
    description: "Export, editorial surface, and your published showcase.",
    details: [
      "The Press: Export packs, manifests, and publishing outputs.",
      "Front Page: Editorial homepage for the house.",
      "The Stand: Your published zine showcase — distinct from Pocket (private registry)."
    ],
    keywords: ["press", "export", "front page", "stand", "publish", "showcase"]
  },
  {
    id: "chambers-identity",
    title: "Identity: Signature · Taste Graph · Dolls · Rip",
    category: "chambers",
    description: "Public and private taste identity — under All Chambers, not the core loop.",
    details: [
      "Signature & Taste Graph: Taste summary, stats, clusters, and map.",
      "Mimi Dolls & mimi.rip: Editorial identity archive and inverse / dark-mirror reading.",
      "Profile · Ward · Sanctuary: Account face, IP custody, and local-only vault."
    ],
    keywords: ["signature", "taste graph", "dolls", "mimi.rip", "profile", "ward", "sanctuary", "identity"]
  },
  {
    id: "chambers-proscenium",
    title: "Social: The Proscenium",
    category: "chambers",
    description: "One social chamber — Stage, Correspondents, and Cliques are wings, not menu siblings.",
    details: [
      "Stage: Witness transmissions; resonate, absorb, or refract with lineage.",
      "Correspondents & Cliques: Opens as Proscenium wings (legacy /connections and /cliques redirect here).",
      "Do not look for separate Correspondents or Cliques chambers in the menu."
    ],
    keywords: [
      "proscenium",
      "stage",
      "correspondents",
      "cliques",
      "social",
      "follow",
      "connections"
    ]
  },
  {
    id: "chambers-house",
    title: "House tools: Atelier · Residue · Observatory · Intel · GEO · System",
    category: "chambers",
    description: "Strategy, commerce signals, residue maps, collective readout, and system docs — listed once under All Chambers.",
    details: [
      "Atelier: Taste-signal objects pinned from zines (not Memberships / plan tiers).",
      "Residue: Cultural / emotional residue maps with per-run M/M/M and proposed product handoffs (not diagnosis).",
      "The Observatory · Mean Median Mode: Consent-gated collective central tendency (not Residue’s per-run tab).",
      "Intel Hub · Intelligence Report · GEO Engine: Strategy and AI-readable signal packaging.",
      "System (Codex) · Chamber Map · The Voice: Architecture manual, registry inspector, brand-voice dossier."
    ],
    keywords: [
      "atelier",
      "residue",
      "cultural residue",
      "emotional residue",
      "mmm",
      "observatory",
      "mean median mode",
      "collective",
      "intel",
      "geo",
      "codex",
      "system",
      "chamber map",
      "voice",
      "oracle",
      "thimble",
      "drop",
      "memberships"
    ]
  },
  {
    id: "studio-ingestion",
    title: "Input Studio: Media & dictation",
    category: "input-studio",
    description: "In-Worktable intake — complements Darkroom/Scribe; does not replace those chambers.",
    details: [
      "Media drop: Reference images onto the active worktable for analysis and tagging.",
      "Dictation: Speech-to-text into notes that can stitch into boards or strategy.",
      "Persistence: Long-term storage still belongs in Darkroom (raw) and Scribe/Pocket (atoms/registry)."
    ],
    keywords: ["media", "ingestion", "upload", "dictation", "voice", "worktable", "input studio"]
  },
  {
    id: "studio-orchestration",
    title: "Input Studio: Prompt & grounding",
    category: "input-studio",
    description: "Reasoning depth and live grounding for Worktable prompts.",
    details: [
      "Thinking modes: Toggle lightweight speed vs deeper multi-step reasoning.",
      "Grounding: Optional search and place context when the brief needs live signal.",
      "Task shaping: Turn messy briefs into structured worktable instruction packets."
    ],
    keywords: ["ai", "prompt", "grounding", "search", "thinking", "worktable", "orchestration"]
  }
];

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "chambers" | "input-studio">("all");

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setActiveCategory("all");
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const filteredItems = useMemo(() => {
    return GUIDE_DATA.filter((item) => {
      // Category filter
      if (activeCategory !== "all" && item.category !== activeCategory) {
        return false;
      }

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchKeywords = item.keywords.some(k => k.toLowerCase().includes(q));
      const matchDetails = item.details.some(d => d.toLowerCase().includes(q));

      return matchTitle || matchDesc || matchKeywords || matchDetails;
    });
  }, [searchQuery, activeCategory]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-6 select-none pointer-events-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.75 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="bg-[#121110] border border-stone-800 text-stone-200 w-full max-w-3xl h-[85vh] max-h-[750px] flex flex-col relative overflow-hidden shadow-2xl"
          >
            {/* Header aesthetic bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500/70 via-stone-500/30 to-transparent opacity-60" />

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 w-8 h-8 rounded-full border border-stone-800 hover:border-stone-700 flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-900/50 transition-all cursor-pointer"
              title="Close Guide"
            >
              <X size={14} />
            </button>

            {/* Header Content */}
            <div className="px-6 md:px-8 pt-7 pb-5 border-b border-stone-800/80 bg-[#161514]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-5 h-5 flex items-center justify-center border border-amber-500/40 bg-amber-500/5">
                  <BookOpen size={11} className="text-amber-500" />
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.4em] font-extrabold text-amber-500/90">
                  PLATFORM COMPASS
                </span>
              </div>
              <h2 className="font-serif italic text-3xl text-stone-100 tracking-tight leading-none mb-2">
                Application Guide.
              </h2>
              <p className="font-sans text-[11px] text-stone-400 leading-relaxed max-w-xl">
                Menu-aligned index of <strong>Chambers</strong> (by section) and Worktable{" "}
                <strong>Input Studio</strong>. Wings and route aliases are not listed twice.
              </p>
            </div>

            {/* Filter and Search Bar Row */}
            <div className="px-6 md:px-8 py-4 border-b border-stone-800/50 bg-[#141312] flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
              {/* Category Buttons */}
              <div className="flex items-center border border-stone-800/80 p-1 bg-stone-950/40 rounded-none w-fit self-start">
                <button
                  type="button"
                  onClick={() => setActiveCategory("all")}
                  className={`px-3 py-1.5 font-mono text-[8px] uppercase tracking-widest font-extrabold transition-all cursor-pointer ${
                    activeCategory === "all"
                      ? "bg-stone-800 text-stone-100 border border-stone-700/60 shadow-sm"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  All Index
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory("chambers")}
                  className={`px-3 py-1.5 font-mono text-[8px] uppercase tracking-widest font-extrabold transition-all cursor-pointer ${
                    activeCategory === "chambers"
                      ? "bg-stone-800 text-stone-100 border border-stone-700/60 shadow-sm"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  Chambers
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory("input-studio")}
                  className={`px-3 py-1.5 font-mono text-[8px] uppercase tracking-widest font-extrabold transition-all cursor-pointer ${
                    activeCategory === "input-studio"
                      ? "bg-stone-800 text-stone-100 border border-stone-700/60 shadow-sm"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  Input Studio
                </button>
              </div>

              {/* Dynamic Search Box */}
              <div className="relative flex-1 max-w-sm md:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500" />
                <input
                  type="text"
                  placeholder="SEARCH GUIDE INDEX..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-stone-950/50 border border-stone-800/80 text-stone-200 text-[9px] uppercase tracking-widest py-2.5 pl-9 pr-4 focus:outline-none focus:border-stone-700 focus:bg-stone-950 transition-all placeholder:text-stone-500 font-mono font-bold"
                />
              </div>
            </div>

            {/* Scrollable Results Pane */}
            <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6 space-y-6 scrollbar-thin scrollbar-thumb-stone-800 scrollbar-track-transparent">
              {filteredItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout="position"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="p-5 border border-stone-850 bg-stone-950/30 hover:bg-stone-950/50 hover:border-stone-800 transition-all group"
                >
                  <div className="flex items-center justify-between gap-4 border-b border-stone-900/60 pb-3 mb-4 select-none">
                    <div className="flex items-center gap-3">
                      <div className="text-[10px] uppercase font-mono font-black text-amber-500/80 tracking-widest px-2 py-0.5 border border-amber-500/20 bg-amber-500/5">
                        {item.category === "chambers" ? "Chambers Portal" : "Input Studio"}
                      </div>
                      <h3 className="font-serif italic text-xl text-stone-200 group-hover:text-stone-100 transition-colors">
                        {item.title}
                      </h3>
                    </div>
                    <span className="font-mono text-[7px] tracking-widest text-stone-600 uppercase font-bold group-hover:text-stone-500">
                      ID: {item.id}
                    </span>
                  </div>

                  <p className="font-sans text-xs text-stone-300 leading-relaxed mb-4">
                    {item.description}
                  </p>

                  {/* Bullet Highlights */}
                  <div className="space-y-2 pl-1.5 border-l-2 border-stone-850 group-hover:border-stone-700 transition-colors">
                    {item.details.map((detail, index) => {
                      const [prefix, rest] = detail.split(":");
                      return (
                        <div key={index} className="flex items-start gap-2 text-stone-400">
                          <span className="text-amber-500/60 text-[10px] mt-0.5">✦</span>
                          <span className="font-sans text-[11px] leading-relaxed">
                            {rest ? (
                              <>
                                <strong className="text-stone-300 font-mono text-[10px] tracking-wider uppercase font-extrabold mr-1">{prefix}:</strong>
                                {rest}
                              </>
                            ) : (
                              detail
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Keywords Tag Pill */}
                  <div className="mt-4 flex flex-wrap gap-1.5 pt-3 border-t border-stone-900/40 select-none">
                    {item.keywords.map((kw) => (
                      <span
                        key={kw}
                        onClick={() => setSearchQuery(kw)}
                        className="font-mono text-[7.5px] uppercase tracking-wider px-2 py-0.5 border border-stone-900 bg-stone-950/80 text-stone-500 hover:text-amber-400 hover:border-amber-500/30 cursor-pointer transition-colors"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}

              {filteredItems.length === 0 && (
                <div className="py-16 text-center select-none border border-dashed border-stone-850 bg-stone-950/10">
                  <HelpCircle size={32} className="mx-auto text-stone-600 mb-3 animate-pulse" />
                  <p className="font-serif italic text-lg text-stone-400 mb-1">
                    No matching coordinates found.
                  </p>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-stone-500 font-extrabold">
                    Try Scribe, Worktable, Proscenium, Press, or Tailor
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 md:px-8 py-4 border-t border-stone-850 bg-[#161514] flex items-center justify-between select-none">
              <div className="flex items-center gap-1.5 text-stone-500 font-mono text-[7px] uppercase tracking-[0.2em] font-extrabold">
                <Terminal size={10} />
                <span>INDEX VERSION 2.5.0 — MENU-ALIGNED</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-stone-850 hover:bg-stone-800 text-stone-200 hover:text-white border border-stone-700/50 font-mono text-[8px] uppercase tracking-widest font-extrabold transition-all cursor-pointer shadow-sm"
              >
                Dismiss Guide
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
