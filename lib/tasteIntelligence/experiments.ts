/**
 * Creative experiments — controlled taste hypothesis testing.
 */
import type { TasteExperiment } from "../../schemas/tasteIntelligenceContracts.js";

export function createTasteExperiment(input: {
  ownerId: string;
  projectId?: string;
  hypothesis: string;
  controlledFeatureIds: string[];
  variedFeatureIds: string[];
  variantCandidateIds: string[];
  expectedInformationGain?: number;
}): TasteExperiment {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    ownerId: input.ownerId,
    projectId: input.projectId,
    hypothesis: input.hypothesis,
    controlledFeatureIds: input.controlledFeatureIds,
    variedFeatureIds: input.variedFeatureIds,
    variantCandidateIds: input.variantCandidateIds,
    expectedInformationGain: input.expectedInformationGain ?? 0.5,
    status: "draft",
    createdAt: now,
  };
}

export function completeExperiment(
  experiment: TasteExperiment,
  result: NonNullable<TasteExperiment["result"]>,
): TasteExperiment {
  return {
    ...experiment,
    status: "completed",
    result,
    completedAt: Date.now(),
  };
}
