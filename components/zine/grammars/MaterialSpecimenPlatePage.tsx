import {
  GrammarPageFrame,
  GrammarPageNumber,
  type ZineGrammarPageProps,
} from "./GrammarPageFrame";

export function MaterialSpecimenPlatePage({
  artifact,
  page,
  className,
}: ZineGrammarPageProps) {
  const specimen = page.plateData?.materialSpecimen;
  const materiality = specimen?.materiality || [];
  const silhouettes = specimen?.silhouettes || [];

  return (
    <GrammarPageFrame
      artifact={artifact}
      page={page}
      className={className}
      label={`Material specimen page ${page.pageNumber}: ${page.headline}`}
    >
      <div className="absolute inset-[7%] flex flex-col">
        <header className="flex items-end justify-between border-b-2 border-[var(--mimi-ink,#0a0a0a)] pb-3">
          <div>
            <p className="font-mono text-[7px] uppercase tracking-[0.3em] text-[var(--mimi-stone,#78716c)]">
              Material specimen
            </p>
            <h2 className="mt-1 font-serif text-2xl italic leading-none">
              {page.headline}
            </h2>
          </div>
          <GrammarPageNumber page={page} />
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-hidden py-4">
          {materiality.length > 0 ? (
            <section>
              <p className="font-mono text-[7px] uppercase tracking-[0.24em] text-[var(--mimi-stone,#78716c)]">
                Materiality
              </p>
              <ul className="mt-2 space-y-2">
                {materiality.map((item) => (
                  <li
                    key={item}
                    className="border-l-2 border-[var(--mimi-olive,#5a5a40)] pl-3 font-serif text-base italic"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {silhouettes.length > 0 ? (
            <section>
              <p className="font-mono text-[7px] uppercase tracking-[0.24em] text-[var(--mimi-stone,#78716c)]">
                Silhouettes
              </p>
              <p className="mt-2 font-sans text-[10px] leading-relaxed text-[var(--mimi-stone,#78716c)]">
                {silhouettes.join(" · ")}
              </p>
            </section>
          ) : null}

          <section className="grid grid-cols-2 gap-3 font-mono text-[7px] uppercase tracking-[0.16em] text-[var(--mimi-stone,#78716c)]">
            {specimen?.eraBias ? <p>Era · {specimen.eraBias}</p> : null}
            {specimen?.presentation ? (
              <p>Presentation · {specimen.presentation}</p>
            ) : null}
            {specimen?.paperStock ? (
              <p>Stock · {specimen.paperStock.replace("-", " ")}</p>
            ) : null}
            {specimen?.typographyLineage ? (
              <p>Type · {specimen.typographyLineage.replace("-", " ")}</p>
            ) : null}
          </section>
        </div>

        <footer className="flex items-center justify-between border-t border-[var(--mimi-hairline,#d4d4d4)] pt-3 font-mono text-[7px] uppercase tracking-[0.2em] text-[var(--mimi-stone,#78716c)]">
          <span>{specimen?.sourceLabel || "Tailor materiality"}</span>
          <span>Handled evidence</span>
        </footer>
      </div>
    </GrammarPageFrame>
  );
}
