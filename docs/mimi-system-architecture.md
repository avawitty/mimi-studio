# Mimi System Architecture

Status: Canonical living architecture

Scope: Product domains, workflows, objects, engines, capabilities, and system contracts

Last updated: 2026-08-02

This document defines Mimi's durable product architecture. It is intentionally not a screen map. Screens and chamber names may evolve, but the domains, objects, engines, capabilities, and contracts described here should remain stable unless an explicit architecture decision changes them.

For the current chamber-to-route implementation, see the [Mimi Chamber Implementation Audit](./mimi-chamber-implementation-audit.md). For current infrastructure and Used Context verification, see the [Functions Admin Proxy Audit](./wo-1-functions-admin-proxy-audit.md) and [Used Context end-to-end test](./wo-2-used-context-test.md).

## 1. Product Philosophy

Mimi is a creator operating system whose shared state is explicit, user-approved knowledge.

- Mimi makes taste, research, and creative decisions explainable.
- Mimi does not generate identity; it reveals evidence and helps transform that evidence into creative direction.
- Mimi only remembers what the creator explicitly approves.
- AI generation is not the product; structured creative knowledge is the product.
- The Taste Graph is the product substrate. Dolls, dossiers, zines, brand kits, and marketing assets are projections of it.
- Workflows produce and consume durable objects, not hidden chat memory.
- Generation is one operation within a larger knowledge workflow. It must remain inspectable, repeatable, and attributable.
- The creator controls what becomes memory, what is used as context, and what is retired.

**User-flow benefit:** A creator can collect a reference, inspect Mimi's interpretation, approve only the useful claims, and later see exactly which approved knowledge shaped a brief, zine, or report. They do not have to trust an invisible conversation history.

### Brand and product architecture

| Layer | Role | Product meaning |
| --- | --- | --- |
| `mimizine.app` / `mimi.you` | Parent platform | The canonical home for projects, Tailor, Field Notes, dossiers, Studio, Press, auth, billing, and infrastructure. |
| Tailor | Ingestion and evidence engine | The guided intake that turns references, notes, and goals into an editable Taste Graph. |
| Taste Graph | Source of truth | The evolving, evidence-linked model of what a creator or project is drawn to, rejects, applies, and revises. |
| Creative Dossier | Explanation layer | The readable report that translates the Taste Graph into principles, patterns, opportunities, and applications. |
| `mimi.u` | Personal universe layer | A generated universe view over the Taste Graph: Dolls, Masks, Field Notes, art-history mirrors, brand systems, and assets. |
| Dolls / Masks | Projection layer | Symbolic embodiments and role-based expressions of the Taste Graph. They are outputs, not the source of truth. |
| `mimi.rip` | Inverse public face | Host skin for inverse reading / public rip plates (same SPA, different chrome). |
| `mimi.fish` | Attention / share face | Host skin for share plates (`/s/:id`) and creator shelves; canonical outbound zine share origin. |

**User-flow benefit:** A creator starts inside the practical platform, uploads evidence into Tailor, curates what Mimi inferred, then reveals a personalized universe only after the system has something traceable to show. The Doll feels earned instead of randomly assigned.

## 2. Canonical Workflow Grammar

The system-wide workflow grammar is:

> **Capture → Interpret → Approve → Remember → Retrieve → Generate → Compose → Export**

Not every workflow must use every step, but it must preserve the ordering and approval boundary when knowledge becomes durable or influences an output.

| Step | System responsibility | Durable result |
| --- | --- | --- |
| Capture | Accept creator input or imported material without silently interpreting it as truth | Source Object, Annotation, or Workflow Session input |
| Interpret | Separate evidence, observations, and inferred meaning | Evidence, Observation, proposed Memory Atoms |
| Approve | Ask the creator which interpretation may become shared knowledge | Approval record and approved object version |
| Remember | Store approved knowledge in the canonical registry | Memory Atom and relationships |
| Retrieve | Select relevant approved knowledge for a declared task | Retrieval result or Context Run |
| Generate | Produce candidate text, visuals, plans, or transformations from declared inputs | Generated candidate with provenance |
| Compose | Arrange selected material into an intentional artifact | Zine, Report, dossier, brief, or other Artifact draft |
| Export | Validate, package, and publish or hand off the artifact | Published Artifact and provenance manifest |

### Mimi-specific workflow variants

#### Research memory

> **Ask → Answer → Highlight → Approve → Memory Atom → Retrieve → Show Used Context**

An answer remains ephemeral until the creator highlights and approves a claim. Retrieval may use only approved atoms, and every memory-backed answer or output exposes the atoms used.

#### Tailor / taste reading

> **Specimen → Read → Approve → Apply**

A specimen is captured as a Source Object. Tailor proposes evidence-based principles or inferences. The creator approves the useful reading before it becomes reusable taste knowledge. Application records which principles influenced the result.

#### Tailor profile to mimi.u

> **References → Observations → Pattern Clusters → Creative Laws → Taste Graph → Creative Dossier → mimi.u → Doll / Brand Kit / Art Style / Zine Voice / Marketing Asset**

Tailor is the ingestion brain. It should not immediately classify the creator or produce a mascot. It first opens the observation drawer, lets the creator accept, reject, rename, merge, split, annotate, and weight signals, then updates the Taste Graph. Downstream outputs consume that graph.

**User-flow benefit:** A creator can say, "No, I like the old paper texture, not nostalgia," and Mimi stores that correction as knowledge. The system becomes more useful because the creator participates in the read.

