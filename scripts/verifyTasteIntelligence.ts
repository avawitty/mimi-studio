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
  proposeSavedReasonHypotheses,
  applySavedReasonReview,
} from "../lib/tasteIntelligence/index.js";
import {
  tasteCalibrationSessionSchema,
  tastePassportSchema,
} from "../schemas/tasteIntelligenceContracts.js";
import {
  capAssertionConfidence,
  INFERRED_ASSERTION_CONFIDENCE_CEILING,
  partitionAssertions,
  scoreAssertion,
} from "../lib/taste/tasteStateLogic";
import { evidenceNodeToAtomInput } from "../lib/taste/evidenceNodeBridge";
import { buildEvidenceAtomFromInput } from "../lib/taste/buildEvidenceAtom";
import { createEvidenceAtomSchema } from "../lib/taste/evidenceAtomSchema";
import { atomReactionToCorrection } from "../lib/taste/correctionLogic";
import type { EvidenceNode, TasteAssertion } from "../types";

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

const [whyHypothesis] = proposeSavedReasonHypotheses("verify-artifact", snapshot, ["composition"]);
assert(whyHypothesis?.artifactId === "verify-artifact", "saved reason propose");
const confirmedWhy = applySavedReasonReview(whyHypothesis!, "confirm");
assert(confirmedWhy.userStatus === "confirmed", "saved reason confirm");

console.log("verify:taste-intelligence — OK", {
  pairReason: pair.selectionReason,
  contradictions: contradictions.length,
  passportVisibility: passport.visibility,
});
function makeAssertion(
  partial: Partial<TasteAssertion> & Pick<TasteAssertion, "conceptA" | "relation" | "confidence" | "claimType">,
): TasteAssertion {
  const now = Date.now();
  return {
    id: partial.id ?? "a1",
    userId: partial.userId ?? "u1",
    conceptA: partial.conceptA,
    relation: partial.relation,
    conceptB: partial.conceptB,
    context: partial.context,
    claimType: partial.claimType,
    confidence: partial.confidence,
    userCorrection: partial.userCorrection,
    evidenceAtomIds: partial.evidenceAtomIds ?? [],
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
}

// ─── Confidence ceiling ───────────────────────────────────────────────────────

assert(
  capAssertionConfidence("inferred", 0.95) === INFERRED_ASSERTION_CONFIDENCE_CEILING,
  "inferred assertions must cap at 0.7",
);
assert(
  capAssertionConfidence("user_confirmed", 0.95) === 0.95,
  "user_confirmed assertions may reach submitted confidence",
);

// ─── Partitioning ─────────────────────────────────────────────────────────────

const partitioned = partitionAssertions([
  makeAssertion({
    conceptA: "theatrical-restraint",
    relation: "LIKES",
    confidence: 0.9,
    claimType: "user_confirmed",
  }),
  makeAssertion({
    conceptA: "generic-saas",
    relation: "DISLIKES",
    confidence: 0.8,
    claimType: "user_confirmed",
  }),
  makeAssertion({
    conceptA: "archival-melancholy",
    relation: "LIKES",
    confidence: 0.45,
    claimType: "inferred",
  }),
]);

assert(partitioned.stablePreferences.length === 1, "high-confidence likes land in stable");
assert(partitioned.negativePreferences.length === 1, "dislikes land in negative");
assert(partitioned.emergingPreferences.length === 1, "mid-confidence likes land in emerging");

assert(scoreAssertion(partitioned.stablePreferences[0]!, "editorial") > 0, "scoreAssertion returns positive weight");

// ─── Evidence atom builder ────────────────────────────────────────────────────

const parsed = createEvidenceAtomSchema.parse({
  kind: "url",
  sourceType: "website",
  originalSource: "https://example.com",
  ingestSource: "tailor",
});
const atom = buildEvidenceAtomFromInput("u1", parsed, { id: "atom-1", now: 1_700_000_000_000 });
assert(atom.processingState === "pending", "new atoms start pending");
assert(atom.originalSource === "https://example.com", "originalSource preserved");
assert(atom.userReaction === "suggested", "reaction starts suggested");

// ─── Tailor bridge ────────────────────────────────────────────────────────────

const node: EvidenceNode = {
  id: "ev-1",
  userId: "u1",
  projectId: "p1",
  sourceType: "image",
  title: "Reference plate",
  sourceUrl: "https://cdn.example.com/ref.jpg",
  thumbnailUrl: "https://cdn.example.com/ref-thumb.jpg",
  analysisStatus: "pending",
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
const bridged = evidenceNodeToAtomInput(node, "p1");
assert(bridged.ingestSource === "tailor", "tailor nodes mirror with tailor ingestSource");
assert(bridged.kind === "image", "image nodes map to image kind");
assert(
  (bridged.sourceMetadata as { tailorEvidenceNodeId?: string }).tailorEvidenceNodeId === "ev-1",
  "bridge stores tailor node id in metadata",
);

// ─── Reaction mapping ─────────────────────────────────────────────────────────

assert(atomReactionToCorrection("accepted") === "YES", "accepted maps to YES chip");
assert(atomReactionToCorrection("rejected") === "NOT_ME", "rejected maps to NOT_ME chip");
assert(atomReactionToCorrection("suggested") === undefined, "suggested has no chip selection");

console.log("verify:taste-intelligence — all checks passed");
