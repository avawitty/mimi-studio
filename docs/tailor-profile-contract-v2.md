# Tailor Profile Contract v2

Status: implemented contract and compatibility layer

Runtime schema: `services/tailorProfileContract.ts`

## Product description

Tailor is Mimi’s explainable taste-compilation layer. It transforms references, refusals, constraints, language, and creator corrections into a versioned creative profile that separates persistent taste from the needs of the current project. Its output gives people and generative systems a shared contract for what to preserve, transform, avoid, and produce, with every major conclusion traceable to evidence and assigned a confidence level.

Tailor does not merely store questionnaire answers. It compiles creative direction:

`Evidence → interpretation → creative rules → generation contract → artifact`

## Creator user story

As a creator, I can import an existing Tailor profile or give Mimi references, inspect the working thesis and the evidence behind it, correct or confirm Mimi’s interpretation, and pass a compact generation contract to Studio or another creative tool.

### User-flow benefit

1. I give Tailor references, refusals, constraints, and direct statements.
2. Tailor keeps that source material separate from its interpretations.
3. Tailor compiles recurring signals into a working thesis and Creative Laws.
4. I can see confidence and provenance before accepting a claim.
5. The confirmed rules become a reusable generation contract.
6. A widget receives only a small review projection and a profile reference, not my entire private profile.

This creates one source of truth without forcing existing blueprint users through a destructive migration.

## Canonical layers

| Layer | Owns | Does not own |
| --- | --- | --- |
| `meta` | Identity, status, schema and compiler versions | Creative direction |
| `scope` | Persistent vs project-specific intent | Evidence |
| `sourceMaterial` | Direct evidence, anti-references, statements and corrections | Model conclusions |
| `compiledProfile` | Mimi’s evidence-linked interpretation | Runtime model settings |
| `generationContract` | Executable preserve, transform and avoid rules | Artifact delivery state |
| `requestedOutputs` | What this session should produce | Persistent taste |
| `provenance` | Evidence origins and claim derivations | Duplicate summaries |
| `diagnostics` | Confidence, gaps, contradictions and next action | Hidden model reasoning |

Optional `runtimeConfig` and `extensions` are explicitly demoted from the eight canonical layers. Growing libraries such as Dolls, treatments, and character references should remain linked collections rather than being embedded into every profile payload.

## Runtime behavior

`services/tailorProfileContract.ts` provides:

- `tailorProfileSchema` — strict runtime validation for the v2 return.
- `createTailorProfileFromLegacyDraft` — migrates today’s blueprint object into the canonical contract.
- `compileTailorProfileFromGraph` — compiles evidence, curated patterns, and Creative Laws into the canonical contract.
- `tailorProfileToLegacyDraft` — projects v2 back into the current UI contract while downstream consumers migrate.
- `parseTailorImport` — accepts either v2 or legacy Tailor JSON and rejects unrelated objects.
- `createTailorWidgetProjection` — returns the minimal profile summary, next question, review actions, and versioned reference for a ChatGPT mini app.

The MCP app exposes this through a decoupled pair:

- `compile_tailor_review` validates canonical or legacy JSON and returns data only.
- `render_tailor_review` attaches the Mimi widget after the model has inspected the projection.

Widget actions return to the conversation for explicit confirmation or correction; they do not silently mutate the stored profile.

## Canonical rule

Questionnaire answers and uploaded references are evidence. Compiled creative direction is inference. Generation instructions are executable policy. They must not share the same field or silently overwrite one another.

`strategicSummary` remains a legacy presentation view, not canonical data. The compatibility projection derives it from `compiledProfile` and `generationContract`.

## Verification

Run:

```sh
npm run verify:tailor-contract
npm run validate:canon
npm run build
```

The contract verification covers:

- legacy JSON migration;
- v2 runtime validation;
- round-trip compatibility with the blueprint editor;
- evidence-linked Taste Graph compilation;
- compact mini-app projection;
- rejection of unrelated JSON.
