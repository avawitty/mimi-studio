import type { TasteCorpusIndexItem } from "../../lib/taste-corpus/types";

interface CorpusCrawlListProps {
  items: TasteCorpusIndexItem[];
}

/** Crawlable + screen-reader index — mirrors server-injected list for a11y parity. */
export function CorpusCrawlList({ items }: CorpusCrawlListProps) {
  return (
    <ul className="sr-only" data-taste-corpus-crawl="client">
      {items.length === 0 ? (
        <li>No specimens indexed</li>
      ) : (
        items.map((item) => (
          <li key={item.id}>
            <a href={item.href}>{item.title}</a>
          </li>
        ))
      )}
    </ul>
  );
}
