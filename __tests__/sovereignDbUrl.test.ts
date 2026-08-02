/** @vitest-environment node */
import { afterEach, describe, expect, it } from "vitest";
import {
  looksLikeNeonUrl,
  looksLikePostgresUrl,
  resolvePostgresUrl,
} from "../lib/sovereign/db";
import { normalizePostgresConnectionString } from "../lib/sovereign/postgresDriver";

const keys = [
  "MIMI_SOVEREIGN_DATABASE_URL",
  "DATABASE_URL",
  "MIMI_SOVEREIGN_USE_DATABASE_URL",
] as const;

describe("sovereign db url resolution", () => {
  afterEach(() => {
    for (const key of keys) delete process.env[key];
  });

  it("detects postgres and neon urls", () => {
    expect(looksLikePostgresUrl("postgresql://u:p@host/db")).toBe(true);
    expect(looksLikeNeonUrl("postgresql://u:p@ep-x.neon.tech/neondb")).toBe(true);
    expect(looksLikeNeonUrl("postgresql://u:p@localhost/db")).toBe(false);
  });

  it("auto-selects Neon DATABASE_URL without opt-in flag", () => {
    process.env.DATABASE_URL =
      "postgresql://neondb_owner:pass@ep-sweet-dust-pooler.us-east-1.aws.neon.tech/neondb";
    expect(resolvePostgresUrl()).toContain("neon.tech");
  });

  it("ignores non-Neon DATABASE_URL unless opted in", () => {
    process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/mimi";
    expect(resolvePostgresUrl()).toBeNull();
    process.env.MIMI_SOVEREIGN_USE_DATABASE_URL = "1";
    expect(resolvePostgresUrl()).toContain("localhost");
  });

  it("prefers MIMI_SOVEREIGN_DATABASE_URL", () => {
    process.env.DATABASE_URL = "postgresql://u:p@ep-a.neon.tech/neondb";
    process.env.MIMI_SOVEREIGN_DATABASE_URL =
      "postgresql://u:p@ep-b.neon.tech/mimi";
    expect(resolvePostgresUrl()).toContain("ep-b");
  });

  it("upgrades Neon sslmode to verify-full and drops uselibpqcompat", () => {
    const normalized = normalizePostgresConnectionString(
      "postgresql://u:p@ep-x.neon.tech/neondb?sslmode=require&uselibpqcompat=true&channel_binding=require",
    );
    expect(normalized).toMatch(/sslmode=verify-full/i);
    expect(normalized).not.toMatch(/uselibpqcompat=/i);
    expect(normalized).toMatch(/channel_binding=require/);
  });
});
