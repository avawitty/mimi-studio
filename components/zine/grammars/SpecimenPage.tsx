import { editorAssetUrl } from "../../../lib/zine/zinePerformance";
import {
  GrammarPageFrame,
  GrammarPageNumber,
  type ZineGrammarPageProps,
} from "./GrammarPageFrame";

export function SpecimenPage({
  artifact,
  page,
  pageIndex,
  className,
}: ZineGrammarPageProps) {
  const imageUrl = editorAssetUrl(page);
  const sourceLabel =
    page.sourceIds?.length
      ? `Source: ${page.sourceIds.slice(0, 2).join(" · ")}`
      : "Source awaiting attribution";

  return (
    <GrammarPageFrame
      artifact={artifact}
      page={page}
      className={className}
      label={`Specimen page ${page.pageNumber}: ${page.headline}`}
    >
      <div className="absolute inset-[6%] flex flex-col">
        <header className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="font-mono text-[8px] uppercase tracking-[0.3em] text-[var(--mimi-stone,#78716c)]">
              Fig. {String(pageIndex + 1).padStart(2, "0")}
            </p>
            <p className="font-serif text-sm italic">{page.headline}</p>
          </div>
          <GrammarPageNumber page={page} />
        </header>

        <div className="my-[8%] flex min-h-0 flex-1 items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={page.altText || page.headline}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="max-h-full w-full object-contain"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center border border-dashed border-[var(--mimi-hairline,#d4d4d4)]"
              role="img"
              aria-label="Visual plate unavailable"
            >
              <span className="font-mono text-[8px] uppercase tracking-[0.24em] text-[var(--mimi-stone,#78716c)]">
                Plate unavailable
              </span>
            </div>
          )}
        </div>

        <footer className="flex items-end justify-between gap-6 border-t border-[var(--mimi-hairline,#d4d4d4)] pt-3">
          <div className="max-w-[78%]">
            <p className="font-serif text-xs leading-relaxed">{page.bodyCopy}</p>
            <p className="mt-2 font-mono text-[7px] uppercase tracking-[0.2em] text-[var(--mimi-stone,#78716c)]">
              {sourceLabel}
            </p>
          </div>
          <span
            className="h-3 w-3 shrink-0 bg-[#a33a2b]"
            aria-label="Registrar mark"
          />
        </footer>
      </div>
    </GrammarPageFrame>
  );
}
