# MIMI RESIDUE ENGINE — Phase 1 Repository Audit

**Status:** Complete — architecture proposal only; no engine implementation yet  
**Date:** 2026-07-29  
**Scope:** Inspect existing Mimi Studio codebase; propose Residue Engine architecture, file plan, sequence, and risks  
**Apify skills consulted:** `apify-sdk-integration`, `apify-actorization`, `apify-actor-development`, `apify-generate-output-schema`, `apify-ultimate-scraper` (via Apify subagent routing)

---

## 1. Repository findings

### 1.1 Framework and routing

| Layer | Reality |
| --- | --- |
| Stack | React 19 + TypeScript + Vite client; Express (`server.ts`) serves API + Vite middleware as a single process |
| Package | `mimi-zine` (`package.json`); scripts: `dev`, `lint` (`tsc --noEmit`), Playwright e2e, many `verify:*` scripts |
| Routing | Custom pathname routing in `App.tsx` (not React Router). Path segment → `canonicalizeMimiRoute()` → `viewMode` → render switch |
| Canon | `lib/productCanon.ts` owns `CANON_MODULES`, aliases, chamber/engine registry |
| UI chambers | `components/chambers/*` shells + large standalone components |
| Design | Tailwind 4, Framer Motion / Motion, stone/cream “nous” visual language (`#F2F1ED`, mono labels) |

**Relevant routes today**

| Surface | Route / mode | Component | Residue relevance |
| --- | --- | --- | --- |
| Intel Hub | `/intelhub` → `intel-hub` | `components/IntelHub.tsx` | Run history / handoff target; currently project-control + strategy memo, not residue runs |
| The Edit | `/the-edit` | `components/chambers/TheEditChamber.tsx` | Editorial adapter target |
| The Press | `/the-press` | `components/chambers/ThePressChamber.tsx` | Export / artifact packaging |
| Scribe | `/scribe` | `components/chambers/ScribeChamber.tsx` | Memory Atoms + Used Context |
| Forecast | `forecast` (routed, not sidebar-primary) | `components/TheForecast.tsx` | Scenario adapter; content currently simulated |
| Scry | `scry` | `components/ScryView.tsx` | Research lanes to keep distinct from Residue acquisition |
| Taste Graph | `/taste-graph` | Taste Graph surfaces | Graph adapter target |
| Zine | `/zine/:id` | Studio reveal path + `services/zineGenerator.ts` | Zine adapter target |
| Observatory / Mean Median Mode | **Not implemented** | Spec only in collective-intelligence handoff | Sibling / consumer of Residue adapters |

There is **no** existing `residue` module, route, collection, or schema.

### 1.2 Existing intelligence / report generation

Closest multi-stage engines (patterns to reuse, not to merge into one giant prompt):

| System | Files | Pattern |
| --- | --- | --- |
| Tailor analysis | `services/tailorAnalysisService.ts` | Staged: observations → clusters → laws → dossier; GenAI `responseSchema` |
| Creative dossier | `services/creativeDossierService.ts`, `lib/creativeDossierPrompts.ts` | Multi-stage synthesis with dedicated prompt module |
| Zine generation | `services/zineGenerator.ts` | Single large structured JSON call with Used Context / Tailor / memory |
| Proposal orchestrator | `services/proposalOrchestrator.ts` | Folder → strategy → structured proposal |
| Intel Hub workflow | `lib/intelHubWorkflow.ts`, `components/IntelProjectControl.tsx` | LocalStorage-backed project stages + Press handoff |
| Weekly drift | `components/WeeklyDriftReport.tsx` | Gemini JSON personal drift report |
| Forecast content | `services/researchService.ts` | **Simulated** Exa/Tavily/Perplexity/ThinkingLabs responses |
| Engine contract | `services/engineContract.ts` | Abstract `Engine<I,O>` with validate / explain / provenance / evolve |

Canonical architecture already requires: **evidence ≠ inference**, approval before memory, Used Context visibility (`docs/mimi-system-architecture.md`).

### 1.3 Schemas and TypeScript models

