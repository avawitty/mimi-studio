import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChamberShell } from "./ChamberShell";
import { MeanMedianModePanel } from "../observatory/MeanMedianModePanel";
import { MesopicLensPanel } from "../observatory/MesopicLensPanel";
import { ObservatoryEyePlate } from "../observatory/ObservatoryEyePlate";
import { ObservatoryContributionPanel } from "../observatory/ObservatoryContributionPanel";
import { ObservatoryWindowSelector } from "../observatory/ObservatoryWindowSelector";
import {
  fetchLiveMeanMedianModeReport,
  loadMeanMedianModeReport,
  loadMesopicReport,
  type ObservatoryWindowDays,
} from "../../services/collective";
import type {
  MeanMedianModeReport,
  MesopicReport,
} from "../../schemas/collectiveIntelligenceContracts";
import {
  MEAN_MEDIAN_MODE_MODULE_ID,
  OBSERVATORY_CHAMBER_MODULE_ID,
  OBSERVATORY_COPY,
  OBSERVATORY_HANDOFF_TARGETS,
  OBSERVATORY_MESOPIC_HANDOFF,
} from "../../lib/observatoryChamberContract";

export type ObservatorySegment = "overview" | "mmm" | "mesopic";

const SEGMENTS: { id: ObservatorySegment; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "mmm", label: "Mean Median Mode" },
  { id: "mesopic", label: "Mesopic Lens" },
];

