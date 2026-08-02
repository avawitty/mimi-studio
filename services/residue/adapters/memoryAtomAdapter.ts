/**
 * Memory Atom adapter — proposals only (never auto-writes approved memory).
 */

import { z } from "zod";
import { createMemoryResidueStore } from "../storage/residueStore";
import {
  collectResidueClaims,
  topicOf,
  type ResidueAdapterSource,
} from "./sharedClaims";
import type { CulturalResidueResult, EmotionalResidueResult } from "../validation";
import { containsForbiddenEmotionalLanguage, sanitizeEmotionalStatement } from "../uncertainty";

export const residueMemoryAtomProposalSchema = z.object({
  proposalId: z.string().min(1),
  runId: z.string().min(1),
  mode: z.enum(["cultural", "emotional"]),
  atomicClaim: z.string().min(1),
  title: z.string().min(1),
  claimStatus: z.string(),
  confidence: z.number().min(0).max(1),
  approvalState: z.literal("proposed"),
  applicableModules: z.array(z.string()),
  provenance: z.object({
    claimId: z.string().optional(),
    evidenceIds: z.array(z.string()),
    evidenceLayers: z.array(z.string()),
    sourceIds: z.array(z.string()),
    topic: z.string(),
    schemaVersion: z.string(),
    promptVersion: z.string(),
  }),
  safetyNotice: z.string().optional(),
  createdAt: z.string(),
});

export type ResidueMemoryAtomProposal = z.infer<typeof residueMemoryAtomProposalSchema>;

export function adaptResidueToMemoryAtomProposals(
  result: ResidueAdapterSource,
  options?: { maxProposals?: number; applicableModules?: string[] },
): ResidueMemoryAtomProposal[] {
  const isCultural = result.metadata.mode === "cultural";
  const cultural = result as CulturalResidueResult;
  const emotional = result as EmotionalResidueResult;
  const topic = topicOf(result);
  const max = Math.max(1, Math.min(options?.maxProposals ?? 8, 16));
  const modules = options?.applicableModules ?? [
    "memory",
    "the-edit",
    "studio",
    "taste-graph",
  ];

  const candidates: Array<{
    claimId: string;
    statement: string;
    status: string;
    confidence: number;
    evidenceIds: string[];
    evidenceLayers: string[];
    title: string;
  }> = [];

  if (isCultural) {
    candidates.push({
      claimId: cultural.definition.claimId,
      statement: cultural.definition.statement,
      status: cultural.definition.status,
      confidence: cultural.definition.confidence,
      evidenceIds: cultural.definition.evidenceIds,
      evidenceLayers: cultural.definition.evidenceLayers,
      title: `Definition · ${topic}`,
    });
    for (const code of cultural.culturalCodes) {
      candidates.push({
        claimId: code.codeId,
        statement: `${code.label}: ${code.description}`,
        status: "interpretive",
        confidence: code.confidence,
        evidenceIds: code.evidenceIds,
        evidenceLayers: ["B", "C"],
        title: `Code · ${code.label}`,
      });
    }
    for (const claim of collectResidueClaims(result).filter((c) => c.claimId !== cultural.definition.claimId)) {
      candidates.push({
        claimId: claim.claimId,
        statement: claim.statement,
        status: claim.status,
        confidence: claim.confidence,
        evidenceIds: claim.evidenceIds,
        evidenceLayers: claim.evidenceLayers,
        title: `${claim.status} · ${topic}`,
      });
    }
  } else {
    for (const n of emotional.interpretiveNeighborhoods) {
      candidates.push({
        claimId: n.neighborhoodId,
        statement: sanitizeIfNeeded(`${n.label}: ${n.description}`),
        status: n.status,
        confidence: n.relevanceScore,
        evidenceIds: n.evidenceIds,
        evidenceLayers: ["A", "C"],
        title: `Neighborhood · ${n.label}`,
      });
    }
    for (const claim of collectResidueClaims(result)) {
      candidates.push({
        claimId: claim.claimId,
        statement: sanitizeIfNeeded(claim.statement),
        status: claim.status,
        confidence: claim.confidence,
        evidenceIds: claim.evidenceIds,
        evidenceLayers: claim.evidenceLayers,
        title: `${claim.status} · interpretive`,
      });
    }
  }

  const sourceIds = result.sources.map((s) => s.sourceId);
  const createdAt = result.metadata.createdAt;

  return candidates.slice(0, max).map((c, index) =>
    residueMemoryAtomProposalSchema.parse({
      proposalId: `memprop_${result.metadata.runId}_${index + 1}`,
      runId: result.metadata.runId,
      mode: result.metadata.mode,
      atomicClaim: c.statement,
      title: c.title,
      claimStatus: c.status,
      confidence: c.confidence,
      approvalState: "proposed",
      applicableModules: modules,
      provenance: {
        claimId: c.claimId,
        evidenceIds: c.evidenceIds,
        evidenceLayers: c.evidenceLayers,
        sourceIds,
        topic,
        schemaVersion: result.metadata.schemaVersion,
        promptVersion: result.metadata.promptVersion,
      },
      safetyNotice: isCultural ? undefined : emotional.safetyNotice,
      createdAt,
    }),
  );
}

/** Persist proposals only — never promotes into memoryService.saveMemoryAtom. */
export async function persistMemoryAtomProposalsForRun(input: {
  ownerUid: string;
  result: ResidueAdapterSource;
  store?: ReturnType<typeof createMemoryResidueStore>;
  maxProposals?: number;
}) {
  const proposals = adaptResidueToMemoryAtomProposals(input.result, {
    maxProposals: input.maxProposals,
  });
  const store = input.store ?? createMemoryResidueStore();
  for (const proposal of proposals) {
    await store.saveProposal(input.ownerUid, {
      proposalId: proposal.proposalId,
      runId: proposal.runId,
      approvalState: "proposed",
    });
  }
  return proposals;
}

function sanitizeIfNeeded(text: string): string {
  if (!containsForbiddenEmotionalLanguage(text)) return text;
  return sanitizeEmotionalStatement(text);
}
