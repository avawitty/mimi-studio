import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Loader2,
  Globe,
  ScanLine,
  Database,
  ArrowRight,
  TrendingUp,
  PenTool,
  Bookmark,
  Download,
  ChevronRight,
  Layers,
  Archive,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import {
  ArchiveChamberShell,
  ArchiveContextPanel,
  type ArchiveWorkflowStep,
} from "./chambers/ArchiveChamberShell";
import { useUser } from "../contexts/UserContext";
import {
  compileTrendNarrative,
  runSpecimenScry,
  runTrendScry,
} from "../services/scryService";
import type {
  ResearchResult,
  ResultStatus,
  ScryLaneId,
  ScryRun,
  TrendCurationMap,
  TrendCluster,
} from "../schemas/scryContracts";

type ScryTab = "specimen" | "trend";

const TABS: {
  id: ScryTab;
  label: string;
  icon: React.ReactNode;
  note: string;
  workflow: ArchiveWorkflowStep;
}[] = [
  {
    id: "specimen",
    label: "Specimen",
    icon: <Search size={14} />,
    note: "Ask across archive, web, reading, and shadow memory",
    workflow: "read",
  },
  {
    id: "trend",
    label: "Trend",
    icon: <TrendingUp size={14} />,
    note: "Deep-scry a drift signal into a biaxial map and draft",
    workflow: "collect",
  },
];

const LANE_META: Record<
  ScryLaneId,
  { label: string; icon: React.ReactNode; accent: string }
> = {
  personalMemory: {
    label: "My Archive",
    icon: <Archive size={14} />,
    accent: "border-l-stone-800",
  },
  web: {
    label: "Open Web",
    icon: <Globe size={14} />,
    accent: "border-l-[#5A5A40]",
  },
  generatedReading: {
    label: "Mimi's Reading",
    icon: <ScanLine size={14} />,
    accent: "border-l-[#9BB8CE]",
  },
  shadowMemory: {
    label: "Shadow Memory",
    icon: <Database size={14} />,
    accent: "border-l-stone-500",
  },
};

const STATUS_LABEL: Record<ResultStatus, string> = {
  success: "Live",
  partial: "Partial",
  empty: "Empty",
  failed: "Failed",
  simulated: "Simulated",
  speculative: "Speculative",
};

const PRESETS = [
  {
    label: "Saturation Chic",
    q: "Saturation Chic — neon rebellion against greige minimalism",
  },
  {
    label: "Noir Maturity",
    q: "Monochrome Maturity — black and white tailored armor",
  },
  {
    label: "Cyber-Vandal Craft",
    q: "Synthetic Acid Brights — industrial neons, street craft",
  },
];

function safeHostname(url?: string): string {
  if (!url) return "unknown";
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown";
  }
}

const ResultCard: React.FC<{
  item: ResearchResult;
  index: number;
}> = ({ item, index }) => {
  const meta = LANE_META[item.sourceLane];
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.24) }}
      className={`border archive-border bg-white/80 border-l-2 ${meta.accent} p-4 md:p-5`}
    >
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-mono text-[8px] uppercase tracking-[0.2em] archive-text-muted flex items-center gap-1.5">
            {meta.icon}
            {meta.label}
          </p>
          {item.url ? (
            <p className="font-mono text-[8px] archive-text-muted mt-1 truncate">
              {safeHostname(item.url)}
            </p>
          ) : null}
          {typeof item.similarity === "number" ? (
            <p className="font-mono text-[8px] archive-text-muted mt-1">
              Resonance {(item.similarity * 100).toFixed(0)}%
            </p>
          ) : null}
        </div>
        <Layers size={12} className="archive-text-muted shrink-0 mt-0.5" />
      </div>
      <h3 className="font-serif text-lg md:text-xl italic archive-text-ink mb-2 leading-snug">
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline underline-offset-4"
          >
            {item.title}
          </a>
        ) : (
          item.title
        )}
      </h3>
      {(item.snippet || item.content_preview) && (
        <p className="font-sans text-sm archive-text-muted leading-relaxed line-clamp-3">
          {item.snippet || item.content_preview}
        </p>
      )}
    </motion.article>
  );
};

