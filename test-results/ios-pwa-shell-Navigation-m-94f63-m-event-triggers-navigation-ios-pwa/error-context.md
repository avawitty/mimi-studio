# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ios-pwa-shell.spec.ts >> Navigation >> mimi:route-request custom event triggers navigation
- Location: e2e/ios-pwa-shell.spec.ts:137:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForFunction: Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e7]:
    - button [ref=e8]
    - generic [ref=e12]:
      - generic [ref=e13]:
        - generic [ref=e14]: Aesthetic Sovereignty
        - heading "Claim Your Canonical Node" [level=2] [ref=e18]
        - paragraph [ref=e19]: Your local archive is ephemeral. Link an identity to anchor your aesthetic vision to a permanent sovereign domain.
      - generic [ref=e20]:
        - button "Sign in with Google" [ref=e21]
        - button "Explore as guest →" [ref=e27]
      - generic [ref=e28]:
        - generic [ref=e29]:
          - generic [ref=e30]: Private
          - generic [ref=e34]: Secure
          - generic [ref=e39]: Fast
        - paragraph [ref=e43]: We will never sell your data or train public models on your private archives.
  - main [ref=e45]:
    - generic [ref=e47]:
      - generic [ref=e48]:
        - generic [ref=e49]:
          - button "Return to Mimi Studio" [ref=e50] [cursor=pointer]:
            - generic [ref=e51]: Mimi
          - generic [ref=e52]: Studio
        - generic [ref=e53]:
          - button "Open full menu" [ref=e54]
          - button "Commune with the Oracle" [ref=e56]
          - button "Switch to dark mode" [ref=e60]
          - button "Sign On" [ref=e63]
      - generic [ref=e65]:
        - text: Attach Media Artifact Record voice memo Dictate narrative live Reset Workspace Whip Title Spark Superintelligence Engine Semantic Web Grounding System Optics Generate Aesthetic Spark Custom Tailor Override Review Manifesto Colophon Preset Treatments Canvas
        - generic [ref=e66]:
          - generic [ref=e67]:
            - tablist "Studio pages" [ref=e68]:
              - tab "Input page" [selected] [ref=e69]
              - tab "Cover page" [ref=e71]
            - generic [ref=e73]: 7/29/2026 ○ 5:33AM
            - generic [ref=e74]: PROMPT CYCLE 1
            - generic [ref=e76]: From fragment to finished issue
            - heading "Turn source material into an editorial issue." [level=1] [ref=e77]
            - paragraph [ref=e78]: Begin with a fragment, reference, tension, or question. Mimi helps shape it without flattening your voice.
          - generic [ref=e80]:
            - generic [ref=e81]: 01 / Source material
            - textbox "Paste a fragment, reference, question, or unfinished idea..." [ref=e84]: If I had to select three objects of absolute significance, they would be...
          - generic [ref=e85]:
            - generic [ref=e86]: Context Mimi will use
            - button "Configure detailed brief" [ref=e89]
            - paragraph [ref=e97]: No context active. Mimi will generate from raw prompt text.
          - generic [ref=e98]:
            - generic [ref=e99]:
              - button "Attach" [ref=e100]
              - button "Voice" [ref=e104]
              - button "Dictate" [ref=e109]
              - button "Title" [ref=e117]
              - button "Spark" [ref=e121]
              - button "Deep" [ref=e126]
              - button "Web" [ref=e140]
              - button "Tailor" [ref=e145]
              - button "Optics" [ref=e153]
              - button "Treatments" [ref=e158]
              - button "Colophon" [ref=e164]
              - button "Reset" [ref=e169]
              - button "Doll" [ref=e174]
            - generic [ref=e181]:
              - button "Shape" [ref=e182]
              - button "Preview" [ref=e183]
              - button "Develop" [ref=e187]
      - navigation "Studio navigation" [ref=e190]:
        - button "Compose" [ref=e191]
        - button "Anchors" [ref=e195]
        - button "Treatments" [ref=e201]
        - button "Pocket" [ref=e207]
        - button "More" [ref=e212]
    - dialog "Cookie consent":
      - generic [ref=e218]:
        - generic [ref=e222]:
          - paragraph [ref=e223]: Cookies & storage on mimi.you
          - paragraph [ref=e224]:
            - text: We use essential cookies and local storage for sign-in (
            - code [ref=e225]: __session
            - text: ), security, and saving your studio state. Optional analytics and affiliate measurement load only if you accept. Auth always works with essential-only.
        - generic [ref=e226]:
          - link "Learn more" [ref=e227]:
            - /url: /privacy#cookies
          - button "Essential only" [ref=e228]
          - button "Accept all" [ref=e229]
