# Zine Editorial Intelligence Specification

**Status:** Product contract v1 — decisions locked; typed persistence and planner vertical slice not yet implemented  
**Date:** 2026-08-02  
**Spec steward:** Editorial Domain; canonical object ownership follows Section 3  
**Primary surfaces:** The Edit (plan and critique), Studio (copy and plate development), The Press (proof, projection, and publication)  
**Depends on:** [Mimi System Architecture](./mimi-system-architecture.md), [Architecture Update 21](./architecture-update-21.md), [Zine Spread Compose PRD](../prd/zine-spread-compose.md), [Used Context Colophon PRD](../prd/aesthetic-05-provenance-colophon.md)  
**Compatibility anchors:** `types.ts` (`ZineMetadata`, `ZineContent`, `ZinePageSpec`), `lib/zineSpreadLayout.ts` (`hydrateZineContentPages`), `services/exportManifestService.ts`

---

## 1. Product thesis

Mimi needs an editorial decision layer between an approved direction and generated pages.

An issue is not a bag of attractive layouts. It is a versioned argument and emotional sequence in which evidence, interpretation, image, application, pause, and unresolved residue arrive in a deliberate order.

The governing rule is:

> **Every generated page must earn its existence.**

A page is valid only when it contributes at least one of:

- new evidence;
- new interpretation;
- new emotional movement;
- new visual information;
- new application;
- necessary pause;
- necessary provenance.

If a page contributes none of these, Mimi removes or merges it. Page count is an editorial outcome, not a generation target.

### User promise

The creator should be able to inspect:

1. why each page exists;
2. why it appears at this point in the sequence;
3. what evidence or approved direction supports it;
4. what Mimi changed or compressed;
5. how much authorship Mimi exercised;
6. which revision and approvals produced the published result.

### Quality outcome

The system must prevent the default sequence:

> Cover → Quote → Signals → Pretty image → Recommendations

unless that sequence is genuinely justified by the material. Visual variety without narrative development is not a successful issue.

---

## 2. Scope

### Core editorial intelligence

This spec defines:

1. the issue dramaturgy model;
2. page-to-page rhythm;
3. editorial compression;
4. composition critique;
5. spread relationships;
6. deterministic planning and repair rules.

### Artifact lifecycle required to support the core

This spec also defines:

- provenance and public colophon behavior;
- media rights and source custody;
- output projections from one master issue;
- artifact re-entry into Mimi;
- comparative intelligence;
- human authorship controls;
- layered approvals;
- collaboration and annotations;
- immutable revisions and visual comparison;
- public reader modes;
- privacy-respecting engagement;
- generation budgets;
- production traces;
- schema migration and compatibility.

### Non-goals

- Replacing editorial judgment with a single aesthetic score.
- Asking a model to “make it feel paced” without inspectable rules.
- Expanding the template library as a substitute for issue planning.
- Treating technical export diagnostics as composition criticism.
- Full print imposition or bindery workflow.
- Making publication, memory, or rights approval implicit.
- Reproducing private or reference-only media in public output.
- Requiring every creator to manually approve every intermediate screen.
- Generating pages to satisfy a preferred length.

### Terms

- **Page:** one canonical editorial sequence unit. Cover, pause, and colophon are page kinds.
- **Plate:** a visual realization of a page. A page can use a source image, a developed plate, or no image.
- **Image job:** one metered generation or transformation request. Image-job budget and page count are different controls.
- **Editorial page set:** all canonical pages except the colophon and projection-only mechanical blanks. It includes the cover.
- **Projection-only blank:** an imposition artifact for print/spread output. It is never a narrative page and never satisfies a rhythm rule.

---

## 3. Architecture placement

The zine path specializes Mimi’s canonical workflow:

```text
Approved Source Packet
→ Approved Reading
→ Approved Editorial Direction
→ Issue Planner
→ Rhythm + Spread Plan
→ Structural Compression
→ Composition Critic
→ Issue-plan Approval
→ Copy + Plate Development
→ Copy Compression + Composition Critic
→ Artifact Proof Approval
→ The Press projections
→ Projection Proof Approval
→ Public / archival output
→ Optional approved artifact extraction
```

### Domain ownership

| Concern | Canonical owner | Responsibility |
| --- | --- | --- |
| Sources, evidence, rights assertions | Research Domain | Preserve source identity, evidence locators, privacy, and rights basis |
| Approved reusable signals and directions | Knowledge / Editorial Domains | Preserve approval, version, and evidence links |
| Issue plan, dramaturgy, rhythm, compression decisions | Editorial Domain | Decide what the issue says, how it develops, and why each page exists |
| Copy and visual candidates | Generation / Composition | Realize the approved plan without silently changing it |
| `customLayout.elements` geometry | Composition Engine | Realize page geometry and element placement |
| Proof, output variants, publication | Publishing Domain / The Press | Validate, package, sanitize, and publish one approved revision |
| Public publication projection | Sovereign Data Plane | Serve sanitized public artifacts; never become private canonical state |

### Three kinds of validation

These checks remain separate:

| Validator | Question | Example |
| --- | --- | --- |
| Schema / technical proof | Can the artifact render and export? | Missing image, invalid geometry, failed upload |
| Editorial composition critic | Is the issue narratively and visually successful? | Three dense pages in a row, repeated hierarchy |
| Publication policy | May this revision be published to this destination? | Unknown image rights, stale proof approval |

A technically valid PDF can still be a weak issue. A strong private issue can still be ineligible for public publication.

---

## 4. Canonical artifact and revision model

One master issue revision owns the approved editorial state. Readers, PDFs, carousels, and context packs are projections of that revision, not independent zines. Mutable work and immutable history are separate.

```ts
interface VersionedObjectEnvelope<T extends string> {
  id: string;
  objectType: T;
  ownerDomain: string;
  projectId: string;
  revision: number;
  contentHash: string;
  createdAt: number;
  createdBy: string;
}

interface VersionedRef<T extends string = string> {
  id: string;
  objectType: T;
  revision: number;
  contentHash: string;
}

interface VersionedEmbeddedRef<T extends string> {
  parentRef: VersionedRef<T>;
  localId: string;
}

type EditorialClaimRef =
  VersionedEmbeddedRef<"zine-editorial-material-graph">;

interface ZineWorkingCopy {
  id: string;
  artifactId: string;
  baseRevisionRef?: VersionedRef<"zine-artifact-revision">;
  headVersionToken: string;
  contentHash: string;
  issuePlanDraftRef?: VersionedRef;
  pageDrafts: ZinePageSpecV2[];
  updatedAt: number;
  updatedBy: string;
}

interface NativeZineRevision
  extends VersionedObjectEnvelope<"zine-artifact-revision"> {
  kind: "native";
  artifactId: string;
  parentRevisionRef?: VersionedRef<"zine-artifact-revision">;
  schemaVersion: 2;
  authorshipMode: AuthorshipMode;
  sourcePacketRef: VersionedRef;
  readingRef: VersionedRef;
  editorialDirectionRef: VersionedRef;
  contextPacketRef: VersionedRef;
  usedContextRecordRef: VersionedRef;
  issuePlanRef: VersionedRef<"zine-issue-plan">;
  pages: ZinePageSpecV2[];
  provenance: VersionedRef[];
}

interface LegacyReadOnlyZineRevision
  extends VersionedObjectEnvelope<"zine-artifact-revision"> {
  kind: "legacy-read-only";
  artifactId: string;
  schemaVersion: 1;
  authorshipMode: "unclassified";
  rawPayloadRef: string;
  rawPayloadHash: string;
  compatibilityRenderRef: VersionedRef<"legacy-zine-render-projection">;
  legacyState: LegacyEditorialState;
  missingLineage: string[];
}

interface LegacyZineRenderProjection
  extends VersionedObjectEnvelope<"legacy-zine-render-projection"> {
  artifactId: string;
  rawPayloadRef: string;
  rawPayloadHash: string;
  renderAdapterVersion: string;
  canRender: boolean;
  pageIdMapping: Record<string, string>;
  diagnostics: Array<{ code: string; message: string }>;
}

interface UnsupportedFutureZineRevision
  extends VersionedObjectEnvelope<"zine-artifact-revision"> {
  kind: "unsupported-future";
  artifactId: string;
  schemaVersion: number;
  rawPayloadRef: string;
  rawPayloadHash: string;
  compatibilityRenderRef?: VersionedRef<"legacy-zine-render-projection">;
  canRender: boolean;
  canOpenRaw: boolean;
}

type ZineArtifactRevision =
  | NativeZineRevision
  | LegacyReadOnlyZineRevision
  | UnsupportedFutureZineRevision;

interface ZineArtifactLifecycleEvent
  extends VersionedObjectEnvelope<"zine-artifact-lifecycle-event"> {
  artifactRef: VersionedRef<"zine-artifact-revision">;
  action: "set-head" | "archive" | "restore";
  expectedPreviousHeadRef?: VersionedRef<"zine-artifact-revision">;
  occurredAt: number;
  actorId: string;
}
```

Rules:

1. `artifactId` remains stable; `revision` is immutable and monotonically increasing.
2. Draft edits occur in `ZineWorkingCopy` and use `headVersionToken` compare-and-set. A head mismatch produces a conflict; it never overwrites concurrent work.
3. Freezing a working copy creates an append-only candidate revision. Editing any frozen revision creates a child working copy and then a child revision.
4. Every target of `VersionedRef` implements `VersionedObjectEnvelope`; contract-specific revision aliases such as `planRevision` or `projectionRevision` are forbidden.
5. `contentHash` covers canonical immutable fields and outbound dependency refs. It excludes approval, evaluation, archive, publication, withdrawal, and other backlink events.
6. Approvals, evaluations, editorial decisions, manifests, and publication actions reference immutable content in a one-way graph; immutable content never embeds backlinks to them.
7. Publication state is derived by folding append-only projection publication events, not stored on the master revision or immutable projection content.
8. Objects owned by Research, Knowledge, Editorial, or Approval domains are referenced by ID, revision, and content hash. A revision may carry explicitly labeled immutable snapshots for offline rendering, but those snapshots do not become competing canonical objects.
9. Native v2 revisions require complete lineage, an issue plan, and authorship mode. Legacy revisions use the separate read-only branch and never fabricate those fields.
10. Page IDs remain stable across reordering and copy/layout edits. Page numbers may change.
11. Changing an approved dependency makes the relevant downstream approval stale.
12. Public and export projections record the source artifact revision.
13. An old revision remains renderable even when current Tailor or memory state changes.
14. Annotations are collaboration records that target a revision; they are not page content.

### Compatibility with the current zine model

Schema v2 uses one canonical ordered page union:

```ts
interface ZineAsset extends VersionedObjectEnvelope<"zine-asset"> {
  storageRef: string;
  mediaType: string;
  byteSize: number;
  width?: number;
  height?: number;
  custodyRef: VersionedRef<"zine-asset-custody">;
}

interface NormalizedAssetTransform {
  crop: { x: number; y: number; width: number; height: number };
  rotationDegrees: number;
  scale: number;
  filterTokens: string[];
}

interface AssetPlacement {
  id: string;
  assetRef: VersionedRef<"zine-asset">;
  custodyRef: VersionedRef<"zine-asset-custody">;
  renderedAssetRef?: VersionedRef<"zine-asset">;
  transform: NormalizedAssetTransform;
  altText?: string;
  decorative: boolean;
}

type ZinePageBlockV2 =
  | {
      id: string;
      type: "text";
      role: "title" | "dek" | "body" | "caption" | "source-note";
      content: string;
      decorative: false;
    }
  | {
      id: string;
      type: "image";
      role: "primary" | "evidence" | "supporting" | "background";
      placement: AssetPlacement;
    }
  | {
      id: string;
      type: "colophon-slot";
      policyVersion: string;
      decorative: false;
    };

interface EditorElementV2 {
  id: string;
  blockId: string;
  geometry: {
    top: number;
    left: number;
    width: number;
    height?: number;
    zIndex: number;
    rotation: number;
  };
  presentation: Record<string, string | number | boolean>;
}

interface ZinePageBaseV2 {
  id: string;
  pageNumber: number;
  blocks: ZinePageBlockV2[];
  elementReadingOrder: string[];
  layout: {
    mode: "default" | "custom";
    elements: EditorElementV2[];
    editTrace?: { timestamp: number; note: string }[];
  };
}

type ZinePageSpecV2 =
  | (ZinePageBaseV2 & {
      kind: "cover";
      sectionType: "cover";
      narrativeFunction: "invitation" | "orientation";
    })
  | (ZinePageBaseV2 & {
      kind: "content";
      sectionType: Exclude<ZineSectionType, "cover" | "colophon">;
      narrativeFunction: NarrativeFunction;
    })
  | (ZinePageBaseV2 & {
      kind: "pause";
      sectionType: "transition" | "end-matter";
      narrativeFunction: "release" | "residue";
      accessibleSummary: string;
    })
  | (ZinePageBaseV2 & {
      kind: "colophon";
      sectionType: "colophon";
      endMatterFunction: "provenance";
      colophonPolicyVersion: string;
    });
```

Every native schema-v2 revision requires exactly one cover at page 1 and exactly one colophon at the final canonical page. The cover contains a title block. A content page contains at least one non-decorative text or image block. A pause may be intentionally sparse. A colophon contains exactly one `colophon-slot`; its `endMatterFunction` is provenance rather than a fabricated narrative or epistemic claim, and its rendered public/private content is derived later without an artifact hash cycle.

Realized page ID equals planned page ID; there is no second `planPageId`. Page numbers are one-based, unique, and contiguous. Every `EditorElementV2.blockId` resolves within its page. `elementReadingOrder` contains every non-decorative block exactly once and omits decorative blocks. An image placement has non-empty `altText` XOR `decorative: true`. Asset/custody refs and normalized transforms—not mutable URLs—drive reuse, rights, lineage, rendering, and accessibility checks. Mechanical print blanks are projection records, not `ZinePageSpecV2`.

During compatibility:

1. `ZinePageSpecV2[]` is canonical for schema v2.
2. `ZineMetadata.content.pages` and `pagesJson` are generated legacy renderer projections.
3. Current top-level cover metadata projects from the v2 cover page.
4. Current `ZinePageSpec` remains a compatibility contract for content plates only.
5. A compatibility adapter resolves asset storage refs, maps blocks into legacy headline/body/image fields, and maps `layout.elements` into `customLayout.elements`.
6. Sidecar page data migrates from mutable page-number keys to stable page IDs.
7. `ZinePagePlan` is the editorial intent that precedes and explains `ZinePageSpecV2`.

