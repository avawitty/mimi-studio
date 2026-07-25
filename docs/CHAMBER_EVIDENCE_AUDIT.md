# MIMI Chamber Evidence Audit

**Status:** Draft orientation memo — **not** a verified runtime audit  
**Method:** Static code inspection of this repository (no manual chamber walkthrough; no automated tests)  
**Date context:** Commit base at audit time; claims below cite file paths and measured commands  
**Verdict:** Reject prior “fully operational / perfectly green / permanently eliminates” language. Prefer the chamber template below.

---

## How to read this document

| Field | Meaning |
|-------|---------|
| **Status** | `Routed` / `Overlay` / `Special-route` / `Stub` / `Unwired` |
| **Evidence** | File, route, collection, or key function |
| **Confidence** | High / Medium / Low (static evidence strength) |
| **Runtime verification** | `Static only` unless otherwise noted |
| **Restoration effort** | Dependencies + complexity notes (not calendar estimates) |

### Language discipline (adopted)

| Avoid | Prefer |
|-------|--------|
| fully operational | routed and renders; persistence unverified |
| completely built | implemented; requires runtime + test validation |
| perfectly green | build passes; `tsc --noEmit` currently reports 18 errors |
| permanently eliminates | prevents indefinite splash via timeout/bypass |

---

## Measured metrics

| Metric | Measured value | Notes |
|--------|----------------|-------|
| Sidebar nav items (`MENU_STRUCTURE`) | **23** | `components/navigationConfig.ts` |
| `viewMode` render branches in `App.tsx` | **47** | Many exist only via deep links / events |
| Sidebar-wired chambers | **23** | Includes `mimi-you` → `/u/:handle` special route |
| Routed but not in sidebar | **~24** | e.g. `scry`, `nebula`, `loom`, `forecast`, `qc_engine`, `latent-constellation` |
| TypeScript interfaces (`types.ts`) | **118** | `export interface` count |
| Feature flags (dev toggles) | **5** | `scry`, `darkroom`, `theLens`, `tailor`, `proposal` — mostly unwired for routing |
| Automated tests | **0** | No project `*.test.*` / `*.spec.*` |
| Explicit `TODO` markers | **1** | `services/geminiService.ts` — mock/simulated/placeholder patterns dominate instead |
| `npm run lint` (`tsc --noEmit`) | **18 errors**, exit 2 | Not green |
| `npm run build` | **Pass** | Large-chunk warnings; main bundle ~2.9MB (`index-*.js` ≈ 2,882 kB) |

### TypeScript errors (summary)

- Missing modules: `lib/stripeMembership.js`, several `lib/mimi*Route.js`, `lib/openaiAppsChallenge.js`
- `user.displayName` used where user type is `{ uid, isAnonymous, email? }` (`App.tsx`, Tailor files)
- Tailor Hub / ProjectFlow / service type mismatches
- `server/tailorRoutes.ts` `string | string[]` argument mismatch

---

## Startup flow (what prior audits omit)

```
App mount
  → UserProvider init
  → initializeAuthPersistence + ensureAuth
  → Auth state / redirect
  → speedGhostEntrance local profile
  → reconcileProfile
  → Promise.race cloud sync (5s timeout)
  → Firestore listeners + subscription race (4s)
  → setLoading false / hydrated
  → authLoading or isElevatorLoading?
       yes → ElevatorLoader + user bypass
       no  → Path router → viewMode → chamber render
```

| Mechanism | Accurate wording | Evidence |
|-----------|------------------|----------|
| Cloud sync race | Prevents indefinite splash; allows startup failures to surface as guest/local mode | `contexts/UserContext.tsx` ~458–494 — `Promise.race` vs 5s timeout resolving `[null, null]` |
| Auth ritual safety timeout | Same: unblocks UI; does **not** repair root cause | `UserContext.tsx` ~715–726 — 6s timeout → guest / local-only messaging |
| Elevator bypass | Explicit user bypass of splash / auth gate | `App.tsx` ~1269–1278 — `onBypass` → `setElevatorLoading(false)` + `forceBypassAuth()` |
| Investor-demo overrides | Production auth labels may not match real Firebase anonymous state | `UserContext.tsx` — `isSwan: true` / `isAnonymous: false` forced with `OVERRIDE FOR INVESTOR DEMO` |

