# Neon operational spine: phase 0 audit

Date: 2026-08-02  
Scope: billing, credits, memberships, AI execution, persistence, storage, and
identity boundaries

No destructive cleanup is part of this audit.

## Inventory

| Existing item | Evidence | Classification | Migration note |
| --- | --- | --- | --- |
| Firebase Authentication and `__session` | `lib/serverFirebaseAdmin.ts`, `services/authSession.ts` | keep | Existing Mimi identity provider; Neon profiles use Firebase UID text keys. |
| Firestore memory writes | `services/memoryService.ts` | migrate | New Scribe proposals and approvals write through server repositories. Legacy reads remain during backfill. |
| Firestore membership mirrors | `lib/stripeMembership.ts` | migrate | Neon membership records become canonical when `DATABASE_URL` is configured. |
| Mutable Firestore credit fields | `lib/mimiFundedGateway.ts` | replace | Replace with reserve/commit/release and immutable Neon ledger. |
| Firestore `mimi_usage_events` | `lib/mimiFundedGateway.ts` | migrate | AI runs and provider attempts replace ad hoc usage events. |
| Client trial-credit mutation | `contexts/UserContext.tsx` | replace | Must become display-only after all funded operations move to the new API. |
| Stripe webhook signature verification | `api/stripe-webhook.ts` | keep | Valid events route to Neon reconciliation when configured. |
| Firestore Stripe webhook idempotency | `api/stripe-webhook.ts` | archive after verification | Neon `stripe_webhook_events` is canonical for the new path. |
| Vercel AI Gateway helpers | `lib/ai/generate.ts` | keep | Operation gateway uses role-based model resolution and structured output. |
| Client Gemini Scribe generation | `services/scribeService.ts` | replace | Replaced by `scribe.propose-atoms` server operation. |
| Other direct provider call sites | `services/geminiService.ts`, provider proxies | migrate | Convert chamber families incrementally; no broad deletion before parity. |
| Sovereign SQLite/Postgres archive | `lib/sovereign/` | migrate | Keep public reads during transition; map records into canonical Neon schemas deliberately. |
| Sovereign `pg` pool | `lib/sovereign/postgresDriver.ts` | archive after verification | New operational code uses the Neon serverless HTTP and WebSocket drivers. |
| IndexedDB ghost working set | `services/localArchive.ts` | keep | Local cache/draft buffer only; never authorization truth. |
| Firebase Storage assets | `services/firebaseUtils.ts` | replace or retain behind storage interface | Binary storage remains separate from Postgres. Provider choice is intentionally independent. |
| Neon Auth probe | `lib/sovereign/neonAuth.ts` | archive | Do not adopt; Firebase Auth remains canonical. |
| Supabase references | architecture handoff text only | delete after verification | No Supabase SDK or runtime implementation exists. |
| Legacy database copy UI | `components/MigrationUtility.tsx` | unknown — requires decision | Preserve until data owners approve a backfill and rollback procedure. |
| Demo/seed Sovereign data | `scripts/seedSovereignDemo.ts` | migrate | Record mappings in `legacy_record_map`; never mix with real accounts silently. |

## Risks confirmed

1. Existing funded AI performs a read/check followed by a later Firestore
   decrement. Concurrent requests can overspend.
2. Credits are duplicated across user, profile, and billing documents, so a
   partial write can drift.
3. A verified user may be soft-allowed without billing when credit
   infrastructure is unavailable.
4. Scribe previously generated structured output through a client Gemini path
   and wrote an approved atom directly, bypassing a durable proposal.
5. Firestore rules and current Stripe plan labels have known compatibility
   drift.
6. Large private prompts and outputs need explicit storage/reference policy;
   routine telemetry must not contain source content.

## Implemented first vertical slice

`Scribe → propose atoms → approve selected memory`

1. Firebase session authenticates the actor.
2. Server resolves membership and `ai.scribe.propose`.
3. A plan grant and credit account are created idempotently when needed.
4. Three credits are reserved under a row lock.
5. One workflow and AI run are created.
6. AI Gateway executes the registered operation with bounded fallback.
7. Zod validates evidence, inference, and recommendation references.
8. Inferences persist as unapproved `memory_proposals`.
9. Actual credits are committed; unused reservation is released.
10. The UI shows charged, released, and remaining credits.
11. A separate authenticated command approves selected proposals and creates
    active memory atoms plus provenance edges in one transaction.

## Remaining migration work

- Backfill user/profile/membership identity maps.
- Reconcile existing Firestore balances into auditable migration grants.
- Migrate remaining AI call sites chamber by chamber.
- Move artifacts, private sources, and approved memory reads to repositories.
- Add a Neon preview-branch transaction test in CI.
- Schedule the implemented reservation sweeper; add orphan, membership, and
  cost reconciliation jobs.
- Add dashboards and alerts.
- Disable legacy writes only after shadow comparison and rollback validation.
