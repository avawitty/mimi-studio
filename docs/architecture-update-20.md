# Architecture Update 20 — Sovereign Data Plane, Evidence Lanes, and Production Hardening

**Change classification:** implementation reconciliation, additive, operational refinement.

**Repository reviewed:** avawitty/mimi-studio  
**Development window:** August 2, 2026  
**Parent living document:** [Mimi System Architecture](./mimi-system-architecture.md)  
**Operational detail:** [Sovereign archive](./sovereign-archive.md)

Today’s code moved several parts of Mimi from architectural proposal into verified implementation. The strongest development is that Mimi now has the beginnings of an owned operational substrate beneath its intelligence chambers:

```text
Creator Experience
        ↓
Canonical Chambers
        ↓
Evidence, Memory, and Artifact Services
        ↓
AI Gateway and Provider Routing
        ↓
Sovereign Data Plane
        ↓
Firebase / Neon / Local Storage / External Providers
```

Mimi is no longer only describing sovereignty as a brand value. The repository now contains concrete mechanisms for surviving provider drift, Firestore quota exhaustion, anonymous use, serverless bundling failures, and embedding-model changes.

---

## 1. Canonical Status Changes

The following modules and capabilities moved from proposed or partial toward implemented status.

| Canonical element | Updated status | Evidence |
| --- | --- | --- |
| Residue Chamber | Implemented vertical slice | Cultural/Emotional modes, offline engine, live Apify acquisition |
| Scry | Implemented with evidence lanes | Archive, web, reading, and shadow lanes |
| Shadow Memory migration | Implemented | Embedding-dimension/model reindex flow |
| Observatory / Mean Median Mode | Implemented vertical slice | Contracts, consent gates, chamber and verification |
| Sovereign archive | Implemented, production-hardening ongoing | SQLite/Postgres drivers, Neon path, search, SSE, exports |
| The Edit spread composition | Implemented | Custom layouts and pre-baked hi-fi plates |
| Mimi Dolls | Implemented shell-first interface | Porcelain shell primary; shader moved to secondary lab |
| AI Gateway embeddings | Implemented | Shared embedding API and metadata handling |
| Scribe mobile redesign | Implemented and polished | Reduced chrome, Guide integration, mobile density fixes |
| Firestore quota resilience | Implemented | Capped reads, local ghost Pocket, listener suppression |
| Paid AI entitlement path | Implemented and security-hardened | Gateway-funded access, Stripe verification, no BYOK nag |

These statuses are grounded in merged repository work, not merely the architecture canon.

---

## 2. New Canonical Infrastructure — Sovereign Data Plane

### Purpose

Provide a Mimi-owned persistence and retrieval layer that reduces dependence on Firestore availability and free-tier limits.

The implemented system supports:

- SQLite for local or durable-host operation
- Postgres as the scalable deployment path
- Neon serverless Postgres on Vercel
- public zines
- profiles
- Pocket records
- user zines
- search
- featured feeds
- RSS and open-graph projections
- Firestore import and export
- live synchronization through server-sent events
- deletion mirroring
- authenticated private reads

### Updated relationship

```text
Publish / Pocket / Floor
        ↓
Sovereign Store API
        ↓
Driver Selection
    ├── Neon Postgres
    ├── Postgres
    └── SQLite
        ↓
Cached and Searchable Projections
```

Firestore remains present, but it is no longer required to serve every public shelf interaction.

### Canonical rule

```text
Firebase
    =
identity, selected canonical state, and compatibility
Sovereign archive
    =
owned publication, discovery, and resilience data plane
```

The implementation documentation currently recommends retaining Firebase rather than attempting an abrupt replacement. See [sovereign-archive.md](./sovereign-archive.md).

---

## 3. New Shared Service — Sovereign Search

The owned archive now supports hybrid search using:

- keyword matching
- AI Gateway embeddings
- cosine similarity
- write-time public card projections
- model and dimension metadata

```text
Published Zine
        ↓
Text Projection
        ↓
Gateway Embedding
        ↓
Sovereign Vector Storage
        ↓
Keyword + Semantic Ranking
        ↓
Floor Search Results
```

A reindex route and command were added for existing archive material. This confirms that the Sovereign Data Plane is not merely a backup database — it is developing into a first-class discovery substrate.

---

## 4. Scry Architecture Reconciliation

Scry is now concretely represented through typed evidence lanes:

```text
Scry Query
    ├── Archive Lane
    ├── Web Lane
    ├── Reading Lane
    └── Shadow Lane
            ↓
      Coverage Assessment
            ↓
      Narrative Synthesis
```

