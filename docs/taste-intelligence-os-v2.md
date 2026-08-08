# Taste Intelligence OS v2

Status: **partial → shipped (foundation + Calibration Lab vertical slice)**  
Model versions: `mimi-taste-model-v1` (existing), `mimi-taste-model-v2` (additive extension payload)  
Algorithm: `taste-intel-v2.0.0`

## Implementation inventory

| Area | Location | Status |
| --- | --- | --- |
| Evidence-based compiler (v1) | `lib/tasteModel/*` | existing, reused |
| Taste Intelligence contracts | `schemas/tasteIntelligenceContracts.ts` | **new** |
| Active learning / pairwise | `lib/tasteIntelligence/*` | **new** |
| Neon persistence | `infrastructure/database/neon/schema.ts` + migration `0001_taste_intelligence` | **new** |
| Repository | `domain/tasteIntelligence/repository.ts`, `infrastructure/database/neon/tasteIntelligenceRepository.ts` | **new** |
| Authenticated API | `lib/tasteIntelligenceRoute.ts`, `api/mimi/taste-intelligence/[[...path]].ts` | **new** |
| React client | `services/tasteIntelligenceClient.ts` | **new** |
| Firestore dual-write/read | `services/tasteModelService.ts` | **updated** |
| Calibration Lab UI | `components/tailor/CalibrationLab.tsx`, `/tailor/calibrate` | **new** |
| Sentinel memory review | `components/sentinel/SentinelMemoryReview.tsx` | **new** (CaptiveSentinel unchanged) |
| Migration utility | `scripts/migrateTasteIntelligenceToNeon.ts` | **new** |
| Verification | `scripts/verifyTasteIntelligence.ts`, `__tests__/tasteIntelligence.test.ts` | **new** |

## Canonical ownership

| Concept | Owner | Notes |
| --- | --- | --- |
| Source evidence | Tailor / Pocket / Scry lanes | unchanged |
| Observations / Pattern clusters | Tailor Profile v2 + Taste Graph | no second graph |
| Computational snapshot | `TasteModelSnapshot` (derived) | rebuildable |
| Operational writes (new) | Neon via API | ADR 001 |
| Legacy events/snapshots | Firestore (read fallback) | dual-read during migration |
| Collective signals | `services/collective/*` | reused, opt-in only |
| Agent memory policy | Sentinel headless layer + Neon `memory_proposals` / `memory_atoms` | no second memory DB |

## Feature matrix

| # | Feature | Status |
| --- | --- | --- |
| 1 | Calibration Lab | **shipped** (`/tailor/calibrate`) |
| 2 | Active learning | **shipped** (`selectCalibrationPair.ts`) |
| 3 | Negative taste | **shipped** (refusal API + Pattern Graph refine sheet) |
| 4 | Graph model editing | **shipped** (`modelEdits.ts` + Pattern Graph inspector) |
| 5 | Counterfactuals | **shipped** (deterministic) |
| 6 | Taste Compiler | **shipped** (`compileGenerationContract.ts`) |
| 7 | Taste Critic | **shipped** (deterministic stage 2; AI extraction server-only path stubbed via rule extract) |
| 8 | Aligned / Adjacent / Divergent | **shipped** (compiler modes) |
| 9 | Saturation | **shipped** (`saturation.ts`) |
| 10 | Trajectories v2 | **shipped** (`trajectories.ts`) |
| 11 | Taste-aware Scry search | **logic shipped** (`tasteSearch.ts`); Scry UI integration partial |
| 12 | Contradictions | **shipped** (`contradictions.ts`) |
| 13 | Why saved | **logic shipped** (`savedReason.ts`); Pocket flow partial |
| 14 | Creative experiments | **logic + persistence shipped** |
| 15 | Sentinel memory policy | **shipped** (headless + review component) |
| 16 | Taste Passport | **shipped** (build/export/import) |
| 17 | Collaborative contracts | **shipped** (workspace-scoped) |
| 18 | Cultural positioning | **shipped** (aggregate-only) |
| 19 | Collective opt-in | **existing** (`verify:collective`) |
| 20 | Learning evaluation | **shipped** (`evaluation.ts`) |
| 21 | Entitlements | **shipped** (`lib/tasteIntelligence/entitlements.ts`) |
| 22 | Infrastructure / tests | **foundation shipped** |

## Database tables (Neon `mimi` schema)

- `taste_learning_events`
- `taste_model_snapshots`
- `taste_calibration_sessions`
- `taste_calibration_pairs`
- `taste_pairwise_judgments`
- `taste_refusals`
- `taste_model_edits`
- `taste_generation_contracts`
- `taste_critiques`
- `taste_exposure_events`
- `taste_experiments`
- `taste_passports`
- `collaborative_taste_contracts`
- `taste_evaluation_events`
- `sentinel_memory_policies`
- `saved_reason_hypotheses`
- `cultural_positioning_reports`

