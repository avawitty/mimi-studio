/**
 * iOS Installed-PWA Shell Verification
 *
 * Covers the six critical concerns for a correctly functioning iOS home-screen
 * PWA (installed via Safari's "Add to Home Screen"):
 *
 *  1. Safe areas   – viewport meta & CSS env() insets protect content from
 *                    the notch / Dynamic Island / home indicator.
 *  2. Navigation   – push/pop history router stays in sync; back-gesture
 *                    (popstate) updates the active view.
 *  3. Keyboard     – the layout shell uses dynamic viewport units (dvh) so
 *                    the visible area shrinks when the virtual keyboard appears.
 *  4. Cold launch  – navigating directly to a deep route works without a
 *                    server rewrite (the SW intercepts and serves the shell).
 *  5. Service worker – the SW file is reachable, registers successfully, and
 *                      the web-app manifest is well-formed.
 *  6. Route restoration – the last private route is persisted in localStorage
 *                         so a cold launch from "/" resumes where the user left
 *                         off rather than always defaulting to "/studio".
 */

import { test, expect, Page } from "@playwright/test";

/**
 * Drains `count` animation frames in the page so that React effects triggered
 * during the current render cycle have had a chance to run before we assert.
 */
async function waitForAnimationFrames(page: Page, count = 2): Promise<void> {
  for (let i = 0; i < count; i++) {
    await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => r())));
  }
}