**Failure / hang points:** Firebase auth silence, Firestore permission/offline window, subscription fetch, cloud profile reconciliation. Timeouts unblock UI; they do **not** guarantee data correctness.

---

## Claim corrections (prior audit → evidence)

| Claim | Verdict | Evidence | Confidence |
|-------|---------|----------|------------|
| Splash Safety Watchdog “permanently eliminates” loading states | **Timeout masking**, not root-cause repair | `UserContext.tsx` 5s cloud race + 6s auth safety; `ElevatorLoader` bypass | High |
| Production build and lint “perfectly green” | **Overstated** | Build pass; lint 18 TS errors | High |
| Scribe saves Memory Atoms | **False / misleading** | Scribe → Pocket; Atoms → `memoryService` | High |
| Thimble “queries Depop” | **Mostly overstated** | Depop is search URL `window.open`, not API | High |
| Wardrobe supports cost-per-wear | **Confirmed** | `WardrobeView.tsx` `calculateCostPerWear`; no automated tests | High |
| Taste Graph exists | **Real impl + simulated fallback** | `tasteGraphService` + Local Free Mode alert | High |
| Edit is “highly sophisticated” | **Inflated** | ~420 lines; `MOCK_PRODUCTS`; mock affiliate IDs | High |

### Scribe ≠ Memory Atoms

- **Scribe** (`components/TheScribe.tsx`): overlay, not a route; `archiveManager.saveToPocket(...)` for field notes / transcript / sketch.
- **Memory Atoms** (`services/memoryService.ts`, `ResearchMemory`): Firestore `users/{uid}/memory` via `fetchMemoryAtoms` / `saveMemoryAtom`.
- No code path found from Scribe → memory atom collection.

### Thimble / Depop

- Firestore CRUD: `thimbleBoards`, `thimbleItems`.
- Marketplace “query”: human-in-the-loop URL open, e.g. `https://www.depop.com/search/?q=...` (`ThimbleDashboard.tsx` ~388–394), plus Gemini audit flows — not live marketplace API querying.

### Dual Tailor architecture

- Route lazy-import aliases **TailorHub** as `TailorView` (`App.tsx` ~95–96).
- Hub wraps intake (`TailorProjectFlow`) and legacy editor (`components/TailorView.tsx`, ~6,071 lines).
- Partial migration signal, not a single clean implementation.

---

## Chamber evidence table — all 47 `viewMode`s

Runtime verification for all rows: **Static only**.

