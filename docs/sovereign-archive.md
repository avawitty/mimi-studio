# Sovereign archive

Owned Stand data plane behind Express. Prefer this over Firestore free-tier reads for Floor, feeds, OG, and Mine.

## Backends

| Host | Default | Notes |
| --- | --- | --- |
| Local `npm run dev` | SQLite `.data/sovereign.sqlite` | On unless `MIMI_SOVEREIGN_ENABLED=0` |
| Docker / Fly | SQLite `/data/sovereign.sqlite` | Volume mount; see `Dockerfile`, `fly.toml` |
| Postgres | `MIMI_SOVEREIGN_DATABASE_URL` | Or `MIMI_SOVEREIGN_USE_DATABASE_URL=1` + `DATABASE_URL` |
| Vercel | Off | Needs durable Postgres URL (or explicit path) |

## HTTP surface

- `GET /api/sovereign/status`
- `GET /api/sovereign/community?limit=&q=`
- `GET/POST/DELETE /api/sovereign/zines`
- `GET/POST /api/sovereign/profile`
- `GET/POST/DELETE /api/sovereign/pocket`
- `POST /api/sovereign/import`
- `GET /api/sovereign/events?scope=public|user&userId=` (SSE; Express only)

Feed (`/api/feed`) and OG (`/api/og/zine`) read sovereign first when ready.

## Auth

Writers accept (in order): ingest key (`MIMI_SOVEREIGN_INGEST_KEY`), Firebase ID token (`Authorization: Bearer`), or soft `x-user-id` when trusted (local / `MIMI_SOVEREIGN_TRUST_USER_HEADER=1`). Production defaults to strict token/key auth.

## Client behavior

`services/sovereignClient.ts` + `firebaseUtils` prefer sovereign for community / user zines / profile / pocket. When the archive is online, Floor and Mine subscribe via SSE (poll fallback) and **do not** open Firestore `onSnapshot` listeners.

## Ops

```bash
npm run sovereign:seed
npm run sovereign:import -- ./path/to/export.json
npm run sovereign:export-firestore -- --limit=200
```

Export requires Firebase Admin credentials and enough Firestore quota to read once.
