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
  tone?: "default" | "void";
}> = ({ report, tone = "default" }) => {
  const subtle = tone === "void" ? "text-stone-500" : "text-nous-subtle";
  const text = tone === "void" ? "text-stone-100" : "text-nous-text";
  const banner =
    tone === "void"
      ? "border-white/15 bg-[#0a0a0c]/80 text-stone-300"
      : "border-nous-border bg-nous-base text-nous-text";
  const itemBorder = tone === "void" ? "border-white/15" : "border-nous-border/70";
  const isDemo = report.demonstration === true || report.status === "demonstration";
  const isEmpty = report.status === "empty" || report.findings.length === 0;
  const starry = report.findings.filter((f) => f.mode === "starry_eyed");
  const shadow = report.findings.filter((f) => f.mode === "shadow_fields");

  return (
    <div className="space-y-6" data-testid="mesopic-lens-panel">
      <div className="space-y-2 max-w-2xl">
        <h2 className={`font-mono text-[9px] uppercase tracking-[0.28em] ${subtle}`}>
          Mesopic Lens
        </h2>
        <p className={`font-serif italic text-xl leading-relaxed ${text}`}>
          {OBSERVATORY_COPY.mesopicThesis}
        </p>
        <p className={`font-sans text-[11px] leading-relaxed ${subtle}`}>
          {OBSERVATORY_COPY.mesopicRestraint}
        </p>
      </div>

      {isDemo ? (
        <p
          role="status"
          className={`border px-4 py-3 font-sans text-[12px] leading-relaxed ${banner}`}
        >
          {OBSERVATORY_COPY.mesopicDemoBanner}
        </p>
      ) : null}

      {isEmpty && !isDemo ? (
        <p
          role="status"
          className={`border px-4 py-3 font-sans text-[12px] leading-relaxed ${banner}`}
        >
          {OBSERVATORY_COPY.mesopicEmptyBanner}
        </p>
      ) : null}

      <MesopicModeSection mode="starry_eyed" findings={starry} tone={tone} />
      <MesopicModeSection mode="shadow_fields" findings={shadow} tone={tone} />

      {report.whatMayBeMissing.length > 0 ? (
        <section className="space-y-2">
          <h3 className={`font-mono text-[9px] uppercase tracking-[0.28em] ${subtle}`}>
            What Mimi may be missing
          </h3>
          <ul className="space-y-1">
            {report.whatMayBeMissing.map((item) => (
              <li key={item} className={`font-sans text-[11px] leading-relaxed ${subtle}`}>
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
  tone?: "default" | "void";
}> = ({ mode, findings, tone = "default" }) => {
  const subtle = tone === "void" ? "text-stone-500" : "text-nous-subtle";
  const text = tone === "void" ? "text-stone-100" : "text-nous-text";
  const itemBorder = tone === "void" ? "border-white/15" : "border-nous-border/70";
  const copy = MODE_COPY[mode];
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className={`font-mono text-[9px] uppercase tracking-[0.28em] ${subtle}`}>
          {copy.title}
        </h3>
        <p className={`font-sans text-[11px] leading-relaxed ${subtle}`}>{copy.blurb}</p>
      </div>
      {findings.length === 0 ? (
        <p className={`font-sans text-[12px] ${subtle}`}>No faint signals in this mode.</p>
      ) : (
        <ul className="space-y-3">
          {findings.map((finding) => (
            <li
              key={finding.id}
              className={`border px-4 py-3 space-y-2 ${itemBorder}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className={`font-serif text-[15px] ${text}`}>
                  {finding.canonicalLabel}
                </span>
                <span className={`font-mono text-[10px] tabular-nums ${subtle}`}>
                  n={finding.sampleSize} · contributors {finding.uniqueContributorBand}
                </span>
              </div>
              <p className={`font-sans text-[12px] leading-relaxed ${text}`}>
                {finding.faintnessReason}
              </p>
              <p className={`font-mono text-[8px] uppercase tracking-widest ${subtle}`}>
                Not certainty · {finding.category.replace(/_/g, " ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
