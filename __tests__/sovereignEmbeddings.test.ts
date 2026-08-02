/** @vitest-environment node */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cacheClear } from "../lib/sovereign/cache";
import { resetSovereignDbForTests } from "../lib/sovereign/db";
import {
  buildZineEmbeddingText,
  indexZineEmbedding,
  isSovereignGatewayEmbedEnabled,
  parseEmbeddingJson,
  searchPublicZinesSemantic,
} from "../lib/sovereign/embeddings";
import { listPublicZinesPage, upsertZine } from "../lib/sovereign/store";
import type { ZineMetadata } from "../types";

vi.mock("../lib/ai/generate.js", () => ({
  embedGatewayText: vi.fn(async ({ value }: { value: string }) => {
    // Deterministic tiny vectors for tests (3-d).
    const lower = value.toLowerCase();
    const embedding = lower.includes("velvet")
      ? [1, 0, 0]
      : lower.includes("concrete")
        ? [0, 1, 0]
        : [0, 0, 1];
    return { embedding, model: "openai/text-embedding-3-small", dims: 3, usage: {} };
  }),
}));

const tmpRoot = path.join(os.tmpdir(), `mimi-sovereign-embed-${process.pid}`);

const sampleZine = (overrides: Partial<ZineMetadata> = {}): ZineMetadata =>
  ({
    id: "zine_embed_1",
    userId: "user_1",
    userHandle: "ava",
    title: "Velvet Press",
    tone: "editorial",
    timestamp: 1_700_000_000_000,
    createdAt: 1_700_000_000_000,
    likes: 0,
    isPublic: true,
    fragmentsUsed: [],
    theme: "test",
    aestheticVector: {},
    content: {
      title: "Velvet Press",
      headlines: ["Soft signal"],
      vocal_summary_blurb: "A velvet shelf note",
      pages: [{ pageNumber: 1, bodyCopy: "Velvet cloth and quiet ink." }],
    },
    ...overrides,
  }) as ZineMetadata;

describe("sovereign AI Gateway embeddings", () => {
  beforeEach(async () => {
    fs.mkdirSync(tmpRoot, { recursive: true });
    const dbPath = path.join(tmpRoot, `${Date.now()}-${Math.random()}.sqlite`);
    process.env.MIMI_SOVEREIGN_ENABLED = "1";
    process.env.MIMI_SOVEREIGN_DB = dbPath;
    process.env.MIMI_SOVEREIGN_EMBED = "1";
    process.env.AI_GATEWAY_API_KEY = "test-key";
    delete process.env.VERCEL;
    delete process.env.MIMI_SOVEREIGN_DATABASE_URL;
    await resetSovereignDbForTests();
    cacheClear();
  });

  afterEach(async () => {
    await resetSovereignDbForTests();
    cacheClear();
    delete process.env.MIMI_SOVEREIGN_EMBED;
    delete process.env.AI_GATEWAY_API_KEY;
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("builds compact embedding text and parses vectors", () => {
    expect(isSovereignGatewayEmbedEnabled()).toBe(true);
    const text = buildZineEmbeddingText(sampleZine());
    expect(text.toLowerCase()).toContain("velvet");
    expect(parseEmbeddingJson("[1,2,3]")).toEqual([1, 2, 3]);
    expect(parseEmbeddingJson("nope")).toBeNull();
  });

  it("indexes and ranks Floor search via Gateway embeddings", async () => {
    await upsertZine(sampleZine({ id: "v1", title: "Velvet Press", timestamp: 300 }), {
      skipEmbed: true,
    });
    await upsertZine(
      sampleZine({
        id: "c1",
        title: "Concrete Atlas",
        timestamp: 200,
        content: {
          title: "Concrete Atlas",
          headlines: ["Hard edges"],
          vocal_summary_blurb: "Brutal concrete forms",
          pages: [{ pageNumber: 1, bodyCopy: "Concrete slabs in rain." }],
        } as ZineMetadata["content"],
      }),
      { skipEmbed: true },
    );

    expect(await indexZineEmbedding(sampleZine({ id: "v1", title: "Velvet Press" }))).toBe(true);
    expect(
      await indexZineEmbedding(
        sampleZine({
          id: "c1",
          title: "Concrete Atlas",
          content: {
            title: "Concrete Atlas",
            headlines: ["Hard edges"],
            vocal_summary_blurb: "Brutal concrete forms",
            pages: [{ pageNumber: 1, bodyCopy: "Concrete slabs in rain." }],
          } as ZineMetadata["content"],
        }),
      ),
    ).toBe(true);

    const semantic = await searchPublicZinesSemantic("velvet atmosphere", 10);
    expect(semantic.usedGateway).toBe(true);
    expect(semantic.hits[0]?.id).toBe("v1");

    const page = await listPublicZinesPage(10, "velvet atmosphere");
    expect(page.searchMode === "hybrid" || page.searchMode === "keyword").toBe(true);
    expect(page.zines.some((z) => z.id === "v1")).toBe(true);
  });
});
