/**
 * Lightweight mobile UX review probe for Mimi Studio.
 * Usage: node scripts/mobile-ux-review.mjs [baseUrl]
 */
import { chromium } from "playwright";
import fs from "fs";

const base = process.argv[2] || "http://localhost:3000";
const out = "/opt/cursor/artifacts/mobile-ux-review";
const findings = [];
fs.mkdirSync(out, { recursive: true });

const note = (severity, area, detail) => findings.push({ severity, area, detail });

async function dismiss(page) {
  await page.waitForTimeout(600);
  for (let i = 0; i < 3; i++) {
    const accept = page.getByRole("button", { name: /accept all|essential only/i }).first();
    if (await accept.isVisible().catch(() => false)) {
      await accept.click({ force: true });
      await page.waitForTimeout(250);
    }
    const guest = page.getByRole("button", { name: /explore as guest/i }).first();
    if (await guest.isVisible().catch(() => false)) {
      await guest.click({ force: true });
      await page.waitForTimeout(500);
    }
    const onboard = page.getByRole("button", { name: /dismiss onboarding/i });
    if (await onboard.isVisible().catch(() => false)) {
      await onboard.click({ force: true });
      await page.waitForTimeout(250);
    }
    const gateway = page.getByRole("heading", { name: /canonical node|establish your vault/i });
    if (!(await gateway.isVisible().catch(() => false))) break;
  }
}

