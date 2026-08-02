/**
 * Forecast adapter — scenarios / counter-scenarios / disconfirmers from residue.
 * Distinct from researchService mock ForecastTrend payloads.
 */

import { z } from "zod";
import {
  collectResidueClaims,
  topicOf,
  type ResidueAdapterSource,
} from "./sharedClaims";
import type { CulturalResidueResult, EmotionalResidueResult } from "../validation";

export const residueForecastArtifactSchema = z.object({
  forecastId: z.string().min(1),
  runId: z.string().min(1),
  mode: z.enum(["cultural", "emotional"]),
  topic: z.string().min(1),
  scenarios: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      summary: z.string(),
      claimIds: z.array(z.string()),
      confidence: z.number().min(0).max(1),
      kind: z.enum(["momentum", "absorption", "interpretation", "community-language"]),
    }),
  ),
  counterScenarios: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      summary: z.string(),
      claimIds: z.array(z.string()),
      confidence: z.number().min(0).max(1),
    }),
  ),
  disconfirmers: z.array(z.string()),
  driftHints: z
    .object({
      predictedClusterShift: z.string().optional(),
      audienceEvolution: z.string().optional(),
      absorptionRisk: z.string().optional(),
      overexposureRisk: z.string().optional(),
      refusalPoint: z.string().optional(),
    })
    .optional(),
  claimIds: z.array(z.string()),
  evidenceGaps: z.array(z.string()),
  confidenceOverall: z.number().min(0).max(1),
  safetyNotice: z.string().optional(),
  /** Explicit: not a researchService mock forecast. */
  provenanceNote: z.string(),
  schemaVersion: z.string(),
  promptVersion: z.string(),
  createdAt: z.string(),
});

export type ResidueForecastArtifact = z.infer<typeof residueForecastArtifactSchema>;

export function adaptResidueToForecast(
  result: ResidueAdapterSource,
  options?: { forecastId?: string },
): ResidueForecastArtifact {
  const isCultural = result.metadata.mode === "cultural";
  const cultural = result as CulturalResidueResult;
  const emotional = result as EmotionalResidueResult;
  const topic = topicOf(result);
  const claims = collectResidueClaims(result);

  const scenarios = isCultural
    ? [
        {
          id: "sc_amplify",
          label: "Continued platform amplification",
          summary:
            cultural.lineage.find((s) => s.stage === "amplification")?.description ||
            `“${topic}” remains visible via short-form and lookbook circulation.`,
          claimIds: [cultural.definition.claimId, ...cultural.lineage.map((s) => s.stageId)].slice(
            0,
            4,
          ),
          confidence: cultural.definition.confidence,
          kind: "momentum" as const,
        },
        {
          id: "sc_absorb",
          label: "Retail / commercial absorption",
          summary:
            cultural.commercialAbsorption[0]?.statement ||
            "Commercial lookbooks may treat niche codes as ready-made product language.",
          claimIds: cultural.commercialAbsorption.map((c) => c.claimId).slice(0, 3),
          confidence: cultural.commercialAbsorption[0]?.confidence ?? 0.35,
          kind: "absorption" as const,
        },
      ]
    : [
        {
          id: "sc_nb",
          label: "Neighborhood persistence in community language",
          summary:
            emotional.interpretiveNeighborhoods
              .slice(0, 2)
              .map((n) => n.label)
              .join(" · ") || "Thin neighborhood corpus",
          claimIds: emotional.interpretiveNeighborhoods.map((n) => n.neighborhoodId).slice(0, 4),
          confidence: emotional.interpretiveNeighborhoods[0]?.relevanceScore ?? 0.3,
          kind: "community-language" as const,
        },
        {
          id: "sc_alt",
          label: "Alternate interpretations stay competitive",
          summary:
            emotional.alternativeInterpretations[0]?.statement ||
            "Multiple readings should remain visible; no single neighborhood dominates by default.",
          claimIds: emotional.alternativeInterpretations.map((c) => c.claimId).slice(0, 3),
          confidence: emotional.alternativeInterpretations[0]?.confidence ?? 0.35,
          kind: "interpretation" as const,
        },
      ];

  const counterScenarios = isCultural
    ? [
        {
          id: "csc_fatigue",
          label: "Fatigue / backlash",
          summary:
            cultural.counterSignals[0]?.statement ||
            "Audience fatigue or parody may undercut mainstream absorption.",
          claimIds: cultural.counterSignals.map((c) => c.claimId).slice(0, 3),
          confidence: cultural.counterSignals[0]?.confidence ?? 0.3,
        },
        {
          id: "csc_lost",
          label: "Meaning loss under retail translation",
          summary:
            cultural.lostMeanings[0]?.statement ||
            "Earlier niche meanings may thin as retail language dominates.",
          claimIds: cultural.lostMeanings.map((c) => c.claimId).slice(0, 3),
          confidence: cultural.lostMeanings[0]?.confidence ?? 0.3,
        },
      ]
    : [
        {
          id: "csc_overcollapse",
          label: "Single-label collapse",
          summary:
            "Risk that one neighborhood is treated as diagnosis or proof about a person.",
          claimIds: [],
          confidence: 0.55,
        },
        {
          id: "csc_belief",
          label: "Belief confirmation from thin community evidence",
          summary:
            "Layer C reports may be misread as objective validation of mind-reading beliefs.",
          claimIds: emotional.communityPatterns.map((c) => c.claimId).slice(0, 2),
          confidence: 0.5,
        },
      ];

  const disconfirmers = [
    ...result.evidenceGaps,
    ...(isCultural
      ? [
          "Primary archival sources missing for prehistory claims",
          "English-retail bias in absorption readings",
        ]
      : [
          "Layer A sources may not address this exact reported experience",
          "Community consensus is not clinical evidence",
        ]),
    ...result.metadata.warnings,
  ].slice(0, 8);

  const driftHints = isCultural
    ? {
        predictedClusterShift:
          cultural.lineage[cultural.lineage.length - 1]?.label || "Amplification window",
        audienceEvolution: "From niche participants toward lookbook / feed audiences",
        absorptionRisk:
          cultural.commercialAbsorption.length > 0 ? "elevated" : "uncertain — thin absorption corpus",
        overexposureRisk: "Monitor parody and fatigue countersignals",
        refusalPoint: "When retail language fully replaces niche origin stories",
      }
    : {
        predictedClusterShift: emotional.interpretiveNeighborhoods[0]?.label,
        audienceEvolution: "Language clusters may drift as forums and research diverge",
        absorptionRisk: "n/a — emotional mode is interpretive, not market absorption",
        overexposureRisk: "Over-collapsing neighborhoods into one label",
        refusalPoint: "Any framing that reads as diagnosis or personal determination",
      };

  return residueForecastArtifactSchema.parse({
    forecastId: options?.forecastId ?? `forecast_${result.metadata.runId}`,
    runId: result.metadata.runId,
    mode: result.metadata.mode,
    topic,
    scenarios,
    counterScenarios,
    disconfirmers,
    driftHints,
    claimIds: claims.map((c) => c.claimId).slice(0, 24),
    evidenceGaps: result.evidenceGaps,
    confidenceOverall: result.confidenceSummary.overallConfidence,
    safetyNotice: isCultural ? undefined : emotional.safetyNotice,
    provenanceNote:
      "Residue forecast scenarios are interpretive projections from a residue run — not researchService mock trend scores.",
    schemaVersion: result.metadata.schemaVersion,
    promptVersion: result.metadata.promptVersion,
    createdAt: result.metadata.createdAt,
  });
}
