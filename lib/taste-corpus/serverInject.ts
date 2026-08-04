import fs from "node:fs";
import path from "node:path";
import { buildCorpusCrawlListHtml } from "./crawlListHtml.js";
import type { TasteCorpusIndex } from "./types.js";

const INDEX_FILENAME = "taste-corpus-index.json";

export function resolveTasteCorpusIndexPath(rootDir = process.cwd()): string {
  return path.join(rootDir, "public", "data", INDEX_FILENAME);
}

export function loadTasteCorpusIndex(rootDir = process.cwd()): TasteCorpusIndex | null {
  const indexPath = resolveTasteCorpusIndexPath(rootDir);
  if (!fs.existsSync(indexPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(indexPath, "utf8")) as TasteCorpusIndex;
  } catch {
    return null;
  }
}

export function injectCorpusSEOMetadata(
  html: string,
  pageUrl: string,
  itemCount: number,
): string {
  let modified = html;
  const title = "Taste Corpus — Mimi";
  const description = `A two-dimensional map of ${itemCount} taste specimens — visual embeddings projected for exploration.`;

  modified = modified.replace(/<title>.*?<\/title>/gi, `<title>${title}</title>`);

  const setMeta = (attr: "name" | "property", key: string, content: string) => {
    const regex = new RegExp(`<meta\\s+[^>]*?${attr}="${key}"[^>]*?>`, "i");
    const tag = `<meta ${attr}="${key}" content="${content.replace(/"/g, "&quot;")}" />`;
    modified = regex.test(modified)
      ? modified.replace(regex, tag)
      : modified.replace("<head>", `<head>\n    ${tag}`);
  };

  setMeta("name", "description", description);
  setMeta("property", "og:title", title);
  setMeta("property", "og:description", description);
  setMeta("property", "og:url", pageUrl);
  setMeta("property", "og:type", "website");
  setMeta("name", "twitter:card", "summary");
  setMeta("name", "twitter:title", title);
  setMeta("name", "twitter:description", description);
  setMeta("name", "twitter:url", pageUrl);

  return modified;
}

export function injectCorpusCrawlList(html: string, rootDir = process.cwd()): string {
  const index = loadTasteCorpusIndex(rootDir);
  const crawlHtml = buildCorpusCrawlListHtml(index?.items ?? []);
  const marker = '<div id="root">';
  if (!html.includes(marker)) {
    return html.replace("</body>", `${crawlHtml}\n</body>`);
  }
  return html.replace(marker, `${crawlHtml}\n    ${marker}`);
}

export function injectTasteCorpusPageHtml(
  html: string,
  pageUrl: string,
  rootDir = process.cwd(),
): string {
  const index = loadTasteCorpusIndex(rootDir);
  const count = index?.items.length ?? 0;
  let modified = injectCorpusSEOMetadata(html, pageUrl, count);
  modified = injectCorpusCrawlList(modified, rootDir);
  return modified;
}
