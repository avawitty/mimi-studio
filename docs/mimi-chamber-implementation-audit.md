# Mimi Chamber Implementation Audit

Date: 2026-08-08 (Studio archival desk reinstated at `/studio`; Taste Intelligence OS v2 surfaces mapped)

Source of truth: product canon + `lib/productCanon.ts` (+ `CANON_INFRASTRUCTURE`). Every canonical chamber has a dedicated route mode, chamber shell (where applicable), and `CanonModule` registry. Living architecture: [mimi-system-architecture.md](./mimi-system-architecture.md), [architecture-update-20.md](./architecture-update-20.md).

For durable domain contracts, see [`mimi-system-architecture.md`](./mimi-system-architecture.md). This file is the **current route / chamber / verify-script map** for developers.

## Milestone 1 Status: Complete

All 18 canonical modules are registered. Chamber shells live under `components/chambers/`.

| Canon chamber | Route | Component | Status |
| --- | --- | --- | --- |
| Studio / Worktable | `/studio` | `StudioWorktable` (Console → `InputStudio`; `/studio/orientation` alternate) | Live |
| Scribe / Semantic Portal | `/scribe` | `ScribeChamber` | Live |
| Tailor / Profile Logic | `/tailor` | `TailorHub` | Live |
| Taste Signature | `/signature` | `SignatureView` | Live (artifact) |
| Taste Graph / Threads | `/taste-graph` | `TasteGraph` | Live |
| The Edit | `/the-edit` | `TheEditChamber` | Live |
| The Press / Export | `/the-press` | `ThePressChamber` + `ExportChamber` | Live |
| Pocket / Registry | `/pocket` | `Pocket` | Live |
| Mood Board | `/moodboard` | `MoodBoardChamber` | Live |
| IntelHub | `/intelhub` | `IntelHub` | Live |
| GeoEngine | `/geoengine` | `TheGEOEngine` | Live |
| Darkroom | `/darkroom` | `DarkroomView` | Live |
| Wardrobe | `/wardrobe` | `WardrobeView` | Live |
| Thimble | `/thimble` | `ThimbleDashboard` | Live |
| Sanctuary | `/sanctuary` | `SanctuaryView` | Live |
| The Ward | `/ward` | `TheWard` | Live |
| Private Studio | `/private-studio` | `PrivateStudioChamber` | Live |
| Mimi Dolls | `/mimi-dolls` | `MimiDollsChamber` | Live |
| Atelier | `/atelier` | `AtelierChamber` | Live |
| The Proscenium | `/proscenium` | `ProsceniumView` | Live (Stage / Correspondents / Cliques wings) |

## Legacy Route Aliases (preserved)

| Legacy | Canonical mode |
| --- | --- |
| `/research-memory` | `scribe` |
| `/threads`, `/narrative-threads` | `scribe` (Threads tab) |
| `/press`, `/edit` | `the-edit` |
| `/publisher` | `the-press` |
| `/dossier` | `moodboard` |
| `/case-study` | `private-studio` |
| `/stand`, `/registry` | `pocket` |
| `/mimi-you` | `mimi-dolls` |
| `/objects`, `/taste-objects` | `atelier` |
| `/connections` | `proscenium` → `/proscenium/correspondents` |
| `/cliques` | `proscenium` → `/proscenium/cliques` |

Public doll cards remain at `/u/:handle` (infrastructure route, not chamber replacement).

Atelier is distinct from the Atelier membership plan: it archives taste-signal objects pinned from zine commerce touchpoints.

## Chamber Map

Navigate to `/chamber-map` or **Intelligence → Chamber Map** to inspect the live registry and open any chamber.

## Validation

```bash
npm run validate:canon
npm run verify:used-context
npm run verify:atelier
npm run verify:doll-engine
npm run verify:doll-staple
npm run verify:zine-spread-compose
npm run verify:structured-zine-pdf
npm run verify:zine-artifact-schema
npm run verify:zine-issue-plan
npm run verify:zine-reading-order
npm run verify:zine-proof-diagnostics
npm run verify:fish
npm run verify:residue
npm run review:mobile          # needs dev server on :3000 (or pass a base URL)
npm run build
```

## Milestone 2 (Core Loop) — Complete

