# Mimi Studio — Architecture Decisions (ADR-lite)

Append-only log. One entry per architectural decision: **date**, **decision**, **alternatives rejected**, **why**.

For full architecture narrative see [`mimi-system-architecture.md`](./mimi-system-architecture.md). Update [`STATE.md`](./STATE.md) when implementation status changes.

---

---

---

## 2026-08-08 — Why-saved sheet hardening (queue + a11y + review state)

**Decision:** Serialize multi-image why-saved prompts through `useWhySavedPrompt` artifact queue (one sheet at a time; Done exits queue; dismiss advances). Per-hypothesis review pending/error state; `epistemicLabelForHypothesis` centralizes Inferred/Observed/Creator labels; `useModalFocus` traps focus in `WhySavedSheet`.

**Alternatives rejected:** (1) Prompting only the final image in a batch (loses per-artifact capture). (2) Global `loading` disabling all hypothesis actions during one review.

**Why:** Prevents racing propose requests and overlapping review state; meets dialog a11y contract without a parallel sheet primitive.

**Ref:** `hooks/useWhySavedPrompt.ts`, `components/pocket/WhySavedSheet.tsx`, `lib/a11y/useModalFocus.ts`, `lib/tasteIntelligence/savedReason.ts`

---

## 2026-08-08 — Pocket why-saved surface (Taste Intelligence #13)

**Decision:** Wire `proposeSavedReasonHypotheses` / `applySavedReasonReview` to Pocket capture via `WhySavedSheet` + `/api/mimi/taste-intelligence/saved-reason/*` routes. Hypotheses persist in Neon `saved_reason_hypotheses`; language distinguishes Inferred / Observed / Creator confirmed / Creator rejected.

**Alternatives rejected:** (1) Reusing legacy `DeltaVerdictCard` as why-saved. (2) Client-only hypotheses without Neon persistence.

**Why:** Completes Capture → Interpret → Approve for Pocket without touching the generation pipeline; bounded post-capture sheet after image stash.

**Ref:** `components/pocket/WhySavedSheet.tsx`, `hooks/useWhySavedPrompt.ts`, `lib/tasteIntelligence/savedReason.ts`

---

## 2026-08-08 — Studio compiler/critic cards + Tailor v2 contract reconciliation

**Decision:** Ship Studio-facing compiler and critic UI wired through `/api/mimi/taste-intelligence/compiler/compile` and `/critic/critique`, with `mergeGenerationContracts` reconciling Taste Intelligence compiler output against Tailor Profile v2 `generationContract` before prompt injection.

**Alternatives rejected:**
- Client-only compile without persistence (loses audit trail for critiques).
- Replacing Tailor v2 `generationContract` with TI compiler output (breaks existing zine/Tailor prompt paths).

**Rationale:** Studio needs visible, pre-generation contracts and post-generation critique without forking Tailor's canonical profile contract. Merge keeps both sources authoritative: Tailor strategic rules + TI evidence-linked compiler modes.

---

## 2026-08-08 — Negative taste + graph model editing (Tailor Pattern Graph slice)

**Decision:** Ship creator-facing negative taste and direct model editing inside Tailor `PatternGraphScreen` + `TasteModelInspector`, backed by existing Taste Intelligence OS v2 contracts (`taste_refusals`, `taste_model_edits`, `computeModelDelta`, `applyEditsToSnapshot`). New API routes: `POST /api/mimi/taste-intelligence/refusals`, `POST /model-edits`, `POST /model-edits/undo`. Merge/split remain behind `TASTE_GRAPH_MERGE_SPLIT=1`.

**Alternatives rejected:** (1) New top-level chamber. (2) Client-only React state without Neon persistence. (3) Reviving parallel `lib/tasteCalibration/*` stack.

**Why:** Makes v2 refusal/model-edit logic usable in the primary Tailor curation flow with mobile-first inspector + bottom-sheet refine controls.

**Ref:** `components/tailor/PatternGraphScreen.tsx`, `hooks/useTasteSignalEditor.ts`, `lib/tasteIntelligence/signalRefine.ts`, `docs/taste-calibration-lab.md`

---

