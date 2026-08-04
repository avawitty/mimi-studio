import type { TasteCorpusExplorerItem } from "../../lib/taste-corpus/types";

interface EmbeddingHoverCardProps {
  item: TasteCorpusExplorerItem;
  x: number;
  y: number;
  containerWidth: number;
  containerHeight: number;
}

export function EmbeddingHoverCard({
  item,
  x,
  y,
  containerWidth,
  containerHeight,
}: EmbeddingHoverCardProps) {
  const cardWidth = 168;
  const cardHeight = 200;
  const offset = 14;
  let left = x + offset;
  let top = y + offset;

  if (left + cardWidth > containerWidth - 8) {
    left = x - cardWidth - offset;
  }
  if (top + cardHeight > containerHeight - 8) {
    top = y - cardHeight - offset;
  }
  left = Math.max(8, left);
  top = Math.max(8, top);

  return (
    <div
      className="pointer-events-none absolute z-20 overflow-hidden border border-mimi-hairline bg-mimi-field shadow-sm"
      style={{ left, top, width: cardWidth }}
      role="tooltip"
    >
      <img
        src={item.thumbnailUrl}
        alt=""
        className="aspect-square w-full object-cover"
        loading="lazy"
      />
      <div className="border-t border-mimi-hairline px-2.5 py-2">
        <p className="font-display text-sm leading-snug text-mimi-ink">{item.title}</p>
        <p className="mt-0.5 font-sans text-[10px] uppercase tracking-widest text-mimi-stone">
          Open specimen
        </p>
      </div>
    </div>
  );
}
