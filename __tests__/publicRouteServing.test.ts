/**
 * Emulates Vercel's static-file-first + rewrite routing (the same precedence
 * Vercel applies against vercel.json) against the real public/ output, so we
 * catch regressions in either the generated files or the vercel.json catch-all
 * rewrite regex without needing a live Vercel deployment.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public");

const MIME: Record<string, string> = {
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".json": "application/json",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".html": "text/html; charset=utf-8",
};

function loadCatchAllRewrite(): RegExp {
  const vercelConfig = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
  const last = vercelConfig.rewrites[vercelConfig.rewrites.length - 1];
  if (last.destination !== "/index.html") {
    throw new Error("vercel.json's last rewrite is no longer the SPA catch-all — update this test");
  }
  return new RegExp(`^${last.source}$`);
}

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  const catchAllRegex = loadCatchAllRewrite();

  server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
    const filePath = path.join(publicDir, urlPath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    if (catchAllRegex.test(urlPath)) {
      const indexPath = path.join(root, "index.html");
      if (fs.existsSync(indexPath)) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        fs.createReadStream(indexPath).pipe(res);
        return;
      }
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("public route serving (vercel.json emulation)", () => {
  it("serves /llms.txt as text/plain", async () => {
    const res = await fetch(`${baseUrl}/llms.txt`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    const body = await res.text();
    expect(body).toContain("Mimi");
  });

  it("serves /sitemap.xml as valid XML with application/xml", async () => {
    const res = await fetch(`${baseUrl}/sitemap.xml`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/xml");
    const body = await res.text();
    expect(body.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(body).toContain("<urlset");
    expect(body).toMatch(/<loc>https:\/\/[^<]+<\/loc>/);
  });

  it.each([
    "/nonexistent.txt",
    "/unknown-file.xml",
    "/missing.json",
    "/nope.svg",
    "/ghost.webmanifest",
  ])("404s an unknown static-extension path: %s", async (unknownPath) => {
    const res = await fetch(`${baseUrl}${unknownPath}`);
    expect(res.status).toBe(404);
  });

  it("still falls through SPA routes without a static extension to index.html", async () => {
    const res = await fetch(`${baseUrl}/studio`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
  });
});