async function shot(page, name) {
  const path = `${out}/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  return path;
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
});
await context.addInitScript(() => {
  try {
    localStorage.setItem("mimi_core_loop_onboarded", "1");
    localStorage.setItem("mimi_cookie_consent", "essential");
  } catch {
    /* ignore */
  }
});
const page = await context.newPage();

const routes = [
  ["editorial-home", "01-front", "public"],
  ["stand", "02-stand", "public"],
  ["signature", "03-signature", "public"],
  ["rip", "04-rip", "public-dark"],
  ["studio", "05-studio", "studio"],
];

for (const [route, label, kind] of routes) {
  await page.goto(`${base}/${route}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await dismiss(page);
  await page.waitForTimeout(500);
  await shot(page, label);

  const chromeStats = await page.evaluate(() => {
    const header = document.querySelector("header.studio-chrome");
    const isVisible = (el) => {
      const s = getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const buttons = [...(header?.querySelectorAll("button") || [])].filter(isVisible);
    const labels = buttons.map(
      (b) => b.getAttribute("aria-label") || (b.textContent || "").trim().slice(0, 40),
    );
    const pocket = labels.some((l) => /pocket/i.test(l));
    const oracle = labels.some((l) => /oracle/i.test(l));
    // All-caps MIMI is a brand fail; title-case Mimi elsewhere may be body copy.
    const mimiAllCaps = [...document.querySelectorAll("h1, h2, span, a, button")].some((el) => {
      if (header && header.contains(el)) return false;
      return (el.textContent || "").trim() === "MIMI";
    });
    return {
      dataChrome: header?.getAttribute("data-chrome") || null,
      headerBtns: buttons.length,
      labels,
      pocket,
      oracle,
      mimiAllCaps,
    };
  });

  if (kind === "public" || kind === "public-dark") {
    const expectedChrome = kind === "public-dark" ? "public-face-dark" : "public-face";
    if (chromeStats.dataChrome !== expectedChrome) {
      note("fail", route, `Expected data-chrome=${expectedChrome}, got ${chromeStats.dataChrome}`);
    }
    if (chromeStats.headerBtns > 4) {
      note(
        "warn",
        route,
        `Public header denser than expected (${chromeStats.headerBtns}): ${chromeStats.labels.join(", ")}`,
      );
    }
    if (chromeStats.pocket || chromeStats.oracle) {
      note("fail", route, "Public face still shows pocket/oracle in chrome");
    }
    if (chromeStats.mimiAllCaps) note("fail", route, "Found all-caps MIMI wordmark outside chrome");
  }
  // Brand break: CSS uppercase turning "Mimi Rip" into MIMI RIP in chrome subtitle
  const chromeMimiCaps = await page.evaluate(() => {
    const sub = document.querySelector("header.studio-chrome span.font-mono");
    const t = (sub?.textContent || "").trim();
    return /^MIMI\b/.test(t) ? t : null;
  });
  if (chromeMimiCaps) note("fail", route, `Chrome subtitle all-caps brand: ${chromeMimiCaps}`);
  const headerBtns = chromeStats.headerBtns;

  const body = await page.locator("body").innerText().catch(() => "");
  if (/Something went wrong|Application error/i.test(body)) {
    note("fail", route, "Error boundary / crash text visible");
  } else {
    note("pass", route, `Loaded; chrome buttons=${headerBtns}`);
  }
}

// Stand tabs
await page.goto(`${base}/stand`, { waitUntil: "domcontentloaded" });
await dismiss(page);
const floor = page.getByRole("tab", { name: /floor/i });
if ((await floor.count()) > 0) {
  const box = await floor.boundingBox();
  if (!box) note("fail", "stand", "Floor tab has no bounding box");
  else {
    if (box.height < 40) note("fail", "stand", `Floor tab short (${box.height}px)`);
    if (box.x + box.width > 391) note("fail", "stand", "Floor tab clipped past viewport");
    else note("pass", "stand", `Floor tab ok ${Math.round(box.width)}×${Math.round(box.height)}`);
  }
} else {
  note("fail", "stand", "Floor tab missing");
}

// Studio tools + treatments
await page.goto(`${base}/studio`, { waitUntil: "domcontentloaded" });
await dismiss(page);
const tools = page.getByRole("button", { name: /open tools/i });
if ((await tools.count()) === 0) {
  note("fail", "studio", "Tools control missing on mobile editor");
} else {
  await tools.click({ force: true });
  await page.waitForTimeout(600);
  await shot(page, "05-tools");
  note("pass", "studio", "Tools sheet opens");
  await page.evaluate(() => {
    document.querySelectorAll('[aria-label="Close tools"]').forEach((el) => {
      if (el instanceof HTMLElement) el.click();
    });
  });
  await page.waitForTimeout(300);
}

await dismiss(page);
const treatments = page.locator("nav[aria-label='Studio navigation'] button[aria-label='Treatments']");
if ((await treatments.count()) > 0) {
  await treatments.click({ force: true });
  await page.waitForTimeout(700);
  await shot(page, "06-treatments");
  const panelOpen = await page.evaluate(() => {
    const h = [...document.querySelectorAll("h2")].find((el) =>
      /treatments/i.test(el.textContent || ""),
    );
    const close = document.querySelector('[aria-label="Close panel"]');
    return { hasTitle: !!h, hasClose: !!close };
  });
  note(
    panelOpen.hasTitle && panelOpen.hasClose ? "pass" : panelOpen.hasTitle ? "warn" : "fail",
    "studio",
    panelOpen.hasTitle && panelOpen.hasClose
      ? "Treatments panel + close present"
      : `Treatments panel incomplete: ${JSON.stringify(panelOpen)}`,
  );
}

const fabs = await page.evaluate(() => {
  return [...document.querySelectorAll("button, a, [role='button']")]
    .map((el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (s.position !== "fixed") return null;
      const round = parseFloat(s.borderRadius) >= Math.min(r.width, r.height) / 2 - 1;
      const rightEdge = r.right >= window.innerWidth - 24;
      const sizeOk = r.width >= 40 && r.width <= 72 && r.height >= 40 && r.height <= 72;
      return round && rightEdge && sizeOk
        ? { text: (el.textContent || "").trim().slice(0, 32), y: r.y }
        : null;
    })
    .filter(Boolean);
});
if (fabs.length) note("warn", "fab", `App-owned circular FAB candidates: ${JSON.stringify(fabs)}`);
else note("pass", "fab", "No app-owned circular right-edge FAB");

const summary = {
  base,
  at: new Date().toISOString(),
  fails: findings.filter((f) => f.severity === "fail").length,
  warns: findings.filter((f) => f.severity === "warn").length,
  passes: findings.filter((f) => f.severity === "pass").length,
  findings,
};
fs.writeFileSync(`${out}/review.json`, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
await browser.close();
process.exit(summary.fails > 0 ? 1 : 0);
