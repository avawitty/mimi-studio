# Mimi Studio — Architecture Decisions (ADR-lite)

Append-only log. One entry per architectural decision: **date**, **decision**, **alternatives rejected**, **why**.

For full architecture narrative see [`mimi-system-architecture.md`](./mimi-system-architecture.md). Update [`STATE.md`](./STATE.md) when implementation status changes.

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