The planner must not be embedded as more prose inside `services/zineGenerator.ts`. The current prompt-level instruction to produce a fixed `3-5` pages and exactly four visual plates is implementation drift from this spec: the approved issue plan must eventually own page count, sequence, and visual jobs.

---

## 5. Epistemic and editorial primitives

### 5.1 Narrative functions

```ts
export type NarrativeFunction =
  | "invitation"
  | "orientation"
  | "revelation"
  | "evidence"
  | "complication"
  | "contrast"
  | "intensification"
  | "application"
  | "release"
  | "residue";
```

Meanings:

| Function | Editorial job |
| --- | --- |
| `invitation` | Establish the threshold, question, or desire that makes the reader enter |
| `orientation` | Establish scope, terms, context, or reading position |
| `revelation` | Introduce the issue’s central interpretive turn |
| `evidence` | Make support inspectable through sources, examples, or observation |
| `complication` | Add friction, limitation, uncertainty, or counterevidence |
| `contrast` | Place meaningful difference in view |
| `intensification` | Increase visual, conceptual, or emotional pressure without merely repeating |
| `application` | Translate the reading into a decision, experiment, direction, or practice |
| `release` | Reduce pressure and make space for integration |
| `residue` | Leave the durable afterimage, open question, or unresolved truth |

`intensification` is the typed form of “visual intensification.” It may be text-led, image-led, or spatial, but it must develop the issue rather than decorate it.

### 5.2 Epistemic status

```ts
export type EpistemicStatus =
  | "observation"
  | "inference"
  | "projection"
  | "creator-position";
```

| Status | Meaning | Required behavior |
| --- | --- | --- |
| `observation` | Describes something addressable in evidence | At least one evidence/source locator |
| `inference` | Interprets one or more observations | Supporting evidence plus uncertainty |
| `projection` | Proposes a future, possibility, or speculative extension | Clearly labeled; never presented as settled fact |
| `creator-position` | A chosen stance, desire, refusal, or direction | Attribution to the creator or approved direction |

Evidence itself remains a separate object. An approved inference does not become an observation.

### 5.3 Section types

```ts
export type ZineSectionType =
  | "cover"
  | "front-matter"
  | "reading"
  | "evidence"
  | "visual-plate"
  | "application"
  | "transition"
  | "end-matter"
  | "colophon";
```

Section type describes content responsibility. It does not determine layout.

### 5.4 Page grammar

```ts
export type ZinePageGrammar =
  | "cover-threshold"
  | "opening-note"
  | "claim-led"
  | "evidence-led"
  | "image-led"
  | "image-caption"
  | "split-argument"
  | "comparison"
  | "timeline"
  | "inventory"
  | "instruction"
  | "pause"
  | "colophon";
```

Editorial grammar is distinct from:

- `plateGrammarClass`, which currently chooses renderer classes by issue mode;
- `customLayout.elements`, which stores page geometry;
- spread relationship, which explains why two pages belong together.

### 5.5 Page contribution

```ts
type NonEmpty<T> = readonly [T, ...T[]];

export type PageContribution =
  | {
      kind: "new-evidence";
      claimIds: NonEmpty<string>;
      sourceRefs: NonEmpty<VersionedRef>;
    }
  | {
      kind: "new-interpretation";
      claimIds: NonEmpty<string>;
      supportingClaimIds: NonEmpty<string>;
      rationale: string;
    }
  | {
      kind: "emotional-movement";
      fromEffect: string;
      toEffect: string;
      rationale: string;
      supportedByPageIds?: string[];
    }
  | {
      kind: "visual-information";
      assetRefs: NonEmpty<VersionedRef>;
      differsFromPageIds: string[];
      rationale: string;
    }
  | {
      kind: "application";
      directionRefs: NonEmpty<VersionedRef>;
      proposedAction: string;
    }
  | {
      kind: "necessary-pause";
      releasesPageIds: NonEmpty<string>;
      rationale: string;
    }
  | {
      kind: "provenance";
      manifestFieldIds: NonEmpty<string>;
    };
```

Every planned page has a non-empty contribution tuple. The record—not a parallel label—is the basis:

- evidence, interpretation, and application point to versioned claims, sources, or directions;
- visual information points to an asset or visual brief not already used unchanged;
- emotional movement names the before/after effect;
- pause names the pressure it releases;
- provenance points to the manifest or custody summary it reveals.

“Looks good here” is not a valid basis.

`EARN-001` and exact-duplicate `EARN-002` are non-waivable. An intentional refrain is valid only when its contribution record demonstrates a distinct effect, context, or visual/evidentiary function.

---

## 6. Issue plan contracts

### 6.1 Page plan

```ts
interface NarrativeTransition {
  kind:
    | "continuation"
    | "reveal"
    | "complication"
    | "contrast"
    | "intensification"
    | "application"
    | "release";
  fromPageId: string;
  rationale: string;
}

interface ZinePagePlanBase {
  id: string;
  pageNumber: number;
  desiredEffect: string;
  informationDensity: number;
  visualIntensity: number;
  textImageRatio: number;
  earnsExistenceBy: NonEmpty<PageContribution>;
  assetIds: string[];
  transitionFromPrevious?: NarrativeTransition;
  darkPlateReason?: string;
  contributionFingerprint: string;
}

type ZinePagePlan =
  | (ZinePagePlanBase & {
      kind: "cover";
      sectionType: "cover";
      grammar: "cover-threshold";
      narrativeFunction: "invitation" | "orientation";
      centralClaim?: string;
      centralClaimId?: string;
      sourceIds: string[];
      claimIds: string[];
      certainty?: EpistemicStatus;
    })
  | (ZinePagePlanBase & {
      kind: "content";
      contentMode: "claim-bearing";
      sectionType: Exclude<ZineSectionType, "cover" | "colophon">;
      grammar: Exclude<ZinePageGrammar, "cover-threshold" | "pause" | "colophon">;
      narrativeFunction: NarrativeFunction;
      centralClaim: string;
      centralClaimId: string;
      sourceIds: string[];
      claimIds: NonEmpty<string>;
      certainty: EpistemicStatus;
    })
  | (ZinePagePlanBase & {
      kind: "content";
      contentMode: "visual-only";
      sectionType: "visual-plate" | "transition" | "end-matter";
      grammar: "image-led" | "image-caption" | "comparison" | "inventory";
      narrativeFunction:
        | "invitation"
        | "contrast"
        | "intensification"
        | "release"
        | "residue";
      sourceIds: string[];
      claimIds: string[];
    })
  | (ZinePagePlanBase & {
      kind: "pause";
      sectionType: "transition" | "end-matter";
      grammar: "pause";
      narrativeFunction: "release" | "residue";
      sourceIds: string[];
      claimIds: string[];
    })
  | (ZinePagePlanBase & {
      kind: "colophon";
      sectionType: "colophon";
      grammar: "colophon";
      endMatterFunction: "provenance";
      sourceIds: string[];
      claimIds: string[];
    });
```

Numeric fields use the closed range `0..1`.

- `informationDensity`: planned cognitive load, not word count alone.
- `visualIntensity`: contrast, scale, color, motion implication, and compositional pressure.
- `textImageRatio`: `0` is fully image-led; `1` is fully text-led.

`pageNumber` is one-based display order within the revision and must be unique and contiguous. `id` is stable identity and becomes the realized `ZinePageSpecV2.id`. `sourceIds`, `claimIds`, and `assetIds` are denormalized lookup fields; contribution records are authoritative. A claim-bearing content page’s `certainty` equals its required central claim’s discriminant, while every secondary claim retains its own typed epistemic contract. A visual-only page must contain a `visual-information` or `emotional-movement` contribution and cannot imply an unrecorded claim. Pause and colophon pages have no fabricated `certainty`; their contribution tuples prove pause/provenance. Colophon counts deduplicate by claim ID.

### 6.2 Issue rhythm

```ts
interface IssueRhythm {
  pageIds: string[];
  densityCurve: number[];
  visualIntensityCurve: number[];
  textImageRatioCurve: number[];
  darkPlatePageIds: string[];
  pausePageIds: string[];
  darkPlatePositions: number[];
  pausePositions: number[];
}

interface RhythmEvaluation {
  target: IssueRhythm;
  measured: IssueRhythm;
  critiques: CompositionCritique[];
}
```

Invariants:

1. `pageIds`, all three curves, and issue-plan `pages` have equal length and identical order.
2. Every value is finite and within `0..1`.
3. `darkPlatePageIds` and `pausePageIds` are canonical; position lists are derived display values and must resolve to the same pages.
4. No page ID appears twice.
5. Target curves are approved in the issue plan; measured curves are recomputed after copy and layouts exist.
6. Density-run, grammar-run, and final-editorial-page rules use the editorial page set and exclude the colophon. Cover reuse and asset-distribution rules include the cover.

### 6.3 Spread specification

```ts
interface ZineSpreadBase {
  id: string;
  lockedTogether?: boolean;
  relationshipRationale: string;
  accessibleSummary: string;
}

type ZineSpreadRelationship =
  | "continuation"
  | "contrast"
  | "image-text"
  | "diptych"
  | "evidence-reading"
  | "pause";

type ZineSpreadSpec =
  | (ZineSpreadBase & {
      kind: "singlet";
      pageId: string;
      side: "left" | "right";
      purpose: "threshold" | "pause" | "end-matter";
      mobileReadingOrder: readonly [string];
    })
  | (ZineSpreadBase & {
      kind: "pair";
      leftPageId: string;
      rightPageId: string;
      mobileReadingOrder: readonly [string, string];
      relationship: ZineSpreadRelationship;
    });
```

Examples:

- source evidence → Mimi’s interpretation;
- visual artifact → sparse caption;
- image → image diptych;
- claim → contradiction;
- near-blank pause → revelation.

Rules:

1. A page belongs to at most one spread in a revision.
2. A singlet explicitly records its side and purpose; it cannot have zero pages.
3. `lockedTogether` affects spread/print projection; it never removes sequential mobile access.
4. `mobileReadingOrder` contains exactly the participating page IDs, once each.
5. Each side must remain understandable in mobile order.
6. `accessibleSummary` explains the relationship without relying on adjacency, color, motion, or vision.
7. A diptych that loses meaning when separated requires its summary before the second page.
8. Spread intent survives output projection even when pages are presented one at a time.

### 6.4 Complete issue plan

```ts
interface ZineIssuePlan
  extends VersionedObjectEnvelope<"zine-issue-plan"> {
  artifactId: string;
  schemaVersion: number;
  planKind: "provisional" | "approval-candidate";
  provisionalInputSelectionRef?: VersionedRef<"provisional-input-selection">;
  sourcePacketRef: VersionedRef;
  readingRef: VersionedRef;
  editorialDirectionRef: VersionedRef;
  materialGraphRef: VersionedRef<"zine-editorial-material-graph">;
  contextPacketRef: VersionedRef;
  usedContextRecordRef: VersionedRef;
  generationBudgetRef: VersionedRef<"zine-generation-budget">;
  authorshipMode: AuthorshipMode;
  approvalWorkflow: ApprovalWorkflow;
  editorialThesis: string;
  unresolvedQuestion?: string;
  pages: ZinePagePlan[];
  spreads: ZineSpreadSpec[];
  rhythm: IssueRhythm;
  compression: CompressionResult;
  ruleExceptionRequests: EditorialRuleExceptionRequest[];
  ruleSetVersion: string;
  provenance: VersionedRef[];
}
```

An approved issue plan is the contract consumed by copy and visual generation. Generation may realize the plan but may not silently add pages, change the narrative function, replace evidence, or reorder the sequence.

An approval-candidate plan has no provisional selection ref. A provisional plan requires one. Express workflow may realize a provisional plan only inside the bound quarantined working copy under Section 13. It cannot publish, export publicly, or write memory.

Before either plan kind can be realized, runtime validation requires:

1. 4–24 pages with one cover first and one colophon last;
2. one-based contiguous page numbers and globally unique stable page IDs;
3. every page/contribution claim ID resolving inside `materialGraphRef`;
4. every source, asset, direction, and embedded-local reference resolving;
5. every spread containing valid participating pages exactly once;
6. rhythm arrays matching the exact page order;
7. all deterministic non-waivable `EARN-*`, `ARC-*`, `RHY-*`, and `SPREAD-*` checks passing;
8. an approval-candidate plan having no provisional ref, and a provisional plan having exactly one unexpired ref bound to the same working copy.

### 6.5 Plan and realization evaluations

Findings form a one-way graph into immutable content. They do not become backlinks inside the plan or artifact.

```ts
interface ZinePlanEvaluation
  extends VersionedObjectEnvelope<"zine-plan-evaluation"> {
  planRef: VersionedRef<"zine-issue-plan">;
  inputDigest: string;
  ruleSetVersion: string;
  criticVersion?: string;
  result: "pass" | "warning" | "blocked";
  critiques: CompositionCritique[];
  appliedOverrideRefs: VersionedRef<"editorial-rule-override">[];
}

interface RealizedPageCompositionSummary {
  pageId: string;
  wordCount: number;
  elementCount: number;
  claimCount: number;
  informationDensity: number;
  visualIntensity: number;
  textImageRatio: number;
  dominantAlignment: "left" | "center" | "right" | "mixed" | "spatial";
  accentTokens: string[];
  assetFingerprints: string[];
  overflowDetected: boolean;
}

interface ZineRealizationEvaluation
  extends VersionedObjectEnvelope<"zine-realization-evaluation"> {
  artifactId: string;
  artifactRef: VersionedRef<"zine-artifact-revision">;
  projectionContentRef?: VersionedRef<"zine-output-projection-content">;
  measuredRhythm: IssueRhythm;
  pageSummaries: RealizedPageCompositionSummary[];
  copyCompression: CompressionResult;
  critiques: CompositionCritique[];
  appliedOverrideRefs: VersionedRef<"editorial-rule-override">[];
  inputDigest: string;
  ruleSetVersion: string;
  criticVersion?: string;
}
```

---

## 7. Issue dramaturgy

### 7.1 Baseline movement

An exemplary full movement is:

```text
Invitation
→ Orientation
→ Revelation
→ Evidence
→ Complication
→ Contrast or Intensification
→ Application
→ Release
→ Residue
```

This is a movement grammar, not a mandatory nine-page template. One page may carry more than one beat only when the plan names a primary `narrativeFunction` and records the secondary movement in `desiredEffect`. Sparse source material should produce a shorter issue, not padded beats.

### 7.2 Arc invariants

Every issue must:

1. establish a threshold through `invitation` or `orientation`;
2. contain at least one substantive development beat;
3. support central claims before treating them as conclusions;
4. finish its editorial movement with `release` or `residue`;
5. state what remains unresolved when the material does not justify closure.

For issues with seven or more editorial pages, the planner should include at least one legitimate turn through `complication` or `contrast`. It must not invent a contradiction solely to satisfy the rule. When no responsible turn exists, the plan records a rule-exception request with evidence; an external approval must authorize it.

The final editorial page means the final page before a mechanical end-matter colophon. A colophon can be the physical last page while the preceding page carries emotional resolution.

### 7.3 Allowed development

The planner may move through this graph:

```text
invitation      → orientation | revelation
orientation     → revelation | evidence | contrast
revelation      → evidence | complication | intensification
evidence        → complication | contrast | revelation | application
complication    → evidence | contrast | intensification | application
contrast        → revelation | intensification | application
intensification → application | release
application     → complication | release | residue
release         → residue
residue         → end
```

Departures are allowed when the issue plan records a rationale. The graph prevents accidental order, not deliberate nonlinear work.

### 7.4 Length policy

Page count includes cover and colophon:

- shortest valid issue: 4 pages;
- normal working range: 6–10 pages;
- expanded issue: 11–16 pages, only when distinct material earns the length;
- technical renderer cap: 24 canonical pages;
- generated plate/image-job count is controlled separately by `maxImageJobs`;
- the hard cap is never a target.

A four-page issue can combine invitation/orientation on the cover, one substantive evidence/reading page, one release/residue page, and one colophon. If even that structure is unsupported, Mimi should offer a different artifact form instead of manufacturing a zine.

---

## 8. Deterministic issue-planning pipeline

The planner is a staged compiler. Model-assisted interpretation may propose semantic structure, but deterministic validation owns invariants and publication gates.

### Stage 0 — Validate approved inputs

```ts
interface ProvisionalInputSelection
  extends VersionedObjectEnvelope<"provisional-input-selection"> {
  artifactId: string;
  workingCopyId: string;
  workingCopyHeadToken: string;
  sourcePacketCandidateRef: VersionedRef;
  readingCandidateRef: VersionedRef;
  editorialDirectionCandidateRef: VersionedRef;
  contextPacketRef: VersionedRef;
  usedContextRecordRef: VersionedRef;
  generationBudgetRef: VersionedRef<"zine-generation-budget">;
  authorshipMode: AuthorshipMode;
  workflow: "express";
  selectionDigest: string;
  selectedBy: string;
  expiresAt: number;
}
```

Guided and standard workflows require:

- a versioned source packet approved for this task;
- a versioned reading;
- a versioned editorial direction;
- an authorship mode;
- an approval workflow;
- a generation budget.

Missing approval produces a blocked plan, not an inferred approval.

Express workflow may instead accept an explicit, unexpired `ProvisionalInputSelection` bound to one quarantined working copy. It can use only the named versions. Final bundle approval atomically verifies the selection digest, working-copy content hash/head token, and every dependency; any mismatch writes no approvals, revision, publication, or memory. Express cannot retrieve unselected memory, publish, create a public export, or write reusable knowledge before that action.

### Stage 1 — Build an editorial material graph

```ts
interface EvidenceLocatorRef {
  sourceRef: VersionedRef;
  locator: string;
}

interface EditorialClaimBase {
  id: string;
  text: string;
  directionRefs: VersionedRef[];
  creatorPriority: "required" | "preferred" | "optional";
  role: "thesis" | "support" | "counterpoint" | "application" | "open-question";
  evidencePriority: "primary" | "supporting" | "contextual";
  normalizedFingerprint: string;
}

type EditorialClaim =
  | (EditorialClaimBase & {
      certainty: "observation";
      evidence: NonEmpty<EvidenceLocatorRef>;
    })
  | (EditorialClaimBase & {
      certainty: "inference";
      evidence: NonEmpty<EvidenceLocatorRef>;
      supportingClaimIds: NonEmpty<string>;
      uncertainty: { level: "low" | "medium" | "high"; rationale: string };
    })
  | (EditorialClaimBase & {
      certainty: "projection";
      basisClaimIds: NonEmpty<string>;
      disclosure: string;
      horizon?: string;
      uncertainty: { level: "low" | "medium" | "high"; rationale: string };
    })
  | (EditorialClaimBase & {
      certainty: "creator-position";
      attributedTo: string;
      approvedDirectionRef: VersionedRef;
    });

interface EditorialMaterialGraph
  extends VersionedObjectEnvelope<"zine-editorial-material-graph"> {
  artifactId: string;
  claims: EditorialClaim[];
  sourceToClaim: Record<string, string[]>;
  supports: Array<[string, string]>;
  complicates: Array<[string, string]>;
  contradicts: Array<[string, string]>;
  implies: Array<[string, string]>;
}
```

Exact duplicates are detected by normalized fingerprints. Semantic duplicate proposals must include the compared claim IDs and rationale. No semantic merge happens without a logged decision.

Claims are embedded, immutable children of the versioned material graph. `EditorialClaimRef` combines the graph ref and local claim ID; every page-plan `claimId`, contribution claim ID, snapshot claim ref, and colophon count must resolve inside the plan’s exact `materialGraphRef`. Embedded plan rule-exception requests use the same parent-plus-local-ID principle through the override’s `targetRef` and `exceptionRequestId`.

### Stage 2 — Determine earned beats

1. Seed the threshold, central turn, ending movement, and provenance.
2. Add evidence beats for claims that need inspectable support.
3. Add complication or contrast only when present in the material graph.
4. Add application only when the approved direction promises a decision, experiment, or practice.
5. Add visual beats only when they provide new visual information or necessary emotional movement.
6. Reject beats whose only purpose is to reach a target length.

### Stage 3 — Draft the page sequence

For each beat:

1. assign one primary narrative function;
2. assign one section type and grammar;
3. attach claims, sources, assets, and epistemic status;
4. state the desired reader effect;
5. state why the page earns existence;
6. set target density, visual intensity, and text-image ratio;
7. describe the transition from the preceding page.

### Stage 4 — Pair spreads

The planner pairs pages only when the relationship adds meaning. A spread cannot exist solely because two page numbers happen to face each other.

### Stage 5 — Apply structural compression

Run the compression contract in Section 10. Remove, merge, or split pages before copy generation.

### Stage 6 — Evaluate plan-stage rules

Run Section 9 rules whose stage includes `plan`. Apply local repairs first:

- lower density;
- change grammar;
- move a page;
- convert a duplicate page into a transition;
- merge repeated claims;
- move a strong image later;
- remove an unearned dark plate.

Do not regenerate the entire issue when a local patch is sufficient.

### Stage 7 — Run semantic composition critique

The model-assisted critic evaluates development, hierarchy, escalation, and emotional resolution. It emits structured findings and suggested patches; it does not mutate the plan directly.

### Stage 8 — Repair and freeze

1. Apply accepted patches with decision-log entries and re-run deterministic checks.
2. Freeze the plan revision and persist an initial `ZinePlanEvaluation` against that exact hash.
3. Non-waivable blockers stop the plan.
4. For an allowed exception, record a separate rule-exception approval, create `EditorialRuleOverride`, and persist a new evaluation revision with the override in its context.
5. Rationale without that approval does not alter the result.
6. Proceed to plan approval only when the latest evaluation has no unresolved blocker and pins all applied overrides/approvals.
7. Any repair changes content and therefore creates a new plan revision and evaluation; an override never mutates the plan.

### Stage 8.5 — Realization contract

```ts
interface PageRealizationJob {
  id: string;
  planRef: VersionedRef<"zine-issue-plan">;
  pageId: string;
  pagePlanDigest: string;
  order: number;
  copyRequired: boolean;
  imageJobAllowed: boolean;
  sourceRefs: VersionedRef[];
  assetRefs: VersionedRef<"zine-asset">[];
  budgetRef: VersionedRef<"zine-generation-budget">;
  reservationRef: VersionedRef<"zine-credit-reservation">;
}

interface RealizeIssuePlanRequest {
  planRef: VersionedRef<"zine-issue-plan">;
  planApprovalRef?: VersionedRef<"approval">;
  provisionalSelectionRef?: VersionedRef<"provisional-input-selection">;
  budgetApprovalRef: VersionedRef<"approval">;
  workingCopyId: string;
  workingCopyHeadToken: string;
  jobs: PageRealizationJob[];
  reservationRef: VersionedRef<"zine-credit-reservation">;
  idempotencyKey: string;
}

type RealizeIssuePlanResult =
  | {
      status: "success";
      workingCopyId: string;
      realizedPageIds: string[];
      traceRef: VersionedRef<"zine-generation-trace">;
    }
  | {
      status: "partial";
      workingCopyId: string;
      realizedPageIds: string[];
      blockedPageIds: string[];
      traceRef: VersionedRef<"zine-generation-trace">;
    }
  | {
      status: "blocked";
      code: string;
      message: string;
      traceRef?: VersionedRef<"zine-generation-trace">;
    };
```

The request contains exactly one of `planApprovalRef` or `provisionalSelectionRef`, plus a current budget approval and reservation. It contains exactly one job per plan page in plan order; a colophon job is deterministic and cannot consume an image job. Success/partial results preserve the same page IDs and order. A provider fallback may change execution path but not page function, count, claim/source refs, or order. If it cannot honor the plan, it returns `blocked`.

### Stage 8.75 — Freeze the reviewed candidate

```ts
interface FreezeZineCandidateRequest {
  workingCopyId: string;
  workingCopyHeadToken: string;
  workingCopyContentHash: string;
  planRef: VersionedRef<"zine-issue-plan">;
  parentArtifactRef?: VersionedRef<"zine-artifact-revision">;
  expectedArtifactHeadRef?: VersionedRef<"zine-artifact-revision">;
}

interface FreezeZineCandidateResult {
  artifactRef: VersionedRef<"zine-artifact-revision">;
  planRef: VersionedRef<"zine-issue-plan">;
  frozenWorkingCopyHash: string;
}
```

The freeze verifies CAS and creates immutable content without setting the artifact head. In Express, it first freezes an `approval-candidate` child plan from the provisional plan, then freezes the native artifact against that child. Guided/standard use the existing approval-candidate plan. All evaluations, snapshots, and proof in Stage 9 reference the returned artifact hash.

### Stage 9 — Realize and re-measure

After copy/layout realization and candidate freeze:

1. compute measured density, visual intensity, text-image ratio, alignment, accents, and asset fingerprints;
2. run copy compression;
3. run realized-stage deterministic rules and the semantic critic;
4. persist `ZineRealizationEvaluation`, copy/visual snapshots, and technical proof against the frozen artifact;
5. resolve any allowed finding through pre-proof rule-exception approval, override, and a new realization-evaluation revision;
6. create `ArtifactProofCandidate` with every applied override/approval and present that exact hash for copy, visual, and artifact-proof approval.

The Press later realizes a destination projection, runs projection composition/privacy/rights/technical evaluations, creates `ProjectionProofCandidate`, and requires projection-proof approval before publication.

---

## 9. Rhythm and sequence rules

### 9.1 Core rule set

```ts
interface ZineRuleEvaluationContext
  extends VersionedObjectEnvelope<"zine-rule-evaluation-context"> {
  targetRef: VersionedRef;
  editorialDirectionRef: VersionedRef;
  ruleSetVersion: string;
  contributionFingerprintVersion: string;
  pageOrder: string[];
  applicableOverrideRefs: VersionedRef<"editorial-rule-override">[];
  sourceRefsById: Record<string, VersionedRef>;
  assetRefsById: Record<string, VersionedRef<"zine-asset">>;
  compositionPolicy: {
    centeredComposition: {
      mode: "limited" | "pervasive";
      rationale?: string;
    };
    accentUsage: {
      neutralTokens: string[];
      accentTokens: string[];
      mode: "limited" | "pervasive";
      rationale?: string;
    };
  };
}
```

`contributionFingerprint` is SHA-256 over canonical JSON containing: contribution union records in declared order; sorted resolved claim/source/direction/asset refs (including revision and hash); central claim ID; normalized desired effect (Unicode NFC, trimmed, internal whitespace collapsed); grammar; and narrative/end-matter function. Its recipe is versioned by `contributionFingerprintVersion`. Deterministic validators always receive the exact `ZineRuleEvaluationContext`; absent inputs produce a schema blocker, never a guessed result.

| Code | Severity | Evaluator | Stage | Trigger | Default repair |
| --- | --- | --- | --- | --- | --- |
| `EARN-001` | blocker | deterministic | plan, realized | A page has an empty/malformed contribution tuple or a referenced basis does not exist | Remove, merge, or attach a real contribution |
| `EARN-002` | blocker | deterministic | plan, realized | Two pages have the same `contributionFingerprint`, claim/source/asset refs, target effect, and grammar | Remove or merge |
| `EARN-003` | warning | model-assisted | plan, realized | Pages are semantically redundant despite different exact fingerprints | Propose a cited merge |
| `ARC-001` | blocker | deterministic | plan, realized | The first editorial page is not an `invitation` or `orientation` threshold | Repair the opening |
| `ARC-002` | blocker | deterministic | plan, realized | The issue has no `revelation`, `evidence`, `complication`, `contrast`, `intensification`, or `application` page | Add earned development or choose another artifact form |
| `ARC-003` | blocker | deterministic | plan, realized | The final editorial page is neither `release` nor `residue` | Rewrite or reorder the ending |
| `ARC-004` | warning | deterministic | plan, realized | Seven or more editorial pages have no `complication` or `contrast` and no approved exception | Add a legitimate turn or approve the cited no-turn exception |
| `RHY-001` | warning | deterministic | plan, realized | Three consecutive editorial pages have density `>= 0.66` | Lower or move the middle/next page; insert an earned release |
| `RHY-002` | warning | deterministic | plan, realized | The same grammar appears more than twice consecutively | Change grammar or merge repeated pages |
| `RHY-003` | warning | deterministic | plan, realized | A page at density `>= 0.75` is not followed by a drop of at least `0.20`, an image-led ratio `<= 0.35`, or a declared pause | Create visual/spatial release |
| `RHY-004` | warning | deterministic | plan, realized | Seven or more editorial pages have no quiet interval | Add an earned pause or reduce an existing page |
| `RHY-005` | warning | deterministic | plan, realized | Adjacent pages both have intensity `>= 0.85` without an `intensification` transition | Reduce or separate |
| `RHY-006` | blocker | deterministic | plan, realized | A dark plate has no `darkPlateReason` or contribution basis | Remove dark treatment or add justified purpose |
| `RHY-007` | warning | deterministic | plan, realized | All three highest-intensity asset pages occur in the first 40% of the editorial page set | Move at least one after the midpoint |
| `RHY-008` | blocker | deterministic | realized, projection | The cover asset content and normalized transform fingerprints match an interior asset | Replace or create a distinct derivative |
| `RHY-010` | blocker | model-assisted | realized, projection | The ending claims resolution that contradicts cited uncertainty or open questions | Restore epistemic honesty |
| `NAR-001` | warning | deterministic | plan, realized | Three consecutive editorial pages share the same narrative function | Merge or develop the movement |
| `NAR-002` | blocker | model-assisted | plan, realized | A central conclusion precedes required evidence without a cited reveal rationale | Reorder or mark as a question |
| `NAR-003` | warning | model-assisted | plan, realized | Primary evidence first appears after application or release without a late-complication rationale | Move support earlier or reframe |
| `NAR-004` | warning | model-assisted | plan, realized | Visual variety increases while claims and effects do not develop | Revise the arc, not only layouts |
| `COMP-001` | warning | deterministic | realized, projection | More than two centered compositions appear consecutively | Change hierarchy/alignment |
| `COMP-002` | warning | deterministic | realized, projection | In six or more editorial pages, centered composition exceeds 40% while context mode is `limited`, or `pervasive` lacks rationale | Vary composition or record/approve intentional system |
| `COMP-003` | warning | deterministic | realized, projection | Accent appears on more than 35% of editorial pages while context mode is `limited`, or `pervasive` lacks rationale | Reduce accent or record/approve intentional system |
| `SPREAD-001` | blocker | deterministic | plan, projection | A page appears in multiple spread records | Repair spread membership |
| `SPREAD-002` | warning | deterministic | plan, projection | A spread lacks rationale/accessible summary or mobile order does not match its pages | Rewrite pairing or mobile bridge |