| Mode | Status | Evidence | Persistence | Confidence | Notes / restoration |
|------|--------|----------|-------------|------------|---------------------|
| `studio` | Routed | `App.tsx` → `InputStudio` | Firestore zines; local drafts; Pocket | High | Core create surface |
| `stand` | Routed | `AestheticArchive` | Pocket / community zines | High | Sidebar “Registry” |
| `oracle` | Routed | `TheOracle` | Profile/tailor reads; Gemini | High | Readings not clearly persisted |
| `nebula` | Routed | `ArchiveCloudNebula` | Pocket / community | High | Not in sidebar |
| `archival` | Routed | `ArchivalView` | User zines + Pocket | High | Not in sidebar |
| `memberships` | Routed | `SubscriptionMatrix` | Stripe/membership context | Medium | Needs live Stripe validation |
| `editorial-home` | Routed | `EditorialFrontPage` | Zine deep-links | Medium | Editorial front |
| `publisher` | Routed | `PublisherDashboard` | None found — hardcoded KPIs | High | Stub / demo console |
| `profile` | Routed | `UserProfileView` | Firestore profile + local prefs | High | Settings / module hide |
| `ui-audit` | Routed | `UIAuditView` | Profile prefs; simulated progress | High | Not in sidebar |
| `signature` | Routed | `SignatureView` | Zines + `aestheticSignature` | High | Taste summary |
| `tailor` | Routed | Lazy → `TailorHub` → flow / `TailorView` | Tailor projects + profile draft | High | Dual architecture; type errors in Hub/Flow |
| `wardrobe` | Routed | `WardrobeView` | `wardrobe_items`, capsules; CPW calc | High | Persistence unverified at runtime |
| `scry` | Routed | `ScryView` | Vector/web services; mock draft fallback | High | Not sidebar; flag unwired for gating |
| `press` | Routed | `TheEdit` (~420 lines) | `product_interactions`; **MOCK_PRODUCTS** | High | Editorial/commerce with mock fallbacks |
| `mimi-drop` | Routed | `MimiDrop` | `users/{uid}/drops` + local custom drops | High | Simulated scraper fallbacks |
| `proscenium` | Routed | `ProsceniumView` | `public_transmissions` + mock gallery mix | High | Public stage |
| `darkroom` | Routed | `DarkroomView` | Profile treatments; Pocket | High | Sidebar; flag exists, route not gated |
| `sanctuary` | Routed | `SanctuaryView` | `localStorage` reflections | High | Not in sidebar |
| `ward` | Routed | `TheWard` | Notifications/zines; embeds TasteGraph | High | Calibration ritual |
| `case-study` | Routed | `SolitarianCaseStudy` | None found | Medium | Demo / marketing |
| `dossier` | Routed | `DossierView` | Profiles + thimble boards/items | High | Moodboard / canvas |
| `thimble` | Routed | `ThimbleDashboard` | `thimbleBoards` / `thimbleItems`; URL deep-links | High | Not live Depop API |
| `loom` | Routed | `StrategyStudio` | Strategy audit / tasks | Medium | Not in sidebar |
| `action-board` | Routed | `ActionBoard` | Firestore tasks | High | Not in sidebar |
| `taste-identity` | Routed | `TransformationPathView` | Tailor project bridge | High | Intake → tailor |
| `taste-discovery` | Routed | `TasteDiscoveryView` | In-memory quiz + Gemini | Medium | Onboarding |
| `signals` | Routed | `ThimbleIndex` | Hardcoded mock vectors | High | Demo index |
| `threads` | Routed | `ThreadsView` | Narrative threads + zines | High | Sidebar |
| `narrative-threads` | Routed | `NarrativeThreadsView` | Zine fetch; D3 visual | Medium | Not in sidebar |
| `taste-graph` | Routed | `TasteGraph` | `tasteGraphNodes` / `tasteGraphEdges` | High | Simulated Local Free Mode fallback |
| `latent-constellation` | Routed | `LatentConstellation` | Public profiles; large chunk | Medium | Not in sidebar |
| `the-lens` | Routed | `TheLens` | Pocket saves | High | Flag unwired for gating |
| `obsidian-mirror` | Routed | `ObsidianMirror` | Pocket on save | Medium | Not in sidebar |
| `notifications` | Routed | `NotificationsView` | Firestore notifications | High | Not in sidebar |
| `codex` | Routed | `CodexView` | Static docs | High | Sidebar “System” |
| `architecture` | Routed | `ArchitectureView` | Static copy | High | Not in sidebar |
| `aesthetic-tokens` | Routed | `AestheticTokensMap` | Reads tailor draft defaults | Medium | Not in sidebar |
| `syllabus` | Routed | `NousReadingList` | Static reading list | High | Not in sidebar |
| `brand-intake` | Routed | `BrandIntakeView` | Tailor intake bridge | Medium | Simulate path present |
| `intel-hub` | Routed | `IntelHub` | Nav hub (`mimi:change_view`) | Medium | Sidebar |
| `forecast` | Routed | `TheForecast` | Forecast API / season metaphor | Medium | Not in sidebar |
| `qc_engine` | Routed | `ColorQCEngine` | `simulateAnalysis` mock reports | High | Demo QC |
| `research-memory` | Routed | `ResearchMemory` | `users/{uid}/memory` | High | Memory Atoms (not Scribe) |
| `geo_engine` | Routed | `TheGEOEngine` | `profile.geoProfile`; Pocket export | High | Sidebar |
| `manifesto` | Routed | `CommunityManifesto` | Static | High | Not in sidebar |
| `checkout-success` | Routed | `CheckoutSuccessView` | Requires `checkoutPlan` state | High | Stripe success path |

