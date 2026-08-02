# Mimi Studio

**A private AI editorial studio for taste, identity, research, and image-making.**

Mimi helps creators collect references, interpret visual and cultural signals, approve what feels true, and turn that knowledge into traceable creative direction.

It is not a generic chatbot or an automatic identity generator. Mimi is a creator operating system built around explicit, user-approved knowledge.

> **Capture → Interpret → Approve → Remember → Retrieve → Generate → Compose → Export**

## What Mimi does

Mimi turns scattered creative evidence—images, links, notes, garments, artworks, language, research, and reactions—into a living **Taste Graph**.

That graph can then support:

- creative dossiers and aesthetic reports
- editorial direction and zines
- brand systems and campaign concepts
- image treatments and visual prompts
- product and build briefs
- research memory with visible provenance
- symbolic projections such as Mimi Dolls and personal creative universes

The important part is not generation alone. The important part is that Mimi can show **what it used, why it used it, and what the creator approved**.

## Product principles

- **The creator remains the authority.** Mimi proposes; the creator accepts, rejects, edits, weights, or retires.
- **Evidence and inference stay separate.** What is visible in a source is not silently treated as what it means.
- **Memory requires approval.** Captured material does not become durable knowledge without an explicit decision.
- **Used Context is visible.** Outputs should expose the approved sources and memory that shaped them.
- **Artifacts are traceable.** Reports, zines, briefs, and generated assets preserve provenance.
- **Taste is operational.** Mimi turns aesthetic instinct into reusable creative laws without flattening it into a fixed label.

## Core workflow

A practical Mimi workflow looks like this:

1. **Collect** references, notes, files, links, questions, and visual evidence.
2. **Read** observations, patterns, tensions, and possible interpretations.
3. **Approve** what is accurate; reject, rename, merge, split, annotate, or reweight the rest.
4. **Remember** the approved knowledge inside the Taste Graph and memory registry.
5. **Retrieve** the right context for a declared task.
6. **Compose** a dossier, zine, brief, treatment, campaign, or other artifact.
7. **Export** the result with its context and provenance intact.

## Main product areas

| Area | Role |
| --- | --- |
| **Tailor** | Ingestion and evidence engine for reading references and building the Taste Graph. |
| **Taste Graph** | The evolving source of truth for accepted signals, rejected signals, patterns, and creative laws. |
| **Scribe** | Research and capture workspace for questions, notes, sources, highlights, and approved memory. |
| **Studio** | Composition environment for turning direction and context into creative artifacts. |
| **The Edit** | Editorial decision layer for shaping position, structure, selection, and tone. |
| **The Press** | Export and publishing layer for zines, reports, bundles, and provenance manifests. |
| **Darkroom** | Image-treatment system for describing, saving, and reapplying visual transformations. |
| **Mimi Dolls / mimi.u** | Symbolic and personal-universe projections generated from approved taste knowledge. |

## Architecture

Mimi is organized around durable, typed objects rather than hidden chat history.

Key objects include:

- Source Objects
- Evidence and Observations
- Approvals
- Memory Atoms
- Context Runs and Context Packets
- Taste Graphs, Pattern Clusters, and Creative Laws
- Creative Dossiers and Editorial Directions
- Build Briefs
- Zines, Reports, and published Artifacts
- Provenance records and Used Context manifests

The canonical architecture is documented in [`docs/mimi-system-architecture.md`](docs/mimi-system-architecture.md).

## Technology

- React 19
- TypeScript
- Vite
- Express
- Firebase Authentication, Firestore, Admin SDK, and Functions
- Sovereign archive (SQLite / Postgres) for owned Floor + Mine reads
- OpenAI and Google GenAI integrations
- Vercel AI Gateway compatibility
- Model Context Protocol (MCP)
- Stripe billing
- Framer Motion and Motion
- Three.js / React Three Fiber
- D3 and Recharts
- Playwright
- PDF, image, ZIP, and export tooling

## Sovereign archive

The **sovereign archive** is Mimi’s owned data plane for Stand Floor, Keep Tabs feeds, and Mine sync — so public reads do not depend on Firestore free-tier quotas.

- **Local / Fly / Docker:** enabled by default with SQLite at `.data/sovereign.sqlite` (override with `MIMI_SOVEREIGN_DB`).
- **Postgres / Neon:** set `MIMI_SOVEREIGN_DATABASE_URL`, or a `neon.tech` `DATABASE_URL` (auto). TLS cert verification is enforced.
- **Vercel:** off unless a durable Postgres URL or explicit DB path is configured (serverless disk is ephemeral).
- **Auth:** Firebase ID token + `__session` cookie (for SSE); ingest key for imports. Soft `x-user-id` is local-only.
- **AI Gateway:** Floor `q=` search is hybrid keyword + Gateway embeddings (`openai/text-embedding-3-small` via `modelFor`). Reindex with `npm run sovereign:reindex`.
- **Live updates:** `GET /api/sovereign/events` (SSE) on the long-lived Express host; clients fall back to polling on serverless.
- **Seed / import:** `npm run sovereign:seed`, `npm run sovereign:import -- ./export.json`, `npm run sovereign:export-firestore`, `npm run sovereign:reindex`.

See [`docs/sovereign-archive.md`](docs/sovereign-archive.md) for auth options, scale posture, and ops. Health reports archive status at `GET /api/health` → `sovereign`.

