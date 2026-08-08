/**
 * Two-stage Taste Critic — deterministic comparison after feature extraction.
 */
import type {
  TasteCritique,
  TasteGenerationContract,
  TasteRefusal,
} from "../../schemas/tasteIntelligenceContracts.js";
import type { TasteCandidateInput, TasteModelSnapshot } from "../tasteModel/contracts.js";
import { scoreTasteCandidate } from "../tasteModel/scoreTasteCandidate.js";
import { generateCounterfactual } from "./counterfactuals.js";
import { TASTE_CRITIC_VERSION } from "./constants.js";
import { computeRefusalPenalty } from "./refusals.js";
import type { ArtifactFeatureExtraction } from "./extractArtifactFeatures.js";

export interface ExtractedCandidateFeatures {
  featureIds: string[];
  labels: string[];
  tags: string[];
  evidenceIds: string[];
  claims?: Array<{ label: string; confidence: number; source: string }>;
  completeness?: "full" | "partial" | "failed";
  partialReason?: string;
  provenance?: Array<{
    source: "deterministic" | "ai";
    provider?: string;
    model?: string;
    featureCount: number;
  }>;
}

export interface CritiqueInput {
  contract: TasteGenerationContract;
  snapshot: TasteModelSnapshot;
  candidate: TasteCandidateInput;
  extracted: ExtractedCandidateFeatures;
  refusals?: TasteRefusal[];
  sourceSnapshotId?: string;
}

function toScore100(fitScore: number): number {
  return Math.round(Math.max(0, Math.min(100, fitScore * 100)));
}

function confidenceLabel(confidence: number): "low" | "moderate" | "high" {
  if (confidence >= 0.75) return "high";
  if (confidence >= 0.45) return "moderate";
  return "low";
}

function textContains(term: string, corpus: string[]): boolean {
  const needle = term.toLowerCase();
  return corpus.some(
    (c) =>
      c.toLowerCase().includes(needle) || needle.includes(c.toLowerCase()),
  );
}

function ruleMatchesExtracted(
  rule: string,
  extracted: ExtractedCandidateFeatures,
): boolean {
  const corpus = [
    ...extracted.labels,
    ...extracted.tags,
    ...(extracted.claims?.map((c) => c.label) ?? []),
  ];
  return textContains(rule, corpus);
}

function isHardRefusal(rule: string): boolean {
  return (
    rule.toLowerCase().startsWith("avoid:") ||
    rule.toLowerCase().includes("refusal") ||
    rule.toLowerCase().includes("never")
  );
}

function classifyDeparture(
  rule: string,
  mode: TasteGenerationContract["mode"],
  extracted: ExtractedCandidateFeatures,
): "useful" | "accidental" | "violation" | null {
  const departed = ruleMatchesExtracted(rule, extracted);
  if (!departed) return null;

  if (mode === "aligned") return "accidental";
  if (mode === "adjacent") return "useful";
  return "useful";
}

