import {
  GrammarPageFrame,
  GrammarPageNumber,
  type ZineGrammarPageProps,
} from "./GrammarPageFrame";

export function DebrisPage({
  artifact,
  page,
  className,
}: ZineGrammarPageProps) {
  const debris =
    artifact.sourcePacket.originalInput ||
    page.bodyCopy ||
    "The originating fragment is unavailable.";

  return (
    <GrammarPageFrame
      artifact={artifact}
      page={page}
      className={className}
      label={`Debris page ${page.pageNumber}: raw originating material`}
    >
      <div className="absolute inset-[8%] flex flex-col">
        <header className="flex items-center justify-between border-b border-[var(--mimi-hairline,#d4d4d4)] pb-3">
          <p className="font-mono text-[8px] uppercase tracking-[0.34em]">
            Debris / 00
          </p>
          <GrammarPageNumber page={page} />
        </header>

        <div className="flex flex-1 items-center">
          <blockquote className="relative max-w-[88%] border-l-2 border-[var(--mimi-ink,#0a0a0a)] pl-[7%] font-serif text-[clamp(1.4rem,3.8vw,3rem)] italic leading-[1.12] tracking-[-0.02em]">
            “{debris}”
          </blockquote>
        </div>

        <footer className="grid grid-cols-2 gap-6 border-t border-[var(--mimi-hairline,#d4d4d4)] pt-4">
          <div>
            <p className="font-mono text-[7px] uppercase tracking-[0.22em] text-[var(--mimi-stone,#78716c)]">
              Captured in
            </p>
            <p className="mt-1 font-serif text-sm italic">Worktable</p>
          </div>
          <div>
            <p className="font-mono text-[7px] uppercase tracking-[0.22em] text-[var(--mimi-stone,#78716c)]">
              Epistemic state
            </p>
            <p className="mt-1 font-serif text-sm italic">
              Not promoted to evidence
            </p>
          </div>
        </footer>
      </div>
    </GrammarPageFrame>
  );
}
