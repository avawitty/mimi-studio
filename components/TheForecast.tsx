import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Activity,
  Brain,
  Building2,
  CloudRain,
  Compass,
  ExternalLink,
  Flame,
  Link2,
  Loader2,
  Navigation,
  Radio,
  Snowflake,
  Sparkles,
  Sun,
  Target,
  ThermometerSun,
  User,
  Wind,
} from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { ChamberShell } from "./chambers/ChamberShell";
import {
  FORECAST_CHAMBER_MODULE_ID,
  FORECAST_COPY,
  FORECAST_HANDOFF_TARGETS,
} from "../lib/forecastChamberContract";
import {
  fetchContentForecast,
  type ResearchSynthesisResponse,
} from "../services/researchService";
import {
  buildForecastReport,
  loadApprovedFeedEntries,
  loadMeanMedianModeReport,
} from "../services/collective";
import type { ForecastReport } from "../schemas/collectiveIntelligenceContracts";
import type { MeanMedianModeReport } from "../schemas/collectiveIntelligenceContracts";
import { ForecastObservedPanel } from "./forecast/ForecastObservedPanel";

type ForecastScope = "personal" | "company";
type ForecastVector = "overview" | "content" | "culture";

const WEATHER_ICONS: Record<string, React.ReactNode> = {
  rotting: <CloudRain size={48} className="text-nous-text opacity-70" />,
  blooming: <Sun size={48} className="text-nous-text opacity-90" />,
  frozen: <Snowflake size={48} className="text-nous-text opacity-60" />,
  burning: <Flame size={48} className="text-nous-text animate-pulse" />,
};

const WEATHER_DESCRIPTORS: Record<string, string> = {
  rotting: "Deconstructive / Composting old aesthetics.",
  blooming: "Generative / Rapid aesthetic synthesis.",
  frozen: "Stagnant / Archival preservation mode.",
  burning: "High-entropy / Radical reinvention.",
};

const VECTOR_TABS: { id: ForecastVector; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <Radio size={12} /> },
  { id: "content", label: "Content", icon: <Target size={12} /> },
  { id: "culture", label: "Cultural", icon: <Brain size={12} /> },
];

