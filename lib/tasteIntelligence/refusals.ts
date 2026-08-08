/**
 * Negative taste and refusal penalty application.
 */
import type { TasteRefusal, TasteRefusalType } from "../../schemas/tasteIntelligenceContracts.js";
import type { TasteCandidateInput } from "../tasteModel/contracts.js";

export function refusalMatchesCandidate(
  refusal: TasteRefusal,
  candidate: TasteCandidateInput,
  contextScope: "persistent" | "project" | "session",
): boolean {
  if (refusal.status !== "active") return false;
  if (refusal.scope === "project" && contextScope !== "project") return false;
  if (refusal.scope === "session" && contextScope !== "session") return false;

  const candidateFeatures = new Set([
    ...(candidate.featureIds ?? []),
    ...(candidate.patternClusterIds?.map((id) => `pattern_cluster:${id}`) ?? []),
    ...(candidate.creativeLawIds?.map((id) => `creative_law:${id}`) ?? []),
  ]);

  switch (refusal.refusalType) {
    case "always":
      return refusal.featureIds.every((f) => candidateFeatures.has(f));
    case "only_when_combined":
      return refusal.featureIds.every((f) => candidateFeatures.has(f));
    case "wrong_context":
      return (
        refusal.featureIds.some((f) => candidateFeatures.has(f)) &&
        contextScope !== refusal.scope
      );
    case "overexposed":
    case "formerly_liked":
    case "too_literal":
    case "not_why_i_saved_it":
      return refusal.featureIds.some((f) => candidateFeatures.has(f));
    default: {
      const _exhaustive: never = refusal.refusalType;
      return _exhaustive;
    }
  }
}

export function computeRefusalPenalty(
  refusals: TasteRefusal[],
  candidate: TasteCandidateInput,
  contextScope: "persistent" | "project" | "session",
): { penalty: number; matchedRefusalIds: string[] } {
  let penalty = 0;
  const matched: string[] = [];
  for (const refusal of refusals) {
    if (!refusalMatchesCandidate(refusal, candidate, contextScope)) continue;
    matched.push(refusal.id);
    const magnitude = Math.abs(refusal.signedWeight) * refusal.confidence;
    penalty +=
      refusal.explicit && refusal.refusalType === "always"
        ? magnitude * 2.5
        : refusal.refusalType === "only_when_combined"
          ? magnitude * 2.0
          : magnitude;
  }
  return { penalty: Math.min(3, penalty), matchedRefusalIds: matched };
}

export function buildRefusalFromExplicit(
  input: Omit<TasteRefusal, "id" | "createdAt" | "updatedAt" | "status"> & {
    id?: string;
  },
): TasteRefusal {
  const now = Date.now();
  return {
    id: input.id ?? crypto.randomUUID(),
    ownerId: input.ownerId,
    projectId: input.projectId,
    featureIds: input.featureIds,
    refusalType: input.refusalType,
    signedWeight: input.signedWeight ?? -1,
    confidence: input.confidence ?? 0.9,
    explicit: true,
    scope: input.scope,
    sourceIds: input.sourceIds,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

export type { TasteRefusalType };
