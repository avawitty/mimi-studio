# Sovereign archive

Owned Stand data plane behind Express. Prefer this over Firestore free-tier reads for Floor, feeds, OG, and Mine.

## Backends

| Host | Default | Notes |
| --- | --- | --- |
| Local `npm run dev` | SQLite `.data/sovereign.sqlite` | On unless `MIMI_SOVEREIGN_ENABLED=0`. WAL + busy_timeout enabled. |
| Docker / Fly | SQLite `/data/sovereign.sqlite` | Volume mount; see `Dockerfile`, `fly.toml` |
| Postgres / Neon | `MIMI_SOVEREIGN_DATABASE_URL` | Or `DATABASE_URL` when it is a `neon.tech` URI (auto). Force any Postgres URL with `MIMI_SOVEREIGN_USE_DATABASE_URL=1`. |
| Vercel | Off unless Neon/Postgres URL | Attach Neon project **mimineon** (`sweet-dust-78322246`) and set `DATABASE_URL` or `MIMI_SOVEREIGN_DATABASE_URL`. TLS cert verification is required (`rejectUnauthorized: true`). |

Schema version is tracked in `schema_meta` (current: **3** — AI Gateway embedding columns).

## HTTP surface

- `GET /api/sovereign/status` — ready, backend, counts, `schemaVersion`, `latencyMs`, `gatewayEmbed`, `embeddedCount`
- `GET /api/sovereign/community?limit=&q=&cursor=` — keyset pagination; `q` uses hybrid keyword + AI Gateway semantic rank
- `GET/POST/DELETE /api/sovereign/zines`
- `GET/POST /api/sovereign/profile`
- `GET/POST/DELETE /api/sovereign/pocket`
- `POST /api/sovereign/import` — transactional batch (cap 500; embeds deferred)
- `POST /api/sovereign/reindex` — backfill Gateway embeddings (`{ limit, force }`, ingest key)
- `GET /api/sovereign/events?scope=public|user&userId=` (SSE; Express only)

## AI Gateway embeddings

Floor search (`q=`) is hybrid when Gateway credentials exist (`AI_GATEWAY_API_KEY` or Vercel OIDC):

1. Keyword match on title / handle / tone
2. Query embedding via `embedGatewayText` → `modelFor("embedding", "gateway")` (default `openai/text-embedding-3-small`)
3. Cosine rank against stored `zines.embedding` (same model space)

Disable with `MIMI_SOVEREIGN_EMBED=0`. Upserts index asynchronously; imports skip embed and expect `POST /api/sovereign/reindex`.

Feed (`/api/feed`) and OG (`/api/og/zine`) read sovereign first when ready.

## Auth options (explored)

| Mode | How | Good for | Gaps |
| --- | --- | --- | --- |
| **Firebase ID token** (`Authorization: Bearer` / `x-user-token`) | Admin `verifyIdToken` | Browser `fetch` after sign-in | `EventSource` cannot set custom headers |
| **Firebase `__session` cookie** | Admin `verifySessionCookie` (checkRevoked) | SSE + same-origin credentialed calls | Requires `/api/sessionLogin` after sign-in |
| **Ingest key** (`x-mimi-ingest-key` / `x-api-key`) | Shared secret `MIMI_SOVEREIGN_INGEST_KEY` | Firestore→sovereign export, ops seed | Not end-user identity; pair with `x-user-id` for acting-as |
| **Soft `x-user-id`** | Trusted only when not strict | Local single-tenant dev | Spoofable — **off in production** unless `MIMI_SOVEREIGN_TRUST_USER_HEADER=1` |
| **Neon Auth (Managed Better Auth)** | `NEON_AUTH_BASE_URL` / `VITE_NEON_AUTH_URL`; users in `neon_auth` schema | Greenfield Neon+RLS apps; branchable auth | Replaces Firebase identity; SDK oriented to Next/Vite Better Auth — conflicts with Stripe/`__session`/credits today |
| **Neon Stack Auth (legacy)** | `STACK_*` / `NEXT_PUBLIC_STACK_*` | Old Neon Auth resources only | **Do not use** for new work (pre–2026-01-12) |
| **Neon / Postgres RLS** | DB-enforced policies with JWT claims | Direct client→DB (not current architecture) | Would bypass Express slim/cache/SSE; more ops surface |
| **Clerk / Auth.js / Supabase Auth** | Replace Firebase identity | Greenfield apps | High migration cost; billing + existing `__session` already Firebase |

### Recommendation

**Keep Firebase Auth as the identity source of truth.** Wire sovereign as a dual-verifier:

1. Prefer ID token on mutating `fetch` calls (current client).
2. Always accept `__session` for SSE / cookie-only channels (now implemented).
3. Use ingest key only for migration/import jobs.
4. Never enable soft `x-user-id` on Vercel/production.

**Neon Auth** is enabled on mimineon (`NEON_AUTH_BASE_URL`) and is fine to leave provisioned, but **do not adopt it as Mimi’s login** until Firebase (and Stripe customer linkage) is intentionally migrated. Status exposes `neonAuthConfigured` / `neonAuthHost` for ops visibility (`lib/sovereign/neonAuth.ts`). Ignore legacy Stack Auth vars.

Do **not** move to Neon RLS or a second auth vendor until Firestore is fully demoted and identity is a deliberate rewrite. For scale, stay with Express/API ownership + Neon pooled Postgres; add a long-lived Express host (Fly) when SSE fan-out matters more than serverless.

Writers accept (in order): ingest key → Firebase ID token → `__session` cookie → soft `x-user-id` (dev only). Production defaults to strict token/key/cookie auth. Mutating routes also apply a per-uid in-process rate limit (~40/min).

## Client behavior

`services/sovereignClient.ts` + `firebaseUtils` prefer sovereign for community / user zines / profile / pocket. When the archive is online, Floor and Mine subscribe via SSE (poll fallback) and **do not** open Firestore `onSnapshot` listeners. Deletes and metadata updates (including unpublish via `isPublic: false`) mirror into sovereign so Floor stays truthful.

## Scalability posture

| Concern | Current posture | Next step when needed |
| --- | --- | --- |
| Durable multi-instance | Neon Postgres pool (`max` 3 on Neon, env-overridable) | Raise `MIMI_SOVEREIGN_PG_POOL_MAX`; consider `@neondatabase/serverless` on pure Vercel |
| Hot Floor reads | 30s in-process TTL + CDN `s-maxage` | Redis/KV cache shared across isolates |
| Pagination | Keyset `cursor` on `timestamp` | Composite `(timestamp, id)` if collisions appear |
| Live sync | In-process SSE bus | Redis pub/sub or Neon Logical Replication → worker |
| Imports | Transactional batches, 500 cap | Chunked job queue |
| Query safety | `statement_timeout=15s`, slim Floor payloads, Gateway cosine over JSON vectors | Neon `pgvector` for large catalogs |
| Auth fan-out | Firebase Admin verify | Short-lived cached uid claims (careful with revoke) |

## Ops

```bash
npm run sovereign:seed
npm run sovereign:import -- ./path/to/export.json
npm run sovereign:export-firestore -- --limit=200
npm run sovereign:reindex
```

Export requires Firebase Admin credentials and enough Firestore quota to read once.

### Vercel / Neon checklist

1. `DATABASE_URL` (pooled Neon) present on Preview + Production.
2. `FIREBASE_SERVICE_ACCOUNT` present so ID token / session cookie verify works.
3. `MIMI_SOVEREIGN_INGEST_KEY` set before running import against production.
4. Confirm `GET /api/sovereign/status` → `ready: true`, `backend: "postgres"`.
