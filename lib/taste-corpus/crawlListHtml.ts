import type { TasteCorpusIndexItem } from "./types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Server- or client-safe crawlable list markup for taste corpus specimens. */
export function buildCorpusCrawlListHtml(items: TasteCorpusIndexItem[]): string {
  if (!items.length) {
    return '<ul class="sr-only" data-taste-corpus-crawl="empty"><li>No specimens indexed</li></ul>';
  }

  const lis = items
    .map(
      (item) =>
        `<li><a href="${escapeHtml(item.href)}">${escapeHtml(item.title)}</a></li>`,
    )
    .join("");

  return `<ul class="sr-only" data-taste-corpus-crawl="index">${lis}</ul>`;
}
