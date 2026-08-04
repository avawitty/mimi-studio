import type {
  CreditAccount,
  CreditBalance,
  CreditGrant,
  CreditLedgerEntry,
  CreditReservation,
} from "../../../domain/credits/types.js";
import type { Membership } from "../../../domain/memberships/types.js";
import type {
  MemoryAtom,
  MemoryProposal,
  ProvenanceEdge,
  SourceRecord,
} from "../../../domain/memory/types.js";
import type {
  AiRun,
  OperationResultRecord,
  WorkflowRun,
} from "../../../domain/workflows/types.js";
import {
  aiRuns,
  creditAccounts,
  creditGrantBuckets,
  creditLedgerEntries,
  creditReservations,
  memberships,
  memoryAtoms,
  memoryProposals,
  operationResults,
  provenanceEdges,
  sources,
  workflowRuns,
} from "./schema.js";

type CreditAccountRow = typeof creditAccounts.$inferSelect;
type CreditGrantRow = typeof creditGrantBuckets.$inferSelect;
type CreditReservationRow = typeof creditReservations.$inferSelect;
type CreditLedgerEntryRow = typeof creditLedgerEntries.$inferSelect;
type MembershipRow = typeof memberships.$inferSelect;
type WorkflowRunRow = typeof workflowRuns.$inferSelect;
type AiRunRow = typeof aiRuns.$inferSelect;
type OperationResultRow = typeof operationResults.$inferSelect;
type SourceRow = typeof sources.$inferSelect;
type MemoryProposalRow = typeof memoryProposals.$inferSelect;
type MemoryAtomRow = typeof memoryAtoms.$inferSelect;
type ProvenanceEdgeRow = typeof provenanceEdges.$inferSelect;

export function mapCreditAccountRow(row: CreditAccountRow): CreditAccount {
  const owner = row.userId
    ? ({ kind: "user", userId: row.userId } as const)
    : ({ kind: "workspace", workspaceId: row.workspaceId! } as const);
  return {
    id: row.id,
    owner,
    currency: row.currency,
    available: row.availableBalance,
    reserved: row.reservedBalance,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapCreditGrantRow(row: CreditGrantRow): CreditGrant {
  return {
    id: row.id,
    accountId: row.accountId,
    source: row.source,
    originalAmount: row.originalAmount,
    remainingAmount: row.remainingAmount,
    expiresAt: row.expiresAt,
    externalReference: row.externalReference,
    createdAt: row.createdAt,
  };
}

export function mapCreditReservationRow(row: CreditReservationRow): CreditReservation {
  return {
    id: row.id,
    accountId: row.accountId,
    operationId: row.operationId,
    estimatedAmount: row.estimatedAmount,
    committedAmount: row.committedAmount,
    status: row.status,
    idempotencyKey: row.idempotencyKey,
    workflowRunId: row.workflowRunId,
    aiRunId: row.aiRunId,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapCreditLedgerEntryRow(row: CreditLedgerEntryRow): CreditLedgerEntry {
  return {
    id: row.id,
    accountId: row.accountId,
    entryType: row.entryType as CreditLedgerEntry["entryType"],
    amount: row.amount,
    grantBucketId: row.grantBucketId,
    reservationId: row.reservationId,
    operationId: row.operationId,
    workflowRunId: row.workflowRunId,
    aiRunId: row.aiRunId,
    externalReference: row.externalReference,
    idempotencyKey: row.idempotencyKey,
    metadata: row.metadata,
    createdAt: row.createdAt,
  };
}

export function mapCreditBalance(
  account: CreditAccountRow,
  grants: CreditGrantRow[],
): CreditBalance {
  return {
    accountId: account.id,
    available: account.availableBalance,
    reserved: account.reservedBalance,
    version: account.version,
    grants: grants.map(mapCreditGrantRow),
  };
}

export function mapMembershipRow(row: MembershipRow): Membership {
  return {
    id: row.id,
    userId: row.userId,
    workspaceId: row.workspaceId,
    plan: row.plan,
    status: row.status,
    provider: row.provider,
    providerCustomerId: row.providerCustomerId,
    providerSubscriptionId: row.providerSubscriptionId,
    providerEventId: row.providerEventId,
    providerEventCreatedAt: row.providerEventCreatedAt,
    currentPeriodStart: row.currentPeriodStart,
    currentPeriodEnd: row.currentPeriodEnd,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapWorkflowRunRow(row: WorkflowRunRow): WorkflowRun {
  return {
    id: row.id,
    actorId: row.actorId,
    workspaceId: row.workspaceId,
    chamber: row.chamber,
    workflowType: row.workflowType,
    workflowVersion: row.workflowVersion,
    status: row.status as WorkflowRun["status"],
    currentStep: row.currentStep,
    idempotencyKey: row.idempotencyKey,
    requestHash: row.requestHash,
    inputReference: row.inputReference,
    resultReference: row.resultReference,
    errorCode: row.errorCode,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
  };
}

export function mapAiRunRow(row: AiRunRow): AiRun {
  return {
    id: row.id,
    workflowRunId: row.workflowRunId,
    actorId: row.actorId,
    workspaceId: row.workspaceId,
    operationId: row.operationId,
    operationVersion: row.operationVersion,
    status: row.status as AiRun["status"],
    reservationId: row.reservationId,
    routingPolicy: row.routingPolicy,
    promptId: row.promptId,
    promptVersion: row.promptVersion,
    inputReference: row.inputReference,
    outputReference: row.outputReference,
    normalizedUsage: row.normalizedUsage,
    chargedCredits: row.chargedCredits,
    errorCode: row.errorCode as AiRun["errorCode"],
    errorMetadata: row.errorMetadata,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
  };
}

export function mapSourceRow(row: SourceRow): SourceRecord {
  return {
    id: row.id,
    ownerId: row.ownerId,
    projectId: row.projectId,
    sourceType: row.sourceType as SourceRecord["sourceType"],
    storageReference: row.storageReference,
    contentHash: row.contentHash,
    metadata: row.metadata,
    createdAt: row.createdAt,
  };
}

export function mapMemoryProposalRow(row: MemoryProposalRow): MemoryProposal {
  return {
    id: row.id,
    ownerId: row.ownerId,
    projectId: row.projectId,
    sourceId: row.sourceId,
    aiRunId: row.aiRunId,
    proposalType: row.proposalType,
    content: row.content,
    status: row.status,
    createdAt: row.createdAt,
    reviewedAt: row.reviewedAt,
  };
}

export function mapMemoryAtomRow(row: MemoryAtomRow): MemoryAtom {
  return {
    id: row.id,
    ownerId: row.ownerId,
    projectId: row.projectId,
    proposalId: row.proposalId,
    atomType: row.atomType,
    content: row.content,
    confidence: row.confidence == null ? null : Number(row.confidence),
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapProvenanceEdgeRow(row: ProvenanceEdgeRow): ProvenanceEdge {
  return {
    id: row.id,
    fromEntityType: row.fromEntityType,
    fromEntityId: row.fromEntityId,
    toEntityType: row.toEntityType,
    toEntityId: row.toEntityId,
    relationship: row.relationship as ProvenanceEdge["relationship"],
    metadata: row.metadata,
    createdAt: row.createdAt,
  };
}

export function mapOperationResultRow(
  row: OperationResultRow,
): OperationResultRecord {
  return {
    id: row.id,
    ownerId: row.ownerId,
    workflowRunId: row.workflowRunId,
    aiRunId: row.aiRunId,
    content: row.content,
    contentHash: row.contentHash,
    createdAt: row.createdAt,
  };
}
