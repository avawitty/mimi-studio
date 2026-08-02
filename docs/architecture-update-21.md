# Architecture Update 21 — Decisions on Update 20 Open Questions

**Change classification:** architecture decision record (closes Update 20 §16)  
**Date:** 2026-08-02  
**Parent:** [Architecture Update 20](./architecture-update-20.md), [Mimi System Architecture](./mimi-system-architecture.md)

These are the accepted answers. Implementation lands incrementally; status notes mark what is encoded in this change set versus deferred.

---

## Decisions

### 1. Firestore vs Sovereign ownership

| Plane | Owns |
| --- | --- |
| **Firebase Auth** | Identity (UID, session cookie) |
| **Firestore** | Memory Atoms, Context Runs, Tailor/Shadow source records, billing/entitlement mirrors, private prefs, transmissions, and other private canonical state |
| **Sovereign** | Public publication projections: Floor cards, Mine public shelf, feeds, OG, hybrid search vectors, Pocket **mirrors** for resilience |
| **IndexedDB** | Ghost/anonymous working set; local merge buffer for registered users |

**Rule:** Sovereign is not a silent second source of truth for private knowledge. Firestore remains required for private atoms until a private Sovereign auth model exists.

**Encoded:** documented in living architecture + `docs/sovereign-archive.md`.

### 2. What kind of store is Sovereign?

**Accepted:** gradually expanding **hybrid** — today primarily a publication/discovery/resilience projection; not a complete application store.

### 3. Memory Atoms / Context Runs on Sovereign Postgres?

**Accepted for now: no.** Keep on Firestore. Revisit only with private-read auth, deletion tombstones, and atom schema parity.

### 4. Scry archive retrieval source

**Accepted:**

- Public archive lane → Sovereign first when ready, else Firestore fallback  
- Personal reading / Pocket → local + Firestore (and Pocket sovereign mirror when online)  
- Shadow lane → Shadow Memory (Firestore-backed), never padded from public Floor  
- Unified retrieval service → proposed later; not required for honesty

### 5–6. Shared embedding compatibility + versioning

**Accepted:** one shared `EmbeddingSpaceId` / audit contract (`provider`, executed `model`, `dims`, `schemaVersion`). Cosine only inside matching spaces. Model changes version by executed model id + dims; reindex is explicit and UID-gated for personal vectors; Sovereign reindex is ops/ingest-keyed.

**Encoded:** `schemas/embeddingContracts.ts` + Shadow audit mapping.

### 7. The Edit — Signal vs Issue

**Accepted:** one chamber `/the-edit` with three panels:

1. **Signal** — interpretive governance (Used Context → thesis → Press)  
2. **Issue** — spread composition / visual plates  
3. **Forecast** — commerce intelligence (secondary)

Default panel: **Signal**. No new top-level routes yet.

**Encoded:** `TheEditChamber` panel split.

### 8. Observatory → Taste Graph?

**Accepted: no.** Observatory remains collective cultural context only. Personal Taste Graph requires individual approval; aggregate stats must not silently become personal taste.

### 9. Consent revoke after contribution

**Accepted:**

- Unpublish / withdraw → stop **future** live-window contribution  
- Persist `mmmContributionStatus: "withdrawn"` + `mmmWithdrawnAt`  
- Live aggregation must exclude withdrawn + require disclosure-version match  
- Already-published / frozen reports may retain anonymized aggregates (disclosed at contribute time)  
- No promise of scrubbing historical frozen windows

**Encoded:** consent helpers + eligibility gate + verify:collective.

### 10. Mean Median Mode display identity

**Accepted:** keep technical name **Mean Median Mode** in canon/nav; Observatory chamber subtitle may say **Present Atmosphere**. Do not rename the module id.

### 11. Residue live acquisition coverage

**Accepted:** reuse Scry-style lane honesty — `available | empty | partial | failed | unavailable`. Offline engine success with failed Apify enrichment is **partial**, not complete.

### 12. Apify sources as Source Objects?

**Accepted:** summarize into the Residue run by default; persist durable **Source Object refs** (URL/title/rights) when the creator keeps the run. Do not store raw Apify payloads as Source Objects.

### 13–14. Mobile chamber grammar

**Accepted as design-system rules** (checklist-enforced now; tooling later):

- One chamber title; no duplicate wordmarks  
- Compact mode nav; primary promise first  
- Context only when needed  
- Experimental rendering in named lab tabs (Dolls Shader Lab pattern)

### 15. Pocket delete across planes

**Accepted:**

1. Local delete is authoritative for UI when intentional  
2. Emit delete intent; best-effort Firestore + Sovereign  
3. Storage read failure ≠ empty ≠ deleted  
4. Identity change cancels in-flight merges  
5. Tombstone / seen-id hardening stays; full cross-plane tombstone store is next hardening step

### 16. Anonymous Pocket migration after account creation

**Accepted:**

- Firebase anonymous **link** (same UID) → data continues; no copy job  
- Speed Ghost / new UID → **no automatic migrate** (avoid writing one user’s local coat into another closet). Explicit “Bring local Pocket” opt-in is future work.

### 17. Stand vs Floor vs Mine vs The Press

| Surface | Meaning |
| --- | --- |
| **The Stand** | Chamber shell for published work browsing |
| **Floor** | Community public shelf (Sovereign-first) |
| **Mine** | Creator’s own issues / shelf |
| **The Press** | Export, packaging, and publication handoff — not a browse shelf |

### 18–19. Serverless static graphs + CI

**Accepted:** remaining static heavy imports are debt; dynamic-import invariant becomes CI. Immediate fix targets: Apify in you-search path. Stripe/Admin graphs continue lazy-load migration.

**Encoded:** `npm run verify:api-lazy-graphs` + CI step; Apify client lazy-loaded.

### 20. Product Canon Registry statuses

**Accepted:** chamber modules already `live` where vertical slices exist; infrastructure tracked in `CANON_INFRASTRUCTURE` with `live | hardening | proposed`. Update 21 marks embedding contract + lazy-graphs as hardening→live where encoded.

---

## Still deferred (implementation, not decision)

- Cross-plane Pocket tombstone store with retry queue  
- Explicit “Bring local Pocket” after Speed Ghost upgrade  
- Extract Issue panel deep-linking (`?panel=`)  
- Neon pgvector at catalog scale  
- Full CI GET-smoke per serverless route  
