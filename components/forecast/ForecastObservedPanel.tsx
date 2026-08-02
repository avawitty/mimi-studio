import React from "react";
import type { ForecastReport } from "../../schemas/collectiveIntelligenceContracts";
import { FORECAST_COPY } from "../../lib/forecastChamberContract";
import { MmmStrip } from "../observatory/MmmStrip";

export const ForecastObservedPanel: React.FC<{
  report: ForecastReport;
  onOpenObservatory: () => void;
}> = ({ report, onOpenObservatory }) => {
  const isDemo = report.demonstration === true || report.status === "demonstration";
  const isEmpty = report.observed.length === 0;

  return (
    <div className="flex flex-col gap-4" data-testid="forecast-observed-panel">
      <h2 className="font-serif italic text-2xl flex items-center gap-3">
        Cultural Shifts
      </h2>

      {isDemo ? (
        <p
          role="status"
          className="border border-nous-border bg-nous-surface/40 px-4 py-3 font-sans text-[12px] text-nous-text leading-relaxed"
        >
          {FORECAST_COPY.cultureDemoBanner}
        </p>
      ) : null}

      <p className="font-sans text-[12px] text-nous-subtle leading-relaxed max-w-2xl">
        {FORECAST_COPY.cultureObserved}
      </p>

      {isEmpty ? (
        <div className="border border-dashed border-nous-border bg-nous-surface/40 p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
          <p className="flex-1 font-serif italic text-lg text-nous-text leading-relaxed">
            {FORECAST_COPY.cultureAwaiting}
          </p>
          <button
            type="button"
            onClick={onOpenObservatory}
            className="shrink-0 px-4 py-3 bg-nous-text text-nous-base font-mono text-[9px] uppercase tracking-widest hover:opacity-90"
          >
            Open The Observatory
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <section className="space-y-3">
            <h3 className="font-mono text-[9px] uppercase tracking-[0.28em] text-nous-subtle">
              Observed · Mean Median Mode
            </h3>
            {report.observed.map((profile) => (
              <MmmStrip key={profile.signalId} profile={profile} />
            ))}
          </section>

          {report.trajectories.length > 0 ? (
            <section className="space-y-3">
              <h3 className="font-mono text-[9px] uppercase tracking-[0.28em] text-nous-subtle">
                Trajectories
              </h3>
              <ul className="space-y-3">
                {report.trajectories.map((traj) => (
                  <li key={traj.id} className="border border-nous-border px-4 py-3 space-y-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-serif text-[15px] text-nous-text">{traj.label}</span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle">
                        {traj.velocityHint}
                      </span>
                    </div>
                    <p className="font-sans text-[12px] text-nous-subtle leading-relaxed">
                      {traj.hypothesis}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {report.contradictions.length > 0 ? (
            <section className="space-y-2">
              <h3 className="font-mono text-[9px] uppercase tracking-[0.28em] text-nous-subtle">
                Contradictions
              </h3>
              <ul className="space-y-1">
                {report.contradictions.map((item) => (
                  <li key={item} className="font-sans text-[11px] text-nous-subtle">
                    · {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="space-y-2">
            <h3 className="font-mono text-[9px] uppercase tracking-[0.28em] text-nous-subtle">
              What might be missing
            </h3>
            <ul className="space-y-1">
              {report.whatMayBeMissing.map((item) => (
                <li key={item} className="font-sans text-[11px] text-nous-subtle">
                  · {item}
                </li>
              ))}
            </ul>
          </section>

          <button
            type="button"
            onClick={onOpenObservatory}
            className="self-start px-4 py-3 border border-nous-border font-mono text-[9px] uppercase tracking-widest text-nous-subtle hover:text-nous-text"
          >
            Open The Observatory
          </button>
        </div>
      )}
    </div>
  );
};
