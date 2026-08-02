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
- When calling Vercel AI Gateway for **text, image, audio (TTS), video, or embeddings**,
  use `modelFor(role, "gateway")` or `suggestedGatewayModel(role)` from
  `services/modelConfig.ts` / `lib/models.ts`. Do not hardcode outdated provider model
  strings — defaults track the newest curated catalog IDs (env-overridable via
  `AI_GATEWAY_*_MODEL` in `.env.example`).
- Embeddings: prefer `embedGatewayText` / `embedManyGatewayText` in `lib/ai/generate.ts`
  (or `POST /api/mimi/embed`). Default model is `openai/text-embedding-3-small`. The
  Gemini proxy also remaps `embedContent` through `embedGeminiContentViaGateway`.
- Re-verify IDs against `https://ai-gateway.vercel.sh/v1/models` when bumping
  `GATEWAY_DEFAULT_MODELS`.

### Tests
- E2E is Playwright (`npm run test:e2e`). The Playwright config auto-starts `npm run dev`
  and reuses an already-running server on port 3000, so no manual server start is needed.
- Playwright browsers must be installed once per fresh VM: `npx playwright install --with-deps chromium webkit`
  (the suite uses both a `chromium` project and a WebKit-based `ios-pwa` project).
- Visual snapshot baselines live in `e2e/*.spec.ts-snapshots/`.

### Bot review autofix
- When asked to check Cursor / Codex / Vercel bot PR comments, follow
  `.cursor/skills/fix-bot-pr-comments/SKILL.md`.
- Recurring setup (Cursor Automation + optional GitHub Action):
  `docs/automations/fix-bot-pr-comments.md`.
- Manual / CI launch: `npm run cursor:fix-bot-comments` (needs `CURSOR_API_KEY`).

### Product / UX preferences (durable)
Full skill: `.cursor/skills/mimi-product-preferences/SKILL.md`. Short form:

- Prefer shared Studio OS shells (`components/studio-os/`) + `lib/productCanon.ts` /
  `lib/design-system.ts`. Do not invent a parallel chamber visual system.
- Studio OS bottom anchors: Map · Mimi seal · Find only — no permanent multi-chamber
  tab bar. One precise motif; handled evidence over decorative chrome.
- Brand is **Mimi** (not “Mimi Zine”). Never readable `MIMI` via CSS `uppercase`.
- If a UI lands too clean / dashboard-like, pull back to a middle ground — do not
  full-reverse product intent or migrate every chamber in one pass.
- Motion/haptics: `useFeedback()` semantic events only (`lib/feedback/`). Never
  `navigator.vibrate` or per-component haptic constants. No hover haptics; success
  haptics only after confirmed mutations.
- Honest empty/failure states (empty ≠ done; storage error ≠ delete). Collective /
  Observatory need explicit consent — public ≠ consented.
- Shipping: fix simple merge conflicts; stop and report conflicting product intents.
  CI/Bugbot → verify finding, fix root cause. Do not merge to `main`/production or
  change Vercel env/domains unless asked.

### Frequent UX review (do this often)
After any UI/chrome/public-face change — and at least once per agent session that
touches the product surface — run a short mobile review before calling work done:

1. `npm run review:mobile` (needs `npm run dev` on :3000, or pass a preview URL).
2. Manually spot-check iPhone-width: Front Page, Stand (Mine/Floor), Signature, Rip
   (`/rip`), Studio (Tools + Treatments sheets).
3. Checklist:
   - Public faces (incl. `mimi-rip`): quiet chrome (Menu + identity; no pocket/oracle);
     one `Mimi` wordmark; dark plates get dark chrome (no light-over-dark seam)
   - Never render readable `MIMI` via CSS `uppercase` on brand strings
   - Chamber shells: no duplicate mastheads over self-branded plates; padded motifs
   - Stand Floor fully tappable; no clipped tabs
   - Studio: Tools opens; sheets above nav; dismissible; safe-area padding
   - Studio OS: Map · seal · Find anchors only; no permanent chamber tab bar
   - No app-owned circular right-edge FAB (preview chrome FABs are external)
4. Fix P0/P1 findings in the same PR when cheap; defer the rest with a note.
