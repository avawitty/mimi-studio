import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  Sparkles,
  Palette,
  Compass,
  FileText,
  TrendingUp,
  RefreshCw,
  Sliders,
  Award,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { auth } from "../../services/firebaseInit";
import { fetchUserZines } from "../../services/firebaseUtils";
import { ZineMetadata, ToneTag } from "../../types";

const CANONICAL_TONE_PALETTES: Record<string, string[]> = {
  chic: ["#0D0D0C", "#E5E5E2", "#A69E93", "#FFFFFF"],
  nostalgia: ["#5E503F", "#A9927D", "#EAD2AC", "#FFFFFF"],
  dream: ["#E8DBE8", "#C3A6C3", "#9D789D", "#F4F1F4"],
  unhinged: ["#FF3E3E", "#222222", "#FACC15", "#000000"],
  panic: ["#FF0055", "#111111", "#00FFAA", "#EEEEEE"],
  editorial: ["#1F2421", "#E7ECEF", "#94A3B8", "#FFFFFF"],
  research: ["#2E4057", "#F4D35E", "#EE964B", "#F9F7F3"],
  "Cinematic Witness": ["#1C1917", "#78716C", "#D6D3D1", "#F5F5F4"],
  "Editorial Stillness": ["#272522", "#8C8375", "#DCD5CC", "#F4F1ED"],
  "Romantic Interior": ["#3D1E1E", "#724E4E", "#D59B9B", "#F9EAEA"],
  "Structured Desire": ["#0F172A", "#475569", "#94A3B8", "#F8FAFC"],
  "Documentary B&W": ["#000000", "#404040", "#A3A3A3", "#FFFFFF"],
  CONTENT: ["#172554", "#3b82f6", "#93c5fd", "#eff6ff"],
  SHADOW: ["#111827", "#1f2937", "#4b5563", "#9ca3af"],
  SIGNAL: ["#14532d", "#22c55e", "#86efac", "#f0fdf4"],
  ECHO: ["#312e81", "#6366f1", "#a5b4fc", "#e0e7ff"],
  MANIFESTO: ["#701a75", "#d946ef", "#f5d0fe", "#fdf4ff"],
  SHARD: ["#7c2d12", "#ea580c", "#ffedd5", "#fff7ed"],
  DOSSIER: ["#1e293b", "#64748b", "#cbd5e1", "#f8fafc"],
  PROMPT: ["#115e59", "#0d9488", "#99f6e4", "#f0fdfa"],
  RAW: ["#451a03", "#d97706", "#fef3c7", "#fffbeb"],
  VINTAGE: ["#4c0519", "#db2777", "#fce7f3", "#fdf2f8"],
  CONTRARY: ["#422006", "#b45309", "#fef3c7", "#fffbeb"],
};

