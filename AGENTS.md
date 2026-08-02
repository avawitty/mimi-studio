# AGENTS.md

## Cursor Cloud specific instructions

Mimi Studio ("mimi-zine") is a single-service app: an Express server (`server.ts`, run
with `tsx`) that mounts the Vite dev server as middleware and also serves the API
routes under `/api`. There is no separate frontend/backend process — `npm run dev`
starts everything on one port.

### Running the app
- `npm run dev` starts the combined Express + Vite dev server on `http://localhost:3000`
  (override with `PORT` or `DEV_PORT`). HMR is intentionally disabled in `vite.config.ts`.
- Standard scripts (lint/build/test/verify) are documented in `README.md` and
  `package.json`; use those rather than re-deriving commands.

### Environment / credentials (non-obvious)
- The app boots and is fully navigable with **no** environment variables. Firebase Admin,
  Stripe, and server-side AI providers are all lazily/optionally initialized: missing keys
  just disable those integrations (you'll see "FIREBASE_SERVICE_ACCOUNT not provided" —
  this is expected, not an error).
- To exercise integrations, put keys in `.env.local` (loaded first, git-ignored). Relevant
  vars include `GEMINI_API_KEY` / `AI_GATEWAY_API_KEY` / `OPENAI_API_KEY` (enable server
  AI), `STRIPE_SECRET_KEY`, and the `FIREBASE_*` client vars (inlined at build time via
  `vite.config.ts` `define`). Never commit secrets.

### AI Gateway models
- When calling Vercel AI Gateway for **text, image, audio (TTS), or video** generation,
  use `modelFor(role, "gateway")` or `suggestedGatewayModel(role)` from
  `services/modelConfig.ts` / `lib/models.ts`. Do not hardcode outdated provider model
  strings — defaults track the newest curated catalog IDs (env-overridable via
  `AI_GATEWAY_*_MODEL` in `.env.example`).
- Re-verify IDs against `https://ai-gateway.vercel.sh/v1/models` when bumping
  `GATEWAY_DEFAULT_MODELS`.

### Tests
- E2E is Playwright (`npm run test:e2e`). The Playwright config auto-starts `npm run dev`
  and reuses an already-running server on port 3000, so no manual server start is needed.
- Playwright browsers must be installed once per fresh VM: `npx playwright install --with-deps chromium webkit`
  (the suite uses both a `chromium` project and a WebKit-based `ios-pwa` project).
- Visual snapshot baselines live in `e2e/*.spec.ts-snapshots/`.

### Frequent UX review (do this often)
After any UI/chrome/public-face change — and at least once per agent session that
touches the product surface — run a short mobile review before calling work done:

1. `npm run review:mobile` (needs `npm run dev` on :3000, or pass a preview URL).
2. Manually spot-check iPhone-width: Front Page, Stand (Mine/Floor), Signature, Studio
   (Tools + Treatments sheets).
3. Checklist:
   - Public faces: quiet chrome (Menu + identity; no pocket/oracle); one `Mimi` wordmark
   - Stand Floor fully tappable; no clipped tabs
   - Studio: Tools opens; sheets above nav; dismissible; safe-area padding
   - No app-owned circular right-edge FAB (preview chrome FABs are external)
   - Spell the wordmark `Mimi` (never `MIMI`) when readable
4. Fix P0/P1 findings in the same PR when cheap; defer the rest with a note.
