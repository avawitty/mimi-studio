/** @vitest-environment node */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cacheClear } from "../lib/sovereign/cache";
import { resetSovereignDbForTests } from "../lib/sovereign/db";
import {
  deletePocketItem,
  getProfileByHandle,
  getZineById,
  importZines,
  listPocketItems,
  listPublicZines,
  listUserZines,
  seedDemoShelfIfEmpty,
  slimZineForFloor,
  sovereignStatus,
  upsertPocketItem,
  upsertProfile,
  upsertZine,
} from "../lib/sovereign/store";
import type { PocketItem, UserProfile, ZineMetadata } from "../types";

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
    delete process.env.MIMI_SOVEREIGN_SEED_DEMO;
    resetSovereignDbForTests();
    cacheClear();
  });

  afterEach(() => {
    resetSovereignDbForTests();
    cacheClear();
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

  it("searches public zines by title/handle", () => {
    upsertZine(sampleZine({ id: "z1", title: "Velvet Press", userHandle: "ava" }));
    upsertZine(sampleZine({ id: "z2", title: "Other", userHandle: "nori" }));
    expect(listPublicZines(10, "velvet").map((z) => z.id)).toEqual(["z1"]);
    expect(listPublicZines(10, "nori").map((z) => z.id)).toEqual(["z2"]);
  });

  it("slims floor payloads (no pagesJson / threadData)", () => {
    const slim = slimZineForFloor(sampleZine());
    expect(slim.content.pagesJson).toBeUndefined();
    expect(slim.content.pages?.[0]?.threadData).toBeUndefined();
    expect((slim.content.pages?.[0]?.bodyCopy as string).length).toBeLessThanOrEqual(400);
  });

  it("returns private zines only to the owner", () => {
    upsertZine(sampleZine({ id: "priv", isPublic: false, userId: "owner" }));
    expect(getZineById("priv")).toBeNull();
    expect(getZineById("priv", { requesterUid: "owner", includePrivate: true })?.id).toBe("priv");
    expect(listUserZines("owner", { publicOnly: false }).map((z) => z.id)).toEqual(["priv"]);
    expect(listUserZines("owner", { publicOnly: true })).toEqual([]);
  });

  it("stores profiles and pocket items", () => {
    upsertProfile({
      uid: "user_1",
      handle: "Ava",
      displayName: "Ava",
    } as UserProfile);
    expect(getProfileByHandle("ava")?.displayName).toBe("Ava");

    const item = {
      id: "pocket_1",
      userId: "user_1",
      type: "text",
      savedAt: 10,
      content: { note: "hello" },
    } as PocketItem;
    upsertPocketItem(item);
    expect(listPocketItems("user_1")).toHaveLength(1);
    expect(deletePocketItem("pocket_1", "user_1")).toBe(true);
    expect(listPocketItems("user_1")).toHaveLength(0);
  });

  it("imports batches and can seed demo shelf", () => {
    const { imported, skipped } = importZines([
      sampleZine({ id: "i1" }),
      { id: "", userId: "" } as ZineMetadata,
    ]);
    expect(imported).toBe(1);
    expect(skipped).toBe(1);

    process.env.MIMI_SOVEREIGN_SEED_DEMO = "1";
    // Already has public content — seed should no-op
    expect(seedDemoShelfIfEmpty()).toBe(0);
  });
});