#### End-to-end creator workflow

> **Collect → Read → Extract → Approve → Remember → Compose → Apply → Export**

This is the practical bridge from research and taste to production. Collection does not automatically become memory, and composition does not automatically become publication.

## 3. Architectural Layers

| Layer | Responsibility | Examples |
| --- | --- | --- |
| Creator Interfaces | Present workflows, decisions, object state, and provenance to the creator | Scribe, Tailor, Pocket, Studio, The Edit, The Press |
| Domain Workflows | Coordinate domain-specific steps and enforce ownership boundaries | Research intake, taste reading, editorial direction, product briefing, publishing |
| Capabilities | Provide reusable user-facing operations shared across workflows | Capture, Interpretation, Highlight, Approval, Retrieval, Composition, Export |
| Knowledge Objects | Hold durable, typed, versioned product state | Source Object, Evidence, Approval, Memory Atom, Context Packet, Build Brief |
| Platform Services | Persist, index, authorize, relate, validate, and synchronize objects | Object registry, identity, storage, search, permissions, event log |
| Generation / Composition | Assemble explicit context and produce or arrange candidates | Prompt assembly, model generation, layout composition, rendering |
| Published Artifacts | Represent validated outputs and their handoff or publication state | Zine, Report, export bundle, provenance manifest |

Dependencies flow downward through contracts: interfaces invoke domain workflows; workflows compose capabilities; capabilities read and write canonical objects through platform services; generation consumes declared context; exports produce traceable artifacts.

**User-flow benefit:** The creator can switch from one interface to another without losing the project, approvals, or creative rationale because those belong to durable objects rather than a specific screen.

## 4. Core Domains

Each persistent object has one canonical owning domain. Other domains may reference or derive from it but must not create competing sources of truth.

| Domain | Purpose | Owns | Produces | Consumes |
| --- | --- | --- | --- | --- |
| Project Domain | Define the work boundary, participants, goals, state, and related objects | Project, project membership, project relationships | Active project context, project timeline, object links | Goals, constraints, artifacts, workflow activity |
| Research Domain | Capture sources and turn source material into inspectable evidence and observations | Source Objects, Evidence, Observations, Annotations | Evidence sets, proposed insights, research answers | Project questions, files, links, creator highlights |
| Knowledge Domain | Govern approved reusable knowledge and retrieval | Memory Atoms, Approvals, Context Runs, Context Packets, relationships | Approved memory, retrieval results, Used Context records | Evidence, observations, decisions, project scope |
| Tailor / Taste Domain | Make taste legible and applicable across creative work | Taste readings, taste principles, specimen interpretations | Creative Dossier inputs, Visual Principles, Taste Principles | Source Objects, Evidence, approved Memory Atoms |
| Personal Universe Domain | Project approved taste into user-facing worlds and symbolic interfaces | `mimi.u`, Dolls, Masks, universe views, projection recipes | Doll profiles, masks, art-style containers, brand systems, asset prompts | Taste Graph, Creative Dossier, approved principles, project goals |
| Field Notes Domain | Preserve ongoing research memory, user annotations, questions, corrections, and experiments | Field Notes, research entries, correction notes, experiment notes | Searchable research memory and source-linked reflections | Evidence, atoms, dossiers, artifacts, creator notes |
| Art History Domain | Connect user patterns to historical artworks as educational reference points | Artwork Matches, source citations, rights metadata, educational comparisons | Art-history mirrors, public-domain redepiction prompts, lesson cards | Taste Graph, pattern clusters, Creative Laws, public-domain sources |
| Editorial Domain | Convert knowledge and intent into an editorial position and composition plan | Editorial Direction, editorial principles, issue structure | Editorial Direction, composition constraints, Edit decisions | Creative Dossier, research, project goals, artifacts |
| Product Domain | Translate creator intent and knowledge into buildable product work | Build Brief, product requirements, product decisions | Build Briefs, Product Insights, Codex Prompts | Project goals, constraints, evidence, Editorial Direction |
| Publishing Domain | Validate, package, export, and publish finished work | Publication state, export records, manifests | Zines, Reports, Artifacts, provenance manifests | Composed drafts, approvals, validation results, asset references |

## 5. Canonical Engines

Engines are headless system responsibilities. A chamber may expose one or more engines, and multiple chambers may use the same engine.

| Engine | Responsibility | Primary inputs | Primary outputs |
| --- | --- | --- | --- |
| Collection Engine | Ingest text, media, URLs, files, answers, and selections without treating them as approved knowledge | Creator input, imports, metadata | Source Object, Annotation, capture event |
| Interpretation Engine | Derive observations and proposed inferences while keeping source evidence addressable | Source Objects, Evidence, task instructions | Observations, candidate inferences, candidate atoms |
| Approval Engine | Record explicit creator decisions at object or field level | Candidate object/version, actor decision | Approval record, approval state transition |
| Memory Engine | Persist and lifecycle-manage approved reusable knowledge | Approved candidate, provenance, relationships | Memory Atom/version, lifecycle events |
| Retrieval Engine | Find relevant approved atoms and source material under a declared scope | Query, project, filters, permissions | Ranked retrieval result with reasons |
| Context Engine | Convert retrieval results and explicit selections into bounded task context | Retrieval result, selections, task intent | Context Run, Context Packet, Used Context view |
| Prompt Assembly Engine | Translate task instructions and Context Packets into model-ready requests | Context Packet, template, constraints | Prompt payload and assembly record |
| Generation Engine | Produce candidate content from an assembled prompt | Prompt payload, model configuration | Generated candidate, usage metadata |
| Composition Engine | Arrange creator-selected and generated material into structured artifacts | Content blocks, assets, direction, layout rules | Composed artifact draft |
| Export Engine | Render and package an approved artifact for a destination | Artifact draft, destination profile | Exported files, publication record, manifest |
| Provenance Engine | Maintain traceability from outputs to objects, versions, evidence, and transformations | Object events, context usage, generation records | Provenance graph, Used Context, manifest entries |
| Relationship Engine | Create, validate, and traverse typed links among canonical objects | Object identifiers, relationship type | Relationship records, dependency graph |
| Validation Engine | Enforce schemas, ownership, approval gates, completeness, and destination rules | Objects, contracts, artifact draft | Validation results, blocking errors, warnings |

