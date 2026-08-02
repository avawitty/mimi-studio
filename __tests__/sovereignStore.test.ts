/** @vitest-environment node */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetSovereignDbForTests } from "../lib/sovereign/db";
import {
  listPublicZines,
  slimZineForFloor,
  sovereignStatus,
  upsertZine,
} from "../lib/sovereign/store";
import type { ZineMetadata } from "../types";

const tmpRoot = path.join(os.tmpdir(), `mimi-sovereign-${process.pid}`);

const sampleZine = (overrides: Partial<ZineMetadata> = {}): ZineMetadata =>
  ({
    id: "zine_test_1",
    userId: "user_1",
    userHandle: "ava",
    title: "Floor Signal",
    tone: "editorial",
    timestamp: 1_700_000_000_000,
    createdAt: 1_700_000_000_000,
    likes: 0,
    isPublic: true,
    fragmentsUsed: [],
    theme: "test",
    aestheticVector: {},
    content: {
      title: "Floor Signal",
      headlines: ["Hello Floor"],
      pages: [
        {
          pageNumber: 1,
          bodyCopy: "A".repeat(800),
          threadData: { secret: true },
        },
      ],
      pagesJson: "[]",
    },
    ...overrides,
  }) as ZineMetadata;

describe("sovereign store", () => {
  beforeEach(() => {
    fs.mkdirSync(tmpRoot, { recursive: true });
    const dbPath = path.join(tmpRoot, `${Date.now()}-${Math.random()}.sqlite`);
    process.env.MIMI_SOVEREIGN_ENABLED = "1";
    process.env.MIMI_SOVEREIGN_DB = dbPath;
    delete process.env.VERCEL;
    resetSovereignDbForTests();
  });

  afterEach(() => {
    resetSovereignDbForTests();
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("upserts and lists public zines by timestamp", () => {
    upsertZine(sampleZine({ id: "z1", timestamp: 100, title: "Older" }));
    upsertZine(sampleZine({ id: "z2", timestamp: 200, title: "Newer" }));
    upsertZine(sampleZine({ id: "z3", timestamp: 300, title: "Private", isPublic: false }));

    const listed = listPublicZines(10);
    expect(listed.map((z) => z.id)).toEqual(["z2", "z1"]);
    expect(sovereignStatus().publicCount).toBe(2);
  });

  it("slims floor payloads (no pagesJson / threadData)", () => {
    const slim = slimZineForFloor(sampleZine());
    expect(slim.content.pagesJson).toBeUndefined();
    expect(slim.content.pages?.[0]?.threadData).toBeUndefined();
    expect((slim.content.pages?.[0]?.bodyCopy as string).length).toBeLessThanOrEqual(400);
  });
});
