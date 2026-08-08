/**
 * Coefficients for deterministic calibration pair selection.
 * Centralized tuning constants — not scientific facts.
 */

export const CALIBRATION_ALGORITHM_VERSION = 'taste-calibration-v1';

export const DEFAULT_TARGET_QUESTION_COUNT = 10;

/** Pair-selection priority coefficients */
export const PAIR_SELECTION_COEFFICIENTS = {
  uncertainty: 0.4,
  featureDisagreement: 0.22,
  coverageGap: 0.15,
  contradictionValue: 0.1,
  trajectoryValue: 0.08,
  calibratedNovelty: 0.05,
} as const;

/** Penalties applied after weighted sum */
export const PAIR_SELECTION_PENALTIES = {
  duplicatePair: 1.0,
  nearDuplicatePair: 0.6,
  highConfidenceSignal: 0.45,
  featureFatiguePerUse: 0.12,
  maxUncontrolledDimensions: 0.35,
} as const;

/** Minimum pair priority to consider asking */
export const MIN_PAIR_PRIORITY = 0.05;

/** Maximum isolated features per pair */
export const MAX_ISOLATED_FEATURES = 4;

/** Minimum Jaccard distance to consider pair informative */
export const MIN_FEATURE_DISAGREEMENT = 0.15;

/** Maximum shared features before "too similar" penalty */
export const MAX_SHARED_FEATURE_RATIO = 0.85;

/** Pairwise Bradley-Terry update parameters */
export const PAIRWISE_UPDATE = {
  /** Temperature for sigmoid preference probability */
  temperature: 1.5,
  /** Base learning rate for explicit pairwise judgments */
  explicitLearningRate: 0.35,
  /** Passive view learning rate (lower than explicit) */
  passiveLearningRate: 0.08,
  /** Shrinkage toward base model when calibration data is sparse */
  sparseShrinkageAlpha: 0.25,
  /** Weight multiplier when user selects deciding features */
  decidingFeatureMultiplier: 2.0,
  /** Evidence mass added per explicit judgment */
  explicitEvidenceMass: 0.45,
  /** Evidence mass for "both" boundary confirmation */
  bothEvidenceMass: 0.25,
  /** Evidence mass for "neither" refusal */
  neitherEvidenceMass: 0.4,
  /** Confidence boost per explicit judgment */
  confidenceBoost: 0.08,
  /** Maximum confidence from calibration alone */
  maxCalibrationConfidence: 0.85,
  /** Material change threshold for ModelDelta */
  materialWeightDelta: 0.02,
  materialConfidenceDelta: 0.03,
} as const;

/** High-confidence threshold — avoid testing these features */
export const HIGH_CONFIDENCE_THRESHOLD = 0.75;

/** Low-confidence threshold — prioritize for coverage */
export const LOW_CONFIDENCE_THRESHOLD = 0.4;
