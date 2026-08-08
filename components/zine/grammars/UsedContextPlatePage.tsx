import type { UsedContextSnapshot } from "../../../types";
import {
  GrammarPageFrame,
  GrammarPageNumber,
  type ZineGrammarPageProps,
} from "./GrammarPageFrame";

export function UsedContextPlatePage({
  artifact,
  page,
  className,
}: ZineGrammarPageProps) {
  const atoms: UsedContextSnapshot[] =
    page.plateData?.usedContextAtoms?.slice(0, 6) || [];

  return (
    <GrammarPageFrame
      artifact={artifact}
      page={page}
      className={className}
      label={`Used context page ${page.pageNumber}: ${page.headline}`}
    >
      <div className="absolute inset-[7%] flex flex-col">
        <header className="flex items-end justify-between border-b-2 border-[var(--mimi-ink,#0a0a0a)] pb-3">
          <div>
            <p className="font-mono text-[7px] uppercase tracking-[0.3em] text-[var(--mimi-stone,#78716c)]">
              Used context
            </p>
            <h2 className="mt-1 font-serif text-2xl italic leading-none">
              {page.headline}
            </h2>
          </div>
          <GrammarPageNumber page={page} />
        </header>

        <div className="min-h-0 flex-1 divide-y divide-[var(--mimi-hairline,#d4d4d4)] overflow-hidden">
          {atoms.length > 0 ? (
            atoms.map((atom, index) => (
              <section
                key={atom.atomId || `${atom.title}-${index}`}
                className="grid grid-cols-[2.5rem_1fr] gap-3 py-3"
              >
                <p className="font-mono text-[7px] uppercase tracking-[0.18em] text-[var(--mimi-stone,#78716c)]">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <h3 className="font-serif text-sm italic">{atom.title}</h3>
                    {atom.source ? (
                      <span className="font-mono text-[6px] uppercase tracking-widest text-[var(--mimi-stone,#78716c)]">
                        {atom.source}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-3 font-sans text-[9px] leading-relaxed text-[var(--mimi-stone,#78716c)] whitespace-pre-wrap">
                    {atom.content}
                  </p>
                </div>
              </section>
            ))
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="max-w-[72%] text-center font-serif text-lg italic text-[var(--mimi-stone,#78716c)]">
                No approved atoms filed for this issue.
              </p>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-[var(--mimi-hairline,#d4d4d4)] pt-3 font-mono text-[7px] uppercase tracking-[0.2em] text-[var(--mimi-stone,#78716c)]">
          <span>{atoms.length} approved</span>
          <span>Provenance · not inference</span>
        </footer>
      </div>
    </GrammarPageFrame>
  );
}
