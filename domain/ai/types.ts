import type { ZodType } from "zod";

export type AiCapability =
  | "text.generate"
  | "text.structure"
  | "embedding.create"
  | "image.generate"
  | "image.analyze"
  | "search.synthesize";

export type DataClassification =
  | "private"
  | "restricted"
  | "public-compatible";

export type GatewayErrorCode =
  | "INVALID_REQUEST"
  | "UNAUTHORIZED"
  | "CONTENT_REJECTED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "PROVIDER_UNAVAILABLE"
  | "INVALID_PROVIDER_OUTPUT"
  | "CONTEXT_TOO_LARGE"
  | "INTERNAL_ERROR";

export interface NormalizedUsage {
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  imageCount?: number;
  searchQueries?: number;
  providerReportedCostUsd?: number;
}

export interface CreditPolicy {
  id: string;
  version: number;
  reservationStrategy: "fixed" | "estimated";
  estimatedCredits: bigint;
  minimumCharge: bigint;
  maximumCharge: bigint;
  actualCharge: (usage: NormalizedUsage) => bigint;
  invalidOutputCharge: 0;
  providerFailureCharge: 0;
}

export interface AiOperationDefinition<TInput, TOutput> {
  id: string;
  version: number;
  chamber: string;
  capability: AiCapability;
  inputSchema: ZodType<TInput>;
  outputSchema: ZodType<TOutput>;
  promptId: string;
  promptVersion: number;
  routingPolicy: string;
  creditPolicy: string;
  entitlement: string;
  dataPolicy: DataClassification;
  timeoutMs: number;
}

export interface GatewayRequest<TInput> {
  runId: string;
  operationId: string;
  operationVersion: number;
  actorId: string;
  workspaceId?: string;
  reservationId: string;
  input: TInput;
  privacy: {
    classification: DataClassification;
    allowProviderRetention: false;
  };
  tracing: {
    workflowRunId: string;
    requestId: string;
    idempotencyKey: string;
  };
}

export interface GatewayAttempt {
  attemptNumber: number;
  provider: string;
  model: string;
  status: "succeeded" | "failed";
  providerRequestId?: string;
  usage?: NormalizedUsage;
  costUsd?: number;
  latencyMs: number;
  errorCode?: GatewayErrorCode;
  errorMetadata?: Record<string, unknown>;
  startedAt: Date;
  completedAt: Date;
}

export interface GatewayResult<TOutput> {
  runId: string;
  status: "succeeded";
  output: TOutput;
  usage: NormalizedUsage;
  execution: {
    provider: string;
    model: string;
    routingPolicy: string;
    latencyMs: number;
    attempts: number;
  };
  provenance: {
    promptId: string;
    promptVersion: number;
    sourceIds: string[];
  };
  attempts: GatewayAttempt[];
}

export class GatewayError extends Error {
  readonly code: GatewayErrorCode;
  readonly attempts: GatewayAttempt[];
  readonly retryable: boolean;

  constructor(input: {
    code: GatewayErrorCode;
    message: string;
    attempts?: GatewayAttempt[];
    retryable?: boolean;
    cause?: unknown;
  }) {
    super(input.message, { cause: input.cause });
    this.name = "GatewayError";
    this.code = input.code;
    this.attempts = input.attempts ?? [];
    this.retryable = input.retryable ?? false;
  }
}

export interface GatewayExecution<TInput, TOutput> {
  request: GatewayRequest<TInput>;
  outputSchema: ZodType<TOutput>;
  prompt: string;
  system: string;
  routingPolicy: string;
  promptId: string;
  promptVersion: number;
  sourceIds: string[];
  timeoutMs: number;
}

export interface AiGateway {
  execute<TInput, TOutput>(
    execution: GatewayExecution<TInput, TOutput>,
  ): Promise<GatewayResult<TOutput>>;
}
