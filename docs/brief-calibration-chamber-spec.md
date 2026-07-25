# Brief Calibration Chamber — Product and Functional Specification

Status: proposed first-class chamber  
Current seed: `components/UseCaseSelector.tsx` inside the Studio Worktable  
Recommended route: `/briefs`  
Recommended navigation: Create → Briefs

## Product restatement

The Brief Calibration Chamber lets a creator design reusable instructions for recurring Worktable jobs.

It is not a model picker. The user defines:

- what the work is for;
- which approved context may be used;
- what the output must contain;
- what constraints and quality checks apply;
- how much speed, depth, privacy, and cost flexibility the run allows.

Mimi's AI Gateway resolves those requirements to a compatible provider and model at execution time. The resolved route appears afterward as provenance, not as the identity of the preset.

## Why this deserves its own chamber

The current Cognitive Module Deck is embedded under Studio signals and offers four fixed personas. It presents a hardcoded model name, but only its temperature is passed into the generation options. That makes the control look more operational than it is.

A dedicated chamber turns this from aesthetic telemetry into a reusable creator tool:

- briefs can be authored instead of merely selected;
- presets can be tested before use;
- the same approved preset can shape many Worktable projects;
- teams can share consistent output contracts;
- provider changes do not invalidate the creator's workflow;
- each run records which preset, version, context, and provider route were used.

## Core user story

As a creator, I want to save the way I repeatedly brief Mimi, so I can begin new work with a trusted structure without rewriting the same prompt or depending on one AI model.

### Supporting stories

As a strategist, I want required sections and evidence standards, so every client brief is complete and reviewable.

As an editor, I want a preset to preserve voice and provenance, so faster generation does not flatten the source material.

As a team owner, I want approved shared presets, so collaborators use the same constraints without exposing provider credentials.

As a Worktable user, I want to see exactly what a preset will add before I apply it, so I remain the final editor.

## Primary flow

### 1. Create

1. Open Briefs.
2. Choose **New preset** or duplicate a built-in preset.
3. Name the use case in practical language.
4. Describe the intended outcome and audience.

### 2. Structure

1. Choose accepted inputs: text, links, images, prior zines, Pocket items, or Used Context.
2. Define the required output sections.
3. Add constraints, exclusions, tone, length, and evidence rules.
4. Choose a capability profile rather than a provider:
   - Fast drafting
   - Deep synthesis
   - Research with sources
   - Vision and text
   - Structured data

### 3. Calibrate

1. Set creative range.
2. Choose speed, cost, and privacy preferences.
3. Define whether fallback providers are allowed.
4. Run the preset against a small test input.
5. Review the compiled brief, output, route used, warnings, and provenance.

### 4. Approve and save

1. Revise or approve the preset.
2. Save it as private, project, or team scope.
3. Version changes instead of silently overwriting an approved preset.

### 5. Apply in Worktable

1. Select a preset from the Worktable.
2. Inspect the brief it will add.
3. Approve the Used Context and any linked treatments.
4. Generate.
5. The finished artifact records preset ID, version, Used Context, and resolved gateway route.

## Chamber layout

### Left rail — Preset library

- Built-in
- Mine
- Project
- Team
- Drafts
- Archived

Each row shows name, purpose, capability, last updated date, and approval status.

### Center — Brief builder

The main builder uses five sections:

1. Outcome
2. Inputs and context
3. Output contract
4. Constraints and quality checks
5. Gateway policy

The compiled instruction remains visible and editable. Mimi may suggest structure, but it cannot silently alter an approved preset.

### Right rail — Test and provenance

- test input;
- compiled brief preview;
- test result;
- provider/model resolved after the run;
- latency and approximate usage;
- fallback events;
- missing-context warnings;
- save new version.

On narrow screens, the rails become a library drawer and a test-results sheet.

## Gateway calibration model

### Show to the user

- Capability: fast, deep, research, multimodal, or structured
- Creative range
- Speed preference
- Cost preference
- Privacy requirement
- Fallback allowed
- Required context/tools

### Keep behind the gateway

- provider credentials;
- raw provider priority order;
- vendor-specific model IDs;
- retry implementation;
- normalization details.

