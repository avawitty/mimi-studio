/**
 * Render official app-icon crop SVGs → PNG launcher / apple-touch assets.
 * Requires Playwright Chromium (same as e2e).
 */
import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const official = path.join(root, "public/brand/official");

const targets = [
  {
    svg: "mimi-app-icon-crop-light.svg",
    out: path.join(root, "public/mimi-app-icon.png"),
    size: 512,
    background: "#FFFFFF",
  },
  {
    svg: "mimi-app-icon-crop-light.svg",
    out: path.join(root, "public/brand/official/mimi-app-icon-180.png"),
    size: 180,
    background: "#FFFFFF",
  },
  {
    svg: "mimi-app-icon-crop-dark.svg",
    out: path.join(root, "public/brand/official/mimi-app-icon-dark-512.png"),
    size: 512,
    background: "#0A0A0A",
  },
];

async function renderOne(browser, { svg, out, size, background }) {
  const svgText = await readFile(path.join(official, svg), "utf8");
  const html = `<!DOCTYPE html>
<html>
<head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500&display=swap" rel="stylesheet" />
  <style>
    html, body { margin: 0; width: ${size}px; height: ${size}px; background: ${background}; }
    .stage { width: ${size}px; height: ${size}px; display: grid; place-items: center; }
    svg { width: ${size}px; height: ${size}px; display: block; }
  </style>
</head>
<body>
  <div class="stage">${svgText}</div>
</body>
</html>`;

  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  // Let Cormorant settle after swap
  await page.waitForTimeout(400);
  await mkdir(path.dirname(out), { recursive: true });
  await page.locator(".stage").screenshot({ path: out, omitBackground: false });
  await page.close();
  console.log(`wrote ${path.relative(root, out)} (${size}×${size})`);
}

const browser = await chromium.launch();
try {
  for (const t of targets) await renderOne(browser, t);
} finally {
  await browser.close();
}