```

# Test source

```ts
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
  131 |     await page.waitForFunction(
  132 |       () => window.location.pathname === "/studio",
  133 |     );
  134 |     expect(new URL(page.url()).pathname).toBe("/studio");
  135 |   });
  136 | 
  137 |   test("mimi:route-request custom event triggers navigation", async ({
  138 |     page,
  139 |   }) => {
  140 |     await page.goto("/studio");
  141 |     await page.waitForLoadState("domcontentloaded");
  142 | 
  143 |     await page.evaluate(() => {
  144 |       window.dispatchEvent(
  145 |         new CustomEvent("mimi:route-request", { detail: { path: "/oracle" } }),
  146 |       );
  147 |     });
> 148 |     await page.waitForFunction(
      |                ^ Error: page.waitForFunction: Test timeout of 30000ms exceeded.
  149 |       () => window.location.pathname === "/oracle",
  150 |     );
  151 |     expect(new URL(page.url()).pathname).toBe("/oracle");
  152 |   });
  153 | });
  154 | 
  155 | // ---------------------------------------------------------------------------
  156 | // 3. KEYBOARD
  157 | // ---------------------------------------------------------------------------
  158 | test.describe("Keyboard avoidance", () => {
  159 |   test("html and body use dynamic viewport height (dvh)", async ({ page }) => {
  160 |     await page.goto("/studio");
  161 |     await page.waitForLoadState("domcontentloaded");
  162 | 
  163 |     const { htmlHeight, bodyHeight } = await page.evaluate(() => ({
  164 |       htmlHeight: window.getComputedStyle(document.documentElement).height,
  165 |       bodyHeight: window.getComputedStyle(document.body).height,
  166 |     }));
  167 |     // Both should be a px value derived from 100dvh (i.e. match the viewport).
  168 |     const vh = page.viewportSize()?.height ?? 0;
  169 |     const parseHeight = (s: string) => parseFloat(s);
  170 |     expect(parseHeight(htmlHeight)).toBeGreaterThan(0);
  171 |     expect(parseHeight(bodyHeight)).toBeGreaterThan(0);
  172 |     // Height must be within 10 % of the reported viewport height (dvh tracks it).
  173 |     expect(Math.abs(parseHeight(htmlHeight) - vh)).toBeLessThanOrEqual(vh * 0.1);
  174 |   });
  175 | 
  176 |   test("body has overscroll-behavior-y: none to prevent elastic bounce", async ({
  177 |     page,
  178 |   }) => {
  179 |     await page.goto("/");
  180 |     const overscroll = await page.evaluate(
  181 |       () => window.getComputedStyle(document.body).overscrollBehaviorY,
  182 |     );
  183 |     expect(overscroll).toBe("none");
  184 |   });
  185 | 
  186 |   test("viewport meta disables user-scalable to prevent zoom on input tap", async ({
  187 |     page,
  188 |   }) => {
  189 |     await page.goto("/");
  190 |     const content = await page
  191 |       .locator('meta[name="viewport"]')
  192 |       .getAttribute("content");
  193 |     // iOS PWA convention: prevent accidental zoom when tapping inputs.
  194 |     expect(content).toMatch(/user-scalable=no/);
  195 |   });
  196 | });
  197 | 
  198 | // ---------------------------------------------------------------------------
  199 | // 4. COLD LAUNCH (deep-link)
  200 | // ---------------------------------------------------------------------------
  201 | test.describe("Cold launch", () => {
  202 |   test("direct navigation to /studio renders the app shell", async ({
  203 |     page,
  204 |   }) => {
  205 |     await page.goto("/studio");
  206 |     await expect(page.locator("#root")).toBeVisible();
  207 |     await expect(page).toHaveTitle(/Mimi/i);
  208 |   });
  209 | 
  210 |   test("direct navigation to /archival renders without a white screen", async ({
  211 |     page,
  212 |   }) => {
  213 |     await page.goto("/archival");
  214 |     await page.waitForLoadState("domcontentloaded");
  215 |     const rootVisible = await page.locator("#root").isVisible();
  216 |     expect(rootVisible).toBe(true);
  217 |   });
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
```