## 2026-08-08 — Taste Intelligence OS v2 (Neon operational layer + Calibration Lab)

**Decision:** Extend the v1 computational taste model into a coherent intelligence layer without a second Taste Graph. New operational writes go to Neon (`mimi.taste_*` tables) via authenticated `/api/mimi/taste-intelligence/*` routes; `services/tasteModelService.ts` dual-writes/dual-reads during Firestore migration. Calibration Lab lives at `/tailor/calibrate` with deterministic active-learning pair selection and Bradley-Terry-style calibration deltas. Sentinel memory policy is a separate headless layer (`lib/tasteIntelligence/sentinelPolicy.ts` + `SentinelMemoryReview`) — `CaptiveSentinel` remains the in-app browser guard only.

**Alternatives rejected:** (1) Second canonical taste graph. (2) Replacing Tailor Profile v2. (3) LLM as hidden scoring function. (4) React → Neon direct connections. (5) Repurposing CaptiveSentinel for agent memory.

**Why:** ADR 001 alignment, explainable learning loop, and vertical-slice delivery (persistence + API + UI + tests) over mock-only screens.

**Ref:** `docs/taste-intelligence-os-v2.md`, `lib/tasteIntelligence/`, `schemas/tasteIntelligenceContracts.ts`, migration `0001_taste_intelligence`

---

## 2026-08-08 — Scry taste rerank + visible why-matched

**Decision:** After the four Scry evidence lanes settle, `runSpecimenScry` loads the latest taste snapshot + refusals (graceful no-op when unsigned out or API unavailable) and reranks hits **within each lane** via `lib/scry/tasteScryRerank.ts` → `rerankTasteSearchResults`. Each `ResearchResult` may carry `tasteScore` and `whyMatched` (semantic fit, linked features, trajectory, refusal contradiction). ScryView merges lanes sorted by taste score and exposes an expandable “Why matched” panel per card.

**Alternatives rejected:** (1) New schema columns for search provenance. (2) Cross-lane overwrite into a single blended blob. (3) Client-only rerank in ScryView without service-layer attachment.

**Why:** Completes the search vertical slice with explainable retrieval tied to the approved taste model; preserves lane honesty from ADR 2026-08-02.

**Ref:** `lib/scry/tasteScryRerank.ts`, `services/scryService.ts`, `components/ScryView.tsx`, `schemas/scryContracts.ts`

---

## 2026-08-08 — Client taste model sync via API (not Neon imports)

**Decision:** `services/tasteModelService.ts` must not import `infrastructure/database/neon/*` — even dynamic imports get bundled into the Vite client graph and break Vercel builds (`node:crypto` in `creditRepository`). Neon snapshot persist/read goes through `/api/mimi/taste-intelligence/snapshot/*` via `tasteIntelligenceClient`.

**Alternatives rejected:** Vite `external` hacks for the whole neon tree; keeping dual-write in client service.

**Why:** React must never connect to Neon; client bundles must stay server-free.

**Ref:** `services/tasteModelService.ts`, `lib/tasteIntelligenceRoute.ts`, `services/tasteIntelligenceClient.ts`

---

## 2026-08-08 — Taste Calibration MVP (parallel PR — superseded by Taste Intelligence OS v2)

**Decision:** A parallel `lib/tasteCalibration/*` stack with normalized Neon columns (`taste_calibration_*` migration `0001_taste_calibration`) was prototyped on branch `metaste-calibration-mvp-278f`. **Merged into main by adopting the existing Taste Intelligence OS v2 architecture** (`lib/tasteIntelligence/*`, JSONB payload columns, `/api/mimi/taste-intelligence/calibration/*`, `CalibrationLab.tsx`) rather than maintaining duplicate repositories and API surfaces.

**Alternatives rejected:** Running two calibration persistence stacks side-by-side.

**Why:** Same product surface (`/tailor/calibrate`), same ADR-001 constraints, but main already shipped the broader OS v2 spine; duplicate schema/API would fork operational truth.

**Ref:** `docs/taste-calibration-lab.md` (algorithm notes retained), `docs/taste-intelligence-os-v2.md` (canonical architecture)

