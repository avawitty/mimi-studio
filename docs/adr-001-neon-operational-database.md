# ADR 001: Neon is Mimi's canonical relational database

Status: Accepted  
Date: 2026-08-02

## Decision

Neon Postgres is the canonical relational database for Mimi's operational state.
The application uses:

- Drizzle ORM for typed schema and migrations.
- `@neondatabase/serverless` over HTTP for ordinary serverless queries.
- `@neondatabase/serverless` `Pool` over WebSockets for interactive
  transactions, `SELECT ... FOR UPDATE`, and serializable money mutations.
- Firebase Authentication as the existing Mimi identity provider.
- Server-side authorization before every relational read or write.
- Separate object storage for images, uploads, generated plates, video, and
  large exports. Postgres stores ownership and object references, not large
  binaries.

Database-neutral repository contracts live under `domain/`. Neon and Drizzle
implementation details live only under `infrastructure/database/neon/`.
React chambers call authenticated APIs; they never connect to Neon.

## Context

The prior architecture split private canonical state into Firestore and public
publication state into a SQLite/Postgres "Sovereign" archive. Credits were
stored as mutable fields in several Firestore documents. AI access followed a
check-then-charge flow with no reservation, row lock, immutable ledger, or
cross-request idempotency guarantee.

That model cannot safely support concurrent credit spending, reliable Stripe
reconciliation, or one auditable workflow/provenance chain per AI action.

## Canonical ownership

| Concern | Canonical source |
| --- | --- |
| Authentication identity | Firebase Authentication |
| Workspace access | Neon membership records |
| Paid plan | Neon membership record |
| Effective entitlement | Server entitlement service |
| Spendable credits | Neon credit account + immutable ledger |
| AI execution | Neon workflow, AI run, and provider attempts |
| Proposed memory | Neon `memory_proposals` |
| Approved memory | Neon `memory_atoms` |
| Provenance | Neon sources and provenance edges |
| Binary assets | Object storage, referenced by Neon records |
| Stripe processing | Neon event claim + membership reconciliation |

Firestore and the existing Sovereign archive are legacy sources during
controlled migration. They may be read for compatibility and backfill, but new
operational writes must target Neon. Local state may cache display data; it
must not authorize access, mint credits, or approve memory.

## Transaction boundary

Reservations, commits, releases, grants, membership updates, Stripe event
claims, and memory approvals run through repository methods inside a
`UnitOfWork` transaction.

Credit transactions:

1. Begin a serializable transaction.
2. Lock the credit account and reservation rows.
3. Validate available and reserved projections.
4. Append immutable ledger entries.
5. Update grant buckets and balance projections.
6. Commit.

The ledger trigger rejects updates and deletes. A reservation can be committed
once or released once. Provider fallback attempts remain attached to one AI
run and one reservation.

## Authorization and RLS

The API verifies the existing Mimi/Firebase session and checks ownership or
workspace membership server-side. Postgres RLS is optional defense in depth,
not the primary authorization mechanism. Direct browser database access is
prohibited, so this phase does not depend on a Supabase-style JWT/RLS client
flow or a service-role credential.

## Explicit exclusions

This decision does not introduce:

- Supabase Auth.
- Supabase Storage.
- A Supabase client SDK.
- Supabase RPC functions.
- Supabase service-role assumptions.
- Neon Auth as a second identity system.
- Client-side Neon access.

## Consequences

- `DATABASE_URL` is required for operational APIs and migrations.
- A pooled Neon URL is preferred for interactive transactions.
- The app remains navigable without database credentials; operational endpoints
  fail closed with a server error rather than silently minting or spending.
- Legacy Firestore and Sovereign data require an explicit mapping/backfill and
  reconciliation report before old writes are removed.
- Schema changes are generated and applied with Drizzle Kit.
