import { createHash, randomUUID } from "node:crypto";
import type {
  AiGateway,
  AiOperationDefinition,
  GatewayAttempt,
  GatewayErrorCode,
  GatewayResult,
} from "../../domain/ai/types.js";
import { GatewayError } from "../../domain/ai/types.js";
import type {
  DatabaseRepositories,
  UnitOfWork,
} from "../../domain/database.js";
import type { WorkflowRun } from "../../domain/workflows/types.js";
import {
  CreditService,
  DEFAULT_RESERVATION_TTL_MS,
} from "../credits/creditService.js";
import { CreditMaintenanceService } from "../credits/maintenance.js";
import {
  buildOperationPrompt,
  creditPolicyFor,
  operationFor,
  scribeProposeAtomsOutputSchema,
  type RegisteredOperationId,
  validateOperationOutputAgainstInput,
  type ScribeProposeAtomsInput,
  type ScribeProposeAtomsOutput,
} from "./registry.js";

export interface ExecuteOperationRequest {
  operationId: string;
  actorId: string;
  workspaceId?: string;
  input: unknown;
  sourceIds?: string[];
  idempotencyKey: string;
  requestId: string;
}

export interface ExecuteOperationResult {
  workflowRunId: string;
  aiRunId: string;
  status: "succeeded";
  result: Record<string, unknown>;
  credits: {
    reserved: number;
    charged: number;
    released: number;
    remaining: number;
  };
  provenance: {
    sourceIds: string[];
    promptVersion: number;
  };
}

export class WorkflowConflictError extends Error {
  constructor(
    readonly workflow: WorkflowRun,
    message = "An operation with this idempotency key is already in progress.",
  ) {
    super(message);
    this.name = "WorkflowConflictError";
  }
}

export class OperationExecutionError extends Error {
  constructor(
    readonly code: GatewayErrorCode | string,
    message: string,
    readonly workflowRunId?: string,
  ) {
    super(message);
    this.name = "OperationExecutionError";
  }
}

function jsonSafeNumber(value: bigint): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) {
    throw new Error("Credit amount exceeds the JSON safe-integer range.");
  }
  return number;
}

function sourceHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function failureReleaseReason(code: GatewayErrorCode) {
  switch (code) {
    case "INVALID_PROVIDER_OUTPUT":
      return "invalid_output" as const;
    case "CONTENT_REJECTED":
    case "RATE_LIMITED":
    case "TIMEOUT":
    case "PROVIDER_UNAVAILABLE":
      return "provider_failure" as const;
    case "INVALID_REQUEST":
    case "UNAUTHORIZED":
    case "CONTEXT_TOO_LARGE":
    case "INTERNAL_ERROR":
      return "internal_error" as const;
    default: {
      const exhaustive: never = code;
      return exhaustive;
    }
  }
}

export class AiOperationService {
  private readonly credits: CreditService;
  private readonly maintenance: CreditMaintenanceService;

  constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly gateway: AiGateway,
  ) {
    this.credits = new CreditService(unitOfWork);
    this.maintenance = new CreditMaintenanceService(unitOfWork);
  }

  private async resolveAuthorizedMembership(
    repositories: DatabaseRepositories,
    actorId: string,
    workspaceId: string | undefined,
    entitlement: string,
  ) {
    const membership = await this.credits.resolveMembership(
      repositories,
      actorId,
      workspaceId,
    );
    const decision = this.credits.authorize(membership, entitlement);
    if (!decision.allowed) {
      throw new OperationExecutionError(
        decision.reason || "ENTITLEMENT_REQUIRED",
        decision.reason === "PAYMENT_STATE_UNRESOLVED"
          ? "Membership state requires reconciliation before this operation."
          : `The ${entitlement} entitlement is required.`,
      );
    }
    return membership;
  }

  private async resolveExisting(
    repositories: DatabaseRepositories,
    workflow: WorkflowRun,
    actorId: string,
    requestHash: string,
  ): Promise<ExecuteOperationResult> {
    if (workflow.requestHash !== requestHash) {
      throw new WorkflowConflictError(
        workflow,
        "Idempotency key was already used for another operation request.",
      );
    }
    switch (workflow.status) {
      case "awaiting_approval":
      case "succeeded": {
        const reference = workflow.resultReference as {
          operationResultId?: string;
          workflowRunId?: string;
          aiRunId?: string;
          status?: "succeeded";
          credits?: ExecuteOperationResult["credits"];
          provenance?: ExecuteOperationResult["provenance"];
        } | null;
        if (!reference?.operationResultId) {
          throw new OperationExecutionError(
            "INTERNAL_ERROR",
            "The original operation result is unavailable.",
            workflow.id,
          );
        }
        const stored = await repositories.operationResults.get(
          reference.operationResultId,
          actorId,
        );
        if (
          !stored ||
          !reference.workflowRunId ||
          !reference.aiRunId ||
          !reference.credits ||
          !reference.provenance
        ) {
          throw new OperationExecutionError(
            "INTERNAL_ERROR",
            "The original operation result is unavailable.",
            workflow.id,
          );
        }
        return {
          workflowRunId: reference.workflowRunId,
          aiRunId: reference.aiRunId,
          status: "succeeded",
          result: stored.content,
          credits: reference.credits,
          provenance: reference.provenance,
        };
      }
      case "queued":
      case "running":
        throw new WorkflowConflictError(workflow);
      case "failed":
        throw new OperationExecutionError(
          workflow.errorCode || "INTERNAL_ERROR",
          "The original operation failed. Use a new idempotency key to retry.",
          workflow.id,
        );
      case "canceled":
        throw new OperationExecutionError(
          "WORKFLOW_CANCELED",
          "The original operation was canceled.",
          workflow.id,
        );
      default: {
        const exhaustive: never = workflow.status;
        return exhaustive;
      }
    }
  }

  async execute(request: ExecuteOperationRequest): Promise<ExecuteOperationResult> {
    const definition = operationFor(request.operationId);
    if (!definition) {
      throw new OperationExecutionError(
        "INVALID_REQUEST",
        `Operation ${request.operationId} is not registered.`,
      );
    }
    if (request.operationId === "scribe.propose-atoms" && request.workspaceId) {
      throw new OperationExecutionError(
        "INVALID_REQUEST",
        "Scribe proposals currently support personal project scope only.",
      );
    }
    const registeredOperationId = definition.id as RegisteredOperationId;
    const parsedInput = definition.inputSchema.safeParse(request.input);
    if (!parsedInput.success) {
      throw new OperationExecutionError(
        "INVALID_REQUEST",
        parsedInput.error.issues[0]?.message || "Operation input is invalid.",
      );
    }
    const input = parsedInput.data;
    const projectId =
      request.operationId === "scribe.propose-atoms"
        ? (input as ScribeProposeAtomsInput).projectId
        : undefined;
    const requestHash = sourceHash({
      operationId: request.operationId,
      workspaceId: request.workspaceId ?? null,
      input,
      sourceIds: request.sourceIds ?? [],
    });
    const existing = await this.unitOfWork.repositories.workflows.findByIdempotency(
      request.actorId,
      request.idempotencyKey,
    );
    if (existing) {
      if (
        (existing.status === "queued" || existing.status === "running") &&
        (await this.maintenance.recoverExpiredWorkflow(existing))
      ) {
        throw new OperationExecutionError(
          "TIMEOUT",
          "The previous run expired and its credits were released. Retry with a new request.",
          existing.id,
        );
      }
      await this.unitOfWork.transaction(async (repositories) => {
        await this.resolveAuthorizedMembership(
          repositories,
          request.actorId,
          existing.workspaceId ?? undefined,
          definition.entitlement,
        );
      });
      return this.resolveExisting(
        this.unitOfWork.repositories,
        existing,
        request.actorId,
        requestHash,
      );
    }

    const workflowRunId = randomUUID();
    const aiRunId = randomUUID();
    const sourceId = randomUUID();
    const policy = creditPolicyFor(definition.creditPolicy);
    const prepared = await this.unitOfWork.transaction(async (repositories) => {
      const concurrent = await repositories.workflows.findByIdempotency(
        request.actorId,
        request.idempotencyKey,
      );
      if (concurrent) {
        await this.resolveAuthorizedMembership(
          repositories,
          request.actorId,
          concurrent.workspaceId ?? undefined,
          definition.entitlement,
        );
        const result = await this.resolveExisting(
          repositories,
          concurrent,
          request.actorId,
          requestHash,
        );
        return { existingResult: result } as const;
      }

      const membership = await this.resolveAuthorizedMembership(
        repositories,
        request.actorId,
        request.workspaceId,
        definition.entitlement,
      );

      const account = await this.credits.ensureAccountAndGrant(
        repositories,
        request.actorId,
        membership,
        request.workspaceId,
      );
      const source = await repositories.memory.createSource({
        id: sourceId,
        ownerId: request.actorId,
        projectId,
        sourceType: "conversation",
        storageReference: {
          kind: "inline-private",
          operationId: request.operationId,
          input,
        },
        contentHash: sourceHash({ operationId: request.operationId, input }),
        metadata: {
          externalSourceIds: request.sourceIds ?? [],
          classification: definition.dataPolicy,
        },
      });
      await repositories.workflows.create({
        id: workflowRunId,
        actorId: request.actorId,
        workspaceId: request.workspaceId,
        chamber: definition.chamber,
        workflowType: request.operationId,
        workflowVersion: definition.version,
        idempotencyKey: request.idempotencyKey,
        requestHash,
        inputReference: {
          sourceId: source.id,
          externalSourceIds: request.sourceIds ?? [],
          projectId: projectId ?? null,
        },
      });
      const reservation = await repositories.credits.createReservation({
        accountId: account.id,
        operationId: request.operationId,
        estimatedCredits: policy.estimatedCredits,
        idempotencyKey: `${request.actorId}:${request.operationId}:${request.idempotencyKey}`,
        workflowRunId,
        aiRunId,
        expiresAt: new Date(Date.now() + DEFAULT_RESERVATION_TTL_MS),
      });
      await repositories.aiRuns.create({
        id: aiRunId,
        workflowRunId,
        actorId: request.actorId,
        workspaceId: request.workspaceId,
        operationId: request.operationId,
        operationVersion: definition.version,
        reservationId: reservation.id,
        routingPolicy: definition.routingPolicy,
        promptId: definition.promptId,
        promptVersion: definition.promptVersion,
        inputReference: { sourceId: source.id },
      });
      await repositories.workflows.updateStatus({
        workflowRunId,
        status: "running",
        currentStep: "gateway_execution",
      });
      return {
        accountId: account.id,
        reservationId: reservation.id,
        sourceId: source.id,
        membership,
      } as const;
    });

    if ("existingResult" in prepared) return prepared.existingResult;

    const prompt = buildOperationPrompt(registeredOperationId, input);
    let completedGatewayAttempts: GatewayAttempt[] = [];
    try {
      const gatewayResult = await this.gateway.execute({
        request: {
          runId: aiRunId,
          operationId: request.operationId,
          operationVersion: definition.version,
          actorId: request.actorId,
          workspaceId: request.workspaceId,
          reservationId: prepared.reservationId,
          input,
          privacy: {
            classification: definition.dataPolicy,
            allowProviderRetention: false,
          },
          tracing: {
            workflowRunId,
            requestId: request.requestId,
            idempotencyKey: request.idempotencyKey,
          },
        },
        outputSchema: definition.outputSchema,
        prompt: prompt.prompt,
        system: prompt.system,
        routingPolicy: definition.routingPolicy,
        promptId: definition.promptId,
        promptVersion: definition.promptVersion,
        sourceIds: [prepared.sourceId],
        timeoutMs: definition.timeoutMs,
      });
      completedGatewayAttempts = gatewayResult.attempts;
      let validatedOutput: unknown;
      try {
        validatedOutput = validateOperationOutputAgainstInput(
          registeredOperationId,
          input,
          gatewayResult.output,
        );
      } catch (error) {
        throw new GatewayError({
          code: "INVALID_PROVIDER_OUTPUT",
          message: "Mimi could not produce a reliable structured result.",
          attempts: gatewayResult.attempts,
          retryable: false,
          cause: error,
        });
      }
      return await this.persistSuccess({
        request,
        definition,
        gatewayResult: { ...gatewayResult, output: validatedOutput },
        workflowRunId,
        aiRunId,
        accountId: prepared.accountId,
        reservationId: prepared.reservationId,
        sourceId: prepared.sourceId,
        projectId,
        registeredOperationId,
      });
    } catch (error) {
      const gatewayError =
        error instanceof GatewayError
          ? error
          : new GatewayError({
              code: "INTERNAL_ERROR",
              message: "The operation could not be persisted safely.",
              attempts: completedGatewayAttempts,
              cause: error,
            });
      await this.unitOfWork.transaction(async (repositories) => {
        await repositories.aiRuns.persistAttempts({
          aiRunId,
          attempts: gatewayError.attempts,
        });
        await repositories.aiRuns.fail({
          runId: aiRunId,
          errorCode: gatewayError.code,
          errorMetadata: { retryable: gatewayError.retryable },
        });
        await repositories.credits.releaseReservation({
          reservationId: prepared.reservationId,
          reason: failureReleaseReason(gatewayError.code),
          idempotencyKey: `${request.idempotencyKey}:failure`,
        });
        await repositories.workflows.updateStatus({
          workflowRunId,
          status: "failed",
          currentStep: null,
          errorCode: gatewayError.code,
        });
      });
      throw new OperationExecutionError(
        gatewayError.code,
        gatewayError.message,
        workflowRunId,
      );
    }
  }

  private async persistSuccess(input: {
    request: ExecuteOperationRequest;
    definition: AiOperationDefinition<unknown, unknown>;
    gatewayResult: GatewayResult<unknown>;
    workflowRunId: string;
    aiRunId: string;
    accountId: string;
    reservationId: string;
    sourceId: string;
    projectId?: string;
    registeredOperationId: RegisteredOperationId;
  }): Promise<ExecuteOperationResult> {
    const policy = creditPolicyFor(input.definition.creditPolicy);
    const actualCredits = policy.actualCharge(input.gatewayResult.usage);
    if (
      actualCredits < policy.minimumCharge ||
      actualCredits > policy.maximumCharge
    ) {
      throw new GatewayError({
        code: "INTERNAL_ERROR",
        message: "The operation credit policy returned an invalid charge.",
      });
    }

    return this.unitOfWork.transaction(async (repositories) => {
      const result = await this.persistOperationOutput(
        repositories,
        input.registeredOperationId,
        input.request.actorId,
        input.aiRunId,
        input.sourceId,
        input.projectId,
        input.gatewayResult.output,
      );
      await repositories.provenance.createEdges([
        {
          fromEntityType: "ai_run",
          fromEntityId: input.aiRunId,
          toEntityType: "source",
          toEntityId: input.sourceId,
          relationship: "derived_from",
          metadata: {
            promptId: input.definition.promptId,
            promptVersion: input.definition.promptVersion,
          },
        },
      ]);
      await repositories.aiRuns.persistAttempts({
        aiRunId: input.aiRunId,
        attempts: input.gatewayResult.attempts,
      });
      await repositories.credits.commitReservation({
        reservationId: input.reservationId,
        actualCredits,
        maximumCredits: policy.maximumCharge,
        aiRunId: input.aiRunId,
        usage: { ...input.gatewayResult.usage },
        idempotencyKey: `${input.request.idempotencyKey}:success`,
      });
      // A reservation may have protected a grant that expired mid-run. Once
      // finalized, expire any value no longer backing an active reservation
      // before reporting the spendable balance.
      await repositories.credits.expireEligibleGrants(input.accountId);
      const balance = await repositories.credits.getBalance(input.accountId);
      const operationResultId = randomUUID();
      await repositories.operationResults.create({
        id: operationResultId,
        ownerId: input.request.actorId,
        workflowRunId: input.workflowRunId,
        aiRunId: input.aiRunId,
        content: result,
        contentHash: sourceHash(result),
      });
      const response: ExecuteOperationResult = {
        workflowRunId: input.workflowRunId,
        aiRunId: input.aiRunId,
        status: "succeeded",
        result,
        credits: {
          reserved: jsonSafeNumber(policy.estimatedCredits),
          charged: jsonSafeNumber(actualCredits),
          released: jsonSafeNumber(policy.estimatedCredits - actualCredits),
          remaining: jsonSafeNumber(balance.available),
        },
        provenance: {
          sourceIds: [input.sourceId],
          promptVersion: input.definition.promptVersion,
        },
      };
      await repositories.aiRuns.complete({
        runId: input.aiRunId,
        outputReference: {
          operationResultId,
          proposalIds:
            Array.isArray(result.proposalIds) ? result.proposalIds : [],
        },
        usage: input.gatewayResult.usage,
        chargedCredits: actualCredits,
      });
      await repositories.workflows.updateStatus({
        workflowRunId: input.workflowRunId,
        status: "awaiting_approval",
        currentStep: "memory_approval",
        resultReference: {
          operationResultId,
          workflowRunId: response.workflowRunId,
          aiRunId: response.aiRunId,
          status: response.status,
          credits: response.credits,
          provenance: response.provenance,
        },
      });
      return response;
    });
  }

  private async persistOperationOutput(
    repositories: DatabaseRepositories,
    operationId: RegisteredOperationId,
    actorId: string,
    aiRunId: string,
    sourceId: string,
    projectId: string | undefined,
    output: unknown,
  ): Promise<Record<string, unknown>> {
    switch (operationId) {
      case "scribe.propose-atoms": {
        const parsed = scribeProposeAtomsOutputSchema.parse(
          output,
        ) as ScribeProposeAtomsOutput;
        const proposals = await repositories.memory.createProposals([
          ...parsed.inferences.map((inference) => ({
            id: randomUUID(),
            ownerId: actorId,
            projectId,
            sourceId,
            aiRunId,
            proposalType: "scribe_inference",
            content: {
              statement: inference.statement,
              confidence: inference.confidence,
              evidenceIds: inference.evidenceIds,
            },
          })),
          ...parsed.recommendations.map((recommendation) => ({
            id: randomUUID(),
            ownerId: actorId,
            projectId,
            sourceId,
            aiRunId,
            proposalType: "scribe_recommendation",
            content: {
              action: recommendation.action,
              rationale: recommendation.rationale,
              inferenceIds: recommendation.inferenceIds,
            },
          })),
        ]);
        await repositories.provenance.createEdges(
          proposals.flatMap((proposal) => [
            {
              fromEntityType: "memory_proposal",
              fromEntityId: proposal.id,
              toEntityType: "source",
              toEntityId: sourceId,
              relationship: "derived_from" as const,
              metadata: {},
            },
            {
              fromEntityType: "memory_proposal",
              fromEntityId: proposal.id,
              toEntityType: "ai_run",
              toEntityId: aiRunId,
              relationship: "generated_by" as const,
              metadata: {},
            },
          ]),
        );
        const inferenceProposalIds = proposals
          .slice(0, parsed.inferences.length)
          .map((proposal) => proposal.id);
        const recommendationProposalIds = proposals
          .slice(parsed.inferences.length)
          .map((proposal) => proposal.id);
        return {
          evidence: parsed.evidence,
          inferences: parsed.inferences.map((inference, index) => ({
            ...inference,
            proposalId: inferenceProposalIds[index],
          })),
          recommendations: parsed.recommendations.map((recommendation, index) => ({
            ...recommendation,
            proposalId: recommendationProposalIds[index],
          })),
          proposalIds: proposals.map((proposal) => proposal.id),
        };
      }
      default: {
        const exhaustive: never = operationId;
        return exhaustive;
      }
    }
  }
}