---

## 2026-08-08 — Taste model hotfix: idempotent events + scoped compilation

**Decision:** (1) Use stable dedupe keys as Firestore document IDs for explicit curation events (`event.id === dedupeKey`). (2) Default `compileAndSaveTasteModel` scope to `project` when `projectId` is set — project recompilation must not overwrite `tasteModelSnapshots/global`.

**Alternatives rejected:** (1) Append-only events with post-hoc dedupe at compile time only. (2) Always recompiling both global and project on every curation. (3) Time-bucketed dedupe for explicit corrections (allows double-weight on replay).

**Why:** Replay-safe curation and isolated project models are correctness requirements for trustworthy taste learning; global snapshot is a cross-project aggregate and must only be rebuilt from all events.

**Ref:** `services/tasteModelService.ts`, `__tests__/tasteModelService.test.ts`, `docs/computational-taste-model.md`

---

## 2026-08-08 — EvidenceAtom/TasteState vs TasteModelSnapshot (single truth boundary)

**Decision:** Maintain **one canonical evidence/assertion plane** and **one derived computational cache**:

| Layer | Role | Canonical? |
| --- | --- | --- |
| `EvidenceAtom` + `TasteState` / taste assertions | Canonical evidence intake, analysis, corrections, semantic retrieval | **Yes** |
| Tailor graph (`EvidenceNode`, `Observation`, `PatternCluster`, `CreativeLaw`) | Project-scoped interpretive graph (migrating toward atom linkage) | Canonical per project |
| `TasteModelSnapshot` | Deterministic compiled taste weights, trajectories, interaction rules | **Derived cache only** |

No duplicate preference truth stores. Migration/adapter boundary lives at `lib/taste/evidenceNodeBridge.ts` + `lib/tasteModel/normalizeTasteEvents.ts` — atoms and graph entities feed compilation; snapshots never write back to canonical stores.

**Alternatives rejected:** (1) Parallel taste preference collections in Firestore. (2) Making `TasteModelSnapshot` authoritative for generation. (3) Merging EvidenceAtom and TasteEventV2 into one schema prematurely.

**Why:** Preserves traceable evidence → assertion → derived model flow; enables Phase 1–3 Taste Intelligence without forking the computational model from #224.

**Ref:** `docs/taste-intelligence-phase1.md`, `docs/computational-taste-model.md`, `lib/taste/`, `lib/tasteModel/`

---

## 2026-08-08 — Computational Taste Model (derived snapshot, v1)

**Decision:** Introduce `TasteModelSnapshot` as a **derived cache** compiled deterministically from canonical Tailor graph entities (`EvidenceNode`, `Observation`, `PatternCluster`, `CreativeLaw`) plus immutable `TasteEventV2` learning events. Pure compilation in `lib/tasteModel/`; persistence at `users/{uid}/tasteLearningEvents` and `users/{uid}/tasteModelSnapshots/{global|project-{id}}`. Legacy `TasteEvent` normalized additively via `normalizeTasteEvent()`. Candidate scoring returns fit score (0–100, not probability), confidence, and evidence-linked explanation — no LLM in the scoring path.

**Alternatives rejected:** (1) A third canonical taste source separate from the WO-7 graph. (2) Replacing Tailor Profile v2. (3) LLM-generated scores without provenance. (4) Silent migration of existing Firestore documents. (5) Making TasteGraphNode/Edge canonical.

**Why:** Closes the product loop: evidence → curation → explainable taste model → candidate scoring → user correction. Deterministic, versioned, and correctable beats a black-box classifier. Presentation projection via `projectTasteModelToGraph()` keeps existing Taste Graph UI compatible.

**Ref:** `lib/tasteModel/`, `services/tasteModelService.ts`, `docs/computational-taste-model.md`, `components/taste/TasteModelInspector.tsx`

---

## 2026-08-05 — Proof-mode stock plate mode + Unsplash attribution

**Decision:** Add `plateMediaMode` on Studio orientation intake (`photography-first` | `generated` | `references-only`). Hi-fi `bakeZineVisualPlates` resolves Unsplash stock via server `/api/inspo/search` when mode is photography-first; skips AI generation for `references-only`. Stock attribution lands on `ZinePageSpec` and `SpecimenPage` footer.

