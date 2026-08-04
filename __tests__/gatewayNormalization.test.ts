/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import {
  normalizeGatewayError,
  normalizeGatewayUsage,
} from "../infrastructure/ai-gateway/vercelGateway.js";

describe("AI Gateway normalization", () => {
  it("normalizes current and compatibility token fields", () => {
    expect(
      normalizeGatewayUsage({
        inputTokens: 120,
        outputTokens: 30,
        inputTokenDetails: { cacheReadTokens: 10 },
      }),
    ).toEqual({
      inputTokens: 120,
      outputTokens: 30,
      cachedInputTokens: 10,
      imageCount: undefined,
      searchQueries: undefined,
      providerReportedCostUsd: undefined,
    });
    expect(
      normalizeGatewayUsage({ promptTokens: 4, completionTokens: 2 }),
    ).toMatchObject({ inputTokens: 4, outputTokens: 2 });
  });

  it.each([
    [429, "RATE_LIMITED"],
    [503, "PROVIDER_UNAVAILABLE"],
    [413, "CONTEXT_TOO_LARGE"],
    [401, "UNAUTHORIZED"],
  ] as const)("maps HTTP %s without leaking provider text", (statusCode, code) => {
    const normalized = normalizeGatewayError(
      Object.assign(new Error("provider secret detail"), { statusCode }),
    );
    expect(normalized.code).toBe(code);
    expect(normalized.message).not.toContain("provider secret detail");
  });

  it("classifies aborts as retryable timeouts", () => {
    const error = new Error("request aborted");
    error.name = "AbortError";
    const normalized = normalizeGatewayError(error);
    expect(normalized.code).toBe("TIMEOUT");
    expect(normalized.retryable).toBe(true);
  });
});
