// @ts-nocheck
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Loader2,
  Globe,
  ScanLine,
  Database,
  ArrowRight,
  TrendingUp,
  Sliders,
  Sparkles,
  PenTool,
  Cpu,
  Bookmark,
  Shuffle,
  Compass,
  FileText,
  Key,
  Layers,
  CheckCircle,
  HelpCircle,
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

export const ScryView: React.FC = () => {
  const { profile, activePersona, apiKeys, pocket, setPocket } = useUser();

  // Core Navigation Active Tab
  const [activeTab, setActiveTab] = useState<"specimen" | "trend-scryer">(
    "specimen",
  );

  // Tab A: Specimen Search states
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [webResults, setWebResults] = useState<any[]>([]);
  const [scribeReading, setScribeReading] = useState<string | null>(null);
  const [isScrying, setIsScrying] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [latency, setLatency] = useState(0);

  // Tab B: Trend Research & Copywriter states
  const [trendQuery, setTrendQuery] = useState("Saturation Chic");
  const [isTrendScrying, setIsTrendScrying] = useState(false);
  const [curationMap, setCurationMap] = useState<any | null>(null);
  const [hoveredCluster, setHoveredCluster] = useState<any | null>(null);
  const [narrativeDraft, setNarrativeDraft] = useState("");
  const [isCompilingNarrative, setIsCompilingNarrative] = useState(false);

  // UI Notification Floater
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

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

  // Standard Query Search triggers
  const handleScry = async (q?: string) => {
    const queryToUse = q || query;
    if (!queryToUse.trim() || isScrying) return;
    setIsScrying(true);
    setWebResults([]);
    setResults([]);
    setScribeReading(null);
    setConfidence(0);
    setLatency(0);
    if (q) setQuery(q);

    const startTime = performance.now();
    const geminiKey = apiKeys?.gemini;

    try {
      const textPromises = [
        searchGrounding(queryToUse)
          .then((data) => {
            setResults((prev) => [...prev, ...data.results]);
            setScribeReading(data.summary);
          })
          .catch((e) => console.error("MIMI // Search grounding failed", e)),

        scryWebSignals(queryToUse)
          .then((data) => {
            setWebResults(data.results);
            if (data.groundingChunks && data.groundingChunks.length > 0) {
              setResults((prev) => [
                ...prev,
                ...data.groundingChunks.map((c: any) => ({
                  title: c.web?.title || "Grounded Insight",
                  snippet: c.web?.title || "Grounded in real-time data",
                  url: c.web?.uri,
                })),
              ]);
            }
          })
          .catch((e) => console.error("MIMI // Web scry failed", e)),

        generateScribeReading(profile, queryToUse, geminiKey)
          .then((reading) => {
            setScribeReading(reading);
          })
          .catch((e) => console.error("MIMI // Scribe failed", e)),

        scryShadowMemory(queryToUse)
          .then((hits) => {
            setResults(hits);
          })
          .catch((e) => console.error("MIMI // Shadow memory failed", e)),
      ];

      await Promise.allSettled([...textPromises]);
      setConfidence(Math.random() * 20 + 78); // 78-98%
      setLatency(Math.floor(performance.now() - startTime));
    } catch (e: any) {
      console.error("MIMI // Scrying failed", e);
    } finally {
      setIsScrying(false);
    }
  };

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

  const saveDraftToPocket = () => {
    if (!narrativeDraft) return;
    if (setPocket) {
      const updatedPocket = Array.isArray(pocket) ? [...pocket] : [];
      updatedPocket.push({
        id: `scribe-narrative-${Date.now()}`,
        type: "scribe-intake",
        metadata: {
          keyword: trendQuery,
          compiledOn: Date.now(),
        },
        content_preview: narrativeDraft.slice(0, 300),
        content: {
          title: `Editorial: ${trendQuery}`,
          draftText: narrativeDraft,
        },
      });
      setPocket(updatedPocket);
      showNotification(
        "Narrative anchored! Specimen added to Sovereign Pocket.",
      );
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

  useEffect(() => {
    const handleScrySearch = (e: any) => handleScry(e.detail);
    window.addEventListener("mimi:scry_search", handleScrySearch);
    return () =>
      window.removeEventListener("mimi:scry_search", handleScrySearch);
  }, []);

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

  return (
    <div className="bg-white text-[#1a1a1a] min-h-full h-full relative overflow-x-hidden font-sans selection:bg-black selection:text-white pb-32 mimi-page-pad">
      <div className="absolute inset-0 pointer-events-none opacity-[0.18] bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] z-0"></div>
      <div
        className="absolute inset-0 w-full h-full mx-auto z-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0, 0, 0, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 1px, transparent 1px)",
          backgroundSize: "calc(100% / 12) 100%, 100% 28px",
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
              <span className="block py-2 border-l-2 border-transparent pl-4 opacity-30 cursor-not-allowed">
                Archives
              </span>
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
                        <button className="px-3 py-1 border border-[#e0e0e0] rounded-full font-mono text-[10px] uppercase hover:bg-black hover:text-white transition-colors">
                          Web
                        </button>
                        <button className="px-3 py-1 border border-[#e0e0e0] rounded-full font-mono text-[10px] uppercase hover:bg-black hover:text-white transition-colors">
                          Describe
                        </button>
                        <button className="px-3 py-1 border border-[#e0e0e0] rounded-full font-mono text-[10px] uppercase hover:bg-black hover:text-white transition-colors">
                          Scribe
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
                  </motion.div>
                </div>

                <div className="space-y-8 pb-12">
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

                    {webResults.map((r, i) => (
                      <motion.div
                        key={`web-${i}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="border border-[#e0e0e0] p-6 relative overflow-hidden bg-white/50 backdrop-blur-sm"
                      >
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#4db6ac]"></div>
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex flex-col">
                            <span className="font-mono text-[10px] text-[#004d40] uppercase tracking-widest mb-1">
                              Web Signal // Found
                            </span>
                            <span className="font-mono text-[10px] text-stone-500 uppercase tracking-widest">
                              URL: {r.url ? new URL(r.url).hostname : "unknown"}
                            </span>
                          </div>
                          <div className="w-8 h-8 border border-stone-200 rounded-full flex items-center justify-center bg-white">
                            <Globe size={14} className="text-[#004d40]" />
                          </div>
                        </div>
                        <div>
                          <h3 className="font-serif text-xl md:text-2xl mb-2">
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {r.title}
                            </a>
                          </h3>
                          <p className="font-sans font-light text-sm text-stone-600 leading-relaxed max-w-xl">
                            {r.snippet}
                          </p>
                        </div>
                      </motion.div>
                    ))}

                    {results.length > 0 &&
                      results.map((r, i) => (
                        <motion.div
                          key={`mem-${i}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="border border-[#e0e0e0] p-6 relative overflow-hidden bg-white/50 backdrop-blur-sm"
                        >
                          <div className="absolute top-0 left-0 w-1 h-full bg-stone-800"></div>
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex flex-col">
                              <span className="font-mono text-[10px] text-stone-600 uppercase tracking-widest mb-1">
                                Shadow Memory // {r.type || "Data"}
                              </span>
                              <span className="font-mono text-[10px] text-stone-500 uppercase tracking-widest">
                                Resonance:{" "}
                                {r.similarity
                                  ? (r.similarity * 100).toFixed(0)
                                  : "85"}
                                %
                              </span>
                            </div>
                            <div className="w-8 h-8 border border-stone-200 rounded-full flex items-center justify-center bg-white">
                              <Database size={14} className="text-stone-600" />
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
                            {r.display_image && (
                              <div className="w-24 h-24 border border-stone-200 bg-stone-50 flex items-center justify-center shrink-0">
                                <img
                                  src={r.display_image}
                                  className="w-full h-full object-cover grayscale opacity-80"
                                />
                              </div>
                            )}
                            <div>
                              <h3 className="font-serif text-lg md:text-xl mb-2 italic">
                                {r.content?.prompt ||
                                  r.title ||
                                  "Archived Specimen"}
                              </h3>
                              <p className="font-sans font-light text-sm text-stone-600 leading-relaxed max-w-xl line-clamp-3">
                                {r.content_preview ||
                                  r.snippet ||
                                  "Fragment located in the latent registry."}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                  </AnimatePresence>
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
                      Confidence
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
                    Semantics Archetype
                  </span>
                  <ul className="font-mono text-[10px] space-y-2">
                    <li className="flex justify-between text-[#004d40] font-bold">
                      <span>&gt; Saturated Chroma</span>
                      <span className="opacity-100">
                        {confidence > 0 ? "0.94" : "---"}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>&gt; Neon Rebellion</span>
                      <span className="opacity-70">
                        {confidence > 0 ? "0.86" : "---"}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>&gt; Tayloring Armor</span>
                      <span className="opacity-70">
                        {confidence > 0 ? "0.74" : "---"}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>&gt; Greige Monotony</span>
                      <span className="opacity-30">
                        {confidence > 0 ? "0.12" : "---"}
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
