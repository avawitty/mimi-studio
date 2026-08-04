/**
 * Generates public/sitemap.xml from the curated public-route list.
 * Run: npx tsx scripts/generateSitemap.ts (wired into `build:vercel` ahead of `vite build`).
 *
 * Route selection logic lives in lib/sitemapRoutes.ts — this file only wires
 * it to disk. See that module for why publicity is opt-in (seoIndexable +
 * a static allowlist) rather than derived from canon `status`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSitemapXml, getPublicSitemapRoutes, getRobotsSitemapOrigin } from "../lib/sitemapRoutes";
import { canonicalYouOrigin } from "../lib/siteHost";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// Derive the sitemap's host from robots.txt's own Sitemap: directive, so the
// two files can never advertise different hosts. Fall back to the canonical
// apex origin only if robots.txt is missing or malformed.
const robotsPath = path.join(root, "public", "robots.txt");
const robotsContent = fs.existsSync(robotsPath) ? fs.readFileSync(robotsPath, "utf8") : "";
const SITE_ORIGIN = getRobotsSitemapOrigin(robotsContent) ?? canonicalYouOrigin();

const routes = getPublicSitemapRoutes();
const xml = buildSitemapXml(SITE_ORIGIN, routes);

const outPath = path.join(root, "public", "sitemap.xml");
fs.writeFileSync(outPath, xml, "utf8");

console.log(`sitemap: wrote ${routes.length} routes to ${path.relative(root, outPath)} (origin ${SITE_ORIGIN})`);
