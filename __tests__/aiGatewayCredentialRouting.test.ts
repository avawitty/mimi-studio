/** @vitest-environment node */
import { afterEach, describe, expect, it } from "vitest";
import { getServerAiGatewayKey } from "../lib/aiGatewayCompat";

describe("getServerAiGatewayKey credential routing", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("prefers VERCEL_OIDC_TOKEN on Vercel deployments", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_OIDC_TOKEN = "oidc-token";
    process.env.AI_GATEWAY_API_KEY = "static-key";
    expect(getServerAiGatewayKey()).toBe("oidc-token");
  });

  it("falls back to AI_GATEWAY_API_KEY on Vercel when OIDC is absent", () => {
    process.env.VERCEL = "1";
    delete process.env.VERCEL_OIDC_TOKEN;
    process.env.AI_GATEWAY_API_KEY = "static-key";
    expect(getServerAiGatewayKey()).toBe("static-key");
  });

  it("prefers AI_GATEWAY_API_KEY locally when both are set", () => {
    delete process.env.VERCEL;
    process.env.VERCEL_OIDC_TOKEN = "oidc-token";
    process.env.AI_GATEWAY_API_KEY = "static-key";
    expect(getServerAiGatewayKey()).toBe("static-key");
  });

  it("uses OIDC locally when API key is absent", () => {
    delete process.env.VERCEL;
    process.env.VERCEL_OIDC_TOKEN = "oidc-token";
    delete process.env.AI_GATEWAY_API_KEY;
    expect(getServerAiGatewayKey()).toBe("oidc-token");
  });
});