**Alternatives rejected:** (1) Client-side Unsplash keys. (2) Silent AI fallback when stock misses (honest empty/failure instead). (3) Remounting full InputStudio on `/studio` for the toggle.

**Why:** Serves AI-averse blog/article ideation with attributed real photography while preserving generated plates as explicit opt-in; connects Studio entry to the zine passport concept without forking the calm orientation shell.

**Ref:** `lib/bakeZinePlates.ts`, `lib/unsplashClient.ts`, `components/studio/StudioOrientationEntry.tsx`, `api/inspo/search.ts`

---

## 2026-08-05 — Proof-mode stock plate swap + Studio Pinterest board import

**Decision:** (1) Add `swapZinePlateStock` and a **Swap stock plate** control in `ZineProofMode` (owner-only) so draft issues can cycle Unsplash alternates without full regen. (2) Add optional Pinterest board URL import on Studio orientation intake (public scrape / API path via `/api/pinterest`), capping at 8 reference thumbnails.

**Alternatives rejected:** (1) Full issue regen for every plate dissatisfaction. (2) Client-side Pinterest token handling on Studio. (3) Remounting Scribe Pinterest desk without routing work.

**Why:** Closes the ideation loop for photography-first and board-curated workflows on the calm Studio shell; keeps attribution honest on swap via existing `ZinePageSpec` passport fields.

**Ref:** `lib/swapZinePlateStock.ts`, `components/zine/ZineProofMode.tsx`, `components/studio/StudioOrientationEntry.tsx`

---

## 2026-08-05 — Imagen-first Studio toolbar + inspo carousel

**Decision:** Default `/studio` plate path is **Imagen** (`generated`). Stock and References are compact toolbar toggles, not equal-weight cards. Add an **Inspos** carousel (attached references + Unsplash previews from prompt) with **Publish my rendition →** — always routes through Imagen, seeding from the selected inspo.

**Alternatives rejected:** (1) Photography-first as co-equal default beside Imagen. (2) Full InputStudio inspo panel remount on `/studio`. (3) “Publish” meaning literal stock republish without AI rendition.

**Why:** Matches product intent: AI-developed plates first; stock/references are explicit opt-ins; inspo browsing supports ideation without leaving the calm orientation shell.

**Ref:** `components/studio/StudioPlateMediaToolbar.tsx`, `components/studio/StudioInspoCarousel.tsx`, `lib/fetchStudioInspos.ts`

---

## 2026-08-04 — Pinterest board preview: API-first for token owner, HTML fallback

**Decision:** When `PINTEREST_ACCESS_TOKEN` is set (Production Limited / Standard), resolve board previews via Pinterest API v5 (`boards` + `boards/{id}/pins`) for boards owned by the token account; fall back to existing public HTML scrape for other users' boards or when API resolution fails.

**Alternatives rejected:** (1) Sandbox-only development (cannot read real curated boards). (2) Replace scrape entirely with API (trial tokens cannot read arbitrary public boards). (3) Official OAuth before proving read path.

**Why:** Token owner's boards get full pin lists and stable image URLs; arbitrary public board URLs keep working without OAuth approval; aligns with zine/Tailor intake that accepts pasted board links.

**Ref:** `lib/pinterestApi.ts`, `lib/pinterestBoardPreview.ts`, `npm run verify:pinterest-api`

---

## 2026-08-04 — Public editorial surfaces: single scroll owner

**Decision:** Public editorial plates (`editorial-home`, `stand`, `signature`, `proscenium`, `showcase`, `archival`) scroll only on `<main>` via `mainShellClassName`. Child `PublicField` shells use `min-h-full`, `bleed` (no duplicate field fill), and must not set `overflow-y-auto` or `h-full` height locks. `<main>`, app root, and `studio-chrome[data-chrome="public-face"]` all paint `--mimi-field` so the surface reads as the page — not a white card inside a gray/dark shell.

**Alternatives rejected:** (1) Per-surface internal scroll on `PublicField`. (2) Auditing all ~40 dark-plate chambers in the same pass.

