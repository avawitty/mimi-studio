# WO-7: Tailor Taste Graph MVP

Status: Implementation started

Branch: `cursor/cover-composer`

Related canon: [Mimi System Architecture](./mimi-system-architecture.md)

## Objective

Build the first functional Tailor loop that turns creator references into an editable Taste Graph.

This work order should prove the core product behavior before investing in graph polish, Doll animation, 3D scenes, art-history matching, or marketing exports.

## User Story

As a creator, I can upload or select references, ask Mimi to read them, inspect the observations and pattern clusters Mimi found, and choose which signals to keep, reject, rename, or weight before they become part of my Taste Graph.

## User-Flow Benefit

The creator does not receive a fixed label like "your style is vintage." Instead, Mimi shows the evidence:

1. These are the references you gave me.
2. These are the observations I can point to.
3. These are the recurring patterns I found.
4. These are possible Creative Laws.
5. Which ones feel true enough to keep?

That makes Tailor educational and editable, not deterministic.

## Product Rule

Tailor is ingestion. Taste Graph is source of truth. Dolls, `mimi.u`, art-history mirrors, brand kits, and marketing assets are downstream projections.

Do not make Doll generation part of the MVP acceptance criteria.

## Scope

### In Scope

- Define TypeScript data contracts for:
  - `EvidenceNode`
  - `Observation`
  - `PatternCluster`
  - `CreativeLaw`
  - `TasteGraph`
- Add a lightweight Tailor analysis service or module that can produce deterministic mocked/sample analysis from selected references.
- Add a Tailor curation surface that shows:
  - uploaded or selected references;
  - extracted observations;
  - pattern clusters;
  - suggested Creative Laws;
  - keep / reject / rename / weight actions;
  - save-to-Taste-Graph action.
- Persist or stage the accepted Taste Graph state using the repo's existing storage conventions.
- Preserve evidence-vs-inference separation in the UI and data model.
- Show which references support each pattern.

### Out of Scope

- Production-grade multimodal AI reading.
- 3D graph visualization.
- Doll image generation.
- Rive animation.
- Public `mimi.u` profile pages.
- Art History API integration.
- Marketing asset generation.
- Billing or credit changes.

## Data Contracts

### EvidenceNode

```ts
type EvidenceNode = {
  id: string;
  projectId: string;
  sourceType: "image" | "book" | "artwork" | "website" | "screenshot" | "note" | "quote" | "fashion" | "object" | "product";
  title: string;
  description?: string;
  sourceUrl?: string;
  uploadedFileUrl?: string;
  thumbnailUrl?: string;
  userCaption?: string;
  tags: string[];
  analysisStatus: "pending" | "processing" | "analyzed" | "failed";
  createdAt: string;
  updatedAt: string;
};
```

### Observation

```ts
type Observation = {
  id: string;
  evidenceNodeId: string;
  projectId: string;
  category: "visual" | "language" | "material" | "emotional" | "historical" | "composition" | "symbolic" | "typographic" | "color" | "texture" | "motion";
  label: string;
  description: string;
  claimType: "observed" | "inferred" | "speculative" | "user_confirmed" | "user_rejected";
  confidence: number;
  createdAt: string;
};
```

### PatternCluster

```ts
type PatternCluster = {
  id: string;
  projectId: string;
  name: string;
  description: string;
  category: string;
  observationIds: string[];
  supportingEvidenceNodeIds: string[];
  frequency: number;
  confidence: number;
  possibleInterpretations: string[];
  userStatus: "suggested" | "accepted" | "rejected" | "renamed" | "merged" | "split" | "hidden";
  userWeight: "low" | "medium" | "high" | "signature";
  createdAt: string;
  updatedAt: string;
};
```

### CreativeLaw