A quiet interval has target density `<= 0.35` and visual intensity `<= 0.45`, or uses `grammar: "pause"` with a named release function.

### 9.2 Measurement contract

All calculations clamp to `0..1` and round half away from zero to four decimal places.

Measured information density is:

```text
wordLoad    = min(1, wordCount / grammarWordBudget)
elementLoad = min(1, nonDecorativeElementCount / 8)
claimLoad   = min(1, distinctClaimCount / 3)
density     = 0.50 × wordLoad + 0.25 × elementLoad + 0.25 × claimLoad
```

Default grammar word budgets:

| Grammar | Words |
| --- | ---: |
| `cover-threshold` | 30 |
| `opening-note` | 90 |
| `claim-led` | 140 |
| `evidence-led` | 180 |
| `image-led` | 40 |
| `image-caption` | 60 |
| `split-argument` | 180 |
| `comparison` | 160 |
| `timeline` | 160 |
| `inventory` | 120 |
| `instruction` | 160 |
| `pause` | 30 |
| `colophon` | excluded from editorial density rules |

Measured text-image ratio is the union area of readable text boxes divided by the union area of readable text and non-decorative image boxes. If the denominator is zero, validation fails rather than returning a fabricated ratio.

Measured visual intensity is:

```text
intensity =
  0.35 × luminanceContrast +
  0.30 × dominantVisualArea +
  0.20 × accentCoverage +
  0.15 × layoutPressure
```

- `luminanceContrast` is normalized WCAG relative-luminance range across rendered foreground/background samples.
- `dominantVisualArea` is the largest non-decorative visual’s viewport fraction.
- `accentCoverage` is the viewport fraction using direction-declared accent tokens.
- `layoutPressure` is the clamped combination of non-decorative element count, overlap area, and rotation count; the runtime schema fixes those subweights with the rule-set version.

The three strongest asset pages are ranked by measured or target visual intensity descending, then stable page ID ascending for ties. “First 40%” means page number `<= ceil(editorialPageCount × 0.40)`.

`dominantAlignment: "center"` means centered readable text occupies more than 60% of readable text area. Accent rules run only when the Editorial Direction declares neutral and accent tokens.

### 9.3 Rule overrides

```ts
interface EditorialRuleExceptionRequest {
  id: string;
  ruleCode: string;
  findingFingerprint: string;
  scope: "page" | "spread" | "issue";
  pageIds?: string[];
  spreadIds?: string[];
  rationale: string;
  evidenceRefs: VersionedRef[];
  ruleSetVersion: string;
}

interface EditorialRuleOverride
  extends VersionedObjectEnvelope<"editorial-rule-override"> {
  targetRef: VersionedRef;
  exceptionRequestId?: string;
  findingFingerprint: string;
  approvalRef: VersionedRef<"approval">;
  ruleSetVersion: string;
}
```

Warnings and explicitly overridable editorial blockers require a pre-proof `ApprovalRecord` with `targetType: "rule-exception"` and the scope required by Section 13. The resulting `EditorialRuleOverride` is supplied to a new evaluation revision and remains visible in the private manifest. Rationale alone and later proof approval never authorize an exception. `EARN-001`, `EARN-002`, `ARC-001`, `ARC-002`, `ARC-003`, `RHY-006`, `RHY-008`, and `SPREAD-001` are non-waivable. Rights, privacy, missing-approval, corrupted-schema, and budget-authorization blockers are also non-waivable through this mechanism.

### 9.4 Cover reuse

The deterministic check compares the asset content hash plus normalized transform JSON (crop values rounded to `0.01`, rotation to `0.1°`, and canonical filter tokens). A semantic critic separately warns when nominally different transforms remain materially equivalent. A derivative may be valid when it has:

- a distinct crop or scale that changes the reading;
- annotation or juxtaposition that adds evidence;
- a substantial treatment tied to a narrative function;
- a new relationship inside a diptych.

The transform and rationale must be recorded in asset custody.

---

## 10. Editorial compression

Compression runs twice:

1. **Structural compression** before issue-plan approval.
2. **Copy compression** after copy drafting and before proof approval.

```ts
interface RepeatedClaim {
  claimIds: string[];
  pageIds: string[];
  canonicalMeaning: string;
  detection: "exact" | "semantic";
  rationale: string;
}

interface MissingTransition {
  fromPageId: string;
  toPageId: string;
  missingRelationship: string;
  suggestedBridge?: string;
}

interface CompressionResult {
  repeatedClaims: RepeatedClaim[];
  removablePages: string[];
  mergeCandidates: Array<[string, string]>;
  missingTransitions: MissingTransition[];
  splitCandidates: string[];
  beforePageCount: number;
  afterPageCount: number;
  removedWordCount?: number;
  decisionIds: string[];
}
```

### 10.1 Structural checks

Flag:

- repeated claims;
- synonymous signals that perform the same narrative job;
- decorative pages with no new function;
- recommendations already fully implied by the approved direction;
- two pages that can share one grammar and remain within density limits;
- one page carrying too many distinct claims or epistemic jobs;
- unsupported transitions.

### 10.2 Merge and split rules

Two pages are merge candidates when:

- they share the same central claim or one directly implies the other;
- neither introduces independent visual information;
- their combined measured or estimated density is `<= 0.80`;
- the merge preserves source attribution and epistemic labels.

A page is a split candidate when any two are true:

- measured density is `>= 0.85`;
- it contains more than two independently supported central claims;
- it mixes observation, inference, and projection without clear separation;
- it performs both evidence and application with no transition;
- its layout requires inaccessible text sizing or overflow.

Splitting is not automatic permission to increase issue length. Each resulting page must independently earn existence.

### 10.3 Authorship safety

- Compression never destroys the only copy of creator-authored text.
- Removed text remains recoverable through revision comparison.
- `assemble` mode may deduplicate arrangement but may not rewrite creator wording.
- `edit` mode may clarify and compress with copy diffs.
- `co-author`, `direct`, and `surprise-me` may generate connective language within their contracts.
- A semantic merge always records which claims and sources were combined.

### 10.4 Creator-facing result

Compression should be visible and inspectable without pretending there is one objective aesthetic score:

> Mimi found 3 repeated pages and proposes an 8-page revision.  
> Review the proposed removals.

After acceptance, Mimi may say “3 repeated pages removed · 8 pages remain.” The creator can inspect removed pages and restore one into a new revision.

---

## 11. Composition critic

```ts
type CritiqueEvidence =
  | { kind: "page"; pageId: string; field?: string }
  | { kind: "spread"; spreadId: string }
  | { kind: "claim"; claimId: string }
  | { kind: "rule"; ruleCode: string; measuredValue?: number }
  | { kind: "source"; sourceRef: VersionedRef; locator?: string };

interface CompositionCritique {
  id: string;
  targetRefs: VersionedRef[];
  severity: "note" | "warning" | "blocker";
  scope: "page" | "spread" | "issue";
  stage: "plan" | "realized" | "projection";
  code: string;
  findingFingerprint: string;
  message: string;
  suggestedFix?: string;
  pageIds?: string[];
  spreadIds?: string[];
  evidence: NonEmpty<CritiqueEvidence>;
  critic: "deterministic" | "model-assisted" | "human";
  ruleSetVersion: string;
  statusAtEvaluation: "open";
}
```

Example findings:

- Page 04 repeats Page 03’s hierarchy.
- The issue contains no quiet interval.
- Five pages use centered compositions.
- The reading is repeated rather than developed.
- The strongest evidence appears after the conclusion.
- The red accent appears on four pages.
- The issue has visual variety but no narrative escalation.

### 11.1 Critic responsibilities

The critic evaluates:

- narrative development;
- evidence order;
- repetition and hierarchy;
- pacing and release;
- spread relationships;
- composition variety;
- visual escalation;
- emotional ending;
- page-earning evidence.

It does not evaluate:

- file upload success;
- PDF parseability;
- bleed;
- image decode failures;
- missing persisted fields;
- publication rights.

Those belong to technical proof or publication policy.

### 11.2 Critic execution

1. Deterministic checks always run first.
2. At plan stage, the critic evaluates narrative, evidence, contribution, and proposed rhythm only; geometry-dependent checks are skipped.
3. At realized/projection stage, it receives immutable rendered-page summaries and bounded provenance—not unrelated private memory.
4. It must cite page, spread, claim, or rule evidence for every warning or blocker.
5. It emits patch suggestions, never silent mutations.
6. Accepted patches create `EditorialDecision` records.
7. Critique results are private diagnostics by default and do not appear in the public reader.

```ts
interface EditorialDecision
  extends VersionedObjectEnvelope<"editorial-decision"> {
  artifactId: string;
  targetRef: VersionedRef;
  kind:
    | "add-page"
    | "remove-page"
    | "merge-pages"
    | "split-page"
    | "reorder"
    | "change-grammar"
    | "change-copy"
    | "replace-asset"
    | "rights-remedy"
    | "rule-override";
  rationale: string;
  inputRefs: VersionedRef[];
  originatingEvaluationRef?: VersionedRef;
  findingFingerprint?: string;
  actor: "mimi" | "creator" | "collaborator";
  actorId?: string;
}
```

---

## 12. Authorship controls

```ts
type AuthorshipMode =
  | "assemble"
  | "edit"
  | "co-author"
  | "direct"
  | "surprise-me";
```

| Mode | Mimi may do | Mimi may not do |
| --- | --- | --- |
| `assemble` | Select, order, caption with neutral labels, and pair material | Rewrite creator language or add interpretation |
| `edit` | Lightly compress, clarify, and write transitions | Introduce a new thesis without approval |
| `co-author` | Draft connective editorial language and propose interpretations | Erase attribution or uncertainty |
| `direct` | Propose a strong thesis, structure, contrast, and visual direction | Treat proposals as creator-approved memory |
| `surprise-me` | Make larger narrative and visual departures within rights, safety, budget, and explicit constraints | Bypass source, plan, proof, or publication approvals |

Rules:

1. Authorship mode is selected per new issue and stored in every schema-v2 revision; migrated legacy work remains `unclassified` until a creator makes a new revision.
2. Changing the mode after plan approval creates a new plan revision.
3. Protected creator quotations are never rewritten.
4. The colophon states the mode in readable language.
5. All modes preserve evidence/inference separation.
6. “Surprise me” expands variation, not authority.

---

## 13. Approval system

### 13.1 Approval layers

```ts
type ArtifactApprovalTargetType =
  | "source-packet"
  | "reading"
  | "direction"
  | "issue-plan"
  | "copy"
  | "visuals"
  | "proof";

type ApprovalTargetType =
  | ArtifactApprovalTargetType
  | "generation-budget"
  | "provisional-input-selection"
  | "rule-exception"
  | "artifact-extraction-item"
  | "memory-atom";

interface CopySnapshot
  extends VersionedObjectEnvelope<"zine-copy-snapshot"> {
  artifactRef: VersionedRef<"zine-artifact-revision">;
  targetDigest: string;
  orderedTextBlocks: Array<{
    pageId: string;
    blockId: string;
    role: string;
    content: string;
  }>;
  claimRefs: EditorialClaimRef[];
}

interface VisualSnapshot
  extends VersionedObjectEnvelope<"zine-visual-snapshot"> {
  artifactRef: VersionedRef<"zine-artifact-revision">;
  targetDigest: string;
  pageVisualDigests: Record<string, string>;
  assetPlacements: Array<{ pageId: string; placement: AssetPlacement }>;
  layoutDigests: Record<string, string>;
}

interface TechnicalProofEvaluation
  extends VersionedObjectEnvelope<"zine-technical-proof-evaluation"> {
  targetRef: VersionedRef;
  result: "pass" | "warning" | "fail";
  diagnostics: Array<{
    code: string;
    severity: "note" | "warning" | "blocker";
    message: string;
  }>;
  rendererVersion: string;
  inputDigest: string;
}

interface ArtifactProofCandidate
  extends VersionedObjectEnvelope<"zine-artifact-proof-candidate"> {
  proofKind: "artifact-proof";
  artifactRef: VersionedRef<"zine-artifact-revision">;
  copySnapshotRef: VersionedRef<"zine-copy-snapshot">;
  visualSnapshotRef: VersionedRef<"zine-visual-snapshot">;
  realizationEvaluationRef: VersionedRef<"zine-realization-evaluation">;
  technicalProofRef: VersionedRef<"zine-technical-proof-evaluation">;
  ruleOverrideRefs: VersionedRef<"editorial-rule-override">[];
  ruleExceptionApprovalRefs: VersionedRef<"approval">[];
}

interface ProjectionProofCandidate
  extends VersionedObjectEnvelope<"zine-projection-proof-candidate"> {
  proofKind: "projection-proof";
  artifactRef: VersionedRef<"zine-artifact-revision">;
  projectionContentRef: VersionedRef<"zine-output-projection-content">;
  artifactProofRef: VersionedRef<"zine-artifact-proof-candidate">;
  artifactProofApprovalRef: VersionedRef<"approval">;
  projectionCompositionEvaluationRef: VersionedRef<"zine-projection-composition-evaluation">;
  technicalProofRef: VersionedRef<"zine-technical-proof-evaluation">;
  privacyEvaluationRef: VersionedRef<"zine-privacy-evaluation">;
  assetUseEvaluationRefs: VersionedRef<"zine-asset-use-evaluation">[];
  ruleOverrideRefs: VersionedRef<"editorial-rule-override">[];
  ruleExceptionApprovalRefs: VersionedRef<"approval">[];
  destinationDigest: string;
}

type ProofCandidate =
  | ArtifactProofCandidate
  | ProjectionProofCandidate;

interface ApprovalRecord
  extends VersionedObjectEnvelope<"approval"> {
  artifactId: string;
  targetType: ApprovalTargetType;
  targetRef: VersionedRef;
  targetDigest: string;
  decision: "approved" | "rejected" | "revoked";
  scope: "task-use" | "artifact-content" | "projection" | "reusable-memory";
  dependencyRefs: VersionedRef[];
  dependencyDigest: string;
  decidedAt: number;
  approvedAt?: number;
  actorId: string;
  actorRole: "creator" | "editor" | "reviewer" | "publisher";
  workflow: ApprovalWorkflow;
  bundleId?: string;
  rationale?: string;
  supersedesApprovalId?: string;
}

interface ApprovalEvaluation {
  approvalRef: VersionedRef;
  status: "current" | "stale" | "revoked" | "rejected";
  reason?: string;
  evaluatedAgainst: VersionedRef[];
  evaluatedAt: number;
}
```

