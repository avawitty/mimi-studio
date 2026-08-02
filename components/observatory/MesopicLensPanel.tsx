import React from "react";
import type { MesopicFinding, MesopicReport } from "../../schemas/collectiveIntelligenceContracts";
import { OBSERVATORY_COPY } from "../../lib/observatoryChamberContract";

const MODE_COPY: Record<
  MesopicFinding["mode"],
  { title: string; blurb: string }
> = {
  starry_eyed: {
    title: "Starry-Eyed",
    blurb: "A constellation of signals not yet bright enough to call a trend.",
  },
  shadow_fields: {
    title: "Shadow Fields",
    blurb: "Patterns gathering outside the center of attention.",
  },
};

export const MesopicLensPanel: React.FC<{
  report: MesopicReport;
}> = ({ report }) => {
  const isDemo = report.demonstration === true || report.status === "demonstration";
  const isEmpty = report.status === "empty" || report.findings.length === 0;
  const starry = report.findings.filter((f) => f.mode === "starry_eyed");
  const shadow = report.findings.filter((f) => f.mode === "shadow_fields");

  return (
    <div className="space-y-6" data-testid="mesopic-lens-panel">
      <div className="space-y-2 max-w-2xl">
        <h2 className="font-mono text-[9px] uppercase tracking-[0.28em] text-nous-subtle">
          Mesopic Lens
        </h2>
        <p className="font-serif italic text-xl text-nous-text leading-relaxed">
          {OBSERVATORY_COPY.mesopicThesis}
        </p>
        <p className="font-sans text-[11px] text-nous-subtle leading-relaxed">
          {OBSERVATORY_COPY.mesopicRestraint}
        </p>
      </div>

      {isDemo ? (
        <p
          role="status"
          className="border border-nous-border bg-nous-base px-4 py-3 font-sans text-[12px] text-nous-text leading-relaxed"
        >
          {OBSERVATORY_COPY.mesopicDemoBanner}
        </p>
      ) : null}

      {isEmpty && !isDemo ? (
        <p
          role="status"
          className="border border-nous-border bg-nous-base px-4 py-3 font-sans text-[12px] text-nous-text leading-relaxed"
        >
          {OBSERVATORY_COPY.mesopicEmptyBanner}
        </p>
      ) : null}

      <MesopicModeSection mode="starry_eyed" findings={starry} />
      <MesopicModeSection mode="shadow_fields" findings={shadow} />

      {report.whatMayBeMissing.length > 0 ? (
        <section className="space-y-2">
          <h3 className="font-mono text-[9px] uppercase tracking-[0.28em] text-nous-subtle">
            What Mimi may be missing
          </h3>
          <ul className="space-y-1">
            {report.whatMayBeMissing.map((item) => (
              <li key={item} className="font-sans text-[11px] text-nous-subtle leading-relaxed">
                · {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
};

const MesopicModeSection: React.FC<{
  mode: MesopicFinding["mode"];
  findings: MesopicFinding[];
}> = ({ mode, findings }) => {
  const copy = MODE_COPY[mode];
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className="font-mono text-[9px] uppercase tracking-[0.28em] text-nous-subtle">
          {copy.title}
        </h3>
        <p className="font-sans text-[11px] text-nous-subtle leading-relaxed">{copy.blurb}</p>
      </div>
      {findings.length === 0 ? (
        <p className="font-sans text-[12px] text-nous-subtle">No faint signals in this mode.</p>
      ) : (
        <ul className="space-y-3">
          {findings.map((finding) => (
            <li
              key={finding.id}
              className="border border-nous-border/70 px-4 py-3 space-y-2"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-serif text-[15px] text-nous-text">
                  {finding.canonicalLabel}
                </span>
                <span className="font-mono text-[10px] text-nous-subtle tabular-nums">
                  n={finding.sampleSize} · contributors {finding.uniqueContributorBand}
                </span>
              </div>
              <p className="font-sans text-[12px] text-nous-text leading-relaxed">
                {finding.faintnessReason}
              </p>
              <p className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">
                Not certainty · {finding.category.replace(/_/g, " ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