### Show after execution

- resolved provider and model;
- whether a fallback occurred;
- latency and usage estimate;
- warnings;
- preset version and context provenance.

This preserves a broad AI Gateway point of view: presets express product intent, while adapters handle Gemini, OpenAI, Anthropic, OpenRouter, Vercel AI Gateway, BYOK, or future providers.

## Preset data contract

```ts
type BriefCapability =
  | "text-fast"
  | "text-deep"
  | "research-deep"
  | "vision-text"
  | "structured-data";

interface BriefPreset {
  id: string;
  ownerId: string;
  projectId?: string;
  name: string;
  description: string;
  status: "draft" | "approved" | "archived";
  scope: "private" | "project" | "team";
  version: number;
  capability: BriefCapability;
  acceptedInputs: Array<
    "text" | "link" | "image" | "pocket" | "used-context" | "prior-zine"
  >;
  instruction: string;
  outputContract: Array<{
    id: string;
    label: string;
    required: boolean;
    guidance?: string;
  }>;
  constraints: string[];
  exclusions: string[];
  evidencePolicy: {
    requireSources: boolean;
    separateObservationFromInference: boolean;
    requireUsedContextApproval: boolean;
  };
  gatewayPolicy: {
    creativeRange: number;
    speed: "economy" | "balanced" | "priority";
    cost: "low" | "balanced" | "quality";
    privacy: "standard" | "zdr-required" | "byok-only";
    allowFallback: boolean;
  };
  createdAt: number;
  updatedAt: number;
}
```

Provider and model IDs do not belong in the saved product preset. They belong in a separate execution record.

## Execution record

Every run should save:

- preset ID and version;
- Worktable project and output ID;
- approved Used Context IDs;
- compiled instruction hash;
- gateway capability request;
- resolved provider and model;
- fallback events;
- timing and usage metadata;
- user approval or rejection;
- generated artifact provenance.

## Built-in starter presets

The current four presets are useful seeds after provider-neutral revision:

### Audience and distribution brief

Turns source material into audience tension, editorial angle, channel adaptations, and cadence.

### Strategy and decision brief

Turns research into evidence, options, recommendations, risks, and a decision queue.

### Client evidence audit

Separates observed client evidence from inference and produces a scoped consulting response.

### Research archive map

Clusters approved fragments, preserves provenance, and names unresolved questions.

## Worktable integration

The current embedded deck becomes a compact selector:

- selected preset name;
- one-sentence intent;
- capability and creative range;
- **Inspect brief**;
- **Change preset**;
- **Open Briefs**.

When selected, the preset compiles into the Worktable request before generation. The user can inspect or remove it. It should appear alongside Anchor Tags, Treatments, Pocket, Continuum, and Used Context as an explicit input—not hidden system behavior.

## Guardrails

- Product presets cannot store API keys.
- A preset cannot silently add private context.
- Model output never approves or publishes a preset.
- Provider fallback must obey privacy and BYOK constraints.
- “Zero data retention” may only be shown when the resolved route is verified as eligible.
- Advanced sampling controls remain collapsed unless the user asks for them.
- The provider/model shown after execution is telemetry, not a promise that future runs use the same route.

## Implementation slices

### Slice 1 — Make existing presets real

- Replace model-specific labels with gateway capability labels.
- Compile preset instructions and output contracts into Worktable generation.
- Persist only selected preset ID locally.
- Show resolved provider only after a real run.

### Slice 2 — Create the chamber

- Add `/briefs` and Create → Briefs navigation.
- Build preset library, builder, and test panel.
- Persist private presets and versions.
- Add duplicate, archive, and apply-to-Worktable actions.

### Slice 3 — Team and governance

- Add project/team scopes and roles.
- Add approval workflow and immutable approved versions.
- Add execution history, comparisons, usage policies, and provenance.

## Acceptance criteria

- Changing a preset changes the compiled Worktable instruction, not only temperature.
- No saved preset depends on a vendor-specific model ID.
- A user can preview the compiled brief before generating.
- Applying a preset never changes approved context without confirmation.
- A failed primary route may fall back only when the preset policy permits it.
- Every output can answer: which preset, which version, which context, and which provider route created this?