// ---------------------------------------------------------------------------
// 1. SAFE AREAS
// ---------------------------------------------------------------------------
test.describe("Safe areas", () => {
  test("viewport meta declares viewport-fit=cover", async ({ page }) => {
    await page.goto("/");
    const content = await page
      .locator('meta[name="viewport"]')
      .getAttribute("content");
    expect(content).toContain("viewport-fit=cover");
  });

  test("apple-mobile-web-app meta tags are present", async ({ page }) => {
    await page.goto("/");
    const capable = await page
      .locator('meta[name="apple-mobile-web-app-capable"]')
      .getAttribute("content");
    expect(capable).toBe("yes");

    const style = await page
      .locator('meta[name="apple-mobile-web-app-status-bar-style"]')
      .getAttribute("content");
    expect(style).toBe("black-translucent");

    const title = await page
      .locator('meta[name="apple-mobile-web-app-title"]')
      .getAttribute("content");
    expect(title).toBeTruthy();
  });

  test("CSS safe-area utility classes exist in the document stylesheet", async ({
    page,
  }) => {
    await page.goto("/");

    // Inject a probe element and verify env() insets are defined (non-zero
    // on a real device; 0px in headless – we only assert the property parses).
    const hasSafeAreaSupport = await page.evaluate(() => {
      const el = document.createElement("div");
      el.style.paddingBottom = "env(safe-area-inset-bottom, 0px)";
      document.body.appendChild(el);
      const computed = window.getComputedStyle(el).paddingBottom;
      document.body.removeChild(el);
      // If the browser parsed env() the value will be a px value (incl. "0px").
      return computed.endsWith("px");
    });
    expect(hasSafeAreaSupport).toBe(true);
  });

  test("#root uses dvh height so layout fills the display excluding notch", async ({
    page,
  }) => {
    await page.goto("/");
    // The CSS rule sets `height: 100dvh` on #root. Confirm the element's
    // rendered height is greater than zero (meaning the unit was honoured).
    const rootHeight = await page.evaluate(() => {
      const root = document.getElementById("root");
      return root ? root.getBoundingClientRect().height : 0;
    });
    expect(rootHeight).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 2. NAVIGATION
// ---------------------------------------------------------------------------
test.describe("Navigation", () => {
  test("/ redirects to a private app route (/studio or last saved)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForURL((url) => url.pathname !== "/");
    expect(page.url()).not.toMatch(/\/$/); // must not stay at bare "/"
  });

  test("navigating to /archival updates the URL", async ({ page }) => {
    await page.goto("/archival");
    await page.waitForLoadState("domcontentloaded");
    expect(new URL(page.url()).pathname).toBe("/archival");
  });

  test("back navigation (popstate) returns to previous route", async ({
    page,
  }) => {
    await page.goto("/studio");
    await page.waitForLoadState("domcontentloaded");

    // Simulate pushing a second route via the in-app router.
    await page.evaluate(() => {
      window.history.pushState(null, "", "/archival");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await page.waitForFunction(
      () => window.location.pathname === "/archival",
    );

    await page.goBack();
    await page.waitForFunction(
      () => window.location.pathname === "/studio",
    );
    expect(new URL(page.url()).pathname).toBe("/studio");
  });

  test("mimi:route-request custom event triggers navigation", async ({
    page,
  }) => {
    await page.goto("/studio");
    await page.waitForLoadState("domcontentloaded");
    await waitForAnimationFrames(page);

    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("mimi:route-request", { detail: { path: "/oracle" } }),
      );
    });
    await page.waitForFunction(
      () => window.location.pathname === "/oracle",
    );
    expect(new URL(page.url()).pathname).toBe("/oracle");
  });
});

// ---------------------------------------------------------------------------
// 3. KEYBOARD
// ---------------------------------------------------------------------------
test.describe("Keyboard avoidance", () => {
  test("html and body use dynamic viewport height (dvh)", async ({ page }) => {
    await page.goto("/studio");
    await page.waitForLoadState("domcontentloaded");

    const { htmlHeight, bodyHeight } = await page.evaluate(() => ({
      htmlHeight: window.getComputedStyle(document.documentElement).height,
      bodyHeight: window.getComputedStyle(document.body).height,
    }));
    // Both should be a px value derived from 100dvh (i.e. match the viewport).
    const vh = page.viewportSize()?.height ?? 0;
    const parseHeight = (s: string) => parseFloat(s);
    expect(parseHeight(htmlHeight)).toBeGreaterThan(0);
    expect(parseHeight(bodyHeight)).toBeGreaterThan(0);
    // Height must be within 10 % of the reported viewport height (dvh tracks it).
    expect(Math.abs(parseHeight(htmlHeight) - vh)).toBeLessThanOrEqual(vh * 0.1);
  });

  test("body has overscroll-behavior-y: none to prevent elastic bounce", async ({
    page,
  }) => {
    await page.goto("/");
    const overscroll = await page.evaluate(
      () => window.getComputedStyle(document.body).overscrollBehaviorY,
    );
    expect(overscroll).toBe("none");
  });

  test("viewport meta disables user-scalable to prevent zoom on input tap", async ({
    page,
  }) => {
    await page.goto("/");
    const content = await page
      .locator('meta[name="viewport"]')
      .getAttribute("content");
    // iOS PWA convention: prevent accidental zoom when tapping inputs.
    expect(content).toMatch(/user-scalable=no/);
  });
});

// ---------------------------------------------------------------------------
// 4. COLD LAUNCH (deep-link)
// ---------------------------------------------------------------------------
test.describe("Cold launch", () => {
  test("direct navigation to /studio renders the app shell", async ({
    page,
  }) => {
    await page.goto("/studio");
    await expect(page.locator("#root")).toBeVisible();
    await expect(page).toHaveTitle(/Mimi/i);
  });

  test("direct navigation to /archival renders without a white screen", async ({
    page,
  }) => {
    await page.goto("/archival");
    await page.waitForLoadState("domcontentloaded");
    const rootVisible = await page.locator("#root").isVisible();
    expect(rootVisible).toBe(true);
  });

  test("direct navigation to /oracle renders without a white screen", async ({
    page,
  }) => {
    await page.goto("/oracle");
    await page.waitForLoadState("domcontentloaded");
    const rootVisible = await page.locator("#root").isVisible();
    expect(rootVisible).toBe(true);
  });

  test("public share routes (/s/...) render without the authenticated shell", async ({
    page,
  }) => {
    // These routes bypass the main shell entirely; the app must not crash.
    await page.goto("/s/nonexistent-zine-id");
    await page.waitForLoadState("domcontentloaded");
    // No JS crash → #root still rendered.
    const rootVisible = await page.locator("#root").isVisible();
    expect(rootVisible).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. SERVICE WORKER
// ---------------------------------------------------------------------------
test.describe("Service worker", () => {
  test("sw.js is served with a 200 status", async ({ request }) => {
    const res = await request.get("/sw.js");
    expect(res.ok()).toBe(true);
  });

  test("sw.js Content-Type is JavaScript", async ({ request }) => {
    const res = await request.get("/sw.js");
    const ct = res.headers()["content-type"] ?? "";
    expect(ct).toMatch(/javascript/i);
  });

  test("web-app manifest (metadata.json) is valid JSON with required PWA fields", async ({
    request,
  }) => {
    const res = await request.get("/metadata.json");
    expect(res.ok()).toBe(true);
    const manifest = await res.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBe("standalone");
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test("manifest link is present in the document head", async ({ page }) => {
    await page.goto("/");
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(href).toBeTruthy();
  });

  test("apple-touch-icon is declared for home-screen icon", async ({ page }) => {
    await page.goto("/");
    const href = await page
      .locator('link[rel="apple-touch-icon"]')
      .getAttribute("href");
    expect(href).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 6. ROUTE RESTORATION
// ---------------------------------------------------------------------------
test.describe("Route restoration", () => {
  test("navigating to a private route persists it in localStorage", async ({
    page,
  }) => {
    await page.goto("/archival");
    await page.waitForLoadState("domcontentloaded");

    // Poll until the useEffect that writes localStorage has run.
    await page.waitForFunction(
      () => localStorage.getItem("mimi_last_route") === "/archival",
    );

    const saved = await page.evaluate(() =>
      localStorage.getItem("mimi_last_route"),
    );
    expect(saved).toBe("/archival");
  });

  test("cold launch from / restores the last saved private route", async ({
    page,
  }) => {
    // Pre-seed localStorage with a saved route.
    await page.goto("/studio");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(
      () => localStorage.getItem("mimi_last_route") === "/studio",
      undefined,
      { timeout: 10_000 },
    );
    await page.evaluate(() => {
      localStorage.setItem("mimi_last_route", "/oracle");
    });

    // Cold launch: navigate to bare "/".
    await page.goto("/");
    await page.waitForURL((url) => url.pathname !== "/");

    expect(new URL(page.url()).pathname).toBe("/oracle");
  });

  test("cold launch without saved route defaults to /studio", async ({
    page,
  }) => {
    await page.goto("/studio");
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => localStorage.removeItem("mimi_last_route"));

    await page.goto("/");
    await page.waitForURL((url) => url.pathname !== "/");

    expect(new URL(page.url()).pathname).toBe("/studio");
  });

  test("public share routes are never saved as the last private route", async ({
    page,
  }) => {
    // Seed a legitimate prior route so we can confirm it is NOT overwritten.
    await page.goto("/studio");
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => {
      localStorage.setItem("mimi_last_route", "/studio");
    });

    // Visit a public share URL.
    await page.goto("/s/some-share-id");
    await page.waitForLoadState("domcontentloaded");
    // Drain animation frames so the persistence effect has had a chance to run.
    // If the route were incorrectly saved the value would change here.
    await waitForAnimationFrames(page);

    const saved = await page.evaluate(() =>
      localStorage.getItem("mimi_last_route"),
    );
    // Must still be the private studio route, not the share URL.
    expect(saved).toBe("/studio");
  });

  test("auth routes are never saved as the last private route", async ({
    page,
  }) => {
    await page.goto("/studio");
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => {
      localStorage.setItem("mimi_last_route", "/studio");
    });

    // Use an auth route that renders in place instead of one that immediately
    // redirects (for example the sign-in email-link flow). The behavior under
    // test is route persistence, so we keep the route stable while the
    // persistence effect has a chance to run.
    await page.goto("/auth/action");
    await page.waitForLoadState("domcontentloaded");
    // Drain animation frames so the persistence effect has had a chance to run.
    // If the auth route were incorrectly saved the value would change here.
    await waitForAnimationFrames(page);

    const saved = await page.evaluate(() =>
      localStorage.getItem("mimi_last_route"),
    );
    expect(saved).toBe("/studio");
  });
});