Capture → Parse → Save → Read → Approve → Apply → Export

North star demo: **Scribe → Studio Used Context → generate zine → The Edit compile → Press export**

| Step | Implementation | Status |
|------|----------------|--------|
| Capture | Scribe Capture tab + global selection capture | Done |
| Parse | `suggestTitleForAtom` on save | Done |
| Save | `memoryService` Firestore atoms + Pocket mirror | Done |
| Read | Scribe Retrieve tab (default home, embedded `ResearchMemory`) | Done |
| Approve | `UsedContextTray` in Studio Continuum + The Edit compile | Done |
| Apply | Approved atoms in `createZine` prompt + `fragmentsUsed` metadata | Done |
| Studio cover | Composed cover URL + overlay layers baked at save/export | Done |
| Editorial read | `TheEditCompile` — thesis, fragment assembly, markdown preview | Done |
| Edit → Press | Auto-sync compile markdown → manifest + `editorial-compile.md` | Done |
| Export / Read back | `AnalysisDisplay` Used Context + Press export packs | Done |

Key files: `services/usedContextService.ts`, `components/UsedContextTray.tsx`, `components/TheEditCompile.tsx`, `lib/editCompileExport.ts`, `lib/studioCoverExport.ts`, `lib/rasterizeStudioCover.ts`, `services/exportManifestService.ts`, `components/ExportChamber.tsx`.

### verify:used-context (2026-07-11)

```bash
npm run verify:used-context
# WO-2 Used Context service verification: PASS
```

Manual E2E on signed-in preview still recommended (see `docs/DEMO_SCRIPT.md`).

## Phase 2 — Complete

| Item | Implementation | Status |
|------|----------------|--------|
| Scribe 3JS threads | `ScribeThreadScene`, `ScribeThreadsPanel`, Threads tab in `ScribeChamber`; `/threads` + `/narrative-threads` alias to Scribe | Done |
| Mimi Dolls v2 | `DollGalleryCard`, `DollPortraitStage`, `DollPortraitScene`; 2-col gallery in `MimiYouHub` | Done (gallery + portrait stage; richer companion deferred) |
| Edit → Press handoff | `lib/editCompileExport.ts` syncs compile markdown; attached to `export-manifest.json` + zine metadata | Done |
| Cover overlay export | `lib/rasterizeStudioCover.ts` bakes layers at zine save + asset ZIP export; overlay JSON retained in `content.meta.studioCoverOverlays` for reconstruction | Done |

### Remaining polish (not blocking M2 demo)

1. **Pocket shared persistence contract** — atom mirror works; cross-chamber sync polish remains
2. **Mimi Dolls companion depth** — Phase 3 engine landed (`services/dollEngine`): procedural dresser bound to Firestore Doll, multi-view identity pack, default Masks, Studio mask select + prompt injection, Scribe `doll_identity` retrieval, public showcase portrait coherence. Remaining: multimodal image-ref attachment into zine media pipeline when refs are remote-only URLs.
3. **Full narrative thread data in 3JS scene** — orbital UI live; deep graph data wiring optional

## Milestone 3 (Memory Loop) — Complete

Ask → Atomize → Retrieve → Show Used Context

| Step | Implementation |
|------|----------------|
| Ask | Scribe **Ask** tab (`ScribeAskPanel`) queries atoms via `askScribeMemory` |
| Save Answer | `saveAskAnswerAsAtom` + optional Queue Studio |
| Highlight | `SelectionMemoryCapture` → atomize + **Queue for Studio** |
| Atomize | Capture / Atomize tabs + Pocket mirror (`mirrorAtomToPocket`) |
| Retrieve | `ResearchMemory` retrieve mode — search, bulk send, Send to Edit |
| Approve | `UsedContextTray` in Studio (Continuum) and The Edit |
| Apply | Studio generation + `usedContextSnapshots` on zine metadata |
| Show / Export | `AnalysisDisplay` + `export-manifest.json` / `editorial-compile.md` / `used-context.json` in Press packs |

---

## Current developer map (2026-08)

Scan-friendly notes for subsystems that landed after the July milestones. Prefer this section over digging through PRDs when onboarding or debugging.

### Studio routes (archival desk primary)

