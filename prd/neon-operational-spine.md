# PRD: Neon operational spine

Status: Implementation in progress  
Decision record: `docs/adr-001-neon-operational-database.md`

## Objective

Establish one trustworthy server-side path for AI execution, credits,
entitlements, persistence, provenance, and memory approval while preserving
Mimi's chamber-specific experiences.

The creator loop remains:

> Collect → Read → Approve → Apply → Save

## Product rules

1. AI proposes; it does not approve personal memory.
2. Only an explicit creator command creates an active memory atom.
3. Saved interpretations retain source, prompt, run, and approval provenance.
4. The server decides access, memberships, and credits.
5. Every costly durable action has an idempotency key.
6. "Saved" is shown only after a durable write succeeds.

## Architecture constraints

- Neon Postgres is the canonical relational database.
- Drizzle owns typed schema and migrations.
- Firebase Authentication remains Mimi identity.
- React chambers call application APIs and never connect to Neon.
- Repository interfaces remain database-neutral.
- Neon implementation stays under `infrastructure/database/neon/`.
- Binary assets use separate object storage.
- No Supabase product, SDK, RPC, auth, storage, or service-role assumption is
  allowed.

## Canonical plans

`free | trial | creator | studio | team`

Legacy labels are mapped at the billing boundary. They are not persisted as new
canonical plan values.

## First vertical slice

Operation: `scribe.propose-atoms`

### Request

`POST /api/ai/operations/scribe.propose-atoms`

- Authenticated Mimi/Firebase session.
- UUID `Idempotency-Key`.
- Question, project scope, and bounded context items.

### Success

- One workflow run.
- One AI run with one or more provider attempts.
- One source snapshot/reference.
- One active credit reservation, finalized exactly once.
- Structured evidence, inferences, and recommendations.
- Inferences persisted as unapproved proposals.
- Charge/release summary and provenance returned to Scribe.

### Approval

`POST /api/memory/proposals/approve`

- Verifies proposal ownership.
- Creates atoms and approval provenance in one transaction.
- Replayed idempotency keys return the existing atoms.

## Acceptance criteria

- [x] Operation registry uses stable capability IDs, not model IDs.
- [x] Routing resolves models through `modelFor(..., "gateway")`.
- [x] Provider output is validated before persistence.
- [x] Credit reserve/commit/release uses serializable transactions and row locks.
- [x] Ledger rows are append-only.
- [x] Account balances cannot become negative.
- [x] New Scribe generation runs server-side through AI Gateway.
- [x] New Scribe memory remains proposal-first.
- [x] Credit and memory mutations are repository methods.
- [x] Stripe events have a Neon idempotency path.
- [x] Stripe checkout does not duplicate invoice period grants.
- [x] Expired reservations have a row-locked sweeper and replay recovery path.
- [x] A rollback-only live Neon transaction suite covers reserve/commit/replay.
- [x] Images and large output bodies are not stored in credit or telemetry rows.
- [ ] Existing Firestore balances are backfilled and reconciled.
- [ ] All chamber families use registered operations.
- [ ] Legacy writes are disabled.
- [ ] Neon preview-branch transaction tests run in CI.
- [x] The reservation sweeper is configured as an authenticated Vercel Cron.
- [ ] Membership, cost, and orphan reconciliation jobs are deployed.
- [ ] Operational dashboards and alerts are live.

## Test mapping

| Requirement | Test |
| --- | --- |
| Reservation cannot overspend | `__tests__/creditInvariants.test.ts` |
| Commit/release terminal states | `__tests__/creditInvariants.test.ts` |
| Operation schema and prompt policy | `__tests__/operationRegistry.test.ts` |
| Gateway error normalization | `__tests__/gatewayNormalization.test.ts` |
| Schema, uniqueness, ledger immutability, row locks | `__tests__/neonOperationalSchema.test.ts` |
| End-to-end contract without provider/database secrets | `npm run verify:operational-spine` |

## Rollout

1. Apply Drizzle migration to an isolated Neon branch.
2. Seed/reconcile test memberships and credits.
3. Verify Scribe free, insufficient-credit, provider-failure, replay, and
   approval paths.
4. Shadow membership and credit projections against legacy records.
5. Promote the Neon branch only after reconciliation is clean.
6. Migrate chamber families incrementally.
7. Remove legacy writes after a tested rollback window.
