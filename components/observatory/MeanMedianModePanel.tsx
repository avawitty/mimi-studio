import React from "react";
import type { MeanMedianModeReport } from "../../schemas/collectiveIntelligenceContracts";
import { OBSERVATORY_COPY } from "../../lib/observatoryChamberContract";
import { MmmStrip } from "./MmmStrip";
import { MmmMethodology } from "./MmmMethodology";

type PanelTone = "default" | "void";

const toneClasses = (tone: PanelTone) =>
  tone === "void"
    ? {
        subtle: "text-stone-500",
        text: "text-stone-100",
        border: "border-white/15",
        banner: "border-white/15 bg-[#0a0a0c]/80 text-stone-300",
        divider: "border-white/10",
      }
    : {
        subtle: "text-nous-subtle",
        text: "text-nous-text",
        border: "border-nous-border",
        banner: "border-nous-border bg-nous-base text-nous-text",
        divider: "border-nous-border/60",
      };

export const MeanMedianModePanel: React.FC<{
  report: MeanMedianModeReport;
  onTraceMotif?: (motif: string) => void;
  tone?: PanelTone;
}> = ({ report, onTraceMotif, tone = "default" }) => {
  const c = toneClasses(tone);
  const isDemo = report.demonstration === true || report.status === "demonstration";
  const isEmpty = report.status === "empty" || report.profiles.length === 0;

  return (
    <div className="space-y-8">
      {isDemo ? (
        <p role="status" className={`border px-4 py-3 font-sans text-[12px] leading-relaxed ${c.banner}`}>
          {OBSERVATORY_COPY.demonstrationBanner}
        </p>
      ) : null}

      {isEmpty && !isDemo ? (
        <p role="status" className={`border px-4 py-3 font-sans text-[12px] leading-relaxed ${c.banner}`}>
          {OBSERVATORY_COPY.emptyBanner}
        </p>
      ) : null}

      <section className="space-y-2 max-w-2xl">
        <h2 className={`font-mono text-[9px] uppercase tracking-[0.28em] ${c.subtle}`}>
          Present atmosphere
        </h2>
        <p className={`font-serif italic text-xl md:text-2xl leading-relaxed ${c.text}`}>
          {report.presentAtmosphere}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={`font-mono text-[9px] uppercase tracking-[0.28em] ${c.subtle}`}>
          Mean · Median · Mode
        </h2>
        {report.profiles.length === 0 ? (
          <p className={`font-sans text-[12px] ${c.subtle}`}>
            No promoted central-tendency profiles in this window.
          </p>
        ) : (
          <div className="space-y-4">
            {report.profiles.map((profile) => (
              <MmmStrip
                key={profile.signalId}
                profile={profile}
                tone={tone}
                onTraceMotif={onTraceMotif}
              />
            ))}
          </div>
        )}
      </section>

      {report.seekingModes.length > 0 ? (
        <section className="space-y-3">
          <h2 className={`font-mono text-[9px] uppercase tracking-[0.28em] ${c.subtle}`}>
            What people are seeking
          </h2>
          <ul className="space-y-2">
            {report.seekingModes.map((mode) => (
              <li
                key={mode.label}
                className={`flex flex-wrap items-baseline justify-between gap-2 border-b pb-2 ${c.divider}`}
              >
                <span className={`font-serif text-[15px] ${c.text}`}>{mode.label}</span>
                <span className={`font-mono text-[10px] tabular-nums ${c.subtle}`}>
                  {(mode.share * 100).toFixed(0)}% · n={mode.sampleSize}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.cycleNotes.length > 0 ? (
        <section className="space-y-3">
          <h2 className={`font-mono text-[9px] uppercase tracking-[0.28em] ${c.subtle}`}>
            Cycle notes
          </h2>
          <ul className="space-y-3">
            {report.cycleNotes.map((note) => (
              <li key={note.signalId} className="space-y-1">
                <p className={`font-mono text-[10px] uppercase tracking-[0.18em] ${c.text}`}>
                  {note.position}
                </p>
                <p className={`font-sans text-[11px] leading-relaxed ${c.subtle}`}>
                  {note.evidence.join(" ")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <MmmMethodology report={report} tone={tone} />
    </div>
  );
};
