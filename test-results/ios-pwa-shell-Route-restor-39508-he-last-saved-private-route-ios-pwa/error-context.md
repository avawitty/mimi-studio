# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ios-pwa-shell.spec.ts >> Route restoration >> cold launch from / restores the last saved private route
- Location: e2e/ios-pwa-shell.spec.ts:303:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForURL: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
  navigated to "http://localhost:3000/studio"
============================================================
```

# Page snapshot

```yaml
- generic [ref=f1e4]:
  - generic [ref=f1e7]:
    - button [ref=f1e8]
    - generic [ref=f1e12]:
      - generic [ref=f1e13]:
        - generic [ref=f1e14]: Aesthetic Sovereignty
        - heading "Claim Your Canonical Node" [level=2] [ref=f1e18]
        - paragraph [ref=f1e19]: Your local archive is ephemeral. Link an identity to anchor your aesthetic vision to a permanent sovereign domain.
      - generic [ref=f1e20]:
        - button "Sign in with Google" [ref=f1e21]
        - button "Explore as guest →" [ref=f1e27]
      - generic [ref=f1e28]:
        - generic [ref=f1e29]:
          - generic [ref=f1e30]: Private
          - generic [ref=f1e34]: Secure
          - generic [ref=f1e39]: Fast
        - paragraph [ref=f1e43]: We will never sell your data or train public models on your private archives.
  - main [ref=f1e45]:
    - generic [ref=f1e47]:
      - generic [ref=f1e48]:
        - generic [ref=f1e49]:
          - button "Return to Mimi Studio" [ref=f1e50] [cursor=pointer]:
            - generic [ref=f1e51]: Mimi
          - generic [ref=f1e52]: Studio
        - generic [ref=f1e53]:
          - button "Open full menu" [ref=f1e54]
          - button "Commune with the Oracle" [ref=f1e56]
          - button "Switch to dark mode" [ref=f1e60]
          - button "Sign On" [ref=f1e63]
      - generic [ref=f1e65]:
        - text: Attach Media Artifact Record voice memo Dictate narrative live Reset Workspace Whip Title Spark Superintelligence Engine Semantic Web Grounding System Optics Generate Aesthetic Spark Custom Tailor Override Review Manifesto Colophon Preset Treatments Canvas
        - generic [ref=f1e66]:
          - generic [ref=f1e67]:
            - tablist "Studio pages" [ref=f1e68]:
              - tab "Input page" [selected] [ref=f1e69]
              - tab "Cover page" [ref=f1e71]
            - generic [ref=f1e73]: 7/29/2026 ○ 5:45AM
            - generic [ref=f1e74]: PROMPT CYCLE 1
            - generic [ref=f1e76]: From fragment to finished issue
            - heading "Turn source material into an editorial issue." [level=1] [ref=f1e77]
            - paragraph [ref=f1e78]: Begin with a fragment, reference, tension, or question. Mimi helps shape it without flattening your voice.
          - generic [ref=f1e80]:
            - generic [ref=f1e81]: 01 / Source material
            - textbox "Paste a fragment, reference, question, or unfinished idea..." [ref=f1e84]: The color scale of that space was...
          - generic [ref=f1e85]:
            - generic [ref=f1e86]: Context Mimi will use
            - button "Configure detailed brief" [ref=f1e89]
            - paragraph [ref=f1e97]: No context active. Mimi will generate from raw prompt text.
          - generic [ref=f1e98]:
            - generic [ref=f1e99]:
              - button "Attach" [ref=f1e100]
              - button "Voice" [ref=f1e104]
              - button "Dictate" [ref=f1e109]
              - button "Title" [ref=f1e117]
              - button "Spark" [ref=f1e121]
              - button "Deep" [ref=f1e126]
              - button "Web" [ref=f1e140]
              - button "Tailor" [ref=f1e145]
              - button "Optics" [ref=f1e153]
              - button "Treatments" [ref=f1e158]
              - button "Colophon" [ref=f1e164]
              - button "Reset" [ref=f1e169]
              - button "Doll" [ref=f1e174]
            - generic [ref=f1e181]:
              - button "Shape" [ref=f1e182]
              - button "Preview" [ref=f1e183]
              - button "Develop" [ref=f1e187]
      - navigation "Studio navigation" [ref=f1e190]:
        - button "Compose" [ref=f1e191]
        - button "Anchors" [ref=f1e195]
        - button "Treatments" [ref=f1e201]
        - button "Pocket" [ref=f1e207]
        - button "More" [ref=f1e212]
    - dialog "Cookie consent":
      - generic [ref=f1e218]:
        - generic [ref=f1e222]:
          - paragraph [ref=f1e223]: Cookies & storage on mimi.you
          - paragraph [ref=f1e224]:
            - text: We use essential cookies and local storage for sign-in (
            - code [ref=f1e225]: __session
            - text: ), security, and saving your studio state. Optional analytics and affiliate measurement load only if you accept. Auth always works with essential-only.
        - generic [ref=f1e226]:
          - link "Learn more" [ref=f1e227]:
            - /url: /privacy#cookies
          - button "Essential only" [ref=f1e228]
          - button "Accept all" [ref=f1e229]
