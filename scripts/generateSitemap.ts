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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const SITE_ORIGIN = "https://mimi.you";

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
