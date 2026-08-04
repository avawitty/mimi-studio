# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Mimi Studio (package name `mimi-zine`) is a private AI editorial studio: creators capture references, notes,
and images; Mimi interprets them into evidence; the creator approves what becomes durable knowledge (the
**Taste Graph**); that approved knowledge is retrieved and composed into dossiers, zines, briefs, and other
artifacts with visible provenance ("Used Context"). The canonical workflow grammar, repeated throughout the
codebase and docs, is:

> **Capture → Interpret → Approve → Remember → Retrieve → Generate → Compose → Export**

Full product architecture (domains, objects, engines, contracts) lives in
`docs/mimi-system-architecture.md`. The current route/chamber/verify-script map lives in
`docs/mimi-chamber-implementation-audit.md`. Product principles are in `README.md`.

## Working constraints

This repo is ~195,000 lines across 387 components and ~90 services. Scope discipline matters more than
completeness.

- Touch only files required by the current task. If a fix seems to require edits outside the stated scope,
  stop and report rather than expanding.
- Route declarations live in `lib/productCanon.ts`. Never create a second route list.
- Cross-chamber navigation uses semantic intents (`lib/chamberIntents.ts`), not hardcoded route strings.
- `npm run lint` is `tsc --noEmit`. It must pass before you report done.
- Do not add dependencies without saying why in your summary.
- Do not "improve" adjacent code you notice along the way. Report it instead.

## Commands

```bash
npm run dev                 # Express + Vite dev server on :3000 (single process, HMR disabled)
npm run mcp                 # MCP server (mcp/server.ts)
npm run lint                # tsc --noEmit — this IS the lint/typecheck step, there is no eslint
npm run build                # vite build (client) + esbuild bundle of server.ts -> dist/server.cjs
npm run build:vercel        # vite build only (used for Vercel deploys)
npm run preview             # preview the production client build
npm run test:unit           # vitest run (__tests__/**/*.{test,spec}.{ts,tsx})
npm run test:unit:watch     # vitest watch mode
npm run test:e2e            # playwright test (auto-starts npm run dev, reuses :3000 if already running)
npm run review:mobile       # Playwright iPhone-width UX probe against :3000 or a passed URL
```

Single test file / test name:

```bash
npx vitest run __tests__/zineSpreadLayout.test.ts
npx vitest run -t "some test name"
npx playwright test e2e/scry.spec.ts
npx playwright test -g "some test name"
```

Playwright browsers must be installed once per fresh environment:
`npx playwright install --with-deps chromium webkit` (suite uses a `chromium` project and a WebKit-based
`ios-pwa` project; visual baselines live in `e2e/*.spec.ts-snapshots/`).

### `verify:*` scripts

`package.json` defines ~30 `npm run verify:*` scripts (e.g. `verify:tailor-contract`, `verify:used-context`,
`verify:zine-visual-policy`, `verify:doll-engine`, `verify:gateway-generate-text`). These are standalone
`tsx scripts/verifyXxx.ts` contract/behavior checks for specific subsystems, separate from the vitest suite.
When changing a subsystem, check `package.json` for a matching `verify:*` script and run it — some need env
vars (e.g. `verify:gateway-generate-text` needs `AI_GATEWAY_API_KEY`).

## Boot / environment

The app is fully navigable with **no environment variables set**. Firebase Admin, Stripe, and server-side AI
providers are all lazily/optionally initialized — missing keys just disable that integration and log a notice
(e.g. "FIREBASE_SERVICE_ACCOUNT not provided"); this is expected, not an error. Put real keys in `.env.local`
(git-ignored, loaded first). See `.env.example` for the full list, grouped by integration (AI Gateway,
Gemini/OpenAI/Anthropic direct keys, Firebase, Stripe, Shopify, Cursor, etc.). Firebase client vars are inlined
at build time via `define` in `vite.config.ts`.

## Architecture

### One codebase, two server runtimes

There is no separate frontend/backend repo. In dev and on Fly/Docker, `server.ts` (run via `tsx`, bundled to
`dist/server.cjs` for production) is a single long-lived Express process that mounts the Vite dev server as
middleware **and** serves every `/api/*` route directly (`npm run dev` starts everything on one port).

On Vercel, `build:vercel` builds only the static Vite client; `/api/*` requests are instead handled by
individual serverless functions under `api/**/*.ts` (see `vercel.json` `rewrites`/`functions`), one file per
route.

