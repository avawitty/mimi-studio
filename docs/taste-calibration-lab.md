# Taste Calibration Lab

Taste Calibration is Mimi's pairwise active-learning loop inside Tailor. A signed-in creator compares two project references, states a preference boundary, and Mimi records that judgment as canonical operational state in Neon while updating a derived taste model snapshot for the session.

## Product purpose

Calibration sharpens the taste boundary when passive evidence and cluster curation leave residual uncertainty. Each answer is an explicit pairwise judgment — stronger than views or lingers — and is used to refine feature weights without replacing the full computational taste compiler.

Default session length: **10 questions**. Sessions can be paused, resumed, finished early, or skipped per pair.

## Pair-selection algorithm

Pair selection is **deterministic and seeded** (`taste-calibration-v1`). For each candidate pair:

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

`selectionReason.explanation` is built from isolated feature labels and uncertainty scores — not LLM-generated prose.

## Preference-update mathematics

Pairwise updates use a Bradley-Terry / logistic formulation:

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

Sparse calibration data shrinks toward the existing Firestore-read base snapshot (`sparseShrinkageAlpha`). Selected `decidingFeatureIds` receive `decidingFeatureMultiplier` weight.

## Model-delta behavior

After each judgment the server:

1. applies the pairwise update to the session model state
2. compares against the previous snapshot
3. returns `TasteModelDelta` with **only materially changed features** (`materialWeightDelta`, `materialConfidenceDelta`)
4. includes `remainingUncertaintyFeatureIds` (low-confidence features)

Confidence arrows in the UI refer to **specific features**, not a universal "Mimi knows you X%" score.

## Neon storage

Tables (schema `mimi`):

- `taste_calibration_sessions` — owner, project, seed, status, snapshot refs, `current_model_state`
- `taste_calibration_pairs` — candidates, isolated features, selection reason, predicted preference, information gain
- `taste_pairwise_judgments` — choice, deciding features, note, scope

Indexes: owner+created_at, project, session, active sessions.

Repository contracts: `domain/tasteCalibration/repository.ts`  
Neon implementation: `infrastructure/database/neon/tasteCalibrationRepository.ts`

## API flow

All routes require a verified Mimi session (`x-user-token` or session cookie).

| Method | Path | Action |
| --- | --- | --- |
| POST | `/api/mimi/taste-calibration/session` | `createCalibrationSession` |
| GET | `/api/mimi/taste-calibration/session?sessionId=` | `getCalibrationSession` |
| GET | `/api/mimi/taste-calibration/next-pair?sessionId=` | `getNextCalibrationPair` |
| POST | `/api/mimi/taste-calibration/judgment` | `submitCalibrationJudgment` (requires `Idempotency-Key`) |
| POST | `/api/mimi/taste-calibration/complete` | `completeCalibrationSession` |
| POST | `/api/mimi/taste-calibration/pause` | pause session |

React calls these authenticated APIs only — no direct Neon access.

## Privacy boundaries

- Judgments are owner-scoped; cross-user reads return 404 (`SESSION_ACCESS_DENIED`).
- Project scope does not leak globally: sessions are keyed by `owner_id` + `project_id`.
- Legacy Firestore taste snapshots are read for base model compatibility; **new canonical calibration writes go to Neon only**.

## Known limitations

- Requires at least two analyzed project references with extractable feature tags.
- Session model state is stored in Neon; Firestore snapshot recompile is not written back (read-compatible only).
- Undo removes the last judgment row but does not yet replay the full model chain from baseline.
- Embedding similarity is not used in pair ranking (tag/feature overlap only).
- Workspace membership checks are owner-based; shared-workspace editors are not yet authorized separately.

## Future active-learning improvements

- Replay undo from baseline through judgment history
- Embedding-aware pair isolation
- Cross-session fatigue across projects
- Server-side merge of calibration evidence into the main taste compiler
- Workspace role-aware authorization

## Verification

```bash
npm run verify:taste-calibration
npx vitest run __tests__/tasteCalibration.test.ts
```
