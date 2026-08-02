/**
 * The Edit adapter — proposed editorial direction from residue (approval required).
 */

import { z } from "zod";
import {
  collectResidueClaims,
  topicOf,
  type ResidueAdapterSource,
} from "./sharedClaims";
import type { CulturalResidueResult, EmotionalResidueResult } from "../validation";

export const residueEditorialDirectionSchema = z.object({
  directionId: z.string().min(1),
  runId: z.string().min(1),
  mode: z.enum(["cultural", "emotional"]),
  thesis: z.string().min(1),
  lead: z.string().min(1),
  voice: z.string().min(1),
  audience: z.string().min(1),
  contentPillars: z.array(z.string()),
  inclusions: z.array(z.string()),
  exclusions: z.array(z.string()),
  visualDirection: z.string().min(1),
  sourceCodeIds: z.array(z.string()),
  sourceNeighborhoodIds: z.array(z.string()),
  sourceClaimIds: z.array(z.string()),
  approvalState: z.literal("proposed"),
  safetyNotice: z.string().optional(),
  confidenceOverall: z.number().min(0).max(1),
  schemaVersion: z.string(),
  promptVersion: z.string(),
  createdAt: z.string(),
});

export type ResidueEditorialDirection = z.infer<typeof residueEditorialDirectionSchema>;

export function adaptResidueToEditorialDirection(
  result: ResidueAdapterSource,
  options?: { directionId?: string },
): ResidueEditorialDirection {
  const isCultural = result.metadata.mode === "cultural";
  const cultural = result as CulturalResidueResult;
  const emotional = result as EmotionalResidueResult;
  const topic = topicOf(result);
  const claims = collectResidueClaims(result);

  const thesis = isCultural
    ? cultural.definition.statement
    : `Multiple interpretive neighborhoods around reported experience — keep alternatives visible.`;

  const lead = isCultural
    ? cultural.lineage[0]?.description ||
      cultural.culturalCodes[0]?.description ||
      cultural.definition.statement
    : emotional.interpretiveNeighborhoods
        .slice(0, 2)
        .map((n) => n.label)
        .join(" · ") || emotional.safetyNotice;

  const contentPillars = isCultural
    ? [
        ...cultural.culturalCodes.slice(0, 3).map((c) => c.label),
        ...cultural.lineage.slice(0, 2).map((s) => s.label),
      ]
    : emotional.interpretiveNeighborhoods.slice(0, 4).map((n) => n.label);

  const inclusions = isCultural
    ? [
        ...cultural.survivingMeanings.slice(0, 2).map((c) => c.statement),
        ...cultural.commercialAbsorption.slice(0, 1).map((c) => c.statement),
      ]
    : [
        ...emotional.commonInterpretations.slice(0, 2).map((c) => c.statement),
        ...emotional.alternativeInterpretations.slice(0, 2).map((c) => c.statement),
      ];

  const exclusions = isCultural
    ? [
        "Treat model-proposed antecedents as historical fact",
        "Collapse countersignals into the dominant retail narrative",
        ...cultural.lostMeanings.slice(0, 1).map((c) => `Ignore lost meaning: ${c.statement}`),
      ]
    : [
        "Diagnostic labels or “you are…” framing",
        "Fake clinical probabilities",
        "Belief-confirmation from community consensus alone",
      ];

  return residueEditorialDirectionSchema.parse({
    directionId: options?.directionId ?? `edit_${result.metadata.runId}`,
    runId: result.metadata.runId,
    mode: result.metadata.mode,
    thesis,
    lead,
    voice: isCultural
      ? "Archival-editorial; provenance-forward; wry but precise"
      : "Reflective, plural, non-diagnostic; never clinical",
    audience: isCultural
      ? "Editors, strategists, and culture researchers tracing how ideas travel"
      : "Readers seeking interpretive maps of reported experience — not diagnosis",
    contentPillars: contentPillars.length ? contentPillars : ["Thin corpus — provisional pillars"],
    inclusions: inclusions.length ? inclusions : ["Hold uncertainty visible in the lead"],
    exclusions,
    visualDirection: isCultural
      ? `Codes: ${cultural.culturalCodes
          .slice(0, 3)
          .map((c) => c.label)
          .join("; ") || "sparse visual corpus"}. Layer disclosure on every plate.`
      : "Soft mapping, no clinical iconography; neighborhood labels as typographic anchors.",
    sourceCodeIds: isCultural ? cultural.culturalCodes.map((c) => c.codeId) : [],
    sourceNeighborhoodIds: isCultural
      ? []
      : emotional.interpretiveNeighborhoods.map((n) => n.neighborhoodId),
    sourceClaimIds: claims.map((c) => c.claimId).slice(0, 24),
    approvalState: "proposed",
    safetyNotice: isCultural ? undefined : emotional.safetyNotice,
    confidenceOverall: result.confidenceSummary.overallConfidence,
    schemaVersion: result.metadata.schemaVersion,
    promptVersion: result.metadata.promptVersion,
    createdAt: result.metadata.createdAt,
  });
}
