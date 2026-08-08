/**
 * Product-default event weights and decay parameters for the taste model compiler.
 * These are provisional tuning constants — not scientific facts.
 */

import type { TasteLearningAction } from './contracts';

/** Base weight for each action before decay and polarity */
export const EVENT_BASE_WEIGHTS: Record<TasteLearningAction, number> = {
  view: 0.15,
  linger: 0.25,
  save: 0.5,
  reject: 1.0,
  reuse: 0.75,
  approve_observation: 0.85,
  reject_observation: 0.9,
  accept_cluster: 0.9,
  reject_cluster: 1.0,
  rename_cluster: 0.7,
  mark_signature: 1.2,
  reduce_weight: 0.6,
  accept_law: 1.1,
  reject_law: 1.0,
  edit_law: 0.8,
  context_only: 0.3,
  add_note: 0.4,
};

/** Half-life in days for exponential time decay per action */
export const EVENT_HALF_LIFE_DAYS: Record<TasteLearningAction, number> = {
  view: 14,
  linger: 21,
  save: 60,
  reject: 365,
  reuse: 90,
  approve_observation: 180,
  reject_observation: 365,
  accept_cluster: 180,
  reject_cluster: 365,
  rename_cluster: 180,
  mark_signature: 730,
  reduce_weight: 120,
  accept_law: 730,
  reject_law: 365,
  edit_law: 180,
  context_only: 30,
  add_note: 60,
};

/** Whether an action is considered explicit user correction */
export const EXPLICIT_ACTIONS = new Set<TasteLearningAction>([
  'reject',
  'approve_observation',
  'reject_observation',
  'accept_cluster',
  'reject_cluster',
  'rename_cluster',
  'mark_signature',
  'reduce_weight',
  'accept_law',
  'reject_law',
  'edit_law',
  'context_only',
  'add_note',
]);

/** User weight multipliers for pattern clusters */
export const USER_WEIGHT_MULTIPLIERS: Record<string, number> = {
  low: 0.5,
  medium: 1.0,
  high: 1.5,
  signature: 2.0,
};

/** Claim type authority multipliers */
export const CLAIM_TYPE_MULTIPLIERS: Record<string, number> = {
  user_confirmed: 1.5,
  user_rejected: 1.5,
  observed: 1.0,
  inferred: 0.7,
  speculative: 0.4,
};

/** Minimum support count to infer an interaction rule */
export const MIN_INTERACTION_SUPPORT = 2;

/** Minimum distinct evidence sources for an interaction rule */
export const MIN_INTERACTION_SOURCE_DIVERSITY = 2;

/** Recent window for trajectory comparison (days) */
export const TRAJECTORY_RECENT_WINDOW_DAYS = 30;

/** Historical window start for trajectory (days) */
export const TRAJECTORY_HISTORICAL_WINDOW_DAYS = 90;

/** Minimum evidence mass to classify a trend (not uncertain) */
export const MIN_TREND_EVIDENCE_MASS = 0.5;

/** Minimum events to classify emerging/declining */
export const MIN_TREND_EVENT_COUNT = 2;

/** Maximum confidence cap — never reach 1.0 from duplicates */
export const MAX_CONFIDENCE = 0.95;

/** Low confidence threshold for diagnostics */
export const LOW_CONFIDENCE_THRESHOLD = 0.35;

/** Project shrinkage toward global when little project evidence */
export const PROJECT_SHRINKAGE_ALPHA = 0.3;

/** Candidate scoring component coefficients */
export const SCORE_COEFFICIENTS = {
  semanticAffinity: 0.28,
  embeddingSimilarity: 0.12,
  ruleFit: 0.18,
  contextFit: 0.14,
  trajectoryFit: 0.1,
  noveltyFit: 0.08,
  aversionPenalty: 0.25,
  saturationPenalty: 0.1,
} as const;

/** Saturation threshold — features above this normalized weight get penalized */
export const SATURATION_THRESHOLD = 0.85;

/** Novelty sweet spot — adjacent but not repetitive */
export const NOVELTY_SWEET_SPOT_MIN = 0.25;
export const NOVELTY_SWEET_SPOT_MAX = 0.65;

/** Verdict thresholds on fit score (0-100) */
export const VERDICT_THRESHOLDS = {
  strong_fit: 75,
  promising_adjacent: 55,
  uncertain: 35,
  weak_fit: 0,
} as const;
