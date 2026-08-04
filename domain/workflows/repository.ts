import type {
  AiRun,
  CompleteAiRunInput,
  CreateAiRunInput,
  CreateWorkflowRunInput,
  FailAiRunInput,
  PersistGatewayAttemptsInput,
  OperationResultRecord,
  WorkflowRun,
  WorkflowStatus,
} from "./types.js";

export interface WorkflowRepository {
  findByIdempotency(actorId: string, idempotencyKey: string): Promise<WorkflowRun | null>;
  get(workflowRunId: string): Promise<WorkflowRun | null>;
  create(input: CreateWorkflowRunInput): Promise<WorkflowRun>;
  updateStatus(input: {
    workflowRunId: string;
    status: WorkflowStatus;
    currentStep?: string | null;
    resultReference?: Record<string, unknown> | null;
    errorCode?: string | null;
  }): Promise<void>;
}

export interface AiRunRepository {
  get(aiRunId: string): Promise<AiRun | null>;
  findByWorkflow(workflowRunId: string): Promise<AiRun | null>;
  create(input: CreateAiRunInput): Promise<AiRun>;
  persistAttempts(input: PersistGatewayAttemptsInput): Promise<void>;
  complete(input: CompleteAiRunInput): Promise<void>;
  fail(input: FailAiRunInput): Promise<void>;
}

export interface OperationResultRepository {
  get(resultId: string, ownerId: string): Promise<OperationResultRecord | null>;
  create(input: {
    id: string;
    ownerId: string;
    workflowRunId: string;
    aiRunId: string;
    content: Record<string, unknown>;
    contentHash: string;
  }): Promise<OperationResultRecord>;
}
