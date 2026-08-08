import {
  GrammarPageFrame,
  GrammarPageNumber,
  type ZineGrammarPageProps,
} from "./GrammarPageFrame";

export function ForecastDriftPlatePage({
  artifact,
  page,
  className,
}: ZineGrammarPageProps) {
  const drift = page.plateData?.forecastDrift;
  const oversaturated = drift?.oversaturatedClusters || [];
  const fragile = drift?.fragileDifferentiators || [];
  const dilution = drift?.dilutionRisks || [];

  return (
    <GrammarPageFrame
      artifact={artifact}
      page={page}
      className={className}
      label={`Forecast drift page ${page.pageNumber}: ${page.headline}`}
    >
      <div className="absolute inset-[7%] flex flex-col">
        <header className="flex items-end justify-between border-b-2 border-[var(--mimi-ink,#0a0a0a)] pb-3">
          <div>
            <p className="font-mono text-[7px] uppercase tracking-[0.3em] text-[var(--mimi-stone,#78716c)]">
              Forecast drift
            </p>
            <h2 className="mt-1 font-serif text-2xl italic leading-none">
              {page.headline}
            </h2>
          </div>
          <GrammarPageNumber page={page} />
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-hidden py-4">
          {typeof drift?.driftVulnerability === "number" ? (
            <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-[var(--mimi-stone,#78716c)]">
              Drift vulnerability · {drift.driftVulnerability}/10
              {typeof drift.expansionTolerance === "number"
                ? ` · Expansion tolerance ${drift.expansionTolerance}/10`
                : ""}
            </p>
          ) : null}

          {oversaturated.length > 0 ? (
            <section>
              <p className="font-mono text-[7px] uppercase tracking-[0.24em] text-[var(--mimi-stone,#78716c)]">
                Oversaturated clusters
              </p>
              <ul className="mt-2 space-y-1">
                {oversaturated.map((item) => (
                  <li
                    key={item}
                    className="font-serif text-sm italic text-[var(--mimi-ink,#0a0a0a)]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {fragile.length > 0 ? (
            <section>
              <p className="font-mono text-[7px] uppercase tracking-[0.24em] text-[var(--mimi-stone,#78716c)]">
                Fragile differentiators
              </p>
              <ul className="mt-2 space-y-1">
                {fragile.map((item) => (
                  <li
                    key={item}
                    className="font-sans text-[10px] leading-relaxed text-[var(--mimi-stone,#78716c)]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {dilution.length > 0 ? (
            <section>
              <p className="font-mono text-[7px] uppercase tracking-[0.24em] text-[var(--mimi-stone,#78716c)]">
                Dilution risks
              </p>
              <p className="mt-2 font-sans text-[10px] leading-relaxed text-[var(--mimi-stone,#78716c)]">
                {dilution.join(" · ")}
              </p>
            </section>
          ) : null}
        </div>

        <footer className="flex items-center justify-between border-t border-[var(--mimi-hairline,#d4d4d4)] pt-3 font-mono text-[7px] uppercase tracking-[0.2em] text-[var(--mimi-stone,#78716c)]">
          <span>
            {drift?.isDemonstration
              ? "Demonstration · not live forecast"
              : drift?.sourceLabel || "Strategic vectors"}
          </span>
          <span>Saturation awareness</span>
        </footer>
      </div>
    </GrammarPageFrame>
  );
}