| Route | Component | Role |
| --- | --- | --- |
| `/studio` | `StudioWorktable` (`components/worktable/StudioWorktable.tsx`) | **Primary** archival desk — prompt cycles, instruments, aura meter, context strip |
| `/studio` + Console escape | `InputStudio` | Dense compose console (instrument rail, footnote dock, compiler/critic cards) |
| `/studio/orientation` | `StudioOrientationEntry` | Optional calm intake; must not show archival desk chrome (`FIG. 01`, `Spark · Generate`, DESK/SCRY rail) |
| `/studio/worktable-legacy` | redirect → `/studio` | Compatibility alias only |

Canon registry: `lib/productCanon.ts` (`component: "StudioWorktable"`). Lazy map: `lib/routes.tsx`. Route assertions: `__tests__/studioOrientationRoute.test.tsx`.

**Pitfalls**

- Do not document `/studio` as orientation-first — that decision was superseded (see `DECISIONS.md` 2026-08-08 archival desk entry).
- Taste compiler/critic UI lives on the Console (`InputStudio`) path via `hooks/useStudioTasteCompiler.ts` + `/api/mimi/taste-intelligence/compiler|critic/*`.

### Studio OS (Phase 1 shell)

Shared chamber chrome for orientation surfaces — not a parallel design system. Canon modules carry `family`, `phase`, `atmosphere`, `visibility`, and `visualPacket`; Studio OS turns those into shells and artifacts.

| Concern | Path |
| --- | --- |
| Canon taxonomy (`StudioFamily`, `StudioPhase`, atmospheres) | `lib/productCanon.ts` |
| Shell flags / public-face / dark-plate sets | `lib/design-system.ts`, `lib/chamberChrome.ts` |
| Map-only frame (Map · Mimi seal · Find) | `components/studio-os/StudioShell.tsx`, `StudioNavigation.tsx` |
| Family frames | `components/studio-os/families/*` |
| Artifact primitives (slip, seal, specimen, dossier…) | `components/studio-os/artifacts/*` |
| Chamber manifests + visual packets | `components/studio-os/manifests/` |
| Active dossier context | `components/studio-os/DossierContext.tsx` (wired in `index.tsx`) |
| Chamber Map consumer | `components/chambers/ChamberMapView.tsx` |

**Bottom anchors:** Map · Mimi seal (active dossier / Studio) · Find only. Do not add a permanent multi-chamber tab bar.

**Pitfalls**

- `StudioShell` is Map-only orientation chrome. Studio Hub / Worktable keep `StudioChrome` / worktable owners — do not wrap every chamber in `StudioShell`.
- Family/atmosphere decisions belong on `CanonModule` metadata; chrome helpers read them. Do not hardcode parallel family maps in UI.
- Public faces stay quiet (Menu + identity); dark plates need dark chrome (no light-over-dark seam). See `AGENTS.md` + `npm run review:mobile`.

### Feedback + motion grammar

Centralized semantic feedback — components must not call `navigator.vibrate` or invent per-widget haptic constants.

| Concern | Path |
| --- | --- |
| Event catalog + confirmation-required set | `lib/feedback/feedback.events.ts` |
| Event → motion/haptic recipes | `lib/feedback/feedback.recipes.ts` |
| Orchestrator | `lib/feedback/feedback.service.ts` |
| Web / noop haptic adapters | `lib/feedback/haptics/` |
| React hook + provider | `hooks/useFeedback.ts`, `contexts/FeedbackProvider.tsx` |
| Motion recipes / tokens / variants | `lib/motion/`, `components/motion/` |

Usage:

```ts
const feedback = useFeedback();
feedback.trigger("proposal.approved", { confirmed: true }); // only after mutation succeeds
```

**Rules**

- Prefer semantic events (`source.captured`, `proposal.approved`, `artifact.saved`, …).
- No hover haptics. Loading / `proposal.created` omit haptics by design.
- Confirmation-required events (`CONFIRMATION_REQUIRED_EVENTS`) need `confirmed: true` only after the write succeeds.
- Outside `FeedbackProvider`, `useFeedback()` falls back to a noop-haptic service (safe for tests).

### Canonical Mimi zine artifact

Typed artifact contract for issue structure, page grammars, lifecycle, and proof — layered on top of legacy `ZineMetadata`.