**Why:** Nested `overflow-y-auto` + `h-full` on white public plates produced a “container within container” feel and double scrollbars; dark-plate chambers intentionally own their own full-height panels.

**Ref:** `lib/chamberChrome.ts`, `components/public-face/PublicField.tsx`, `App.tsx`

---

## 2026-08-04 — Publisher Console artifact-first release desk

**Decision:** Restructure The Press around **Release** (artifact readiness, destinations, approvals) and **Performance** (post-publication metrics only when connected). Derive readiness deterministically from proof diagnostics, export manifest, Intel handoff, and Shopify pack inspection — no simulated reach/revenue/deliverability cards.

**Alternatives rejected:** (1) Retain aggregate analytics dashboard as first viewport. (2) AI-generated release recommendations without explicit check rules. (3) Toast-only sponsor approvals.

**Why:** Mimi is a private editorial OS for taste, evidence, and approval — not a generic creator analytics product. Creators need to know if an artifact is safe to release before seeing performance data.

**Ref:** `lib/publisher/releaseReadiness.ts`, `components/PublisherDashboard.tsx`

---

## 2026-08-04 — Taste Corpus embedding explorer (offline CLIP + UMAP)

**Decision:** Ship a public `/taste-corpus` route that loads precomputed 2D coordinates from `public/data/embeddings.json`. CLIP inference and UMAP (`n_neighbors=15`, `min_dist=0.1`) run only in `scripts/embed.ts` (dev/CI). Client renders SVG for ≤1500 points, canvas above that. Server injects an `sr-only` `<ul>` of specimen titles/links into HTML for crawlers; canvas is `aria-hidden`.

**Alternatives rejected:** (1) Client-side CLIP/UMAP in the browser. (2) Canvas-only with no crawlable fallback. (3) Per-user shadow-memory map as v1 (requires auth + Firestore reads).

**Why:** Keeps inference off the client and off request path; preserves indexability despite canvas; separates vector-free public artifact from title/href index for SEO and click-through.

**Ref:** `scripts/embed.ts`, `components/taste-corpus/`, `lib/taste-corpus/serverInject.ts`

---

## 2026-08-02 — Data plane ownership (Firebase vs Sovereign vs IndexedDB)

**Alternatives rejected:** (1) Sovereign as full application store replacing Firestore. (2) Firestore for all public Floor reads indefinitely.

**Why:** Firestore quota exhaustion and public-read cost; Sovereign gives owned discovery without forking private knowledge auth. Sovereign must not become a silent second source of truth for private atoms.

**Ref:** [`architecture-update-21.md`](./architecture-update-21.md) §1

---

## 2026-08-02 — Memory Atoms stay on Firestore (for now)

**Decision:** Do not migrate Memory Atoms / Context Runs to Sovereign Postgres in the current phase.

**Alternatives rejected:** Immediate Postgres migration for all knowledge objects.

**Why:** Requires private-read auth parity, deletion tombstones, and atom schema sync — not yet satisfied.

**Ref:** [`architecture-update-21.md`](./architecture-update-21.md) §3

---

## 2026-08-02 — Shared embedding space contract

**Decision:** Introduce `EmbeddingSpaceId` (`provider`, executed `model`, `dims`, `schemaVersion`). Cosine similarity only within matching spaces. Model changes version by executed model id; personal reindex is UID-gated; Sovereign reindex is ops/ingest-keyed.

**Alternatives rejected:** Ad-hoc embedding comparisons across model generations; silent dimension mixing in Shadow Memory and Floor search.

**Why:** Prevents invisible retrieval corruption when Gateway models change.

**Ref:** `schemas/embeddingContracts.ts`, [`architecture-update-21.md`](./architecture-update-21.md) §5–6

---

## 2026-08-02 — The Edit: one chamber, three panels

**Decision:** Keep `/the-edit` as a single chamber with **Signal** (default), **Issue**, and **Forecast** panels. Query param `?panel=signal|issue|forecast`.

**Alternatives rejected:** Separate top-level routes for editorial signal vs spread composition vs commerce forecast.

