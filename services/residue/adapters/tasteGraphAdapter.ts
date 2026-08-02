/**
 * Taste Graph adapter — suggested node/edge delta only (user accept required).
 */

import { z } from "zod";
import type { TasteGraphEdge, TasteGraphNode } from "../../../types";
import {
  collectResidueClaims,
  mapClaimStatusToTasteClaimType,
  topicOf,
  type ResidueAdapterSource,
} from "./sharedClaims";
import type { CulturalResidueResult, EmotionalResidueResult } from "../validation";

export const residueTasteGraphDeltaSchema = z.object({
  graphId: z.string().min(1),
  runId: z.string().min(1),
  mode: z.enum(["cultural", "emotional"]),
  topic: z.string().min(1),
  nodes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      type: z.enum(["concept", "motif", "era", "web_reference"]),
      weight: z.number(),
      explanation: z.string().optional(),
      tags: z.array(z.string()).optional(),
      sourceUrl: z.string().optional(),
      evidenceNodeIds: z.array(z.string()).optional(),
      claimType: z
        .enum(["observed", "inferred", "speculative", "user_confirmed", "user_rejected"])
        .optional(),
      userStatus: z.literal("suggested"),
    }),
  ),
  edges: z.array(
    z.object({
      source: z.string(),
      target: z.string(),
      strength: z.number(),
      type: z.enum(["relates_to", "evolves_from", "contrasts_with"]),
    }),
  ),
  /** Preference / public-evidence distinction hint for UI. */
  curationNote: z.string(),
  schemaVersion: z.string(),
  promptVersion: z.string(),
  createdAt: z.string(),
});

export type ResidueTasteGraphDelta = z.infer<typeof residueTasteGraphDeltaSchema>;

export function adaptResidueToTasteGraphDelta(
  result: ResidueAdapterSource,
  options?: { graphId?: string },
): ResidueTasteGraphDelta {
  const isCultural = result.metadata.mode === "cultural";
  const cultural = result as CulturalResidueResult;
  const emotional = result as EmotionalResidueResult;
  const topic = topicOf(result);
  const nodes: TasteGraphNode[] = [];
  const edges: TasteGraphEdge[] = [];

  const rootId = `tg_root_${result.metadata.runId}`;
  nodes.push({
    id: rootId,
    label: topic,
    type: "concept",
    weight: result.confidenceSummary.overallConfidence,
    explanation: isCultural
      ? cultural.definition.statement
      : "Interpretive root for reported-experience neighborhoods (non-diagnostic).",
    tags: [result.metadata.mode, "residue"],
    claimType: isCultural
      ? mapClaimStatusToTasteClaimType(cultural.definition.status)
      : "inferred",
    userStatus: "suggested",
    evidenceNodeIds: result.evidence.map((e) => e.evidenceId).slice(0, 8),
  });

  if (isCultural) {
    for (const stage of cultural.lineage) {
      const id = `tg_stage_${stage.stageId}`;
      nodes.push({
        id,
        label: stage.label,
        type: "era",
        weight: stage.confidence,
        explanation: stage.description,
        tags: ["lineage", stage.stage],
        claimType: "observed",
        userStatus: "suggested",
        evidenceNodeIds: stage.evidenceIds,
      });
      edges.push({
        source: rootId,
        target: id,
        strength: stage.confidence,
        type: "evolves_from",
      });
    }
    for (const code of cultural.culturalCodes) {
      const id = `tg_code_${code.codeId}`;
      nodes.push({
        id,
        label: code.label,
        type: "motif",
        weight: code.confidence,
        explanation: code.description,
        tags: ["code", code.category],
        claimType: "inferred",
        userStatus: "suggested",
        evidenceNodeIds: code.evidenceIds,
      });
      edges.push({
        source: rootId,
        target: id,
        strength: code.confidence,
        type: "relates_to",
      });
    }
    for (const counter of cultural.counterSignals) {
      const id = `tg_counter_${counter.claimId}`;
      nodes.push({
        id,
        label: counter.statement.slice(0, 60),
        type: "concept",
        weight: counter.confidence,
        explanation: counter.statement,
        tags: ["countersignal", counter.status],
        claimType: mapClaimStatusToTasteClaimType(counter.status),
        userStatus: "suggested",
        evidenceNodeIds: counter.evidenceIds,
      });
      edges.push({
        source: rootId,
        target: id,
        strength: counter.confidence,
        type: "contrasts_with",
      });
    }
    for (const src of result.sources.slice(0, 4)) {
      if (!src.url) continue;
      const id = `tg_src_${src.sourceId}`;
      nodes.push({
        id,
        label: src.title || src.url,
        type: "web_reference",
        weight: 0.4,
        sourceUrl: src.url,
        tags: [src.sourceType, src.evidenceLayer],
        claimType: "observed",
        userStatus: "suggested",
      });
      edges.push({
        source: id,
        target: rootId,
        strength: 0.4,
        type: "relates_to",
      });
    }
  } else {
    for (const n of emotional.interpretiveNeighborhoods) {
      const id = `tg_nb_${n.neighborhoodId}`;
      nodes.push({
        id,
        label: n.label,
        type: "concept",
        weight: n.relevanceScore,
        explanation: n.description,
        tags: ["neighborhood", n.status, "non-diagnostic"],
        claimType: "inferred",
        userStatus: "suggested",
        evidenceNodeIds: n.evidenceIds,
      });
      edges.push({
        source: rootId,
        target: id,
        strength: n.relevanceScore,
        type: "relates_to",
      });
    }
    for (const claim of collectResidueClaims(result).slice(0, 6)) {
      const id = `tg_claim_${claim.claimId}`;
      nodes.push({
        id,
        label: claim.statement.slice(0, 60),
        type: "concept",
        weight: claim.confidence,
        explanation: claim.statement,
        tags: [claim.status, "emotional"],
        claimType: mapClaimStatusToTasteClaimType(claim.status),
        userStatus: "suggested",
        evidenceNodeIds: claim.evidenceIds,
      });
      edges.push({
        source: rootId,
        target: id,
        strength: claim.confidence,
        type: claim.status === "model-proposed" ? "contrasts_with" : "relates_to",
      });
    }
  }

  return residueTasteGraphDeltaSchema.parse({
    graphId: options?.graphId ?? `taste_${result.metadata.runId}`,
    runId: result.metadata.runId,
    mode: result.metadata.mode,
    topic,
    nodes,
    edges,
    curationNote:
      "All nodes ship as userStatus=suggested. Do not merge into the live Taste Graph until the user accepts; keep preference curation visually distinct from public evidence.",
    schemaVersion: result.metadata.schemaVersion,
    promptVersion: result.metadata.promptVersion,
    createdAt: result.metadata.createdAt,
  });
}
