import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Search, 
  Compass, 
  Sparkles, 
  ChevronRight, 
  Terminal, 
  Info, 
  HelpCircle, 
  BookOpen, 
  HelpCircle as QuestionIcon,
  Workflow,
  Plus
} from "lucide-react";

interface GuideItem {
  id: string;
  title: string;
  category: "chambers" | "input-studio";
  description: string;
  details: string[];
  keywords: string[];
}

const GUIDE_DATA: GuideItem[] = [
  {
    id: "chambers-collect",
    title: "Collect: Scribe & Darkroom",
    category: "chambers",
    description: "Your starting chambers for gathering research context, raw assets, and vocal transcriptions.",
    details: [
      "Scribe Portal: Capture text snippets, notes, and strategic context to feed into workspace memory.",
      "Darkroom Ingestion: A temporary staging area for raw uploads, file fragments, and newly transcribed audios.",
      "Persistence: Elements collected here can be labeled, structured, and saved into your active dossiers."
    ],
    keywords: ["scribe", "darkroom", "collect", "gather", "uploads", "transcription", "audio", "text", "atoms", "research"]
  },
  {
    id: "chambers-organize",
    title: "Organize: Pocket & Wardrobe",
    category: "chambers",
    description: "Catalog and access your saved zines, visual looks, and compiled strategy profiles.",
    details: [
      "Pocket Registry: Access your saved zine creations, historical audits, and generated briefs in a unified registry.",
      "Wardrobe Archive: Browse saved outfits, brand identities, and style rules compiled from active workspaces.",
      "Handoff Integration: Use items in your Pocket to feed directly back into creative and compilation chambers."
    ],
    keywords: ["pocket", "wardrobe", "organize", "saved", "archive", "zines", "outfits", "looks", "looksbook", "registry"]
  },
  {
    id: "chambers-edit",
    title: "The Edit: Editorial Compile",
    category: "chambers",
    description: "The primary workspace to draft, compile, and align text and visual layouts.",
    details: [
      "Draft Lead Elements: Establish the main thesis, opening remarks, and featured narratives of your current zine.",
      "Editorial Alignment: Review, edit, and organize individual text blocks and visual curation cards.",
      "Workspace Exporters: Push compiled drafts seamlessly to Google Docs, or download standard offline PDF layouts."
    ],
    keywords: ["edit", "the edit", "editorial", "compile", "thesis", "draft", "google docs", "pdf", "export"]
  },
  {
    id: "chambers-create",
    title: "Create: Worktable & Moodboard",
    category: "chambers",
    description: "The visual engines of the platform, designed to create layouts, prompt models, and compose visuals.",
    details: [
      "Worktable (Studio): Configure zine structures, customize title options, select cover themes, and run AI prompt generation.",
      "Mood Board Composer: An infinite spatial canvas. Position, crop, scale, and layer image cards to curate visual stories.",
      "Preset Trajectories: Inject established visual directions, typography constraints, and semiotic target configurations."
    ],
    keywords: ["worktable", "moodboard", "create", "composer", "spatial", "canvas", "prompts", "generate", "zine", "visuals"]
  },
  {
    id: "chambers-analyze",
    title: "Analyze: The Lens & Clique",
    category: "chambers",
    description: "Analyze semiotic signals, subcultural alignments, and brand temperature metrics.",
    details: [
      "The Lens Audit: Scan your assets for entropy, visual density, warmth temperature, and color stories.",
      "Clique Radar: Evaluate target audience subcultures, subcultural profiles, and youth culture index indicators.",
      "Strategic Directives: Receive actionable brand directives based on AI-driven semiotic telemetry analysis."
    ],
    keywords: ["lens", "clique", "analyze", "semiotic", "radar", "entropy", "density", "metrics", "directives", "audit"]
  },
  {
    id: "studio-ingestion",
    title: "Input Studio: Media Ingestion",
    category: "input-studio",
    description: "Direct asset ingestion via drag-and-drop or batch selection.",
    details: [
      "Drag-and-Drop: Drop any high-resolution reference image or design directly onto the workspace.",
      "Aesthetic Analysis: Gemini models instantly parse image compositions, color palettes, and stylistic cues.",
      "Auto-Tagging: Automatically generate high-fidelity keywords and tone descriptors for instant labeling."
    ],
    keywords: ["media", "ingestion", "upload", "drag", "drop", "image", "analysis", "palette", "tags", "labels"]
  },
  {
    id: "studio-transcription",
    title: "Input Studio: Auditory Dictation",
    category: "input-studio",
    description: "Harness your voice to transcribe notes, outline directions, and capture spoken concepts.",
    details: [
      "Speech-to-Text: Dictate brainstorms, field reviews, or auditory briefs directly through your microphone.",
      "Instant Transcription: Built-in model processing generates high-accuracy editable text blocks.",
      "Context Stitching: Append audio transcriptions directly to visual moodboards or project strategy folders."
    ],
    keywords: ["auditory", "dictation", "voice", "microphone", "speech", "transcribe", "notes", "audios", "brainstorm"]
  },
  {
    id: "studio-orchestration",
    title: "Input Studio: AI Prompt Engine",
    category: "input-studio",
    description: "Customize the level of Gemini cognitive reasoning and grounding for your input curation.",
    details: [
      "Deep Thinking / Lite Mode: Toggle between lightweight speed and deep multi-step reasoning capabilities.",
      "Search Grounding: Connect prompts directly to live Google Search indices for real-time brand relevance checks.",
      "Maps Grounding: Leverage Google Places data to contextualize designs based on geographical coordinates.",
      "Task Intelligence: Auto-transform chaotic ideas into beautiful, structured task lists and project roadmaps."
    ],
    keywords: ["ai", "gemini", "prompt", "grounding", "search", "maps", "thinking", "lite", "cognitive", "reasoning"]
  },
  {
    id: "studio-dossiers",
    title: "Input Studio: Project Dossier Export",
    category: "input-studio",
    description: "Organize input assets into formal dossiers and synchronize them directly to Google Workspace.",
    details: [
      "Strategic Folder dossiers: Aggregate raw media, strategy memos, and text blocks into structured project envelopes.",
      "Google Slides Synchronizer: Turn dossier visual collections into curated presentation decks with a single click.",
      "Google Docs Publisher: Assemble strategy briefs, color guides, and copy text into clean formatted Google Documents."
    ],
    keywords: ["dossier", "export", "google slides", "google docs", "synchronize", "folder", "strategy", "presentation", "deck"]
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
                A blueprint index explaining the core capabilities of the creative <strong>Chambers</strong> and the cognitive <strong>Input Studio</strong>.
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
                    Try searching for Scribe, Gemini, Ingestion, Lens, or Edit
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 md:px-8 py-4 border-t border-stone-850 bg-[#161514] flex items-center justify-between select-none">
              <div className="flex items-center gap-1.5 text-stone-500 font-mono text-[7px] uppercase tracking-[0.2em] font-extrabold">
                <Terminal size={10} />
                <span>INDEX VERSION 2.4.0_ALPHA</span>
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
