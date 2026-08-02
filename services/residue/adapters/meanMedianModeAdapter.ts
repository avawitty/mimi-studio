/**
 * Mean / Median / Mode adapter — converts residue results into MMM readouts.
 */

import {
  buildInterpretiveMeanMedianMode,
  buildLiteralMeanMedianMode,
  type ResidueSignal,
} from "../shared/meanMedianMode";
import type {
  CulturalResidueResult,
  EmotionalResidueResult,
  MeanMedianModeResult,
} from "../validation";

export type ResidueAdapterSource = CulturalResidueResult | EmotionalResidueResult;

export function adaptResidueToMeanMedianMode(
  result: ResidueAdapterSource,
  options?: {
    /** Also emit a literal MMM over confidence/relevance numerics. */
    includeLiteralCompanion?: boolean;
  },
): {
  interpretive: MeanMedianModeResult;
  literal?: MeanMedianModeResult;
} {
  const interpretive =
    result.metadata.mode === "cultural"
      ? adaptCulturalInterpretive(result as CulturalResidueResult)
      : adaptEmotionalInterpretive(result as EmotionalResidueResult);

  if (!options?.includeLiteralCompanion) {
    return { interpretive };
  }

  const numerics = collectNumericSignals(result);
  const literal = buildLiteralMeanMedianMode({
    subject: `${subjectOf(result)} (literal confidence/relevance scores)`,
    values: numerics.values,
    signalIds: numerics.ids,
    valueLabels: numerics.labels,
  });
  return { interpretive, literal };
}

export function adaptCulturalInterpretive(
  result: CulturalResidueResult,
): MeanMedianModeResult {
  const signals: ResidueSignal[] = [];

  signals.push({
    signalId: result.definition.claimId,
    label: "definition",
    text: result.definition.statement,
    weight: result.definition.confidence,
    kind: "claim",
    status: result.definition.status,
    claim: result.definition,
  });

  for (const stage of result.lineage) {
    signals.push({
      signalId: stage.stageId,
      label: stage.stage,
      text: stage.description,
      weight: stage.confidence,
      kind: "lineage",
      status: "historical",
    });
  }
  for (const code of result.culturalCodes) {
    signals.push({
      signalId: code.codeId,
      label: `${code.category}:${code.label}`,
      text: code.description,
      weight: code.confidence,
      kind: "code",
      status: "interpretive",
    });
  }
  for (const claim of [
    ...result.survivingMeanings,
    ...result.commercialAbsorption,
    ...result.origins,
    ...result.descendants,
  ]) {
    signals.push({
      signalId: claim.claimId,
      label: claim.status,
      text: claim.statement,
      weight: claim.confidence,
      kind: "claim",
      status: claim.status,
      claim,
    });
  }
  for (const assoc of result.associations) {
    signals.push({
      signalId: assoc.associationId,
      label: assoc.relationship,
      text: assoc.description,
      weight: assoc.confidence,
      kind: "association",
      status: assoc.status,
    });
  }

  const counterSignals: ResidueSignal[] = [
    ...result.counterSignals,
    ...result.computationallyIntroducedMeanings,
    ...result.lostMeanings,
  ].map((claim) => ({
    signalId: claim.claimId,
    label: claim.status,
    text: claim.statement,
    weight: claim.confidence,
    kind: "claim" as const,
    status: claim.status,
    claim,
  }));

  return buildInterpretiveMeanMedianMode({
    subject: result.query,
    signals,
    counterSignals,
  });
}

export function adaptEmotionalInterpretive(
  result: EmotionalResidueResult,
): MeanMedianModeResult {
  const signals: ResidueSignal[] = result.interpretiveNeighborhoods.map((n) => ({
    signalId: n.neighborhoodId,
    label: n.label,
    text: n.description,
    weight: n.relevanceScore,
    kind: "neighborhood",
    status:
      n.status === "model-proposed"
        ? "model-proposed"
        : n.status === "community-reported"
          ? "reported"
          : "interpretive",
  }));

  for (const claim of [
    ...result.commonInterpretations,
    ...result.neighboringFeelings,
    ...result.commonTriggers,
    ...result.cognitivePatterns,
  ]) {
    signals.push({
      signalId: claim.claimId,
      label: claim.status,
      text: claim.statement,
      weight: claim.confidence,
      kind: "claim",
      status: claim.status,
      claim,
    });
  }
  for (const resp of result.adaptiveResponses) {
    signals.push({
      signalId: resp.responseId,
      label: resp.category,
      text: resp.description,
      weight:
        resp.evidenceStrength === "strong"
          ? 0.8
          : resp.evidenceStrength === "moderate"
            ? 0.6
            : resp.evidenceStrength === "weak"
              ? 0.4
              : 0.25,
      kind: "response",
      status: "reported",
    });
  }

  const counterSignals: ResidueSignal[] = [
    ...result.alternativeInterpretations,
    ...result.potentiallyUnhelpfulResponses.map((r) => ({
      claimId: r.responseId,
      statement: r.description,
      status: "reported" as const,
      evidenceIds: r.evidenceIds,
      counterEvidenceIds: [] as string[],
      confidence: 0.35,
      uncertaintyFlags: r.caveats,
      evidenceLayers: [] as Array<"A" | "B" | "C" | "D">,
    })),
  ].map((claim) => ({
    signalId: claim.claimId,
    label: claim.status,
    text: claim.statement,
    weight: claim.confidence,
    kind: "claim" as const,
    status: claim.status,
    claim,
  }));

  return buildInterpretiveMeanMedianMode({
    subject: result.normalizedExperience,
    signals,
    counterSignals,
  });
}

function collectNumericSignals(result: ResidueAdapterSource): {
  values: number[];
  ids: string[];
  labels: string[];
} {
  const values: number[] = [];
  const ids: string[] = [];
  const labels: string[] = [];

  for (const e of result.evidence) {
    values.push(e.relevanceScore, e.sourceQualityScore);
    ids.push(`${e.evidenceId}_rel`, `${e.evidenceId}_qual`);
    labels.push("relevance", "sourceQuality");
  }

  if (result.metadata.mode === "cultural") {
    const cultural = result as CulturalResidueResult;
    for (const stage of cultural.lineage) {
      values.push(stage.confidence);
      ids.push(stage.stageId);
      labels.push(`lineage:${stage.stage}`);
    }
  } else {
    const emotional = result as EmotionalResidueResult;
    for (const n of emotional.interpretiveNeighborhoods) {
      values.push(n.relevanceScore);
      ids.push(n.neighborhoodId);
      labels.push(`neighborhood:${n.label}`);
    }
  }

  return { values, ids, labels };
}

function subjectOf(result: ResidueAdapterSource): string {
  return result.metadata.mode === "cultural"
    ? (result as CulturalResidueResult).query
    : (result as EmotionalResidueResult).normalizedExperience;
}

/** Convenience: interpretive only (default adapter surface). */
export function toMeanMedianMode(result: ResidueAdapterSource): MeanMedianModeResult {
  return adaptResidueToMeanMedianMode(result).interpretive;
}
