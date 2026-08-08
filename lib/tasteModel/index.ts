export type {
  AnyTasteEvent,
  CompileTasteModelInput,
  LegacyTasteEvent,
  NormalizedTasteEvent,
  TasteCandidateInput,
  TasteCandidateScore,
  TasteContextScope,
  TasteEventV2,
  TasteFeatureTrend,
  TasteFeatureWeight,
  TasteInteractionRelation,
  TasteInteractionRule,
  TasteLearningAction,
  TasteModelGraphEdge,
  TasteModelGraphNode,
  TasteModelGraphProjection,
  TasteModelSnapshot,
  TasteTargetType,
} from './contracts';

export {
  TASTE_CONTEXT_SCOPES,
  TASTE_FEATURE_TRENDS,
  TASTE_INTERACTION_RELATIONS,
  TASTE_LEARNING_ACTIONS,
  TASTE_TARGET_TYPES,
  tasteEventV2Schema,
} from './contracts';

export {
  CLAIM_TYPE_MULTIPLIERS,
  EVENT_BASE_WEIGHTS,
  EVENT_HALF_LIFE_DAYS,
  EXPLICIT_ACTIONS,
  LOW_CONFIDENCE_THRESHOLD,
  MAX_CONFIDENCE,
  MIN_INTERACTION_SOURCE_DIVERSITY,
  MIN_INTERACTION_SUPPORT,
  MIN_TREND_EVIDENCE_MASS,
  NOVELTY_SWEET_SPOT_MAX,
  NOVELTY_SWEET_SPOT_MIN,
  PROJECT_SHRINKAGE_ALPHA,
  SATURATION_THRESHOLD,
  SCORE_COEFFICIENTS,
  TRAJECTORY_RECENT_WINDOW_DAYS,
  USER_WEIGHT_MULTIPLIERS,
  VERDICT_THRESHOLDS,
} from './constants';

export {
  buildStableTasteEventDedupeKey,
  buildTasteEventDedupeKey,
  dedupeTasteEventsForCompile,
  normalizeTasteEvent,
  normalizeTasteEvents,
} from './normalizeTasteEvents';

export { compileTasteModel } from './compileTasteModel';

export { scoreTasteCandidate } from './scoreTasteCandidate';
export type { ScoreContext } from './scoreTasteCandidate';

export {
  explainCandidateScore,
  explainFeature,
  formatSignedStrength,
} from './explainTasteScore';
export type { FeatureExplanation } from './explainTasteScore';

export {
  mergeGraphPositions,
  projectTasteModelToGraph,
} from './projectTasteModelToGraph';
