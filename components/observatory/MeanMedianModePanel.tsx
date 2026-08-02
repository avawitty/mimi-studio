import React from "react";
import type { MeanMedianModeReport } from "../../schemas/collectiveIntelligenceContracts";
import { OBSERVATORY_COPY } from "../../lib/observatoryChamberContract";
import { MmmStrip } from "./MmmStrip";
import { MmmMethodology } from "./MmmMethodology";

export const MeanMedianModePanel: React.FC<{
  report: MeanMedianModeReport;
}> = ({ report }) => {
  const isDemo = report.demonstration === true || report.status === "demonstration";
  const isEmpty = report.status === "empty" || report.profiles.length === 0;

  return (
    <div className="space-y-8">
      {isDemo ? (
        <p
          role="status"
          className="border border-nous-border bg-nous-base px-4 py-3 font-sans text-[12px] text-nous-text leading-relaxed"
        >
          {OBSERVATORY_COPY.demonstrationBanner}
        </p>
      ) : null}

      {isEmpty && !isDemo ? (
        <p
          role="status"
          className="border border-nous-border bg-nous-base px-4 py-3 font-sans text-[12px] text-nous-text leading-relaxed"
        >
          {OBSERVATORY_COPY.emptyBanner}
        </p>
      ) : null}

      <section className="space-y-2 max-w-2xl">
        <h2 className="font-mono text-[9px] uppercase tracking-[0.28em] text-nous-subtle">
          Present atmosphere
        </h2>
        <p className="font-serif italic text-xl md:text-2xl text-nous-text leading-relaxed">
          {report.presentAtmosphere}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-mono text-[9px] uppercase tracking-[0.28em] text-nous-subtle">
          Mean · Median · Mode
        </h2>
        {report.profiles.length === 0 ? (
          <p className="font-sans text-[12px] text-nous-subtle">
            No promoted central-tendency profiles in this window.
          </p>
        ) : (
          <div className="space-y-4">
            {report.profiles.map((profile) => (
              <MmmStrip key={profile.signalId} profile={profile} />
            ))}
          </div>
        )}
      </section>

      {report.seekingModes.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-mono text-[9px] uppercase tracking-[0.28em] text-nous-subtle">
            What people are seeking
          </h2>
          <ul className="space-y-2">
            {report.seekingModes.map((mode) => (
              <li
                key={mode.label}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-nous-border/60 pb-2"
              >
                <span className="font-serif text-[15px] text-nous-text">{mode.label}</span>
                <span className="font-mono text-[10px] text-nous-subtle tabular-nums">
                  {(mode.share * 100).toFixed(0)}% · n={mode.sampleSize}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.cycleNotes.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-mono text-[9px] uppercase tracking-[0.28em] text-nous-subtle">
            Cycle notes
          </h2>
          <ul className="space-y-3">
            {report.cycleNotes.map((note) => (
              <li key={note.signalId} className="space-y-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-nous-text">
                  {note.position}
                </p>
                <p className="font-sans text-[11px] text-nous-subtle leading-relaxed">
                  {note.evidence.join(" ")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <MmmMethodology report={report} />
    </div>
  );
};