## 6. Core Objects

All persistent objects should share a minimal envelope: `id`, `objectType`, `ownerDomain`, `projectId`, `createdAt`, `createdBy`, `updatedAt`, `version`, `status`, and `provenance` where applicable.

| Object | Canonical owner | Schema-level description |
| --- | --- | --- |
| Project | Project Domain | Work boundary containing `name`, `purpose`, `goals`, `constraints`, `participants`, `status`, `defaultContextPolicy`, and relationships to sources, memory, workflows, and artifacts. |
| Source Object | Research Domain | Captured material with `sourceType`, `uriOrStorageRef`, `title`, `contentRef`, `creatorSuppliedMetadata`, `captureMethod`, `rights`, `checksum`, and source provenance. It is not approved knowledge by itself. |
| Evidence | Research Domain | Addressable support tied to a source through `sourceObjectId`, `locator`, `excerptOrDescription`, `evidenceType`, and `capturedAt`. Evidence records what is present, not what it means. |
| Observation | Research Domain | A descriptive statement with `text`, `evidenceIds`, `observer`, `scope`, and `confidence`. It may be human-authored or machine-proposed and must remain distinguishable from inference. |
| Annotation | Research Domain | Creator-authored marking with `targetObjectId`, `targetLocator`, `body`, `annotationType`, `tags`, and optional `selectionSnapshot`. Highlights are annotations until promoted through approval. |
| Approval | Knowledge Domain | Explicit decision containing `targetObjectId`, `targetVersion`, `actorId`, `decision`, `scope`, `decidedAt`, and optional `rationale`. Approval is auditable and never inferred from passive use. |
| Memory Atom | Knowledge Domain | Smallest reusable approved knowledge unit. It carries typed content, evidence/inference separation, lifecycle, provenance, relationships, and version information as defined below. |
| Context Run | Knowledge Domain | Audit record of a retrieval operation with `taskIntent`, `query`, `scope`, `filters`, `candidateIds`, `rankedResults`, `rejectedResults`, `retrievalVersion`, and timestamps. It explains how context was found. |
| Context Packet | Knowledge Domain | Bounded input package for a task with `contextRunId`, `selectedAtomVersions`, `selectedSourceRefs`, `creatorSelections`, `taskConstraints`, `tokenOrSizeBudget`, and an integrity hash. It explains what context was supplied. |
| Workflow Session | Project Domain | Stateful execution of a canonical workflow containing `workflowType`, `currentStep`, `inputRefs`, `outputRefs`, `state`, `startedBy`, `startedAt`, `completedAt`, and optional `parentSessionId` or `branchPoint`. |
| Taste Graph | Tailor / Taste Domain | Canonical evidence-linked model containing `evidenceNodeIds`, `observationIds`, `patternClusterIds`, `creativeLawIds`, `acceptedSignals`, `rejectedSignals`, `userWeights`, `versions`, and provenance links. |
| Evidence Node | Research Domain | A Tailor-specific Source Object projection used for uploads, books, artworks, links, quotes, screenshots, fashion, products, or other reference material. It keeps rights, captions, thumbnails, and analysis status traceable. |
| Pattern Cluster | Tailor / Taste Domain | Grouped observations with `name`, `description`, `category`, `observationIds`, `supportingEvidenceNodeIds`, `frequency`, `confidence`, `possibleInterpretations`, `userStatus`, and `userWeight`. |
| Creative Law | Tailor / Taste Domain | User-approved creative principle derived from accepted clusters. It describes a decision rule, supporting evidence, applications, avoidances, confidence, and creator edits. |
| Creative Dossier | Tailor / Taste Domain | Structured synthesis of creative intent with `projectId`, `audience`, `goals`, `signals`, `tastePrinciples`, `visualPrinciples`, `references`, `constraints`, `openQuestions`, and provenance links. |
| Field Note | Field Notes Domain | Research-memory note with `title`, `body`, `noteType`, linked evidence, linked patterns, linked laws, linked dolls, tags, creator commentary, and source provenance. |
| Doll | Personal Universe Domain | Symbolic embodiment of a Taste Graph with `tasteGraphId`, `name`, `visualLanguage`, `palette`, `materials`, `silhouette`, `motifs`, `eyeTreatment`, `creativeLaws`, `strengths`, `blindSpots`, `experiments`, and source evidence. |
| Mask | Personal Universe Domain | Role-based mode for a Doll, such as `illustrator`, `curator`, `archivist`, `builder`, `editor`, `poet`, `strategist`, or `brand_designer`. It changes output behavior without replacing the underlying Taste Graph. |
| Artwork Match | Art History Domain | Educational comparison with `artworkTitle`, `artist`, `date`, `museum`, `imageUrl`, `sourceUrl`, `publicDomainStatus`, `matchedThemes`, `matchedVisualSignals`, `differences`, `educationalSummary`, and linked patterns. |
| Marketing Asset | Publishing Domain | Downstream export generated from a Taste Graph, Doll, Mask, dossier, or project goal. It stores `assetType`, `bodyCopy`, `imagePrompt`, `layoutGuidance`, `palette`, `typographyGuidance`, evidence links, and source notes. |
| Editorial Direction | Editorial Domain | Approved editorial contract with `thesis`, `audience`, `voice`, `storyArc`, `contentPillars`, `inclusions`, `exclusions`, `visualDirection`, `issueStructure`, `approvalId`, and source context. |
| Build Brief | Product Domain | Implementation-ready contract with `problem`, `userStories`, `scope`, `nonGoals`, `requirements`, `acceptanceCriteria`, `constraints`, `dependencies`, `decisionLog`, `CodexPrompts`, and provenance. |
| Zine / Report / Artifact | Publishing Domain | Composed output with `artifactType`, `title`, `contentBlocks`, `assetRefs`, `compositionSpec`, `sourceObjectVersions`, `usedContext`, `validationState`, `publicationState`, `exports`, and provenance manifest reference. |