**Why:** One editorial job with distinct modes; avoids route proliferation and duplicate mastheads.

**Ref:** [`architecture-update-21.md`](./architecture-update-21.md) §7

---

## 2026-08-02 — Observatory does not write to Taste Graph

**Decision:** Observatory / Mean Median Mode remain **collective cultural context only**. Aggregate stats must not silently become personal taste.

**Alternatives rejected:** Pipeline from collective MMM into personal Taste Graph without per-claim approval.

**Why:** Preserves creator authority and consent boundaries.

**Ref:** [`architecture-update-21.md`](./architecture-update-21.md) §8

---

## 2026-08-02 — Collective consent revoke semantics

**Decision:** Unpublish/withdraw stops **future** live-window contribution; persist `mmmContributionStatus: "withdrawn"`. Frozen historical reports may retain anonymized aggregates (disclosed at contribute time). No promise to scrub frozen windows.

**Alternatives rejected:** Retroactive removal from all historical aggregate snapshots.

**Why:** Honest disclosure vs impossible perfect erasure of published statistical snapshots.

**Ref:** [`architecture-update-21.md`](./architecture-update-21.md) §9

---

## 2026-08-02 — Scry lane honesty

**Decision:** Scry runs **distinct evidence lanes** (archive, web, reading, shadow). No shared result overwrite. Empty personal memory is **empty**, not partial. Shadow lane uses Shadow Memory only — never padded from public Floor.

**Alternatives rejected:** Single blended retrieval blob; padding missing lanes with public data.

**Why:** Evidence-first product promise; prevents false completeness.

**Ref:** [`architecture-update-21.md`](./architecture-update-21.md) §4, `lib/productCanon.ts` (Scry notes)

---

## 2026-08-02 — Express + Vite single service

**Decision:** One Express host mounts Vite dev middleware and `/api` routes. Production serves `dist/` with SPA fallback. Public SEO routes inject meta server-side before HTML send.

**Alternatives rejected:** Separate frontend/backend deployables for dev; client-only OG for share URLs.

**Why:** Simpler Cloud Agent / local dev; crawlers and iMessage previews need server-visible HTML (`/s/:zineId` pattern).

**Ref:** `server.ts`, `AGENTS.md`

---

## 2026-08-02 — AI models via Gateway catalog

**Decision:** Server AI calls use `modelFor(role, "gateway")` / `suggestedGatewayModel(role)` from `services/modelConfig.ts`. Avoid hardcoded provider model strings.

**Alternatives rejected:** Per-feature stale model pins (`gemini-1.5-flash`, etc.) scattered in services.

**Why:** Central catalog tracks Vercel AI Gateway curation; env overrides via `AI_GATEWAY_*_MODEL`.

**Ref:** `AGENTS.md`, `.env.example`

---

## 2026-08-02 — Mimi Dolls shell-first

**Decision:** Dolls chamber leads with **porcelain BJD staple shell** (`services/dollEngine/staplePrompt.ts`). Realtime shader lab is secondary tab.

**Alternatives rejected:** Shader-first identity surface; per-creator species drift.

**Why:** One house species; wardrobe/motifs vary; earned identity projection from Taste Graph.

**Ref:** `prd/doll-staple-shell.md`

---

## 2026-08-07 — mimi.fish / mimi.rip host skins (product intent)

**Decision:** One SPA, three public skins keyed by hostname (`lib/siteHost.ts`):

| Skin | Host | Job |
| --- | --- | --- |
| `you` | `mimi.you`, localhost, `*.vercel.app` | Full studio — capture, approve, remember |
| `fish` | `mimi.fish` | **Share / attention plane** — anything shareable (“fishing for compliments”): public zine plates, token shares, creator shelves; canonical outbound URL `https://mimi.fish/s/:zineId` |
| `rip` | `mimi.rip` | **Inversion plane** — mirrors `mimi.you` structure but surfaces **opt-in inverted** user data (inverse readings, dark diagnostic plates); not canonical identity |

Fish and Rip are public faces, not separate products. Identity and studio chrome stay on `mimi.you`. Local QA: `?skin=fish|rip` or `localStorage.mimi_site_skin`.

