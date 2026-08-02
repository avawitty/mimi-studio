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

export const MmmStrip: React.FC<{ profile: CentralTendencyProfile }> = ({ profile }) => {
  const { mean, median, mode, summation } = profile;
  const insufficient = summation.interpretation === "insufficient_evidence";
  const modeLabel = insufficient ? "Insufficient evidence" : mode.label;
  return (
    <article className="border border-nous-border bg-nous-base px-4 py-4 space-y-3">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif italic text-lg text-nous-text tracking-tight">
          {insufficient ? profile.signalId : mode.label}
        </h3>
        <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-nous-subtle">
          {profile.unit.replace(/_/g, " ")} · n={profile.sampleSize} · artifacts{" "}
          {profile.uniqueArtifactCount} · contributors {profile.uniqueContributorBand}
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-nous-subtle">Mean</p>
          <p className="font-serif text-2xl text-nous-text mt-1 tabular-nums">{fmt(mean)}</p>
          <p className="font-sans text-[10px] text-nous-subtle mt-1">Average presence</p>
        </div>
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-nous-subtle">Median</p>
          <p className="font-serif text-2xl text-nous-text mt-1 tabular-nums">{fmt(median)}</p>
          <p className="font-sans text-[10px] text-nous-subtle mt-1">Typical presence</p>
        </div>
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-nous-subtle">Mode</p>
          <p className="font-serif text-lg text-nous-text mt-1 leading-snug">{modeLabel}</p>
          <p className="font-sans text-[10px] text-nous-subtle mt-1">
            {insufficient
              ? "No dominant motif until thresholds are met"
              : `count ${mode.count} · share ${(mode.share * 100).toFixed(0)}%`}
          </p>
        </div>
      </div>

      <div className="border-t border-nous-border pt-3 space-y-1">
        <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-nous-subtle">
          Summation · {summation.skewHint.replace(/_/g, " ")} · {summation.modality}
        </p>
        <p className="font-sans text-[12px] text-nous-text leading-relaxed">
          {INTERPRETATION_COPY[summation.interpretation]}
        </p>
        <p className="font-mono text-[10px] text-nous-subtle tabular-nums">
          combined index {fmt(summation.combinedIndex)}
        </p>
      </div>
    </article>
  );
};