| Concern | Path |
| --- | --- |
| Zod schema + `MIMI_ZINE_ARTIFACT_SCHEMA_VERSION` | `lib/zine/zineArtifactSchema.ts` |
| Normalize / hydrate legacy metadata | `lib/zine/normalizeZineArtifact.ts`, `zineMigrations.ts` |
| Issue planner + page prep | `lib/zine/zineIssuePlanner.ts` |
| Reading order / proof / performance | `lib/zine/zineReadingOrder.ts`, `zineProofDiagnostics.ts`, `zinePerformance.ts` |
| Page grammars (specimen, reading, evidence-ledger, …) | `components/zine/grammars/` |
| Proof UI | `components/zine/ZineProofMode.tsx`, `ZinePageRenderer.tsx` |
| Editorial compiler (direction → pages) | [zine-editorial-intelligence-spec.md](./zine-editorial-intelligence-spec.md) |

Lifecycle statuses include `draft` → `reading` → `direction-proposed` → `direction-approved` → `composing` → `proof` → `approved` → `published` → `archived`. Issue modes: `editorial` \| `research` \| `seasonal` \| `oracle`.

Verify:

```bash
npm run verify:zine-artifact-schema
npm run verify:zine-issue-plan
npm run verify:zine-reading-order
npm run verify:zine-revision-history
npm run verify:zine-proof-diagnostics
npm run verify:zine-export-equivalence
npm run verify:zine-private-context
npm run verify:zine-performance-budget
```

**Pitfalls**

- Prefer `normalizeZineArtifact` / schema parsers over ad-hoc page shape assumptions.
- Context visibility (`working` / `export` / `public`) must stay honest — private working context must not leak into public/export packs (`verify:zine-private-context`).
- Spread compose + structured PDF (below) remain the layout/export path; the artifact schema is the durable object contract.

### Legal documents (`/privacy`, `/tos`)

Special routes (not chambers). Content in `lib/legalContent.ts`; renderer `components/LegalDocumentPage.tsx`.

| Path | Document |
| --- | --- |
| `/privacy` | Privacy Policy |
| `/tos` | Terms of Service (canonical) |
| `/terms` | Alias → Terms |

Resolved via `legalTypeFromPath` early in `App.tsx` (before chamber routing). Footer links in `MimiZineLayout`. Contact: `privacy@mimi.you`. Brand casing: never CSS `uppercase` on the Mimi wordmark in the legal masthead.

### Forecast culture vector (anonymous-safe)

`TheForecast` Cultural tab composes from Mean Median Mode offline baselines first so the view never hangs on research fetch. Signed-out users are limited to the culture vector; live gateway synthesis is skipped for anonymous culture views (MMM-only report). Key file: `components/TheForecast.tsx`. Collective contribution still requires Proscenium consent — public ≠ consented.

### Scribe mobile workbench (Ask / Library / Capture)

Desktop Scribe still exposes finer tabs (`ask`, `capture`, `atoms`, `retrieve`, `threads`). On narrow viewports, `ScribeChamber` collapses those into three modes:

| Mobile mode | Underlying tabs | Role |
| --- | --- | --- |
| **Ask** | `ask` | Grounded retrieval via `ScribeAskPanel` → `services/scribeService.ts` (atoms, Pocket, taste graph, evidence, active Doll as `doll_identity`) |
| **Library** | `atoms` / `retrieve` / `threads` | Embedded `ResearchMemory`; Atomize manage view, Retrieve send-to-Studio/Edit, Threads panel |
| **Capture** | `capture` | Paste → `createAtomFromScribeSignal` → Firestore atom + Pocket mirror |

Key files: `components/chambers/ScribeChamber.tsx`, `components/ScribeAskPanel.tsx`, `components/ResearchMemory.tsx`, `services/scribeService.ts`, `services/memoryService.ts`.

**Pitfalls**

- Mobile labels hide the underlying tab graph — Library sub-pills switch `atoms` / `retrieve` / `threads`.
- Some Capture / Ask save paths persist atoms immediately. Canonical architecture still requires explicit approval before durable memory; treat early-persist paths as known drift, not the target contract.
- “Send to Studio / The Edit” goes through `addToUsedContext` → `UsedContextTray`; generation still gates on `approved`.

### The Proscenium (Connections + Cliques unified)

