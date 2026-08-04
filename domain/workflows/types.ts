import type {
  GatewayAttempt,
  GatewayErrorCode,
  NormalizedUsage,
} from "../ai/types.js";

export type WorkflowStatus =
  | "queued"
  | "running"
  | "awaiting_approval"
  | "succeeded"
  | "failed"
  | "canceled";

export interface WorkflowRun {
  id: string;
  actorId: string;
  workspaceId: string | null;
  chamber: string;
  workflowType: string;
  workflowVersion: number;
  status: WorkflowStatus;
  currentStep: string | null;
  idempotencyKey: string;
  requestHash: string;
  inputReference: Record<string, unknown>;
  resultReference: Record<string, unknown> | null;
  errorCode: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface AiRun {
  id: string;
  workflowRunId: string;
  actorId: string;
  workspaceId: string | null;
  operationId: string;
  operationVersion: number;
  status: WorkflowStatus;
  reservationId: string;
  routingPolicy: string;
  promptId: string;
  promptVersion: number;
  inputReference: Record<string, unknown>;
  outputReference: Record<string, unknown> | null;
  normalizedUsage: NormalizedUsage | null;
  chargedCredits: bigint | null;
  errorCode: GatewayErrorCode | null;
  errorMetadata: Record<string, unknown> | null;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
}

export interface CreateWorkflowRunInput {
  id: string;
  actorId: string;
  workspaceId?: string | null;
  chamber: string;
  workflowType: string;
  workflowVersion: number;
  idempotencyKey: string;
  requestHash: string;
  inputReference: Record<string, unknown>;
}

export interface OperationResultRecord {
  id: string;
  ownerId: string;
  workflowRunId: string;
  aiRunId: string;
  content: Record<string, unknown>;
  contentHash: string;
  createdAt: Date;
}

export interface CreateAiRunInput {
  id: string;
  workflowRunId: string;
  actorId: string;
  workspaceId?: string | null;
  operationId: string;
  operationVersion: number;
  reservationId: string;
  routingPolicy: string;
  promptId: string;
  promptVersion: number;
  inputReference: Record<string, unknown>;
}

export interface CompleteAiRunInput {
  runId: string;
  outputReference: Record<string, unknown>;
  usage: NormalizedUsage;
  chargedCredits: bigint;
}

export interface FailAiRunInput {
  runId: string;
  errorCode: GatewayErrorCode;
  errorMetadata: Record<string, unknown>;
}

export interface PersistGatewayAttemptsInput {
  aiRunId: string;
  attempts: GatewayAttempt[];
}