## Run locally

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
git clone https://github.com/avawitty/mimi-studio.git
cd mimi-studio
npm install
```

Create an `.env.local` file and add the environment variables needed for the services you are using.

For server-side AI, configure at least one supported provider or gateway credential, such as:

```bash
OPENAI_API_KEY=
GEMINI_API_KEY=
AI_GATEWAY_API_KEY=
```

See `.env.example` for gateway model overrides. Gateway model IDs live in `lib/models.ts`; runtime resolution is in `services/modelConfig.ts`. AI SDK + gateway helpers are in `lib/ai/generate.ts`; the first production consumer is `POST /api/mimi/generate-text` (`npm run verify:gateway-generate-text`).

Firebase, Stripe, Shopify, and other integrations require their own credentials. Keep service-account files and secrets outside the repository.

Start the development server:

```bash
npm run dev
```

The server uses `PORT` or `DEV_PORT` when provided and otherwise defaults to port `3000`. The app is fully navigable with no env vars; missing Firebase Admin / Stripe / AI keys simply disable those integrations.

## Useful commands

```bash
npm run dev                         # Run the application
npm run mcp                         # Run the MCP server
npm run build                       # Build the client and Node server
npm run build:vercel                # Build the Vite client for Vercel
npm run preview                     # Preview the production client build
npm run lint                        # Type-check the project
npm run test:e2e                    # Run Playwright end-to-end tests
npm run test:unit                   # Run Vitest unit tests
npm run validate:canon              # Validate canonical routes
npm run verify:tailor-contract      # Verify Tailor profile contracts
npm run verify:used-context         # Verify the Used Context flow
npm run verify:zine-visual-policy   # Verify zine visual-policy rules
npm run verify:zine-spread-compose  # Verify customLayout spread compose
npm run verify:structured-zine-pdf  # Verify archival structured PDF export
npm run verify:doll-engine          # Verify Doll Engine projection helpers
npm run verify:doll-staple          # Verify Mimi Shell staple prompt lock
npm run verify:fish                 # Verify mimi.fish share/shelf URL rules
npm run verify:gateway-generate-text # Needs AI_GATEWAY_API_KEY
npm run review:mobile               # iPhone-width UX probe (needs :3000 or pass URL)
npm run setup:mimi-fish-domains     # Auth domains for mimi.fish (+ optional Vercel)
npm run setup:mimi-rip-domains      # Auth domains for mimi.rip
npm run sovereign:seed              # Seed demo Floor into the sovereign archive
npm run sovereign:import -- ./file  # Import a JSON export into sovereign
npm run sovereign:export-firestore  # One-shot Firestore → sovereign (needs Admin)
```

Additional integration checks are available for Shopify, Intel Hub, Residue, and Pinterest preview workflows.

## Operational developer notes

Concise pitfalls and contracts that are easy to miss. Deeper chamber maps live in [`docs/mimi-chamber-implementation-audit.md`](docs/mimi-chamber-implementation-audit.md); durable architecture in [`docs/mimi-system-architecture.md`](docs/mimi-system-architecture.md).

### Public host skins and share links

One SPA, three public skins (`lib/siteHost.ts`):

| Skin | Host | Notes |
| --- | --- | --- |
| `you` | `mimi.you` | Full app (also localhost / `*.vercel.app`) |
| `rip` | `mimi.rip` | Inverse public plates |
| `fish` | `mimi.fish` | Share plate + creator shelf |

- Canonical zine share URL: `https://mimi.fish/s/:zineId` (`getFishShareUrl` / `getZineShareUrl`).
- Local QA without DNS: `?skin=rip|fish` or `localStorage.mimi_site_skin`.
- After attaching custom domains, run `npm run setup:mimi-fish-domains` / `setup:mimi-rip-domains` so Firebase Auth authorized domains stay in sync.
- Offline URL-rule check: `npm run verify:fish`.

### `POST /api/mimi/generate-text`

Body (Zod-validated): `{ prompt, system?, role?: "textFast"|"textDeep", temperature? }`.

- Uses `generateGatewayText` from `lib/ai/generate.ts` with Gateway model roles from `services/modelConfig.ts` — do not hardcode outdated provider model strings.
- Same funded-gateway credit gate as `/api/proxy/ai-gateway`: signed-in trial/plan credits, or a personal Gateway/provider key (BYOK Bearer).
- Verify requires `AI_GATEWAY_API_KEY`: `npm run verify:gateway-generate-text`.

### Stale chunk / post-deploy MIME recovery

After a deploy, browsers or the service worker can request old `/assets/*.js` and receive HTML → MIME / chunk-load errors.

Recovery path (`lib/staleChunkRecovery.ts`, wired from `index.tsx` + `ErrorBoundary`):

1. Detect stale-asset error signatures (MIME, dynamic import failure, chunk load).
2. Clear Cache Storage and unregister service workers.
3. Hard-reload once with `?recovered=1` (45s cooldown to avoid loops).

`public/sw.js` intentionally avoids caching `/assets/*` and rejects HTML-as-asset responses. If a user is stuck after a ship, a hard refresh or clearing site data recovers; the automated path should fire first.

### Mobile UX review

```bash
npm run dev                         # separate terminal
npm run review:mobile               # or: npm run review:mobile -- https://preview.example
```

Playwright Chromium at 390×844 probes Front Page, Stand, Signature, Rip, and Studio. Screenshots + `review.json` land under `/opt/cursor/artifacts/mobile-ux-review`. Non-zero exit means checklist failures (quiet public chrome, brand casing, Stand Floor tabs, Studio sheets, no app-owned right-edge FAB). See `AGENTS.md` for the full checklist.

## Repository status

Mimi Studio is an active, evolving product system. Product names and interfaces may change, while the deeper contracts remain steady:

- explicit approval before memory
- visible context before trust
- evidence before interpretation
- creator control before automation
- structured knowledge before generation

## Private repository

This repository is currently private and under active development. All rights reserved unless otherwise stated in the repository.
