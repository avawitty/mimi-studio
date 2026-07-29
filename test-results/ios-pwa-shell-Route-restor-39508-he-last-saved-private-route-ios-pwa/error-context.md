# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ios-pwa-shell.spec.ts >> Route restoration >> cold launch from / restores the last saved private route
- Location: e2e/ios-pwa-shell.spec.ts:304:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "/oracle"
Received: "/studio"
```

# Page snapshot

```yaml
- generic [ref=f1e7]:
  - generic [ref=f1e8]:
    - heading "Who are you when no one is watching?" [level=1] [ref=f1e9]
    - generic [ref=f1e10]: MIMI // ANTIDOTE FOR BRAIN ROT
  - generic [ref=f1e11]:
    - generic [ref=f1e12]:
      - generic [ref=f1e13]: 4F Penthouse
      - generic [ref=f1e14]: 3F Plate
      - generic [ref=f1e15]: 2F Curate
      - generic [ref=f1e16]: 1F Ingest
      - generic [ref=f1e18]:
        - generic [ref=f1e19]: FL 1
        - generic [ref=f1e20]:
          - generic [ref=f1e21]: ▲
          - generic [ref=f1e22]: MIMI
    - generic [ref=f1e23]:
      - generic [ref=f1e24]:
        - generic [ref=f1e25]:
          - generic [ref=f1e26]: STANDARD RENDER
          - generic [ref=f1e27]: Floor 1/4
        - 'heading "PHASE I: SYNTHESIZING AESTHETIC" [level=3] [ref=f1e28]'
        - paragraph [ref=f1e29]: Filtering memetic debris for latent architectural intent.
      - generic [ref=f1e30]:
        - generic [ref=f1e31]: ANTI BRAIN ROT INSTRUCTION
        - paragraph [ref=f1e32]: "\"Visual over-saturation blunts discernment. Taste is established in the absolute negatives—what you exclude.\""
  - generic [ref=f1e34]:
    - generic [ref=f1e35]: SYSTEM ASCENSION
    - generic [ref=f1e36]: 0%