**Alternatives rejected:** Separate deploys per domain; routing all shares through `mimi.you/s/:id`; treating Rip as anonymous-only with no studio chamber.

**Why:** Distinct crawl/share URLs and inverted aesthetic without forking the codebase; fish OG must not leak studio chrome in previews.

**Ref:** `lib/siteHost.ts`, `App.tsx` host branches, `scripts/setupMimiFishDomains.mjs`, `scripts/setupMimiRipDomains.mjs`, Lovable parallel project (host routing queued 2026-08-07).

---

## 2026-08-04 — Cursor Cloud secrets → `.env.local` bridge

**Decision:** Cloud Agent installs run `npm run sync:cloud-env`, which copies dashboard-injected secrets (notably `AI_GATEWAY_API_KEY`, alias `AI_GATEWAY_KEY`) into git-ignored `.env.local` so `npm run dev` and verify scripts share the same credentials as the agent shell.

**Alternatives rejected:** Committing keys in `environment.json`; requiring manual `.env.local` copy each session.

**Why:** Cursor secrets are runtime env vars; Mimi loads `.env.local` via dotenv. The bridge keeps dev server terminals and scripts aligned without leaking credentials into the repo.

**Ref:** `scripts/syncCloudAgentEnv.ts`, `.cursor/environment.json`, `AGENTS.md`

---

## 2026-08-04 — Persistent project memory files

**Decision:** Maintain `.cursor/rules/mimi-context.mdc`, `docs/STRATEGY.md`, `docs/STATE.md`, and this file as living project memory. Agents update STATE + DECISIONS after architectural or module-shipping work without asking permission.

**Alternatives rejected:** Ad-hoc handoff docs only; relying on `AGENTS.md` alone for module status.

**Why:** Cloud agents and contributors need accurate, grep-friendly status between sessions.

**Ref:** This change set.

---

## 2026-08-04 — `/studio` primary route is orientation intake (not archival desk)

**Decision:** Mount `StudioOrientationEntry` at `/studio`. Keep `StudioWorktable` only at `/studio/worktable-legacy`, explicitly labeled legacy/experimental. Route-level tests forbid `FIG. 01`, `Spark · Generate`, and the six-folder DESK/SCRY rail on the primary entry.

