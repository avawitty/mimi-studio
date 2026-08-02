import { editorAssetUrl } from "../../../lib/zine/zinePerformance";
import {
  GrammarPageFrame,
  GrammarPageNumber,
  type ZineGrammarPageProps,
} from "./GrammarPageFrame";

export function EditorialSplitPage({
  artifact,
  page,
  pageIndex,
  className,
}: ZineGrammarPageProps) {
  const imageUrl = editorAssetUrl(page);
  const imageFirst = pageIndex % 2 === 0;
  const textOnly = Boolean(
    !imageUrl &&
      page.sectionType &&
      ["opening", "essay", "interlude", "roadmap", "colophon"].includes(
        page.sectionType,
      ),
  );

  if (textOnly) {
    return (
      <GrammarPageFrame
        artifact={artifact}
        page={page}
        className={className}
        label={`${page.sectionType} page ${page.pageNumber}: ${page.headline}`}
      >
        <div className="absolute inset-[8%] flex flex-col">
          <header className="flex items-center justify-between border-b border-[var(--mimi-hairline,#d4d4d4)] pb-3">
            <p className="font-mono text-[7px] uppercase tracking-[0.28em] text-[var(--mimi-stone,#78716c)]">
              {page.sectionType}
            </p>
            <GrammarPageNumber page={page} />
          </header>
          <div className="flex flex-1 flex-col justify-center">
            <h2 className="max-w-[86%] font-serif text-[clamp(1.8rem,5vw,4rem)] italic leading-[1.02] tracking-[-0.025em]">
              {page.headline}
            </h2>
            <p className="mt-8 max-w-[72%] whitespace-pre-wrap font-serif text-[clamp(0.8rem,1.5vw,1.1rem)] leading-[1.65]">
              {page.bodyCopy}
            </p>
          </div>
          <footer className="border-t border-[var(--mimi-hairline,#d4d4d4)] pt-3 font-mono text-[6px] uppercase tracking-[0.2em] text-[var(--mimi-stone,#78716c)]">
            {page.sourceIds?.length
              ? `${page.sourceIds.length} public source reference${page.sourceIds.length === 1 ? "" : "s"}`
              : "Mimi editorial archive"}
          </footer>
        </div>
      </GrammarPageFrame>
    );
  }

  const imagePanel = (
    <div className="relative min-h-0 overflow-hidden bg-[#f4f4f1]">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={page.altText || page.headline}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="flex h-full items-center justify-center border border-dashed border-[var(--mimi-hairline,#d4d4d4)]"
          role="img"
          aria-label="Visual plate unavailable"
        >
          <span className="font-mono text-[7px] uppercase tracking-[0.25em] text-[var(--mimi-stone,#78716c)]">
            Image pending
          </span>
        </div>
      )}
      <span className="absolute bottom-3 left-3 bg-white px-2 py-1 font-mono text-[6px] uppercase tracking-[0.2em] text-[var(--mimi-stone,#78716c)]">
        Fig. {String(pageIndex + 1).padStart(2, "0")}
      </span>
    </div>
  );

  const copyPanel = (
    <div className="flex min-h-0 flex-col justify-between p-[11%]">
      <GrammarPageNumber page={page} />
      <div>
        <p className="mb-4 font-mono text-[7px] uppercase tracking-[0.28em] text-[var(--mimi-stone,#78716c)]">
          {page.sectionType || "Editorial plate"}
        </p>
        <h2 className="font-serif text-[clamp(1.35rem,3.2vw,2.5rem)] italic leading-[1.02] tracking-[-0.025em]">
          {page.headline}
        </h2>
        <p className="mt-6 line-clamp-[10] font-serif text-[clamp(0.7rem,1.3vw,1rem)] leading-[1.55]">
          {page.bodyCopy}
        </p>
      </div>
      <p className="border-t border-[var(--mimi-hairline,#d4d4d4)] pt-3 font-mono text-[6px] uppercase tracking-[0.18em] text-[var(--mimi-stone,#78716c)]">
        {page.sourceIds?.length
          ? `${page.sourceIds.length} source reference${page.sourceIds.length === 1 ? "" : "s"}`
          : "Interpretive composition"}
      </p>
    </div>
  );

  return (
    <GrammarPageFrame
      artifact={artifact}
      page={page}
      className={className}
      label={`Editorial split page ${page.pageNumber}: ${page.headline}`}
    >
      <div className="grid h-full grid-cols-[58%_42%]">
        {imageFirst ? (
          <>
            {imagePanel}
            {copyPanel}
          </>
        ) : (
          <>
            {copyPanel}
            {imagePanel}
          </>
        )}
      </div>
    </GrammarPageFrame>
  );
}