All hashes use SHA-256 over RFC 8785 canonical JSON. Envelope `contentHash` binds the full object, including `artifactRef`. Snapshot `targetDigest` is a separate semantic subset: copy hashes ordered textual/claim content; visuals hash layout, placements, custody, alt/decorative semantics, and realized assets. Approval records store the relevant `targetDigest`. A new snapshot bound to a child artifact may carry a prior copy/visual approval only when its target digest and every scope-relevant dependency digest are identical; the `ApprovalEvaluation` records both old and new refs. Proof approvals never carry forward: their target digest is the exact proof-candidate content hash.

Issue-plan approval includes the matching `ZinePlanEvaluation`, every applied override, and each override’s pre-proof rule-exception approval in `dependencyRefs`. Artifact/projection proof candidates pin the applicable overrides and approvals from their evaluations. Proof approval cannot create or retroactively authorize an exception. A changed input hash requires a new snapshot/candidate; selective approvals remain valid only when their own snapshot and dependencies are unchanged.

Approval records are immutable decisions. Current/stale status is derived by comparing target and dependency digests; invalidation is recorded as an event, never by editing the approval.

| Change | Becomes stale |
| --- | --- |
| Source packet content, task permission, or privacy | Reading, direction, plan, copy, visuals, proof |
| Reading | Direction, plan, copy, visuals, proof |
| Editorial Direction or authorship mode | Plan, copy, visuals, proof |
| Plan sequence, page function, claims, sources, or spread relationship | Plan, copy, visuals, proof |
| Copy | Copy and proof |
| Asset, layout geometry, alt text, or visual custody | Visuals and proof |
| Rights/use grant or destination policy | Projection proof/publication eligibility only, unless the source itself changed |
| Projection selection, order, or transformation | Projection proof |

Today’s `UsedContextEntry.approved` boolean remains a compatibility generation gate; it is not by itself the durable task-scoped Approval contract above.

### 13.2 Workflow modes

```ts
type ApprovalWorkflow =
  | "guided"
  | "standard"
  | "express";
```

| Workflow | Creator experience | Durable records |
| --- | --- | --- |
| `guided` | Exposes all seven gates | One explicit record per target |
| `standard` | Groups sources; reading + direction; plan + copy + visuals; final proof | Distinct target records sharing bundle IDs |
| `express` | Produces a complete draft, then presents one scoped final review | Distinct target records created by one explicit bundle action |

Express approval is not passive acceptance:

1. Explicit input selection creates a quarantined provisional plan and CAS-protected working copy.
2. Realization writes only to that working copy.
3. Before review, Mimi freezes the `approval-candidate` child plan and one immutable native candidate artifact, then creates realization evaluation, copy/visual snapshots, technical proof, and `ArtifactProofCandidate` against that exact artifact hash.
4. The final review names every task/artifact/projection scope being approved and shows the immutable proof hash.
5. One transaction re-verifies selection, working-copy/candidate, proof, and dependency hashes; writes distinct target approvals with a shared bundle ID; and appends the head/lifecycle event. It creates no different plan or artifact content.
6. A concurrent dependency change aborts the transaction with no partial approvals or head change.
7. Any repair creates a child working copy, candidate revision, evaluation, snapshots, and proof.
8. No public projection, publication, or reusable-memory write occurs before approval.
9. Reusable memory always requires a separate `scope: "reusable-memory"` approval.

### 13.3 Publication gate

Required scope is not interchangeable:

| Target | Required scope | What it authorizes |
| --- | --- | --- |
| Source packet, reading, direction | `task-use` | Use exact versions in this issue workflow |
| Generation budget, provisional selection | `task-use` | Private realization within approved cost/context bounds |
| Issue plan, copy, visuals | `artifact-content` | Freeze those exact snapshots into this artifact |
| Rule exception | `artifact-content` | Accept one identified finding for this artifact only |
| Artifact proof | `artifact-content` | Approve one immutable candidate after copy, visual, editorial, and technical evaluation |
| Projection proof | `projection` | Release one exact projection-content hash and destination digest after privacy, composition, rights, and technical evaluation |
| Extraction item, memory atom | `reusable-memory` | Promote only the approved item into the target knowledge scope |

A `task-use` approval can permit private realization but never satisfies artifact-content, projection/publication, or reusable-memory gates.

Public projection requires current:

- source-packet permission for this artifact;
- issue-plan approval;
- copy approval;
- visual approval;
- artifact-proof approval for the source revision;
- projection-proof approval for the exact destination/content hash;
- destination-policy eligibility for every reproduced asset;
- publication disclosure/consent where applicable.

---

## 14. Provenance and colophon

Private provenance and public colophon are separate projections of the same revision.

```ts
type ColophonSourceType =
  | "note"
  | "screenshot"
  | "pinterest-board"
  | "image"
  | "link"
  | "document"
  | "approved-memory-atom"
  | "other";

interface ColophonSourceCount {
  sourceType: ColophonSourceType;
  otherLabel?: string;
  uniqueCount: number;
  publiclyReproducedCount: number;
  privateInfluenceCount: number;
}

interface PrivateProvenanceManifest
  extends VersionedObjectEnvelope<"zine-private-provenance-manifest"> {
  artifactRef: VersionedRef;
  issuePlanRef: VersionedRef;
  contextPacketRef: VersionedRef;
  usedContextRecordRef: VersionedRef;
  sourceRefs: VersionedRef[];
  claimRefs: EditorialClaimRef[];
  assetCustodyRefs: VersionedRef[];
  approvalRefs: VersionedRef[];
  decisionRefs: VersionedRef[];
  realizationEvaluationRefs: VersionedRef[];
  exportConfiguration: Record<string, unknown>;
}

interface PublicColophonProjection
  extends VersionedObjectEnvelope<"zine-public-colophon"> {
  artifactId: string;
  sourceArtifactRef: VersionedRef<"zine-artifact-revision">;
  title: string;
  creatorDisplay: string;
  mimiCredit: string;
  generatedAt: number;
  authorshipMode: AuthorshipMode | "unclassified";
  sourceCounts: ColophonSourceCount[];
  epistemicCounts: Partial<Record<EpistemicStatus, number>>;
  visualProduction: {
    sourceImages: number;
    developedPlates: number;
    generatedIllustrations: number;
  };
  privacyStatement?: string;
  policySummary: {
    eligibleToReproduce: number;
    linkOnly: number;
    privateOnly: number;
    blocked: number;
  };
  publicProvenanceDigest: string;
}

type PublicColophonPayload = Pick<
  PublicColophonProjection,
  | "artifactId"
  | "title"
  | "creatorDisplay"
  | "mimiCredit"
  | "generatedAt"
  | "authorshipMode"
  | "sourceCounts"
  | "epistemicCounts"
  | "visualProduction"
  | "privacyStatement"
  | "policySummary"
  | "publicProvenanceDigest"
>;
```

Example:

```text
Created by Ava with Mimi
Issue revision 04
Generated August 2, 2026
Authorship: Co-author

Built from
4 notes
2 screenshots
1 Pinterest board
3 approved memory atoms

Interpretive status
6 observations
4 inferences
1 projection

Visual production
3 source images
2 developed plates
1 generated illustration

Privacy
Private sources shaped this issue but are not publicly reproduced.
```

### Colophon rules

1. Counts use unique canonical IDs within the source packet; one source is counted once even if cited on several pages.
2. Private source titles, excerpts, URLs, thumbnails, and atom content are excluded from the public colophon.
3. Public source notes may show attribution only when publication policy permits it.
4. Zero epistemic categories are omitted in public display but remain explicit in the private manifest.
5. Blocked/private assets are counted without revealing their identity.
6. Legacy issues show “Authorship mode not recorded” until the creator selects a mode in a new revision.
7. The machine manifest retains exact IDs and versions only within an authorized private export.
8. The public reader shows a quiet public colophon; The Press exposes the full private manifest to the creator.
9. Existing manifest data—artifact identity, creator, Used Context, compile ownership, overlays, page summaries, export mode, and diagnostics—feeds this design rather than remaining hidden metadata.

### Private Used Context colophon

The private Studio, The Edit, and publish-review surfaces retain an always-visible, expandable Used Context colophon during migration:

- mixed-state counts show approved and pending separately;
- review supports approve, remove, and open evidence;
- long lists collapse visually without hiding state;
- the exact empty state is: **“No approved context — Mimi will not invent sources.”**

The public colophon is a separately sanitized projection and never exposes the private review controls or source bodies.

Manifest builders must be pure functions of an immutable artifact revision and explicit projection inputs. They may not inject a user-scoped pending compile at export time. ZIP exports must not add raw `usedContextSnapshots` beside a sanitized manifest.

---

## 15. Rights and source custody

```ts
type AssetRights =
  | "user-owned"
  | "licensed"
  | "public-domain"
  | "editorial-reference"
  | "generated"
  | "unknown";

type AssetOrigin =
  | "user-upload"
  | "external-source"
  | "generated"
  | "derived";

type RightsClaim =
  | "user-owned"
  | "licensed"
  | "public-domain"
  | "unknown";

type AssetUsePolicy =
  | "reproduce"
  | "link-only"
  | "private-analysis-only"
  | "blocked";

interface AssetUseGrant
  extends VersionedObjectEnvelope<"zine-asset-use-grant"> {
  assetRef: VersionedRef<"zine-asset">;
  custodyRef: VersionedRef<"zine-asset-custody">;
  destinationVariants: ZineOutputVariant[];
  visibility: "private" | "unlisted" | "public";
  allowedMedia: string[];
  territories: string[];
  startsAt?: number;
  expiresAt?: number;
  derivativeUse: "allowed" | "not-allowed" | "unknown";
  attributionRequired: boolean;
  attributionText?: string;
  licenseOrPolicyRef?: string;
  privacyOrPublicityReleaseRef?: string;
  basis: string;
  assertedBy: string;
  assertedAt: number;
}

interface AssetUseGrantRevocation
  extends VersionedObjectEnvelope<"zine-asset-use-grant-revocation"> {
  grantRef: VersionedRef<"zine-asset-use-grant">;
  reason: string;
  revokedAt: number;
  revokedBy: string;
}

interface ZineAssetCustody
  extends VersionedObjectEnvelope<"zine-asset-custody"> {
  assetId: string;
  sourceObjectRef?: VersionedRef;
  origin: AssetOrigin;
  /** Compatibility/import label; canonical enforcement uses the decomposed fields below. */
  rights: AssetRights;
  rightsClaim: RightsClaim;
  defaultUsePolicy: AssetUsePolicy;
  rightsBasis?: string;
  sourceUrl?: string;
  attribution?: string;
  licenseUrl?: string;
  private: boolean;
  derivativeOfAssetRefs: VersionedRef<"zine-asset">[];
  transformDescription?: string;
  providerPolicyVersion?: string;
  privacyOrPublicityReleaseRequired: boolean;
}

interface AssetUseEvaluation
  extends VersionedObjectEnvelope<"zine-asset-use-evaluation"> {
  assetRef: VersionedRef<"zine-asset">;
  custodyRef: VersionedRef<"zine-asset-custody">;
  projectionContentRef: VersionedRef<"zine-output-projection-content">;
  result: "eligible" | "link-only" | "private-only" | "blocked";
  grantRef?: VersionedRef<"zine-asset-use-grant">;
  reasons: string[];
  policyVersion: string;
  inputDigest: string;
}
```

`AssetRights` is the requested creator-facing/import classification. Enforcement decomposes it because `generated` is an origin, while `editorial-reference` is a use policy—not a legal ownership claim.

Runtime normalization must map the compatibility label into canonical fields once, then validate them. Conflicting records—such as `private: true` with a public reproduction grant, `rights: "unknown"` with `rightsClaim: "user-owned"` but no new assertion, an expired/revoked grant, or a required release with no release reference—are blocked rather than resolved optimistically.

### Public export policy

| Compatibility label | Default policy behavior |
| --- | --- |
| `user-owned` | Potentially eligible when a destination grant and any needed releases exist |
| `licensed` | Eligible only within recorded destination, media, territory, term, derivative, and attribution constraints |
| `public-domain` | Potentially eligible with source metadata and any separate privacy/publicity constraints |
| `editorial-reference` | Do not reproduce by default; permit a link-only source note |
| `generated` | Evaluate provider policy, source lineage, destination, and releases; origin alone grants no assurance |
| `unknown` | Block reproduction |

Attribution does not cure unknown publication rights. “Publish with linked attribution” is available only when it means **do not reproduce the asset** and the destination policy allows a link/source note. The UI must not imply that adding a credit licenses an image.

For unknown or reference-only assets, offer:

- replace the asset;
- publish a link-only source note without reproducing it;
- keep the issue private;
- attach a documented rights basis.