export const TheForecast: React.FC<{
  navigate?: (path: string) => void;
}> = ({ navigate }) => {
  const { user, profile, apiKeys } = useUser();
  const [forecastingScope, setForecastingScope] = useState<ForecastScope>("personal");
  const [selectedVector, setSelectedVector] = useState<ForecastVector>(
    user ? "overview" : "culture",
  );
  const [contentForecast, setContentForecast] = useState<ResearchSynthesisResponse | null>(null);
  const [cultureReport, setCultureReport] = useState<ForecastReport | null>(null);
  const [isPingingLabs, setIsPingingLabs] = useState(false);

  useEffect(() => {
    if (!user && selectedVector !== "culture") {
      setSelectedVector("culture");
    }
  }, [user, selectedVector]);

  useEffect(() => {
    if (selectedVector !== "content" || contentForecast) return;
    let cancelled = false;
    setIsPingingLabs(true);
    void fetchContentForecast(apiKeys)
      .then((res) => {
        if (cancelled) return;
        setContentForecast(res);
      })
      .finally(() => {
        if (!cancelled) setIsPingingLabs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedVector, contentForecast, apiKeys]);

  useEffect(() => {
    if (selectedVector !== "culture") return;
    let cancelled = false;

    const composeCulture = (
      observed: MeanMedianModeReport,
      external: ResearchSynthesisResponse | null | undefined,
    ) => {
      const feedEntryCount = loadApprovedFeedEntries().length;
      setCultureReport(
        buildForecastReport({
          observed,
          external,
          feedEntryCount,
          runId: `forecast-culture-${observed.runId}`,
        }),
      );
    };

    void (async () => {
      const { fetchLiveMeanMedianModeReport } = await import("../services/collective");
      const live = await fetchLiveMeanMedianModeReport({ days: 7 });
      const observed = live?.report ?? loadMeanMedianModeReport("empty");
      composeCulture(observed, contentForecast);

      if (contentForecast || !user) return;

      const external = await fetchContentForecast(apiKeys);
      if (cancelled) return;
      composeCulture(observed, external);
      setContentForecast(external);
    })().catch(() => {
      /* keep empty MMM report */
    });

    return () => {
      cancelled = true;
    };
  }, [selectedVector, contentForecast, apiKeys, user]);

  const go = (view: string) => {
    if (navigate) {
      navigate(`/${view}`);
      return;
    }
    window.location.assign(`/${view}`);
  };

  const currentSeason = profile?.currentSeason || "rotting";
  const dna = profile?.aestheticDNA || null;
  const geo = profile?.geoProfile || null;
  const tasteVector = profile?.tasteVector || null;
  const vectorEntropy = Number(
    (profile as { aestheticVector?: { entropy?: number } } | null)?.aestheticVector
      ?.entropy,
  );
  const driftScore =
    typeof geo?.driftScore === "number" && Number.isFinite(geo.driftScore)
      ? geo.driftScore
      : Number.isFinite(vectorEntropy)
        ? Math.round(Math.min(100, Math.max(0, vectorEntropy * 100)))
        : null;
  const driftDirection =
    driftScore == null
      ? "Insufficient Signal"
      : driftScore > 50
        ? "Severe Turbulence"
        : "Stable Micro-Climate";

  const contentUnavailable =
    !!contentForecast &&
    (contentForecast.provider === "Unavailable" || contentForecast.trends.length === 0);

  return (
    <ChamberShell
      moduleId={FORECAST_CHAMBER_MODULE_ID}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {FORECAST_HANDOFF_TARGETS.map((target) => (
            <button
              key={target.view}
              type="button"
              onClick={() => go(target.view)}
              className="px-3 py-1.5 border border-nous-border text-nous-subtle font-mono text-[8px] uppercase tracking-widest hover:text-nous-text hover:border-nous-text/40"
            >
              {target.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="h-full overflow-y-auto bg-nous-base text-nous-text">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6">
          <div className="space-y-2 max-w-2xl">
            <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-nous-subtle">
              Aesthetic Meteorology
            </p>
            <p className="font-serif italic text-xl md:text-2xl text-nous-text leading-relaxed">
              {FORECAST_COPY.thesis}
            </p>
          </div>

          <>
              {user ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-nous-border pb-4">
                <div
                  className="inline-flex w-full sm:w-auto border border-nous-border"
                  role="group"
                  aria-label="Forecasting scope"
                >
                  <button
                    type="button"
                    onClick={() => setForecastingScope("personal")}
                    className={`flex-1 sm:flex-none px-3 py-2 font-mono text-[9px] uppercase tracking-widest inline-flex items-center justify-center gap-1.5 ${
                      forecastingScope === "personal"
                        ? "bg-nous-text text-nous-base"
                        : "bg-nous-surface text-nous-subtle hover:text-nous-text"
                    }`}
                  >
                    <User size={12} /> Personal
                  </button>
                  <button
                    type="button"
                    onClick={() => setForecastingScope("company")}
                    className={`flex-1 sm:flex-none px-3 py-2 font-mono text-[9px] uppercase tracking-widest inline-flex items-center justify-center gap-1.5 border-l border-nous-border ${
                      forecastingScope === "company"
                        ? "bg-nous-text text-nous-base"
                        : "bg-nous-surface text-nous-subtle hover:text-nous-text"
                    }`}
                  >
                    <Building2 size={12} /> Brand OS
                  </button>
                </div>
                <p className="font-sans text-[10px] text-nous-subtle leading-relaxed max-w-md">
                  {forecastingScope === "company"
                    ? FORECAST_COPY.brandScopeNote
                    : FORECAST_COPY.personalScopeNote}
                </p>
              </div>
              ) : (
                <p className="font-sans text-[11px] text-nous-subtle leading-relaxed max-w-2xl border border-dashed border-nous-border px-4 py-3">
                  {FORECAST_COPY.identityRequired} Cultural vector still reads Observatory baselines without a personal season.
                </p>
              )}

              <div
                className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1"
                role="tablist"
                aria-label="Forecast vectors"
              >
                {VECTOR_TABS.map((tab) => {
                  const needsIdentity = tab.id !== "culture";
                  const disabled = needsIdentity && !user;
                  return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selectedVector === tab.id}
                    disabled={disabled}
                    onClick={() => setSelectedVector(tab.id)}
                    className={`shrink-0 px-3 py-2 border font-mono text-[9px] uppercase tracking-widest inline-flex items-center gap-1.5 disabled:opacity-40 ${
                      selectedVector === tab.id
                        ? "bg-nous-text text-nous-base border-nous-text"
                        : "bg-nous-surface text-nous-subtle border-nous-border hover:text-nous-text"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                  );
                })}
              </div>

              {!user && selectedVector !== "culture" ? (
                <div className="min-h-[160px] flex items-center justify-center border border-dashed border-nous-border px-6 py-12">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle text-center">
                    {FORECAST_COPY.identityRequired}
                  </p>
                </div>
              ) : null}

              {user && selectedVector === "overview" && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[minmax(160px,auto)]">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="md:col-span-2 md:row-span-2 bg-nous-surface border border-nous-border p-5 md:p-6 flex flex-col justify-between relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none scale-150 origin-top-right">
                      {WEATHER_ICONS[currentSeason]}
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-4">
                        <ThermometerSun size={14} className="text-nous-subtle" />
                        <span className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle">
                          Current Condition
                        </span>
                      </div>
                      <h2 className="font-serif italic text-4xl md:text-7xl mb-2 capitalize">
                        {currentSeason}
                      </h2>
                      <p className="font-mono text-xs uppercase tracking-widest text-nous-text/80">
                        {WEATHER_DESCRIPTORS[currentSeason]}
                      </p>
                    </div>
                    <div className="relative z-10 mt-10 grid grid-cols-2 gap-4 border-t border-nous-border/50 pt-4">
                      <div>
                        <span className="block font-mono text-[8px] uppercase tracking-widest text-nous-subtle mb-1">
                          Drift Probability
                        </span>
                        <span className="font-sans text-xl tracking-tight">
                          {driftScore == null ? "—" : `${Math.round(driftScore)}%`}
                        </span>
                        {driftScore == null ? (
                          <p className="mt-1 font-mono text-[8px] uppercase tracking-widest text-nous-subtle">
                            {FORECAST_COPY.driftUncalibrated}
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <span className="block font-mono text-[8px] uppercase tracking-widest text-nous-subtle mb-1">
                          Atmospheric State
                        </span>
                        <span className="font-sans text-sm tracking-tight">{driftDirection}</span>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="md:col-span-2 border border-nous-border p-5 md:p-6 flex flex-col"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles size={14} className="text-nous-subtle" />
                      <span className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle">
                        Core Identity
                      </span>
                    </div>
                    {dna ? (
                      <>
                        <p className="font-serif text-lg leading-snug mb-4">
                          &ldquo;{dna.dnaStatement}&rdquo;
                        </p>
                        <div className="flex flex-wrap gap-2 mt-auto">
                          {dna.archetypes.map((a) => (
                            <span
                              key={a}
                              className="px-2 py-1 border border-nous-text/20 font-mono text-[8px] uppercase tracking-widest"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-nous-subtle font-mono text-xs">
                        No DNA profile generated.
                      </div>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="md:col-span-1 bg-nous-surface border border-nous-border p-5 md:p-6 flex flex-col"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Navigation size={14} className="text-nous-subtle" />
                      <span className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle">
                        Generative Vector
                      </span>
                    </div>
                    {geo ? (
                      <div className="flex flex-col gap-4 flex-1 justify-center">
                        <div>
                          <span className="block font-mono text-[8px] uppercase tracking-widest text-nous-subtle mb-1">
                            Archetype Map
                          </span>
                          <span className="font-sans text-sm font-medium">
                            {geo.marketMirror?.consumerArchetype || "Undefined"}
                          </span>
                        </div>
                        <div>
                          <span className="block font-mono text-[8px] uppercase tracking-widest text-nous-subtle mb-1">
                            Semantic Clusters
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {geo.retrievalIdentity?.semanticClusters?.slice(0, 3).map((c, i, arr) => (
                              <span key={c} className="text-[9px] text-nous-text/80">
                                {c}
                                {i !== arr.length - 1 ? "," : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-nous-subtle font-mono text-[9px]">
                        GEO uncalibrated.
                      </div>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="md:col-span-1 border border-nous-border p-5 md:p-6 flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Compass size={14} className="text-nous-subtle" />
                      <span className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle">
                        Projected Shift
                      </span>
                    </div>
                    {tasteVector && Object.keys(tasteVector).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(tasteVector).map(([key, val]) => (
                          <div key={key}>
                            <div className="flex justify-between font-mono text-[8px] uppercase tracking-widest mb-1">
                              <span>{key}</span>
                              <span>{Math.round(val * 100)}%</span>
                            </div>
                            <div className="w-full h-px bg-nous-border">
                              <div
                                className="h-full bg-nous-text"
                                style={{ width: `${Math.max(0, Math.min(100, val * 100))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-nous-subtle font-mono text-[9px]">
                        Vector data missing.
                      </div>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="md:col-span-4 bg-nous-surface border border-nous-border p-5 md:p-6"
                  >
                    <div className="flex flex-col md:flex-row gap-6 md:items-center">
                      <div className="shrink-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Wind size={14} className="text-nous-subtle" />
                          <span className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle">
                            Atmospheric Resonance
                          </span>
                        </div>
                        <h3 className="font-serif italic text-2xl">
                          {forecastingScope === "company" ? "Brand OS Read" : "Curator Read"}
                        </h3>
                      </div>
                      <div className="hidden md:block w-px self-stretch bg-nous-border opacity-50" />
                      <p className="flex-1 font-mono text-xs md:text-sm leading-relaxed text-nous-text/80">
                        {geo?.semanticSignature?.stylisticLanguage ||
                          dna?.poeticExpansion ||
                          "Observation mode. Calibrate GEO or generate DNA to crystallize a higher-resolution forecast."}
                      </p>
                    </div>
                  </motion.div>
                </div>
              )}

              {user && selectedVector === "content" && (
                <div className="flex flex-col gap-4">
                  <div className="border border-nous-border/60 bg-nous-surface/60 px-3 py-2">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle leading-relaxed">
                      {contentUnavailable
                        ? FORECAST_COPY.contentUnavailableBanner
                        : FORECAST_COPY.contentLiveBanner}
                    </p>
                  </div>
                  <h2 className="font-serif italic text-2xl flex flex-wrap items-center gap-3">
                    <Target size={20} /> Content Forecasting
                    <span className="text-[10px] uppercase font-sans tracking-widest text-nous-subtle bg-nous-border/30 px-2 py-1 inline-flex items-center gap-2">
                      {contentForecast ? contentForecast.provider : "Research Synthesis"}
                      {isPingingLabs ? <Loader2 size={10} className="animate-spin" /> : null}
                    </span>
                  </h2>

                  {isPingingLabs && !contentForecast ? (
                    <div className="min-h-[240px] flex flex-col items-center justify-center border border-nous-border border-dashed p-10 text-nous-subtle">
                      <Loader2 className="animate-spin mb-4" size={24} />
                      <p className="font-mono text-xs uppercase tracking-widest">
                        Pinging research API…
                      </p>
                      <p className="font-sans text-[10px] mt-2 opacity-60">
                        Synthesizing live format vectors
                      </p>
                    </div>
                  ) : contentForecast ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-nous-surface border border-nous-border p-5 md:p-6 flex flex-col gap-6">
                        <h3 className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle">
                          Format Resonance Index
                        </h3>
                        <div className="space-y-6">
                          {contentForecast.trends.length === 0 ? (
                            <p className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle leading-relaxed">
                              No live format vectors yet. Connect You.com / AI Gateway credits and
                              retry.
                            </p>
                          ) : (
                            contentForecast.trends.map((trend, idx) => (
                              <div key={`${trend.format}-${idx}`} className="space-y-2">
                                <div className="flex justify-between font-mono text-[9px] uppercase items-center gap-2">
                                  <span className="font-bold text-[11px]">{trend.format}</span>
                                  <span
                                    className={
                                      trend.velocity === "Surging"
                                        ? "text-green-700"
                                        : trend.velocity === "Rising"
                                          ? "text-sky-700"
                                          : "text-amber-700"
                                    }
                                  >
                                    {trend.velocity}
                                  </span>
                                </div>
                                <div className="w-full h-1 bg-nous-border relative overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${trend.score}%` }}
                                    transition={{ duration: 1, delay: 0.2 + idx * 0.1 }}
                                    className={`h-full ${
                                      trend.velocity === "Surging" ? "bg-nous-text" : "bg-nous-subtle"
                                    }`}
                                  />
                                </div>
                                <p className="font-sans text-[11px] text-nous-text/80 leading-snug">
                                  {trend.analysis}
                                </p>
                                {trend.sources.length > 0 ? (
                                  <div className="mt-3 pt-2 border-t border-nous-border/50 flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1.5 text-nous-subtle">
                                      <Link2 size={10} />
                                      <span className="font-mono text-[8px] uppercase tracking-widest">
                                        Sourced Citations
                                      </span>
                                    </div>
                                    {trend.sources.map((source) => (
                                      <a
                                        key={source.url}
                                        href={source.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="group flex items-center justify-between hover:bg-nous-base p-1.5 transition-colors border border-transparent hover:border-nous-border"
                                      >
                                        <span className="font-sans text-[10px] underline decoration-nous-border group-hover:decoration-nous-text/50 truncate pr-4">
                                          {source.title}
                                        </span>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <span className="font-mono text-[8px] text-nous-subtle bg-nous-border/30 px-1 py-0.5">
                                            {(source.credibility * 100).toFixed(0)}% CQ
                                          </span>
                                          <ExternalLink
                                            size={10}
                                            className="text-nous-subtle opacity-0 group-hover:opacity-100 transition-opacity"
                                          />
                                        </div>
                                      </a>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="border border-nous-border p-5 md:p-6 flex flex-col justify-between h-fit md:sticky md:top-4">
                        <h3 className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle mb-4 flex items-center gap-2">
                          <Brain size={14} /> The Synthesis
                        </h3>
                        <p className="font-serif text-xl leading-relaxed italic text-nous-text/90">
                          &ldquo;{contentForecast.synthesis}&rdquo;
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {selectedVector === "culture" && (
                cultureReport ? (
                  <ForecastObservedPanel
                    report={cultureReport}
                    onOpenObservatory={() => go("observatory")}
                  />
                ) : (
                  <div className="flex items-center gap-3 text-nous-subtle py-8">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="font-mono text-[10px] uppercase tracking-widest">
                      Composing cultural forecast from Observatory baselines…
                    </span>
                  </div>
                )
              )}
            </>
        </div>
      </div>
    </ChamberShell>
  );
};