### Evidence and inference boundary

Evidence points to what a source contains. An inference states what Mimi or the creator concludes from that evidence. The two may be linked, but must never be stored as an indistinguishable claim. An approved inference does not convert its supporting evidence into an inference or erase uncertainty.

## 7. Memory Atom Model

A Memory Atom is the smallest durable, retrievable unit of creator-approved knowledge.

```ts
type MemoryAtom = {
  id: string;
  projectId: string;
  type: MemoryAtomType;
  content: string;
  sourceWorkflow: { sessionId: string; workflowType: string };
  sourceObjectIds: string[];
  evidenceIds: string[];
  inference?: { statement: string; method?: string };
  confidence?: { value: number; rationale?: string };
  approvalState: "draft" | "approved" | "rejected";
  approvalId?: string;
  lifecycleState: "draft" | "approved" | "applied" | "archived" | "deprecated";
  version: number;
  provenance: ProvenanceRecord[];
  relationships: ObjectRelationship[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
};
```

Required semantics:

- **Type** controls validation, display, retrieval filters, and allowed relationships.
- **Source workflow** identifies where and why the atom was proposed.
- **Source object** keeps the atom connected to captured material.
- **Evidence** contains addressable support and remains separate from the claim.
- **Inference** records interpretation explicitly when the atom goes beyond direct evidence.
- **Confidence** expresses uncertainty; it is not a substitute for creator approval.
- **Approval state** determines whether the atom is retrievable as memory.
- **Lifecycle state** determines whether approved knowledge is current and applicable.
- **Version** preserves changes without silently rewriting prior context or artifacts.
- **Provenance** records origin, transformations, actors, and timestamps.
- **Relationships** connect the atom to projects, sources, decisions, constraints, artifacts, and other atoms using typed links.

### Atom types

`Signal`, `Evidence`, `Inference`, `Decision`, `Constraint`, `Goal`, `Direction`, `Product Insight`, `Visual Principle`, `Editorial Principle`, `Taste Principle`, `Codex Prompt`, `Open Question`, and `Reference`.

### Lifecycle

> **Draft → Approved → Applied → Archived → Deprecated**

| State | Meaning | Retrieval policy |
| --- | --- | --- |
| Draft | Proposed but not creator-approved | Never available to ordinary memory retrieval |
| Approved | Accepted as current reusable knowledge | Available within permissions and scope |
| Applied | Used in at least one declared context or artifact | Available; usage relationships are recorded |
| Archived | Retained for history but not current by default | Excluded unless historical retrieval is requested |
| Deprecated | Superseded or explicitly invalidated | Excluded; replacement relationship should be shown when known |

Approval and lifecycle are separate: `approvalState` records the decision boundary, while `lifecycleState` records the atom's operational history.

## 8. System Contracts

Contracts describe module boundaries independent of the current UI implementation.

| Module | Accepts | Produces | Updates | Consumed by |
| --- | --- | --- | --- | --- |
| Research Notebook | Project questions, Source Objects, creator queries, annotations, highlights | Answers, Evidence, Observations, proposed Memory Atoms, Context Runs | Workflow Session, source annotations, approval queue | Tailor, Pocket, Studio, Build Brief, Editorial Direction |
| Tailor | Specimens, Source Objects, Evidence, approved atoms, creator corrections | Taste readings, Visual Principles, Taste Principles, Creative Dossier inputs | Taste-domain objects, proposed/approved atoms, relationships | Studio, Editorial Direction, The Edit, Build Brief |
| Pocket | Objects, references, filters, relationships, lifecycle actions | Registry views, retrieval selections, object links, Used Context selections | Canonical object metadata, atom lifecycle, relationship graph | All workflows that retrieve or inspect durable knowledge |
| Studio | Project intent, Creative Dossier, Editorial Direction, approved Context Packet, creator material | Generated candidates, compositions, artifact drafts, usage records | Workflow Session, Context Packet usage, draft artifact | The Edit, Build Brief, The Press |
| Build Brief | Project goal, evidence, constraints, Product Insights, decisions, Context Packet | Implementation-ready Build Brief and Codex Prompts | Product decisions, requirements, acceptance criteria, provenance | Creator, Codex/build workflow, project planning |
| Editorial Direction | Creative Dossier, research evidence, audience, goals, approved principles | Approved editorial thesis, voice, structure, inclusions, exclusions | Editorial decisions, direction version, approval record | Studio, The Edit, The Press, Report/Zine composition |
| The Edit | Artifact draft, Editorial Direction, constraints, provenance, validation rules | Edit decisions, revisions, validation findings, approved release candidate | Artifact version, decision log, validation state | The Press, Studio revision loop |
| The Press | Approved release candidate, destination profile, rights, validation results | Export files, Zine/Report/Artifact record, publication event, provenance manifest | Publication state, export history, artifact relationships | Audience, external platform, archive, future retrieval |