```

# Test source

```ts
  215 |     expect(rootVisible).toBe(true);
  216 |   });
  217 | 
  218 |   test("direct navigation to /oracle renders without a white screen", async ({
  219 |     page,
  220 |   }) => {
  221 |     await page.goto("/oracle");
  222 |     await page.waitForLoadState("domcontentloaded");
  223 |     const rootVisible = await page.locator("#root").isVisible();
  224 |     expect(rootVisible).toBe(true);
  225 |   });
  226 | 
  227 |   test("public share routes (/s/...) render without the authenticated shell", async ({
  228 |     page,
  229 |   }) => {
  230 |     // These routes bypass the main shell entirely; the app must not crash.
  231 |     await page.goto("/s/nonexistent-zine-id");
  232 |     await page.waitForLoadState("domcontentloaded");
  233 |     // No JS crash → #root still rendered.
  234 |     const rootVisible = await page.locator("#root").isVisible();
  235 |     expect(rootVisible).toBe(true);
  236 |   });
  237 | });
  238 | 
  239 | // ---------------------------------------------------------------------------
  240 | // 5. SERVICE WORKER
  241 | // ---------------------------------------------------------------------------
  242 | test.describe("Service worker", () => {
  243 |   test("sw.js is served with a 200 status", async ({ request }) => {
  244 |     const res = await request.get("/sw.js");
  245 |     expect(res.ok()).toBe(true);
  246 |   });
  247 | 
  248 |   test("sw.js Content-Type is JavaScript", async ({ request }) => {
  249 |     const res = await request.get("/sw.js");
  250 |     const ct = res.headers()["content-type"] ?? "";
  251 |     expect(ct).toMatch(/javascript/i);
  252 |   });
  253 | 
  254 |   test("web-app manifest (metadata.json) is valid JSON with required PWA fields", async ({
  255 |     request,
  256 |   }) => {
  257 |     const res = await request.get("/metadata.json");
  258 |     expect(res.ok()).toBe(true);
  259 |     const manifest = await res.json();
  260 |     expect(manifest.name).toBeTruthy();
  261 |     expect(manifest.start_url).toBeTruthy();
  262 |     expect(manifest.display).toBe("standalone");
  263 |     expect(Array.isArray(manifest.icons)).toBe(true);
  264 |     expect(manifest.icons.length).toBeGreaterThan(0);
  265 |   });
  266 | 
  267 |   test("manifest link is present in the document head", async ({ page }) => {
  268 |     await page.goto("/");
  269 |     const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  270 |     expect(href).toBeTruthy();
  271 |   });
  272 | 
  273 |   test("apple-touch-icon is declared for home-screen icon", async ({ page }) => {
  274 |     await page.goto("/");
  275 |     const href = await page
  276 |       .locator('link[rel="apple-touch-icon"]')
  277 |       .getAttribute("href");
  278 |     expect(href).toBeTruthy();
  279 |   });
  280 | });
  281 | 
  282 | // ---------------------------------------------------------------------------
  283 | // 6. ROUTE RESTORATION
  284 | // ---------------------------------------------------------------------------
  285 | test.describe("Route restoration", () => {
  286 |   test("navigating to a private route persists it in localStorage", async ({
  287 |     page,
  288 |   }) => {
  289 |     await page.goto("/archival");
  290 |     await page.waitForLoadState("domcontentloaded");
  291 | 
  292 |     // Poll until the useEffect that writes localStorage has run.
  293 |     await page.waitForFunction(
  294 |       () => localStorage.getItem("mimi_last_route") === "/archival",
  295 |     );
  296 | 
  297 |     const saved = await page.evaluate(() =>
  298 |       localStorage.getItem("mimi_last_route"),
  299 |     );
  300 |     expect(saved).toBe("/archival");
  301 |   });
  302 | 
  303 |   test("cold launch from / restores the last saved private route", async ({
  304 |     page,
  305 |   }) => {
  306 |     // Pre-seed localStorage with a saved route.
  307 |     await page.goto("/studio");
  308 |     await page.waitForLoadState("domcontentloaded");
  309 |     await page.evaluate(() => {
  310 |       localStorage.setItem("mimi_last_route", "/oracle");
  311 |     });
  312 | 
  313 |     // Cold launch: navigate to bare "/".
  314 |     await page.goto("/");
> 315 |     await page.waitForURL((url) => url.pathname === "/oracle");
      |                ^ Error: page.waitForURL: Test timeout of 30000ms exceeded.
  316 | 
  317 |     expect(new URL(page.url()).pathname).toBe("/oracle");
  318 |   });
  319 | 
  320 |   test("cold launch without saved route defaults to /studio", async ({
  321 |     page,
  322 |   }) => {
  323 |     await page.goto("/studio");
  324 |     await page.waitForLoadState("domcontentloaded");
  325 |     await page.evaluate(() => localStorage.removeItem("mimi_last_route"));
  326 | 
  327 |     await page.goto("/");
  328 |     await page.waitForURL((url) => url.pathname !== "/");
  329 | 
  330 |     expect(new URL(page.url()).pathname).toBe("/studio");
  331 |   });
  332 | 
  333 |   test("public share routes are never saved as the last private route", async ({
  334 |     page,
  335 |   }) => {
  336 |     // Seed a legitimate prior route so we can confirm it is NOT overwritten.
  337 |     await page.goto("/studio");
  338 |     await page.waitForLoadState("domcontentloaded");
  339 |     await page.evaluate(() => {
  340 |       localStorage.setItem("mimi_last_route", "/studio");
  341 |     });
  342 | 
  343 |     // Visit a public share URL.
  344 |     await page.goto("/s/some-share-id");
  345 |     await page.waitForLoadState("domcontentloaded");
  346 |     // Drain animation frames so the persistence effect has had a chance to run.
  347 |     // If the route were incorrectly saved the value would change here.
  348 |     await waitForAnimationFrames(page);
  349 | 
  350 |     const saved = await page.evaluate(() =>
  351 |       localStorage.getItem("mimi_last_route"),
  352 |     );
  353 |     // Must still be the private studio route, not the share URL.
  354 |     expect(saved).toBe("/studio");
  355 |   });
  356 | 
  357 |   test("auth routes are never saved as the last private route", async ({
  358 |     page,
  359 |   }) => {
  360 |     await page.goto("/studio");
  361 |     await page.waitForLoadState("domcontentloaded");
  362 |     await page.evaluate(() => {
  363 |       localStorage.setItem("mimi_last_route", "/studio");
  364 |     });
  365 | 
  366 |     await page.goto("/auth/action?mode=signIn&oobCode=abc");
  367 |     await page.waitForLoadState("domcontentloaded");
  368 |     await expect
  369 |       .poll(async () => {
  370 |         try {
  371 |           return await page.evaluate(() =>
  372 |             localStorage.getItem("mimi_last_route"),
  373 |           );
  374 |         } catch {
  375 |           return null;
  376 |         }
  377 |       })
  378 |       .toBe("/studio");
  379 | 
  380 |     const saved = await page.evaluate(() =>
  381 |       localStorage.getItem("mimi_last_route"),
  382 |     );
  383 |     expect(saved).toBe("/studio");
  384 |   });
  385 | 
  386 |   test("checkout callback routes are never saved as the last private route", async ({
  387 |     page,
  388 |   }) => {
  389 |     await page.goto("/studio");
  390 |     await page.waitForLoadState("domcontentloaded");
  391 |     await page.evaluate(() => {
  392 |       localStorage.setItem("mimi_last_route", "/studio");
  393 |     });
  394 | 
  395 |     await page.goto("/success?checkout=success&plan=core&interval=month");
  396 |     await page.waitForLoadState("domcontentloaded");
  397 |     await waitForAnimationFrames(page);
  398 | 
  399 |     const saved = await page.evaluate(() =>
  400 |       localStorage.getItem("mimi_last_route"),
  401 |     );
  402 |     expect(saved).toBe("/studio");
  403 |   });
  404 | 
  405 |   test("cold launch ignores malformed or unknown saved routes", async ({
  406 |     page,
  407 |   }) => {
  408 |     const invalidSavedRoutes = [
  409 |       "/not-a-route",
  410 |       "/success",
  411 |       "//evil.example/path",
  412 |       "javascript:alert(1)",
  413 |       "data:text/html,<h1>x</h1>",
  414 |       "vbscript:msgbox(1)",
  415 |       "file:///tmp/mimi-route",
```