const LaneStrip: React.FC<{ run: ScryRun | null; busy: boolean }> = ({
  run,
  busy,
}) => {
  const lanes = Object.keys(LANE_META) as ScryLaneId[];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {lanes.map((lane) => {
        const status = run?.laneStatus[lane] ?? "empty";
        const count =
          lane === "generatedReading"
            ? run?.sources.generatedReading
              ? 1
              : 0
            : (run?.sources[lane] as ResearchResult[] | undefined)?.length || 0;
        return (
          <div
            key={lane}
            className="border archive-border px-3 py-2 min-h-[52px]"
            data-lane={lane}
            data-status={status}
          >
            <p className="font-mono text-[7px] uppercase tracking-[0.18em] archive-text-muted">
              {LANE_META[lane].label}
            </p>
            <p className="font-mono text-[9px] archive-text-ink mt-1">
              {busy && status === "empty" ? "…" : STATUS_LABEL[status]}
              {count > 0 ? ` · ${count}` : ""}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export const ScryView: React.FC = () => {
  const { profile, apiKeys, pocket, setPocket } = useUser();
  const [tab, setTab] = useState<ScryTab>("specimen");
  const [contextOpen, setContextOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [run, setRun] = useState<ScryRun | null>(null);
  const [isScrying, setIsScrying] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const [trendQuery, setTrendQuery] = useState("Saturation Chic");
  const [isTrendScrying, setIsTrendScrying] = useState(false);
  const [curationMap, setCurationMap] = useState<TrendCurationMap | null>(null);
  const [hoveredCluster, setHoveredCluster] = useState<TrendCluster | null>(null);
  const [narrativeDraft, setNarrativeDraft] = useState("");
  const [narrativeVia, setNarrativeVia] = useState<"gateway" | "local" | null>(null);
  const [isCompilingNarrative, setIsCompilingNarrative] = useState(false);

  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0];

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setContextOpen(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    window.setTimeout(() => setNotification(null), 2800);
  }, []);

  const handleScry = useCallback(
    async (q?: string) => {
      const queryToUse = (q ?? query).trim();
      if (!queryToUse || isScrying) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsScrying(true);
      setRun(null);
      if (q) setQuery(q);

      try {
        const next = await runSpecimenScry({
          query: queryToUse,
          profile,
          geminiKey: apiKeys?.gemini,
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setRun(next);
          const live = next.confidence?.label || "Scry complete";
          showNotification(live);
        }
      } catch (err) {
        console.error("MIMI // Scrying failed", err);
        showNotification("Scry failed — see lane statuses.");
      } finally {
        if (!controller.signal.aborted) setIsScrying(false);
      }
    },
    [apiKeys?.gemini, isScrying, profile, query, showNotification],
  );

  useEffect(() => {
    const onSearch = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.trim()) {
        setTab("specimen");
        void handleScry(detail);
      }
    };
    window.addEventListener("mimi:scry_search", onSearch);
    return () => window.removeEventListener("mimi:scry_search", onSearch);
  }, [handleScry]);

  const conductTrendScry = async (keywordToScry?: string) => {
    const keyword = (keywordToScry || trendQuery).trim();
    if (!keyword || isTrendScrying) return;
    setIsTrendScrying(true);
    setCurationMap(null);
    setNarrativeDraft("");
    setNarrativeVia(null);
    setHoveredCluster(null);
    if (keywordToScry) setTrendQuery(keywordToScry);
    showNotification(`Deep-scrying: ${keyword}`);

    try {
      const map = await runTrendScry({ keyword, profile });
      setCurationMap(map);
      if (map.status === "failed") {
        showNotification("Trend scry failed — no fabricated fallback.");
      } else if (map.status === "empty") {
        showNotification("No trend evidence returned.");
      } else {
        showNotification("Trend map constructed from live grounding.");
      }
    } catch (err) {
      console.error("MIMI // Trend Scrying failed", err);
      setCurationMap({
        thesis: "",
        trendClusters: [],
        biaxialMapDescription: "",
        sources: [],
        status: "failed",
      });
      showNotification("Trend scry failed — no fabricated fallback.");
    } finally {
      setIsTrendScrying(false);
    }
  };

  const compileNarrativeDraft = async () => {
    if (!curationMap || isCompilingNarrative) return;
    setIsCompilingNarrative(true);
    showNotification("Compiling narrative via AI Gateway…");
    try {
      const result = await compileTrendNarrative({
        keyword: trendQuery,
        curation: curationMap,
        profile,
      });
      if (!result) {
        showNotification("Nothing to compile — run Deep-Scry first.");
        return;
      }
      setNarrativeDraft(result.draft);
      setNarrativeVia(result.via);
      showNotification(
        result.via === "gateway"
          ? "Narrative compiled via AI Gateway."
          : "Local scaffold — Gateway unavailable.",
      );
    } finally {
      setIsCompilingNarrative(false);
    }
  };

  const saveDraftToPocket = () => {
    if (!narrativeDraft || !setPocket) return;
    const updated = Array.isArray(pocket) ? [...pocket] : [];
    updated.push({
      id: `scribe-narrative-${Date.now()}`,
      type: "scribe-intake",
      metadata: { keyword: trendQuery, compiledOn: Date.now(), via: narrativeVia },
      content_preview: narrativeDraft.slice(0, 300),
      content: {
        title: `Editorial: ${trendQuery}`,
        draftText: narrativeDraft,
      },
    } as any);
    setPocket(updated);
    showNotification("Draft anchored to Pocket.");
  };

  const downloadMarkdown = () => {
    if (!narrativeDraft) return;
    const element = document.createElement("a");
    const file = new Blob([narrativeDraft], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `mimi_editorial_${trendQuery
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showNotification("Markdown exported.");
  };

  const contextDrawer = useMemo(
    () => (
      <ArchiveContextPanel
        title={activeTab.label}
        subtitle={activeTab.note}
        footer={
          <div className="space-y-2 font-mono text-[8px] uppercase tracking-widest archive-text-muted">
            <p>
              Keys:{" "}
              <span className="archive-text-ink">
                {[apiKeys?.gemini && "Gemini", apiKeys?.you_com && "You.com"]
                  .filter(Boolean)
                  .join(" · ") || "Server / Gateway"}
              </span>
            </p>
            {run?.confidence ? (
              <p>
                Coverage:{" "}
                <span className="archive-text-ink">
                  {(run.confidence.score * 100).toFixed(0)}% — {run.confidence.label}
                </span>
              </p>
            ) : null}
            {run?.latencyMs != null ? (
              <p>
                Latency: <span className="archive-text-ink">{run.latencyMs}ms</span>
              </p>
            ) : null}
          </div>
        }
      >
        <div className="space-y-3">
          <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
            Evidence layers
          </p>
          <p className="font-serif italic text-sm leading-relaxed archive-text-ink">
            {tab === "specimen"
              ? "Four lanes stay separate: My Archive, Open Web, Mimi's Reading, and Shadow Memory. Coverage replaces costume confidence."
              : "Trend Scry maps live search into a biaxial plot. Failed runs stay empty — no fake Vogue stubs."}
          </p>
        </div>
        <div className="space-y-3 pt-2 border-t archive-border">
          <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
            What to do next
          </p>
          <ul className="font-sans text-[10px] archive-text-muted space-y-2 list-none">
            {tab === "specimen" ? (
              <>
                <li>Ask a mood, texture, or ghost question.</li>
                <li>Read lane statuses before trusting a synthesis.</li>
                <li>Send useful fragments onward via Pocket.</li>
              </>
            ) : (
              <>
                <li>Pick a preset or name a drift signal.</li>
                <li>Inspect cluster nodes on the biaxial map.</li>
                <li>Compile a draft when Gateway or local scaffold is ready.</li>
              </>
            )}
          </ul>
        </div>
        {run?.failures?.length ? (
          <div className="space-y-2 pt-2 border-t archive-border">
            <p className="font-mono text-[8px] uppercase tracking-widest text-red-800/80 flex items-center gap-1.5">
              <AlertCircle size={11} /> Lane failures
            </p>
            <ul className="space-y-1.5">
              {run.failures.slice(0, 6).map((f, i) => (
                <li key={`${f.lane}-${i}`} className="font-mono text-[9px] archive-text-muted">
                  {f.lane}: {f.message.slice(0, 80)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </ArchiveContextPanel>
    ),
    [activeTab.label, activeTab.note, apiKeys?.gemini, apiKeys?.you_com, run, tab],
  );

  const specimenHits = useMemo(() => {
    if (!run) return [] as ResearchResult[];
    return [
      ...run.sources.personalMemory,
      ...run.sources.web,
      ...run.sources.shadowMemory,
    ];
  }, [run]);

  return (
    <>
      <AnimatePresence>
        {notification ? (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 bg-black text-white font-mono text-[9px] uppercase tracking-widest flex items-center gap-2 border border-white/10"
            role="status"
          >
            <CheckCircle size={12} className="text-[#9BB8CE]" />
            <span>{notification}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ArchiveChamberShell
        moduleId="scry"
        activeWorkflowStep={activeTab.workflow}
        workflowSteps={["collect", "read", "approve", "save"]}
        contextDrawer={contextDrawer}
        contextDrawerOpen={contextOpen}
        onContextDrawerToggle={() => setContextOpen((o) => !o)}
        contextDrawerTitle="Guide"
        headerNote="Evidence first — four lanes, no costume certainty."
        spine={
          <>
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                title={item.label}
                onClick={() => setTab(item.id)}
                className={`archive-icon-btn w-10 h-10 flex items-center justify-center border border-transparent ${
                  tab === item.id ? "is-active border-white/20" : ""
                }`}
              >
                {item.icon}
              </button>
            ))}
          </>
        }
        contextSidebar={
          <nav className="flex flex-col gap-1 px-2 pb-4" aria-label="Scry modes">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`text-left px-3 py-2.5 border font-mono text-[9px] uppercase tracking-[0.16em] ${
                  tab === item.id
                    ? "border-archive-ink bg-archive-ink text-archive-cream"
                    : "border-transparent archive-text-muted hover:archive-text-ink"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        }
        canvas={
          <div className="flex flex-col h-full min-h-0" data-testid="scry-chamber">
            <nav
              aria-label="Scry modes"
              className="md:hidden shrink-0 grid grid-cols-2 border-b archive-border"
            >
              {TABS.map((mode) => {
                const active = tab === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setTab(mode.id)}
                    className={`flex items-center justify-center gap-1.5 px-2 py-2.5 font-mono text-[8px] uppercase tracking-[0.15em] border-b-2 min-h-[44px] ${
                      active
                        ? "archive-workflow-active border-archive-ink"
                        : "archive-workflow-idle border-transparent"
                    }`}
                  >
                    {mode.icon}
                    {mode.label}
                  </button>
                );
              })}
            </nav>

            {tab === "specimen" && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="px-4 md:px-8 pt-6 md:pt-10 pb-4 max-w-3xl">
                  <p className="font-mono text-[9px] uppercase tracking-[0.28em] archive-text-muted mb-3 flex items-center gap-2">
                    <span
                      className={`inline-block w-1.5 h-1.5 ${
                        isScrying ? "bg-[#5A5A40] animate-pulse" : "border border-[#5A5A40]"
                      }`}
                    />
                    Latent retrieval
                  </p>
                  <h2 className="font-serif italic text-3xl md:text-5xl leading-none archive-text-ink mb-3">
                    Ask the registry
                  </h2>
                  <p className="font-sans text-sm archive-text-muted max-w-md leading-relaxed mb-8">
                    Describe a texture, a mood, or a ghost. Evidence returns in four labeled
                    lanes — archive, web, reading, shadow.
                  </p>

                  <label className="block mb-2 font-mono text-[9px] uppercase tracking-widest archive-text-muted">
                    Query
                  </label>
                  <div className="relative mb-6">
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void handleScry();
                        }
                      }}
                      className="w-full bg-transparent border-b-2 border-black py-3 md:py-4 text-xl md:text-2xl font-serif italic placeholder:text-stone-300 focus:outline-none pr-14"
                      placeholder="will i be a lover girl again?"
                      aria-label="Scry query"
                      data-testid="scry-query"
                    />
                    <button
                      type="button"
                      onClick={() => void handleScry()}
                      disabled={isScrying || !query.trim()}
                      aria-label="Run scry"
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center bg-black text-white disabled:opacity-40"
                    >
                      {isScrying ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <ArrowRight size={16} />
                      )}
                    </button>
                  </div>

                  <LaneStrip run={run} busy={isScrying} />
                </div>

                <div className="px-4 md:px-8 pb-28 md:pb-16 max-w-3xl space-y-4">
                  <AnimatePresence mode="popLayout">
                    {run?.sources.generatedReading ? (
                      <motion.article
                        key="reading"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="border archive-border border-l-2 border-l-[#9BB8CE] p-4 md:p-5 bg-white/80"
                        data-lane="generatedReading"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <p className="font-mono text-[8px] uppercase tracking-[0.2em] archive-text-muted flex items-center gap-1.5">
                            <ScanLine size={12} />
                            Mimi's Reading
                            {run.sources.generatedReading.via === "gateway" ? (
                              <span className="text-[#5A5A40]"> · Gateway</span>
                            ) : null}
                          </p>
                        </div>
                        <p className="font-serif italic text-lg md:text-xl archive-text-ink leading-relaxed">
                          “{run.sources.generatedReading.text}”
                        </p>
                      </motion.article>
                    ) : null}

                    {specimenHits.map((item, i) => (
                      <ResultCard key={`${item.sourceLane}-${item.id || i}`} item={item} index={i} />
                    ))}
                  </AnimatePresence>

                  {!isScrying && run && specimenHits.length === 0 && !run.sources.generatedReading ? (
                    <div
                      className="border border-dashed archive-border p-8 text-center"
                      data-testid="scry-empty"
                    >
                      <p className="font-mono text-[9px] uppercase tracking-widest archive-text-muted mb-2">
                        No evidence yet
                      </p>
                      <p className="font-serif italic text-sm archive-text-muted">
                        Lanes returned empty or failed. Nothing fabricated.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {tab === "trend" && (
              <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 py-6 md:py-10 pb-28 md:pb-16 max-w-3xl space-y-8">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.28em] archive-text-muted mb-3 flex items-center gap-2">
                    <TrendingUp size={12} />
                    Trend grounding
                  </p>
                  <h2 className="font-serif italic text-3xl md:text-5xl archive-text-ink mb-3">
                    Trend Scryer
                  </h2>
                  <p className="font-sans text-sm archive-text-muted max-w-xl leading-relaxed">
                    Live search into a biaxial drift map. Synthesis drafts prefer AI Gateway;
                    failures stay honest.
                  </p>
                </div>

                <div className="border archive-border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-widest">
                  <span className="archive-text-muted">
                    Grounding:{" "}
                    <span className="archive-text-ink">
                      {apiKeys?.you_com ? "You.com + Gemini Search" : "Gemini Google Search"}
                    </span>
                  </span>
                  {!apiKeys?.you_com ? (
                    <button
                      type="button"
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent("mimi:change_view", { detail: "profile" }),
                        )
                      }
                      className="underline archive-text-muted hover:archive-text-ink text-left"
                    >
                      Keychain →
                    </button>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
                    Presets
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => void conductTrendScry(p.q)}
                        className={`px-3 py-2 min-h-[40px] border font-mono text-[9px] uppercase tracking-widest ${
                          trendQuery === p.q
                            ? "bg-black text-white border-black"
                            : "border-stone-300 hover:border-black"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-mono text-[9px] uppercase tracking-widest archive-text-muted">
                    Drift signal
                  </label>
                  <div className="relative">
                    <input
                      value={trendQuery}
                      onChange={(e) => setTrendQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void conductTrendScry();
                      }}
                      className="w-full border archive-border bg-white px-4 py-3 pr-28 font-serif italic text-lg focus:outline-none focus:border-black"
                      placeholder="Saturation Chic, Neon maturity…"
                      data-testid="trend-query"
                    />
                    <button
                      type="button"
                      onClick={() => void conductTrendScry()}
                      disabled={isTrendScrying || !trendQuery.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 min-h-[40px] bg-black text-white font-mono text-[9px] uppercase tracking-widest disabled:opacity-40 flex items-center gap-1.5"
                    >
                      {isTrendScrying ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        "Deep-Scry"
                      )}
                    </button>
                  </div>
                </div>

                {curationMap?.status === "failed" || curationMap?.status === "empty" ? (
                  <div
                    className="border border-dashed archive-border p-6 text-center"
                    data-testid="trend-empty"
                  >
                    <p className="font-mono text-[9px] uppercase tracking-widest archive-text-muted mb-2">
                      {curationMap.status === "failed" ? "Trend scry failed" : "No trend evidence"}
                    </p>
                    <p className="font-serif italic text-sm archive-text-muted">
                      No fabricated sources. Retry when search or keys are available.
                    </p>
                  </div>
                ) : null}

                {curationMap && curationMap.status !== "failed" && curationMap.status !== "empty" ? (
                  <div className="space-y-6 border-t archive-border pt-6">
                    <div className="space-y-2">
                      <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
                        Thesis
                      </p>
                      <h4 className="font-serif italic text-xl md:text-2xl archive-text-ink leading-snug">
                        “{curationMap.thesis}”
                      </h4>
                    </div>

                    <div className="space-y-2">
                      <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
                        Biaxial map — tap a node
                      </p>
                      <div className="relative w-full h-[220px] md:h-[260px] border archive-border bg-[#FAFAFA]">
                        <div className="absolute inset-0 border-t border-dashed border-stone-300 top-1/2 pointer-events-none" />
                        <div className="absolute inset-0 border-l border-dashed border-stone-300 left-1/2 pointer-events-none" />
                        <span className="absolute top-2 left-1/2 -translate-x-1/2 font-mono text-[7px] archive-text-muted uppercase tracking-widest">
                          Hidden
                        </span>
                        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[7px] archive-text-muted uppercase tracking-widest">
                          Surface
                        </span>
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[7px] archive-text-muted uppercase tracking-widest -rotate-90 origin-left">
                          Material
                        </span>
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[7px] archive-text-muted uppercase tracking-widest rotate-90 origin-right">
                          Symbolic
                        </span>
                        {curationMap.trendClusters.map((tc, idx) => {
                          const left = `${((tc.position.x + 1) / 2) * 80 + 10}%`;
                          const top = `${((1 - tc.position.y) / 2) * 80 + 10}%`;
                          const active = hoveredCluster?.name === tc.name;
                          return (
                            <button
                              key={`${tc.name}-${idx}`}
                              type="button"
                              aria-label={tc.name}
                              onMouseEnter={() => setHoveredCluster(tc)}
                              onFocus={() => setHoveredCluster(tc)}
                              onClick={() => setHoveredCluster(tc)}
                              className={`absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 border-2 transition-transform ${
                                active
                                  ? "bg-[#5A5A40] border-black scale-125"
                                  : "bg-[#9BB8CE] border-black hover:scale-125"
                              }`}
                              style={{ left, top }}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {hoveredCluster ? (
                      <div className="border archive-border p-4 space-y-2">
                        <div className="flex justify-between gap-2 border-b archive-border pb-2">
                          <span className="font-mono text-[10px] uppercase tracking-widest archive-text-ink font-bold">
                            {hoveredCluster.name}
                          </span>
                          <span className="font-mono text-[9px] archive-text-muted shrink-0">
                            {hoveredCluster.position.x.toFixed(1)}, {hoveredCluster.position.y.toFixed(1)}
                          </span>
                        </div>
                        <p className="font-serif italic text-sm archive-text-ink">
                          {hoveredCluster.historicalPrecedent}
                        </p>
                        <p className="font-sans text-[11px] archive-text-muted">
                          Contradicts: {hoveredCluster.contradictoryAesthetic}
                        </p>
                      </div>
                    ) : (
                      <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted text-center border border-dashed archive-border py-3">
                        Select a coordinate node
                      </p>
                    )}

                    <div className="space-y-3 border-t archive-border pt-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="font-mono text-[9px] uppercase tracking-widest archive-text-muted">
                          Narrative writer
                        </p>
                        <button
                          type="button"
                          onClick={() => void compileNarrativeDraft()}
                          disabled={isCompilingNarrative}
                          className="px-4 py-2.5 min-h-[44px] bg-black text-white font-mono text-[9px] uppercase tracking-widest font-bold flex items-center justify-center gap-2 disabled:opacity-40"
                        >
                          {isCompilingNarrative ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <PenTool size={12} />
                          )}
                          Compile draft
                        </button>
                      </div>

                      {narrativeDraft ? (
                        <div className="space-y-3">
                          <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
                            Draft
                            {narrativeVia === "gateway"
                              ? " · AI Gateway"
                              : narrativeVia === "local"
                                ? " · Local scaffold"
                                : ""}
                          </p>
                          <textarea
                            value={narrativeDraft}
                            onChange={(e) => setNarrativeDraft(e.target.value)}
                            className="w-full border archive-border bg-white p-4 font-serif italic text-sm leading-relaxed min-h-[240px] focus:outline-none focus:border-black"
                          />
                          <div className="flex flex-wrap gap-2 justify-end">
                            <button
                              type="button"
                              onClick={downloadMarkdown}
                              className="px-3 py-2 min-h-[40px] border archive-border font-mono text-[9px] uppercase tracking-widest flex items-center gap-1.5"
                            >
                              <Download size={11} /> Export
                            </button>
                            <button
                              type="button"
                              onClick={saveDraftToPocket}
                              className="px-4 py-2 min-h-[40px] bg-black text-white font-mono text-[9px] uppercase tracking-widest flex items-center gap-1.5"
                            >
                              <Bookmark size={11} /> Pocket
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="font-mono text-[9px] uppercase tracking-widest archive-text-muted text-center border archive-border py-6">
                          Deep-Scry first, then compile
                        </p>
                      )}
                    </div>

                    {curationMap.sources.length > 0 ? (
                      <div className="space-y-2">
                        <p className="font-mono text-[8px] uppercase tracking-widest archive-text-muted">
                          Citations
                        </p>
                        <ul className="space-y-2">
                          {curationMap.sources.map((src, sIdx) => (
                            <li
                              key={`${src.url}-${sIdx}`}
                              className="border archive-border px-3 py-2.5 flex justify-between items-center gap-3 font-mono text-[10px]"
                            >
                              <span className="truncate font-bold">{src.title}</span>
                              <a
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 uppercase text-[8px] tracking-widest archive-text-muted hover:archive-text-ink flex items-center gap-1"
                              >
                                Open <ChevronRight size={10} />
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        }
      />
    </>
  );
};
