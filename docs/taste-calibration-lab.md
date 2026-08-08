# Taste Calibration Lab

Taste Calibration is Mimi's pairwise active-learning loop inside Tailor. A signed-in creator compares two project references, states a preference boundary, and Mimi records that judgment as canonical operational state in Neon while updating a derived taste model snapshot for the session.

**Canonical surface:** `/tailor/calibrate` → `components/tailor/CalibrationLab.tsx` (single Tailor tab: **Calibration Lab** / note: **refine**).

## Product purpose

Calibration sharpens the taste boundary when passive evidence and cluster curation leave residual uncertainty. Each answer is an explicit pairwise judgment — stronger than views or lingers — and is used to refine feature weights without replacing the full computational taste compiler.

Default session length: **10 questions**. Sessions can be paused, resumed, finished early, or skipped per pair.

## Canonical architecture

| Layer | Location |
| --- | --- |
| Active learning / pairwise math | `lib/tasteIntelligence/*` (`selectCalibrationPair.ts`, `pairwisePreference.ts`) |
| Runtime contracts | `schemas/tasteIntelligenceContracts.ts` |
| Repository interface | `domain/tasteIntelligence/repository.ts` |
| Neon implementation | `infrastructure/database/neon/tasteIntelligenceRepository.ts` |
| Schema + migration | `infrastructure/database/neon/schema.ts`, migration `0001_taste_intelligence` |
| Authenticated API | `lib/tasteIntelligenceRoute.ts`, `api/mimi/taste-intelligence/[[...path]].ts` |
| React client | `services/tasteIntelligenceClient.ts` |
| UI | `components/tailor/CalibrationLab.tsx` |
| Verification | `scripts/verifyTasteIntelligence.ts`, `__tests__/tasteIntelligence.test.ts` |

**Do not use** the superseded parallel stack (`lib/tasteCalibration/*`, `domain/tasteCalibration/*`, `/api/mimi/taste-calibration/*`) — it was prototyped on a branch and merged into the Taste Intelligence OS v2 spine instead (see `docs/DECISIONS.md`).

## Pair-selection algorithm

Pair selection is **deterministic and seeded** (`taste-intel-v2.0.0`). Implementation: `lib/tasteIntelligence/selectCalibrationPair.ts`.

```
priority =
  uncertainty × 0.40
  + featureDisagreement × 0.22
  + coverageGap × 0.15
  + contradictionValue × 0.10
  + trajectoryValue × 0.08
  + calibratedNovelty × 0.05
  − repetitionPenalty
  − fatiguePenalty
```

Favored pairs:

- predicted preference near 50/50
- disagreement between plausible explanations
- weakly known features
- emerging trajectory signals
- project-relevant references

Avoided pairs:

- duplicates and near-duplicates
- pairs dominated by already-high-confidence features
- repetitive feature testing (fatigue penalty)

`selectionReason` is built from isolated feature labels and uncertainty scores — not LLM-generated prose.

## Preference-update mathematics

Pairwise updates use a Bradley-Terry / logistic formulation (`lib/tasteIntelligence/pairwisePreference.ts`):

```
P(left > right) = sigmoid((utility(left) − utility(right)) / temperature)
```

Judgment semantics:

| Choice | Effect |
| --- | --- |
| `left` | positive evidence for left-only features; negative for right-only |
| `right` | inverse of left |
| `both` | mild positive for shared boundary satisfaction; no forced winner |
| `neither` | negative evidence for isolated features on both sides |
| `skip` | no update |

Sparse calibration data shrinks toward the existing base snapshot (`CALIBRATION_SHRINKAGE_ALPHA` in `lib/tasteIntelligence/constants.ts`). Selected `decidingFeatureIds` receive amplified weight during update.

## Model-delta behavior

After each judgment the server:

1. applies the pairwise update via `applyPairwiseJudgment`
2. compares against the previous snapshot
3. returns calibration deltas keyed by feature ID
4. includes materially changed features for UI arrows

Confidence arrows in the UI refer to **specific features**, not a universal "Mimi knows you X%" score.

## Neon storage

Tables (schema `mimi`, migration `0001_taste_intelligence`):

- `taste_calibration_sessions` — owner, project, seed, status, snapshot refs
- `taste_calibration_pairs` — candidates, isolated features, selection reason, predicted preference, information gain
- `taste_pairwise_judgments` — choice, deciding features, note, scope

Related Taste Intelligence tables (negative taste, model edits, snapshots):

- `taste_refusals`
- `taste_model_edits`
- `taste_model_snapshots`
- `taste_learning_events`

Repository contracts: `domain/tasteIntelligence/repository.ts`  
Neon implementation: `infrastructure/database/neon/tasteIntelligenceRepository.ts`

## API flow

All routes require a verified Mimi session (`Authorization: Bearer` Firebase ID token).

| Method | Path | Action |
| --- | --- | --- |
| POST | `/api/mimi/taste-intelligence/calibration/start` | Start/resume session + next pair |
| POST | `/api/mimi/taste-intelligence/calibration/judgment` | Record judgment + deltas |
| GET | `/api/mimi/taste-intelligence/calibration/session` | Active session |
| GET | `/api/mimi/taste-intelligence/snapshot/latest` | Latest snapshot (Neon-first) |
| POST | `/api/mimi/taste-intelligence/snapshot/persist` | Persist recompiled snapshot |
| GET | `/api/mimi/taste-intelligence/refusals` | Active refusals |
| POST | `/api/mimi/taste-intelligence/refusals` | Create/update explicit refusal |
| POST | `/api/mimi/taste-intelligence/model-edits` | Append immutable edit + return delta |
| POST | `/api/mimi/taste-intelligence/model-edits/undo` | Undo last edit when inverse exists |

React calls these authenticated APIs only — no direct Neon access.

## Privacy boundaries

- Judgments are owner-scoped; cross-user reads return 404.
- Project scope does not leak globally: sessions and refusals are keyed by `owner_id` + optional `project_id`.
- Legacy Firestore taste snapshots are read for base model compatibility during migration; **new canonical calibration/refusal/edit writes go to Neon**.

## Known limitations

- Requires at least two analyzed project references with extractable feature tags.
- Undo replays inverse edit events; full judgment-chain replay from baseline is not yet implemented.
- Embedding similarity is not used in pair ranking (tag/feature overlap only).
- Workspace membership checks are owner-based; shared-workspace editors are not yet authorized separately.

## Future active-learning improvements

- Replay undo from baseline through judgment history
- Embedding-aware pair isolation
- Cross-session fatigue across projects
- Workspace role-aware authorization

## Verification

```bash
npm run verify:taste-intelligence
npm run verify:taste-calibration
npx vitest run __tests__/tasteIntelligence.test.ts
npx vitest run __tests__/tailorHub.test.ts
```
