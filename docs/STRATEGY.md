# Mimi Studio — Strategy

**Last updated:** 2026-08-04  
**Horizon:** Q3 2026 (Aug–Oct)

## Positioning

Mimi is a **creator operating system for taste** — not a generic chatbot, not an automatic identity generator, and not a print shop.

We sell **explainable creative knowledge**: what was captured, what was inferred, what the creator approved, and what shaped each artifact. The **Taste Graph** is the product substrate; zines, dossiers, Dolls, Rip cards, and brand kits are **projections** of approved evidence.

**Parent platform:** `mimizine.app` / `mimi.you` — auth, Tailor, Studio, Press, billing, infrastructure.  
**Public faces:** `mimi.fish` (share/attention plates), `mimi.rip` (inverse public skin).

## Current wedge (Q3 2026)

Ship and harden the **evidence-first core loop** on owned infrastructure:

```text
Scribe (capture) → Tailor (interpret/approve) → Studio (compose)
  → The Edit (editorial compile) → The Press (export + sovereign publish)
  → Stand / Floor (discovery)
```

Parallel bets that support the wedge (not separate products):

| Bet | Why now |
| --- | --- |
| **Sovereign data plane** | Survive Firestore quota; own Floor/Mine/search/SSE |
| **Scry evidence lanes** | Honest archive / web / reading / shadow retrieval |
| **AI Gateway + embeddings** | One provenance-aware model path; reindex contract |
| **House style v2 + Studio OS shells** | One composition, quiet public faces, mobile discipline |
| **Residue + Observatory slice** | Collective perception as optional lens — labeled, consented |

North-star demo: **Scribe → Used Context → zine → Edit compile → Press export → public `/s/:id` with OG**.

## What we are explicitly NOT building this quarter

These are **out of scope** unless product direction explicitly reverses them (see `docs/DECISIONS.md`).

### Product / UX

- A **feed-first social network** or permanent multi-chamber tab bar
- **Automatic identity assignment** (Doll/mascot) without Tailor evidence and approval
- **Collective aggregates silently becoming personal Taste Graph** (Observatory → Taste Graph pipeline)
- **Generic chat-as-product** without durable typed objects and Used Context
- **Costumed metrics** — fake trends, random drift scores, or undisclosed demo data presented as live
- **Full Doll scenario projection** (GAZE / SPARK WITH) — deferred per `prd/doll-staple-shell.md`
- **Rip as diagnosis** or silent profile rewrite

### Architecture / infra

- **Memory Atoms / Context Runs on Sovereign Postgres** — Firestore remains canonical for private knowledge until auth + tombstone parity exists
- **Sovereign as silent second source of truth** for private atoms
- **Unified Scry retrieval monolith** — lanes stay distinct for now
- **New top-level Edit routes** — Signal / Issue / Forecast panels stay under `/the-edit`
- **Sidereal zodiac / quadrant house systems** in Celestial Calibration
- **Full Shopify autopilot commerce** — Atelier pins taste objects; Thimble frames sourcing; no end-to-end storefront replacement

### Aesthetic anti-goals

- Purple glow / cream lifestyle reskin on public plates
- Dashboard soup at chamber entry (KPI grids over one thesis + one CTA)
- Readable `MIMI` wordmark via CSS uppercase

## Success signals (Q3)

- Core loop completable on mobile without P0 chrome violations (`npm run review:mobile`)
- Public share routes (`/s/:id`, `/u/:handle`) serve correct OG from server HTML
- Sovereign Floor/Mine usable when configured; honest offline/empty states elsewhere
- Demonstration fixtures always labeled; live collective paths gated on Proscenium consent
- `docs/STATE.md` reflects shipped vs partial vs stub modules after each architectural change

## Related docs

- [`docs/mimi-system-architecture.md`](./mimi-system-architecture.md) — canonical domains, objects, engines
- [`docs/architecture-update-21.md`](./architecture-update-21.md) — recent ownership & embedding decisions
- [`lib/productCanon.ts`](../lib/productCanon.ts) — chamber registry
- [`README.md`](../README.md) — runbook and technology summary