```

# Test source

```ts
  218 | 
  219 |   test("direct navigation to /oracle renders without a white screen", async ({
  220 |     page,
  221 |   }) => {
  222 |     await page.goto("/oracle");
  223 |     await page.waitForLoadState("domcontentloaded");
  224 |     const rootVisible = await page.locator("#root").isVisible();
  225 |     expect(rootVisible).toBe(true);
  226 |   });
  227 | 
  228 |   test("public share routes (/s/...) render without the authenticated shell", async ({
  229 |     page,
  230 |   }) => {
  231 |     // These routes bypass the main shell entirely; the app must not crash.
  232 |     await page.goto("/s/nonexistent-zine-id");
  233 |     await page.waitForLoadState("domcontentloaded");
  234 |     // No JS crash → #root still rendered.
  235 |     const rootVisible = await page.locator("#root").isVisible();
  236 |     expect(rootVisible).toBe(true);
  237 |   });
  238 | });
  239 | 
  240 | // ---------------------------------------------------------------------------
  241 | // 5. SERVICE WORKER
  242 | // ---------------------------------------------------------------------------
  243 | test.describe("Service worker", () => {
  244 |   test("sw.js is served with a 200 status", async ({ request }) => {
  245 |     const res = await request.get("/sw.js");
  246 |     expect(res.ok()).toBe(true);
  247 |   });
  248 | 
  249 |   test("sw.js Content-Type is JavaScript", async ({ request }) => {
  250 |     const res = await request.get("/sw.js");
  251 |     const ct = res.headers()["content-type"] ?? "";
  252 |     expect(ct).toMatch(/javascript/i);
  253 |   });
  254 | 
  255 |   test("web-app manifest (metadata.json) is valid JSON with required PWA fields", async ({
  256 |     request,
  257 |   }) => {
  258 |     const res = await request.get("/metadata.json");
  259 |     expect(res.ok()).toBe(true);
  260 |     const manifest = await res.json();
  261 |     expect(manifest.name).toBeTruthy();
  262 |     expect(manifest.start_url).toBeTruthy();
  263 |     expect(manifest.display).toBe("standalone");
  264 |     expect(Array.isArray(manifest.icons)).toBe(true);
  265 |     expect(manifest.icons.length).toBeGreaterThan(0);
  266 |   });
  267 | 
  268 |   test("manifest link is present in the document head", async ({ page }) => {
  269 |     await page.goto("/");
  270 |     const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  271 |     expect(href).toBeTruthy();
  272 |   });
  273 | 
  274 |   test("apple-touch-icon is declared for home-screen icon", async ({ page }) => {
  275 |     await page.goto("/");
  276 |     const href = await page
  277 |       .locator('link[rel="apple-touch-icon"]')
  278 |       .getAttribute("href");
  279 |     expect(href).toBeTruthy();
  280 |   });
  281 | });
  282 | 
  283 | // ---------------------------------------------------------------------------
  284 | // 6. ROUTE RESTORATION
  285 | // ---------------------------------------------------------------------------
  286 | test.describe("Route restoration", () => {
  287 |   test("navigating to a private route persists it in localStorage", async ({
  288 |     page,
  289 |   }) => {
  290 |     await page.goto("/archival");
  291 |     await page.waitForLoadState("domcontentloaded");
  292 | 
  293 |     // Poll until the useEffect that writes localStorage has run.
  294 |     await page.waitForFunction(
  295 |       () => localStorage.getItem("mimi_last_route") === "/archival",
  296 |     );
  297 | 
  298 |     const saved = await page.evaluate(() =>
  299 |       localStorage.getItem("mimi_last_route"),
  300 |     );
  301 |     expect(saved).toBe("/archival");
  302 |   });
  303 | 
  304 |   test("cold launch from / restores the last saved private route", async ({
  305 |     page,
  306 |   }) => {
  307 |     // Pre-seed localStorage with a saved route.
  308 |     await page.goto("/studio");
  309 |     await page.waitForLoadState("domcontentloaded");
  310 |     await page.evaluate(() => {
  311 |       localStorage.setItem("mimi_last_route", "/oracle");
  312 |     });
  313 | 
  314 |     // Cold launch: navigate to bare "/".
  315 |     await page.goto("/");
  316 |     await page.waitForURL((url) => url.pathname !== "/");
  317 | 
> 318 |     expect(new URL(page.url()).pathname).toBe("/oracle");
      |                                          ^ Error: expect(received).toBe(expected) // Object.is equality
  319 |   });
  320 | 
  321 |   test("cold launch without saved route defaults to /studio", async ({
  322 |     page,
  323 |   }) => {
  324 |     await page.goto("/studio");
  325 |     await page.waitForLoadState("domcontentloaded");
  326 |     await page.evaluate(() => localStorage.removeItem("mimi_last_route"));
  327 | 
  328 |     await page.goto("/");
  329 |     await page.waitForURL((url) => url.pathname !== "/");
  330 | 
  331 |     expect(new URL(page.url()).pathname).toBe("/studio");
  332 |   });
  333 | 
  334 |   test("public share routes are never saved as the last private route", async ({
  335 |     page,
  336 |   }) => {
  337 |     // Seed a legitimate prior route so we can confirm it is NOT overwritten.
  338 |     await page.goto("/studio");
  339 |     await page.waitForLoadState("domcontentloaded");
  340 |     await page.evaluate(() => {
  341 |       localStorage.setItem("mimi_last_route", "/studio");
  342 |     });
  343 | 
  344 |     // Visit a public share URL.
  345 |     await page.goto("/s/some-share-id");
  346 |     await page.waitForLoadState("domcontentloaded");
  347 |     // Drain animation frames so the persistence effect has had a chance to run.
  348 |     // If the route were incorrectly saved the value would change here.
  349 |     await waitForAnimationFrames(page);
  350 | 
  351 |     const saved = await page.evaluate(() =>
  352 |       localStorage.getItem("mimi_last_route"),
  353 |     );
  354 |     // Must still be the private studio route, not the share URL.
  355 |     expect(saved).toBe("/studio");
  356 |   });
  357 | 
  358 |   test("auth routes are never saved as the last private route", async ({
  359 |     page,
  360 |   }) => {
  361 |     await page.goto("/studio");
  362 |     await page.waitForLoadState("domcontentloaded");
  363 |     await page.evaluate(() => {
  364 |       localStorage.setItem("mimi_last_route", "/studio");
  365 |     });
  366 | 
  367 |     await page.goto("/auth/action?mode=signIn&oobCode=abc");
  368 |     await page.waitForLoadState("domcontentloaded");
  369 |     // Drain animation frames so the persistence effect has had a chance to run.
  370 |     // If the auth route were incorrectly saved the value would change here.
  371 |     await waitForAnimationFrames(page);
  372 | 
  373 |     const saved = await page.evaluate(() =>
  374 |       localStorage.getItem("mimi_last_route"),
  375 |     );
  376 |     expect(saved).toBe("/studio");
  377 |   });
  378 | });
  379 | 
```