Each lane may be: `available`, `empty`, `partial`, `failed`, or `unavailable`.

### Implemented integrity rules

- An empty lane is not labeled complete.
- A missing personal-memory result is reported as empty rather than partial.
- Search does not pad results with unrelated archive specimens.
- Unsafe result URLs are rejected.
- Narrative synthesis routes through AI Gateway.
- Gemini search grounding remains available where tool grounding is required.
- One malformed provider payload should not crash the complete run.

This is a direct implementation of Interpretation Integrity:

```text
No evidence
    ≠
successful evidence retrieval
```

---

## 5. Shadow Memory Migration Contract

Embedding compatibility is now first-class state. The repository detects when stored Shadow Memory vectors no longer match the current embedding system.

Compatibility checks include:

- vector dimensions
- embedding model identifiers
- whether source text exists for re-embedding
- authentication eligibility
- request races and cancellation
- whether a failed migration should remain marked unresolved

```text
Shadow Document
        ↓
Embedding Audit
        ├── compatible
        ├── incompatible_reindexable
        └── incompatible_not_reindexable
                    ↓
             Creator Reindex Action
                    ↓
             Gateway Embedding Space
```

### Security rule

Bulk Shadow Memory operations require a real Firebase UID. Shared ghost identities cannot sync, delete, search, reindex, or persist full embedding source text.

---

## 6. Embedding Service Reconciliation — AI Gateway Embeddings

Embedding creation is now a first-class Gateway capability shared across Scry, Taste systems, Shadow Memory, and Sovereign search.

### Implemented metadata

The pipeline preserves:

- actual model used
- embedding dimensions
- provider remapping
- credit cost
- compatibility during clustering

### Safety and math constraints

- Vectors with different dimensions are not compared.
- Clustering partitions by vector width.
- Clusters require a minimum viable member count.
- Zero-cost internal embeddings do not spend membership credits.
- The stored model reflects the executed model rather than only the requested model.

---

## 7. Residue Engine Status Update

Residue is now a canonical chamber containing:

- Cultural Residue mode
- Emotional Residue mode
- safety framing
- report output
- mean/median/mode output
- derivative outputs
- offline-first execution
- optional live source acquisition

```text
Residue Request
        ↓
Offline Engine by Default
        ↓ optional
Authenticated Server Acquisition
        ↓
Apify Source Provider
```

The browser-safe engine remains independent of Node-only provider modules. Apify is token-gated, loaded lazily, invoked through the server route, injectable for verification, and unavailable to unsigned live runs.

```text
Residue Core
    =
browser-safe and offline-capable
Live Acquisition
    =
server-side optional enrichment
```

---

## 8. New Canonical Chamber — Observatory / Mean Median Mode

Mean Median Mode now exists as a distinct collective-intelligence chamber rather than a generic statistical label inside Residue.

### Purpose

Show central-tendency patterns across consenting public contributions.

### Implemented components

- typed `CentralTendencyProfile` contracts
- windowed mean, median, and mode calculations
- insufficient-evidence states
- contributor-diversity thresholds
- consent controls in Proscenium publishing
- disclosure-version checks
- opaque contributor keys
- dedicated verification script
- canon and navigation disambiguation from per-run Residue metrics

```text
Creator Publishes Zine
        ↓
Proscenium Disclosure
        ↓
Explicit Collective-Contribution Consent
        ↓
Eligibility Check
        ↓
Signal Extraction
        ↓
Observatory Aggregation
```

A public artifact alone is not sufficient permission to contribute to collective intelligence.

---

## 9. The Edit Implementation Update

The Edit gained two meaningful implementation responsibilities.

### Hi-fi plate baking

High-fidelity cover and visual plates are generated before the issue is saved so the reveal can open with finished assets.

Constraints include:

- soft failure per plate
- a maximum bake count
- no unsafe data-URL persistence into Firestore
- bounded provider-cost amplification

### In-chamber spread composition

The Edit can now open issue spreads, arrange custom layouts, save composition metadata, persist locally when Firebase authentication is unavailable, and correctly report failed or skipped persistence.

### Revised role

```text
The Edit
    =
Interpretive Governance
        +
Artifact Composition Governance
```

This requires a canon decision about whether The Edit is:

1. one chamber governing all approval and assembly, or
2. one named interface containing separate Signal Edit and Issue Edit workflows.

---

## 10. Mobile Chamber Grammar

Today’s work reinforces a shared mobile composition rule:

```text
One canonical chamber title
        ↓
Compact mode navigation
        ↓
Primary task surface
        ↓
Context only when needed
```

| Chamber | Implemented mobile grammar |
| --- | --- |
| Scribe | Removal of redundant mobile titles; Guide in mode bar; tighter Library strip; corrected Retrieve empty-state; CSS-level hiding to prevent first-paint flashes |
| Scry | One continuous dark mobile surface; no duplicate wordmarks/mastheads; query-led first viewport; quieter lane status; Guide in mobile tabs |
| Mimi Dolls | Porcelain shell as default chamber plate; clear Tailor action when empty; realtime shader in secondary Shader Lab tab |

Architecture rule confirmed: a canonical chamber may contain several capabilities, but mobile should reveal the primary promise first.

---

## 11. Anonymous and Registered State Architecture

Anonymous / ghost state and registered state require related but distinct persistence paths.

| State | Uses |
| --- | --- |
| Anonymous / Ghost | IndexedDB; local Pocket events; no Firestore Pocket listener; no anonymous billing listener; local hydration and reconciliation |
| Registered | Account-scoped cloud state; local merge support; real UID for Shadow Memory; cloud listeners where appropriate; Sovereign same-origin/session authentication where supported |

### Identity transition rule

In-flight reads and synchronization operations must be cancelled or invalidated when identity changes. This applies to Floor, Pocket, Shadow Memory, subscriptions, and profile reconciliation.

### Delete integrity

A missing IndexedDB result caused by a storage error must not be interpreted as intentional deletion.

```text
Storage read failure
    ≠
empty local collection
    ≠
creator deleted everything
```

---

## 12. AI Gateway and Entitlement Boundary

Paid or Lab access now routes Gemini-shaped model requests through the funded AI Gateway rather than prompting users to provide personal API keys.

```text
Creator Request
        ↓
Authenticated Session
        ↓
Trusted Entitlement Check
        ↓
Membership Credit Grant
        ↓
AI Gateway
        ↓
Provider Adapter
```

### Security hardening

Entitlement decisions require trusted server-side evidence, including live Stripe verification where appropriate. Client-writable fields cannot authorize paid plan elevation, credit minting, patron activation, or subscription ownership. Promo redemption is server-side and idempotent.

### Product decision confirmed

```text
Funded Mimi plan
    =
Mimi-managed AI access
Sovereign personal key
    =
optional separate mode, not a recovery prompt for paid Gateway failure
```

---

## 13. Serverless Module Boundary

Several production failures shared one architectural cause: Node-heavy dependency graphs were being evaluated at serverless module load, before a route could validate the request or choose the relevant execution path.

Affected graphs included Firebase Admin, Stripe, creative-dossier prompts, Gemini service, Apify, SQLite, and JSON applet configuration.

### New runtime rule

```text
Serverless Entry
        ↓
Cheap request and environment checks
        ↓
Dynamic import of required graph
        ↓
Execution
```

Providers, database drivers, and privileged services should be loaded only when the active route requires them.

### Confirmed benefit

- Health routes remain available.
- GET availability checks do not load Node-only acquisition graphs.
- Neon execution does not evaluate SQLite.
- API routes can reach method guards before privileged initialization.
- One optional subsystem cannot crash the complete serverless isolate.

---

## 14. Updated Platform Relationship Map

```text
Creator
    ↓
Chamber Interface
    ├── Scribe
    ├── Scry
    ├── Residue
    ├── Observatory
    ├── The Edit
    └── Mimi Dolls
            ↓
Canonical Domain Services
    ├── Evidence Lanes
    ├── Residue Engines
    ├── Collective Statistics
    ├── Spread Composition
    ├── Shadow Memory
    └── Pocket Reconciliation
            ↓
Shared Intelligence Infrastructure
    ├── AI Gateway
    ├── Gateway Embeddings
    ├── Provider Adapters
    ├── Model Provenance
    └── Entitlement Verification
            ↓
Persistence and Delivery
    ├── Sovereign Postgres / Neon
    ├── SQLite
    ├── Firestore
    ├── IndexedDB
    ├── SSE
    └── Vercel Functions
```

---

## 15. Architecture Decisions

### Accepted and implemented

