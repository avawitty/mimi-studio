import React from "react";
import { ArrowRight, FlaskConical } from "lucide-react";
import type { ResidueForecastArtifact } from "../../services/residue/adapters/forecastAdapter";
import { FORECAST_COPY } from "../../lib/forecastChamberContract";

type Props = {
  artifact: ResidueForecastArtifact;
  onOpenResidue?: () => void;
};

export const ForecastResiduePanel: React.FC<Props> = ({ artifact, onOpenResidue }) => {
  return (
    <section className="border border-nous-border bg-nous-surface/50 p-5 md:p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-nous-subtle">
            <FlaskConical size={14} />
            <span className="font-mono text-[9px] uppercase tracking-widest">
              Residue projection
            </span>
          </div>
          <h3 className="font-serif italic text-xl text-nous-text">{artifact.topic}</h3>
          <p className="font-sans text-[11px] text-nous-subtle leading-relaxed max-w-2xl">
            {FORECAST_COPY.residueProjectionNote}
          </p>
        </div>
        {onOpenResidue ? (
          <button
            type="button"
            onClick={onOpenResidue}
            className="inline-flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-widest text-nous-subtle hover:text-nous-text border border-nous-border px-2 py-1"
          >
            Open Residue <ArrowRight size={10} />
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <p className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">
            Scenarios
          </p>
          <ul className="space-y-2">
            {artifact.scenarios.slice(0, 3).map((s) => (
              <li key={s.id} className="border-l-2 border-nous-text/30 pl-3">
                <p className="font-serif text-[14px] text-nous-text">{s.label}</p>
                <p className="font-sans text-[11px] text-nous-subtle leading-relaxed mt-0.5">
                  {s.summary}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <p className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle">
            Counter-scenarios
          </p>
          <ul className="space-y-2">
            {artifact.counterScenarios.slice(0, 2).map((s) => (
              <li key={s.id} className="border-l-2 border-nous-border pl-3">
                <p className="font-serif text-[14px] text-nous-text">{s.label}</p>
                <p className="font-sans text-[11px] text-nous-subtle leading-relaxed mt-0.5">
                  {s.summary}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {artifact.disconfirmers.length > 0 ? (
        <div className="border-t border-nous-border/50 pt-3">
          <p className="font-mono text-[8px] uppercase tracking-widest text-nous-subtle mb-2">
            Disconfirmers
          </p>
          <ul className="space-y-1">
            {artifact.disconfirmers.slice(0, 4).map((d) => (
              <li key={d} className="font-sans text-[11px] text-nous-subtle leading-relaxed">
                — {d}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
};
