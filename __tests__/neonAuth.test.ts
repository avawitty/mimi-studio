/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { neonAuthStatusSnippet, resolveNeonAuthConfig } from "../lib/sovereign/neonAuth";

const keys = [
  "NEON_AUTH_BASE_URL",
  "VITE_NEON_AUTH_URL",
  "NEON_AUTH_COOKIE_SECRET",
  "STACK_SECRET_SERVER_KEY",
  "NEXT_PUBLIC_STACK_PROJECT_ID",
] as const;

describe("neon auth config probe", () => {
  beforeEach(() => {
    for (const key of keys) delete process.env[key];
  });
  afterEach(() => {
    for (const key of keys) delete process.env[key];
  });

  it("reports disabled when unset", () => {
    expect(resolveNeonAuthConfig().enabled).toBe(false);
    expect(neonAuthStatusSnippet().neonAuthConfigured).toBe(false);
  });

  it("detects Neon Auth URL without treating it as ready", () => {
    process.env.NEON_AUTH_BASE_URL =
      "https://ep-dry-feather-auw6atnz.neonauth.c-10.us-east-1.aws.neon.tech/neondb/auth";
    const config = resolveNeonAuthConfig();
    expect(config.enabled).toBe(true);
    expect(config.cookieSecretConfigured).toBe(false);
    const snippet = neonAuthStatusSnippet();
    expect(snippet.neonAuthConfigured).toBe(true);
    expect(snippet.neonAuthReady).toBe(false);
    expect(snippet.neonAuthHost).toContain("neonauth");
  });

  it("flags legacy Stack Auth separately", () => {
    process.env.STACK_SECRET_SERVER_KEY = "legacy";
    expect(resolveNeonAuthConfig().legacyStackConfigured).toBe(true);
    expect(neonAuthStatusSnippet().neonAuthLegacyStack).toBe(true);
  });
});
