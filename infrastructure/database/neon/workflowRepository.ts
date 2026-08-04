import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type {
  AiRunRepository,
  OperationResultRepository,
  WorkflowRepository,
} from "../../../domain/workflows/repository.js";
import type {
  AiRun,
  CompleteAiRunInput,
  CreateAiRunInput,
  CreateWorkflowRunInput,
  FailAiRunInput,
  PersistGatewayAttemptsInput,
  WorkflowRun,
  WorkflowStatus,
} from "../../../domain/workflows/types.js";
import type { NeonRepositoryDatabase } from "./connection.js";
import {
  mapAiRunRow,
  mapOperationResultRow,
  mapWorkflowRunRow,
} from "./mappers.js";
import {
  aiProviderAttempts,
  aiRuns,
  operationResults,
  workflowRuns,
} from "./schema.js";

function terminalTimestamp(status: WorkflowStatus): Date | null | undefined {
  switch (status) {
    case "succeeded":
    case "failed":
    case "canceled":
      return new Date();
    case "queued":
    case "running":
    case "awaiting_approval":
      return null;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export class NeonWorkflowRepository implements WorkflowRepository {
  constructor(private readonly db: NeonRepositoryDatabase) {}

  async findByIdempotency(
    actorId: string,
    idempotencyKey: string,
  ): Promise<WorkflowRun | null> {
    const [row] = await this.db
      .select()
      .from(workflowRuns)
      .where(
        and(
          eq(workflowRuns.actorId, actorId),
          eq(workflowRuns.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    return row ? mapWorkflowRunRow(row) : null;
  }

  async get(workflowRunId: string): Promise<WorkflowRun | null> {
    const [row] = await this.db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.id, workflowRunId))
      .limit(1);
    return row ? mapWorkflowRunRow(row) : null;
  }

  async create(input: CreateWorkflowRunInput): Promise<WorkflowRun> {
    const [row] = await this.db
      .insert(workflowRuns)
      .values({
        id: input.id,
        actorId: input.actorId,
        workspaceId: input.workspaceId ?? null,
        chamber: input.chamber,
        workflowType: input.workflowType,
        workflowVersion: input.workflowVersion,
        status: "queued",
        currentStep: "reserve_credits",
        idempotencyKey: input.idempotencyKey,
        requestHash: input.requestHash,
        inputReference: input.inputReference,
      })
      .returning();
    return mapWorkflowRunRow(row);
  }

  async updateStatus(input: {
    workflowRunId: string;
    status: WorkflowStatus;
    currentStep?: string | null;
    resultReference?: Record<string, unknown> | null;
    errorCode?: string | null;
  }): Promise<void> {
    await this.db
      .update(workflowRuns)
      .set({
        status: input.status,
        currentStep: input.currentStep,
        resultReference: input.resultReference,
        errorCode: input.errorCode,
        completedAt: terminalTimestamp(input.status),
        updatedAt: new Date(),
      })
      .where(eq(workflowRuns.id, input.workflowRunId));
  }
}

export class NeonAiRunRepository implements AiRunRepository {
  constructor(private readonly db: NeonRepositoryDatabase) {}

  async get(aiRunId: string): Promise<AiRun | null> {
    const [row] = await this.db
      .select()
      .from(aiRuns)
      .where(eq(aiRuns.id, aiRunId))
      .limit(1);
    return row ? mapAiRunRow(row) : null;
  }

  async findByWorkflow(workflowRunId: string): Promise<AiRun | null> {
    const [row] = await this.db
      .select()
      .from(aiRuns)
      .where(eq(aiRuns.workflowRunId, workflowRunId))
      .orderBy(aiRuns.createdAt)
      .limit(1);
    return row ? mapAiRunRow(row) : null;
  }

  async create(input: CreateAiRunInput): Promise<AiRun> {
    const [row] = await this.db
      .insert(aiRuns)
      .values({
        id: input.id,
        workflowRunId: input.workflowRunId,
        actorId: input.actorId,
        workspaceId: input.workspaceId ?? null,
        operationId: input.operationId,
        operationVersion: input.operationVersion,
        status: "running",
        reservationId: input.reservationId,
        routingPolicy: input.routingPolicy,
        promptId: input.promptId,
        promptVersion: input.promptVersion,
        inputReference: input.inputReference,
      })
      .returning();
    return mapAiRunRow(row);
  }

  async persistAttempts(input: PersistGatewayAttemptsInput): Promise<void> {
    if (input.attempts.length === 0) return;
    for (const attempt of input.attempts) {
      await this.db
        .insert(aiProviderAttempts)
        .values({
          id: randomUUID(),
          aiRunId: input.aiRunId,
          attemptNumber: attempt.attemptNumber,
          provider: attempt.provider,
          model: attempt.model,
          status: attempt.status,
          providerRequestId: attempt.providerRequestId ?? null,
          usage: attempt.usage ? { ...attempt.usage } : null,
          costUsd: attempt.costUsd == null ? null : String(attempt.costUsd),
          latencyMs: attempt.latencyMs,
          errorCode: attempt.errorCode ?? null,
          errorMetadata: attempt.errorMetadata ?? null,
          startedAt: attempt.startedAt,
          completedAt: attempt.completedAt,
        })
        .onConflictDoUpdate({
          target: [aiProviderAttempts.aiRunId, aiProviderAttempts.attemptNumber],
          set: {
            status: attempt.status,
            providerRequestId: attempt.providerRequestId ?? null,
            usage: attempt.usage ? { ...attempt.usage } : null,
            costUsd: attempt.costUsd == null ? null : String(attempt.costUsd),
            latencyMs: attempt.latencyMs,
            errorCode: attempt.errorCode ?? null,
            errorMetadata: attempt.errorMetadata ?? null,
            completedAt: attempt.completedAt,
          },
        });
    }
  }

  async complete(input: CompleteAiRunInput): Promise<void> {
    await this.db
      .update(aiRuns)
      .set({
        status: "succeeded",
        outputReference: input.outputReference,
        normalizedUsage: { ...input.usage },
        chargedCredits: input.chargedCredits,
        errorCode: null,
        errorMetadata: null,
        completedAt: new Date(),
      })
      .where(eq(aiRuns.id, input.runId));
  }

  async fail(input: FailAiRunInput): Promise<void> {
    await this.db
      .update(aiRuns)
      .set({
        status: "failed",
        errorCode: input.errorCode,
        errorMetadata: input.errorMetadata,
        completedAt: new Date(),
      })
      .where(eq(aiRuns.id, input.runId));
  }
}

export class NeonOperationResultRepository
  implements OperationResultRepository
{
  constructor(private readonly db: NeonRepositoryDatabase) {}

  async get(resultId: string, ownerId: string) {
    const [row] = await this.db
      .select()
      .from(operationResults)
      .where(
        and(
          eq(operationResults.id, resultId),
          eq(operationResults.ownerId, ownerId),
        ),
      )
      .limit(1);
    return row ? mapOperationResultRow(row) : null;
  }

  async create(input: {
    id: string;
    ownerId: string;
    workflowRunId: string;
    aiRunId: string;
    content: Record<string, unknown>;
    contentHash: string;
  }) {
    const [row] = await this.db
      .insert(operationResults)
      .values(input)
      .returning();
    return mapOperationResultRow(row);
  }
}
