/**
 * Taste Intelligence OS v2 verification.
 * Run: npm run verify:taste-intelligence
 */
import { compileTasteModel } from "../lib/tasteModel/compileTasteModel.js";
import {
  selectNextCalibrationPair,
  applyPairwiseJudgment,
  buildRefusalFromExplicit,
  computeRefusalPenalty,
  createModelEdit,
  generateCounterfactual,
  compileTasteGenerationContract,
  critiqueAgainstContract,
  extractCandidateFeatures,
  computeSaturationState,
  buildTastePassport,
  detectContradictions,
  computePairwiseAccuracy,
  explanationCoverage,
  TASTE_PLAN_ENTITLEMENTS,
} from "../lib/tasteIntelligence/index.js";
import {
  tasteCalibrationSessionSchema,
  tastePassportSchema,
} from "../schemas/tasteIntelligenceContracts.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const NOW = Date.now();
console.log("verify:taste-intelligence — starting");

const snapshot = compileTasteModel({
  userId: "verify-user",
  scope: "global",
  evidence: [],
  observations: [],
  clusters: [
    {
      id: "c1",
      userId: "verify-user",
      projectId: "p1",
      name: "Verify cluster",
      description: "d",
      category: "visual",
      observationIds: [],
      supportingEvidenceNodeIds: [],
      frequency: 1,
      confidence: 0.6,
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

const pair = selectNextCalibrationPair({
  seed: "verify",
  snapshot,
  candidates: [
    { id: "l", featureIds: ["pattern_cluster:c1"], predictedUtility: 0.4, sourceIds: [] },
    { id: "r", featureIds: ["tag:x"], predictedUtility: 0.6, sourceIds: [] },
  ],
  askedPairKeys: new Set(),
  fatigueCount: 0,
  uncertainFeatureIds: ["pattern_cluster:c1"],
  contradictionFeatureIds: [],
  emergingFeatureIds: [],
});
assert(pair !== null, "pair selection returns a pair");

const deltas = applyPairwiseJudgment({
  snapshot,
  choice: "left",
  leftFeatureIds: ["pattern_cluster:c1"],
  rightFeatureIds: ["tag:x"],
  decidingFeatureIds: ["pattern_cluster:c1"],
  judgmentId: "j1",
  existingDeltas: {},
  judgmentCount: 10,
});
assert(Object.keys(deltas).length > 0, "judgment updates deltas");

const refusal = buildRefusalFromExplicit({
  ownerId: "verify-user",
  featureIds: ["tag:x"],
  refusalType: "always",
  signedWeight: -1,
  confidence: 0.9,
  explicit: true,
  scope: "persistent",
  sourceIds: [],
});
const penalty = computeRefusalPenalty(
  [refusal],
  { id: "c", featureIds: ["tag:x"] },
  "persistent",
);
assert(penalty.penalty > 0, "refusal penalty");

const edit = createModelEdit({
  ownerId: "verify-user",
  operation: "rename",
  targetIds: ["c1"],
  before: { label: "a" },
  after: { label: "b" },
});
assert(edit.inverseEdit !== undefined, "edit has inverse");

const cf = generateCounterfactual({
  snapshot,
  candidate: { id: "cand", featureIds: ["pattern_cluster:c1"] },
  refusals: [refusal],
  targetVerdict: "promising_adjacent",
});
assert(cf.confidence >= 0 && cf.confidence <= 1, "counterfactual confidence bounded");

const aligned = compileTasteGenerationContract(
  snapshot,
  { ownerId: "verify-user" },
  "image",
  "aligned",
);
const divergent = compileTasteGenerationContract(
  snapshot,
  { ownerId: "verify-user", refusals: [refusal] },
  "image",
  "divergent",
);
assert(aligned.noveltyEnvelope.target < divergent.noveltyEnvelope.target, "divergent more novel");
assert(divergent.avoid.length >= aligned.avoid.length, "divergent preserves refusals");

const extracted = extractCandidateFeatures(
  { id: "c", featureIds: ["pattern_cluster:c1"] },
  snapshot,
);
const critique = critiqueAgainstContract({
  contract: aligned,
  snapshot,
  candidate: { id: "c", featureIds: ["pattern_cluster:c1"] },
  extracted,
});
assert(typeof critique.alignmentScore === "number", "critique score");

const sat = computeSaturationState("f1", [
  {
    id: "ex1",
    ownerId: "u",
    featureIds: ["f1"],
    sourceType: "reused",
    surface: "studio",
    occurredAt: NOW,
  },
]);
assert(sat.state.length > 0, "saturation state");

const passport = buildTastePassport({
  ownerId: "verify-user",
  snapshot,
  refusals: [refusal],
});
tastePassportSchema.parse(passport);

const contradictions = detectContradictions({ snapshot, events: [], refusals: [refusal] });

const acc = computePairwiseAccuracy([
  { predictedLeftPreference: 0.9, actualChoice: "left" },
]);
assert(acc.accuracy === 1, "pairwise accuracy");

const coverage = explanationCoverage([{ sourceIds: ["e1"] }, { sourceIds: [] }]);
assert(coverage === 0.5, "explanation coverage");

assert(
  TASTE_PLAN_ENTITLEMENTS.creator["taste.calibration.active_learning"] === true,
  "creator calibration entitlement",
);

tasteCalibrationSessionSchema.parse({
  id: "s1",
  ownerId: "u",
  modelSnapshotId: snapshot.id,
  status: "active",
  targetQuestionCount: 10,
  answeredQuestionCount: 0,
  startedAt: NOW,
  algorithmVersion: "v2",
  createdAt: NOW,
  updatedAt: NOW,
});

console.log("verify:taste-intelligence — OK", {
  pairReason: pair.selectionReason,
  contradictions: contradictions.length,
  passportVisibility: passport.visibility,
});
