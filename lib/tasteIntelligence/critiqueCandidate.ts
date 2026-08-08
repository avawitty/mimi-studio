/**
 * Two-stage Taste Critic — deterministic comparison after feature extraction.
 */
import type {
  TasteCritique,
  TasteGenerationContract,
} from "../../schemas/tasteIntelligenceContracts.js";
import type { TasteCandidateInput, TasteModelSnapshot } from "../tasteModel/contracts.js";
import { scoreTasteCandidate } from "../tasteModel/scoreTasteCandidate.js";
import { generateCounterfactual } from "./counterfactuals.js";
import { TASTE_CRITIC_VERSION } from "./constants.js";

export interface ExtractedCandidateFeatures {
  featureIds: string[];
  labels: string[];
  tags: string[];
  evidenceIds: string[];
}

export interface CritiqueInput {
  contract: TasteGenerationContract;
  snapshot: TasteModelSnapshot;
  candidate: TasteCandidateInput;
  extracted: ExtractedCandidateFeatures;
}

export function critiqueAgainstContract(input: CritiqueInput): TasteCritique {
  const { contract, snapshot, candidate, extracted } = input;
  const scored = scoreTasteCandidate(
    { ...candidate, featureIds: extracted.featureIds, tags: extracted.tags },
    snapshot,
  );

  const preservedRules: string[] = [];
  const violatedRules: string[] = [];
  const usefulDepartures: string[] = [];
  const accidentalDepartures: string[] = [];
  const saturationWarnings: string[] = [];

  for (const rule of contract.preserve) {
    const match = extracted.labels.some(
      (l) => l.toLowerCase().includes(rule.toLowerCase()) ||
        extracted.tags.some((t) => t.toLowerCase().includes(rule.toLowerCase())),
    );
    if (match) preservedRules.push(rule);
    else violatedRules.push(rule);
  }

  for (const avoid of contract.avoid) {
    const hit = extracted.labels.some((l) =>
      l.toLowerCase().includes(avoid.toLowerCase()),
    );
    if (hit) violatedRules.push(`Avoid: ${avoid}`);
  }

  for (const permit of contract.permit) {
    const departed = extracted.labels.some((l) =>
      l.toLowerCase().includes(permit.toLowerCase()),
    );
    if (departed && contract.mode !== "aligned") {
      usefulDepartures.push(permit);
    } else if (departed && contract.mode === "aligned") {
      accidentalDepartures.push(permit);
    }
  }

  for (const warn of contract.contextRules) {
    if (warn.toLowerCase().includes("saturated")) {
      saturationWarnings.push(warn);
    }
  }

  const counterfactualRepairs =
    violatedRules.length > 0
      ? [
          generateCounterfactual({
            snapshot,
            candidate: { ...candidate, featureIds: extracted.featureIds },
            targetVerdict: "promising_adjacent",
          }),
        ]
      : [];

  return {
    id: crypto.randomUUID(),
    contractId: contract.id,
    candidateId: candidate.id,
    alignmentScore: scored.fitScore,
    confidence: Math.min(contract.confidence, scored.confidence),
    preservedRules,
    violatedRules,
    usefulDepartures,
    accidentalDepartures,
    saturationWarnings,
    counterfactualRepairs,
    evidenceIds: [
      ...new Set([...contract.evidenceIds, ...extracted.evidenceIds]),
    ],
    createdAt: Date.now(),
    criticVersion: TASTE_CRITIC_VERSION,
  };
}

/** Rule-based feature extraction (deterministic; AI extraction is server-only). */
export function extractCandidateFeatures(
  candidate: TasteCandidateInput,
  snapshot: TasteModelSnapshot,
): ExtractedCandidateFeatures {
  const featureIds = candidate.featureIds ?? [];
  const labels = featureIds
    .map((id) => snapshot.featureWeights.find((f) => f.featureId === id)?.label)
    .filter((l): l is string => Boolean(l));
  const tags = candidate.tags ?? [];
  const evidenceIds = featureIds.flatMap((id) => {
    const fw = snapshot.featureWeights.find((f) => f.featureId === id);
    return fw?.sourceIds ?? [];
  });
  return {
    featureIds,
    labels,
    tags,
    evidenceIds: [...new Set(evidenceIds)],
  };
}