### Contract rules

1. Modules exchange object identifiers and versioned snapshots, not implicit screen state.
2. A consumer may propose a change to an object it does not own, but the owner domain applies the canonical update.
3. Any module using memory must receive an explicit Context Packet or creator selection and emit a Used Context record.
4. Generated candidates remain drafts until a creator or authorized workflow approves their next state.
5. Every contract is validated at ingress and egress.

**User-flow benefit:** A creator can send research from the Notebook to a Build Brief or Studio without copying a chat transcript. The destination receives a typed, approved context package, and the creator can inspect what crossed the boundary.

## 9. Tailor, Taste Graph, and mimi.u Contracts

This section specializes the general architecture for the Tailor-to-mimi.u product loop.

### Tailor as ingestion

Tailor is the canonical ingestion engine for creative references. It accepts images, books, screenshots, notes, links, quotes, artworks, fashion references, product references, and project goals. Its job is not to classify the creator. Its job is to create an editable Taste Graph.

Tailor should support three evidence-depth states:

| State | Reference count | Product meaning |
| --- | --- | --- |
| Initial Read | 3+ references | Enough evidence to begin comparison. |
| Strong Read | 8-20 references | Enough evidence for reliable pattern extraction. |
| Deep Read | 21+ references | Archive-scale analysis, longitudinal patterns, and stronger confidence. |

User interaction must separate observation from selection:

1. Mimi extracts observations.
2. Mimi clusters recurring patterns.
3. Mimi proposes possible interpretations and Creative Laws.
4. The creator accepts, rejects, renames, merges, splits, annotates, or weights the results.
5. Accepted and corrected signals update the Taste Graph.

**User-flow benefit:** The creator does not receive "your style is X." They receive a drawer of evidence and choose which signals actually matter.

### Taste Graph as source of truth

The Taste Graph stores the evolving creative model for a creator or project. It should include:

- all supporting Evidence Nodes;
- observations grouped by category;
- Pattern Clusters and their creator curation status;
- accepted, rejected, renamed, and weighted signals;
- Creative Laws and their supporting evidence;
- Field Notes and corrections;
- generated Dossiers, Dolls, Masks, assets, and art-history mirrors as projections;
- version history and provenance.

The Taste Graph may be visualized as a graph, cluster map, timeline, archive drawer, or report, but those views are not the graph itself.

**User-flow benefit:** A creator can evolve from "I uploaded references once" to "Mimi has a living, inspectable model of what my project is learning."

### Field Notes as research memory

Field Notes is the creator-facing research memory surface. It replaces the idea of an "ID Bible" with a living notebook that stores:

- references and source notes;
- creator thoughts and annotations;
- questions and corrections;
- accepted Creative Laws;
- rejected interpretations;
- experiments and future curiosities;
- art-history links;
- project reflections.

Field Notes should not be a general Notion clone. It is Mimi-native research memory: every note can link back into the Taste Graph, evidence, atoms, dossiers, dolls, and artifacts.

**User-flow benefit:** The creator can preserve why something mattered, not just that it was uploaded.

### Dolls and Masks as projections

Dolls are symbolic embodiments of the Taste Graph. Masks are role-based modes for a Doll. Neither is the creator, and neither is the source of truth.

Rules:

1. A Doll consumes a Taste Graph; it does not replace it.
2. A Doll must link to source evidence and Creative Laws.
3. Multiple Dolls may exist for one graph.
4. Multiple Masks may exist for one Doll.
5. Masks adjust output behavior, not canonical identity.
6. Reflective eye, cat-eye, obsidian mirror, or similar motifs are optional visual systems, not universal product requirements.

**User-flow benefit:** The Doll becomes a beautiful way to understand and apply a creative system without trapping the creator inside one mascot or style.

### Art History Translation

The Art History Domain connects Taste Graph patterns to historical artworks as educational reference points.

Allowed framing:

- "This artwork explores related themes."
- "This work offers a historical lens."
- "These visual strategies overlap with your references."
- "This is a reference point, not a definition."

Disallowed framing:

- claiming an artwork represents a user's identity or mental health;
- diagnosing the user;
- implying supernatural certainty;
- copying copyrighted works;
- producing direct replicas of living artists or protected works.

Preferred sources include public or API-addressable collections such as The Metropolitan Museum of Art, Wikimedia Commons, Art Institute of Chicago, Rijksmuseum, and Europeana. Public-domain status and source citations must be stored when the result is used for redepiction or marketing assets.

**User-flow benefit:** The creator receives an art-history lesson and a transformation prompt, not a reductive label.

