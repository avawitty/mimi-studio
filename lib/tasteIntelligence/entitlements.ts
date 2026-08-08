/**
 * Taste Intelligence entitlements mapped to canonical plans.
 */
import type { CanonicalPlan } from "../../domain/memberships/types.js";
import type { EntitlementValue } from "../../domain/entitlements/types.js";

export const TASTE_ENTITLEMENT_KEYS = {
  modelPersistent: "taste.model.persistent",
  calibrationSessions: "taste.calibration.sessions_per_period",
  calibrationActiveLearning: "taste.calibration.active_learning",
  negativeModel: "taste.negative_model",
  graphEdit: "taste.graph.edit",
  counterfactual: "taste.counterfactual",
  compiler: "taste.compiler",
  critic: "taste.critic",
  generationModes: "taste.generation_modes",
  saturation: "taste.saturation",
  trajectories: "taste.trajectories",
  semanticSearch: "taste.semantic_search",
  searchMonthlyQueries: "taste.search.monthly_queries",
  experiments: "taste.experiments",
  passportExport: "taste.passport.export",
  passportPublic: "taste.passport.public_projection",
  culturalPositioning: "taste.cultural_positioning",
  collaboration: "taste.collaboration",
  teamParticipants: "taste.team.participants",
  evaluationAdvanced: "taste.evaluation.advanced",
  collectiveOptIn: "taste.collective.opt_in",
} as const;

export type TasteEntitlementKey =
  (typeof TASTE_ENTITLEMENT_KEYS)[keyof typeof TASTE_ENTITLEMENT_KEYS];

export const TASTE_PLAN_ENTITLEMENTS: Record<
  CanonicalPlan,
  Record<TasteEntitlementKey, EntitlementValue>
> = {
  free: {
    "taste.model.persistent": false,
    "taste.calibration.sessions_per_period": 1,
    "taste.calibration.active_learning": false,
    "taste.negative_model": false,
    "taste.graph.edit": false,
    "taste.counterfactual": false,
    "taste.compiler": false,
    "taste.critic": false,
    "taste.generation_modes": false,
    "taste.saturation": false,
    "taste.trajectories": false,
    "taste.semantic_search": true,
    "taste.search.monthly_queries": 20,
    "taste.experiments": false,
    "taste.passport.export": true,
    "taste.passport.public_projection": false,
    "taste.cultural_positioning": false,
    "taste.collaboration": false,
    "taste.team.participants": 1,
    "taste.evaluation.advanced": false,
    "taste.collective.opt_in": true,
  },
  trial: {
    "taste.model.persistent": true,
    "taste.calibration.sessions_per_period": 3,
    "taste.calibration.active_learning": true,
    "taste.negative_model": true,
    "taste.graph.edit": true,
    "taste.counterfactual": false,
    "taste.compiler": true,
    "taste.critic": true,
    "taste.generation_modes": true,
    "taste.saturation": true,
    "taste.trajectories": true,
    "taste.semantic_search": true,
    "taste.search.monthly_queries": 50,
    "taste.experiments": false,
    "taste.passport.export": true,
    "taste.passport.public_projection": false,
    "taste.cultural_positioning": false,
    "taste.collaboration": false,
    "taste.team.participants": 1,
    "taste.evaluation.advanced": false,
    "taste.collective.opt_in": true,
  },
  creator: {
    "taste.model.persistent": true,
    "taste.calibration.sessions_per_period": 10,
    "taste.calibration.active_learning": true,
    "taste.negative_model": true,
    "taste.graph.edit": true,
    "taste.counterfactual": false,
    "taste.compiler": false,
    "taste.critic": false,
    "taste.generation_modes": true,
    "taste.saturation": true,
    "taste.trajectories": true,
    "taste.semantic_search": true,
    "taste.search.monthly_queries": 200,
    "taste.experiments": false,
    "taste.passport.export": true,
    "taste.passport.public_projection": false,
    "taste.cultural_positioning": false,
    "taste.collaboration": false,
    "taste.team.participants": 1,
    "taste.evaluation.advanced": false,
    "taste.collective.opt_in": true,
  },
  studio: {
    "taste.model.persistent": true,
    "taste.calibration.sessions_per_period": 30,
    "taste.calibration.active_learning": true,
    "taste.negative_model": true,
    "taste.graph.edit": true,
    "taste.counterfactual": true,
    "taste.compiler": true,
    "taste.critic": true,
    "taste.generation_modes": true,
    "taste.saturation": true,
    "taste.trajectories": true,
    "taste.semantic_search": true,
    "taste.search.monthly_queries": 1000,
    "taste.experiments": true,
    "taste.passport.export": true,
    "taste.passport.public_projection": true,
    "taste.cultural_positioning": true,
    "taste.collaboration": false,
    "taste.team.participants": 1,
    "taste.evaluation.advanced": true,
    "taste.collective.opt_in": true,
  },
  team: {
    "taste.model.persistent": true,
    "taste.calibration.sessions_per_period": 50,
    "taste.calibration.active_learning": true,
    "taste.negative_model": true,
    "taste.graph.edit": true,
    "taste.counterfactual": true,
    "taste.compiler": true,
    "taste.critic": true,
    "taste.generation_modes": true,
    "taste.saturation": true,
    "taste.trajectories": true,
    "taste.semantic_search": true,
    "taste.search.monthly_queries": 5000,
    "taste.experiments": true,
    "taste.passport.export": true,
    "taste.passport.public_projection": true,
    "taste.cultural_positioning": true,
    "taste.collaboration": true,
    "taste.team.participants": 12,
    "taste.evaluation.advanced": true,
    "taste.collective.opt_in": true,
  },
};

export function hasTasteEntitlement(
  plan: CanonicalPlan,
  key: TasteEntitlementKey,
): boolean {
  const value = TASTE_PLAN_ENTITLEMENTS[plan][key];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return Boolean(value);
}

export function tasteEntitlementLimit(
  plan: CanonicalPlan,
  key: TasteEntitlementKey,
): number | null {
  const value = TASTE_PLAN_ENTITLEMENTS[plan][key];
  return typeof value === "number" ? value : null;
}
