/**
 * Generates public/sitemap.xml from the canonical route registry
 * (lib/productCanon.ts) so the sitemap is never hand-maintained.
 *
 * CanonModule has no public/requiresAuth field, and there is no auth gate in
 * the app that distinguishes chamber routes from one another — every "live"
 * chamber's own userFlow/notes text describes personal, session-scoped
 * workspace content (e.g. "your published issues", "Private by default. Public
 * skin at mimi.rip/:handle when published"), not public discovery content a
 * crawler should index. The only confirmed public, unauthenticated
 * destination today is the site root. The genuinely public surfaces
 * (published mimi.rip/:handle readings, mimi.fish/s/:zineId shares) are
 * per-content and dynamic, not static chamber routes productCanon.ts can
 * enumerate, so they're out of scope for this generator.
 *
 * When a chamber is deliberately made public, give it an explicit signal in
 * productCanon.ts and extend getPublicRoutePaths() to read it — don't
 * hand-add a path here.
 *
 * Run: tsx scripts/generateSitemap.ts (also runs automatically before
 * `vite build` as part of `npm run build:vercel`).
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CANON_ROUTE_ALIASES } from "../lib/productCanon";
import { canonicalYouOrigin } from "../lib/siteHost";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getPublicRoutePaths(): string[] {
  if (!CANON_ROUTE_ALIASES["/"]) {
    throw new Error(
      'lib/productCanon.ts no longer aliases "/" to a chamber — update scripts/generateSitemap.ts',
    );
  }
  return ["/"];
}

function buildSitemapXml(paths: string[]): string {
  const base = canonicalYouOrigin();
  const urls = paths
    .map((p) => `  <url>\n    <loc>${base}${p}</loc>\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function main() {
  const paths = getPublicRoutePaths();
  const xml = buildSitemapXml(paths);
  const outPath = path.resolve(__dirname, "../public/sitemap.xml");
  writeFileSync(outPath, xml, "utf-8");
  console.log(
    `Wrote ${outPath} with ${paths.length} URL${paths.length === 1 ? "" : "s"}.`,
  );
}

main();