JSONB holds versioned payloads; relational columns support owner/project/status/recency indexes.

## API ownership

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/mimi/taste-intelligence/calibration/start` | POST | Start/resume session + next pair |
| `/api/mimi/taste-intelligence/calibration/judgment` | POST | Record judgment + deltas |
| `/api/mimi/taste-intelligence/calibration/session` | GET | Active session |
| `/api/mimi/taste-intelligence/snapshot/latest` | GET | Latest snapshot (Neon-first) |
| `/api/mimi/taste-intelligence/refusals` | GET | Active refusals |

Auth: `verifyMimiSession`. Writes: idempotent keys. AI-backed critic extraction: future route via `ai/operations` (credits).

## UI ownership

| Surface | Route / component |
| --- | --- |
| Calibration Lab | `/tailor/calibrate` → `CalibrationLab` |
| Graph editing | `PatternGraphScreen` + `TasteModelInspector` |
| Compiler / critic / modes | Studio generation surfaces (integrate via contracts) |
| Scry reranking | `ScryView` (consume `tasteSearch.ts`) |
| Why saved | Pocket capture flow |
| Passport | Profile / private universe |
| Collaboration | Workspace Tailor context |
| Cultural / evaluation | Tailor Diagnostics / Observatory |
| Sentinel review | `SentinelMemoryReview` |

## Schema version strategy

- v1 snapshots (`schemaVersion: 1`, `mimi-taste-model-v1`) remain valid.
- v2 adds optional extension payload (`tasteModelSnapshotV2ExtensionSchema`) for calibration deltas, refusals, saturation, trajectories — without breaking v1 consumers.
- Adapters project v2 → v1 graph UI where needed.

## Migration strategy

1. **Dual-write**: new events/snapshots → Firestore + Neon (best-effort).
2. **Dual-read**: Neon preferred, Firestore fallback (`getTasteModelSnapshot`).
3. **Backfill**: `scripts/migrateTasteIntelligenceToNeon.ts` (`--dry-run`, `--user=`, `--batch=`).
4. **Dedup**: `legacy_record_map` tracks Firestore → Neon mappings.
5. **No destructive deletes** of legacy data.

## Privacy boundaries

- No sensitive-trait inference (see mission privacy policy).
- Passport default: `includedEvidenceMode: "none"`.
- Private taste state never in `profiles_public`.
- Collective contribution uses existing consent helpers only.

## Feature flags

`lib/tasteIntelligence/featureFlags.ts`: `tasteCalibrationV2`, `tasteNegativeModel`, `tasteGraphEditorV2`, `tasteCompiler`, `tasteCritic`, `tasteSemanticSearchV2`, `tasteSentinelMemory`, `tastePassport`, `tasteCollaboration`, `tasteCulturalPositioning`, `tasteEvaluation`.

Default: conservative private-data behavior if misconfigured.

## Entitlement mapping

See `lib/tasteIntelligence/entitlements.ts` — maps `free` / `trial` / `creator` / `studio` / `team` to keys such as `taste.calibration.active_learning`, `taste.compiler`, `taste.collaboration`. Export/deletion never paywalled.

## Performance risks

- Pair scoring is O(n²) over candidates — cap candidate pool server-side.
- Snapshot JSONB size — monitor feature count; paginate graph UI.
- Scry rerank adds CPU per result — batch and cache saturation states per session.

## Tests & verification

```bash
npm run lint
npm run test:unit -- __tests__/tasteIntelligence.test.ts
npm run verify:taste-intelligence
npm run verify:taste-model
npm run verify:collective
```

## Known limitations

- Full Scry UI “why matched” panels not yet wired in `ScryView`.
- AI-assisted critic feature extraction route pending dedicated operation registration.
- Graph editor UI for merge/split/connect is partial — merge/split behind `TASTE_GRAPH_MERGE_SPLIT=1`; connect/disconnect/rename/refine shipped in Pattern Graph.
- Collaborative contract workspace UI is API-ready, not a full chamber yet.
- Neon required for Calibration Lab persistence in production; local dev falls back gracefully.

## Rollout phases

1. **Foundation** (this PR): schema, APIs, calibration, core logic, tests.
2. **Surface integration**: Scry rerank UI, Pocket why-saved, Studio compiler/critic cards.
3. **Team**: collaborative contract UI + shared critic.
4. **Evaluation dashboard** in Tailor Diagnostics.