export const ObservatoryChamber: React.FC<{
  navigate?: (path: string) => void;
  /** Route hint: /mean-median-mode opens the MMM segment directly. */
  focus?: "overview" | "mmm";
}> = ({ navigate, focus = "overview" }) => {
  const [segment, setSegment] = useState<ObservatorySegment>(
    focus === "mmm" ? "mmm" : "overview",
  );
  const [windowDays, setWindowDays] = useState<ObservatoryWindowDays>(7);
  const [report, setReport] = useState<MeanMedianModeReport | null>(null);
  const [mesopicReport, setMesopicReport] = useState<MesopicReport | null>(null);
  const [corpusMeta, setCorpusMeta] = useState({
    zinesScanned: 0,
    contributingZines: 0,
    signalCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showDemo, setShowDemo] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const moduleId =
    segment === "mmm" || focus === "mmm"
      ? MEAN_MEDIAN_MODE_MODULE_ID
      : OBSERVATORY_CHAMBER_MODULE_ID;

  const loadReport = useCallback(async () => {
    setLoading(true);
    const live = await fetchLiveMeanMedianModeReport({ days: windowDays });
    if (live.kind === "success") {
      setFetchError(false);
      setReport(live.data.report);
      setMesopicReport(live.data.mesopic ?? loadMesopicReport("empty"));
      setCorpusMeta({
        zinesScanned: live.data.corpus.zinesScanned,
        contributingZines: live.data.corpus.contributingZines,
        signalCount: live.data.corpus.signalCount,
      });
      setShowDemo(false);
    } else if (live.kind === "error") {
      setFetchError(true);
      setReport(null);
      setMesopicReport(null);
      setCorpusMeta({ zinesScanned: 0, contributingZines: 0, signalCount: 0 });
    } else {
      setFetchError(false);
      setReport(loadMeanMedianModeReport("empty"));
      setMesopicReport(loadMesopicReport("empty"));
      setCorpusMeta({ zinesScanned: 0, contributingZines: 0, signalCount: 0 });
    }
    setLoading(false);
  }, [windowDays]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  useEffect(() => {
    if (focus === "mmm") setSegment("mmm");
  }, [focus]);

  const leadProfile = useMemo(() => {
    if (!report || report.profiles.length === 0) return null;
    return report.profiles.find(
      (p) => p.summation.interpretation !== "insufficient_evidence",
    ) ?? report.profiles[0];
  }, [report]);

  const isLive =
    report &&
    !report.demonstration &&
    report.status !== "empty" &&
    report.profiles.length > 0;

  const isMesopicLive =
    mesopicReport &&
    !mesopicReport.demonstration &&
    mesopicReport.status !== "empty" &&
    mesopicReport.findings.length > 0;

  const displayReport =
    showDemo && !isLive ? loadMeanMedianModeReport("demonstration") : report;

  const displayMesopic =
    showDemo && !isMesopicLive
      ? loadMesopicReport("demonstration")
      : mesopicReport ?? loadMesopicReport("empty");

  const go = (view: string) => {
    if (navigate) {
      navigate(`/${view}`);
      return;
    }
    window.location.assign(`/${view}`);
  };

  const traceToResidue = (motif: string) => {
    const q = encodeURIComponent(motif.trim());
    if (navigate) {
      navigate(`/residue?q=${q}`);
      return;
    }
    window.location.assign(`/residue?q=${q}`);
  };

  return (
    <ChamberShell
      moduleId={moduleId}
      hideHeader
      tone="void"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {OBSERVATORY_HANDOFF_TARGETS.map((target) => (
            <button
              key={target.view}
              type="button"
              onClick={() => go(target.view)}
              className="px-3 py-1.5 border border-white/15 text-stone-400 font-mono text-[8px] uppercase tracking-widest hover:text-stone-100 hover:border-white/30"
            >
              {target.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="h-full overflow-y-auto bg-[#050506] text-stone-100">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex flex-wrap gap-2">
              {SEGMENTS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSegment(tab.id)}
                  className={`px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.2em] border transition-colors ${
                    segment === tab.id
                      ? "bg-stone-100 text-[#050506] border-stone-100"
                      : "border-white/15 text-stone-500 hover:text-stone-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <ObservatoryWindowSelector
              value={windowDays}
              onChange={(days) => setWindowDays(days)}
              variant="void"
            />
          </div>

          {segment === "overview" ? (
            <div className="space-y-8">
              <ObservatoryEyePlate
                leadProfile={leadProfile}
                loading={loading}
                live={Boolean(isLive)}
                variant="void"
              />

              <div className="space-y-3 max-w-2xl px-1">
                <p className="font-serif italic text-xl md:text-2xl text-stone-100 leading-relaxed">
                  {OBSERVATORY_COPY.thesis}
                </p>
                <p className="font-sans text-[11px] text-stone-500 leading-relaxed">
                  {OBSERVATORY_COPY.residueDisambiguation}
                </p>
              </div>

              <ObservatoryContributionPanel
                navigate={navigate}
                corpusContributing={corpusMeta.contributingZines}
                corpusScanned={corpusMeta.zinesScanned}
                onContributionChange={() => void loadReport()}
              />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSegment("mmm")}
                  className="px-4 py-2 border border-stone-100 bg-stone-100 text-[#050506] font-mono text-[8px] uppercase tracking-widest"
                >
                  Open Mean Median Mode
                </button>
                <button
                  type="button"
                  onClick={() => go("forecast")}
                  className="px-4 py-2 border border-white/20 text-stone-300 font-mono text-[8px] uppercase tracking-widest hover:border-white/40"
                >
                  Forecast handoff
                </button>
              </div>

              {!loading && fetchError ? (
                <div className="space-y-2">
                  <p role="alert" className="font-sans text-[12px] text-red-300 leading-relaxed">
                    {OBSERVATORY_COPY.fetchErrorBanner}
                  </p>
                  <button
                    type="button"
                    onClick={() => void loadReport()}
                    className="font-mono text-[8px] uppercase tracking-widest text-stone-400 hover:text-stone-200 underline underline-offset-4"
                  >
                    Retry collective readout
                  </button>
                </div>
              ) : null}

              {!loading && !fetchError && !isLive && !showDemo ? (
                <div className="space-y-2">
                  <p role="status" className="font-sans text-[12px] text-stone-400 leading-relaxed">
                    {OBSERVATORY_COPY.emptyBanner}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowDemo(true)}
                    className="font-mono text-[8px] uppercase tracking-widest text-stone-500 hover:text-stone-200 underline underline-offset-4"
                  >
                    View demonstration specimens
                  </button>
                </div>
              ) : null}

              {showDemo && displayReport ? (
                <div className="border border-white/10 p-4 space-y-2">
                  <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-stone-500">
                    Demonstration preview
                  </p>
                  <MeanMedianModePanel report={displayReport} onTraceMotif={traceToResidue} />
                </div>
              ) : null}
            </div>
          ) : null}

          {segment === "mmm" && displayReport ? (
            <div className="space-y-6 observatory-mmm-readout">
              <div className="space-y-2 max-w-2xl">
                <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-stone-500">
                  Mean Median Mode · {windowDays}d window
                </p>
                <p className="font-serif italic text-xl md:text-2xl text-stone-100 leading-relaxed">
                  {OBSERVATORY_COPY.mmmThesis}
                </p>
              </div>
              <MeanMedianModePanel
                report={displayReport}
                onTraceMotif={traceToResidue}
                tone="void"
              />
              {!isLive && !showDemo ? (
                <button
                  type="button"
                  onClick={() => setShowDemo(true)}
                  className="font-mono text-[8px] uppercase tracking-widest text-stone-500 hover:text-stone-200"
                >
                  Load demonstration specimens
                </button>
              ) : null}
            </div>
          ) : null}

          {segment === "mesopic" ? (
            <div className="space-y-6">
              <div className="space-y-2 max-w-2xl">
                <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-stone-500">
                  Mesopic Lens · {windowDays}d window
                </p>
                <p className="font-serif italic text-xl md:text-2xl text-stone-100 leading-relaxed">
                  {OBSERVATORY_COPY.mesopicThesis}
                </p>
                <p className="font-sans text-[11px] text-stone-500 leading-relaxed">
                  {OBSERVATORY_COPY.mesopicPersonalDisambiguation}
                </p>
              </div>
              <MesopicLensPanel report={displayMesopic} tone="void" />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => go(OBSERVATORY_MESOPIC_HANDOFF.view)}
                  className="px-4 py-2 border border-stone-100 bg-stone-100 text-[#050506] font-mono text-[8px] uppercase tracking-widest"
                >
                  {OBSERVATORY_MESOPIC_HANDOFF.label}
                </button>
              </div>
              {!isMesopicLive && !showDemo ? (
                <div className="space-y-2">
                  <p
                    role="status"
                    className="font-sans text-[12px] text-stone-400 leading-relaxed"
                  >
                    {OBSERVATORY_COPY.mesopicEmptyBanner}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowDemo(true)}
                    className="font-mono text-[8px] uppercase tracking-widest text-stone-500 hover:text-stone-200 underline underline-offset-4"
                  >
                    Preview demonstration mesopic specimens
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </ChamberShell>
  );
};