| Location | Role |
| --- | --- |
| `types.ts` (~2.1k lines) | Primary product types: `MemoryAtom`, `UsedContextEntry`, Tailor evidence/claims, zines, taste graph nodes/edges, drift forecast |
| Zod | Present (`zod@^4.4.3`) but **sparse**: `services/tailorProfileContract.ts`, `api/mimi/synthesize-dossier.ts`, checkout, MCP |
| Structured AI | Dominantly Google GenAI `Type` + `responseSchema` + `responseMimeType: "application/json"`, then `JSON.parse` |
| Claim statuses already in Tailor | `ClaimType = 'observed' \| 'inferred' \| 'speculative' \| 'user_confirmed' \| 'user_rejected'` |
| Engine evidence statuses | `EvidenceStatus` in `engineContract.ts` |
| Mean / Median / Mode types | Specified in `docs/CURSOR_HANDOFF_COLLECTIVE_INTELLIGENCE.md` as `CentralTendencyProfile` — **not in code** |

**Decision:** Residue should introduce **Zod as runtime source of truth** (aligns with handoff + validation needs), while optionally deriving GenAI `responseSchema` per stage from Zod or maintaining thin parallel GenAI schemas for model calls. Prefer Zod validation at stage boundaries regardless of provider schema format.

### 1.4 AI provider wrappers

| File | Role |
| --- | --- |
| `services/aiProvider.ts` | Multi-provider facade (Gemini / OpenAI / Anthropic / gateway) |
| `services/geminiClient.ts` | Browser client → `/api/proxy/gemini`; `withResilience`, `tryModels` |
| `services/geminiService.ts` | Large prompt/persona library + structured generators |
| `services/geminiAgents.ts` | Curator / Sentinel agents |
| `services/modelConfig.ts` | Role-based model IDs (`textFast`, `textDeep`, …) with env overrides |
| `api/proxy/ai-gateway.ts` | Vercel AI Gateway + credits |
| `lib/mimiProvider.ts` | Image / funded gateway adapters |
| `src/mimi/*` | Separate Claude-oriented experiment — **not** primary app path |

**Decision:** Do **not** add a new AI provider. Residue stages call existing provider stack via `modelFor('textDeep'|'textFast')` + structured JSON + Zod parse/retry.

### 1.5 Firebase / Firestore

- Client: `services/firebase.ts`, `firebaseInit.ts`, `firebaseUtils.ts`
- Admin: `lib/serverFirebaseAdmin.ts`, Functions under `functions/`
- Blueprint entities: `firebase-blueprint.json` (Zine, Memory, TasteGraphNode/Edge, LineageEntry, Proposal, etc.)
- Typical path: `users/{uid}/memory`, `users/{uid}/tasteGraphNodes|Edges`, `users/{uid}/provenance/{artifactId}`, tailor project subcollections
- Rules: `firestore.rules` — owner-scoped `users/{userId}` with catch-all subdocs; no residue collections yet
- Local fallbacks: `localArchive.ts` (IndexedDB), `draftStorage.ts`, Used Context in **localStorage** (`usedContextService.ts`)

### 1.6 Provenance and Used Context

| System | Path | Notes |
| --- | --- | --- |
| Used Context service | `services/usedContextService.ts` | Atom queue for `studio` \| `the-edit`; localStorage; approve flag |
| Used Context types | `types.ts` | `UsedContextEntry`, `UsedContextSnapshot` |
| Artifact provenance | `lib/provenance.ts` | Chamber transfer history (`darkroom` \| `pocket` \| `studio`) under `users/{uid}/provenance` |
| Lineage | Firebase `LineageEntry` + `thoughtSignatureService.ts` | Artifact reasoning fingerprint |
| Tailor safety | `constants/tailorSafetyRules.ts` | Forbidden diagnostic claim patterns — **reuse for Emotional Residue** |
| Verify scripts | `scripts/verifyUsedContextFlow.ts`, `verifyIntelHubWorkflow.ts` | Pattern for Residue verify script |

Residue **Used Context** must be richer than today’s atom queue (evidence / background / comparison / counter-signal / user-context) while remaining compatible with existing Studio/Edit handoff snapshots.

### 1.7 Memory Atom architecture