`ProsceniumView` owns three wings: **Stage** (public transmissions), **Correspondents** (connections), **Cliques**.

| Route | Wing |
| --- | --- |
| `/proscenium` | Stage |
| `/proscenium/correspondents` | Correspondents |
| `/proscenium/cliques` | Cliques |
| `/connections` | Redirect → Correspondents |
| `/cliques` | Redirect → Cliques |

Stage reads `public_transmissions` with global / following / local channels. Demo specimens must stay labeled and never mix into live counts. E2E: `e2e/proscenium.spec.ts`.

Key files: `components/ProsceniumView.tsx`, `App.tsx` redirects, `lib/productCanon.ts`, `components/navigationConfig.ts`.

### Doll Engine + Mimi Shell staple

Taste Graph remains source of truth; Dolls are projections. Public API: `services/dollEngine/`.

| Concern | Path |
| --- | --- |
| Shell staple prompt lock (`shell-v1`) | `services/dollEngine/staplePrompt.ts` |
| Procedural aesthetic derivation | `services/dollEngine/proceduralFromDoll.ts` |
| Identity pack / multi-view refs | `services/dollEngine/identityPack.ts`, `mediaRefs.ts` |
| Default masks + companion bundle | `services/dollEngine/masks.ts`, `companion.ts` |
| Studio active doll/mask (localStorage) | `hooks/useStudioDollSelection.ts` |
| UI onboarding / auto-project shell | `components/tailor/DollProfileScreen.tsx` |
| Scribe retrieval | `buildScribeDollExcerpt` → `doll_identity` context |
| Zine media prepend | `services/zineGenerator.ts` |

Portrait generation hits `/api/mimi-image` with `allowFaces: true`. Verify: `npm run verify:doll-engine`, `npm run verify:doll-staple`. Product intent: `prd/doll-staple-shell.md`.

**Pitfalls**

- Do not invent a second shell prompt; extend `MIMI_SHELL_STAPLE` / versioned helpers.
- Skipping staple verification before prompt edits will desync Studio injection, Scribe excerpts, and portrait generation.

### Zine spread compose + structured PDF

Owners compose freeform plates via `ZineLayoutEditor`; layouts persist as `customLayout` on `ZinePageSpec`. Readers render saved layouts read-only through `ZineSpreadCanvas`.

| Concern | Path |
| --- | --- |
| Layout model / mode plates / auto-develop | `lib/zineSpreadLayout.ts` |
| Owner editor + reader canvas | `components/ZineLayoutEditor.tsx`, `ZineSpreadCanvas.tsx`, `AnalysisDisplay.tsx` |
| Archival PDF (no html2canvas raster of `#export-target`) | `lib/structuredZinePdf.ts` → `ExportChamber` |
| Edit issue-spreads entry | `components/IssueSpreadsPanel.tsx`, `TheEditCompile.tsx` |
| Manifest `pdfMode: "structured"` | `services/exportManifestService.ts` |

Verify: `npm run verify:zine-spread-compose`, `npm run verify:structured-zine-pdf`, `npm run verify:zine-visual-policy`. Product intent: `prd/zine-spread-compose.md`.

**Constraints**

- Structured PDF uses Times/Helvetica (brand fonts stay in the reader).
- Soft-fails image fetch/CORS to placeholders rather than aborting the pack.
- Hi-fi non-lite issues auto-develop cover/plates; lite modes do not.

### Public host skins (mimi.you / mimi.rip / mimi.fish)

Same SPA; skin from host (`lib/siteHost.ts`), then `?skin=rip|fish|you`, then `localStorage mimi_site_skin`.

| Skin | Host | Public surface |
| --- | --- | --- |
| `you` | `mimi.you` (also localhost / `*.vercel.app`) | Full app + public cards |
| `rip` | `mimi.rip` | Inverse reading / public rip plates |
| `fish` | `mimi.fish` | Share plate `/s/:id` + creator shelf `/u/:handle` or bare `/:handle` |

Canonical share URL: `https://mimi.fish/s/:zineId` (`getFishShareUrl` / `getZineShareUrl`). On fish host, `/zine/:id` maps onto the public share plate; `/s/:id` is handled before skin branching in `App.tsx`.

Ops helpers:

```bash
npm run setup:mimi-fish-domains   # Firebase Auth authorized domains (+ optional Vercel)
npm run setup:mimi-rip-domains
npm run verify:fish
```

### Taste Intelligence OS v2

Operational taste layer on Neon (ADR 001). Full inventory: [`taste-intelligence-os-v2.md`](./taste-intelligence-os-v2.md). Calibration Lab UX: [`taste-calibration-lab.md`](./taste-calibration-lab.md).

| Surface | Route / entry | Notes |
| --- | --- | --- |
| Calibration Lab | `/tailor/calibrate` → `CalibrationLab` | Pairwise active learning; Neon session/judgment persistence |
| Negative taste + graph edits | Tailor `PatternGraphScreen` / `TasteModelInspector` | `POST …/refusals`, `…/model-edits`, `…/model-edits/undo` |
| Why-saved | Pocket `WhySavedSheet` | Queued multi-upload review; `saved_reason_hypotheses` |
| Compiler / critic | Studio Console (`InputStudio`) | Reconciles with Tailor Profile v2 via `mergeGenerationContracts` |
| Scry taste rerank | `ScryView` + `lib/scry/tasteScryRerank.ts` | Snapshot + refusals when signed in |

```bash
npm run verify:taste-intelligence
npm run verify:taste-model
npm run test:unit -- __tests__/tasteIntelligence.test.ts
```

**Pitfalls**

- Do not revive the superseded parallel stack (`lib/tasteCalibration/*`, `/api/mimi/taste-calibration/*`).
- Neon `DATABASE_URL` + `npm run db:migrate` required for durable calibration/write paths; without Neon the app stays navigable but TI writes fail closed.
- Merge/split graph ops stay behind `TASTE_GRAPH_MERGE_SPLIT=1`.

### Residue engine adapters

Cultural → product adapters live under `services/residue/` (Phases 3–7). Status notes: `docs/residue-engine-phase*.md`. Verify: `npm run verify:residue`.

---

## Architecture Update 20 — Status Reconciliation (2026-08-02)

| Element | Route / surface | Status |
| --- | --- | --- |
| Scry evidence lanes | `/scry` | Live — archive, web, reading, shadow + honest coverage |
| Residue Cultural / Emotional | `/residue` | Live vertical slice — offline-first; optional Apify acquire |
| Observatory / Mean Median Mode | `/observatory`, `/mean-median-mode` | Live vertical slice — Proscenium consent required; Mesopic Lens demo panel; Forecast culture consumes MMM baselines |
| The Edit Signal / Issue / Forecast | `/the-edit` | Live — Update 21 panel split; default Signal; `?panel=` |
| Mimi Dolls shell-first | `/mimi-dolls` | Live — porcelain primary; Shader Lab secondary |
| Scribe mobile grammar | `/scribe` | Live polished — reduced chrome, Guide in mode bar |
| Sovereign Data Plane | `/api/sovereign/*` | Live / hardening — see `docs/sovereign-archive.md` |
| AI Gateway embeddings | shared infra | Live — registered in `CANON_INFRASTRUCTURE` |
| Shadow Memory migration | Shadow Memory flows | Live — UID-gated reindex |
| Firestore quota / ghost Pocket | Pocket / Floor | Live — listener suppression + identity cancel |
| Gateway entitlements | funded AI path | Live — server Stripe verification; no BYOK nag |
| Studio OS Phase 1 | `/chamber-map` (+ shared shells) | Live — Map · seal · Find; Hub/Worktable keep prior chrome |
| Studio archival desk | `/studio` | Live — `StudioWorktable` primary; `/studio/orientation` alternate; legacy worktable redirects |
| Taste Intelligence OS v2 | `/tailor/calibrate` + Neon APIs | Partial → foundation shipped — calibration, refusals, model edits, why-saved, compiler/critic |
| Feedback / motion | app-wide | Live — `useFeedback()` semantic events; confirmation-gated haptics |
| Zine artifact schema | Press / Edit / export | Live contract v1 — `lib/zine/` + verify scripts |
| Legal documents | `/privacy`, `/tos` | Live — `/terms` aliases to Terms |
| Forecast culture | Forecast Cultural vector | Live — MMM-first offline; anonymous skips live synthesis |
