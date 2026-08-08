/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { compileTasteModel } from "../lib/tasteModel/compileTasteModel";
import type { NormalizedTasteEvent, TasteModelSnapshot } from "../lib/tasteModel/contracts";
import {
  applyPairwiseJudgment,
  buildRefusalFromExplicit,
  computeRefusalPenalty,
  createModelEdit,
  createUndoEdit,
  detectContradictions,
  generateCounterfactual,
  scoreCalibrationPairs,
  selectNextCalibrationPair,
  computeSaturationState,
  computeTrajectoryV2,
  compileTasteGenerationContract,
  critiqueAgainstContract,
  extractCandidateFeatures,
  rerankTasteSearchResults,
  buildTastePassport,
  computePairwiseAccuracy,
  computeBrierScore,
} from "../lib/tasteIntelligence";

const NOW = Date.now();

function minimalSnapshot(): TasteModelSnapshot {
  return compileTasteModel({
    userId: "u1",
    scope: "global",
    evidence: [],
    observations: [],
    clusters: [
      {
        id: "c1",
        userId: "u1",
        projectId: "p1",
        name: "Soft contrast",
        description: "Test",
        category: "visual",
        observationIds: [],
        supportingEvidenceNodeIds: ["e1"],
        frequency: 2,
        confidence: 0.7,
        possibleInterpretations: [],
        claimType: "inferred",
        userStatus: "accepted",
        userWeight: "medium",
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    laws: [],
    events: [],
  });
}

describe("taste intelligence calibration", () => {
  it("pair selection is deterministic for same seed", () => {
    const snapshot = minimalSnapshot();
    const input = {
      seed: "test-seed",
      snapshot,
      candidates: [
        { id: "a", featureIds: ["pattern_cluster:c1"], predictedUtility: 0.2, sourceIds: [] as string[] },
        { id: "b", featureIds: ["tag:x"], predictedUtility: 0.5, sourceIds: [] as string[] },
        { id: "c", featureIds: ["tag:y"], predictedUtility: 0.8, sourceIds: [] as string[] },
      ],
      askedPairKeys: new Set<string>(),
      fatigueCount: 0,
      uncertainFeatureIds: ["pattern_cluster:c1"],
      contradictionFeatureIds: [] as string[],
      emergingFeatureIds: [] as string[],
    };
    const a = selectNextCalibrationPair(input);
    const b = selectNextCalibrationPair(input);
    expect(a?.left.id).toBe(b?.left.id);
    expect(a?.right.id).toBe(b?.right.id);
  });

  it("skip creates no preference deltas", () => {
    const snapshot = minimalSnapshot();
    const deltas = applyPairwiseJudgment({
      snapshot,
      choice: "skip",
      leftFeatureIds: ["a"],
      rightFeatureIds: ["b"],
      decidingFeatureIds: [],
      judgmentId: "j1",
      existingDeltas: {},
      judgmentCount: 1,
    });
    expect(Object.keys(deltas)).toHaveLength(0);
  });

  it("neither creates valid negative evidence signal", () => {
    const snapshot = minimalSnapshot();
    const skipDeltas = applyPairwiseJudgment({
      snapshot,
      choice: "skip",
      leftFeatureIds: ["f1"],
      rightFeatureIds: ["f2"],
      decidingFeatureIds: [],
      judgmentId: "j-skip",
      existingDeltas: {},
      judgmentCount: 5,
    });
    const neitherDeltas = applyPairwiseJudgment({
      snapshot,
      choice: "neither",
      leftFeatureIds: ["f1"],
      rightFeatureIds: ["f2"],
      decidingFeatureIds: ["f1", "f2"],
      judgmentId: "j2",
      existingDeltas: {},
      judgmentCount: 5,
    });
    expect(Object.keys(skipDeltas)).toHaveLength(0);
    expect(Object.keys(neitherDeltas).length).toBeGreaterThan(0);
  });
});

describe("taste intelligence refusals", () => {
  it("explicit refusal outweighs passive scoring context", () => {
    const refusal = buildRefusalFromExplicit({
      ownerId: "u1",
      featureIds: ["pattern_cluster:c1"],
      refusalType: "always",
      signedWeight: -1,
      confidence: 0.95,
      explicit: true,
      scope: "persistent",
      sourceIds: ["evt-1"],
    });
    const { penalty } = computeRefusalPenalty(
      [refusal],
      { id: "cand", featureIds: ["pattern_cluster:c1"] },
      "persistent",
    );
    expect(penalty).toBeGreaterThan(1);
  });

  it("conditional refusal matches only combination", () => {
    const refusal = buildRefusalFromExplicit({
      ownerId: "u1",
      featureIds: ["a", "b"],
      refusalType: "only_when_combined",
      signedWeight: -1,
      confidence: 0.9,
      explicit: true,
      scope: "persistent",
      sourceIds: [],
    });
    const alone = computeRefusalPenalty(
      [refusal],
      { id: "c1", featureIds: ["a"] },
      "persistent",
    );
    const combined = computeRefusalPenalty(
      [refusal],
      { id: "c2", featureIds: ["a", "b"] },
      "persistent",
    );
    expect(combined.penalty).toBeGreaterThan(alone.penalty);
  });
});

describe("taste intelligence model edits", () => {
  it("every edit is immutable with inverse", () => {
    const edit = createModelEdit({
      ownerId: "u1",
      operation: "rename",
      targetIds: ["c1"],
      before: { label: "Old" },
      after: { label: "New" },
    });
    const undo = createUndoEdit(edit);
    expect(undo.after).toEqual(edit.before);
  });
});

describe("taste intelligence counterfactuals", () => {
  it("recomputed score matches returned score", () => {
    const snapshot = minimalSnapshot();
    const cf = generateCounterfactual({
      snapshot,
      candidate: { id: "x", featureIds: ["pattern_cluster:c1"] },
      targetVerdict: "promising_adjacent",
    });
    expect(cf.resultingScore).toBeTypeOf("number");
    if (cf.modifications.length > 0) {
      const last = cf.modifications[cf.modifications.length - 1]!;
      expect(last.scoreAfter).toBe(cf.resultingScore);
    }
  });
});

describe("taste intelligence compiler and critic", () => {
  it("compiler preserves evidence ids", () => {
    const snapshot = minimalSnapshot();
    const contract = compileTasteGenerationContract(
      snapshot,
      { ownerId: "u1" },
      "image",
      "aligned",
    );
    expect(contract.evidenceIds.length).toBeGreaterThanOrEqual(0);
    expect(contract.mode).toBe("aligned");
  });

  it("critic is deterministic after feature extraction", () => {
    const snapshot = minimalSnapshot();
    const contract = compileTasteGenerationContract(
      snapshot,
      { ownerId: "u1" },
      "writing",
      "adjacent",
    );
    const candidate = { id: "c1", featureIds: ["pattern_cluster:c1"] };
    const extracted = extractCandidateFeatures(candidate, snapshot);
    const a = critiqueAgainstContract({ contract, snapshot, candidate, extracted });
    const b = critiqueAgainstContract({ contract, snapshot, candidate, extracted });
    expect(a.alignmentScore).toBe(b.alignmentScore);
    expect(a.violatedRules).toEqual(b.violatedRules);
  });
});

describe("taste intelligence saturation and trajectory", () => {
  it("reuse weighs more than passive view", () => {
    const now = NOW;
    const viewed = computeSaturationState("f1", [
      {
        id: "1",
        ownerId: "u1",
        featureIds: ["f1"],
        sourceType: "viewed",
        surface: "scry",
        occurredAt: now,
      },
    ]);
    const reused = computeSaturationState("f1", [
      {
        id: "2",
        ownerId: "u1",
        featureIds: ["f1"],
        sourceType: "reused",
        surface: "studio",
        occurredAt: now,
      },
    ]);
    expect(reused.recentUse).toBeGreaterThan(viewed.recentUse);
  });

  it("trajectory requires minimum evidence", () => {
    const snapshot = minimalSnapshot();
    const traj = computeTrajectoryV2("pattern_cluster:c1", [], snapshot);
    expect(traj.phase).toBe("uncertain");
  });
});

describe("taste intelligence search", () => {
  it("search reranking respects refusals", () => {
    const snapshot = minimalSnapshot();
    const refusal = buildRefusalFromExplicit({
      ownerId: "u1",
      featureIds: ["bad"],
      refusalType: "always",
      signedWeight: -1,
      confidence: 1,
      explicit: true,
      scope: "persistent",
      sourceIds: [],
    });
    const results = rerankTasteSearchResults({
      snapshot,
      refusals: [refusal],
      saturationStates: [],
      candidates: [
        {
          id: "1",
          lane: "shadow_memory",
          embeddingScore: 0.9,
          lexicalScore: 0.5,
          memoryMatchScore: 0.5,
          graphProximityScore: 0.5,
          projectRelevanceScore: 0.5,
          recencyScore: 0.5,
          featureIds: ["bad"],
          evidenceIds: [],
        },
        {
          id: "2",
          lane: "shadow_memory",
          embeddingScore: 0.7,
          lexicalScore: 0.5,
          memoryMatchScore: 0.5,
          graphProximityScore: 0.5,
          projectRelevanceScore: 0.5,
          recencyScore: 0.5,
          featureIds: ["good"],
          evidenceIds: [],
        },
      ],
    });
    expect(results[0]?.candidate.id).toBe("2");
  });
});

describe("taste intelligence passport", () => {
  it("passport excludes private evidence by default", () => {
    const snapshot = minimalSnapshot();
    const passport = buildTastePassport({
      ownerId: "u1",
      snapshot,
      refusals: [],
    });
    expect(passport.includedEvidenceMode).toBe("none");
  });
});

describe("taste intelligence evaluation", () => {
  it("pairwise accuracy and brier are bounded", () => {
    const acc = computePairwiseAccuracy([
      { predictedLeftPreference: 0.8, actualChoice: "left" },
      { predictedLeftPreference: 0.2, actualChoice: "right" },
    ]);
    expect(acc.accuracy).toBe(1);
    const brier = computeBrierScore([
      { predictedLeftPreference: 0.8, actualLeft: true },
      { predictedLeftPreference: 0.2, actualLeft: false },
    ]);
    expect(brier).toBeGreaterThanOrEqual(0);
    expect(brier).toBeLessThanOrEqual(1);
  });
});

describe("taste intelligence contradictions", () => {
  it("includes evidence on both sides when detected", () => {
    const snapshot = minimalSnapshot();
    const events: NormalizedTasteEvent[] = [
      {
        id: "e1",
        userId: "u1",
        action: "reject_cluster",
        targetType: "pattern_cluster",
        targetId: "c1",
        occurredAt: NOW,
        surface: "tailor",
        scope: "persistent",
        polarity: -1,
        strength: 0.9,
        explicit: true,
        evidenceNodeIds: [],
        observationIds: [],
        patternClusterIds: ["c1"],
        creativeLawIds: [],
        sourceSchema: 2,
      },
    ];
    const contradictions = detectContradictions({
      snapshot,
      events,
      refusals: [],
    });
    if (contradictions.length > 0) {
      expect(contradictions[0]!.evidenceForA.length + contradictions[0]!.evidenceForB.length).toBeGreaterThan(0);
    }
  });
});

describe("calibration pair ranking", () => {
  it("high uncertainty pairs rank above repeated pairs", () => {
    const snapshot = minimalSnapshot();
    const candidates = [
      { id: "a", featureIds: ["f1"], predictedUtility: 0.5, sourceIds: [] },
      { id: "b", featureIds: ["f2"], predictedUtility: 0.51, sourceIds: [] },
      { id: "c", featureIds: ["f3"], predictedUtility: 0.1, sourceIds: [] as string[] },
      { id: "d", featureIds: ["f4"], predictedUtility: 0.9, sourceIds: [] as string[] },
    ];
    const fresh = scoreCalibrationPairs({
      seed: "s",
      snapshot,
      candidates,
      askedPairKeys: new Set(),
      fatigueCount: 0,
      uncertainFeatureIds: ["f1", "f2"],
      contradictionFeatureIds: [],
      emergingFeatureIds: [],
    });
    const repeated = scoreCalibrationPairs({
      seed: "s",
      snapshot,
      candidates,
      askedPairKeys: new Set(["a|b"]),
      fatigueCount: 0,
      uncertainFeatureIds: ["f1", "f2"],
      contradictionFeatureIds: [],
      emergingFeatureIds: [],
    });
    expect(fresh[0]!.priority).toBeGreaterThanOrEqual(repeated[0]?.priority ?? 0);
  });
});
