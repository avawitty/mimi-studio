/**
 * Generates public/sitemap.xml from the canon route registry.
 * Run: npx tsx scripts/generateSitemap.ts (wired into `build:vercel` ahead of `vite build`).
 *
 * Route source is lib/productCanon.ts — no hand-maintained URL list.
 *
 * "live" canon modules render their chamber shell without requiring sign-in
 * (Mimi's ghost/anonymous identity path — ghost users get IndexedDB-backed,
 * local-only chambers instead of a login wall), so every live module's
 * canonicalRoute is reachable unauthenticated and eligible for the sitemap.
 * "aliased" / "stub" / "missing" modules are excluded: aliased routes resolve
 * to a different in-app canonical path (duplicate content), and stub/missing
 * routes have nothing to serve.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CANON_MODULES } from "../lib/productCanon";
import { getPublicBaseUrl } from "../lib/publicBaseUrl";
import { canonicalYouOrigin } from "../lib/siteHost";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// Honor an explicit MIMI_PUBLIC_BASE_URL override, but otherwise fall back to
// the apex canonical origin (https://mimi.you) so the generated <loc> host
// matches the Sitemap directive in public/robots.txt. getPublicBaseUrl()'s own
// fallback is the www host, which would put sitemap URLs on a different host
// than robots.txt advertises (violating the sitemaps single-host rule).
const SITE_ORIGIN = String(process.env.MIMI_PUBLIC_BASE_URL || "").trim()
  ? getPublicBaseUrl()
  : canonicalYouOrigin();

const routes = Array.from(
  new Set(
    [
      "/",
      ...CANON_MODULES.filter((module) => module.status === "live").map(
        (module) => module.canonicalRoute,
      ),
    ].filter((route): route is string => Boolean(route) && route.startsWith("/")),
  ),
).sort();

const escapeXml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const today = new Date().toISOString().slice(0, 10);

const urlEntries = routes
  .map((route) => {
    const loc = escapeXml(`${SITE_ORIGIN}${route}`);
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`;
  })
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>\n`;

const outPath = path.join(root, "public", "sitemap.xml");
fs.writeFileSync(outPath, xml, "utf8");

console.log(`sitemap: wrote ${routes.length} routes to ${path.relative(root, outPath)}`);
