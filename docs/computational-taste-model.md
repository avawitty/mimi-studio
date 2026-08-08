# Computational Taste Model

Mimi's computational taste-learning system turns evidence, interpretations, user corrections, and behavioral events into an explainable, versioned, time-aware taste model.

## Definition

**Taste** is a versioned, context-dependent, time-sensitive model of what a creator tends to select, reject, combine, reuse, or find newly compelling — inferred from evidence and corrected by the creator.

Taste is **not**:
- a fixed aesthetic label
- a personality diagnosis
- one embedding
- a list of tags
- whatever generated the most clicks
- an AI-generated summary with no provenance

An embedding represents an object. The taste model represents the creator's learned **relationship** to objects, attributes, combinations, contexts, and changes over time.

## Canonical vs Derived Data

| Layer | Role | Source of Truth |
| --- | --- | --- |
| `EvidenceNode` | Source evidence | Canonical |
| `Observation` | Evidence-linked observations | Canonical |
| `PatternCluster` | Recurring inferred patterns | Canonical |
| `CreativeLaw` | Accepted/proposed creative rules | Canonical |
| `TasteGraphDocument` | Index linking graph entities | Canonical |
| Tailor Profile v2 | Generation contract compiled from graph | Derived (deterministic) |
| `TasteModelSnapshot` | Computational taste model | **Derived cache** |
| `TasteGraphNode` / `TasteGraphEdge` | Map chamber visualization | Presentation projection |

`TasteModelSnapshot` is never a source of truth. It is recomputed from canonical graph data + taste learning events.

## Architecture

```
lib/tasteModel/
  contracts.ts          — Types and Zod schemas
  constants.ts          — Event weights, decay, thresholds
  normalizeTasteEvents.ts — Legacy + v2 event normalizer
  compileTasteModel.ts  — Pure deterministic compiler
  scoreTasteCandidate.ts — Candidate fit scoring
  explainTasteScore.ts  — Human-readable explanations
  projectTasteModelToGraph.ts — UI graph projection

services/tasteModelService.ts — Firestore persistence
hooks/useTasteModel.ts        — React hook
components/taste/               — Inspector + trajectory UI
```

## Event Contract

### TasteEventV2

New taste learning events use `schemaVersion: 2` with explicit `action`, `target`, `signal`, and `provenance` fields. Validated with Zod at persistence boundaries.

### Legacy TasteEvent

The existing `TasteEvent` interface (behavioral logging) is normalized through `normalizeTasteEvent()` — all legacy conditionals are centralized there, not scattered through the compiler.

### Actions

`view`, `linger`, `save`, `reject`, `reuse`, `approve_observation`, `reject_observation`, `accept_cluster`, `reject_cluster`, `rename_cluster`, `mark_signature`, `reduce_weight`, `accept_law`, `reject_law`, `edit_law`, `context_only`, `add_note`

## Event Weighting

Product-default relative weights (not scientific facts):

| Signal | Base Weight |
| --- | --- |
| Explicit rejection | 1.0 |
| Mark signature | 1.2 |
| Accept law | 1.1 |
| Accept cluster | 0.9 |
| Reuse | 0.75 |
| Save | 0.5 |
| Linger | 0.25 |
| View | 0.15 |

**Authority hierarchy:**
1. Explicit user correction (strongest)
2. Mark signature / accepted Creative Laws
3. Explicit rejection
4. Reuse > save > linger > view
5. Passive views never overrule explicit rejection
6. Model-generated observations < user-confirmed

## Time Decay

Exponential decay: `effectiveWeight = baseWeight × exp(-ln(2) × ageDays / halfLifeDays)`

| Action | Half-life (days) |
| --- | --- |
| View | 14 |
| Linger | 21 |
| Save | 60 |
| Reuse | 90 |
| Accept cluster / law | 180 |
| Reject | 365 |
| Mark signature / accept law | 730 |

## Confidence

Computed deterministically from:
- Total evidence mass
- Explicit vs implicit ratio
- Number of distinct evidence sources
- Consistency vs contradiction
- Recency

Capped at 0.95 — duplicate events from one source cannot reach maximum confidence.

## Interaction Rules

Pairwise rules inferred when:
- Minimum support count ≥ 2
- Minimum distinct evidence sources ≥ 2

Relations: `reinforces`, `contrasts`, `rejects_when_combined`, `contextual_only`

## Contextual Profiles

Two scopes compiled:
- **Global** (`users/{uid}/tasteModelSnapshots/global`) — persistent taste
- **Project** (`users/{uid}/tasteModelSnapshots/project-{id}`) — project-specific, shrinks toward global when evidence is sparse

Project-only signals do not automatically rewrite the persistent model.

## Candidate Scoring

`scoreTasteCandidate(candidate, snapshot, context)` returns:

- `fitScore` (0–100, **not** a probability)
- `confidence` (0–1)
- `verdict`: strong_fit | promising_adjacent | uncertain | weak_fit | conflicted
- `components`: semanticAffinity, ruleFit, contextFit, trajectoryFit, noveltyFit, aversionPenalty, saturationPenalty
- `explanation`: top positive/negative factors with source IDs, contradictions, unknowns

No LLM in the scoring function.

## Trajectory

Features classified as: `emerging`, `strengthening`, `stable`, `declining`, `uncertain`

Based on comparing recent (30-day) vs historical (90-day) normalized signed support. Requires minimum evidence mass — one missing week does not trigger "declining."

## User Correction Flow

1. User curates in Tailor (Keep / Not why I like it / Rename / etc.)
2. Canonical curation object updated (existing flow)
3. Immutable `TasteEventV2` appended to `tasteLearningEvents`
4. `compileAndSaveTasteModel()` recomputes snapshot
5. Inspector shows updated reasoning

## Firestore Paths

| Path | Contents |
| --- | --- |
| `users/{uid}/tasteLearningEvents/{eventId}` | Immutable v2 events |
| `users/{uid}/tasteModelSnapshots/global` | Global model snapshot |
| `users/{uid}/tasteModelSnapshots/project-{id}` | Project model snapshot |
| `taste_events/{id}` | Legacy behavioral events (unchanged) |

## Compatibility with Taste Graph

`projectTasteModelToGraph(snapshot)` produces `TasteModelGraphNode` / `TasteModelGraphEdge` compatible with existing Taste Graph UI. Adds non-destructive display fields: signed strength, confidence, trend, source count, context scope, provenance IDs.

## Verification

```bash
npm run verify:taste-model
npm run test:unit -- __tests__/tasteModelCompiler.test.ts
npm run test:unit -- __tests__/tasteCandidateScoring.test.ts
```

## Known MVP Limitations

- Interaction rules use co-occurrence heuristics, not learned coefficients
- No embedding similarity in scoring (tag/feature overlap fallback only)
- Trajectory uses simple recent vs historical window comparison
- Global model aggregates all project evidence when compiled with project data
- No server-side compilation trigger (client-initiated after curation)
- Demo/anonymous users get in-memory compilation only

## Future (Not MVP)

- Online logistic regression from candidate outcomes
- Contextual multi-armed bandits for exploration
- Collaborative filtering
- Cross-user collective intelligence
- Learned coefficient calibration
- Automatic counterfactual recommendations
- Large-scale graph neural networks

A deterministic, evidence-linked personal model is preferable to an impressive black box with no trustworthy correction path.
