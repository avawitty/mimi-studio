import type {
  AiGateway,
  GatewayAttempt,
  GatewayErrorCode,
  GatewayExecution,
  GatewayResult,
  NormalizedUsage,
} from "../../domain/ai/types.js";
import { GatewayError } from "../../domain/ai/types.js";
import { generateGatewayObject } from "../../lib/ai/generate.js";
import { modelFor } from "../../services/modelConfig.js";
import { routingPolicyFor } from "./routing.js";

function finiteNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function normalizeGatewayUsage(value: unknown): NormalizedUsage {
  const usage =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  const details =
    typeof usage.inputTokenDetails === "object" && usage.inputTokenDetails !== null
      ? (usage.inputTokenDetails as Record<string, unknown>)
      : {};
  return {
    inputTokens: finiteNumber(usage.inputTokens ?? usage.promptTokens),
    outputTokens: finiteNumber(usage.outputTokens ?? usage.completionTokens),
    cachedInputTokens: finiteNumber(
      usage.cachedInputTokens ?? details.cacheReadTokens,
    ),
    imageCount: finiteNumber(usage.imageCount),
    searchQueries: finiteNumber(usage.searchQueries),
    providerReportedCostUsd: finiteNumber(
      usage.providerReportedCostUsd ?? usage.costUsd,
    ),
  };
}

function statusCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const candidate = error as {
    statusCode?: unknown;
    status?: unknown;
    response?: { status?: unknown };
  };
  return finiteNumber(
    candidate.statusCode ?? candidate.status ?? candidate.response?.status,
  );
}

export function normalizeGatewayError(error: unknown): GatewayError {
  if (error instanceof GatewayError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const status = statusCode(error);
  let code: GatewayErrorCode;
  if (
    (error instanceof Error && error.name === "AbortError") ||
    /timeout|timed out|aborted/i.test(message)
  ) {
    code = "TIMEOUT";
  } else if (status === 401 || status === 403) {
    code = "UNAUTHORIZED";
  } else if (status === 413 || /context.*(large|length)|token limit/i.test(message)) {
    code = "CONTEXT_TOO_LARGE";
  } else if (status === 429) {
    code = "RATE_LIMITED";
  } else if (status === 422 || /content.*(reject|filter|safety)/i.test(message)) {
    code = "CONTENT_REJECTED";
  } else if (status === 400) {
    code = "INVALID_REQUEST";
  } else if (
    status === 402 ||
    status === 408 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {
    code = "PROVIDER_UNAVAILABLE";
  } else if (/schema|structured|parse|invalid.*output|no object generated/i.test(message)) {
    code = "INVALID_PROVIDER_OUTPUT";
  } else {
    code = "INTERNAL_ERROR";
  }
  return new GatewayError({
    code,
    message: "Mimi's AI gateway could not complete the operation.",
    retryable:
      code === "RATE_LIMITED" ||
      code === "TIMEOUT" ||
      code === "PROVIDER_UNAVAILABLE" ||
      code === "INVALID_PROVIDER_OUTPUT",
    cause: error,
  });
}

function safeErrorMetadata(error: GatewayError): Record<string, unknown> {
  const cause = error.cause;
  return {
    code: error.code,
    causeName: cause instanceof Error ? cause.name : "unknown",
    statusCode: statusCode(cause),
  };
}

export class VercelAiGateway implements AiGateway {
  constructor(private readonly apiKey?: string) {}

  async execute<TInput, TOutput>(
    execution: GatewayExecution<TInput, TOutput>,
  ): Promise<GatewayResult<TOutput>> {
    const policy = routingPolicyFor(execution.routingPolicy);
    const targets = [policy.primary, ...policy.fallbacks].slice(
      0,
      policy.maxAttempts,
    );
    const attempts: GatewayAttempt[] = [];
    const operationStarted = Date.now();
    let lastError: GatewayError | null = null;

    for (const [index, target] of targets.entries()) {
      const attemptStartedAt = new Date();
      const started = Date.now();
      const model = modelFor(target.modelAlias, "gateway");
      const provider = model.split("/")[0] || "gateway";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), execution.timeoutMs);
      try {
        const result = await generateGatewayObject({
          prompt: execution.prompt,
          system: execution.system,
          schema: execution.outputSchema,
          model,
          role: target.modelAlias,
          apiKey: this.apiKey,
          abortSignal: controller.signal,
        });
        const parsed = execution.outputSchema.safeParse(result.object);
        if (!parsed.success) {
          throw new GatewayError({
            code: "INVALID_PROVIDER_OUTPUT",
            message: "Provider output failed the registered operation schema.",
            retryable: true,
            cause: parsed.error,
          });
        }
        const usage = normalizeGatewayUsage(result.usage);
        attempts.push({
          attemptNumber: index + 1,
          provider,
          model,
          status: "succeeded",
          usage,
          latencyMs: Date.now() - started,
          startedAt: attemptStartedAt,
          completedAt: new Date(),
        });
        return {
          runId: execution.request.runId,
          status: "succeeded",
          output: parsed.data,
          usage,
          execution: {
            provider,
            model,
            routingPolicy: policy.id,
            latencyMs: Date.now() - operationStarted,
            attempts: attempts.length,
          },
          provenance: {
            promptId: execution.promptId,
            promptVersion: execution.promptVersion,
            sourceIds: execution.sourceIds,
          },
          attempts,
        };
      } catch (error) {
        const normalized = normalizeGatewayError(error);
        lastError = normalized;
        attempts.push({
          attemptNumber: index + 1,
          provider,
          model,
          status: "failed",
          latencyMs: Date.now() - started,
          errorCode: normalized.code,
          errorMetadata: safeErrorMetadata(normalized),
          startedAt: attemptStartedAt,
          completedAt: new Date(),
        });
        const canRetry =
          index + 1 < targets.length &&
          policy.retryableErrors.includes(normalized.code);
        if (!canRetry) break;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new GatewayError({
      code: lastError?.code ?? "INTERNAL_ERROR",
      message: lastError?.message ?? "Mimi's AI gateway could not complete the operation.",
      attempts,
      retryable: lastError?.retryable ?? false,
      cause: lastError?.cause,
    });
  }
}