### Downstream outputs

Every downstream output must state what it consumed from the Taste Graph.

| Output | Consumes | Produces |
| --- | --- | --- |
| Creative Dossier | Evidence, patterns, Creative Laws, creator notes | Explanation, applications, experiments, exportable prompts |
| Doll | Taste Graph, Dossier, Creative Laws | Symbolic profile, visual rules, motifs, experiments |
| Mask | Doll, task role, project goal | Role-specific behavior and prompt template |
| Brand Kit | Creative Laws, palette logic, typography logic, audience | Brand principles, copy, visual guidance |
| Art Style Container | visual principles, material vocabulary, avoidances | reusable illustration rules and prompts |
| Zine Voice | Editorial principles, language grammar, project intent | editorial tone, section structure, captions |
| Marketing Asset | Doll/Mask, project goal, Creative Laws, optional artwork match | copy, prompt, layout guidance, source notes |

## 10. Capability Model

Features should compose shared capabilities instead of reimplementing local versions of the same behavior.

| Capability | Reusable behavior | Required contract |
| --- | --- | --- |
| Capture | Ingest input, preserve original material, and create a source reference | Returns Source Object or Annotation with provenance |
| Interpretation | Produce observations and proposed inferences against evidence | Keeps evidence addressable and labels inference |
| Highlight | Save a creator-selected range, region, or object reference | Returns Annotation with stable target locator |
| Approval | Record an explicit, attributable decision for a versioned target | Returns Approval and valid state transition |
| Retrieval | Search and rank eligible approved knowledge for a declared task | Returns inspectable candidates and Context Run |
| Composition | Arrange blocks, assets, and directions into an artifact structure | Returns versioned artifact draft and input references |
| Export | Validate and render an artifact for a destination | Returns files, export record, and manifest |
| Provenance | Record origins, transformations, actors, versions, and usage | Returns traversable provenance links |
| Validation | Apply schema, lifecycle, permissions, ownership, and destination rules | Returns structured errors and warnings |

Central capabilities create consistent behavior. For example, approval should mean the same thing in Research Notebook, Tailor, Studio, and The Edit; a module must not treat a click, generation, or save as implicit approval.

## 11. Product Rules

These rules are architecture constraints, not interface preferences.

1. **The database/object registry is the source of truth.** UI state and model context are projections of canonical objects.
2. **Conversations are ephemeral; objects are durable.** Useful conversation content must be promoted into a typed object through an explicit workflow.
3. **Approved memory is the only retrievable memory.** Draft, rejected, archived, or deprecated atoms are excluded by default.
4. **Every memory-backed output shows Used Context.** The view identifies exact object IDs and versions, with readable labels and source paths.
5. **Evidence and inference remain separate.** Each inference identifies its supporting evidence and uncertainty.
6. **Every artifact preserves provenance.** The system records source versions, approved context, transformations, generation metadata where applicable, and creator decisions.
7. **Each persistent object has one canonical owner.** Other domains reference the object or request changes through contracts.
8. **Interfaces may change; domains and objects remain stable.** Chamber refactors must not silently change object meaning or ownership.
9. **Context is task-bounded.** Retrieval occurs for a declared purpose, project scope, permissions set, and budget.
10. **Generation never grants authority.** Model output is a candidate until validated and approved through the relevant workflow.
11. **State transitions are explicit and auditable.** Approval, application, archival, deprecation, export, and publication create events.
12. **Exports are reproducible enough to inspect.** Artifact records retain the versions and configuration necessary to explain the result, subject to model and renderer constraints.

## 12. Open Questions

These decisions remain unresolved and should be settled through architecture decision records before implementation becomes dependent on them.

| Question | Why it matters | Decision criteria |
| --- | --- | --- |
| Should Memory Atoms be immutable and versioned? | Immutability strengthens provenance and repeatability but increases version and relationship complexity. | Audit needs, correction UX, storage cost, retrieval behavior |
| Should Context Packets be stored or generated dynamically? | Stored packets reproduce historical runs; dynamic packets reflect current knowledge but may drift. | Reproducibility, privacy deletion, cost, packet size |
| Should object relationships become first-class? | First-class typed relationships enable graph retrieval and impact analysis but require governance and migrations. | Query value, relationship ownership, validation complexity |
| Should workflow sessions support branching? | Branching enables creative alternatives without overwriting a path but complicates merge and approval semantics. | Creator mental model, comparison UX, ownership of merged outputs |
| Should every exported artifact include a machine-readable provenance manifest? | A manifest improves portability and verification but may expose sensitive context or increase package complexity. | Privacy, interoperability, destination support, minimum manifest schema |

## Current Implementation Baseline

This section records the current branch implementation without redefining the canonical architecture above. A routed chamber is an interface milestone, not proof that its domain contract is complete. For route-level source maps and verify scripts, prefer the [Chamber Implementation Audit](./mimi-chamber-implementation-audit.md).

### Current creator spine

> **Scribe → Pocket mirror → Studio (approve and apply) → Zine → The Edit → The Press**

