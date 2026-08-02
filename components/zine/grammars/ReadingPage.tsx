import {
  GrammarPageFrame,
  GrammarPageNumber,
  type ZineGrammarPageProps,
} from "./GrammarPageFrame";

export function ReadingPage({
  artifact,
  page,
  className,
}: ZineGrammarPageProps) {
  const observation =
    artifact.reading.centralObservation || page.bodyCopy || page.headline;
  const mirror = artifact.reading.oracularMirror;
  const hypothesis = artifact.reading.strategicHypothesis;

  return (
    <GrammarPageFrame
      artifact={artifact}
      page={page}
      className={className}
      label={`Reading page ${page.pageNumber}: ${page.headline}`}
    >
      <div className="absolute inset-[8%] flex flex-col">
        <header className="flex items-center justify-between border-b border-[var(--mimi-hairline,#d4d4d4)] pb-3">
          <p className="font-mono text-[8px] uppercase tracking-[0.34em] text-[var(--mimi-stone,#78716c)]">
            The Reading
          </p>
          <GrammarPageNumber page={page} />
        </header>

        <div className="flex flex-1 flex-col justify-center py-[9%]">
          <p className="mb-5 font-mono text-[7px] uppercase tracking-[0.26em] text-[var(--mimi-stone,#78716c)]">
            Observed / interpreted
          </p>
          <blockquote className="max-w-[94%] font-serif text-[clamp(1.5rem,4.2vw,3.5rem)] italic leading-[1.05] tracking-[-0.025em]">
            “{observation}”
          </blockquote>
          {mirror ? (
            <p className="mt-8 max-w-[70%] self-end border-l border-[var(--mimi-hairline,#d4d4d4)] pl-4 font-serif text-sm italic leading-relaxed text-[var(--mimi-stone,#78716c)]">
              {mirror}
            </p>
          ) : null}
        </div>

        <footer className="border-t border-[var(--mimi-hairline,#d4d4d4)] pt-4">
          <p className="font-mono text-[7px] uppercase tracking-[0.24em] text-[var(--mimi-stone,#78716c)]">
            Proposed / strategic hypothesis
          </p>
          <p className="mt-2 max-w-[82%] font-serif text-xs leading-relaxed">
            {hypothesis || "No strategic hypothesis has been approved."}
          </p>
        </footer>
      </div>
    </GrammarPageFrame>
  );
}