- Runtime type in `types.ts` is lighter than the canonical doc model in `docs/mimi-system-architecture.md`
- Persistence: `services/memoryService.ts` → `users/{uid}/memory` with `kind: 'memory_atom'`
- Creation paths: Scribe signals, ask/answer, manual
- Principle already locked: **propose → approve → remember**; never auto-commit

Residue Memory Atom adapter must emit **proposals** into an approval queue, not write approved atoms directly.

### 1.8 Charts / graphs

| Library | Usage |
| --- | --- |
| `d3` | `VibeGraph`, BiaxialMap, dossier/thread graphs |
| `recharts` | Aesthetic / archetype / lineage charts |
| `@react-three/fiber` | `LatentConstellation`, orbital taste scenes |
| `reactflow` | In `package.json` but **not meaningfully used** |

Residue Map / Taste Graph adapters should prefer **typed node/edge data** first; render with existing D3 / R3F patterns rather than introducing a new graph framework.

### 1.9 Prompts

- `src/mimi/system-prompt.md` — evidence-first constitution
- `lib/creativeDossierPrompts.ts` — shared prompt builders
- Inline ENGINE prompts in `geminiService.ts`
- `PROMPT_AUDIT.md` inventory
- Pattern: system instruction + task prompt + structured schema

### 1.10 Storage abstractions

Prefer extending existing patterns:

- Firestore under `users/{uid}/residue*` (private by default)
- Optional temporary / session-only mode (local or ephemeral doc with TTL flag)
- Do **not** invent a second database layer
- Do **not** couple artifact deletion to run deletion

### 1.11 Apify (current state + recommendation)

| Fact | Detail |
| --- | --- |
| In repo today | **No** `apify`, `apify-client`, `APIFY_*` env, or Actor code |
| Collective handoff | Already positions Apify as **extraction / scheduled observation**, not default Scry search; Prompt 7 = proposal only |
| Correct product path | **`apify-client` SDK integration** calling Store Actors behind `SourceAcquisitionProvider` |
| Do **not** | Actorize the Mimi app; put Residue scoring/synthesis on Apify; install package `apify` for app integration |
| Do **not** yet | Run `apify-generate-output-schema` — only after a real Actor produces stored dataset items |
| Stub | If `APIFY_TOKEN` missing: disabled provider, honest `status: "disabled"`, engine still runs on URL/upload/manual/search |
| Candidate Store Actors (verify before pin) | Reddit `trudax/reddit-scraper`; TikTok `clockworks/tiktok-scraper`; Instagram `apify/instagram-scraper`; Trends `apify/google-trends-scraper`; allowlisted articles `apify/website-content-crawler` |

---

## 2. Relevant current files

### Architecture & product docs
- `docs/mimi-system-architecture.md`
- `docs/mimi-chamber-implementation-audit.md`
- `docs/CURSOR_HANDOFF_COLLECTIVE_INTELLIGENCE.md`
- `docs/EVIDENCE_FOR_MIMI.md`
- `docs/CHAMBER_EVIDENCE_AUDIT.md`
- `AGENTS.md`, `README.md`, `security_spec.md`

### Types / contracts
- `types.ts`
- `services/engineContract.ts`
- `services/tailorProfileContract.ts`
- `constants/tailorSafetyRules.ts`
- `lib/intelHubWorkflow.ts`
- `lib/provenance.ts`
- `lib/productCanon.ts`

### AI / research
- `services/aiProvider.ts`, `geminiClient.ts`, `geminiService.ts`, `geminiAgents.ts`, `modelConfig.ts`
- `services/tailorAnalysisService.ts`, `creativeDossierService.ts`, `zineGenerator.ts`
- `services/researchService.ts`, `searchService.ts`, `scribeService.ts`, `vectorSearch.ts`
- `api/proxy/ai-gateway.ts`, `api/proxy/gemini.ts`
- `lib/creativeDossierPrompts.ts`, `src/mimi/system-prompt.md`

### Memory / context / taste
- `services/memoryService.ts`, `usedContextService.ts`
- `services/tasteGraphService.ts`, `tasteEngine.ts`, `clusteringService.ts`

