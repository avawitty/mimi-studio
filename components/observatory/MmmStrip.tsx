import React from "react";
import type { CentralTendencyProfile } from "../../schemas/collectiveIntelligenceContracts";

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return Number(n.toFixed(3)).toString();
}

const INTERPRETATION_COPY: Record<
  CentralTendencyProfile["summation"]["interpretation"],
  string
> = {
  spike_driven: "Spike-driven — mean rises above median; a few loud artifacts may dominate.",
  broadly_shared: "Broadly shared — mean and median align with a clear modal motif.",
  contested: "Contested — modality is split; no single dominant mood is invented.",
  insufficient_evidence: "Insufficient evidence — thresholds not met; no mood invented.",
};

type StripTone = "default" | "void";

export const MmmStrip: React.FC<{
  profile: CentralTendencyProfile;
  tone?: StripTone;
  onTraceMotif?: (motif: string) => void;
}> = ({ profile, tone = "default", onTraceMotif }) => {
  const { mean, median, mode, summation } = profile;
  const insufficient = summation.interpretation === "insufficient_evidence";
  const modeLabel = insufficient ? "Insufficient evidence" : mode.label;
  const traceLabel = insufficient ? profile.signalId : mode.label;

  const subtle = tone === "void" ? "text-stone-500" : "text-nous-subtle";
  const text = tone === "void" ? "text-stone-100" : "text-nous-text";
  const border = tone === "void" ? "border-white/15 bg-[#0a0a0c]/60" : "border-nous-border bg-nous-base";
  const actionBtn =
    tone === "void"
      ? "border-white/20 text-stone-400 hover:text-stone-100 hover:border-white/40"
      : "border-nous-border text-nous-subtle hover:text-nous-text hover:border-nous-text/40";

  return (
    <article className={`border px-4 py-4 space-y-3 ${border}`}>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className={`font-serif italic text-lg tracking-tight ${text}`}>
          {insufficient ? profile.signalId : mode.label}
        </h3>
        <p className={`font-mono text-[8px] uppercase tracking-[0.22em] ${subtle}`}>
          {profile.unit.replace(/_/g, " ")} · n={profile.sampleSize} · artifacts{" "}
          {profile.uniqueArtifactCount} · contributors {profile.uniqueContributorBand}
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className={`font-mono text-[8px] uppercase tracking-[0.2em] ${subtle}`}>Mean</p>
          <p className={`font-serif text-2xl mt-1 tabular-nums ${text}`}>{fmt(mean)}</p>
          <p className={`font-sans text-[10px] mt-1 ${subtle}`}>Average presence</p>
        </div>
        <div>
          <p className={`font-mono text-[8px] uppercase tracking-[0.2em] ${subtle}`}>Median</p>
          <p className={`font-serif text-2xl mt-1 tabular-nums ${text}`}>{fmt(median)}</p>
          <p className={`font-sans text-[10px] mt-1 ${subtle}`}>Typical presence</p>
        </div>
        <div>
          <p className={`font-mono text-[8px] uppercase tracking-[0.2em] ${subtle}`}>Mode</p>
          <p className={`font-serif text-lg mt-1 leading-snug ${text}`}>{modeLabel}</p>
          <p className={`font-sans text-[10px] mt-1 ${subtle}`}>
            {insufficient
              ? "No dominant motif until thresholds are met"
              : `count ${mode.count} · share ${(mode.share * 100).toFixed(0)}%`}
          </p>
        </div>
      </div>

      <div className={`border-t pt-3 space-y-2 ${tone === "void" ? "border-white/10" : "border-nous-border"}`}>
        <p className={`font-mono text-[8px] uppercase tracking-[0.2em] ${subtle}`}>
          Summation · {summation.skewHint.replace(/_/g, " ")} · {summation.modality}
        </p>
        <p className={`font-sans text-[12px] leading-relaxed ${text}`}>
          {INTERPRETATION_COPY[summation.interpretation]}
        </p>
        <p className={`font-mono text-[10px] tabular-nums ${subtle}`}>
          combined index {fmt(summation.combinedIndex)}
        </p>
        {onTraceMotif && !insufficient ? (
          <button
            type="button"
            onClick={() => onTraceMotif(traceLabel)}
            className={`mt-2 px-3 py-1.5 border font-mono text-[8px] uppercase tracking-widest ${actionBtn}`}
          >
            Trace in Residue
          </button>
        ) : null}
      </div>
    </article>
  );
};
