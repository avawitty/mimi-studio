# PRD: AI Gateway + Vercel AI SDK Adoption

**Status**: Draft (local)  
**Branch**: `me-ai-gateway-models-ba71`  
**Related PR**: https://github.com/avawitty/mimi-studio/pull/70  
**ChatPRD**: Not created — ChatPRD MCP requires authentication in the Cursor desktop IDE

---

## Problem statement

Mimi routes AI through a mix of provider-specific proxies (`/api/proxy/openai`, `/api/proxy/anthropic`, `/api/proxy/gemini`) and a Vercel AI Gateway compatibility layer (`lib/aiGatewayCompat.ts`). Model IDs were partially centralized in `services/modelConfig.ts`, but gateway defaults were stale-prone, client providers still hardcoded outdated model strings, and there was no first-class Vercel AI SDK (`ai`) entry point for new server-side text/JSON generation.

Creators and operators need a single, env-overridable catalog of gateway `provider/model` IDs and a safe path to call models without embedding raw OpenAI/Anthropic SDK usage in new features.

## Goals

1. Maintain a verified catalog of AI Gateway model IDs used by Mimi.
2. Resolve gateway roles (`textFast`, `textDeep`, `image`, etc.) from that catalog via `modelFor`.
3. Provide thin AI SDK helpers that always route through AI Gateway.
4. Make local/bootstrap setup discoverable via `.env.example`.
5. Keep existing Intelligence Gate failover behavior intact.

## Non-goals

- Porting the v0 Next.js playground (`V0_RUNTIME_URL`, `V0_CALLBACK_URL`).
- Migrating every call site to `generateText` in one PR.
- Replacing Firebase auth or credit billing (`lib/mimiFundedGateway.ts`).
- Adopting `@cursor/sdk` (Cursor Agent SDK) — separate product surface; out of scope unless explicitly requested.

## User stories

### US-1 — Operator configures gateway
**As** an operator  
**I want** documented env vars for `AI_GATEWAY_API_KEY` and model overrides  
**So that** local and Vercel deploys can use the gateway without reading tribal knowledge.

**Acceptance**
- [x] `.env.example` lists gateway key + model override names
- [ ] `.env.local` present in runtime with a real key (blocked in cloud agent: no Vercel auth / no secret)
- [x] README points at `.env.example`, `lib/models.ts`, `lib/ai/generate.ts`

### US-2 — Engineer picks a current model by role
**As** an engineer  
**I want** `modelFor('textFast' | 'textDeep' | 'image', 'gateway')` to return live gateway IDs  
**So that** I never hardcode `gpt-4o` or `gemini-2.0-flash` in new code.

**Acceptance**
- [x] `lib/models.ts` defines `GATEWAY_DEFAULT_MODELS` verified against `https://ai-gateway.vercel.sh/v1/models`
- [x] `services/modelConfig.ts` gateway map uses those defaults (env-overridable)
- [x] Client `services/aiProvider.ts` OpenAI/Anthropic/Gateway providers call `modelFor(...)`

### US-3 — Engineer generates text/JSON via AI SDK
**As** an engineer  
**I want** `generateGatewayText` / `generateGatewayObject`  
**So that** new server features use AI SDK + Gateway instead of raw `fetch` to provider APIs.

**Acceptance**
- [x] `ai` package installed
- [x] `lib/ai/generate.ts` exports helpers using `generateText` + `gateway(modelId)` + `Output.object`
- [ ] At least one production route imports and uses the helpers (open — helpers not yet wired into `server.ts` / `api/**`)
- [ ] Live call succeeds with `AI_GATEWAY_API_KEY` (blocked without env)

### US-4 — UI has shadcn primitives for future playground
**As** a product engineer  
**I want** baseline shadcn components (`dialog`, `tabs`, `textarea`, `alert`, `skeleton`)  
**So that** a future model playground / settings surface can compose without inventing shells.

**Acceptance**
- [x] Components exist under `components/ui/`
- [x] Project remains Base UI / `base-nova` (`components.json`) — do not add AI Elements without Radix init

## Technical context (codebase)

