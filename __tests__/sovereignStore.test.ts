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
  toPublicProfileProjection,
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
  beforeEach(async () => {
    fs.mkdirSync(tmpRoot, { recursive: true });
    const dbPath = path.join(tmpRoot, `${Date.now()}-${Math.random()}.sqlite`);
    process.env.MIMI_SOVEREIGN_ENABLED = "1";
    process.env.MIMI_SOVEREIGN_DB = dbPath;
    delete process.env.VERCEL;
    delete process.env.MIMI_SOVEREIGN_SEED_DEMO;
    delete process.env.MIMI_SOVEREIGN_DATABASE_URL;
    delete process.env.MIMI_SOVEREIGN_USE_DATABASE_URL;
    await resetSovereignDbForTests();
    cacheClear();
  });

  afterEach(async () => {
    await resetSovereignDbForTests();
    cacheClear();
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("upserts and lists public zines by timestamp", async () => {
    await upsertZine(sampleZine({ id: "z1", timestamp: 100, title: "Older" }));
    await upsertZine(sampleZine({ id: "z2", timestamp: 200, title: "Newer" }));
    await upsertZine(sampleZine({ id: "z3", timestamp: 300, title: "Private", isPublic: false }));

    const listed = await listPublicZines(10);
    expect(listed.map((z) => z.id)).toEqual(["z2", "z1"]);
    expect((await sovereignStatus()).publicCount).toBe(2);
    expect((await sovereignStatus()).backend).toBe("sqlite");
  });

  it("searches public zines by title/handle", async () => {
    await upsertZine(sampleZine({ id: "z1", title: "Velvet Press", userHandle: "ava" }));
    await upsertZine(sampleZine({ id: "z2", title: "Other", userHandle: "nori" }));
    expect((await listPublicZines(10, "velvet")).map((z) => z.id)).toEqual(["z1"]);
    expect((await listPublicZines(10, "nori")).map((z) => z.id)).toEqual(["z2"]);
  });

  it("slims floor payloads (no pagesJson / threadData)", () => {
    const slim = slimZineForFloor(sampleZine());
    expect(slim.content.pagesJson).toBeUndefined();
    expect(slim.content.pages?.[0]?.threadData).toBeUndefined();
    expect((slim.content.pages?.[0]?.bodyCopy as string).length).toBeLessThanOrEqual(400);
  });

  it("returns private zines only to the owner", async () => {
    await upsertZine(sampleZine({ id: "priv", isPublic: false, userId: "owner" }));
    expect(await getZineById("priv")).toBeNull();
    expect(
      (await getZineById("priv", { requesterUid: "owner", includePrivate: true }))?.id,
    ).toBe("priv");
    expect((await listUserZines("owner", { publicOnly: false })).map((z) => z.id)).toEqual([
      "priv",
    ]);
    expect(await listUserZines("owner", { publicOnly: true })).toEqual([]);
  });

  it("stores profiles and pocket items", async () => {
    await upsertProfile({
      uid: "user_1",
      handle: "Ava",
      displayName: "Ava",
      currentSeason: "SS26",
      createdAt: 1,
      // private prefs must not be persisted on the public projection
      tailorDrafts: { secret: true },
    } as unknown as UserProfile);
    const stored = await getProfileByHandle("ava");
    expect(stored?.displayName).toBe("Ava");
    expect((stored as any)?.tailorDrafts).toBeUndefined();
    expect(toPublicProfileProjection(stored as UserProfile).uid).toBe("user_1");

    const item = {
      id: "pocket_1",
      userId: "user_1",
      type: "text",
      savedAt: 10,
      content: { note: "hello" },
    } as PocketItem;
    await upsertPocketItem(item);
    expect(await listPocketItems("user_1")).toHaveLength(1);
    expect(await deletePocketItem("pocket_1", "user_1")).toBe(true);
    expect(await listPocketItems("user_1")).toHaveLength(0);
  });

  it("persists write-time card projections for Floor lists", async () => {
    await upsertZine(sampleZine({ id: "carded" }));
    const listed = await listPublicZines(5);
    const hit = listed.find((z) => z.id === "carded");
    expect(hit?.content.pagesJson).toBeUndefined();
    expect(hit?.content.pages?.[0]?.threadData).toBeUndefined();
  });

  it("imports batches and can seed demo shelf", async () => {
    const { imported, skipped } = await importZines([
      sampleZine({ id: "i1" }),
      { id: "", userId: "" } as ZineMetadata,
    ]);
    expect(imported).toBe(1);
    expect(skipped).toBe(1);

    process.env.MIMI_SOVEREIGN_SEED_DEMO = "1";
    expect(await seedDemoShelfIfEmpty()).toBe(0);
  });
});
