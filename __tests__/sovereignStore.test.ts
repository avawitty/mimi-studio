/** @vitest-environment node */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cacheClear } from "../lib/sovereign/cache";
import { resetSovereignDbForTests } from "../lib/sovereign/db";
import { subscribeSovereignEvents } from "../lib/sovereign/events";
import {
  deletePocketItem,
  deleteZine,
  getProfileByHandle,
  getZineById,
  importZines,
  listPocketItems,
  listPublicZines,
  listPublicZinesPage,
  listUserZines,
  replaceAllZines,
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
    } as UserProfile);
    expect((await getProfileByHandle("ava"))?.displayName).toBe("Ava");

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

  it("imports batches and can seed demo shelf", async () => {
    const { imported, skipped, truncated } = await importZines([
      sampleZine({ id: "i1" }),
      { id: "", userId: "" } as ZineMetadata,
    ]);
    expect(imported).toBe(1);
    expect(skipped).toBe(1);
    expect(truncated).toBe(false);

    process.env.MIMI_SOVEREIGN_SEED_DEMO = "1";
    expect(await seedDemoShelfIfEmpty()).toBe(0);
  });

  it("unpublish flips is_public off the Floor", async () => {
    await upsertZine(sampleZine({ id: "pub1", isPublic: true, timestamp: 50 }));
    expect((await listPublicZines(10)).map((z) => z.id)).toEqual(["pub1"]);
    await upsertZine(sampleZine({ id: "pub1", isPublic: false, timestamp: 50 }));
    expect(await listPublicZines(10)).toEqual([]);
    expect(
      (await getZineById("pub1", { requesterUid: "user_1", includePrivate: true }))?.isPublic,
    ).toBe(false);
  });

  it("refuses upsert that would steal another user's zine id", async () => {
    await upsertZine(sampleZine({ id: "owned", userId: "owner_a" }));
    await expect(
      upsertZine(sampleZine({ id: "owned", userId: "owner_b", title: "Hijack" })),
    ).rejects.toThrow(/owned by another user/i);
    expect((await getZineById("owned", { requesterUid: "owner_a", includePrivate: true }))?.title).toBe(
      "Floor Signal",
    );
  });

  it("replaceAllZines clears and imports atomically", async () => {
    await upsertZine(sampleZine({ id: "old1", timestamp: 10 }));
    await upsertZine(sampleZine({ id: "old2", timestamp: 20 }));
    const result = await replaceAllZines([
      sampleZine({ id: "new1", timestamp: 30 }),
      sampleZine({ id: "new2", timestamp: 40 }),
    ]);
    expect(result.cleared).toBe(2);
    expect(result.imported).toBe(2);
    expect((await listPublicZines(10)).map((z) => z.id).sort()).toEqual(["new1", "new2"]);
  });

  it("importZines emits a floor_refresh after quiet batch", async () => {
    const seen: string[] = [];
    const unsub = subscribeSovereignEvents((event) => {
      seen.push(event.type);
    });
    await importZines([sampleZine({ id: "batch1" }), sampleZine({ id: "batch2" })]);
    unsub();
    expect(seen.filter((t) => t === "zine_upsert")).toHaveLength(0);
    expect(seen.filter((t) => t === "floor_refresh")).toHaveLength(1);
  });

  it("deletes zines from the archive", async () => {
    await upsertZine(sampleZine({ id: "del1" }));
    expect(await deleteZine("del1", "user_1")).toBe(true);
    expect(await getZineById("del1")).toBeNull();
  });

  it("paginates public Floor with keyset cursor", async () => {
    await upsertZine(sampleZine({ id: "a", timestamp: 300 }));
    await upsertZine(sampleZine({ id: "b", timestamp: 200 }));
    await upsertZine(sampleZine({ id: "c", timestamp: 100 }));
    const page1 = await listPublicZinesPage(2);
    expect(page1.zines.map((z) => z.id)).toEqual(["a", "b"]);
    expect(page1.nextCursor).toBe(200);
    const page2 = await listPublicZinesPage(2, "", page1.nextCursor);
    expect(page2.zines.map((z) => z.id)).toEqual(["c"]);
    expect(page2.nextCursor).toBeNull();
  });

  it("reports schema version and latency when ready", async () => {
    await upsertZine(sampleZine());
    const status = await sovereignStatus();
    expect(status.ready).toBe(true);
    expect(status.schemaVersion).toBeGreaterThanOrEqual(1);
    expect(typeof status.latencyMs === "number" || status.latencyMs === null).toBe(true);
    expect(typeof status.gatewayEmbed).toBe("boolean");
    expect(typeof status.embeddedCount).toBe("number");
    expect(typeof status.neonAuthConfigured).toBe("boolean");
    expect(typeof status.neonAuthReady).toBe("boolean");
    expect(typeof status.neonAuthLegacyStack).toBe("boolean");
    expect(status.neonAuthHost === null || typeof status.neonAuthHost === "string").toBe(true);
  });
});