| Area | Path | Role |
|------|------|------|
| Gateway catalog | `lib/models.ts` | Defaults + UI option list |
| Role resolver | `services/modelConfig.ts` | `modelFor(role, provider)` |
| AI SDK helpers | `lib/ai/generate.ts` | `generateGatewayText`, `generateGatewayObject` |
| Legacy gateway shaping | `lib/aiGatewayCompat.ts` | Existing chat/embed/image via gateway HTTP |
| Client failover | `services/aiProvider.ts` | Intelligence Gate; GatewayProvider → `/api/proxy/ai-gateway` |
| Gateway proxy | `api/proxy/ai-gateway.ts` | Server proxy + funded access |
| Funded billing | `lib/mimiFundedGateway.ts` | Credit gate for gateway usage |
| Env template | `.env.example` | Bootstrap keys (names only) |

**Current default gateway IDs** (verified present on AI Gateway catalog at PR time):

- textFast: `google/gemini-3.6-flash`
- textDeep: `anthropic/claude-sonnet-5`
- image / imageEdit: `google/gemini-3.1-flash-image-preview`
- video: `google/veo-3.1-fast-generate-001`
- embedding: `openai/text-embedding-3-small`

## Edge cases & error states

| Case | Expected behavior |
|------|-------------------|
| Missing `AI_GATEWAY_API_KEY` / OIDC | Gateway helpers and proxies fail closed with clear error; Intelligence Gate may failover to BYOK providers if keys exist |
| Invalid / retired model ID | Upstream 4xx from gateway; operator updates env or `lib/models.ts` |
| JSON structured output | Prefer `generateGatewayObject` + Zod schema; avoid ad-hoc `dangerouslySetInnerHTML` for model HTML |
| Streaming | Not in v1 of helpers (`stream: false` still dominant in `aiGatewayCompat`); follow-up PR |
| Base UI vs AI Elements | Keep Base UI; Radix required only if adopting AI Elements |

## Verification status (2026-07-29)

**Story**: Operator/engineer configures AI Gateway models and calls text generation via AI SDK helpers, flowing from env → `modelFor` → gateway → response.

| Boundary | Status | Evidence |
|----------|--------|----------|
| Catalog resolves | ✅ | `npx tsx` prints role → model map matching `GATEWAY_DEFAULT_MODELS` |
| IDs exist on gateway | ✅ | Live `GET /v1/models` returned `present: true` for all five defaults |
| Lint / build | ✅ | `npm run lint`, `npm run build:vercel` passed on branch |
| Env present | ❌ | No `.env.local`; no `AI_GATEWAY_API_KEY` in this agent environment |
| Live `generateText` | ❌ | Blocked by missing key — first broken runtime boundary |
| Helper used by a route | ❌ | `generateGatewayText` has zero production call sites yet |
| UI E2E / browser | ⏸ | Not run — no usable gateway key; stop at env boundary |

### Issues found

1. **Missing runtime gateway credential** → Copy `.env.example` to `.env.local` and set `AI_GATEWAY_API_KEY`, or `vercel link` + `vercel env pull`.
2. **Helpers unused** → Wire `lib/ai/generate.ts` into one server route (e.g. a small `/api/mimi/gateway-ping` or migrate one existing synthesis path) before claiming full adoption.
3. **ChatPRD sync** → Authenticate ChatPRD in Cursor desktop, then re-run `/write-prd` to push this doc.

## Open questions

1. Should funded-gateway credit charging wrap `generateGatewayText` the same way as `api/proxy/ai-gateway.ts`?
2. Which call site should be the first production consumer of the AI SDK helpers (Scribe, Tailor dossier, Studio)?
3. Do we want a product UI model picker using `GATEWAY_MODEL_OPTIONS`, or keep overrides env-only for now?
4. Is `@cursor/sdk` (Cursor Agent automation) in scope for a follow-up PRD, or never for this product?

## Success metrics

- Zero new hardcoded provider model strings in PRs touching AI (lint/review checklist).
- At least one production path uses `lib/ai/generate.ts` with gateway billing intact.
- Gateway default IDs re-verified against `/v1/models` when bumping models.
