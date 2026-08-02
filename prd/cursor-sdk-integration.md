# PRD: Cursor SDK (`@cursor/sdk`) Integration

**Status**: Draft (local)  
**Branch**: `me-cursor-sdk-ba71`  
**Scope**: Tooling / automation — not product LLM inference (that stays on Vercel AI Gateway)

---

## Problem statement

Mimi Studio already has product AI (gateway + provider failover). The team also needs **programmatic Cursor agents** for repo tasks: one-shot local prompts against the checkout, and optional cloud PR review runs that outlive a laptop process.

`@cursor/sdk` is the supported TypeScript surface for that. It must stay separate from `AI_GATEWAY_API_KEY` / `lib/ai/generate.ts` so product billing and agent automation credentials do not mix.

## Goals

1. Install `@cursor/sdk` and expose two scripts: local prompt + cloud review.
2. Document `CURSOR_API_KEY` (and optional model override) in `.env.example`.
3. Use SDK best practices: explicit runtime (`local` vs `cloud`), dispose/`Agent.prompt`, distinguish startup vs run failures, exit codes suitable for CI.
4. Keep ambient `settingSources` off by default for scripts.

## Non-goals

- Replacing Vercel AI Gateway or `services/aiProvider.ts` with Cursor agents for end-user generation.
- Shipping a GitHub Action workflow in this PR (script only; CI wiring is follow-up).
- Canvas / dashboard UI for agent runs.

## User stories

### US-1 — Engineer runs a local agent against the repo
**As** an engineer  
**I want** `npm run cursor:prompt -- "<task>"`  
**So that** I can automate one-shot repo analysis without the IDE.

**Acceptance**
- [x] `scripts/cursorAgentPrompt.ts` uses `Agent.prompt` + `local: { cwd }`
- [x] Missing `CURSOR_API_KEY` exits `1` with a clear message
- [x] Run failure (`result.status === "error"`) exits `2`
- [x] `CursorAgentError` with `isRetryable` exits `75`, else `1`

### US-2 — CI/automation can review a PR ref in the cloud
**As** a maintainer  
**I want** `npm run cursor:cloud-review` with `REPO_URL` / `HEAD_REF`  
**So that** a cloud agent can review a branch without my laptop staying online.

**Acceptance**
- [x] `scripts/cursorCloudReview.ts` uses `Agent.create` + `cloud.repos` + `skipReviewerRequest: true`
- [x] Logs `agentId` and `run.id` before waiting
- [x] Guards `run.supports("stream")` before streaming
- [ ] Live cloud run verified (needs `CURSOR_API_KEY` + GitHub-connected account — not available in this agent env)

## Technical context

| Piece | Path |
|-------|------|
| Dependency | `@cursor/sdk` in `package.json` |
| Local one-shot | `scripts/cursorAgentPrompt.ts` |
| Cloud review | `scripts/cursorCloudReview.ts` |
| npm scripts | `cursor:prompt`, `cursor:cloud-review` |
| Env | `CURSOR_API_KEY`, optional `CURSOR_SDK_MODEL` (default `composer-2`) |

**Runtime choice**
- Local: already-checked-out repo, fast, no PR.
- Cloud: needs GitHub URL + key with repo access; can open/review PRs.

**Credential boundary**
- `CURSOR_API_KEY` → Cursor agents only
- `AI_GATEWAY_API_KEY` → product inference only (`lib/aiGatewayCompat.ts`, `lib/ai/generate.ts`)

## Edge cases

| Case | Behavior |
|------|----------|
| No API key | Exit 1, no agent created |
| Startup auth/network failure | `CursorAgentError`, exit 1 or 75 |
| Agent started but run errored | Exit 2 |
| Cloud without GitHub connection | Startup error from cloud (`ERROR_GITHUB_NO_USER_CREDENTIALS`) — fix env, not code |
| Resume later | Not in v1 scripts; use `Agent.resume` in a follow-up if scheduled triage is needed |

## Follow-up shipped: bot comment autofix

- Skill: `.cursor/skills/fix-bot-pr-comments/SKILL.md`
- Script: `npm run cursor:fix-bot-comments` → `scripts/cursorFixBotComments.ts`
- GitHub Action: `.github/workflows/fix-bot-pr-comments.yml` (needs `CURSOR_API_KEY`)
- Cursor Automation recipe: `docs/automations/fix-bot-pr-comments.md`

## Open questions

1. Should `cursor:cloud-review` become a GitHub Action on `pull_request`?
2. Should local prompts load project rules via `settingSources: ["project"]`?
3. Do we need MCP injection (GitHub/Linear) for review scripts?

## Success metrics

- Scripts run without leaking product gateway keys.
- CI can distinguish startup vs run failure via exit codes.
- No product request path imports `@cursor/sdk`.
