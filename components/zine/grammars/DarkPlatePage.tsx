import { editorAssetUrl } from "../../../lib/zine/zinePerformance";
import {
  GrammarPageFrame,
  GrammarPageNumber,
  type ZineGrammarPageProps,
} from "./GrammarPageFrame";

export function DarkPlatePage({
  artifact,
  page,
  className,
}: ZineGrammarPageProps) {
  const imageUrl = editorAssetUrl(page);

  return (
    <GrammarPageFrame
      artifact={artifact}
      page={page}
      className={className}
      dark
      label={`Dark plate page ${page.pageNumber}: ${page.headline}`}
    >
      <div className="absolute inset-[7%] flex flex-col">
        <header className="flex items-center justify-between">
          <p className="font-mono text-[7px] uppercase tracking-[0.3em] text-white/50">
            Night plate / one
          </p>
          <GrammarPageNumber page={page} dark />
        </header>

        <div className="relative my-[8%] min-h-0 flex-1 overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={page.altText || page.headline}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-full w-full object-contain opacity-85 grayscale contrast-125"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center border border-white/15"
              role="img"
              aria-label="Dark visual plate unavailable"
            >
              <span className="font-serif text-xl italic text-white/40">
                Luminous artifact pending
              </span>
            </div>
          )}
        </div>

        <footer className="border-t border-white/20 pt-4">
          <h2 className="max-w-[88%] font-serif text-[clamp(1.5rem,4vw,3.2rem)] italic leading-none tracking-[-0.02em]">
            {page.headline}
          </h2>
          <div className="mt-4 flex items-start justify-between gap-8">
            <p className="max-w-[70%] font-serif text-xs leading-relaxed text-white/65">
              {page.bodyCopy}
            </p>
            <span className="font-serif text-2xl italic text-white/45">
              {artifact.identity.issueNumber || "XII"}
            </span>
          </div>
        </footer>
      </div>
    </GrammarPageFrame>
  );
}
