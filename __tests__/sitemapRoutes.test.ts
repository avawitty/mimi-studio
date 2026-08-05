import { describe, expect, it } from "vitest";
import { CANON_MODULES } from "../lib/productCanon";
import {
  STATIC_PUBLIC_ROUTES,
  buildSitemapXml,
  getPublicSitemapRoutes,
  getRobotsSitemapOrigin,
  getSeoIndexableCanonRoutes,
} from "../lib/sitemapRoutes";

describe("sitemapRoutes", () => {
  it("excludes private/workspace chamber routes by default", () => {
    const routes = new Set(getPublicSitemapRoutes());

    const knownPrivateRoutes = [
      "/studio",
      "/scribe",
      "/tailor",
      "/pocket",
      "/sanctuary",
      "/ward",
      "/wardrobe",
      "/thimble",
      "/private-studio",
      "/mimi-dolls",
      "/rip",
      "/scry",
      "/residue",
      "/forecast",
      "/observatory",
      "/mean-median-mode",
      "/celestial-calibration",
      "/house",
      "/atelier",
      "/darkroom",
      "/moodboard",
      "/intelhub",
      "/geoengine",
      "/the-edit",
      "/the-press",
      "/signature",
      "/taste-graph",
      "/aesthetic-intelligence",
      "/art-style",
    ];

    for (const route of knownPrivateRoutes) {
      expect(routes.has(route), `expected ${route} to be excluded`).toBe(false);
    }
  });

  it("only includes canon modules explicitly opted in via seoIndexable", () => {
    const indexable = getSeoIndexableCanonRoutes();
    const explicitlyMarked = CANON_MODULES.filter((m) => m.seoIndexable === true).map(
      (m) => m.canonicalRoute,
    );
    expect(indexable.sort()).toEqual(explicitlyMarked.sort());

    // Every live-but-unmarked module must stay excluded — status alone must
    // never leak a route into the sitemap.
    const liveUnmarked = CANON_MODULES.filter(
      (m) => m.status === "live" && m.seoIndexable !== true,
    );
    expect(liveUnmarked.length).toBeGreaterThan(0); // sanity: most chambers are private
    for (const module of liveUnmarked) {
      expect(indexable).not.toContain(module.canonicalRoute);
    }
  });

  it("includes the curated static public routes", () => {
    const routes = new Set(getPublicSitemapRoutes());
    for (const route of STATIC_PUBLIC_ROUTES) {
      expect(routes.has(route)).toBe(true);
    }
  });

  it("produces a deterministic, deduped, sorted route list", () => {
    const first = getPublicSitemapRoutes();
    const second = getPublicSitemapRoutes();
    expect(second).toEqual(first);
    expect(new Set(first).size).toBe(first.length);
    expect([...first].sort()).toEqual(first);
  });

  it("renders byte-identical XML across repeated calls with the same inputs", () => {
    const routes = getPublicSitemapRoutes();
    const first = buildSitemapXml("https://mimi.you", routes);
    const second = buildSitemapXml("https://mimi.you", routes);
    expect(second).toBe(first);
  });

  it("renders well-formed XML with one <loc> per route, no stray host", () => {
    const routes = ["/", "/stand"];
    const xml = buildSitemapXml("https://mimi.you", routes);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain("<urlset");
    expect(xml.match(/<loc>/g)?.length).toBe(routes.length);
    expect(xml).toContain("<loc>https://mimi.you/</loc>");
    expect(xml).toContain("<loc>https://mimi.you/stand</loc>");
    expect(xml).not.toContain("www.mimi.you");
  });

  it("parses the Sitemap: origin out of a robots.txt body", () => {
    const origin = getRobotsSitemapOrigin(
      "User-agent: *\nAllow: /\n\nSitemap: https://mimi.you/sitemap.xml\n",
    );
    expect(origin).toBe("https://mimi.you");
    expect(getRobotsSitemapOrigin("User-agent: *\nAllow: /\n")).toBeNull();
  });

  it("matches the host actually published in public/robots.txt", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const robotsContent = fs.readFileSync(
      path.join(__dirname, "..", "public", "robots.txt"),
      "utf8",
    );
    const robotsOrigin = getRobotsSitemapOrigin(robotsContent);
    expect(robotsOrigin).toBeTruthy();

    const sitemapContent = fs.readFileSync(
      path.join(__dirname, "..", "public", "sitemap.xml"),
      "utf8",
    );
    const locs = [...sitemapContent.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    expect(locs.length).toBeGreaterThan(0);
    for (const loc of locs) {
      expect(new URL(loc).origin).toBe(robotsOrigin);
    }
  });
});
