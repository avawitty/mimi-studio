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
- generic [ref=f1e3]:
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
      - generic [ref=f1e36]: 1%
  - generic [ref=f1e39]:
    - generic [ref=f1e42]:
      - button [ref=f1e43]
      - generic [ref=f1e47]:
        - generic [ref=f1e48]:
          - generic [ref=f1e49]: Aesthetic Sovereignty
          - heading "Claim Your Canonical Node" [level=2] [ref=f1e53]
          - paragraph [ref=f1e54]: Your local archive is ephemeral. Link an identity to anchor your aesthetic vision to a permanent sovereign domain.
        - generic [ref=f1e55]:
          - button "Sign in with Google" [ref=f1e56]
          - button "Explore as guest →" [ref=f1e62]
        - generic [ref=f1e63]:
          - generic [ref=f1e64]:
            - generic [ref=f1e65]: Private
            - generic [ref=f1e69]: Secure
            - generic [ref=f1e74]: Fast
          - paragraph [ref=f1e78]: We will never sell your data or train public models on your private archives.
    - main [ref=f1e80]:
      - generic [ref=f1e82]:
        - generic [ref=f1e83]:
          - generic [ref=f1e84]:
            - button "Return to Mimi Studio" [ref=f1e85] [cursor=pointer]:
              - generic [ref=f1e86]: Mimi
            - generic [ref=f1e87]: Studio
          - generic [ref=f1e88]:
            - button "Open full menu" [ref=f1e89]
            - button "Commune with the Oracle" [ref=f1e91]
            - button "Switch to dark mode" [ref=f1e95]
            - button "Sign On" [ref=f1e98]
        - generic [ref=f1e100]:
          - text: Attach Media Artifact Record voice memo Dictate narrative live Reset Workspace Whip Title Spark Superintelligence Engine Semantic Web Grounding System Optics Generate Aesthetic Spark Custom Tailor Override Review Manifesto Colophon Preset Treatments Canvas
          - generic [ref=f1e101]:
            - generic [ref=f1e102]:
              - tablist "Studio pages" [ref=f1e103]:
                - tab "Input page" [selected] [ref=f1e104]
                - tab "Cover page" [ref=f1e106]
              - generic [ref=f1e108]: 7/29/2026 ○ 5:41AM
              - generic [ref=f1e109]: PROMPT CYCLE 1
              - generic [ref=f1e111]: From fragment to finished issue
              - heading "Turn source material into an editorial issue." [level=1] [ref=f1e112]
              - paragraph [ref=f1e113]: Begin with a fragment, reference, tension, or question. Mimi helps shape it without flattening your voice.
            - generic [ref=f1e115]:
              - generic [ref=f1e116]: 01 / Source material
              - textbox "Paste a fragment, reference, question, or unfinished idea..." [ref=f1e119]: If I had to select three objects of absolute significance, they would be...
            - generic [ref=f1e120]:
              - generic [ref=f1e121]: Context Mimi will use
              - button "Configure detailed brief" [ref=f1e124]
              - paragraph [ref=f1e132]: No context active. Mimi will generate from raw prompt text.
            - generic [ref=f1e133]:
              - generic [ref=f1e134]:
                - button "Attach" [ref=f1e135]
                - button "Voice" [ref=f1e139]
                - button "Dictate" [ref=f1e144]
                - button "Title" [ref=f1e152]
                - button "Spark" [ref=f1e156]
                - button "Deep" [ref=f1e161]
                - button "Web" [ref=f1e175]
                - button "Tailor" [ref=f1e180]
                - button "Optics" [ref=f1e188]
                - button "Treatments" [ref=f1e193]
                - button "Colophon" [ref=f1e199]
                - button "Reset" [ref=f1e204]
                - button "Doll" [ref=f1e209]
              - generic [ref=f1e213]:
                - button "Shape" [ref=f1e214]
                - button "Preview" [ref=f1e215]
                - button "Develop" [ref=f1e219]
        - navigation "Studio navigation" [ref=f1e222]:
          - button "Compose" [ref=f1e223]
          - button "Anchors" [ref=f1e227]
          - button "Treatments" [ref=f1e233]
          - button "Pocket" [ref=f1e239]
          - button "More" [ref=f1e244]
      - dialog "Cookie consent":
        - generic [ref=f1e250]:
          - generic [ref=f1e254]:
            - paragraph [ref=f1e255]: Cookies & storage on mimi.you
            - paragraph [ref=f1e256]:
              - text: We use essential cookies and local storage for sign-in (
              - code [ref=f1e257]: __session
              - text: ), security, and saving your studio state. Optional analytics and affiliate measurement load only if you accept. Auth always works with essential-only.
          - generic [ref=f1e258]:
            - link "Learn more" [ref=f1e259]:
              - /url: /privacy#cookies
            - button "Essential only" [ref=f1e260]
            - button "Accept all" [ref=f1e261]
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
  378 | 
  379 |   test("checkout callback routes are never saved as the last private route", async ({
  380 |     page,
  381 |   }) => {
  382 |     await page.goto("/studio");
  383 |     await page.waitForLoadState("domcontentloaded");
  384 |     await page.evaluate(() => {
  385 |       localStorage.setItem("mimi_last_route", "/studio");
  386 |     });
  387 | 
  388 |     await page.goto("/success?checkout=success&plan=core&interval=month");
  389 |     await page.waitForLoadState("domcontentloaded");
  390 |     await waitForAnimationFrames(page);
  391 | 
  392 |     const saved = await page.evaluate(() =>
  393 |       localStorage.getItem("mimi_last_route"),
  394 |     );
  395 |     expect(saved).toBe("/studio");
  396 |   });
  397 | 
  398 |   test("cold launch ignores malformed or unknown saved routes", async ({
  399 |     page,
  400 |   }) => {
  401 |     const invalidSavedRoutes = [
  402 |       "/not-a-route",
  403 |       "/success",
  404 |       "//evil.example/path",
  405 |       "javascript:alert(1)",
  406 |       "data:text/html,<h1>x</h1>",
  407 |       "vbscript:msgbox(1)",
  408 |       "file:///tmp/mimi-route",
  409 |     ];
  410 | 
  411 |     for (const savedRoute of invalidSavedRoutes) {
  412 |       await page.goto("/studio");
  413 |       await page.waitForLoadState("domcontentloaded");
  414 |       await page.evaluate((value) => {
  415 |         localStorage.setItem("mimi_last_route", value);
  416 |       }, savedRoute);
  417 | 
  418 |       await page.goto("/");
```