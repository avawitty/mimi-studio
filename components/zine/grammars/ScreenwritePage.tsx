import {
  GrammarPageFrame,
  GrammarPageNumber,
  type ZineGrammarPageProps,
} from "./GrammarPageFrame";

export function ScreenwritePage({
  artifact,
  page,
  className,
}: ZineGrammarPageProps) {
  return (
    <GrammarPageFrame
      artifact={artifact}
      page={page}
      className={className}
      dark
      label={`Screenwrite page ${page.pageNumber}: ${page.headline}`}
    >
      <div className="absolute inset-[7%] flex flex-col">
        <header className="flex items-end justify-between border-b border-white/15 pb-3">
          <div>
            <p className="font-mono text-[7px] uppercase tracking-[0.3em] text-white/45">
              Screenwrite
            </p>
            <h2 className="mt-1 font-serif text-2xl italic leading-none text-white">
              {page.headline}
            </h2>
          </div>
          <GrammarPageNumber page={page} dark />
        </header>

        <div className="min-h-0 flex-1 overflow-hidden py-8">
          <pre className="whitespace-pre-wrap font-mono text-[11px] leading-[1.9] tracking-wide text-white/85">
            {page.bodyCopy}
          </pre>
        </div>

        {page.supportingText ? (
          <footer className="border-t border-white/15 pt-3 font-mono text-[7px] uppercase tracking-[0.24em] text-white/40">
            {page.supportingText}
          </footer>
        ) : null}
      </div>
    </GrammarPageFrame>
  );
}