Pinterest pins, Instagram posts, screenshots, fashion photography, editorial scans, and mood-board images default to `editorial-reference` or `unknown` unless custody proves otherwise. Validity for private analysis is not permission for public republication.

Generated or transformed work does not automatically erase source rights. Derivatives inherit source custody until destination policy evaluates every ancestor. These fields express Mimi’s publication policy eligibility, not legal advice or a guarantee of ownership.

---

## 16. Output projections from one master issue

```ts
type ZineOutputVariant =
  | "reader"
  | "archival-pdf"
  | "print-pdf"
  | "carousel"
  | "story"
  | "web-essay"
  | "press-sheet"
  | "portfolio-case-study"
  | "context-pack";

type ProjectionRule =
  | { id: string; type: "select-pages"; pageIds: string[] }
  | { id: string; type: "reorder-for-format"; pageIds: string[] }
  | { id: string; type: "crop"; aspectRatio: string }
  | { id: string; type: "expand-copy"; pageIds: string[] }
  | { id: string; type: "compress-copy"; maxWords: number }
  | { id: string; type: "include-provenance"; level: "public" | "private" }
  | { id: string; type: "apply-print-profile"; bleedMm: number; colorProfile?: string }
  | { id: string; type: "hide-private-diagnostics" };

interface OutputProjection
  extends VersionedObjectEnvelope<"zine-output-projection-recipe"> {
  artifactId: string;
  variant: ZineOutputVariant;
  sourceArtifactRef: VersionedRef<"zine-artifact-revision">;
  destination: {
    visibility: "private" | "unlisted" | "public";
    channel?: string;
    locale?: string;
  };
  selectedPageIds: string[];
  /** Applied in array order; later rules consume the preceding rule's result. */
  transformationRules: ProjectionRule[];
}

interface ProjectedPageSnapshot {
  id: string;
  sourcePageIds: NonEmpty<string>;
  order: number;
  page: ZinePageSpecV2;
  operationIds: string[];
  contentHash: string;
}

interface OutputProjectionContent
  extends VersionedObjectEnvelope<"zine-output-projection-content"> {
  recipeRef: VersionedRef<"zine-output-projection-recipe">;
  sourceArtifactRef: VersionedRef<"zine-artifact-revision">;
  pages: ProjectedPageSnapshot[];
  sourceToOutputPageIds: Record<string, string[]>;
  copyChanges: Array<{
    sourcePageId: string;
    outputPageId: string;
    beforeHash: string;
    afterHash: string;
  }>;
  privateManifestRef: VersionedRef<"zine-private-provenance-manifest">;
  publicColophonRef?: VersionedRef<"zine-public-colophon">;
  outputs: Array<{
    mediaType: string;
    contentHash: string;
    byteSize: number;
    storageRef?: string;
  }>;
}

interface ZinePrivacyEvaluation
  extends VersionedObjectEnvelope<"zine-privacy-evaluation"> {
  projectionContentRef: VersionedRef<"zine-output-projection-content">;
  inputDigest: string;
  policyVersion: string;
  result: "pass" | "warning" | "blocked";
  findings: Array<{ code: string; message: string; sourceRef?: VersionedRef }>;
}

interface ProjectionCompositionEvaluation
  extends VersionedObjectEnvelope<"zine-projection-composition-evaluation"> {
  projectionContentRef: VersionedRef<"zine-output-projection-content">;
  inputDigest: string;
  ruleSetVersion: string;
  result: "pass" | "warning" | "blocked";
  critiques: CompositionCritique[];
  appliedOverrideRefs: VersionedRef<"editorial-rule-override">[];
}

interface ProjectionPublicationEvent
  extends VersionedObjectEnvelope<"zine-projection-publication-event"> {
  projectionContentRef: VersionedRef<"zine-output-projection-content">;
  action: "publish" | "withdraw";
  proofApprovalRef: VersionedRef<"approval">;
  privacyEvaluationRef: VersionedRef<"zine-privacy-evaluation">;
  compositionEvaluationRef: VersionedRef<"zine-projection-composition-evaluation">;
  assetUseEvaluationRefs: VersionedRef<"zine-asset-use-evaluation">[];
  disclosureConsentRef?: VersionedRef;
  sequence: number;
  occurredAt: number;
  actorId: string;
}

type PublicPageBlock =
  | {
      id: string;
      type: "text";
      role: string;
      content: string;
    }
  | {
      id: string;
      type: "image";
      role: string;
      publicAssetUrl: string;
      assetContentHash: string;
      altText?: string;
      decorative: boolean;
    }
  | {
      id: string;
      type: "colophon";
      colophon: PublicColophonPayload;
    };

interface PublicProjectedPage {
  id: string;
  order: number;
  kind: "cover" | "content" | "pause" | "colophon";
  sectionType: ZineSectionType;
  narrativeFunction?: NarrativeFunction;
  endMatterFunction?: "provenance";
  blocks: PublicPageBlock[];
  elementReadingOrder: string[];
  layoutElements: EditorElementV2[];
}

interface PublicOutputProjectionPayload {
  schemaVersion: number;
  projectionId: string;
  projectionRevision: number;
  projectionContentHash: string;
  publicationEventId: string;
  publicationSequence: number;
  sourceArtifactId: string;
  sourceArtifactRevision: number;
  variant: Exclude<ZineOutputVariant, "context-pack">;
  title: string;
  creatorDisplay: string;
  pages: PublicProjectedPage[];
  spreads: Array<{
    id: string;
    pageIds: string[];
    relationship?: ZineSpreadRelationship;
    accessibleSummary: string;
    mobileReadingOrder: string[];
  }>;
  allowedReaderModes: ReaderMode[];
  publishedAt: number;
}
```

The Press owns projections.

Rules:

1. A projection recipe and its realized content never mutate the master revision.
2. Any recipe change creates a new envelope `revision`; operation order is normative.
3. Realization stores transformed page snapshots, source mappings, copy hashes, operation IDs, and output hashes so the result is reproducible and diffable.
4. It preserves source page IDs, narrative functions, and spread relationships where applicable.
5. Selection, reordering, crop, copy transformation, destination, or visibility changes produce a new recipe/content revision and require a new `ProjectionProofCandidate`.
6. A carousel selects essential moments; it does not simply take the first six pages.
7. A web essay may expand transitions and source notes.
8. A print PDF may add bleed and print-safe typography.
9. A context pack extracts only approved claims, signals, and direction.
10. A portfolio case study may reveal approved process material.
11. A public reader hides private diagnostics and private source details.
12. Publication state is derived from append-only publication events using the server-assigned monotonic `sequence` under compare-and-set. Withdrawal creates an event; neither recipe nor content is edited.

Each projection runs rights, privacy, and composition checks against its destination. A valid master issue does not guarantee every projection is valid.

Variant invariants are runtime schemas: carousel/story require an ordered subset with retained threshold and residue; print requires page-size/bleed profile and explicit mechanical blanks; context pack contains no unapproved claim; public variants require a public colophon and private-diagnostic removal.

Allowed projection findings use the same pre-proof sequence: rule-exception approval → override → new projection-evaluation revision → projection proof. A `publish` event is valid only when its approval has `scope: "projection"` and targets a `ProjectionProofCandidate` whose projection-content ref and destination digest match the event, every evaluation targets the same content hash, the candidate links a current artifact proof, all blockers are absent, all overrides/approvals are pinned, and disclosure consent is current. Current publication state is the fold of valid events by `sequence`.

`PublicOutputProjectionPayload` is the only zine transport accepted by Sovereign/public readers. It contains no private manifest, Context Packet, Used Context body/ref, custody/grant record, diagnostics, annotation, reviewer, budget, trace, internal project ID, or private storage reference. The publication transaction derives it from validated content, includes sanitized spread/mobile-order snapshots, and rejects any image without a public URL and eligible destination evaluation.

---

## 17. Artifact re-entry

Published and archived zines can become future context, but extraction is always a proposal until approved.

```ts
interface VersionedPageRef {
  artifactRef: VersionedRef<"zine-artifact-revision">;
  pageId: string;
}

interface ArtifactExtractionItemBase {
  id: string;
  sourcePageRefs: NonEmpty<VersionedPageRef>;
  targetProjectId: string;
  authorizationScope: "owner-private" | "public-projection";
}

type ArtifactExtractionItem =
  | (ArtifactExtractionItemBase & {
      targetType: "signal";
      draft: {
        label: string;
        statement: string;
        certainty: EpistemicStatus;
      };
    })
  | (ArtifactExtractionItemBase & {
      targetType: "editorial-direction";
      draft: {
        thesis: string;
        applications: string[];
        exclusions: string[];
      };
    })
  | (ArtifactExtractionItemBase & {
      targetType: "asset";
      assetCustodyRef: VersionedRef;
    })
  | (ArtifactExtractionItemBase & {
      targetType: "memory-atom";
      draft: {
        atomType: string;
        content: string;
        evidenceRefs: VersionedRef[];
        inference?: string;
      };
    });

interface ArtifactExtraction
  extends VersionedObjectEnvelope<"artifact-extraction"> {
  sourceArtifactId: string;
  sourceArtifactRef: VersionedRef<"zine-artifact-revision">;
  sourceProjectionRef?: VersionedRef<"zine-output-projection-content">;
  items: ArtifactExtractionItem[];
  excludedItemIds: string[];
  exclusionReasons: string[];
}

interface ArtifactExtractionDecision
  extends VersionedObjectEnvelope<"artifact-extraction-decision"> {
  extractionRef: VersionedRef<"artifact-extraction">;
  itemId: string;
  decision: "approved" | "rejected";
  approvalRef?: VersionedRef<"approval">;
  decidedBy: string;
  rationale?: string;
}
```

Supported flows:

- zine → proposed approved signals → Tailor;
- zine page → Pocket;
- zine direction → new Worktable dossier;
- zine comparison → Diagnostics;
- zine excerpt → Proscenium;
- archived issue → Stand.

Rules:

1. Extraction records source artifact, revision, page IDs, authorization scope, and target project per item.
2. Item decisions are append-only. Aggregate status (`proposed | partially-approved | approved | rejected`) is derived by folding them; partial approval never obscures which items passed.
3. No extracted signal, direction, or atom enters reusable memory without its item approval.
4. Saving a page to Pocket preserves its page and artifact provenance.
5. Re-entry from a public artifact can use only public projection data unless the owner authorizes private context.
6. An extracted asset retains original rights and custody.
7. Re-entry never treats Mimi-generated interpretation as source evidence.

---

## 18. Comparative intelligence

Mimi may compare an issue with:

- the creator’s prior issue revisions;
- the creator’s previous zines;
- the active Tailor profile;
- approved aesthetic drift diagnostics;
- repeated motifs, claims, grammars, and compositions.

```ts
interface ComparativeIssueRead
  extends VersionedObjectEnvelope<"zine-comparative-issue-read"> {
  artifactId: string;
  sourceArtifactRef: VersionedRef<"zine-artifact-revision">;
  comparisonRefs: VersionedRef[];
  profileRef?: VersionedRef;
  authorizationScope: "owner-private" | "public-only";
  excludedRefs: VersionedRef[];
  coverageNotes: string[];
  newDepartures: string[];
  repeatedPatterns: string[];
  contradictions: string[];
  possibleDrift: string[];
  evidence: Array<{
    statement: string;
    sourcePageRefs: NonEmpty<VersionedPageRef>;
  }>;
  status: "complete" | "partial" | "insufficient-history";
}
```

Example:

```text
Compared with your previous five issues

New
• denser evidence structure
• colder image treatment
• stronger geographic framing

Repeated
• centered botanical hero
• “quiet” as a primary descriptor
• black plate before conclusion

Possible drift
The layout is becoming more austere than your approved profile.
```

Rules:

1. Comparative findings cite artifact and page IDs.
2. “Drift” is a proposed interpretation, not a diagnosis or automatic correction.
3. Insufficient history produces `insufficient-history`, not invented trend language.
4. Comparisons use the creator’s own authorized artifacts by default.
5. Collective intelligence never silently enters the personal Tailor profile.
6. A comparison does not update memory or the Taste Graph without approval.

---

## 19. Collaboration and editorial notes

```ts
interface ZineAnnotation {
  id: string;
  artifactId: string;
  revision: number;
  pageId?: string;
  elementId?: string;
  authorId: string;
  body: string;
  visibility: "owner-only" | "review-team";
  status: "open" | "resolved";
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
}

interface ZineReviewerGrant {
  id: string;
  artifactId: string;
  reviewerId: string;
  role: "commenter" | "suggesting-editor" | "approver";
  scopes: ApprovalTargetType[];
  createdBy: string;
  expiresAt?: number;
  revokedAt?: number;
}

interface ZineProofLink {
  id: string;
  artifactRef: VersionedRef;
  projectionRef?: VersionedRef;
  tokenHash: string;
  permissions: Array<"read" | "comment" | "suggest">;
  expiresAt: number;
  revokedAt?: number;
  createdBy: string;
}

interface ZineSuggestedEdit {
  id: string;
  artifactRef: VersionedRef;
  pageId: string;
  elementId?: string;
  fieldPath: string;
  beforeHash: string;
  replacement: string;
  authorId: string;
  status: "open" | "accepted" | "rejected" | "stale";
  createdAt: number;
}
```

Support:

- private comments;
- page and element annotations;
- suggested edits;
- named reviewers;
- scoped approvals;
- shareable proof links;
- comment resolution;
- revision comparison.

Rules:

1. An annotation is never page content unless deliberately promoted through an edit action.
2. Proof links are scoped, expiring, and read/comment-only by default.
3. Reviewers cannot publish unless separately authorized.
4. Deleting or replacing a target does not delete its annotations; they become detached history on the revision.
5. Resolving a comment does not imply approval.
6. Public readers never receive private annotations.
7. Annotation bodies are runtime-limited to 4,000 characters and sanitized as plain text.
8. Proof-link tokens are stored hashed, expire, can be revoked, and never grant publication by default.
9. Accepting a suggestion verifies `beforeHash`; a mismatch marks it stale instead of overwriting newer work.
10. Element-level annotations and geometry diffs require persisted stable element IDs. Randomly regenerated default-layout IDs are non-canonical.

---

## 20. Version comparison