export function critiqueAgainstContract(input: CritiqueInput): TasteCritique {
  const { contract, snapshot, candidate, extracted, refusals = [] } = input;

  const scored = scoreTasteCandidate(
    { ...candidate, featureIds: extracted.featureIds, tags: extracted.tags },
    snapshot,
  );

  const refusalResult = computeRefusalPenalty(
    refusals,
    { ...candidate, featureIds: extracted.featureIds, tags: extracted.tags },
    contract.projectId ? "project" : "persistent",
  );

  const preservedRules: string[] = [];
  const violatedRules: string[] = [];
  const usefulDepartures: string[] = [];
  const accidentalDepartures: string[] = [];
  const saturationWarnings: string[] = [];
  const unresolvedUnknowns: string[] = [
    ...scored.explanation.unknowns,
    ...(extracted.completeness === "partial" && extracted.partialReason
      ? [extracted.partialReason]
      : []),
  ];

  for (const rule of contract.preserve) {
    if (ruleMatchesExtracted(rule, extracted)) {
      preservedRules.push(rule);
    } else if (contract.mode === "divergent") {
      usefulDepartures.push(`Departed: ${rule}`);
    } else if (contract.mode === "adjacent" && violatedRules.length < 2) {
      usefulDepartures.push(`Adjacent deviation: ${rule}`);
    } else {
      violatedRules.push(rule);
    }
  }

  for (const avoid of contract.avoid) {
    if (ruleMatchesExtracted(avoid, extracted)) {
      violatedRules.push(`Avoid: ${avoid}`);
    }
  }

  for (const permit of contract.permit) {
    const classification = classifyDeparture(permit, contract.mode, extracted);
    if (classification === "useful") {
      usefulDepartures.push(permit);
    } else if (classification === "accidental") {
      accidentalDepartures.push(permit);
    }
  }

  for (const warn of contract.contextRules) {
    if (warn.toLowerCase().includes("saturated")) {
      saturationWarnings.push(warn);
    }
  }

  if (refusalResult.penalty > 0.5) {
    for (const refusal of refusals) {
      if (refusalResult.matchedRefusalIds.includes(refusal.id)) {
        const label =
          snapshot.featureWeights.find((f) =>
            refusal.featureIds.includes(f.featureId),
          )?.label ?? refusal.featureIds.join(", ");
        violatedRules.push(`Refusal violation: ${label}`);
      }
    }
  }

  const rawScore = Math.max(
    0,
    scored.fitScore - Math.min(0.4, refusalResult.penalty * 0.08),
  );
  const alignmentScore = toScore100(rawScore);

  const counterfactualRepairs = violatedRules
    .filter((v) => v.length > 0)
    .slice(0, 5)
    .map((violation) => {
      const repair = generateCounterfactual({
        snapshot,
        candidate: { ...candidate, featureIds: extracted.featureIds },
        refusals,
        targetVerdict: "promising_adjacent",
      });
      return {
        ...repair,
        candidateId: candidate.id,
        currentScore: alignmentScore,
        resultingScore: toScore100(repair.resultingScore),
        modifications: repair.modifications.map((m) => ({
          ...m,
          scoreBefore: toScore100(m.scoreBefore),
          scoreAfter: toScore100(m.scoreAfter),
          rationale: `${violation}: ${m.rationale}`,
        })),
      };
    });

  const critiqueConfidence = Math.min(
    contract.confidence,
    scored.confidence,
    extracted.completeness === "partial" ? 0.65 : 1,
  );

  return {
    id: crypto.randomUUID(),
    contractId: contract.id,
    candidateId: candidate.id,
    artifactId: candidate.id,
    alignmentScore,
    confidence: critiqueConfidence,
    confidenceLabel: confidenceLabel(critiqueConfidence),
    preservedRules,
    violatedRules,
    usefulDepartures,
    accidentalDepartures,
    saturationWarnings,
    counterfactualRepairs,
    evidenceIds: [
      ...new Set([...contract.evidenceIds, ...extracted.evidenceIds]),
    ],
    unresolvedUnknowns,
    featureExtraction: {
      completeness: extracted.completeness ?? "full",
      partialReason: extracted.partialReason,
      provenance: extracted.provenance ?? [],
      extractedFeatures: extracted.claims?.map((c) => ({
        label: c.label,
        confidence: c.confidence,
        source: c.source as "text" | "layout" | "image" | "metadata",
      })),
    },
    sourceSnapshotId: input.sourceSnapshotId,
    createdAt: Date.now(),
    criticVersion: TASTE_CRITIC_VERSION,
  };
}

/** @deprecated Use extractArtifactFeatures for post-generation critique. */
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

export function extractionToCritiqueFeatures(
  extraction: ArtifactFeatureExtraction,
): ExtractedCandidateFeatures {
  return {
    featureIds: extraction.featureIds,
    labels: extraction.labels,
    tags: extraction.tags,
    evidenceIds: extraction.evidenceIds,
    claims: extraction.claims,
    completeness: extraction.completeness,
    partialReason: extraction.partialReason,
    provenance: extraction.provenance,
  };
}

export { isHardRefusal, ruleMatchesExtracted, toScore100, confidenceLabel };
