import {
  GrammarPageFrame,
  GrammarPageNumber,
  type ZineGrammarPageProps,
} from "./GrammarPageFrame";

export function ChromaticPlatePage({
  artifact,
  page,
  className,
}: ZineGrammarPageProps) {
  const palette = page.plateData?.palette;
  const colors = palette?.colors || [];

  return (
    <GrammarPageFrame
      artifact={artifact}
      page={page}
      className={className}
      label={`Chromatic calibration page ${page.pageNumber}: ${page.headline}`}
    >
      <div className="absolute inset-[7%] flex flex-col">
        <header className="flex items-end justify-between border-b-2 border-[var(--mimi-ink,#0a0a0a)] pb-3">
          <div>
            <p className="font-mono text-[7px] uppercase tracking-[0.3em] text-[var(--mimi-stone,#78716c)]">
              Chromatic calibration
            </p>
            <h2 className="mt-1 font-serif text-2xl italic leading-none">
              {page.headline}
            </h2>
          </div>
          <GrammarPageNumber page={page} />
        </header>

        <div className="min-h-0 flex-1 py-6">
          <div className="grid grid-cols-2 gap-3">
            {colors.map((color) => (
              <div key={`${color.hex}-${color.name}`} className="space-y-2">
                <div
                  className="aspect-[5/3] w-full border border-[var(--mimi-hairline,#d4d4d4)]"
                  style={{ backgroundColor: color.hex }}
                  role="img"
                  aria-label={`${color.name} ${color.hex}`}
                />
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--mimi-ink,#0a0a0a)]">
                    {color.name}
                  </p>
                  <p className="font-mono text-[7px] uppercase tracking-widest text-[var(--mimi-stone,#78716c)]">
                    {color.hex}
                  </p>
                  {color.descriptor ? (
                    <p className="font-serif text-[10px] italic text-[var(--mimi-stone,#78716c)]">
                      {color.descriptor}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <footer className="border-t border-[var(--mimi-hairline,#d4d4d4)] pt-3 font-mono text-[7px] uppercase tracking-[0.2em] text-[var(--mimi-stone,#78716c)]">
          {palette?.sourceLabel || page.bodyCopy}
        </footer>
      </div>
    </GrammarPageFrame>
  );
}