```ts
type ZineRevisionChange =
  | {
      kind: "copy";
      pageId: string;
      fieldPath: string;
      before: string;
      after: string;
      actor: "creator" | "mimi" | "collaborator";
    }
  | {
      kind: "page-order";
      pageId: string;
      fromIndex: number;
      toIndex: number;
    }
  | {
      kind: "asset";
      pageId: string;
      beforeAssetRef?: VersionedRef;
      afterAssetRef?: VersionedRef;
      custodyChanged: boolean;
    }
  | {
      kind: "layout";
      pageId: string;
      elementId: string;
      beforeGeometry?: Record<string, number | string>;
      afterGeometry?: Record<string, number | string>;
    }
  | {
      kind: "provenance";
      action: "added" | "removed" | "privacy-changed" | "version-changed";
      beforeRef?: VersionedRef;
      afterRef?: VersionedRef;
    }
  | {
      kind: "publication";
      projectionRef: VersionedRef;
      field: "visibility" | "destination" | "state" | "consent";
      before: string;
      after: string;
    }
  | {
      kind: "approval";
      approvalRef: VersionedRef;
      change: "added" | "revoked" | "became-stale" | "superseded";
      reason?: string;
    };

interface ZineRevisionDiff {
  artifactId: string;
  fromRevision: number;
  toRevision: number;
  changes: ZineRevisionChange[];
  summary: string[];
}
```

The creator-facing summary should say:

```text
Revision 03 → Revision 04

Changed
• Cover image
• Pages 5 and 6 reordered
• Reading shortened by 82 words
• “Quiet luxury” removed from direction
• One evidence source made private
```

Requirements:

- copy diffs distinguish creator and Mimi edits;
- page reorder uses stable page IDs;
- asset replacement shows custody and rights change;
- layout diff summarizes geometry, not raw JSON only;
- provenance and privacy changes are first-class;
- publication-setting changes are auditable;
- approval invalidation appears in the diff;
- restoring old content creates a new revision instead of rewriting history.

---

## 21. Public reader

```ts
type ReaderMode =
  | "continuous"
  | "paged"
  | "spread";
```

The public reader includes:

- a cover threshold;
- continuous or paged reading;
- restrained progress;
- optional table of contents;
- keyboard and swipe navigation;
- public source notes;
- creator identity;
- issue metadata and colophon;
- save or subscribe;
- share a specific page;
- optional ambient sound only when explicitly enabled;
- no editing chrome.

Defaults:

- mobile: `continuous` or `paged`;
- desktop: `paged`, with optional `spread`;
- print preview: actual spreads;
- no fake magazine page-turn effect by default.

Reader rules:

1. Mobile order follows `mobileReadingOrder`.
2. A shared page opens with enough issue context to avoid misrepresentation.
3. Public source notes obey rights and privacy policy.
4. Internal diagnostics, annotations, budgets, and traces are absent.
5. Sound is off by default, user-controlled, and never required for meaning.
6. Reader mode does not change the canonical sequence.
7. Keyboard users can enter, advance, retreat, open source notes, and exit overlays without a pointer.
8. Screen readers receive page headings, `accessibleSummary`, stable landmarks, and persisted element reading order independent of visual z-index.
9. Non-decorative images have meaningful alt text; decorative images are explicitly marked decorative.
10. Copy remains usable at 200% zoom and with browser text scaling.
11. Reduced-motion preference disables snap animation, transitions, and optional ambient motion.
12. Withdrawn, private, missing, and inaccessible projections have distinct honest states.
13. Saved `customLayout` renders read-only for public readers without exposing compose controls.

---

## 22. Artifact-respecting analytics

```ts
interface ZineEngagement {
  /** Local, short-lived session accumulator; never stored with user identity. */
  issueOpened: boolean;
  furthestPageReached: number;
  completed: boolean;
  dwellByPage: Record<string, number>; // foreground seconds, capped
  sourceNotesOpened: number;
  pagesShared: string[];
  saved: boolean;
  subscribedAfterReading?: boolean;
  purposeConsentRef?: VersionedRef;
}

type DwellBucket = "0-5s" | "6-15s" | "16-30s" | "31-60s" | "61-180s" | "181-300s";

interface ZineEngagementEvent {
  eventId: string;
  projectionRef: VersionedRef;
  anonymousSessionId: string;
  type:
    | "open"
    | "page-reached"
    | "complete"
    | "dwell"
    | "source-notes-opened"
    | "page-shared"
    | "saved"
    | "subscribed";
  pageId?: string;
  dwellBucket?: DwellBucket;
  occurredAt: number;
  consentPolicyVersion: string;
  purposeConsentRef?: VersionedRef;
}

interface ZineEngagementAggregate {
  projectionRef: VersionedRef;
  cohortSizeBand: "5-9" | "10-49" | "50-249" | "250+";
  furthestPageDistribution: Record<string, number>;
  completionRate: number;
  dwellBucketByPage: Record<string, Partial<Record<DwellBucket, number>>>;
  sourceNotesOpened: number;
  pageShareCounts: Record<string, number>;
  saveRate: number;
  subscriptionAfterReadRate?: number;
  windowStart: number;
  windowEnd: number;
}
```

Creator-facing interpretations may include:

- Readers showed longer foreground dwell on the evidence plate.
- Most exits happened before the roadmap.
- Page 07 was shared more than the cover.
- With separately consented conversion attribution, subscribers were more likely to finish the full issue.

Privacy rules:

1. No session replay, hidden fingerprinting, keystroke capture, or surveillance-style heatmaps.
2. Dwell counts foreground-visible time only, is bucketed, and stops at 300 seconds per page per session.
3. Anonymous session IDs rotate and are never joined to account, subscriber, save, IP, advertising, or fingerprint data without separate, revocable, purpose-specific consent.
4. Saving or subscribing does not by itself authorize identity-linked reading telemetry.
5. `saved`, `subscribed`, `subscribedAfterReading`, and subscription-attributed aggregates require a current purpose-specific consent ref; without it, the transaction is not joined to the reading session.
6. Creator views expose aggregates only when at least five eligible sessions exist; smaller cohorts are suppressed, not shown as exact counts.
7. Raw anonymous events expire within 30 days; longer-lived aggregates contain no session identifier.
8. Global Privacy Control, Do Not Track, or declined analytics consent disables non-essential engagement events. Necessary save/subscribe transactions remain separate and unjoined.
9. Public engagement does not become personal Taste Graph evidence.
10. Retention, deletion, and consent policy are visible and versioned.

Likes are not the primary quality measure.

---

## 23. Generation budget

```ts
interface ZineGenerationBudget
  extends VersionedObjectEnvelope<"zine-generation-budget"> {
  artifactId: string;
  maxTextPasses: number;
  maxImageJobs: number;
  maxRevisionsPerPage: number;
  targetLatencyMs: number;
  estimatedCredits: number;
  maxCredits: number;
  pricingVersion: string;
  estimateExpiresAt: number;
}

interface ZineGenerationPreflight {
  budgetRef: VersionedRef;
  plannedTextPasses: number;
  plannedImageJobs: number;
  estimatedLatencyRangeMs: [number, number];
  estimatedCreditsRange: [number, number];
  reservationRef?: VersionedRef<"zine-credit-reservation">;
  fallbackPolicy:
    | "stop-for-approval"
    | "low-resolution-proof"
    | "sources-only"
    | "selected-pages-only";
}

interface CreditReservation
  extends VersionedObjectEnvelope<"zine-credit-reservation"> {
  budgetRef: VersionedRef<"zine-generation-budget">;
  accountRef: string;
  reservedCredits: number;
  expiresAt: number;
  idempotencyKey: string;
}

interface CreditReservationEvent
  extends VersionedObjectEnvelope<"zine-credit-reservation-event"> {
  reservationRef: VersionedRef<"zine-credit-reservation">;
  action: "dispatch" | "consume" | "release" | "expire";
  credits: number;
  jobId?: string;
  idempotencyKey: string;
  occurredAt: number;
}

interface ZineGenerationSettlement
  extends VersionedObjectEnvelope<"zine-generation-settlement"> {
  reservationRef: VersionedRef<"zine-credit-reservation">;
  budgetRef: VersionedRef<"zine-generation-budget">;
  actualTextPasses: number;
  actualImageJobs: number;
  actualCredits: number;
  completedJobIds: string[];
  failedJobIds: string[];
  refundedCredits: number;
  status: "partially-settled" | "settled" | "released" | "disputed";
  pricingVersion: string;
  settledAt: number;
  idempotencyKey: string;
}
```

Before a high-cost action:

```text
Develop 6 high-fidelity plates

Estimated
6 image generations
2–4 minutes
Approximately 420 studio credits

Develop all · Develop selected · Use sources only · Low-resolution proof
```

Rules:

1. The 24-page renderer cap is technical protection, not a normal allowance; `maxImageJobs` is the separate visual-cost limit.
2. Issue planning and compression happen before expensive plate generation.
3. Credit estimate and maximum use a server-authoritative, versioned price table.
4. The server creates one idempotent `CreditReservation` up to `maxCredits` only after explicit budget approval and before costly jobs.
5. Work pauses before exceeding the approved maximum; a new estimate requires a new approval.
6. Every dispatch/consume/release action has an idempotency key; retries cannot double-reserve or double-settle.
7. Settlement charges only according to the disclosed completed/retry policy, reconciles actual usage, and releases unused reservation.
8. Retry jobs count toward the trace and disclosed budget policy.
9. A budget overrun never silently charges or expands scope.
10. Local repair is preferred over full regeneration.
11. Low-resolution proof preserves page IDs and plan structure so selected plates can later be upgraded.

---

## 24. Observability and production health

```ts
type ZineGenerationStage =
  | "reading"
  | "issue-planning"
  | "structural-compression"
  | "copy-drafting"
  | "copy-compression"
  | "image-generation"
  | "image-upload"
  | "composition"
  | "composition-critique"
  | "persistence"
  | "export"
  | "publication";

interface GenerationStageTrace {
  jobId: string;
  stage: ZineGenerationStage;
  status:
    | "queued"
    | "running"
    | "success"
    | "partial"
    | "failed"
    | "skipped"
    | "cancelled"
    | "timed-out";
  queuedAt: number;
  startedAt?: number;
  completedAt?: number;
  attemptIds: string[];
  errorCode?: string;
  fallbackPath?: string;
  skippedReason?: string;
  cancellationReason?: string;
  recoveryAction?: string;
}

interface GenerationAttemptTrace {
  attemptId: string;
  jobId: string;
  stage: ZineGenerationStage;
  startedAt: number;
  completedAt?: number;
  modelRole?: string;
  executedModel?: string;
  provider?: string;
  inputUnits?: number;
  outputUnits?: number;
  imageJobs?: number;
  estimatedCredits?: number;
  result: "success" | "failed" | "cancelled" | "timed-out";
  errorCode?: string;
}

interface ZineGenerationTrace
  extends VersionedObjectEnvelope<"zine-generation-trace"> {
  artifactId: string;
  workingCopyId: string;
  planRef: VersionedRef<"zine-issue-plan">;
  candidateArtifactRef?: VersionedRef<"zine-artifact-revision">;
  reservationRef: VersionedRef<"zine-credit-reservation">;
  stages: GenerationStageTrace[];
  attempts: GenerationAttemptTrace[];
  modelCalls: number;
  imageJobs: number;
  failedJobs: number;
  retries: number;
  totalLatencyMs: number;
  estimatedCost?: number;
  actualCredits?: number;
  settlementRef?: VersionedRef<"zine-generation-settlement">;
  fallbackPaths: string[];
}
```

Rules:

1. Failures are attributed to the exact stage.
2. A successful fallback reports `partial`, not unqualified success.
3. Creator-facing UI uses graceful stage language and the recorded `recoveryAction`.
4. Developer traces retain job/attempt IDs, exact error codes, model-role and executed-model provenance, usage units, latency, cost, cancellation, timeout, and fallback.
5. Logs exclude private source bodies, raw prompts, credentials, and unpublished page copy by default.
6. Traces correlate artifact ID, working-copy ID, immutable plan ref, job IDs, and—once frozen—the candidate artifact ref through the persistence-stage attempt.
7. Telemetry failure never makes an otherwise durable issue inaccessible.
8. Model execution resolves through configured model roles; the trace records the executed model but planner code does not hardcode provider IDs.

---

## 25. Migration and durability

```ts
const CURRENT_ZINE_SCHEMA_VERSION = 2;

interface ZineMigration {
  from: number;
  to: number;
  migrate: (input: unknown, context: ZineMigrationContext) => ZineMigrationResult;
}

interface ZineMigrationContext {
  artifactId: string;
  rawPayloadRef: string;
  rawPayloadHash: string;
  inputShapeGuardVersion: string;
  expectedHeadRevision?: number;
}

type ZineMigrationResult =
  | {
      kind: "migrated";
      migratedRevision: NativeZineRevision;
      warnings: string[];
      unmappedFieldsRef?: string;
      canRender: true;
    }
  | {
      kind: "legacy-read-only";
      legacyRevision: LegacyReadOnlyZineRevision;
      warnings: string[];
      unmappedFieldsRef: string;
      canRender: boolean;
      canOpenRaw: true;
    }
  | {
      kind: "unsupported-future";
      futureRevision: UnsupportedFutureZineRevision;
      warnings: string[];
      canRender: boolean;
      canOpenRaw: boolean;
    }
  | {
      kind: "failed";
      errorCode: string;
      message: string;
      warnings: string[];
      rawPayloadRef: string;
      canRender: boolean;
      canOpenRaw: boolean;
    };

interface ZineMigrationReceipt {
  artifactId: string;
  fromVersion: number;
  toVersion: number;
  status: "success" | "partial" | "failed";
  originalPreserved: boolean;
  rawPayloadRef: string;
  rawPayloadHash: string;
  migratedRevisionRef?: VersionedRef;
  warnings: string[];
  migratedAt: number;
}
```

### Migration rules