```ts
type CreativeLaw = {
  id: string;
  projectId: string;
  title: string;
  principle: string;
  explanation: string;
  supportingPatternClusterIds: string[];
  supportingEvidenceNodeIds: string[];
  confidence: number;
  userStatus: "suggested" | "accepted" | "rejected" | "edited";
  applications: Array<"illustration" | "writing" | "brand" | "fashion" | "product" | "ui" | "photography" | "interior">;
  avoidances: string[];
  createdAt: string;
  updatedAt: string;
};
```

### TasteGraph

```ts
type TasteGraph = {
  id: string;
  projectId: string;
  evidenceNodeIds: string[];
  observationIds: string[];
  patternClusterIds: string[];
  creativeLawIds: string[];
  acceptedSignalIds: string[];
  rejectedSignalIds: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
};
```

## Suggested Implementation Steps

1. Inspect existing Tailor code, storage conventions, and current `TasteGraph` component before editing. **Done.**
2. Add shared types in the existing local pattern for Tailor/product types. **Already present in `types.ts`; confirmed and reused.**
3. Add sample analysis data or a deterministic mock analyzer so UI and persistence can be built before production AI reading. **Done in `services/tailorMockAnalyzer.ts`.**
4. Add curation UI to Tailor:
   - reference strip or grid;
   - observations grouped by evidence;
   - pattern clusters with supporting reference chips;
   - Creative Law suggestions;
   - keep / reject / rename / weight controls. **Done for pattern clusters in `components/tailor/PatternGraphScreen.tsx`.**
5. Add save/update behavior for the Taste Graph. **Done for cluster curation through `curatePatternCluster` and `updatePatternCluster`.**
6. Add empty, loading, failed, and saved states.
7. Validate with `npm run validate:canon` and the narrowest available build/type check.

## Acceptance Criteria

- A creator can see references in Tailor.
- A creator can see observations extracted from those references.
- A creator can see pattern clusters and their supporting evidence.
- A creator can keep, reject, rename, or weight a cluster. **Implemented for the Pattern Graph screen.**
- A creator can save accepted signals into a Taste Graph object/state. **Implemented through Tailor graph update helpers for curated clusters.**
- The UI distinguishes observed evidence from inferred interpretation.
- No Doll, art-history, marketing, or 3D work is required for this MVP.
- `npm run validate:canon` passes.

## Notes for Cursor or Codex

Prefer a boring but correct first UI over a beautiful but hollow one. The impressive layer comes after this loop works.

Do not flatten the creator into an aesthetic label. Keep the interaction collaborative:

- "Keep"
- "Not why I like it"
- "Rename"
- "Make signature"
- "Save as maybe"
- "Add note"

The product win is not a graph visualization. The product win is that a creator can inspect, correct, and reuse the evidence of their taste.

## Implementation Notes

Current first slice:

- `types.ts` already contains the WO-7 contract objects: `EvidenceNode`, `Observation`, `PatternCluster`, `CreativeLaw`, and `TasteGraphDocument`.
- `services/tailorService.ts` already persists evidence, observations, clusters, laws, and Taste Graph document links.
- `services/tailorMockAnalyzer.ts` adds a deterministic local analyzer that can:
  - summarize evidence nodes;
  - extract observed metadata-based observations;
  - group observations into inferred pattern clusters;
  - suggest Creative Laws;
  - optionally persist the mock run through existing Tailor storage helpers.
- `services/tailorProfileContract.ts` adds the versioned Tailor Profile v2 compilation layer:
  - preserves source evidence separately from interpretation;
  - compiles accepted patterns and Creative Laws into executable generation rules;
  - keeps the legacy blueprint editor working through an explicit projection;
  - validates old and new JSON imports;
  - returns a compact mini-app projection instead of the full private profile.
- `docs/tailor-profile-contract-v2.md` is the operational reference for the eight-layer return contract.

User-flow benefit: Cursor can wire a Tailor curation UI against a real data shape without waiting on multimodal AI, billing, or provider availability.

User-flow benefit: A creator can now move from evidence to an explainable, versioned profile, confirm or correct the result, and reuse a safe projection in Studio or a mini app without turning `strategicSummary` into a second source of truth.
