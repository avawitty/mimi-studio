/**
 * Collaborative taste contracts — workspace-scoped, no private model merging.
 */
import type { CollaborativeTasteContract } from "../../schemas/tasteIntelligenceContracts.js";

export function createCollaborativeContract(input: {
  workspaceId: string;
  projectId?: string;
  participantIds: string[];
  sharedRules?: string[];
}): CollaborativeTasteContract {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    participantIds: input.participantIds,
    sharedRules: input.sharedRules ?? [],
    contributorSpecificRules: {},
    conflicts: [],
    negotiatedRules: [],
    unresolvedQuestions: [],
    approvals: [],
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export function canMutateContract(
  role: "owner" | "admin" | "editor" | "viewer",
): boolean {
  return role === "owner" || role === "admin" || role === "editor";
}

export function canApproveContract(
  role: "owner" | "admin" | "editor" | "viewer",
): boolean {
  return role === "owner" || role === "admin" || role === "editor";
}

export function recordApproval(
  contract: CollaborativeTasteContract,
  participantId: string,
  decision: "approved" | "changes_requested",
): CollaborativeTasteContract {
  const now = Date.now();
  return {
    ...contract,
    approvals: [
      ...contract.approvals.filter(
        (a) =>
          !(
            a.participantId === participantId &&
            a.version === contract.version
          ),
      ),
      {
        participantId,
        version: contract.version,
        decision,
        decidedAt: now,
      },
    ],
    updatedAt: now,
  };
}

export function bumpContractVersion(
  contract: CollaborativeTasteContract,
): CollaborativeTasteContract {
  return {
    ...contract,
    version: contract.version + 1,
    updatedAt: Date.now(),
  };
}