| Canonical concern | Current implementation | Architecture status |
| --- | --- | --- |
| Capture and research | `ScribeChamber` (desktop tabs + mobile Ask/Library/Capture), embedded `ResearchMemory`, global selection capture | Implemented in part |
| Atom persistence | `memoryService` and Firestore `memory_atoms` | Implemented; explicit approval-before-memory remains the canonical target |
| Registry mirror | `mirrorAtomToPocket`, Pocket archive | Partial; object types do not yet share one complete registry contract |
| Context approval | `UsedContextTray`, `setUsedContextApproved` | Implemented for Studio and The Edit queues |
| Context application | `InputStudio`, `zineGenerator`, `fragmentsUsed`; active Doll prompt/media injection via `dollEngine` | Implemented for the Studio generation path |
| Context provenance | `UsedContextSnapshot`, reveal Used Context, export manifest snapshots | Implemented in the current zine/export path |
| Editorial validation | `TheEditCompile` (primary), `TheEditChamber` spine tabs, export diagnostics | Implemented for compile path; commerce remains secondary; Edit → Press compile markdown sync is wired |
| Spread composition | `customLayout` on `ZinePageSpec`, `ZineLayoutEditor` / `ZineSpreadCanvas`, `lib/zineSpreadLayout.ts` | Implemented for owner compose + read-only public render |
| Studio cover export | `lib/studioCoverExport.ts`, `coverImageUrl`, `content.meta.studioCoverOverlays` | Implemented; overlay rasterization into export image remains open |
| Export | `ThePressChamber`, `exportManifestService`, structured PDF via `lib/structuredZinePdf.ts` (`pdfMode: "structured"`) | Implemented in part; universal artifact manifests remain open |
| Personal universe projection | `services/dollEngine` (shell staple, procedural aesthetic, identity pack, masks, companion) | Implemented; remote-only image-ref attachment into zine media still open |
| Public social stage | `ProsceniumView` Stage / Correspondents / Cliques; legacy `/connections` + `/cliques` redirect | Implemented; demo vs live specimen labeling is a hard integrity rule |

Preview E2E checklist: `docs/DEMO_SCRIPT.md`. Service verification: `npm run verify:used-context` (plus chamber-audit verify scripts for dolls, fish, spreads, residue).

Current implementation uses `UsedContextEntry.approved` as the generation gate. Any path that saves a proposed atom directly as retrievable memory without a separate creator approval is architecture drift against Sections 2, 7, and 11 and should be migrated deliberately rather than normalized as canon.

### Public host skins

The SPA serves multiple public faces from one build. Detection lives in `lib/siteHost.ts` (host wins, then `?skin=`, then `localStorage`).

| Skin | Canonical origin | Intent |
| --- | --- | --- |
| `you` | `https://mimi.you` | Full creator platform + public cards |
| `rip` | `https://mimi.rip` | Inverse public reading plates |
| `fish` | `https://mimi.fish` | Attention/share plates (`/s/:zineId`) and creator shelves |

Outbound zine share URLs canonicalize to `mimi.fish/s/:id`. Local QA can force a skin with `?skin=rip|fish` without changing DNS.

### Current platform services

These are implementation examples of the Platform Services layer. Chambers should consume them through shared contracts rather than create local alternatives.

| Service | Current responsibility | Representative paths |
| --- | --- | --- |
| Auth and session | Firebase Auth and HTTP-only session handling | `api/sessionLogin.ts`, `UserContext` |
| Firestore persistence | Users, atoms, zines, and Pocket records | `services/firebaseUtils.ts`, `memoryService` |
| Local archive | Offline or guest references and drafts | `services/localArchive.ts` |
| AI provider routing | Select funded, personal-key, or simulated provider paths | `lib/mimiProvider.ts`, `services/geminiClient.ts` |
| AI SDK → Gateway text | Production text generation via AI SDK + Gateway model roles | `POST /api/mimi/generate-text`, `lib/ai/generate.ts`, `lib/mimiGenerateTextRoute.ts` |
| Image generation | Server-side cover and visual generation | `/api/mimi-image`, `lib/serverMimiImage.ts` |
| Functions admin proxy | Keep Firebase Admin operations out of Vercel | `lib/proxyToFunctions.ts`, `functions/src/index.ts` |
| Funded gateway | Authorize and account for platform-funded AI use (BYOK Bearer still accepted) | `lib/mimiFundedGateway.ts` |
| Used Context bus | Stage and approve task-specific client context | `services/usedContextService.ts` |
| Export and privacy | Build manifests and sanitize exported snapshots | `services/exportManifestService.ts`, `lib/privacyUtils.ts` |
| Structured PDF | Archival A4 PDF from zine metadata (custom layouts when present) | `lib/structuredZinePdf.ts` |
| Doll engine | Shell staple, procedural aesthetic, identity refs, Studio/Scribe injection | `services/dollEngine/` |
| Residue adapters | Cultural/emotional residue → product output adapters | `services/residue/` |
| Canon registry | Define and validate module routes | `lib/productCanon.ts`, `scripts/validateCanonRoutes.ts` |
| Public showcase | Publish profile-backed public cards | `services/publicShowcaseService.ts` |
| Host / share routing | Detect public skins and fish share/shelf paths | `lib/siteHost.ts`, `lib/publicBaseUrl.ts` |
| Stale chunk recovery | Clear caches + SW and reload once after post-deploy MIME/chunk errors | `lib/staleChunkRecovery.ts`, `components/ErrorBoundary.tsx`, `public/sw.js` |

### Current interfaces

The current creator-facing interfaces are projections onto the architecture, not additional domains.

