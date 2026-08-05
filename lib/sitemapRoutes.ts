/**
 * Pure sitemap route/XML logic for public/sitemap.xml, shared by
 * scripts/generateSitemap.ts (CLI writer) and its tests. No file I/O here —
 * that keeps route selection and XML rendering independently testable and
 * deterministic.
 *
 * Publicity is opt-in, not inferred. A route only lands in the sitemap when:
 *  - it's a canon module with `seoIndexable: true` (explicitly curated in
 *    lib/productCanon.ts — never derived from `status` or the `public-face`
 *    atmosphere tag, both of which describe implementation/visual state, not
 *    whether the page is generic public content), or
 *  - it's in STATIC_PUBLIC_ROUTES below, a tightly curated allowlist for
 *    public pages that aren't canon chambers at all (home, legal, the
 *    server-rendered taste-corpus crawl page).
 * Everything else — every private workspace chamber — defaults out.
 */
import { CANON_MODULES } from "./productCanon";
import { legalPathFor } from "./legalContent";

/** Non-canon public pages, curated by hand — deliberately not sourced from any registry. */
export const STATIC_PUBLIC_ROUTES: readonly string[] = [
  "/",
  "/taste-corpus",
  legalPathFor("privacy"),
  legalPathFor("terms"),
];

/** Canon chamber routes explicitly opted in to public indexing. */
export function getSeoIndexableCanonRoutes(): string[] {
  return CANON_MODULES.filter((module) => module.seoIndexable === true).map(
    (module) => module.canonicalRoute,
  );
}

/** Full deduped, sorted set of routes eligible for public/sitemap.xml. */
export function getPublicSitemapRoutes(): string[] {
  const routes = [...STATIC_PUBLIC_ROUTES, ...getSeoIndexableCanonRoutes()].filter(
    (route): route is string => Boolean(route) && route.startsWith("/"),
  );
  return Array.from(new Set(routes)).sort();
}

const escapeXml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Renders the sitemap XML for a given origin + route list. No `lastmod` is
 * emitted (optional per the sitemap spec) — a wall-clock timestamp would make
 * output non-deterministic between runs, which is easy to test against and
 * not worth the tradeoff for a route list that changes by code review, not by
 * the clock.
 */
export function buildSitemapXml(origin: string, routes: readonly string[]): string {
  const normalizedOrigin = origin.replace(/\/$/, "");
  const urlEntries = routes
    .map((route) => `  <url>\n    <loc>${escapeXml(`${normalizedOrigin}${route}`)}</loc>\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>\n`;
}

/** Parses the `Sitemap:` directive out of a robots.txt body and returns its origin. */
export function getRobotsSitemapOrigin(robotsTxtContent: string): string | null {
  const match = robotsTxtContent.match(/^Sitemap:\s*(\S+)\s*$/im);
  if (!match) return null;
  try {
    return new URL(match[1]).origin;
  } catch {
    return null;
  }
}
