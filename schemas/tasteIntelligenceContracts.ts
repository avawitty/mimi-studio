/**
 * Taste Intelligence OS v2 — runtime contracts (Zod-validated).
 * Extends lib/tasteModel without duplicating the canonical Taste Graph.
 */
import { z } from "zod";
import { TASTE_CONTEXT_SCOPES } from "../lib/tasteModel/contracts.js";

// ─── Shared enums ─────────────────────────────────────────────────────────────

export const CALIBRATION_CHOICES = [
  "left",
  "right",
  "both",
  "neither",
  "skip",
] as const;
export type CalibrationChoice = (typeof CALIBRATION_CHOICES)[number];

export const CALIBRATION_PAIR_REASONS = [
  "high_uncertainty",
  "feature_disagreement",
  "coverage_gap",
  "contradiction",
  "trajectory_check",
  "negative_rule_check",
  "exploration",
] as const;

export const TASTE_REFUSAL_TYPES = [
  "always",
  "only_when_combined",
  "wrong_context",
  "too_literal",
  "overexposed",
  "formerly_liked",
  "not_why_i_saved_it",
] as const;
export type TasteRefusalType = (typeof TASTE_REFUSAL_TYPES)[number];

export const TASTE_MODEL_EDIT_OPERATIONS = [
  "rename",
  "set_alias",
  "merge",
  "split",
  "connect",
  "disconnect",
  "set_polarity",
  "set_weight",
  "set_scope",
  "set_signature",
  "set_contextual",
  "set_saturated",
  "set_dormant",
  "correct_provenance",
] as const;
export type TasteModelEditOperation = (typeof TASTE_MODEL_EDIT_OPERATIONS)[number];

export const GENERATION_MODES = ["aligned", "adjacent", "divergent"] as const;
export type GenerationMode = (typeof GENERATION_MODES)[number];

export const GENERATION_MEDIA = [
  "image",
  "writing",
  "ui",
  "fashion",
  "editorial",
  "brand",
  "photography",
  "product",
] as const;
export type GenerationMedium = (typeof GENERATION_MEDIA)[number];

export const COUNTERFACTUAL_VERDICTS = [
  "strong_fit",
  "promising_adjacent",
  "weak_fit",
] as const;

export const SATURATION_STATES = [
  "fresh",
  "active",
  "saturated",
  "resting",
  "returning",
] as const;

export const TRAJECTORY_PHASES_V2 = [
  "emerging",
  "strengthening",
  "stable",
  "current_fixation",
  "declining",
  "dormant",
  "returning",
  "uncertain",
] as const;

export const TASTE_MEMORY_EPISTEMIC_STATES = [
  "observed",
  "inferred",
  "proposed",
  "confirmed",
  "executable",
  "temporary",
  "expired",
  "withdrawn",
] as const;
export type TasteMemoryEpistemicState =
  (typeof TASTE_MEMORY_EPISTEMIC_STATES)[number];

export const TASTE_EVALUATION_TYPES = [
  "pairwise_prediction",
  "ranking_outcome",
  "correction",
  "novelty_acceptance",
  "search_outcome",
  "critic_outcome",
  "long_term_reuse",
  "generation_satisfaction",
] as const;

// ─── Calibration ──────────────────────────────────────────────────────────────

export const tasteCalibrationSessionSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  workspaceId: z.string().optional(),
  projectId: z.string().optional(),
  modelSnapshotId: z.string(),
  status: z.enum(["active", "completed", "abandoned"]),
  targetQuestionCount: z.number().int().min(1).max(100),
  answeredQuestionCount: z.number().int().min(0),
  startedAt: z.number(),
  completedAt: z.number().optional(),
  algorithmVersion: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const tasteCalibrationPairSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  leftCandidateId: z.string(),
  rightCandidateId: z.string(),
  isolatedFeatureIds: z.array(z.string()),
  selectionReason: z.enum(CALIBRATION_PAIR_REASONS),
  predictedLeftPreference: z.number().min(0).max(1),
  expectedInformationGain: z.number().min(0).max(1),
  askedAt: z.number(),
});

export const tastePairwiseJudgmentSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  pairId: z.string(),
  choice: z.enum(CALIBRATION_CHOICES),
  decidingFeatureIds: z.array(z.string()),
  correctionNote: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  contextScope: z.enum(TASTE_CONTEXT_SCOPES),
  answeredAt: z.number(),
});

// ─── Negative taste ───────────────────────────────────────────────────────────

export const tasteRefusalSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  projectId: z.string().optional(),
  featureIds: z.array(z.string()).min(1),
  refusalType: z.enum(TASTE_REFUSAL_TYPES),
  signedWeight: z.number(),
  confidence: z.number().min(0).max(1),
  explicit: z.boolean(),
  scope: z.enum(TASTE_CONTEXT_SCOPES),
  sourceIds: z.array(z.string()),
  status: z.enum(["active", "revised", "withdrawn"]),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// ─── Model editing ──────────────────────────────────────────────────────────────

export const tasteModelEditSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  projectId: z.string().optional(),
  operation: z.enum(TASTE_MODEL_EDIT_OPERATIONS),
  targetIds: z.array(z.string()).min(1),
  before: z.record(z.string(), z.unknown()),
  after: z.record(z.string(), z.unknown()),
  rationale: z.string().optional(),
  inverseEdit: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.number(),
});

// ─── Counterfactuals ──────────────────────────────────────────────────────────

export const tasteCounterfactualSchema = z.object({
  candidateId: z.string(),
  currentScore: z.number(),
  targetVerdict: z.enum(COUNTERFACTUAL_VERDICTS),
  modifications: z.array(
    z.object({
      operation: z.enum([
        "add",
        "remove",
        "reduce",
        "replace",
        "recontextualize",
      ]),
      featureId: z.string(),
      replacementFeatureId: z.string().optional(),
      rationale: z.string(),
      scoreBefore: z.number(),
      scoreAfter: z.number(),
      sourceIds: z.array(z.string()),
    }),
  ),
  resultingScore: z.number(),
  confidence: z.number().min(0).max(1),
  unresolvedUnknowns: z.array(z.string()),
});

// ─── Compiler & Critic ────────────────────────────────────────────────────────

export const tasteGenerationContractSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  ownerId: z.string(),
  workspaceId: z.string().optional(),
  projectId: z.string().optional(),
  sourceSnapshotId: z.string(),
  medium: z.enum(GENERATION_MEDIA),
  mode: z.enum(GENERATION_MODES),
  preserve: z.array(z.string()),
  emphasize: z.array(z.string()),
  permit: z.array(z.string()),
  transform: z.array(z.string()),
  avoid: z.array(z.string()),
  interactionRules: z.array(z.string()),
  contextRules: z.array(z.string()),
  noveltyEnvelope: z.object({
    minimum: z.number().min(0).max(1),
    target: z.number().min(0).max(1),
    maximum: z.number().min(0).max(1),
  }),
  nonNegotiableFeatureIds: z.array(z.string()),
  exploratoryFeatureIds: z.array(z.string()),
  evidenceIds: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  compiledAt: z.number(),
  compilerVersion: z.string(),
});

export const tasteCritiqueSchema = z.object({
  id: z.string(),
  contractId: z.string(),
  candidateId: z.string(),
  alignmentScore: z.number(),
  confidence: z.number().min(0).max(1),
  preservedRules: z.array(z.string()),
  violatedRules: z.array(z.string()),
  usefulDepartures: z.array(z.string()),
  accidentalDepartures: z.array(z.string()),
  saturationWarnings: z.array(z.string()),
  counterfactualRepairs: z.array(tasteCounterfactualSchema),
  evidenceIds: z.array(z.string()),
  createdAt: z.number(),
  criticVersion: z.string(),
});

// ─── Saturation & trajectories ──────────────────────────────────────────────────