| Interface | Canonical route | Current component |
| --- | --- | --- |
| Studio | `/studio` | `InputStudio` |
| Scribe | `/scribe` | `ScribeChamber` |
| Tailor | `/tailor` | `TailorHub` |
| Taste Signature | `/signature` | `SignatureView` |
| Taste Graph | `/taste-graph` | `TasteGraph` |
| The Edit | `/the-edit` | `TheEditChamber` + `TheEditCompile` (primary) |
| The Press | `/the-press` | `ThePressChamber` |
| Pocket | `/pocket` | `Pocket` |
| Mood Board | `/moodboard` | `MoodBoardChamber` |
| IntelHub | `/intelhub` | `IntelHub` |
| GeoEngine | `/geoengine` | `TheGEOEngine` |
| Darkroom | `/darkroom` | `DarkroomView` |
| Wardrobe | `/wardrobe` | `WardrobeView` |
| Thimble | `/thimble` | `ThimbleDashboard` |
| Sanctuary | `/sanctuary` | `SanctuaryView` |
| The Ward | `/ward` | `TheWard` |
| Private Studio | `/private-studio` | `PrivateStudioChamber` |
| Mimi Dolls | `/mimi-dolls` | `MimiDollsChamber` |
| Atelier | `/atelier` | `AtelierChamber` |
| The Proscenium | `/proscenium` (+ `/correspondents`, `/cliques` wings) | `ProsceniumView` |

`/chamber-map` is the registry inspector. `/u/:handle`, `/showcase`, `/zine/:id`, `/s/:id` (fish share), and `/api/*` are infrastructure or published-artifact routes rather than chambers.

### Additional implementation questions

These branch-level questions sit beneath the canonical open questions and should remain visible during implementation planning:

- Should Used Context remain a local queue or become a synchronized, project-scoped object?
- Should The Edit retain commerce as a secondary tab now that `TheEditCompile` is primary, or split into separate routes?
- Should cover overlay state remain ephemeral or become part of the versioned artifact composition specification?
- What are the canonical renderers and schemas for every Pocket object type?
- Where is the privacy boundary between user-global, project-scoped, and Sanctuary-local knowledge?
- What automated end-to-end evidence is required before the creator spine is considered complete?
- How should remote-only Doll identity image refs attach into the zine media pipeline without breaking offline export?

## 13. Superintelligence Scalability Layer (SSL)

To scale seamlessly alongside superintelligent models (models of extreme high-dimensionality, long-horizon planning, and agentic autonomy), the Mimi architecture enforces a strict decoupling of cognition from storage. This Metacognitive Resonance Layer safeguards creator sovereignty and ensures system-wide alignment through four foundational directives:

### 1. Epistemic Separation of Observation and Projection
Superintelligent models excel at identifying high-dimensional, latent patterns across vast datasets. However, without constraint, they are prone to epistemic drift—confusing their own speculative projections with raw user intent. 
*   **Protocol**: All model outputs are classified as **Inferences** (ephemeral or proposed) and must remain addressable to their supporting **Evidence Nodes** (immutable, creator-captured ground truth). 
*   **Scalability**: Even as the model's analytical capacity reaches superintelligence, the database maintains a deterministic, audit-capable linkage back to human-approved signals, neutralizing hallucination and semantic drift.

### 2. Task-Bounded Context Packing
Recursive self-referential reasoning can lead to cognitive feedback loops and runaway reward hacking.
*   **Protocol**: Superintelligent models are never given unconstrained access to Mimi’s entire global state. Instead, they operate strictly on isolated, immutable **Context Packets** generated for a declared, bounded task.
*   **Scalability**: The model is prohibited from dynamically modifying its own retrieval parameters or rewriting historical states during execution. This guarantees complete repeatability and predictable token budgeting, regardless of model size or capacity.

### 3. Sovereign Key Routing & Cache Attestation
A superintelligent system requires extreme operational efficiency and local sovereignty to run at scale without relying entirely on centralized cloud intermediaries.
*   **Protocol**: Through the `APIKeyRouter` and `AICacheManager`, Mimi supports local cryptographic caching (SHA-256 prompt hashing) and Bring-Your-Own-Key (BYOK) sovereign execution.
*   **Scalability**: Highly repetitive cognitive assessments are bypassed via deterministic <2ms client-side caches. When central systems face quota limits or latency spikes, cognitive workloads seamlessly shift to the creator’s own sovereign local GCP credentials, establishing an anti-fragile, distributed network of private nodes.

### 4. Creator Alignment as High-Fidelity RLHF
In an era of superintelligence, the primary role of the creator is not content generation, but high-fidelity curation and alignment.
*   **Protocol**: Every micro-decision—approving a pattern, reweighting a signal, renaming a creative law, or editing a dossier—is captured as a structured **Approval** event.
*   **Scalability**: These approval streams serve as a clean, structured feedback loop that continuously aligns the downstream generative projections (Dolls, Zines, and Brand systems). The system learns the creator's exact style guide without requiring massive training runs, scaling its creative precision proportionally with the intelligence of the underlying model.

## Change Governance

This is a living canonical document. Architecture changes should update this file when they alter a domain boundary, canonical object, engine responsibility, capability contract, lifecycle, ownership rule, or provenance guarantee. Screen-level changes do not require an architecture update unless they change one of those contracts.

Before accepting an architecture change, verify:

- the creator user flow and benefit are stated;
- object ownership remains singular;
- evidence, inference, and approval boundaries remain explicit;
- memory retrieval still excludes unapproved knowledge;
- Used Context and provenance remain available;
- affected module contracts and validation rules are updated;
- migrations are defined for existing durable objects.
