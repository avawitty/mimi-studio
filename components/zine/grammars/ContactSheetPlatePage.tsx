import {
  GrammarPageFrame,
  GrammarPageNumber,
  type ZineGrammarPageProps,
} from "./GrammarPageFrame";

export function ContactSheetPlatePage({
  artifact,
  page,
  className,
}: ZineGrammarPageProps) {
  const frames = page.plateData?.contactSheetFrames?.slice(0, 9) || [];
  const columns = frames.length <= 4 ? 2 : 3;

  return (
    <GrammarPageFrame
      artifact={artifact}
      page={page}
      className={className}
      label={`Contact sheet page ${page.pageNumber}: ${page.headline}`}
    >
      <div className="absolute inset-[7%] flex flex-col">
        <header className="flex items-end justify-between border-b-2 border-[var(--mimi-ink,#0a0a0a)] pb-3">
          <div>
            <p className="font-mono text-[7px] uppercase tracking-[0.3em] text-[var(--mimi-stone,#78716c)]">
              Contact sheet
            </p>
            <h2 className="mt-1 font-serif text-2xl italic leading-none">
              {page.headline}
            </h2>
          </div>
          <GrammarPageNumber page={page} />
        </header>

        <div
          className="min-h-0 flex-1 gap-2 py-3"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}
        >
          {frames.length > 0 ? (
            frames.map((frame, index) => (
              <figure
                key={frame.id}
                className="flex min-h-0 flex-col border border-[var(--mimi-hairline,#d4d4d4)] bg-[var(--mimi-field,#fdfbf7)]"
              >
                <div className="relative min-h-0 flex-1 overflow-hidden">
                  <img
                    src={frame.imageUrl}
                    alt={frame.label || `Intake frame ${index + 1}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <figcaption className="border-t border-[var(--mimi-hairline,#d4d4d4)] px-2 py-1 font-mono text-[6px] uppercase tracking-widest text-[var(--mimi-stone,#78716c)]">
                  {frame.label || `Frame ${index + 1}`}
                </figcaption>
              </figure>
            ))
          ) : (
            <div className="col-span-full flex h-full items-center justify-center">
              <p className="font-serif text-lg italic text-[var(--mimi-stone,#78716c)]">
                No intake frames captured.
              </p>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-[var(--mimi-hairline,#d4d4d4)] pt-3 font-mono text-[7px] uppercase tracking-[0.2em] text-[var(--mimi-stone,#78716c)]">
          <span>{frames.length} frames</span>
          <span>Capture → interpret</span>
        </footer>
      </div>
    </GrammarPageFrame>
  );
}