1. Never mutate the only copy.
2. Validate the top-level object shape before reading a version. Treat a missing `schemaVersion` as version 1 only when the legacy shape guard passes; otherwise return `failed`.
3. Store the original schema version, raw payload reference, and checksum before migration.
4. Preserve unknown fields.
5. Preserve `customLayout` and `customLayout.editTrace`.
6. Preserve `pagesJson` during the compatibility period.
7. For schema v2, `ZinePageSpecV2[]` is authoritative and `pagesJson` is generated compatibility output, never a second authority.
8. For legacy input, preserve current render precedence while diagnosing conflicts: use non-empty `content.pages`; otherwise parse `pagesJson`. If both are non-empty and differ, preserve both, mark migration `partial`, and require reconciliation before write.
9. `hydrateZineContentPages` remains the renderer compatibility helper. Migration uses a structured parser that reports malformed JSON instead of swallowing the error.
10. Write the migrated result as an append-only revision and update the artifact head only with compare-and-set against `expectedHeadRevision`.
11. Keep migration idempotent by hashing the raw payload and migration version.
12. Log migration failures without making the issue inaccessible.
13. Allow read-only opening of partially migrated artifacts.
14. A schema version newer than supported becomes `UnsupportedFutureZineRevision`, opens raw/read-only when possible, and never attempts an implicit down-migration.
15. Do not fabricate narrative functions, approvals, rights, source links, or authorship mode for legacy pages.
16. Derive legacy page IDs as SHA-256 of artifact ID, original zero-based index, original page number, and normalized content. Resolve a collision with a deterministic occurrence suffix and preserve the legacy page-number mapping.
17. Migrate page sidecar documents from page-number keys to stable page IDs while retaining read compatibility until verified.
18. A record becomes `NativeZineRevision` only when complete lineage, issue plan, authorship, page semantics, and asset custody are present. Otherwise persist `LegacyReadOnlyZineRevision`.
19. Persist unmapped fields in the referenced migration archive; never drop them after returning a warning.
20. Runtime validation rejects a native schema-v2 revision without `issuePlanRef`.

Legacy issues without enough data for an authoritative issue plan open with:

```ts
interface LegacyEditorialState {
  classification: "unclassified";
  reason:
    | "legacy-artifact"
    | "malformed-pages"
    | "conflicting-page-sources"
    | "unsupported-fields";
  canRender: boolean;
  canOpenRaw: boolean;
  canReplan: boolean;
  authorshipMode: "unclassified";
}
```

Replanning a legacy issue creates a new revision and leaves the original readable.

### Data-plane durability

- Firestore remains canonical for private artifact revisions and approvals under the current architecture.
- Sovereign stores sanitized public publication projections.
- Publication failure does not delete or rewrite the private revision.
- Unpublishing withdraws the public projection according to current consent policy while preserving private revision history.
- Current unconditional private/draft `mirrorZineToSovereign` behavior is architecture drift. Stop those writes before schema v2, accept only publication-gated `PublicOutputProjectionPayload` records with valid publication events, and quarantine or migrate existing private Sovereign rows.

---

## 26. Release sequence

### Phase A — Contracts and deterministic rule engine

- Add versioned schemas for issue plans, page plans, rhythm, spreads, critique, compression, authorship, and approvals.
- Add versioned `ZineRuleEvaluationContext`, canonical fingerprint test vectors, and pure validators for rule-table rows marked `deterministic`; validate model-assisted critic findings without pretending to compute them deterministically.
- Add fixture-based unit tests.
- Keep legacy zines rendering through `hydrateZineContentPages`.

### Phase B — Planner vertical slice

- Introduce a planner service between approved direction and `zineGenerator`.
- Build the editorial material graph.
- Produce a proposed issue plan and compression result.
- Expose “why this page exists” in The Edit.
- Require issue-plan approval according to workflow mode.
- Make the plan own page count instead of the current `3-5` page prompt.

### Phase C — Realization and critic

- Generate copy and plates from an approved plan.
- Measure realized rhythm.
- Run copy compression and semantic critique.
- Apply local repair patches with revision history.
- Separate composition critiques from export diagnostics in UI and manifests.

### Phase D — Press policy and projections

- Add rights custody and publication blockers.
- Generate the public colophon from canonical metadata.
- Add reader, archival PDF, print PDF, carousel, story, web essay, press sheet, portfolio case study, and context-pack projections incrementally.

### Phase E — Artifact loop and collaboration

- Add approved artifact extraction.
- Add comparative issue intelligence.
- Add annotations, proof links, reviewer roles, and visual revision comparison.
- Add artifact-respecting analytics.

No phase may require destructive migration of existing zines.

---

## 27. Acceptance criteria

### Planner and page earning

- [ ] Every proposed editorial page has a narrative function, desired effect, density, intensity, grammar, and evidenced contribution; every claim-bearing page has typed epistemic status; the colophon has provenance end-matter semantics instead of a fabricated narrative claim.
- [ ] A fixture with insufficient unique material becomes shorter.
- [ ] A decorative page with no new function is removed or blocks plan approval.
- [ ] Every contribution reference resolves, and `EARN-001` / `EARN-002` cannot be overridden.
- [ ] The planner does not create a complication unsupported by source material.
- [ ] Page IDs survive reordering.

### Rhythm and spreads

- [ ] Three dense consecutive pages produce `RHY-001`.
- [ ] Three repeated grammars produce `RHY-002`.
- [ ] A high-density evidence page without release produces `RHY-003`.
- [ ] An unearned dark plate produces `RHY-006`.
- [ ] Unchanged cover reuse produces `RHY-008`.
- [ ] Strong images front-loaded into the opening produce `RHY-007`.
- [ ] The final editorial page must release or leave honest residue.
- [ ] Spread relationships remain legible in mobile order.
- [ ] Plan-only evaluation never runs realized-layout rules; realized evaluation persists measured inputs and versions.

### Compression and critique

- [ ] Exact and semantic repeated claims identify their source page and claim IDs.
- [ ] Merge candidates preserve evidence and epistemic labels.
- [ ] Overloaded pages can be proposed for split without automatically increasing total length.
- [ ] Composition critiques are stored separately from technical proof diagnostics.
- [ ] Accepted critic repairs create decision-log entries and a new plan or artifact revision.

### Approval and authorship

- [ ] Guided, standard, and express workflows all create distinct target approval records.
- [ ] Changing an approved target revision invalidates downstream approvals.
- [ ] Express bundle approval aborts atomically when a dependency digest changes.
- [ ] Every proof reference resolves before review, and the approved artifact hash equals the reviewed candidate hash.
- [ ] Task-use approval permits bounded private realization but cannot satisfy artifact-content or projection publication.
- [ ] Artifact proof can approve the immutable master without a projection; projection proof is destination-bound and independently required for publication.
- [ ] Assemble mode preserves creator wording.
- [ ] The colophon records the authorship mode.
- [ ] Express mode does not silently approve reusable memory.

### Rights, provenance, and publication

- [ ] Unknown-rights images block public reproduction.
- [ ] Link-only publication never embeds the underlying reference asset.
- [ ] Private sources can influence an issue without appearing in public colophon details.
- [ ] Public colophon counts are derived from canonical records.
- [ ] Public projections hide private diagnostics, source bodies, and annotations.
- [ ] Sovereign/public readers receive only `PublicOutputProjectionPayload` with no private refs.
- [ ] Destination-specific grants can allow reader output while denying print/social output.
- [ ] Export manifests are revision-pure and ZIP output contains no unsanitized Used Context sidecar.
- [ ] Each immutable projection recipe/content records destination, transformed snapshots, mappings, and content hashes; evaluations, proof, and publication are append-only relations to that exact content.

### Revision, migration, and durability

- [ ] Revision comparison reports copy, order, asset, layout, provenance, publication, and approval changes.
- [ ] Migration preserves `pagesJson`, unknown fields, and custom layouts.
- [ ] Migration failure opens the original read-only.
- [ ] Legacy migration does not fabricate narrative function or approval.
- [ ] Native schema-v2 content without complete lineage, authorship, or issue plan is rejected; equivalent legacy content still opens through the read-only branch.
- [ ] Public projection always records its source revision.
- [ ] Newer unsupported schemas open read-only.
- [ ] Conflicting legacy `pages` / `pagesJson` are preserved and marked partial.
- [ ] Private/draft revisions never write to Sovereign.

### Re-entry, collaboration, analytics, and operations

- [ ] Partial artifact extraction identifies the approval state of every item.
- [ ] Comparative intelligence returns `insufficient-history` without invented findings.
- [ ] Expired or revoked proof links cannot read or comment.
- [ ] A stale suggested edit cannot overwrite newer copy.
- [ ] Reader order, alt text, keyboard operation, 200% zoom, and reduced motion pass accessibility checks.
- [ ] Fewer than five engagement sessions produce no creator-facing aggregate.
- [ ] GPC/DNT disables non-essential engagement events.
- [ ] Generation pauses before `maxCredits` and settles only disclosed usage.
- [ ] Cancelled, timed-out, retried, and fallback jobs remain distinguishable in traces.
- [ ] Telemetry failure does not block opening the durable artifact.

---

## 28. Required test fixtures

| Fixture | Expected result |
| --- | --- |
| Nine-page full arc | Passes with invitation → development → release/residue |
| Opening has no threshold | `ARC-001` blocker |
| Issue has no substantive development | `ARC-002` blocker or alternate artifact recommendation |
| Final editorial page is application-only | `ARC-003` blocker |
| Eight-page issue has no legitimate turn | `ARC-004` warning; requires cited exception rather than invented conflict |
| Eight-page issue with three repeated claim pages | Compression removes or merges repeats and reports the shorter issue |
| Sparse source packet | Produces a four-to-six-page issue or recommends another artifact form |
| Three dense evidence pages | `RHY-001`; local release repair proposed |
| Three identical grammars | `RHY-002` |
| Five centered pages | `COMP-001` / `COMP-002` |
| Black plate used only for style | `RHY-006` |
| Cover image repeated on page 2 | `RHY-008` |
| Strongest evidence after application | `NAR-003` |
| False solved ending over unresolved sources | `RHY-010` |
| Evidence/reading spread on mobile | Correct sequential relationship bridge |
| Unknown-rights Pinterest image | Public reproduction blocked; link-only/private remedies offered |
| Express workflow final review | Seven scoped approval records share a bundle ID |
| Express dependency changes during final approval | Entire approval transaction aborts stale; no partial records |
| Express proof review | All refs resolve before display; approved artifact hash exactly matches reviewed hash |
| Task-use approvals only | Private realization allowed; public projection blocked |
| Artifact proof without projection | Master candidate can be approved; publication remains blocked until projection proof |
| Projection changed after proof | Prior projection proof becomes stale; artifact proof remains current |
| Assemble mode copy pass | No creator wording changed |
| Legacy `pagesJson` with custom layout | Hydrates, preserves geometry, opens without fabricated plan |
| Legacy `pages` conflicts with `pagesJson` | Both copies preserved; migration marked partial/read-only |
| Future schema version | Opens read-only without down-migration |
| Public reader projection | Omits private diagnostics and preserves page-specific sharing context |
| Public payload serialization | Contains no project, private manifest, Context Packet, Used Context, custody, approval, annotation, budget, or trace refs |
| Reader-only asset grant used for print PDF | Print projection blocked while reader remains eligible |
| Raw Used Context in ZIP attempt | Private/public manifest policy prevents unsanitized sidecar |
| Partial extraction approval | Only approved item can enter its target project |
| Comparison with one prior issue | `insufficient-history` with coverage note |
| Expired proof link | Read/comment denied without leaking artifact metadata |
| Stale suggested edit | Suggestion marked stale; newer content unchanged |
| Four analytics sessions | Creator aggregate suppressed |
| GPC-enabled reader | No non-essential engagement events emitted |
| Credit reservation would exceed maximum | Jobs pause before dispatch and request a new approval |
| Partial image fallback | Trace reports failed attempt, fallback, partial stage, and settlement |
| Telemetry sink unavailable | Artifact remains accessible and generation result remains durable |
| Private draft save | No Sovereign publication row is created |

---

## 29. Implementation seams in the current repository

| Existing seam | Required evolution |
| --- | --- |
| `services/zineGenerator.ts` | Replace `any`-shaped generation with typed `realizeApprovedPlan(planRef, pageJobs)`; preserve page IDs/count/order; remove fixed `3-5` pages/four plates; a provider fallback must realize the same plan or block, never substitute an unrelated two-page simulated issue |
| `types.ts` `ZinePageSpec` / `ZineMetadata.authorship` | Keep as legacy compatibility fields; add `ZinePageSpecV2` discriminated kinds and typed authorship; legacy authorship remains `unclassified` |
| `lib/zineSpreadLayout.ts` | Continue renderer hydration while adding structured migration parsing, page-ID spread intent, and no loss of `customLayout` |
| `components/IssueSpreadsPanel.tsx` | Show plan rationale, rhythm, spread relationships, and composition critique |
| `components/ZineLayoutEditor.tsx` / `ZineSpreadCanvas.tsx` | Realize geometry against approved page/spread intent; persist stable element IDs, reading order, decorative state, and alt text instead of regenerating random IDs |
| `services/exportManifestService.ts` | Build pure versioned private/public manifests from explicit revision inputs; never inject pending user-scoped compile state |
| `components/ExportChamber.tsx` | Remove the raw `used-context.json` privacy bypass; package only the authorized private manifest or sanitized public projection |
| `lib/structuredZinePdf.ts` | Render the selected approved projection and colophon from canonical pages instead of synthesizing an independent sequence; keep structured PDF path |
| `components/PublicZineSharePage.tsx` | Evolve into accessible reader-mode projection with no editing chrome and honest withdrawn/private states |
| `services/firebaseUtils.ts` | Add working-copy CAS and append-only revision storage; make `pagesJson` generated compatibility output; key sidecars by page ID; stop unconditional private Sovereign mirroring; replace automatic generated-zine `updateTasteGraph` with an `ArtifactExtraction` proposal |
| `services/sovereignClient.ts` | Accept publication-gated `PublicOutputProjectionPayload` plus valid publication event only; quarantine/migrate existing private mirrored rows |
| `services/residue/adapters/zineAdapter.ts` | Supply claim/material candidates to the planner; current `pageCount`, direct realized pages, minimum-page loop, and “evidence gap” filler are non-canonical |
| Tailor / Taste Graph services | Receive approved extraction items only; saving a zine never directly changes personal taste |
| Current client credit decrement path | Replace post-hoc flat decrement with server-authoritative estimate, reservation, maximum, and settlement |
| The Press | Own destination projections, rights checks, proof state, and publication |

Recommended new modules:

```text
schemas/zineEditorialIntelligence.ts
lib/zineEditorialRules.ts
lib/zineRevisionDiff.ts
services/zineEditorialPlanner.ts
services/zineCompositionCritic.ts
services/zineCompressionService.ts
services/zineRightsService.ts
services/zineProjectionService.ts
__tests__/zineEditorialRules.test.ts
__tests__/zineMigrationV2.test.ts
```

The contracts should use runtime validation as well as TypeScript types. Planner rules should be pure where possible so they can run in The Edit, The Press, tests, and server-side publication validation without divergent implementations.

---

## 30. Product principle

> Mimi does not maximize pages. Mimi composes consequences.
>
> The issue begins with approved material, develops a position through evidence and interpretation, makes room for pressure and pause, and ends with honest residue. Its beauty comes from editorial necessity—not from filling every available slot.
