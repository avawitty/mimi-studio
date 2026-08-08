/**
 * Taste Intelligence OS v2 — versioned configuration constants.
 */

export const TASTE_INTELLIGENCE_ALGORITHM_VERSION = "taste-intel-v2.0.0";
export const TASTE_COMPILER_VERSION = "taste-compiler-v1.0.0";
export const TASTE_CRITIC_VERSION = "taste-critic-v1.1.0";

/** Active-learning pair selection weights (sum ≈ 1.0 before penalties). */
export const PAIR_SELECTION_WEIGHTS = {
  uncertainty: 0.4,
  featureDisagreement: 0.22,
  coverageGap: 0.15,
  contradictionValue: 0.1,
  trajectoryValue: 0.08,
  calibratedNovelty: 0.05,
  repetitionPenalty: 0.35,
  fatiguePenalty: 0.2,
} as const;

/** Bradley-Terry / pairwise logistic temperature. */
export const PAIRWISE_TEMPERATURE = 0.35;

/** Regularization: calibration deltas shrink toward evidence model when sparse. */
export const CALIBRATION_SHRINKAGE_ALPHA = 0.65;
export const MIN_JUDGMENTS_FOR_FULL_CALIBRATION = 8;

/** Generation mode novelty envelopes. */
export const GENERATION_MODE_NOVELTY: Record<
  "aligned" | "adjacent" | "divergent",
  { minimum: number; target: number; maximum: number }
> = {
  aligned: { minimum: 0.0, target: 0.12, maximum: 0.25 },
  adjacent: { minimum: 0.15, target: 0.38, maximum: 0.55 },
  divergent: { minimum: 0.35, target: 0.62, maximum: 0.78 },
};

/** Saturation decay half-life in days by source type weight. */
export const EXPOSURE_SOURCE_WEIGHTS: Record<string, number> = {
  viewed: 0.15,
  recommended: 0.2,
  generated: 0.45,
  saved: 0.55,
  reused: 0.85,
  published: 0.7,
};

export const SATURATION_HALF_LIFE_DAYS = 14;
export const SATURATION_RECENT_WINDOW_DAYS = 21;
export const MIN_TRAJECTORY_EVIDENCE = 4;
export const MIN_DECLINE_WEEKS = 3;

/** Search reranking blend coefficients. */
export const SEARCH_BLEND_WEIGHTS = {
  embedding: 0.32,
  lexical: 0.12,
  memory: 0.14,
  graphProximity: 0.12,
  projectRelevance: 0.08,
  preference: 0.1,
  refusalPenalty: 0.35,
  trajectory: 0.06,
  recency: 0.04,
  diversity: 0.05,
} as const;

export const DEFAULT_CALIBRATION_QUESTION_COUNT = 12;
export const MAX_CALIBRATION_QUESTION_COUNT = 24;