### UI targets
- `components/IntelHub.tsx`, `IntelProjectControl.tsx`
- `components/chambers/TheEditChamber.tsx`, `ThePressChamber.tsx`, `ScribeChamber.tsx`
- `components/TheForecast.tsx`, `WeeklyDriftReport.tsx`
- `components/VibeGraph.tsx`, `LatentConstellation.tsx`
- `App.tsx`, `components/navigationConfig.ts`

### Storage / rules
- `firebase-blueprint.json`, `firestore.rules`
- `services/firebase.ts`, `firebaseUtils.ts`, `localArchive.ts`, `draftStorage.ts`

### Verify / test patterns
- `scripts/verifyUsedContextFlow.ts`, `verifyIntelHubWorkflow.ts`
- `e2e/`, `playwright.config.ts`

---

## 3. Architecture proposal

### 3.1 Placement (repository convention)

User sketch suggested `src/intelligence/residue/`. **Do not use that path.**

Primary intelligence already lives under **`services/`**. `src/mimi/` is a side experiment.

**Recommended tree:**

```
services/residue/
  index.ts
  types.ts                 # re-exports + non-Zod helpers
  constants.ts
  validation.ts            # Zod schemas (source of truth)
  provenance.ts            # residue-specific provenance builders
  scoring.ts
  uncertainty.ts
  pipeline.ts              # staged orchestration + partial recovery

  shared/
    normalizeSources.ts
    extractEvidence.ts
    generateAssociations.ts
    findCounterSignals.ts
    calibrateConfidence.ts
    buildSourceManifest.ts
    buildUsedContext.ts
    meanMedianMode.ts

  cultural/
    culturalResidueEngine.ts
    culturalResidueSchema.ts
    classifyAssociations.ts
    buildCulturalLineage.ts
    detectCommercialAbsorption.ts
    detectComputationalResidue.ts
    detectLostAndSurvivingMeaning.ts

  emotional/
    emotionalResidueEngine.ts
    emotionalResidueSchema.ts
    buildInterpretiveNeighborhoods.ts
    classifyReportedResponses.ts
    mapTypicalOutcomes.ts
    separateResearchFromCommunityReports.ts
    emotionalSafety.ts

  adapters/
    zineAdapter.ts
    intelligenceReportAdapter.ts
    intelHubAdapter.ts
    editAdapter.ts
    forecastAdapter.ts
    meanMedianModeAdapter.ts
    memoryAtomAdapter.ts
    tasteGraphAdapter.ts

  renderers/
    markdownRenderer.ts
    jsonRenderer.ts
    graphRenderer.ts
    editorialRenderer.ts
    citationRenderer.ts

  prompts/
    sharedSystemPrompt.ts
    culturalResiduePrompt.ts
    emotionalResiduePrompt.ts
    counterSignalPrompt.ts
    synthesisPrompt.ts

  acquisition/
    SourceAcquisitionProvider.ts
    providers/
      directUrlFetcher.ts
      uploadedDocumentProvider.ts
      searchProvider.ts
      manualSourceProvider.ts
      apify/
        apifyClient.ts                    # Phase 9; lazy; optional
        apifySourceAcquisitionProvider.ts # disabled stub until APIFY_TOKEN
        actorRegistry.ts
        normalizers/*.ts

  storage/
    residueStore.ts                       # Firestore CRUD under users/{uid}/…

components/residue/
  ResidueEngineView.tsx
  ResidueComposer.tsx
  ResidueResultTabs.tsx
  CulturalResiduePanel.tsx
  EmotionalResiduePanel.tsx
  EvidenceAuditPanel.tsx
  MeanMedianModePanel.tsx
  ResidueSafetyNotice.tsx

api/residue/
  run.ts
  runs.ts
  artifacts.ts

lib/
  residueCanon.ts                         # route / module registration helpers

docs/
  residue-engine.md                       # Phase 10 user-facing architecture
  residue-engine-phase1-audit.md          # this document
```

### 3.2 Shared pipeline