export const tasteExposureEventSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  projectId: z.string().optional(),
  featureIds: z.array(z.string()),
  sourceType: z.enum([
    "viewed",
    "recommended",
    "generated",
    "saved",
    "reused",
    "published",
  ]),
  surface: z.string(),
  occurredAt: z.number(),
});

export const tasteSaturationStateSchema = z.object({
  featureId: z.string(),
  globalExposure: z.number().min(0),
  recentExposure: z.number().min(0),
  recentUse: z.number().min(0),
  state: z.enum(SATURATION_STATES),
  recommendedAction: z.enum(["deepen", "vary", "pause", "reintroduce"]),
  confidence: z.number().min(0).max(1),
  lastUpdated: z.number(),
});

export const tasteTrajectoryV2Schema = z.object({
  featureId: z.string(),
  historicalStrength: z.number(),
  recentStrength: z.number(),
  momentum: z.number(),
  acceleration: z.number(),
  phase: z.enum(TRAJECTORY_PHASES_V2),
  evidenceCount: z.number().int().min(0),
  confidence: z.number().min(0).max(1),
  sourceIds: z.array(z.string()),
});

// ─── Why saved ────────────────────────────────────────────────────────────────

export const savedReasonHypothesisSchema = z.object({
  id: z.string(),
  artifactId: z.string(),
  hypothesis: z.string(),
  featureIds: z.array(z.string()),
  source: z.enum(["model_proposed", "rule_based", "creator_authored"]),
  confidence: z.number().min(0).max(1),
  userStatus: z.enum(["unreviewed", "confirmed", "rejected", "edited"]),
  createdAt: z.number(),
});

// ─── Experiments ────────────────────────────────────────────────────────────────

export const tasteExperimentSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  projectId: z.string().optional(),
  hypothesis: z.string(),
  controlledFeatureIds: z.array(z.string()),
  variedFeatureIds: z.array(z.string()),
  variantCandidateIds: z.array(z.string()),
  expectedInformationGain: z.number().min(0).max(1),
  status: z.enum(["draft", "running", "completed", "abandoned"]),
  result: z
    .object({
      preferredCandidateIds: z.array(z.string()),
      rejectedCandidateIds: z.array(z.string()),
      conclusion: z.string(),
      modelChangeSummary: z.string(),
    })
    .optional(),
  createdAt: z.number(),
  completedAt: z.number().optional(),
});

// ─── Sentinel ─────────────────────────────────────────────────────────────────

export const sentinelMemoryPolicySchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  projectId: z.string().optional(),
  targetObjectId: z.string(),
  epistemicState: z.enum(TASTE_MEMORY_EPISTEMIC_STATES),
  allowedUses: z.array(z.string()),
  prohibitedUses: z.array(z.string()),
  scope: z.enum(TASTE_CONTEXT_SCOPES),
  expiresAt: z.number().optional(),
  creatorApprovedAt: z.number().optional(),
  evidenceIds: z.array(z.string()),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// ─── Passport ─────────────────────────────────────────────────────────────────

export const tastePassportSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  ownerId: z.string(),
  sourceSnapshotId: z.string(),
  visibility: z.enum(["private", "unlisted", "public"]),
  principles: z.array(z.string()),
  creativeLaws: z.array(z.string()),
  preferredContrasts: z.array(z.string()),
  refusals: z.array(z.string()),
  mediumProfiles: z.record(z.string(), z.array(z.string())),
  generationDefaults: z
    .object({
      mode: z.enum(GENERATION_MODES),
      noveltyTarget: z.number().min(0).max(1),
    })
    .optional(),
  includedEvidenceMode: z.enum([
    "none",
    "approved_references",
    "approved_summaries",
  ]),
  version: z.number().int().min(1),
  exportedAt: z.number().optional(),
  revokedAt: z.number().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// ─── Collaboration ────────────────────────────────────────────────────────────