**These two entry points are not separate implementations.** Most route logic under `/api/mimi/*` lives once in
`lib/*Route.ts` (e.g. `lib/mimiGenerateTextRoute.ts`), and both `server.ts` and the matching thin
`api/**/*.ts` file call the same exported handler. A few routes keep their logic directly in `api/**/*.ts` when
shared extraction isn't worth it yet — e.g. `api/mimi/synthesize-dossier.ts`, which `server.ts` imports as
`synthesizeDossierHandler`. When adding or changing an API route that needs to work on both Fly/Docker and
Vercel, prefer a `lib/*Route.ts` handler wired from both `server.ts` and a thin `api/*.ts` file; if the route
already lives in `api/**/*.ts`, edit that file rather than introducing a duplicate handler elsewhere.

Deploy targets: `Dockerfile` + `fly.toml` (long-lived Express host, SQLite volume or Postgres URL for the
sovereign archive) and `vercel.json` (serverless, static client). `functions/` is a separate Firebase Cloud
Functions package (own `package.json`, deployed independently via `npm run deploy` inside `functions/`).

### AI Gateway / model routing

Never hardcode provider model ID strings. For text, image, audio, video, or embeddings via Vercel AI Gateway,
use `modelFor(role, "gateway")` / `suggestedGatewayModel(role)` from `services/modelConfig.ts` / `lib/models.ts`
— defaults track the current curated catalog and are env-overridable (`AI_GATEWAY_*_MODEL`). Embeddings prefer
`embedGatewayText` / `embedManyGatewayText` in `lib/ai/generate.ts` (default model
`openai/text-embedding-3-small`); the Gemini proxy remaps `embedContent` through
`embedGeminiContentViaGateway`. Re-verify IDs against `https://ai-gateway.vercel.sh/v1/models` when bumping
`GATEWAY_DEFAULT_MODELS`. First production consumer of the generate-text path is
`POST /api/mimi/generate-text` (Zod-validated body `{ prompt, system?, role?, temperature? }`), gated by the
same funded-gateway credit check as `/api/proxy/ai-gateway` (signed-in trial/plan credits or BYOK bearer key).

### Sovereign archive

An owned data plane (SQLite locally/Fly/Docker at `.data/sovereign.sqlite`, or Postgres via
`MIMI_SOVEREIGN_DATABASE_URL` / a `neon.tech` `DATABASE_URL`) for Stand Floor, Keep Tabs feeds, and Mine sync,
so public reads don't depend on Firestore free-tier quotas. Off by default on Vercel unless a durable Postgres
URL is configured (serverless disk is ephemeral). Client in `services/sovereignClient.ts`, server-side pieces
under `lib/sovereign/`. Floor search is hybrid keyword + Gateway embeddings; reindex with
`npm run sovereign:reindex`. Live updates via SSE at `GET /api/sovereign/events` (falls back to polling on
serverless). See `docs/sovereign-archive.md` for the full auth/ops story.

### Public host skins

One SPA serves three public skins keyed off hostname, resolved in `lib/siteHost.ts`:

| Skin | Host | Notes |
| --- | --- | --- |
| `you` | `mimi.you` | Full app (also localhost / `*.vercel.app`) |
| `rip` | `mimi.rip` | Inverse public plates |
| `fish` | `mimi.fish` | Share plate + creator shelf |

Canonical outbound zine share URL is `https://mimi.fish/s/:zineId` (`getFishShareUrl` / `getZineShareUrl`).
Local QA without DNS: `?skin=rip|fish` query param or `localStorage.mimi_site_skin`. After attaching custom
domains, run `npm run setup:mimi-fish-domains` / `setup:mimi-rip-domains` to keep Firebase Auth authorized
domains in sync. Offline URL-rule check: `npm run verify:fish`.

### Routing / chamber model

`App.tsx` owns navigation via the History API (`useAppRouter` + `canonicalizeMimiRoute`) — this is **not** a
react-router tree. `lib/productCanon.ts` is the source-of-truth registry of canonical product modules
("chambers": Studio, Scribe, Tailor, The Edit, The Press, Darkroom, Mimi Dolls, etc.), each with a route mode,
visibility, atmosphere, and primary action. `lib/routes.tsx` is the typed catalog of lazy-loaded chamber
components derived from that canon. `docs/mimi-chamber-implementation-audit.md` has the current chamber → route
→ component table and legacy route aliases.

### Directory map

- `components/` — organized by chamber/domain (`studio-os/`, `chambers/`, `tailor/`, `scribe/`, `residue/`,
  `forecast/`, `signature/`, `proscenium/`, `zine/`, `public-face/`, `provenance/`, `ui/` for primitives).
- `services/` — business logic and domain engines (taste graph, tailor analysis, zine generation, Stripe,
  Firebase, dossier synthesis, doll/rip engines as subfolders).
- `lib/` — shared route handlers (`*Route.ts`, consumed by both `server.ts` and `api/`), cross-cutting
  contracts (`*ChamberContract.ts`), and utilities (`design-system.ts`, `productCanon.ts`, `siteHost.ts`,
  `feedback/`, `motion/`, `sovereign/`, `zine/`, `celestial/`, `ai/`).
