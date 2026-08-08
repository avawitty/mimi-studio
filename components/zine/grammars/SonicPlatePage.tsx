import { Waves } from "lucide-react";
import {
  GrammarPageFrame,
  GrammarPageNumber,
  type ZineGrammarPageProps,
} from "./GrammarPageFrame";

export function SonicPlatePage({
  artifact,
  page,
  className,
}: ZineGrammarPageProps) {
  return (
    <GrammarPageFrame
      artifact={artifact}
      page={page}
      className={className}
      label={`Sonic layer page ${page.pageNumber}: ${page.headline}`}
    >
      <div className="absolute inset-[7%] flex flex-col">
        <header className="flex items-end justify-between border-b-2 border-[var(--mimi-ink,#0a0a0a)] pb-3">
          <div className="flex items-center gap-3">
            <Waves size={14} className="text-[var(--mimi-stone,#78716c)]" />
            <div>
              <p className="font-mono text-[7px] uppercase tracking-[0.3em] text-[var(--mimi-stone,#78716c)]">
                Sonic layer
              </p>
              <h2 className="mt-1 font-serif text-2xl italic leading-none">
                {page.headline}
              </h2>
            </div>
          </div>
          <GrammarPageNumber page={page} />
        </header>

        <div className="relative min-h-0 flex-1 py-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-end justify-center gap-1 opacity-20"
          >
            {Array.from({ length: 24 }).map((_, index) => (
              <div
                key={index}
                className="w-1 bg-[var(--mimi-ink,#0a0a0a)]"
                style={{ height: `${12 + (index % 5) * 10}px` }}
              />
            ))}
          </div>
          <p className="relative font-serif text-lg italic leading-relaxed text-[var(--mimi-ink,#0a0a0a)]">
            {page.bodyCopy}
          </p>
        </div>

        {page.supportingText ? (
          <footer className="border-t border-[var(--mimi-hairline,#d4d4d4)] pt-3 font-mono text-[7px] uppercase tracking-[0.2em] text-[var(--mimi-stone,#78716c)]">
            {page.supportingText}
          </footer>
        ) : null}
      </div>
    </GrammarPageFrame>
  );
}