export const collaborativeTasteContractSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  projectId: z.string().optional(),
  participantIds: z.array(z.string()),
  sharedRules: z.array(z.string()),
  contributorSpecificRules: z.record(z.string(), z.array(z.string())),
  conflicts: z.array(
    z.object({
      featureIds: z.array(z.string()),
      participantIds: z.array(z.string()),
      description: z.string(),
      status: z.enum(["open", "negotiated", "accepted_difference"]),
    }),
  ),
  negotiatedRules: z.array(z.string()),
  unresolvedQuestions: z.array(z.string()),
  approvals: z.array(
    z.object({
      participantId: z.string(),
      version: z.number().int(),
      decision: z.enum(["approved", "changes_requested"]),
      decidedAt: z.number(),
    }),
  ),
  version: z.number().int().min(1),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// ─── Cultural positioning ─────────────────────────────────────────────────────

export const culturalPositioningReportSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  sourceSnapshotId: z.string(),
  collectiveWindowStart: z.number(),
  collectiveWindowEnd: z.number(),
  deeplyPersonalSignals: z.array(z.string()),
  widelyCirculatingSignals: z.array(z.string()),
  emergingCulturalSignals: z.array(z.string()),
  saturatedSignals: z.array(z.string()),
  unusualCombinations: z.array(z.string()),
  possibleInfluenceLines: z.array(z.string()),
  contradictions: z.array(z.string()),
  sampleSizeBand: z.string(),
  methodologyVersion: z.string(),
  limitations: z.array(z.string()),
  createdAt: z.number(),
});

// ─── Evaluation ───────────────────────────────────────────────────────────────

export const tasteEvaluationEventSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  workspaceId: z.string().optional(),
  projectId: z.string().optional(),
  evaluationType: z.enum(TASTE_EVALUATION_TYPES),
  prediction: z.record(z.string(), z.unknown()).optional(),
  outcome: z.record(z.string(), z.unknown()),
  modelVersion: z.string(),
  occurredAt: z.number(),
});

// ─── Snapshot v2 extension ────────────────────────────────────────────────────

export const tasteModelSnapshotV2ExtensionSchema = z.object({
  schemaVersion: z.literal(2),
  modelVersion: z.literal("mimi-taste-model-v2"),
  calibrationDeltas: z
    .record(
      z.string(),
      z.object({
        signedDelta: z.number(),
        confidence: z.number(),
        sourceJudgmentIds: z.array(z.string()),
      }),
    )
    .optional(),
  refusals: z.array(tasteRefusalSchema).optional(),
  saturationStates: z.array(tasteSaturationStateSchema).optional(),
  trajectoriesV2: z.array(tasteTrajectoryV2Schema).optional(),
});

export type TasteCalibrationSession = z.infer<typeof tasteCalibrationSessionSchema>;
export type TasteCalibrationPair = z.infer<typeof tasteCalibrationPairSchema>;
export type TastePairwiseJudgment = z.infer<typeof tastePairwiseJudgmentSchema>;
export type TasteRefusal = z.infer<typeof tasteRefusalSchema>;
export type TasteModelEdit = z.infer<typeof tasteModelEditSchema>;
export type TasteCounterfactual = z.infer<typeof tasteCounterfactualSchema>;
export type TasteGenerationContract = z.infer<typeof tasteGenerationContractSchema>;
export type TasteCritique = z.infer<typeof tasteCritiqueSchema>;
export type TasteExposureEvent = z.infer<typeof tasteExposureEventSchema>;
export type TasteSaturationState = z.infer<typeof tasteSaturationStateSchema>;
export type TasteTrajectoryV2 = z.infer<typeof tasteTrajectoryV2Schema>;
export type SavedReasonHypothesis = z.infer<typeof savedReasonHypothesisSchema>;
export type TasteExperiment = z.infer<typeof tasteExperimentSchema>;
export type SentinelMemoryPolicy = z.infer<typeof sentinelMemoryPolicySchema>;
export type TastePassport = z.infer<typeof tastePassportSchema>;
export type CollaborativeTasteContract = z.infer<
  typeof collaborativeTasteContractSchema
>;
export type CulturalPositioningReport = z.infer<
  typeof culturalPositioningReportSchema
>;
export type TasteEvaluationEvent = z.infer<typeof tasteEvaluationEventSchema>;
