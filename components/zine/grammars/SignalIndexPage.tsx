import type { SemioticSignal } from "../../../types";
import {
  GrammarPageFrame,
  GrammarPageNumber,
  type ZineGrammarPageProps,
} from "./GrammarPageFrame";

function signalTypeLabel(signal: SemioticSignal): string {
  return (signal.type || "conceptual").toUpperCase();
}

export function SignalIndexPage({
  artifact,
  page,
  className,
}: ZineGrammarPageProps) {
  const signals =
    page.plateData?.signals?.slice(0, 6) ||
    artifact.reading.signals.slice(0, 6);

  return (
    <GrammarPageFrame
      artifact={artifact}
      page={page}
      className={className}
      label={`Signal index page ${page.pageNumber}: ${page.headline}`}
    >
      <div className="absolute inset-[7%] flex flex-col">
        <header className="flex items-end justify-between border-b-2 border-[var(--mimi-ink,#0a0a0a)] pb-3">
          <div>
            <p className="font-mono text-[7px] uppercase tracking-[0.3em] text-[var(--mimi-stone,#78716c)]">
              Signal index
            </p>
            <h2 className="mt-1 font-serif text-2xl italic leading-none">
              {page.headline}
            </h2>
          </div>
          <GrammarPageNumber page={page} />
        </header>

        <div className="min-h-0 flex-1 divide-y divide-[var(--mimi-hairline,#d4d4d4)] overflow-hidden">
          {signals.length > 0 ? (
            signals.map((signal, index) => (
              <section
                key={`${signal.motif}-${index}`}
                className="grid grid-cols-[3.5rem_1fr] gap-4 py-3"
              >
                <div className="font-mono text-[7px] uppercase tracking-[0.18em] text-[var(--mimi-stone,#78716c)]">
                  <p>0{index + 1}</p>
                  <p className="mt-2">{signalTypeLabel(signal)}</p>
                </div>
                <div className="min-w-0">
                  <h3 className="font-serif text-base italic">{signal.motif}</h3>
                  {signal.context ? (
                    <p className="mt-1 line-clamp-2 font-sans text-[9px] leading-relaxed text-[var(--mimi-stone,#78716c)]">
                      {signal.context}
                    </p>
                  ) : null}
                  {signal.visual_directive ? (
                    <p className="mt-1 font-mono text-[6px] uppercase tracking-[0.18em] text-[var(--mimi-stone,#78716c)]">
                      {signal.visual_directive}
                    </p>
                  ) : null}
                </div>
              </section>
            ))
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="max-w-[72%] text-center font-serif text-lg italic text-[var(--mimi-stone,#78716c)]">
                {page.bodyCopy || "No signals indexed."}
              </p>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-[var(--mimi-hairline,#d4d4d4)] pt-3 font-mono text-[7px] uppercase tracking-[0.2em] text-[var(--mimi-stone,#78716c)]">
          <span>{signals.length} indexed</span>
          <span>Editorial commentary · not commerce</span>
        </footer>
      </div>
    </GrammarPageFrame>
  );
}