```
INPUT
 → SOURCE ACQUISITION (provider interface; Apify optional)
 → SOURCE NORMALIZATION
 → EVIDENCE EXTRACTION (per-source, independently testable)
 → ASSOCIATION GENERATION
 → INTERPRETIVE CLASSIFICATION (mode-specific)
 → COUNTERSIGNAL SEARCH
 → CONFIDENCE CALIBRATION
 → RESIDUE SYNTHESIS (module-neutral result)
 → MODULE ADAPTERS (on request)
 → SCHEMA VALIDATE + PERSIST provenance / Used Context
 → STRUCTURED RESULT + HUMAN-READABLE ARTIFACT
```

Hard rules:

1. Cultural and Emotional modes share evidence/provenance/scoring; **separate schemas and safety**.
2. Every claim: `observed | reported | historical | interpretive | causal-hypothesis | model-proposed`.
3. Evidence layers A/B/C/D disclosed on claims and ConfidenceSummary.
4. Community sources = language/narratives/patterns; never objective truth or diagnosis.
5. Stages fail independently → `partial` result with recoverable stage errors.
6. Invalid structured model output → retry once, then stage failure with warning.
7. Adapters consume structured residue results; they do not re-run research.

### 3.3 Dual modes

**Cultural Residue** — “How did this idea travel through society?”  
Lineage stages, cultural codes, commercial absorption, computational residue, lost/surviving meanings.

**Emotional Residue** — Computational phenomenology: “What have humans meant when they reported something that feels like this?”  
Interpretive neighborhoods, response patterns, research vs community separation, non-diagnostic language (`emotionalSafety.ts` + Tailor forbidden patterns).

### 3.4 Mean / Median / Mode

Implement as adapter over coded signals:

- Quantitative windows → literal statistics
- Qualitative corpora → labeled editorial-analytical metaphor
- Always expose outliers, counter-mode, spread, confidence
- Never blur literal vs interpretive

Align naming with Observatory handoff, but Residue MMM is **per-run interpretive analysis**, while collective MMM (future) is consent-gated aggregate dashboard — keep types related but namespaces distinct (`ResidueMeanMedianModeResult` vs future `CentralTendencyProfile`).

### 3.5 Module adapters

| Adapter | Consumes | Produces |
| --- | --- | --- |
| Zine | Residue result | Structured pages (not flattened prose) |
| Intelligence Report | Residue result | Formal report sections |
| Intel Hub | Residue run | Reusable intel object + history filters |
| The Edit | Cultural codes / emotional tone | Editorial direction (no diagnosis styling) |
| Forecast | Momentum + claims | Scenarios + counter-scenarios + disconfirmers |
| Memory Atoms | Claims / neighborhoods | **Proposed** atoms → approval queue |
| Taste Graph | Concepts/codes/sources | Nodes/edges; user prefs visually distinct from public evidence |
| Mean/Median/Mode | Signals | Dual literal/interpretive readout |

### 3.6 Storage model (Firestore)

Under `users/{uid}/`:

| Collection | Contents |
| --- | --- |
| `residueRuns` | metadata, mode, input hash, status, confidence summary, warnings |
| `residueSources` | SourceReference docs (or nested + indexed) |
| `residueEvidence` | EvidenceRecord |
| `residueClaims` | ResidueClaim |
| `residueAssociations` | ResidueAssociation |
| `residueArtifacts` | Adapter outputs (zine pages, reports, forecasts…) |
| `residueMemoryProposals` | Proposed atoms awaiting approval |

Emotional inputs: consent flag, `retention: temporary|persisted`, redacted error telemetry, never cross-user visible, never analytics of raw emotional text.

### 3.7 UI

New chamber/view `residue` (or nested under Intel Hub initially):

States: Empty → Composer → Source selection → Running → Partial → Complete → Recoverable error → Saved run  

Tabs: Overview · Map · Lineage/Neighborhoods · Mean/Median/Mode · Evidence · Counter-signals · Used Context · Outputs  

Emotional UI always shows non-diagnostic notice.

Preserve existing visual language; register in `productCanon.ts` + navigation carefully (avoid unrelated chamber rebuilds).

### 3.8 Apify Phase 9 (deferred)