---

## Overlays and special routes (not sidebar `viewMode`s)

| Surface | Status | Evidence | Persistence | Confidence | Notes |
|---------|--------|----------|-------------|------------|-------|
| **TheScribe** | Overlay | `App.tsx` + `TheScribe.tsx` | Pocket via `archiveManager.saveToPocket` | High | Not Memory Atoms |
| ElevatorLoader (auth) | Gate | `App.tsx` ~1269–1278 | N/A | High | Bypass → `forceBypassAuth` |
| `/u/:handle` (mimi.you) | Special-route | `MimiYouPublicRoute` → `MimiYouHub` | Tailor / dolls universe | High | Sidebar `mimi-you` target |
| `/zine/:id` | Special-route | Forces studio + `AnalysisDisplay` when revealed | Firestore zines | High | |
| `/s/:id`, `/@…`, `/stacks/:id` | Special-route | Public/share/stack pages | Varies | Medium | |
| `/auth/action` | Special-route | `AuthAction` | Firebase email actions | Medium | |
| `/privacy`, `/terms` | Special-route | Inline in `App.tsx` | None | High | |
| SelectionMemoryCapture | Overlay | Global selection → memory | Memory atoms path | Medium | Separate from Scribe |

---

## Sidebar vs route drift

| In sidebar (`MENU_STRUCTURE`) | 23 modes including `mimi-you` |
| Not in sidebar but routed in `App.tsx` | ~24 modes (deep link / event / hub) |
| Implication | Counting only sidebar understates surface area |

Suggested restoration product sequence (orientation only — not verified completeness):  
**Studio → Scribe (overlay) → Edit → Thimble → Wardrobe → Dolls (mimi.you)** — vocabulary aligns with repo; completeness claims do not.

---

## Feature flags

Defined in `contexts/UserContext.tsx`: `scry`, `darkroom`, `theLens`, `tailor`, `proposal` (defaults all `true`; `localStorage` `mimi_feature_flags`).

| Finding | Evidence |
|---------|----------|
| `toggleFeature` exported | Provider API |
| Almost no route gating | Routes for scry/darkroom/theLens/tailor mount regardless |
| Practical consumer | `featureFlags.proposal` influences patron UI in `UserProfileView` |

---

## Red flags prior audits miss

1. **Investor-demo auth overrides** — ghost paths force Swan / non-anonymous labels.
2. **No test suite** — “verified” / “complete” claims lack automated backing.
3. **Dual Tailor** — Hub + 6k-line legacy view = partial migration.
4. **Scribe ≠ Memory Atoms** — factual error if conflated.
5. **Nav vs route drift** — ~24 routed modes outside sidebar.
6. **Mock / simulate density** — Edit, QC engine, signals, publisher KPIs, Taste Graph free mode, Depop URL opens.
7. **Lint debt** — missing lib route modules and type holes block green `tsc`.

---

## Recommendation

1. **Reject** any prior document as a *verified* audit.
2. **Accept** this file as a **draft orientation memo** with evidence citations.
3. Re-issue chamber work using: Status / Evidence / Confidence / Runtime verification / Restoration effort.
4. Next validation pass (out of scope here): manual smoke per priority chamber + fix the 18 `tsc` errors + add minimal persistence tests for Pocket, memory, wardrobe, thimble, taste graph.

---

## Commands re-run for this memo

```bash
npm run lint    # tsc --noEmit → 18 errors, exit 2
npm run build   # Vite + esbuild server → pass (large chunk warnings)
```

Interface count: `rg -c '^export interface' types.ts` → 118  
TODO count: one explicit `TODO` in `services/geminiService.ts`  
Test files: none under project source (excluding `node_modules`)