export const AestheticIntelligenceChamber: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [zines, setZines] = useState<ZineMetadata[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "tones" | "chromatics" | "density">("overview");

  const loadData = async () => {
    setLoading(true);
    try {
      const uid = auth.currentUser?.uid || "ghost";
      const userZines = await fetchUserZines(uid, true);
      setZines(userZines);
    } catch (e) {
      console.error("MIMI // Error loading zines for aesthetic intelligence:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Use elegant presets if user has no generated zines yet (so the UI looks premium from start)
  const isDemo = zines.length === 0;

  const demoZines: Partial<ZineMetadata>[] = [
    {
      title: "Atmospheric Dissolve",
      tone: "chic" as ToneTag,
      createdAt: Date.now() - 3600000 * 24 * 5,
      content: {
        meta: { mode: "editorial", intent: "minimal design", timestamp: Date.now() },
        taste_context: { active_archetype: "The Curator", active_palette: ["#1C1917", "#78716C", "#D6D3D1", "#F5F5F4"] },
        structure: { hero_prompt: "cosmic dust", pages: [1, 2, 3, 4] as any },
        visual_guidance: { strict_palette: ["#1C1917", "#78716C"], negative_prompt: "", composition_density: 3 },
      },
    },
    {
      title: "Sovereign Subversion",
      tone: "unhinged" as ToneTag,
      createdAt: Date.now() - 3600000 * 24 * 3,
      content: {
        meta: { mode: "research", intent: "brutalist design", timestamp: Date.now() },
        taste_context: { active_archetype: "The Maverick", active_palette: ["#FF3E3E", "#222222", "#FFFFFF"] },
        structure: { hero_prompt: "glitch concrete", pages: [1, 2, 3, 4, 5, 6] as any },
        visual_guidance: { strict_palette: ["#FF3E3E", "#222222"], negative_prompt: "", composition_density: 8 },
      },
    },
    {
      title: "Romantic Ruin",
      tone: "Romantic Interior" as ToneTag,
      createdAt: Date.now() - 3600000 * 24 * 1,
      content: {
        meta: { mode: "editorial", intent: "poetic narrative", timestamp: Date.now() },
        taste_context: { active_archetype: "The Dreamer", active_palette: ["#3D1E1E", "#724E4E", "#F9EAEA"] },
        structure: { hero_prompt: "decayed rose petals", pages: [1, 2, 3, 4, 5] as any },
        visual_guidance: { strict_palette: ["#3D1E1E", "#D59B9B"], negative_prompt: "", composition_density: 5 },
      },
    },
  ];

  const activeZines = isDemo ? (demoZines as ZineMetadata[]) : zines;

  // Process Tones
  const toneCounts: Record<string, number> = {};
  activeZines.forEach((z) => {
    const t = z.tone || "editorial";
    toneCounts[t] = (toneCounts[t] || 0) + 1;
  });

  const toneChartData = Object.entries(toneCounts).map(([name, count]) => ({
    name: name.toUpperCase(),
    value: count,
  }));

  // Process Chromatics (Color extraction)
  const colorCounts: Record<string, number> = {};
  activeZines.forEach((z) => {
    let palette =
      z.content?.taste_context?.active_palette ||
      z.content?.visual_guidance?.strict_palette ||
      [];
    
    // If no colors, map from tone
    if (palette.length === 0 && z.tone) {
      palette = CANONICAL_TONE_PALETTES[z.tone] || ["#18181B", "#71717A", "#E4E4E7", "#FFFFFF"];
    }

    palette.forEach((color) => {
      if (color.startsWith("#") && color.length === 7) {
        const uppercaseColor = color.toUpperCase();
        colorCounts[uppercaseColor] = (colorCounts[uppercaseColor] || 0) + 1;
      }
    });
  });

  // If no colors at all, fallback
  if (Object.keys(colorCounts).length === 0) {
    colorCounts["#0D0D0C"] = 3;
    colorCounts["#E5E5E2"] = 2;
    colorCounts["#A69E93"] = 1;
    colorCounts["#FFFFFF"] = 4;
  }

  const chromaticsChartData = Object.entries(colorCounts)
    .map(([color, count]) => ({
      name: color,
      value: count,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // Show top 10 colors

  // Process Density over time
  const densityChartData = activeZines
    .map((z) => {
      const density = z.content?.visual_guidance?.composition_density || 5;
      const date = new Date(z.timestamp || z.createdAt || Date.now()).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      return {
        name: z.title || "Untitled Zine",
        date,
        density,
        pages: z.content?.pages?.length || z.content?.structure?.pages?.length || 4,
      };
    })
    .reverse(); // chronological order

  // Aggregate stats
  const totalAnalyzed = activeZines.length;
  const dominantTone =
    Object.entries(toneCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "editorial";
  const dominantColor = chromaticsChartData[0]?.name || "#000000";
  const avgDensity = (
    activeZines.reduce((acc, z) => acc + (z.content?.visual_guidance?.composition_density || 5), 0) /
    totalAnalyzed
  ).toFixed(1);

  return (
    <div className="w-full h-full flex flex-col bg-[#FAF9F5] dark:bg-[#0C0A09] text-stone-900 dark:text-stone-100 overflow-y-auto no-scrollbar">
      {/* Header Panel */}
      <div className="p-8 border-b border-stone-200 dark:border-stone-850 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.25em] bg-amber-500/10 text-amber-600 dark:text-amber-500 px-2 py-0.5 border border-amber-500/20 font-black">
              Tailor // Diagnostics
            </span>
            {isDemo && (
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] bg-stone-100 dark:bg-stone-900 text-stone-400 px-2 py-0.5 border border-stone-200 dark:border-stone-800 font-extrabold">
                Demo Sandbox
              </span>
            )}
          </div>
          <h1 className="font-serif italic text-3xl md:text-4xl text-stone-900 dark:text-stone-100">
            Profile Diagnostics
          </h1>
          <p className="font-sans text-xs text-stone-500 dark:text-stone-400 max-w-2xl">
            Compare published work with the active Tailor profile. Mimi reports chromatic,
            compositional, and conceptual drift without silently rewriting your creative rules.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 transition-colors font-mono text-[10px] uppercase tracking-widest font-black"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          RE-CALIBRATE
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="px-8 border-b border-stone-200 dark:border-stone-850 flex items-center gap-6 shrink-0 bg-stone-50/50 dark:bg-stone-900/10">
        {(["overview", "tones", "chromatics", "density"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-4 font-mono text-[9px] uppercase tracking-[0.2em] relative transition-colors font-bold ${
              activeTab === tab
                ? "text-stone-950 dark:text-stone-100"
                : "text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <motion.div
                layoutId="aesthetic-active-tab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500"
              />
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12">
          <div className="w-12 h-12 border border-dotted border-amber-500/50 rounded-full animate-spin flex items-center justify-center mb-4">
            <Sparkles size={16} className="text-amber-500" />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-400 animate-pulse">
            Decompressing semantic indices...
          </span>
        </div>
      ) : (
        <div className="p-8 flex-1 space-y-8">
          {isDemo && (
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 text-stone-600 dark:text-stone-300 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="font-serif italic text-sm">Welcome to your diagnostic canvas.</p>
                <p className="font-sans text-[11px] leading-relaxed text-stone-400">
                  You haven&apos;t generated any zines yet in this workspace. Below is an simulation of how Mimi analyzes zine signatures. Create some publications in the <strong>Worktable</strong> to begin real-time telemetry!
                </p>
              </div>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("mimi:change_view", { detail: "studio" }));
                }}
                className="self-start sm:self-center px-3.5 py-2 bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-950 font-mono text-[9px] uppercase tracking-widest font-black hover:opacity-90 transition-all rounded-sm shrink-0"
              >
                GO TO WORKTABLE
              </button>
            </div>
          )}

          {/* Tab Contents */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Stats Panel */}
              <div className="lg:col-span-1 space-y-6">
                <div className="p-6 bg-white dark:bg-[#12110F] border border-stone-200 dark:border-stone-850 rounded-sm shadow-sm space-y-4">
                  <h3 className="font-serif italic text-lg border-b border-stone-100 dark:border-stone-900 pb-2 flex items-center gap-2">
                    <Compass size={16} className="text-amber-500" />
                    Taste Diagnosis
                  </h3>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-stone-100 dark:border-stone-900">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-stone-400">
                        ZINES COMPREHENDED
                      </span>
                      <span className="font-serif text-lg font-bold">{totalAnalyzed}</span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-stone-100 dark:border-stone-900">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-stone-400">
                        DOMINANT TONE
                      </span>
                      <span className="font-mono text-xs uppercase tracking-wider text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-sm">
                        {dominantTone}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-stone-100 dark:border-stone-900">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-stone-400">
                        PRIMARY PALETTE ANCHOR
                      </span>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3.5 h-3.5 border border-stone-200 rounded-full"
                          style={{ backgroundColor: dominantColor }}
                        />
                        <span className="font-mono text-xs tracking-tight">{dominantColor}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-stone-100 dark:border-stone-900">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-stone-400">
                        AVERAGE DENSITY
                      </span>
                      <span className="font-mono text-xs font-bold">{avgDensity} / 10</span>
                    </div>
                  </div>
                </div>

                {/* Aesthetic Recommendation */}
                <div className="p-6 bg-stone-900 text-stone-100 rounded-sm shadow-lg space-y-3 relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 pointer-events-none">
                    <Palette size={140} />
                  </div>
                  <h4 className="font-mono text-[9px] uppercase tracking-[0.2em] text-amber-400 font-black flex items-center gap-2">
                    <Award size={12} />
                    MIMI DIRECTIVE
                  </h4>
                  <p className="font-serif italic text-base leading-relaxed">
                    &ldquo;Your alignment leans heavily towards <span className="text-amber-400 capitalize">{dominantTone}</span> aesthetics, characterized by a refined balance of dense copy blocks and high chromatic discipline.&rdquo;
                  </p>
                  <p className="font-sans text-[10px] text-stone-400 leading-normal pt-2 border-t border-stone-800">
                    Try generating an &ldquo;Unhinged&rdquo; zine to expand your taste envelope and build fresh cognitive vectors.
                  </p>
                </div>
              </div>

              {/* Graphic Highlights */}
              <div className="lg:col-span-2 space-y-6">
                <div className="p-6 bg-white dark:bg-[#12110F] border border-stone-200 dark:border-stone-850 rounded-sm shadow-sm space-y-6">
                  <h3 className="font-serif italic text-lg flex items-center gap-2">
                    <TrendingUp size={16} className="text-amber-500" />
                    Chromatic & Density Footprint
                  </h3>

                  {/* Aesthetic Tones chart */}
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={toneChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 9, fontFamily: "monospace", fill: "#78716c" }}
                        />
                        <YAxis
                          tick={{ fontSize: 9, fontFamily: "monospace", fill: "#78716c" }}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1c1917",
                            border: "none",
                            borderRadius: "2px",
                            color: "#fff",
                            fontFamily: "monospace",
                            fontSize: "10px",
                          }}
                        />
                        <Bar dataKey="value" fill="#d97706" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Tiny Table list */}
                <div className="bg-white dark:bg-[#12110F] border border-stone-200 dark:border-stone-850 rounded-sm shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-stone-200 dark:border-stone-850 bg-stone-50/50 dark:bg-stone-900/30 flex items-center justify-between">
                    <h3 className="font-serif italic text-sm flex items-center gap-2">
                      <FileText size={14} className="text-stone-400" />
                      Analyzed Publications History
                    </h3>
                    <span className="font-mono text-[8px] uppercase text-stone-400 font-extrabold">
                      {totalAnalyzed} ZINES
                    </span>
                  </div>
                  <div className="divide-y divide-stone-100 dark:divide-stone-900">
                    {activeZines.slice(0, 5).map((z, idx) => (
                      <div
                        key={idx}
                        className="p-4 flex items-center justify-between hover:bg-stone-50/30 dark:hover:bg-stone-900/10 transition-all"
                      >
                        <div className="space-y-1">
                          <p className="font-serif text-sm text-stone-900 dark:text-stone-100 font-bold">
                            {z.title || "Untitled Fragment"}
                          </p>
                          <p className="font-mono text-[8px] uppercase tracking-wider text-stone-400">
                            {new Date(z.timestamp || z.createdAt || Date.now()).toLocaleDateString("en-US")} • {z.content?.meta?.mode || "editorial"}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="font-mono text-[9px] uppercase tracking-wider bg-stone-100 dark:bg-stone-900 px-2.5 py-0.5 border border-stone-200 dark:border-stone-800 rounded-sm">
                            {z.tone || "editorial"}
                          </span>
                          <div className="flex items-center -space-x-1.5">
                            {((z.content?.taste_context?.active_palette ||
                              z.content?.visual_guidance?.strict_palette ||
                              CANONICAL_TONE_PALETTES[z.tone || "editorial"] ||
                              []) as string[]).slice(0, 3).map((col, cIdx) => (
                              <div
                                key={cIdx}
                                className="w-4 h-4 rounded-full border border-white dark:border-stone-950 shadow-sm"
                                style={{ backgroundColor: col }}
                                title={col}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "tones" && (
            <div className="bg-white dark:bg-[#12110F] border border-stone-200 dark:border-stone-850 p-6 rounded-sm shadow-sm space-y-6">
              <div className="border-b border-stone-100 dark:border-stone-900 pb-4">
                <h3 className="font-serif italic text-xl">Aesthetic Tone Distribution</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-sans mt-1">
                  Comparing the semantic emotional/artistic modes assigned to your generated booklets.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                <div className="md:col-span-2 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={toneChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 9, fontFamily: "monospace", fill: "#78716c" }}
                      />
                      <YAxis tick={{ fontSize: 9, fontFamily: "monospace", fill: "#78716c" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1c1917",
                          border: "none",
                          borderRadius: "2px",
                          color: "#fff",
                          fontFamily: "monospace",
                          fontSize: "10px",
                        }}
                      />
                      <Bar dataKey="value" fill="#d97706" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="md:col-span-1 space-y-4">
                  <h4 className="font-mono text-[9px] uppercase tracking-widest text-stone-400 border-b border-stone-100 dark:border-stone-900 pb-1 font-bold">
                    SEMANTIC MATRIX
                  </h4>
                  <div className="space-y-2">
                    {toneChartData.map((t, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="font-mono text-stone-600 dark:text-stone-300">
                          {t.name}
                        </span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-stone-400">({t.value})</span>
                          <span className="font-bold text-amber-500">
                            {((t.value / totalAnalyzed) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "chromatics" && (
            <div className="bg-white dark:bg-[#12110F] border border-stone-200 dark:border-stone-850 p-6 rounded-sm shadow-sm space-y-6">
              <div className="border-b border-stone-100 dark:border-stone-900 pb-4">
                <h3 className="font-serif italic text-xl">Color Palette Frequency Spectra</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-sans mt-1">
                  Aggregation of active hexadecimal codes extracted from your previous layout configurations.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chromaticsChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {chromaticsChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.name} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1c1917",
                          border: "none",
                          borderRadius: "2px",
                          color: "#fff",
                          fontFamily: "monospace",
                          fontSize: "10px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                  <h4 className="font-mono text-[9px] uppercase tracking-widest text-stone-400 border-b border-stone-100 dark:border-stone-900 pb-1 font-bold">
                    CHROMATIC DOMINANCE
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {chromaticsChartData.map((color, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 bg-stone-50 dark:bg-stone-900/40 border border-stone-100 dark:border-stone-850 rounded-sm"
                      >
                        <div
                          className="w-4 h-4 rounded-sm border border-stone-200/50"
                          style={{ backgroundColor: color.name }}
                        />
                        <div className="font-mono text-[10px] space-y-0.5">
                          <p className="font-bold tracking-tighter text-stone-900 dark:text-stone-100">
                            {color.name}
                          </p>
                          <p className="text-stone-400">used {color.value} times</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "density" && (
            <div className="bg-white dark:bg-[#12110F] border border-stone-200 dark:border-stone-850 p-6 rounded-sm shadow-sm space-y-6">
              <div className="border-b border-stone-100 dark:border-stone-900 pb-4">
                <h3 className="font-serif italic text-xl">Composition Density & Pages Timeline</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-sans mt-1">
                  How density settings and content structural volumes fluctuate from project to project.
                </p>
              </div>

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={densityChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 9, fontFamily: "monospace", fill: "#78716c" }}
                    />
                    <YAxis tick={{ fontSize: 9, fontFamily: "monospace", fill: "#78716c" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1c1917",
                        border: "none",
                        borderRadius: "2px",
                        color: "#fff",
                        fontFamily: "monospace",
                        fontSize: "10px",
                      }}
                    />
                    <Legend
                      wrapperStyle={{
                        fontSize: "9px",
                        fontFamily: "monospace",
                        paddingTop: "10px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="density"
                      stroke="#d97706"
                      name="COMPOSITION DENSITY"
                      strokeWidth={2}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="pages"
                      stroke="#3b82f6"
                      name="PAGES COUNT"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