```
Residue callers → SourceAcquisitionProvider → providers
  direct | upload | search | manual | apify(stub|live)
       → NormalizedSource[] → Residue Engine (no apify imports)
```

Install `apify-client` only when implementing Phase 9. Keep Actor IDs in `actorRegistry.ts`. Generate Apify output schemas **only after** real dataset items exist.

---

## 4. Implementation sequence

| Phase | Work | Exit criteria |
| --- | --- | --- |
| **1** | This audit | Findings + file plan returned; no engine code |
| **2** | Shared Zod schemas, scoring, provenance, uncertainty, Firestore store stubs, constants | Runtime validation tests green |
| **3** | Cultural Residue engine + shared pipeline stages | Cultural fixture (`office siren`) produces schema-valid result with provenance |
| **4** | Emotional Residue engine + safety layer | Emotional fixtures non-diagnostic; research ≠ community |
| **5** | Mean / Median / Mode adapter | Literal + interpretive paths labeled |
| **6** | Intel Hub + Intelligence Report adapters + run persistence UI hooks | Runs reopenable; report structured |
| **7** | Zine, Edit, Forecast, Taste Graph, Memory Atom adapters | One run → multiple artifacts; atoms require approval |
| **8** | Residue UI chamber | States/tabs/safety notice; design system preserved |
| **9** | Optional Apify acquisition adapter | Disabled stub without token; live Store Actors with allowlists when configured |
| **10** | Tests, docs, rules, verify script, migration verification | Acceptance criteria checklist complete |

After each phase: files changed, decisions, commands, tests, limitations, next phase.

---

## 5. Migration risks

| Risk | Mitigation |
| --- | --- |
| Confusing Residue with Scry / Forecast mocks | Separate types; honest empty/partial statuses; do not call `researchService` mocks as evidence |
| Blowing up `types.ts` further | Keep Residue Zod schemas in `services/residue/validation.ts`; export selected types; add thin pointers in `types.ts` only if needed |
| Overloading Intel Hub | Add residue run store first; UI can live as Residue view that **hands off** to Intel Hub rather than rewriting IntelHub capabilities tab |
| Used Context shape mismatch | Extend with residue-specific `UsedContextEntry` in residue module; map to existing Studio/Edit snapshots at adapter boundary |
| Memory Atom auto-write | Adapter writes only to `residueMemoryProposals`; Scribe/memoryService commit stays approval-gated |
| Emotional safety regressions | Reuse + extend `tailorSafetyRules`; dedicated linguistic tests; UI notice mandatory |
| Apify package confusion | Only `apify-client` in app; never actorize Mimi; never invent output schemas pre-run |
| Firestore rules gaps | Add explicit residue subcollection rules; temporary runs + delete API |
| Simulated confidence culture | Scoring must be explainable (coverage, diversity, layer strength) — ban random costume scores |
| Scope creep into Observatory/MMM collective | Residue MMM is per-run; collective dashboard remains separate future work |
| Giant `App.tsx` edits | Minimal route registration; lazy-load Residue view like other chambers |
| Prompt monolith | Stage prompts only; forbid single-call full analysis |

---

## 6. Files that will be created

### Core engine (Phases 2–5)
- `services/residue/index.ts`
- `services/residue/types.ts`
- `services/residue/constants.ts`
- `services/residue/validation.ts`
- `services/residue/provenance.ts`
- `services/residue/scoring.ts`
- `services/residue/uncertainty.ts`
- `services/residue/pipeline.ts`
- `services/residue/shared/*.ts` (normalize, extract, associations, countersignals, confidence, manifests, used context, meanMedianMode)
- `services/residue/cultural/*.ts`
- `services/residue/emotional/*.ts`
- `services/residue/prompts/*.ts`
- `services/residue/storage/residueStore.ts`
- `services/residue/acquisition/SourceAcquisitionProvider.ts`
- `services/residue/acquisition/providers/{directUrlFetcher,uploadedDocumentProvider,searchProvider,manualSourceProvider}.ts`
- `services/residue/acquisition/providers/apify/apifySourceAcquisitionProvider.ts` (disabled stub early; live Phase 9)