- `api/` — Vercel serverless function entry points, mostly thin wrappers over `lib/*Route.ts`.
- `functions/` — separate Firebase Cloud Functions TypeScript package (own build/deploy).
- `contexts/` — React context providers (`UserContext`, `ThemeContext`, `AgentContext`, `FeedbackProvider`).
- `hooks/` — shared hooks, notably `useFeedback()` (see below).
- `scripts/` — `verify*.ts` contract checks, `setup*` domain/config scripts, `seedSovereignDemo.ts`, Cursor
  automation scripts (`cursorAgentPrompt.ts`, `cursorFixBotComments.ts`, `cursorCloudReview.ts`).
- `mcp/` — the project's own Model Context Protocol server (`npm run mcp`).
- `__tests__/` — Vitest unit/component tests. `e2e/` — Playwright specs + visual snapshots.
- `docs/` — architecture, chamber audits, phase-status memos, spec docs. Check here before assuming a
  behavior is undocumented.

## Product / UX conventions (durable — read before touching UI)

These are mined preferences, not generic advice; the full version is `.cursor/skills/mimi-product-preferences/SKILL.md`
and `AGENTS.md`.

- **Shared shells, not N redesigns.** Extend `components/studio-os/` shells + `lib/productCanon.ts` /
  `lib/design-system.ts`. Do not invent a parallel per-chamber visual system.
- **Quiet bottom chrome (Studio OS).** Anchors are Map · Mimi seal · Find only (`StudioNavigation`) — no
  permanent multi-chamber tab bar.
- **One precise motif.** Don't stack lace/tape/wax/x-ray/decorative marks; handwriting is never required UI.
- **Brand casing.** User-facing name is **Mimi** (not "Mimi Zine"). Never render readable `MIMI` via CSS
  `uppercase` on brand strings.
- **Feedback/haptics go through `useFeedback()`** (`hooks/useFeedback.ts` / `lib/feedback/`) —
  `feedback.trigger("proposal.approved")` etc. Never call `navigator.vibrate` or invent local haptic constants
  in a component. Haptics are sparse: never on hover, never before a confirmed mutation, honor `haptics: "off"`
  and reduced motion. New semantic events belong in `lib/feedback/feedback.types.ts` + recipes.
- **Honest empty/failure states.** Empty memory ≠ partial completion; a storage/IndexedDB failure ≠ an
  intentional delete; show coverage/provenance when relevant.
- **Consent.** Collective / Observatory features need explicit contribution consent — public visibility is not
  the same as consented contribution. Keep Observatory and Residue namespaces distinct.
- **Overbuild correction.** If a change lands too clean / dashboard-like, pull back toward physical/editorial
  evidence rather than fully reversing product intent.
- **Migrate incrementally** — don't rename chambers or change unrelated behavior in the same pass.

### Shipping loop

- Merge conflicts: fetch `origin/main`, fix simple conflicts; stop and report when the conflict is between
  genuinely different product intents rather than mechanical.
- CI / Bugbot / bot review comments: verify the finding is real, fix the root cause, recheck (see
  `.cursor/skills/fix-bot-pr-comments/SKILL.md` for a full sweep; `npm run cursor:fix-bot-comments` needs
  `CURSOR_API_KEY`).
- Do not merge to `main`/production or change Vercel env/domains unless explicitly asked.
- After any UI/chrome/public-face change, run `npm run review:mobile` (needs `npm run dev` on :3000) and spot
  check iPhone-width on Front Page, Stand (Mine/Floor), Signature, `/rip`, and Studio — full checklist in
  `AGENTS.md`.

## Operational gotchas

- **Stale chunk / post-deploy MIME errors.** After a deploy, old service-worker/browser caches can request a
  removed `/assets/*.js` and get HTML back. Recovery lives in `lib/staleChunkRecovery.ts` (wired from
  `index.tsx` + `ErrorBoundary`): detects the error signature, clears Cache Storage, unregisters service
  workers, hard-reloads once with `?recovered=1` (45s cooldown). `public/sw.js` deliberately never caches
  `/assets/*` and rejects HTML served as an asset.
- **`astronomy-engine`** is aliased in `vite.config.ts` to its ESM entry directly — some resolvers otherwise
  pick the CJS build.
- **Stripe**: tiers are one Stripe Product per tier with monthly/annual Prices (never share a Product across
  tiers — Checkout/invoice line items show the Product name). Live price/product IDs are in `constants.ts`
  (`STRIPE_PRICES` / `STRIPE_PRICES_ANNUAL`), override via `STRIPE_PRICE_*` env vars. Full detail in
  `STRIPE_ARCHITECTURE.md`.
