# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ios-pwa-shell.spec.ts >> Route restoration >> auth routes are never saved as the last private route
- Location: e2e/ios-pwa-shell.spec.ts:358:3

# Error details

```
Error: page.evaluate: Execution context was destroyed, most likely because of a navigation
```

# Test source

```ts
  1   | /**
  2   |  * iOS Installed-PWA Shell Verification
  3   |  *
  4   |  * Covers the six critical concerns for a correctly functioning iOS home-screen
  5   |  * PWA (installed via Safari's "Add to Home Screen"):
  6   |  *
  7   |  *  1. Safe areas   – viewport meta & CSS env() insets protect content from
  8   |  *                    the notch / Dynamic Island / home indicator.
  9   |  *  2. Navigation   – push/pop history router stays in sync; back-gesture
  10  |  *                    (popstate) updates the active view.
  11  |  *  3. Keyboard     – the layout shell uses dynamic viewport units (dvh) so
  12  |  *                    the visible area shrinks when the virtual keyboard appears.
  13  |  *  4. Cold launch  – navigating directly to a deep route works without a
  14  |  *                    server rewrite (the SW intercepts and serves the shell).
  15  |  *  5. Service worker – the SW file is reachable, registers successfully, and
  16  |  *                      the web-app manifest is well-formed.
  17  |  *  6. Route restoration – the last private route is persisted in localStorage
  18  |  *                         so a cold launch from "/" resumes where the user left
  19  |  *                         off rather than always defaulting to "/studio".
  20  |  */
  21  | 
  22  | import { test, expect, Page } from "@playwright/test";
  23  | 
  24  | /**
  25  |  * Drains `count` animation frames in the page so that React effects triggered
  26  |  * during the current render cycle have had a chance to run before we assert.
  27  |  */
  28  | async function waitForAnimationFrames(page: Page, count = 2): Promise<void> {
  29  |   for (let i = 0; i < count; i++) {
> 30  |     await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => r())));
      |                ^ Error: page.evaluate: Execution context was destroyed, most likely because of a navigation
  31  |   }
  32  | }
  33  | 
  34  | // ---------------------------------------------------------------------------
  35  | // 1. SAFE AREAS
  36  | // ---------------------------------------------------------------------------
  37  | test.describe("Safe areas", () => {
  38  |   test("viewport meta declares viewport-fit=cover", async ({ page }) => {
  39  |     await page.goto("/");
  40  |     const content = await page
  41  |       .locator('meta[name="viewport"]')
  42  |       .getAttribute("content");
  43  |     expect(content).toContain("viewport-fit=cover");
  44  |   });
  45  | 
  46  |   test("apple-mobile-web-app meta tags are present", async ({ page }) => {
  47  |     await page.goto("/");
  48  |     const capable = await page
  49  |       .locator('meta[name="apple-mobile-web-app-capable"]')
  50  |       .getAttribute("content");
  51  |     expect(capable).toBe("yes");
  52  | 
  53  |     const style = await page
  54  |       .locator('meta[name="apple-mobile-web-app-status-bar-style"]')
  55  |       .getAttribute("content");
  56  |     expect(style).toBe("black-translucent");
  57  | 
  58  |     const title = await page
  59  |       .locator('meta[name="apple-mobile-web-app-title"]')
  60  |       .getAttribute("content");
  61  |     expect(title).toBeTruthy();
  62  |   });
  63  | 
  64  |   test("CSS safe-area utility classes exist in the document stylesheet", async ({
  65  |     page,
  66  |   }) => {
  67  |     await page.goto("/");
  68  | 
  69  |     // Inject a probe element and verify env() insets are defined (non-zero
  70  |     // on a real device; 0px in headless – we only assert the property parses).
  71  |     const hasSafeAreaSupport = await page.evaluate(() => {
  72  |       const el = document.createElement("div");
  73  |       el.style.paddingBottom = "env(safe-area-inset-bottom, 0px)";
  74  |       document.body.appendChild(el);
  75  |       const computed = window.getComputedStyle(el).paddingBottom;
  76  |       document.body.removeChild(el);
  77  |       // If the browser parsed env() the value will be a px value (incl. "0px").
  78  |       return computed.endsWith("px");
  79  |     });
  80  |     expect(hasSafeAreaSupport).toBe(true);
  81  |   });
  82  | 
  83  |   test("#root uses dvh height so layout fills the display excluding notch", async ({
  84  |     page,
  85  |   }) => {
  86  |     await page.goto("/");
  87  |     // The CSS rule sets `height: 100dvh` on #root. Confirm the element's
  88  |     // rendered height is greater than zero (meaning the unit was honoured).
  89  |     const rootHeight = await page.evaluate(() => {
  90  |       const root = document.getElementById("root");
  91  |       return root ? root.getBoundingClientRect().height : 0;
  92  |     });
  93  |     expect(rootHeight).toBeGreaterThan(0);
  94  |   });
  95  | });
  96  | 
  97  | // ---------------------------------------------------------------------------
  98  | // 2. NAVIGATION
  99  | // ---------------------------------------------------------------------------
  100 | test.describe("Navigation", () => {
  101 |   test("/ redirects to a private app route (/studio or last saved)", async ({
  102 |     page,
  103 |   }) => {
  104 |     await page.goto("/");
  105 |     await page.waitForURL((url) => url.pathname !== "/");
  106 |     expect(page.url()).not.toMatch(/\/$/); // must not stay at bare "/"
  107 |   });
  108 | 
  109 |   test("navigating to /archival updates the URL", async ({ page }) => {
  110 |     await page.goto("/archival");
  111 |     await page.waitForLoadState("domcontentloaded");
  112 |     expect(new URL(page.url()).pathname).toBe("/archival");
  113 |   });
  114 | 
  115 |   test("back navigation (popstate) returns to previous route", async ({
  116 |     page,
  117 |   }) => {
  118 |     await page.goto("/studio");
  119 |     await page.waitForLoadState("domcontentloaded");
  120 | 
  121 |     // Simulate pushing a second route via the in-app router.
  122 |     await page.evaluate(() => {
  123 |       window.history.pushState(null, "", "/archival");
  124 |       window.dispatchEvent(new PopStateEvent("popstate"));
  125 |     });
  126 |     await page.waitForFunction(
  127 |       () => window.location.pathname === "/archival",
  128 |     );
  129 | 
  130 |     await page.goBack();
```