### Adapters / renderers (Phases 5–7)
- `services/residue/adapters/*.ts`
- `services/residue/renderers/*.ts`

### API / lib / UI (Phases 6–8)
- `api/residue/run.ts`, `runs.ts`, `artifacts.ts`
- `lib/residueCanon.ts` (optional thin helper)
- `components/residue/*.tsx`

### Tests / docs / ops (Phases 2–10)
- `services/residue/__tests__/*` or `scripts/verifyResidueEngine.ts`
- `docs/residue-engine.md`
- `.env.example` entries for `APIFY_TOKEN` (commented)
- Firestore rules snippets for residue collections
- Optional `firebase-blueprint.json` entity additions

**Not created in Phase 1–8:** Apify Actor repo, `.actor/*`, `apify` SDK package, fabricated Actor output schemas.

---

## 7. Files that will be modified

| File | Change (minimal) |
| --- | --- |
| `App.tsx` | Lazy route for Residue view |
| `lib/productCanon.ts` | Register Residue module + aliases |
| `components/navigationConfig.ts` | Nav entry (Intel / Observatory adjacency TBD) |
| `firestore.rules` | Owner-scoped residue subcollections + delete |
| `firebase-blueprint.json` | Document residue entities |
| `.env.example` | `APIFY_TOKEN` documentation |
| `package.json` | Test/verify script; **later** `apify-client` dependency (Phase 9 only) |
| `types.ts` | Optional re-exports / union extensions only if required for UI |
| `components/IntelHub.tsx` / `lib/intelHubWorkflow.ts` | Handoff hooks for residue runs (Phase 6) — avoid rewrite |
| `services/usedContextService.ts` | Optional bridge for residue → studio/edit snapshots |
| `services/memoryService.ts` | Consume approved proposals only (Phase 7) |
| `constants/tailorSafetyRules.ts` or emotional twin | Shared forbidden diagnostic patterns |
| Verify/e2e suites | Residue coverage |

**Explicit non-goals (do not modify unless required for wiring):** Tailor core pipeline, Stripe, Shopify, Doll systems, unrelated chambers, `src/mimi` Claude experiment, Forecast mock replacement beyond Residue forecast adapter.

---

## 8. Acceptance mapping (preview)

| Criterion | Plan touchpoint |
| --- | --- |
| Separate cultural/emotional modes | `cultural/` + `emotional/` schemas + engines |
| Shared evidence/provenance | `shared/` + `provenance.ts` + storage |
| Traceable or model-proposed claims | `ClaimStatus` + evidence IDs |
| Research ≠ community | Layer A–D + emotional separator |
| Non-diagnostic emotional output | `emotionalSafety.ts` + UI notice + tests |
| MMM literal + interpretive | `meanMedianMode.ts` + adapter |
| One run → many artifacts | adapters/ |
| Zine structured pages | `zineAdapter.ts` |
| Reports / Intel Hub / Edit / Forecast / Taste / Memory proposals | respective adapters |
| Used Context visible | `buildUsedContext.ts` + UI tab |
| Runtime schema validation | Zod in `validation.ts` |
| Tests | Phase 10 + per-phase unit tests |
| Existing Mimi intact | Minimal surface wiring; no unrelated rebuilds |

---

## 9. Phase 1 decisions locked

1. Path: **`services/residue/`** (not `src/intelligence/residue/`).
2. Validation: **Zod** as runtime contract; GenAI structured output retained at call sites.
3. AI: reuse existing providers/`modelConfig`; staged pipeline; no new provider.
4. Storage: Firestore `users/{uid}/residue*` + temporary retention option.
5. Apify: acquisition-only via `apify-client` behind provider interface; stub without token; **no output schema generation yet**; do not actorize Mimi.
6. Safety: extend Tailor non-diagnostic patterns for Emotional Residue.
7. MMM: Residue per-run adapter distinct from future collective Observatory dashboard.
8. Implementation starts only after this audit is accepted as Phase 1 complete.

---

## 10. Next step

**Await confirmation to begin Phase 2** (shared schemas, validation, provenance, scoring, uncertainty, storage models). No Residue engine implementation code has been written in this phase.
