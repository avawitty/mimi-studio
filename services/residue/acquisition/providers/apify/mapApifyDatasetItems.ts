/**
 * Map Apify dataset items → Residue AcquiredSource records.
 * Fields are treated as optional — Store Actor outputs vary.
 * Do not invent output schemas beyond observed / documented fields.
 */

import type { AcquiredSource, SourceType } from "../../../validation";
import type { RagWebBrowserItem } from "../../../../../lib/ragWebBrowserTypes";

export function mapApifyDatasetItemsToAcquiredSources(
  items: unknown[],
  options?: {
    capturedAt?: string;
    actorId?: string;
    defaultSourceType?: SourceType;
    maxItems?: number;
  },
): AcquiredSource[] {
  const capturedAt = options?.capturedAt ?? new Date().toISOString();
  const maxItems = options?.maxItems ?? 25;
  const out: AcquiredSource[] = [];

  for (const [index, raw] of items.entries()) {
    if (out.length >= maxItems) break;
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const mapped = mapOneItem(item, {
      index,
      capturedAt,
      actorId: options?.actorId,
      defaultSourceType: options?.defaultSourceType ?? "journalism",
    });
    if (mapped) out.push(mapped);
  }

  return out;
}

function mapOneItem(
  item: Record<string, unknown>,
  ctx: {
    index: number;
    capturedAt: string;
    actorId?: string;
    defaultSourceType: SourceType;
  },
): AcquiredSource | null {
  // Prefer rag-web-browser shape when present
  const rag = item as RagWebBrowserItem;
  const url =
    asString(rag.metadata?.url) ||
    asString(rag.metadata?.redirectedUrl) ||
    asString(rag.searchResult?.url) ||
    asString(item.url) ||
    asString(item.sourceUrl) ||
    asString(item.link);

  const title =
    asString(rag.metadata?.title) ||
    asString(rag.searchResult?.title) ||
    asString(item.title) ||
    asString(item.pageTitle) ||
    url ||
    `Apify item ${ctx.index + 1}`;

  const text =
    asString(rag.markdown) ||
    asString(rag.text) ||
    asString(rag.searchResult?.description) ||
    asString(item.markdown) ||
    asString(item.text) ||
    asString(item.content) ||
    asString(item.description) ||
    asString(item.body);

  if (!url && !text) return null;

  const sourceType = inferSourceType(url, ctx.defaultSourceType);

  return {
    uri: url,
    platform: "apify",
    capturedAt: ctx.capturedAt,
    title,
    text: text?.slice(0, 12_000),
    author: asString(rag.metadata?.author) || asString(item.author) || undefined,
    sourceType,
    rawRef: ctx.actorId ? `${ctx.actorId}#${ctx.index}` : `apify#${ctx.index}`,
    provenance: {
      provider: "apify",
      actorId: ctx.actorId,
      index: ctx.index,
      query: asString(rag.query) || asString(item.query),
      httpStatusCode: rag.crawl?.httpStatusCode ?? undefined,
    },
  };
}

function inferSourceType(url: string | undefined, fallback: SourceType): SourceType {
  const u = (url || "").toLowerCase();
  if (u.includes("reddit.com")) return "reddit";
  if (
    u.includes("twitter.com") ||
    u.includes("x.com") ||
    u.includes("tiktok.com") ||
    u.includes("instagram.com")
  ) {
    return "social-post";
  }
  if (u.includes("doi.org") || u.includes("jstor.org") || u.includes("pubmed")) {
    return "academic-research";
  }
  return fallback;
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}