- Sovereign archive is a first-class owned data plane.
- Firestore remains integrated but should not carry every public read.
- Neon Postgres is the preferred Vercel sovereign path.
- SQLite remains valuable for local and durable-host execution.
- Scry uses explicit evidence lanes with honest coverage states.
- Shadow Memory compatibility includes both embedding dimension and model identity.
- Reindexing requires authenticated user ownership.
- AI Gateway embeddings are shared infrastructure.
- Residue has Cultural and Emotional modes in one canonical chamber.
- Residue remains offline-first with optional live acquisition.
- Observatory is distinct from Residue and requires publishing consent.
- Public status alone does not authorize collective signal contribution.
- Funded plans use Mimi-managed Gateway access rather than BYOK prompts.
- Anonymous users should avoid unnecessary Firestore listeners.
- Identity changes must cancel or invalidate stale data operations.
- Serverless routes should dynamically load heavy or optional graphs.
- Mobile chambers should remove duplicate chrome and foreground the primary promise.

### Accepted but requiring further canon reconciliation

- The Edit now includes both signal governance and spread composition.
- Sovereign search is becoming a discovery engine rather than only a fallback.
- Floor, Mine, public feeds, and Pocket may increasingly use the Sovereign plane.
- Scry and Sovereign search now share parts of the Gateway embedding infrastructure.
- Mimi Dolls is shell-first, with shader behavior treated as a secondary lab mode.

### Still proposed

- Moving additional canonical data away from Firestore.
- Using Sovereign Postgres for private Memory Atoms.
- A unified search service spanning Scry, Sovereign Floor, Pocket, and Taste Graph.
- Automatic embedding migrations across all vector-bearing objects.
- A shared mobile chamber-shell contract enforced through tooling.

---

## 16. Open Questions

> **Resolved in [Architecture Update 21](./architecture-update-21.md).** The list below is retained for history; treat Update 21 as the decision source.

1. Which objects remain canonically owned by Firestore, and which should migrate to the Sovereign Data Plane?
2. Is the Sovereign archive a publication projection, a complete application store, or a gradually expanding hybrid?
3. Should Memory Atoms and Context Runs ever be stored in Sovereign Postgres?
4. Should Scry archive retrieval query Firestore, Sovereign storage, or a unified retrieval service?
5. Should all embedding-bearing objects adopt one shared compatibility and migration contract?
6. How should embedding model changes be versioned across Scry, Taste, Shadow Memory, and Sovereign search?
7. Does The Edit require two explicit modes — Signal Edit and Issue Edit — to preserve conceptual clarity?
8. Should Observatory results become Taste Graph inputs, or remain collective cultural context only?
9. How should consent be revoked after a zine has already contributed aggregate signals?
10. Should the Mean Median Mode chamber retain its technical name in navigation or receive a more editorial display identity?
11. How does Residue live acquisition communicate coverage, provider failure, and partial evidence?
12. Should Apify-acquired sources be preserved as Source Objects or only summarized into a Residue run?
13. Which mobile chamber conventions should become enforced design-system rules?
14. Should every chamber expose one primary plate and move experimental rendering into named lab tabs?
15. How should Pocket reconcile intentional deletion across local, Firestore, and Sovereign records?
16. Should anonymous Pocket data migrate automatically after account creation?
17. What is the canonical distinction between the Stand, Floor, Mine, and The Press?
18. Which serverless routes still statically import heavy or optional Node graphs?
19. Should dynamic-import invariants become part of CI?
20. Which implementation statuses should now be updated in the machine-readable Product Canon Registry?

---

## Current Canon Patch

Mimi’s creator-facing spine remains:

```text
Capture → Tailor → Govern → Structure → Apply → Publish
```

Today’s code confirms a second, infrastructural spine:

```text
Authenticate
    → Resolve Entitlement
    → Select Capability
    → Load Only Required Services
    → Execute Through Gateway or Local Engine
    → Persist to the Appropriate Data Plane
    → Expose Honest State and Provenance
```

The most meaningful architectural development is **plural resilience**.

Mimi can now begin a workflow locally, enrich it through a server provider, generate through a funded Gateway, retrieve through evidence lanes, search an owned Postgres archive, retain compatibility with Firebase, and degrade without pretending every unavailable subsystem is secretly fine.

The architecture is becoming less like one enchanted monolith and more like a well-run house:

- Firebase knows who entered.
- IndexedDB keeps the guest’s coat when the cloud is indisposed.
- Gateway pays the machinery.
- Scry shows which witnesses actually arrived.
- Residue can work offline before summoning outside research.
- Observatory asks permission before turning private creation into collective signal.
- Neon keeps the public archive alive when Firestore develops expensive nerves.
- Vercel receives only the dependency graph each route truly needs.

**Today’s code development in one sentence:** Mimi is acquiring the infrastructure required to remain intelligent, honest, and operational even when one provider, identity state, vector model, quota, or serverless bundle misbehaves.
