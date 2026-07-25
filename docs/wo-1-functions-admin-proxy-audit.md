# WO-1 Functions Admin Proxy Audit

Date: 2026-07-11

Constraint: Vercel must not receive `FIREBASE_SERVICE_ACCOUNT`. Firebase Admin work belongs in Firebase Functions.

## Vercel API Admin Audit

| Vercel route / helper | Calls `getServerFirebaseAdmin()` | Without Vercel service account | Resolution |
| --- | --- | --- | --- |
| `api/sessionLogin.ts` | Auth session cookie creation | Would not be able to create session cookie locally | Already proxies to Firebase Functions `/api/sessionLogin` when Admin is unavailable. |
| `api/sessionLogout.ts` | Auth presence check | Can clear cookie locally, but also supports proxy | Already proxies to Firebase Functions `/api/sessionLogout` when Admin is unavailable. |
| `api/stripe-webhook.ts` | Firestore membership/credit grants | Fails with `Database not initialized` | Now proxies raw Stripe webhook to Firebase Functions `/api/stripe-webhook`. |
| `api/sync-subscription.ts` | Verify token + Firestore pending membership claim | Fails with `Database not initialized` | Now proxies to Firebase Functions `/api/sync-subscription`. |
| `api/og/zine.ts` | Firestore zine fetch for social cards | Returns `503 Database not configured` | Now proxies to Firebase Functions `/api/og/zine`. |
| `lib/mimiFundedGateway.ts` | Verify token, read/write credits, usage event | Previously allowed unbilled funded gateway access when Admin missing | Now proxies access check and charge to Firebase Functions `/api/funded-gateway/access` and `/api/funded-gateway/charge`. |

## Firebase Functions Endpoints

The exported Firebase Function remains `api`, so the full URL shape is:

`https://<region>-<project-id>.cloudfunctions.net/api/api/<endpoint>`

This repo's `FIREBASE_FUNCTIONS_URL` should point to the exported function base:

`https://<region>-<project-id>.cloudfunctions.net/api`

Functions routes added or verified:

- `POST /api/sessionLogin`
- `POST /api/sessionLogout`
- `POST /api/stripe-webhook`
- `POST /api/sync-subscription`
- `POST /api/funded-gateway/access`
- `POST /api/funded-gateway/charge`
- `GET /api/og/zine`

## Env Var Matrix

### Vercel

Required:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `FIREBASE_FUNCTIONS_URL`
- `FIREBASE_FUNCTIONS_REGION`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `AI_GATEWAY_API_KEY`
- `MIMI_PUBLIC_BASE_URL`

Optional:

- `VITE_FIREBASE_FUNCTIONS_URL`
- `VITE_FIREBASE_FUNCTIONS_REGION`
- `MIMI_DOSSIER_GATEWAY_MODEL`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `YOU_API_KEY`
- `OPENAI_APPS_CHALLENGE`

Forbidden by org policy:

- `FIREBASE_SERVICE_ACCOUNT`

### Firebase Functions

Required:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `MIMI_PUBLIC_BASE_URL`

Firebase Admin credentials are provided by the Functions runtime through `initializeApp()`. Do not mirror the Vercel `FIREBASE_SERVICE_ACCOUNT` pattern into production config.

Optional:

- `GEMINI_API_KEY`

## API Import Fixes

The deploy-blocking `TS2307` errors for `api/mimi/*` were resolved by adding explicit route modules under `lib/`:

- `lib/mimiAnalyzeImageRoute.ts`
- `lib/mimiSignalReaderRoute.ts`
- `lib/mimiCreateZineRoute.ts`
- `lib/mimiGenerateImageRoute.ts`
- `lib/mimiGenerateSpecRoute.ts`

`api/openai-apps-challenge.ts` was also missing `lib/openaiAppsChallenge.ts`; that helper now reads the challenge token from env.

## Verification

- `npm run validate:canon` passes.
- `npm run build` passes.
- `npm run build` inside `functions/` passes.
- Root `npm run lint` still fails on unrelated UI/type issues in App/Tailor/TasteGraph/PearlButton/useTasteGravity/shopify/tailorService. The admin proxy and missing route import errors are cleared.
