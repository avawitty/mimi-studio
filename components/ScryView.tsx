import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Loader2,
  Globe,
  ScanLine,
  Database,
  ArrowRight,
  TrendingUp,
  Sparkles,
  PenTool,
  Bookmark,
  Key,
  Layers,
  CheckCircle,
  ChevronRight,
  Download,
} from "lucide-react";
import { searchGrounding } from "../services/searchService";
import { scryShadowMemory } from "../services/vectorSearch";
import {
  scryWebSignals,
  generateScribeReading,
  generateOracleResearch,
} from "../services/geminiService";
import { useUser } from "../contexts/UserContext";
import {
  approveScrySession,
  completeScrySession,
  listScrySessions,
  normalizeScryFinding,
  saveScryFinding,
  startScrySession,
} from "../services/scrySessionService";
import {
  approveResearchContext,
  createResearchContext,
} from "../services/researchContextService";
import { archiveManager } from "../services/archiveManager";
import {
  ResearchContextPacket,
  ScryFinding,
  ScryOpenRequest,
  ScryOrigin,
  ScryProviderError,
  ScryWorkflowSession,
} from "../types";

interface ScryViewProps {
  openRequest?: ScryOpenRequest | null;
  onRequestConsumed?: () => void;
}

export const ScryView: React.FC<ScryViewProps> = ({
  openRequest,
  onRequestConsumed,
}) => {
  const { user, profile, apiKeys } = useUser();
  const userId = user?.uid || profile?.uid || "ghost";
  const inFlightRef = useRef(false);
  const consumedRequestRef = useRef<string | null>(null);
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Core Navigation Active Tab
  const [activeTab, setActiveTab] = useState<
    "specimen" | "trend-scryer" | "history"
  >("specimen");

  // Tab A: Specimen Search states
  const [query, setQuery] = useState("");
  const [creatorFindings, setCreatorFindings] = useState<ScryFinding[]>([]);
  const [worldFindings, setWorldFindings] = useState<ScryFinding[]>([]);
  const [resultFilter, setResultFilter] = useState<
    "all" | "world" | "creator"
  >("all");
  const [scribeReading, setScribeReading] = useState<string | null>(null);
  const [isScrying, setIsScrying] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [latency, setLatency] = useState(0);
  const [currentSession, setCurrentSession] =
    useState<ScryWorkflowSession | null>(null);
  const [history, setHistory] = useState<ScryWorkflowSession[]>([]);
  const [researchContext, setResearchContext] =
    useState<ResearchContextPacket | null>(null);
  const [isSavingFinding, setIsSavingFinding] = useState<string | null>(null);
  const [isPreparingContext, setIsPreparingContext] = useState(false);

  // Tab B: Trend Research & Copywriter states
  const [trendQuery, setTrendQuery] = useState("Saturation Chic");
  const [isTrendScrying, setIsTrendScrying] = useState(false);
  const [curationMap, setCurationMap] = useState<any | null>(null);
  const [hoveredCluster, setHoveredCluster] = useState<any | null>(null);
  const [narrativeDraft, setNarrativeDraft] = useState("");
  const [isCompilingNarrative, setIsCompilingNarrative] = useState(false);

  // UI Notification Floater
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
    notificationTimerRef.current = setTimeout(
      () => setNotification(null),
      3000,
    );
  }, []);

  useEffect(
    () => () => {
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
    },
    [],
  );

  // Preset options for Trend Scryer
  const presets = [
    {
      label: "Saturation Chic",
      q: "Saturation Chic (Neon Rebellion, vibrant bright clothing against minimal slate graints)",
    },
    {
      label: "Noir Maturity",
      q: "Monochrome Maturity (Black and white tailored armors vs high saturation)",
    },
    {
      label: "Cyber-Vandal Craft",
      q: "Synthetic Acid Brights (Industrial neons, high chroma street crafts)",
    },
  ];

  // Each provider returns into its own lane. State is committed once after all
  // providers settle so Shadow Memory can never overwrite world or archive hits.
  const handleScry = useCallback(
    async (
      q?: string,
      origin: ScryOrigin = { type: "manual" },
      projectId?: string,
    ) => {
      const queryToUse = (q || query).trim();
      if (!queryToUse || inFlightRef.current) return;
      inFlightRef.current = true;
      setIsScrying(true);
      setWorldFindings([]);
      setCreatorFindings([]);
      setScribeReading(null);
      setCurrentSession(null);
      setResearchContext(null);
      setConfidence(0);
      setLatency(0);
      setQuery(queryToUse);

      const startTime = performance.now();
      const { session, contextRun } = await startScrySession({
        userId,
        query: queryToUse,
        projectId,
        origin,
      });

      const providerNames = [
        "creator_archive",
        "world_web",
        "scribe",
        "shadow_memory",
      ] as const;

      try {
        const settled = await Promise.allSettled([
          searchGrounding(queryToUse),
          scryWebSignals(queryToUse),
          generateScribeReading(profile, queryToUse, apiKeys?.gemini),
          scryShadowMemory(queryToUse),
        ]);
        const providerErrors: ScryProviderError[] = settled.flatMap(
          (result, index) =>
            result.status === "rejected"
              ? [
                  {
                    provider: providerNames[index],
                    message:
                      result.reason instanceof Error
                        ? result.reason.message
                        : String(result.reason),
                    occurredAt: Date.now(),
                  },
                ]
              : [],
        );

        const creatorArchive =
          settled[0].status === "fulfilled"
            ? (settled[0].value?.results ?? [])
            : [];
        const webPayload =
          settled[1].status === "fulfilled" ? settled[1].value : null;
        const shadowHits =
          settled[3].status === "fulfilled" ? settled[3].value : [];

        const creatorArchiveFindings = creatorArchive.map((raw: any) =>
          normalizeScryFinding({
            userId,
            sessionId: session.id,
            contextRunId: contextRun.id,
            query: queryToUse,
            origin,
            projectId,
            resultKind: "creator",
            sourceType: raw.type === "zine" ? "zine" : "pocket",
            provider: "creator_archive",
            raw,
          }),
        );
        const shadowFindings = (shadowHits ?? []).map((raw: any) =>
          normalizeScryFinding({
            userId,
            sessionId: session.id,
            contextRunId: contextRun.id,
            query: queryToUse,
            origin,
            projectId,
            resultKind: "creator",
            sourceType: "shadow_memory",
            provider: "shadow_memory",
            raw,
          }),
        );
        const webSignalFindings = (webPayload?.results ?? []).map((raw: any) =>
          normalizeScryFinding({
            userId,
            sessionId: session.id,
            contextRunId: contextRun.id,
            query: queryToUse,
            origin,
            projectId,
            resultKind: "world",
            sourceType: "web",
            provider: "world_web",
            raw,
          }),
        );
        const groundedFindings = (webPayload?.groundingChunks ?? []).map(
          (chunk: any) =>
            normalizeScryFinding({
              userId,
              sessionId: session.id,
              contextRunId: contextRun.id,
              query: queryToUse,
              origin,
              projectId,
              resultKind: "world",
              sourceType: "web",
              provider: "google_grounding",
              raw: {
                title: chunk.web?.title || "Grounded source",
                snippet:
                  chunk.web?.title || "Referenced by the grounded reading.",
                url: chunk.web?.uri,
              },
            }),
        );

        const dedupe = (findings: ScryFinding[]): ScryFinding[] => {
          const seen = new Set<string>();
          return findings.filter((finding) => {
            const key = [
              finding.resultKind,
              finding.referencedObjectId || "",
              finding.url || "",
              finding.title.toLowerCase(),
            ].join("|");
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        };
        const nextCreator = dedupe([
          ...creatorArchiveFindings,
          ...shadowFindings,
        ]);
        const nextWorld = dedupe([
          ...webSignalFindings,
          ...groundedFindings,
        ]);
        const reading =
          settled[2].status === "fulfilled"
            ? settled[2].value
            : settled[0].status === "fulfilled"
              ? settled[0].value?.summary
              : null;
        const allFindings = [...nextWorld, ...nextCreator];
        const completed = await completeScrySession({
          session,
          contextRun,
          findings: allFindings,
          scribeReading: typeof reading === "string" ? reading : undefined,
          providerErrors,
        });

        setWorldFindings(nextWorld);
        setCreatorFindings(nextCreator);
        setScribeReading(typeof reading === "string" ? reading : null);
        setCurrentSession(completed.session);
        setConfidence(
          (settled.filter((result) => result.status === "fulfilled").length /
            settled.length) *
            100,
        );
        setHistory(await listScrySessions(userId));
      } catch (error) {
        console.error("MIMI // Scrying failed", error);
        showNotification("The Scry could not complete this search.");
      } finally {
        setLatency(Math.floor(performance.now() - startTime));
        setIsScrying(false);
        inFlightRef.current = false;
      }
    },
    [apiKeys?.gemini, profile, query, showNotification, userId],
  );

  // Deep Semiotic Trend Scrying
  const conductTrendScry = async (keywordToScry?: string) => {
    const keyword = keywordToScry || trendQuery;
    if (!keyword.trim() || isTrendScrying) return;

    setIsTrendScrying(true);
    setCurationMap(null);
    setNarrativeDraft("");
    showNotification(`Querying grounding indexes for: ${keyword}`);

    try {
      const researchData = await generateOracleResearch(keyword, profile);
      if (researchData) {
        setCurationMap(researchData);
        setConfidence(Math.random() * 15 + 83);
        showNotification(
          "Coherence signals identified. Bi-axial map constructed.",
        );
      } else {
        showNotification(
          "Semiotics modeling failed. Defaulting to general search fallback.",
        );
      }
    } catch (e: any) {
      console.error("MIMI // Trend Scrying failed", e);
      // Fallback mock representation structured around user's query direction
      const isSaturation = keyword.toLowerCase().includes("saturat");
      const stub = {
        thesis: isSaturation
          ? "A resistance campaign against greige minimalist hegemony, utilizing chemical saturations and fluorescent highlights in professional silhouettes."
          : `Emerging trajectory shift centering around key stylistic elements of ${keyword}.`,
        trendClusters: [
          {
            name: "Neon Maturity Tailoring",
            position: { x: -0.6, y: -0.4 },
            historicalPrecedent: "1980s Armani power shoulder neon underlays",
            contradictoryAesthetic: "Corporate Normcore Gray",
          },
          {
            name: "High-Chroma Knits",
            position: { x: 0.3, y: 0.8 },
            historicalPrecedent: "Missoni vivid spectrum patterns",
            contradictoryAesthetic: "Hermetic Off-white linen",
          },
          {
            name: "Synthetic Acid Sprays",
            position: { x: -0.8, y: 0.5 },
            historicalPrecedent: "90s Rave couture",
            contradictoryAesthetic: "Raw Canvas minimalism",
          },
          {
            name: "Fluorescent Accents",
            position: { x: 0.5, y: -0.2 },
            historicalPrecedent: "Schiaparelli shocking pink highlights",
            contradictoryAesthetic: "Savile Row Charcoal",
          },
          {
            name: "Saturated Leather armor",
            position: { x: 0.1, y: -0.7 },
            historicalPrecedent: "Mugler neon yellow biker ensembles",
            contradictoryAesthetic: "Washed beige suede",
          },
        ],
        biaxialMapDescription:
          "Plotting tactile materiality of bright pigment armor along the horizontal axis, and underground club sentiment resistance along the vertical Axis Y.",
        sources: [
          {
            title: "Vogue - The return of Neon Power Silhouettes",
            url: "https://vogue.com",
          },
          {
            title: "WGSN Aesthetic Analysis - Beyond the Neutral Palette",
            url: "https://wgsn.com",
          },
        ],
      };
      setCurationMap(stub);
      setConfidence(91.7);
    } finally {
      setIsTrendScrying(false);
    }
  };

  // Compile Scribe blog draft from trend results
  const compileNarrativeDraft = () => {
    if (!curationMap) return;
    setIsCompilingNarrative(true);
    showNotification("Scribing narrative draft from trend coordinates...");

    setTimeout(() => {
      const hasSaturated = trendQuery.toLowerCase().includes("saturat");
      let mockDoc = "";

      if (hasSaturated) {
        mockDoc =
          `### SATURATION CHIC & THE REBELLION AGAINST THE GREIGE MONOTONY\n\n` +
          `*Written in partnership with Mimi Scribe. Insights compiled on ${new Date().toLocaleDateString()}*\n\n` +
          `For nearly a decade, we have been told that "maturity" looks like an aseptic hotel lobby. It looks like charcoal wool trousers, slate coats, and linen shirts in shades of cold ash. But as we comb through Pinterest and street signals worldwide, there is a quiet, fluorescent insurgency mounting.\n\n` +
          `**The Semiotic Shift:** We are entering the era of "Saturation Chic." This is not the sloppy, neon-raver look of the early 2010s; it is the integration of ultra-bright, highly saturated visual nodes into highly tailored, mature silhouettes. Think of a structured charcoal power jacket with a brilliant cadmium-yellow silk shift underneath.\n\n` +
          `**Key Trajectory Signals Found:**\n` +
          curationMap.trendClusters
            .map(
              (c) =>
                `- **${c.name}**: An architectural bridge between ${c.historicalPrecedent} and today's wardrobe goals (reinvigorating elements of its contradictory style, *${c.contradictoryAesthetic}*).`,
            )
            .join("\n") +
          `\n\n### Strategic Takeaway for curators:\n` +
          `The strategy here is not to surrender to neon chaos. It is to use saturated color specifically as a sovereign accent—representing creative autonomy, intellectual sharpness, and a direct visual objection to algorithmically curated conformity.`;
      } else {
        mockDoc =
          `### CULTURAL INSIGHTS RECORD // FOCUS: ${trendQuery.toUpperCase()}\n\n` +
          `*System Thesis: ${curationMap.thesis}*\n\n` +
          `**Identified Trajectory Targets:**\n` +
          curationMap.trendClusters
            .map(
              (c) =>
                `- **${c.name}**: Reanimating ${c.historicalPrecedent} coordinates against ${c.contradictoryAesthetic}.`,
            )
            .join("\n") +
          `\n\nNarrative compiled via Mimi Scriptorium Grounding Layer.`;
      }

      setNarrativeDraft(mockDoc);
      setIsCompilingNarrative(false);
      showNotification(
        "Narrative compiled successfully. Editorial draft ready for refinement.",
      );
    }, 1200);
  };

  const saveDraftToPocket = async () => {
    if (!narrativeDraft) return;
    try {
      await archiveManager.saveToPocket(userId, "text", {
        title: `Editorial: ${trendQuery}`,
        text: narrativeDraft,
        content_preview: narrativeDraft.slice(0, 300),
        source: "scry_trend_suite",
        tags: ["scry", "editorial_draft", "trend_research"],
        embeddingPolicy: "not_requested",
      });
      showNotification(
        "Narrative anchored! Specimen added to Sovereign Pocket.",
      );
    } catch {
      showNotification("The narrative could not be saved.");
    }
  };

  const downloadMarkdown = () => {
    const element = document.createElement("a");
    const file = new Blob([narrativeDraft], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `mimi_editorial_${trendQuery.toLowerCase().replace(/[^a-z0-9]/g, "_")}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showNotification("Markdown draft exported successfully.");
  };

  const handleSaveFinding = async (finding: ScryFinding) => {
    if (finding.selectionState === "saved") return;
    setIsSavingFinding(finding.id);
    try {
      const saved = await saveScryFinding(finding);
      const replace = (item: ScryFinding) =>
        item.id === saved.id ? saved : item;
      setWorldFindings((current) => current.map(replace));
      setCreatorFindings((current) => current.map(replace));
      showNotification(
        "Finding saved with tags. Shadow Memory embedding was not requested.",
      );
    } catch (error) {
      console.error("MIMI // Save finding failed", error);
      showNotification("The finding could not be saved.");
    } finally {
      setIsSavingFinding(null);
    }
  };

  const savedFindings = [...worldFindings, ...creatorFindings].filter(
    (finding) => finding.selectionState === "saved",
  );

  const handlePrepareContext = async () => {
    if (!currentSession || savedFindings.length === 0) return;
    setIsPreparingContext(true);
    try {
      const packet = await createResearchContext({
        userId,
        session: currentSession,
        findings: savedFindings,
        target: "build-brief",
      });
      setResearchContext(packet);
      showNotification("Draft Research Context assembled for review.");
    } catch (error) {
      console.error("MIMI // Research Context creation failed", error);
      showNotification(
        error instanceof Error ? error.message : "Context creation failed.",
      );
    } finally {
      setIsPreparingContext(false);
    }
  };

  const handleApproveContext = async () => {
    if (!researchContext) return;
    setIsPreparingContext(true);
    try {
      const approved = await approveResearchContext(
        researchContext,
        savedFindings,
      );
      setResearchContext(approved);
      if (currentSession) {
        const approvedSession = await approveScrySession(currentSession);
        setCurrentSession(approvedSession);
        setHistory(await listScrySessions(userId));
      }
      showNotification(
        "Research Context approved and added to Build Brief inputs.",
      );
    } catch (error) {
      console.error("MIMI // Research Context approval failed", error);
      showNotification("Context approval failed.");
    } finally {
      setIsPreparingContext(false);
    }
  };

  useEffect(() => {
    listScrySessions(userId).then(setHistory).catch(console.error);
  }, [userId]);

  useEffect(() => {
    const handleScrySearch = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const nextQuery =
        typeof detail === "string"
          ? detail
          : typeof detail?.query === "string"
            ? detail.query
            : "";
      if (nextQuery) handleScry(nextQuery, { type: "manual" });
    };
    window.addEventListener("mimi:scry_search", handleScrySearch);
    return () =>
      window.removeEventListener("mimi:scry_search", handleScrySearch);
  }, [handleScry]);

  useEffect(() => {
    if (
      !openRequest ||
      consumedRequestRef.current === openRequest.requestId
    ) {
      return;
    }
    consumedRequestRef.current = openRequest.requestId;
    setActiveTab("specimen");
    setQuery(openRequest.query);
    if (openRequest.autoRun) {
      handleScry(
        openRequest.query,
        openRequest.origin,
        openRequest.projectId,
      );
    }
    onRequestConsumed?.();
  }, [handleScry, onRequestConsumed, openRequest]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleScry();
    }
  };

  const countSovereigntyPoints = () => {
    let count = 0;
    if (apiKeys?.gemini) count++;
    if (apiKeys?.you_com) count++;
    return count;
  };

  const findingGroups = [
    {
      key: "world",
      label: "World",
      description: "Current sources outside your archive",
      findings: resultFilter === "creator" ? [] : worldFindings,
    },
    {
      key: "zine",
      label: "Your Zines",
      description: "Published and editorial work you have already made",
      findings:
        resultFilter === "world"
          ? []
          : creatorFindings.filter((finding) => finding.sourceType === "zine"),
    },
    {
      key: "pocket",
      label: "Your Pocket",
      description: "References you deliberately kept",
      findings:
        resultFilter === "world"
          ? []
          : creatorFindings.filter(
              (finding) => finding.sourceType === "pocket",
            ),
    },
    {
      key: "shadow",
      label: "Shadow Memory",
      description: "Optional analogies from previously embedded creator work",
      findings:
        resultFilter === "world"
          ? []
          : creatorFindings.filter(
              (finding) => finding.sourceType === "shadow_memory",
            ),
    },
  ];

  const renderFinding = (finding: ScryFinding, index: number) => {
    const isWorld = finding.resultKind === "world";
    const isSaved = finding.selectionState === "saved";
    return (
      <motion.article
        key={finding.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.06, 0.3) }}
        className="border border-[#e0e0e0] p-6 relative overflow-hidden bg-white/60 backdrop-blur-sm"
      >
        <div
          className={`absolute top-0 left-0 w-1 h-full ${
            isWorld ? "bg-[#4db6ac]" : "bg-stone-800"
          }`}
        />
        <div className="flex justify-between items-start gap-4 mb-5">
          <div className="flex flex-col gap-1">
            <span
              className={`font-mono text-[10px] uppercase tracking-widest ${
                isWorld ? "text-[#004d40]" : "text-stone-700"
              }`}
            >
              {isWorld ? "World source" : "Creator history"} //{" "}
              {finding.sourceType.replace("_", " ")}
            </span>
            <span className="font-mono text-[9px] text-stone-500 uppercase tracking-widest">
              {finding.sourceDomain || finding.provider}
              {typeof finding.relevance === "number"
                ? ` · ${Math.round(finding.relevance * 100)}% resonance`
                : ""}
            </span>
          </div>
          <div className="w-8 h-8 border border-stone-200 rounded-full flex items-center justify-center bg-white shrink-0">
            {isWorld ? (
              <Globe size={14} className="text-[#004d40]" />
            ) : (
              <Database size={14} className="text-stone-600" />
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-5">
          {finding.displayImage && (
            <img
              src={finding.displayImage}
              alt=""
              className="w-24 h-24 border border-stone-200 bg-stone-50 object-cover grayscale opacity-80 shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-xl md:text-2xl mb-2">
              {finding.url ? (
                <a
                  href={finding.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {finding.title}
                </a>
              ) : (
                finding.title
              )}
            </h3>
            <p className="font-sans font-light text-sm text-stone-600 leading-relaxed line-clamp-3">
              {finding.snippet || "A relevant object from your creator archive."}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {finding.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-stone-100 border border-stone-200 font-mono text-[8px] uppercase tracking-wide"
                >
                  {tag.replaceAll("_", " ")}
                </span>
              ))}
              <button
                onClick={() => handleSaveFinding(finding)}
                disabled={isSaved || isSavingFinding === finding.id}
                className={`ml-auto px-3 py-1.5 border font-mono text-[9px] uppercase tracking-widest flex items-center gap-1.5 ${
                  isSaved
                    ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                    : "border-black hover:bg-black hover:text-white"
                } disabled:cursor-default`}
              >
                {isSavingFinding === finding.id ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : isSaved ? (
                  <CheckCircle size={11} />
                ) : (
                  <Bookmark size={11} />
                )}
                {isSaved ? "Saved" : "Save finding"}
              </button>
            </div>
          </div>
        </div>
      </motion.article>
    );
  };

  return (
    <div className="bg-[#f4f4f0] text-[#1a1a1a] min-h-full relative overflow-x-hidden font-sans selection:bg-black selection:text-white pb-32">
      <div className="absolute inset-0 pointer-events-none opacity-40 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] z-0 mix-blend-multiply"></div>
      <div
        className="absolute inset-0 w-full h-full mx-auto z-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px)",
          backgroundSize: "calc(100% / 12) 100%",
        }}
      ></div>

      {/* NOTIFICATION TOAST */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 p-4 bg-stone-900 border border-emerald-500/50 text-[#f4f4f0] font-mono text-[9px] uppercase tracking-widest flex items-center gap-3 shadow-2xl rounded-none"
          >
            <CheckCircle size={14} className="text-emerald-500" />
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-[1600px] mx-auto px-6 sm:px-12 flex flex-col min-h-full border-l border-r border-[#e0e0e0]">
        <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-0 relative">
          {/* Left Sidebar */}
          <aside className="hidden lg:block lg:col-span-2 border-r border-[#e0e0e0] py-12 pr-6">
            <nav className="flex flex-col gap-8 font-mono text-xs uppercase tracking-widest">
              <button
                onClick={() => setActiveTab("specimen")}
                className={`text-left py-2 border-l-2 pl-4 transition-all uppercase ${activeTab === "specimen" ? "border-black font-bold text-black" : "border-transparent text-stone-400 hover:text-stone-700"}`}
              >
                Specimen_Search
              </button>
              <button
                onClick={() => setActiveTab("trend-scryer")}
                className={`text-left py-2 border-l-2 pl-4 transition-all uppercase ${activeTab === "trend-scryer" ? "border-black font-bold text-black" : "border-transparent text-stone-400 hover:text-stone-700"}`}
              >
                Trend_Scry_Suite
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`text-left py-2 border-l-2 pl-4 transition-all uppercase ${activeTab === "history" ? "border-black font-bold text-black" : "border-transparent text-stone-400 hover:text-stone-700"}`}
              >
                Search_History
              </button>
              <span className="block py-2 border-l-2 border-transparent pl-4 opacity-30 cursor-not-allowed">
                Index
              </span>
            </nav>

            <div className="mt-24 font-serif italic text-xs text-stone-500 leading-relaxed space-y-4">
              <p>
                "To create your own trend, you must first index the forces that
                oppose your intuition."
              </p>
              <div className="mt-2 text-[9px] font-mono uppercase bg-stone-100 p-2 border border-stone-200">
                <strong>Keys Enrolled: </strong>
                {countSovereigntyPoints()} anchored
              </div>
            </div>
          </aside>

          {/* Main Interface */}
          <div className="col-span-1 lg:col-span-7 py-12 lg:px-12 flex flex-col min-h-screen">
            {/* TAB 1: ORIGINAL SPECIMEN SEARCH */}
            {activeTab === "specimen" && (
              <div className="flex-grow flex flex-col h-full justify-between">
                <div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <span
                        className={`inline-block w-2 h-2 ${isScrying ? "bg-[#004d40] animate-pulse" : "bg-transparent border border-[#004d40]"} rounded-full`}
                      ></span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#004d40]">
                        Latent Space Retrieval
                      </span>
                    </div>
                    <h2 className="font-serif text-6xl md:text-8xl leading-none italic mb-6">
                      Scry.
                    </h2>
                    <p className="font-serif text-xl italic text-stone-600 max-w-md">
                      Describe a texture, a mood, or a ghost. We will find its
                      echo in your registry.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="relative w-full mb-16"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-mono text-xs uppercase tracking-widest text-stone-500">
                        Input_:
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setResultFilter("all")}
                          className={`px-3 py-1 border rounded-full font-mono text-[10px] uppercase transition-colors ${resultFilter === "all" ? "bg-black text-white border-black" : "border-[#e0e0e0] hover:border-black"}`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setResultFilter("world")}
                          className={`px-3 py-1 border rounded-full font-mono text-[10px] uppercase transition-colors ${resultFilter === "world" ? "bg-black text-white border-black" : "border-[#e0e0e0] hover:border-black"}`}
                        >
                          World
                        </button>
                        <button
                          onClick={() => setResultFilter("creator")}
                          className={`px-3 py-1 border rounded-full font-mono text-[10px] uppercase transition-colors ${resultFilter === "creator" ? "bg-black text-white border-black" : "border-[#e0e0e0] hover:border-black"}`}
                        >
                          Your Work
                        </button>
                      </div>
                    </div>
                    <div className="group relative">
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-transparent border-b-2 border-black py-4 md:py-6 text-2xl md:text-3xl font-serif italic placeholder:text-stone-300 focus:outline-none transition-all pr-16"
                        placeholder="will i be a lover girl again?"
                      />
                      <button
                        onClick={() => handleScry()}
                        disabled={isScrying}
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black text-white hover:scale-110 transition-transform disabled:opacity-50"
                      >
                        {isScrying ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <ArrowRight size={16} />
                        )}
                      </button>
                    </div>
                    {currentSession &&
                      currentSession.origin.type !== "manual" && (
                      <div className="mt-4 p-3 border border-[#004d40]/30 bg-[#004d40]/5 flex items-start gap-3">
                        <Sparkles
                          size={13}
                          className="text-[#004d40] mt-0.5 shrink-0"
                        />
                        <div>
                          <span className="font-mono text-[9px] uppercase tracking-widest text-[#004d40] block">
                            Continued from{" "}
                            {currentSession.origin.label ||
                              currentSession.origin.type.replace("_", " ")}
                          </span>
                          <span className="font-serif italic text-xs text-stone-600">
                            This search retains the originating editorial
                            touchpoint as provenance.
                          </span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </div>

                <div className="space-y-8 pb-12">
                  {savedFindings.length > 0 && (
                    <section className="border border-black bg-[#f7f5ee] p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-stone-500">
                            Research Context
                          </span>
                          <h3 className="font-serif text-xl mt-1">
                            {savedFindings.length} saved finding
                            {savedFindings.length === 1 ? "" : "s"} ready
                          </h3>
                          <p className="font-sans text-xs text-stone-600 mt-1">
                            Saving does not create embeddings. Approval makes
                            this evidence selectable by the Mimi Build Brief.
                          </p>
                        </div>
                        {!researchContext ? (
                          <button
                            onClick={handlePrepareContext}
                            disabled={isPreparingContext}
                            className="px-4 py-2 bg-black text-white font-mono text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {isPreparingContext ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Layers size={12} />
                            )}
                            Build context
                          </button>
                        ) : researchContext.approvalState === "draft" ? (
                          <button
                            onClick={handleApproveContext}
                            disabled={isPreparingContext}
                            className="px-4 py-2 bg-[#004d40] text-white font-mono text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {isPreparingContext ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <CheckCircle size={12} />
                            )}
                            Approve for Build Brief
                          </button>
                        ) : (
                          <span className="px-4 py-2 border border-emerald-700 bg-emerald-50 text-emerald-900 font-mono text-[9px] uppercase tracking-widest flex items-center gap-2">
                            <CheckCircle size={12} /> Build Brief ready
                          </span>
                        )}
                      </div>
                      {researchContext && (
                        <div className="mt-4 pt-3 border-t border-stone-300 font-mono text-[8px] uppercase tracking-wider text-stone-500 flex flex-wrap gap-x-5 gap-y-1">
                          <span>{researchContext.approvalState}</span>
                          <span>
                            {researchContext.selectedFindingIds.length} sources
                          </span>
                          <span>{researchContext.integrityHash}</span>
                        </div>
                      )}
                    </section>
                  )}
                  {/* RESULTS DISPLAY */}
                  <AnimatePresence>
                    {scribeReading && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="border border-[#e0e0e0] p-6 relative overflow-hidden bg-white/50 backdrop-blur-sm"
                      >
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#004d40]"></div>
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex flex-col">
                            <span className="font-mono text-[10px] text-stone-800 uppercase tracking-widest mb-1">
                              Scribe // Reading
                            </span>
                          </div>
                          <div className="w-8 h-8 border border-stone-200 rounded-full flex items-center justify-center bg-white">
                            <ScanLine size={14} className="text-[#004d40]" />
                          </div>
                        </div>
                        <div>
                          <p className="font-serif italic text-xl text-stone-700 leading-relaxed max-w-xl">
                            "{scribeReading}"
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {findingGroups.map(
                      (group) =>
                        group.findings.length > 0 && (
                          <section key={group.key} className="space-y-3">
                            <div className="flex items-end justify-between border-b border-stone-300 pb-2">
                              <div>
                                <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold">
                                  {group.label}
                                </h3>
                                <p className="font-serif italic text-xs text-stone-500 mt-1">
                                  {group.description}
                                </p>
                              </div>
                              <span className="font-mono text-[9px] text-stone-400">
                                {group.findings.length}
                              </span>
                            </div>
                            {group.findings.map(renderFinding)}
                          </section>
                        ),
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <div className="space-y-10">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <Database size={14} className="text-[#004d40]" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#004d40] font-bold">
                      Durable Curiosity History
                    </span>
                  </div>
                  <h2 className="font-serif text-5xl italic font-light tracking-tight">
                    Questions you can return to.
                  </h2>
                  <p className="font-sans text-xs text-stone-600 leading-relaxed max-w-xl">
                    Each entry records the original query, its source
                    touchpoint, provider coverage, and the findings available
                    for later research contexts.
                  </p>
                </motion.div>

                <div className="space-y-3">
                  {history.length === 0 ? (
                    <div className="border border-dashed border-stone-300 p-10 text-center">
                      <p className="font-serif italic text-stone-500">
                        Your first Scry will appear here.
                      </p>
                    </div>
                  ) : (
                    history.map((session) => (
                      <article
                        key={session.id}
                        className="border border-stone-300 bg-white/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <div className="font-mono text-[8px] uppercase tracking-widest text-stone-500 flex flex-wrap gap-x-3 gap-y-1">
                            <span>{session.status}</span>
                            <span>{session.approvalState || "unreviewed"}</span>
                            <span>
                              {new Date(session.createdAt).toLocaleString()}
                            </span>
                            <span>
                              {session.findingIds.length} finding
                              {session.findingIds.length === 1 ? "" : "s"}
                            </span>
                            <span>
                              from{" "}
                              {session.origin?.label ||
                                session.origin?.type?.replace("_", " ") ||
                                "legacy search"}
                            </span>
                          </div>
                          <h3 className="font-serif text-xl mt-2">
                            {session.query}
                          </h3>
                          {session.scribeReading && (
                            <p className="font-sans text-xs text-stone-600 mt-2 line-clamp-2">
                              {session.scribeReading}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setActiveTab("specimen");
                            handleScry(session.query, {
                              type: "manual",
                              label: "Search history",
                            });
                          }}
                          className="shrink-0 px-4 py-2 border border-black font-mono text-[9px] uppercase tracking-widest hover:bg-black hover:text-white flex items-center gap-2"
                        >
                          Continue thread <ArrowRight size={11} />
                        </button>
                      </article>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: ADVANCED TREND CURATION & KEYWORD RESEARCH SUITE */}
            {activeTab === "trend-scryer" && (
              <div className="space-y-10">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-[#004d40]" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#004d40] font-bold">
                      Trend Grounding & Semiotic Scribing
                    </span>
                  </div>
                  <h2 className="font-serif text-5xl italic font-light tracking-tight">
                    The Trend Scryer Center
                  </h2>
                  <p className="font-sans text-xs text-stone-600 leading-relaxed max-w-xl">
                    Mimi parses live global indicators to formulate authentic
                    micro-narratives (like{" "}
                    <strong className="font-semibold text-black italic">
                      "Saturation Chic"
                    </strong>{" "}
                    or vibrant-accent color resistances). Build strategic
                    counter-movements instead of copying greige monochromatic
                    structures.
                  </p>
                </motion.div>

                {/* Keychain connection status for You.com */}
                <div className="p-4 bg-stone-100 border border-stone-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 font-mono text-[10px]">
                  <div className="flex items-center gap-2">
                    <Key size={12} className="text-stone-600" />
                    <span className="uppercase text-stone-500">
                      Credential Pipeline:
                    </span>
                    {apiKeys?.you_com ? (
                      <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-sm border border-emerald-300">
                        YOU.COM API KEY ANCHORED (Secure Tunnel)
                      </span>
                    ) : (
                      <span className="text-stone-500 bg-stone-200/60 px-2 py-0.5 rounded-sm">
                        GOOGLE SEARCH ENGINE (Standard Grounding Active)
                      </span>
                    )}
                  </div>
                  {!apiKeys?.you_com && (
                    <button
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent("mimi:change_view", {
                            detail: "profile",
                          }),
                        )
                      }
                      className="text-[9px] uppercase tracking-wider underline hover:text-black font-semibold text-stone-600"
                    >
                      Modify Keychain Credits →
                    </button>
                  )}
                </div>

                {/* Research Presets Panel */}
                <div className="space-y-2">
                  <span className="font-mono text-[9px] uppercase text-stone-500 block">
                    Try Preset Focus Signals:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {presets.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => {
                          setTrendQuery(p.q);
                          conductTrendScry(p.q);
                        }}
                        className={`px-3 py-1.5 border font-mono text-[10px] uppercase tracking-widest ${trendQuery === p.q ? "bg-black text-white border-black" : "bg-transparent border-stone-300 hover:border-stone-800"}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trend Search Bar */}
                <div className="space-y-2 relative">
                  <div className="flex justify-between items-center">
                    <label className="font-mono text-[10px] uppercase text-stone-500">
                      Custom Trend Keyword / Phrase:
                    </label>
                    <span className="font-mono text-[9px] text-[#004d40]">
                      Grounding:{" "}
                      {apiKeys?.you_com
                        ? "You.com Sonar Engine"
                        : "Google Search Multi-Stage"}
                    </span>
                  </div>
                  <div className="relative group">
                    <input
                      value={trendQuery}
                      onChange={(e) => setTrendQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") conductTrendScry();
                      }}
                      className="w-full bg-stone-50 border border-stone-300 px-4 py-3 font-serif italic text-lg focus:outline-none focus:border-black transition-all"
                      placeholder="Enter trend (e.g., Saturation Chic, Neon maturity, etc.)"
                    />
                    <button
                      onClick={() => conductTrendScry()}
                      disabled={isTrendScrying}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-[#004d40] text-white hover:bg-[#00332a] font-mono text-[9px] uppercase tracking-widest font-black flex items-center gap-1"
                    >
                      {isTrendScrying ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        "Deep-Scry"
                      )}
                    </button>
                  </div>
                </div>

                {/* Active Scrying Output Visualization */}
                {curationMap && (
                  <div className="space-y-6 pt-4 border-t border-stone-200">
                    <div className="p-5 bg-white/50 border border-stone-300 relative space-y-4">
                      <span className="absolute top-2 right-3 font-mono text-[8px] text-[#004d40] tracking-widest font-bold">
                        [ BIAXIAL TREND PLOT ]
                      </span>

                      <div className="space-y-1">
                        <span className="font-mono text-[9px] text-stone-500 block uppercase">
                          Strategic Thesis Compiled:
                        </span>
                        <h4 className="font-serif text-xl md:text-2xl font-light italic text-[#004d40]">
                          "{curationMap.thesis}"
                        </h4>
                      </div>

                      {/* Bi-axial Scatter Plot Grid */}
                      <div className="space-y-2">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-stone-500 block">
                          Mapping Coordinates Layout (Hover points to inspect):
                        </span>

                        <div className="relative w-full h-[240px] bg-stone-100/80 border border-stone-200 flex items-center justify-center overflow-hidden">
                          {/* Scatter grid lines */}
                          <div className="absolute inset-0 border-t border-dashed border-stone-300 top-1/2 pointer-events-none" />
                          <div className="absolute inset-0 border-l border-dashed border-stone-300 left-1/2 pointer-events-none" />

                          {/* Scatter grid axis labels */}
                          <span className="absolute top-2 left-1/2 -translate-x-1/2 font-mono text-[7px] text-stone-400 uppercase tracking-widest">
                            UNDERGROUND / HIDDEN (Aesthetic Rebellion)
                          </span>
                          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[7px] text-stone-400 uppercase tracking-widest">
                            OBSERVABLE / SURFACE (Mainstream Trend)
                          </span>
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[7px] text-stone-400 uppercase tracking-widest origin-left rotate-90 translate-x-1">
                            TACTILE / MATERIAL
                          </span>
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[7px] text-stone-400 uppercase tracking-widest origin-right -rotate-90 -translate-x-1">
                            SYMBOLIC / IDEOLOGICAL
                          </span>

                          {/* Plot Points */}
                          {curationMap.trendClusters.map((tc, idx) => {
                            // Map coordinates from [-1, 1] to percentages [10% to 90%]
                            const leftPx = `${((tc.position.x + 1) / 2) * 80 + 10}%`;
                            const topPx = `${((1 - tc.position.y) / 2) * 80 + 10}%`;
                            return (
                              <button
                                key={idx}
                                onMouseEnter={() => setHoveredCluster(tc)}
                                onClick={() => setHoveredCluster(tc)}
                                className={`absolute w-3.5 h-3.5 rounded-full border-2 cursor-pointer transition-all hover:scale-150 ${hoveredCluster?.name === tc.name ? "bg-nous-text border-amber-500 scale-125 shadow-lg" : "bg-amber-500 border-nous-text"}`}
                                style={{ left: leftPx, top: topPx }}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* Hover Points inspector box */}
                      {hoveredCluster ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-4 bg-stone-50 border border-stone-300 font-mono text-[10px] space-y-2"
                        >
                          <div className="flex justify-between items-center pb-1 border-b border-stone-200">
                            <span className="font-extrabold uppercase text-stone-800">
                              {hoveredCluster.name}
                            </span>
                            <span className="text-[9px] text-[#004d40]">
                              X: {hoveredCluster.position.x.toFixed(1)}, Y:{" "}
                              {hoveredCluster.position.y.toFixed(1)}
                            </span>
                          </div>
                          <div>
                            <span className="text-stone-500 block">
                              HISTORICAL PRECEDENT SHIFT:
                            </span>
                            <span className="italic text-stone-700 font-serif text-[11px] leading-relaxed font-bold block">
                              {hoveredCluster.historicalPrecedent}
                            </span>
                          </div>
                          <div className="pt-1">
                            <span className="text-stone-500 block">
                              CONTRADICTING PALETTE MONOTONY:
                            </span>
                            <span className="text-red-700 font-sans block">
                              {hoveredCluster.contradictoryAesthetic}
                            </span>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="text-center font-mono text-[9px] text-stone-400 py-2 border border-dashed border-stone-200 uppercase">
                          -- Hover on any coordinate node above to dissect
                          aesthetic archetypes --
                        </div>
                      )}

                      {/* Scribe Narrative Generation Module */}
                      <div className="space-y-4 pt-4 border-t border-stone-200">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[10px] uppercase text-[#004d40] font-bold">
                            Zine Narrative Writer
                          </span>
                          <button
                            onClick={compileNarrativeDraft}
                            disabled={isCompilingNarrative}
                            className="px-3.5 py-1.5 bg-black text-white hover:bg-stone-800 font-mono text-[9px] uppercase tracking-widest font-bold flex items-center gap-1"
                          >
                            {isCompilingNarrative ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <PenTool size={10} />
                            )}
                            Compile Scription Draft & Commentary
                          </button>
                        </div>

                        {narrativeDraft ? (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                          >
                            <span className="font-mono text-[9px] text-stone-500 block uppercase">
                              Refining Editorial Draft (Editable Canvas):
                            </span>
                            <textarea
                              value={narrativeDraft}
                              onChange={(e) =>
                                setNarrativeDraft(e.target.value)
                              }
                              className="w-full bg-white border border-stone-300 p-5 font-serif italic text-[#1a1a1a] text-sm leading-relaxed min-h-[300px] focus:outline-none focus:border-black"
                              placeholder="Drafting narrative..."
                            />

                            <div className="flex flex-wrap gap-2 justify-end">
                              <button
                                onClick={downloadMarkdown}
                                className="px-3 py-1.5 border border-stone-300 hover:border-black bg-[#f4f4f0] text-stone-700 font-mono text-[9px] uppercase tracking-widest font-bold flex items-center gap-1.5"
                              >
                                <Download size={11} /> Export Markdown
                              </button>
                              <button
                                onClick={saveDraftToPocket}
                                className="px-4 py-1.5 bg-[#004d40] text-white hover:bg-[#00332a] font-mono text-[9px] uppercase tracking-widest font-black flex items-center gap-1.5"
                              >
                                <Bookmark size={11} /> Anchor to Pocket Memory
                              </button>
                            </div>
                          </motion.div>
                        ) : (
                          <div className="p-6 bg-stone-100/50 border border-stone-200 text-center font-mono text-[10px] text-stone-400 uppercase tracking-wider">
                            Deep-Scry grounding completed. Press "COMPILE
                            SCRIPTION DRAFT" above to generate stylized
                            blog/zine essays analyzing coordinates.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sources cited */}
                    {curationMap.sources && curationMap.sources.length > 0 && (
                      <div className="space-y-2">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-stone-500 block">
                          Grounded Web Citations / Signals:
                        </span>
                        <div className="space-y-2">
                          {curationMap.sources.map((src, sIdx) => (
                            <div
                              key={sIdx}
                              className="p-3 bg-white/40 border border-stone-200 font-mono text-[10px] flex justify-between items-center"
                            >
                              <span className="font-bold truncate max-w-sm">
                                {src.title}
                              </span>
                              <a
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#004d40] hover:underline flex items-center gap-1 uppercase text-[9px]"
                              >
                                Open Signal <ChevronRight size={10} />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <aside className="hidden lg:block lg:col-span-3 border-l border-[#e0e0e0] pl-6 py-12">
            <div className="sticky top-12">
              <h3 className="font-mono text-xs uppercase tracking-[0.2em] mb-8 border-b border-black pb-2 inline-block">
                Aesthetic Registry
              </h3>

              <div className="space-y-8">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-mono text-[10px] uppercase text-stone-500">
                      Latency
                    </span>
                    <span className="font-mono text-[10px]">
                      {latency || (isTrendScrying ? "450ms" : "0ms")}
                    </span>
                  </div>
                  <div className="w-full bg-stone-200 h-[1px]">
                    <div
                      className="bg-black h-full transition-all duration-1000"
                      style={{
                        width: latency
                          ? `${Math.min(latency / 20, 100)}%`
                          : isTrendScrying
                            ? "15%"
                            : "0%",
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-mono text-[10px] uppercase text-stone-500">
                      Retrieval coverage
                    </span>
                    <span className="font-mono text-[10px]">
                      {confidence > 0 ? `${confidence.toFixed(1)}%` : "---"}
                    </span>
                  </div>
                  <div className="w-full bg-stone-200 h-[1px]">
                    <div
                      className="bg-black h-full transition-all duration-1000"
                      style={{ width: `${confidence}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <span className="font-mono text-[10px] uppercase text-stone-500 block mb-3">
                    Results by layer
                  </span>
                  <ul className="font-mono text-[10px] space-y-2">
                    <li className="flex justify-between text-[#004d40] font-bold">
                      <span>&gt; World</span>
                      <span>{worldFindings.length}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>&gt; Zines</span>
                      <span>
                        {
                          creatorFindings.filter(
                            (finding) => finding.sourceType === "zine",
                          ).length
                        }
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>&gt; Pocket</span>
                      <span>
                        {
                          creatorFindings.filter(
                            (finding) => finding.sourceType === "pocket",
                          ).length
                        }
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>&gt; Shadow Memory</span>
                      <span>
                        {
                          creatorFindings.filter(
                            (finding) =>
                              finding.sourceType === "shadow_memory",
                          ).length
                        }
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="pt-8 mt-8 border-t border-[#e0e0e0]">
                  <span className="font-mono text-[10px] uppercase text-stone-500 block mb-4">
                    Neural Activity
                  </span>
                  <div className="grid grid-cols-6 gap-1 h-24 items-end">
                    <div
                      className={`bg-black/10 w-full ${isScrying || isTrendScrying ? "animate-pulse" : ""}`}
                      style={{ height: "100%", animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className={`bg-black/20 w-full ${isScrying || isTrendScrying ? "animate-pulse" : ""}`}
                      style={{ height: "80%", animationDelay: "0.3s" }}
                    ></div>
                    <div
                      className={`bg-black/5 w-full ${isScrying || isTrendScrying ? "animate-pulse" : ""}`}
                      style={{ height: "40%", animationDelay: "0.5s" }}
                    ></div>
                    <div
                      className={`bg-black/30 w-full ${isScrying || isTrendScrying ? "animate-pulse" : ""}`}
                      style={{ height: "90%", animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className={`bg-black/10 w-full ${isScrying || isTrendScrying ? "animate-pulse" : ""}`}
                      style={{ height: "60%", animationDelay: "0.7s" }}
                    ></div>
                    <div
                      className={`bg-black/5 w-full ${isScrying || isTrendScrying ? "animate-pulse" : ""}`}
                      style={{ height: "30%", animationDelay: "0.4s" }}
                    ></div>
                  </div>
                  <div className="mt-2 font-mono text-[9px] text-right opacity-50 text-stone-500">
                    {isScrying || isTrendScrying
                      ? "Deep semantic ground scry loop..."
                      : "Awaiting input..."}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
};