**Alternatives rejected:** (1) Continue polishing the archival worktable on `/studio` (PR #201 scope). (2) Removing the worktable entirely before migration completes.

**Why:** Product intent is calm orientation + multimodal intake on the primary Studio route; the archival desk remains available for migration without blocking the intake ship. Worktable UX fixes from #201 stay scoped to the legacy route and full console.

**Ref:** PR #191 merged after rebase onto main (#190 Neon spine, #199 docs); PR #201 merged earlier but superseded for `/studio` primary surface.

---

## 2026-08-04 — Lightweight UX research instrumentation (`?research=1`)

**Decision:** Add opt-in session telemetry behind `?research=1` (sticky via `sessionStorage`). Events use schema `{sessionId, taskName, event, elementId, ts}`; capture task start, first meaningful click, dead clicks, time-to-first-action, abandonment, and observer notes. Persist to Firestore `research_sessions` when authenticated; always buffer locally with raw JSON export. Dismissible in-app note widget — no dashboard.

**Alternatives rejected:** (1) Reuse Firebase Analytics / taste_events (consent-gated, wrong schema). (2) Build an admin review dashboard in-app.

**Why:** Facilitates moderated usability studies without polluting production analytics or requiring a separate tool chain.

**Ref:** `lib/researchMode.ts`, `services/researchInstrumentation.ts`, `components/ResearchNoteWidget.tsx`

---

## 2026-08-05 — Studio footnote dock + instrument rail extraction

**Decision:** Extract `StudioInstrumentRail` (scrollable bottom icons) and `StudioFootnoteDock` (Continuum · Pocket · Telemetry mini sheets opened from the footnote emblem). Dedicated icons: pipette = Treatments, repeat loop = Continuum, archive = Pocket. Auto monotonic cover issue index (`SYS // COV-NNN`) on legacy compose console. Zine reader pill toolbar gains COMMENTS + PUBLISH (owner `isPublic` path, distinct from STAGE broadcast).

**Alternatives rejected:** (1) Stuff Continuum/Pocket/Telemetry into a single “card” toolbar icon. (2) Replace Studio OS Map·seal·Find anchors with the instrument rail globally.

**Why:** Matches the elevated-notes mockup: one **floating cylindrical toolbar** scrolls all compose/zine tools inside a single pill — not a modular footnote dock + edge rail.

**Ref:** `components/ui/FloatingCylinderToolbar.tsx`, `components/studio/StudioInstrumentRail.tsx`, `AnalysisDisplay.tsx`

---

## 2026-08-07 — Lovable parallel track phased advisory (menu, toolbar, Tailor, Scry, Press)

**Decision:** Execute product expansion on Lovable project `82416757-f4d9-45c3-9665-4f043ec226e8` in phases: P0 menu + functional Studio toolbar + `/tailor` chamber with generation-contract wiring; P1 Profile/public card + Edit/Pocket/fish-rip; P2 Dolls onboarding + Omni Loop + Mesopic; P3 Scry curiosity profile + Used Context colophon + `/the-press` export chamber. Persist build canon via Lovable `set_project_knowledge`. Track queue status in `docs/STATE.md`.

**Alternatives rejected:** (1) Blocking all Lovable work until queue drains to one message. (2) Requiring Perplexity for Scry v1. (3) Folding Tailor only into `/mimi-you` without dedicated chamber and contract injection.

**Why:** Lovable queue is long but parallel messages preserve phased delivery; production canon (Tailor contract, colophon, Press, Scry lanes) maps cleanly onto TanStack stack; Scry can use existing research.server + credits.

**Ref:** Lovable messages `umsg_01kzetkx9…` (P0), `umsg_01kzetm5…` (P2), `umsg_01kzetrb0…` (P3 Scry/colophon), `umsg_01kzetra4…` (P3 Press); `prd/aesthetic-05-provenance-colophon.md`, `prd/doll-staple-shell.md`

---

## 2026-08-08 — Taste Intelligence Phase 1 (EvidenceAtom spine)

**Decision:** Introduce canonical `EvidenceAtom`, `TasteAssertion`, `TasteConcept`, and computed `TasteState` under `users/{uid}/` Firestore subcollections. Ingest via `POST /api/mimi/evidence` (session-verified) and client `createEvidenceAtom`. Mirror Tailor `EvidenceNode` writes non-blockingly into `evidenceAtoms`. Corrections write `interactionEvents` audit rows. First UI surface: `TasteEvidenceAtomsPanel` on Taste Graph Intel Memo tab.

**Alternatives rejected:** (1) Store taste atoms in Neon on day one — memory approvals live in Neon but taste evidence is still Firebase-scoped in Phase 1. (2) Replace Tailor `EvidenceNode` immediately — bridge only until migration Phase 2.

**Why:** Unifies taste-relevant evidence with explicit source vs inference separation, correction loop, and a single `getTasteState()` interface for generation — without blocking on full Tailor/Pocket migration.

**Ref:** `docs/taste-intelligence-phase1.md`, `lib/taste/`, `services/taste/`, `lib/mimiEvidenceRoute.ts`

---

## 2026-08-08 — Taste Intelligence Phase 1.5 hooks

**Decision:** After evidence ingest, queue server-side interpretation (`queueEvidenceAtomAnalysis`) when AI Gateway is configured. Client creates call `POST /api/mimi/evidence/analyze`. Inject `getServerTastePromptContext()` into `generate-text` and `create-zine` for signed-in users. Expose `GET /api/mimi/taste-state`.

**Alternatives rejected:** (1) Client-only analysis — cannot access Admin Firestore or reliably fund gateway on mirror path. (2) Blocking ingest on analysis — keeps ingest fast; honest pending/failed states in UI.

**Why:** Closes the loop from capture → interpretation → correction → generation without requiring a separate analyze step from the user.

**Ref:** `lib/taste/evidenceAtomAnalysis.ts`, `lib/taste/serverTasteState.ts`, `lib/mimiGenerateTextRoute.ts`
