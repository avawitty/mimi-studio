/**
 * Sovereign Floor embeddings via Vercel AI Gateway.
 * Indexes public/private zine text so community `q=` can rank by meaning.
 */
import { cosineSimilarity } from "../embeddingMath.js";
import { modelFor } from "../../services/modelConfig.js";
import type { ZineMetadata } from "../../types.js";
import { getSovereignDb } from "./db.js";

const SEMANTIC_CANDIDATE_CAP = 200;
const MIN_SEMANTIC_SCORE = 0.18;

export const isSovereignGatewayEmbedEnabled = (): boolean => {
  if (process.env.MIMI_SOVEREIGN_EMBED === "0" || process.env.MIMI_SOVEREIGN_EMBED === "false") {
    return false;
  }
  // Explicit opt-in, or auto when a Gateway credential is present.
  if (process.env.MIMI_SOVEREIGN_EMBED === "1" || process.env.MIMI_SOVEREIGN_EMBED === "true") {
    return true;
  }
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
};

export const resolveSovereignEmbedApiKey = (): string | undefined => {
  const key = process.env.AI_GATEWAY_API_KEY?.trim();
  return key || undefined;
};

/** Compact text used for Floor semantic index (title, tone, blurb, first page). */
export const buildZineEmbeddingText = (zine: ZineMetadata): string => {
  const content = zine.content || ({} as ZineMetadata["content"]);
  const headlines = Array.isArray(content.headlines) ? content.headlines.join(" ") : "";
  const blurb =
    typeof content.vocal_summary_blurb === "string" ? content.vocal_summary_blurb : "";
  const mirror =
    typeof (content as { oracular_mirror?: string }).oracular_mirror === "string"
      ? (content as { oracular_mirror?: string }).oracular_mirror
      : "";
  const firstPage =
    Array.isArray(content.pages) && typeof content.pages[0]?.bodyCopy === "string"
      ? content.pages[0].bodyCopy
      : "";
  const raw = [
    zine.title,
    zine.tone,
    zine.userHandle,
    headlines,
    blurb,
    mirror,
    firstPage,
  ]
    .filter((part) => typeof part === "string" && part.trim())
    .join("\n")
    .replace(/\s+/g, " ")
    .trim();
  return raw.slice(0, 2000);
};

export const parseEmbeddingJson = (raw: unknown): number[] | null => {
  if (!raw || typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || !parsed.length) return null;
    if (!parsed.every((n) => typeof n === "number" && Number.isFinite(n))) return null;
    return parsed as number[];
  } catch {
    return null;
  }
};

/** Embed + persist a zine vector. No-op when Gateway embed is disabled. */
export const indexZineEmbedding = async (zine: ZineMetadata): Promise<boolean> => {
  if (!isSovereignGatewayEmbedEnabled()) return false;
  const db = await getSovereignDb();
  if (!db || !zine?.id) return false;

  const text = buildZineEmbeddingText(zine);
  if (!text.trim()) {
    await db
      .prepare(
        `UPDATE zines SET embedding = NULL, embedding_model = NULL, embedding_dims = NULL, embedding_updated_at = ? WHERE id = ?`,
      )
      .run(Date.now(), zine.id);
    return false;
  }

  try {
    const { embedGatewayText } = await import("../ai/generate.js");
    const result = await embedGatewayText({
      value: text,
      apiKey: resolveSovereignEmbedApiKey(),
    });
    if (!result.embedding?.length) return false;

    await db
      .prepare(
        `UPDATE zines
         SET embedding = ?, embedding_model = ?, embedding_dims = ?, embedding_updated_at = ?
         WHERE id = ?`,
      )
      .run(
        JSON.stringify(result.embedding),
        result.model || modelFor("embedding", "gateway"),
        result.dims || result.embedding.length,
        Date.now(),
        zine.id,
      );
    return true;
  } catch (error) {
    console.warn("MIMI // Sovereign Gateway embed failed:", error);
    return false;
  }
};

/** Fire-and-forget index after upsert (never blocks Floor writes). */
export const scheduleZineEmbedding = (zine: ZineMetadata): void => {
  if (!isSovereignGatewayEmbedEnabled()) return;
  void indexZineEmbedding(zine).catch(() => {
    // already logged
  });
};

export type SemanticHit = {
  id: string;
  data: string;
  timestamp: number;
  score: number;
};

/**
 * Rank public zines by AI Gateway query embedding (cosine).
 * Falls back to [] when Gateway is unavailable or nothing is indexed.
 */
export const searchPublicZinesSemantic = async (
  queryText: string,
  take: number,
): Promise<{ hits: SemanticHit[]; model: string | null; usedGateway: boolean }> => {
  if (!isSovereignGatewayEmbedEnabled()) {
    return { hits: [], model: null, usedGateway: false };
  }
  const q = queryText.trim();
  if (!q) return { hits: [], model: null, usedGateway: false };

  const db = await getSovereignDb();
  if (!db) return { hits: [], model: null, usedGateway: false };

  let queryEmbedding: number[];
  let model: string;
  try {
    const { embedGatewayText } = await import("../ai/generate.js");
    const result = await embedGatewayText({
      value: q.slice(0, 2000),
      apiKey: resolveSovereignEmbedApiKey(),
    });
    queryEmbedding = result.embedding;
    model = result.model;
  } catch (error) {
    console.warn("MIMI // Sovereign query embed failed:", error);
    return { hits: [], model: null, usedGateway: false };
  }

  if (!queryEmbedding?.length) {
    return { hits: [], model: null, usedGateway: false };
  }

  const rows = await db
    .prepare(
      `SELECT id, data, timestamp, embedding, embedding_dims FROM zines
       WHERE is_public = 1 AND embedding IS NOT NULL
       ORDER BY timestamp DESC
       LIMIT ?`,
    )
    .all<{
      id: string;
      data: string;
      timestamp: number | string;
      embedding: string;
      embedding_dims: number | string | null;
    }>(SEMANTIC_CANDIDATE_CAP);

  const scored: SemanticHit[] = [];
  for (const row of rows) {
    const dims = Number(row.embedding_dims || 0);
    if (dims && dims !== queryEmbedding.length) continue;
    const vector = parseEmbeddingJson(row.embedding);
    if (!vector || vector.length !== queryEmbedding.length) continue;
    const score = cosineSimilarity(queryEmbedding, vector);
    if (score < MIN_SEMANTIC_SCORE) continue;
    scored.push({
      id: row.id,
      data: row.data,
      timestamp: Number(row.timestamp || 0),
      score,
    });
  }

  scored.sort((a, b) => b.score - a.score || b.timestamp - a.timestamp);
  return {
    hits: scored.slice(0, Math.max(0, take)),
    model,
    usedGateway: true,
  };
};

/** Reindex zines missing embeddings (or all when force). Returns counts. */
export const reindexZineEmbeddings = async (opts?: {
  limit?: number;
  force?: boolean;
}): Promise<{ attempted: number; indexed: number; skipped: number }> => {
  if (!isSovereignGatewayEmbedEnabled()) {
    return { attempted: 0, indexed: 0, skipped: 0 };
  }
  const db = await getSovereignDb();
  if (!db) return { attempted: 0, indexed: 0, skipped: 0 };

  const take = Math.max(1, Math.min(opts?.limit || 50, 200));
  const rows = opts?.force
    ? await db
        .prepare(`SELECT id, data FROM zines ORDER BY updated_at DESC LIMIT ?`)
        .all<{ id: string; data: string }>(take)
    : await db
        .prepare(
          `SELECT id, data FROM zines
           WHERE embedding IS NULL
           ORDER BY updated_at DESC
           LIMIT ?`,
        )
        .all<{ id: string; data: string }>(take);

  let indexed = 0;
  let skipped = 0;
  for (const row of rows) {
    try {
      const zine = JSON.parse(row.data) as ZineMetadata;
      const ok = await indexZineEmbedding(zine);
      if (ok) indexed += 1;
      else skipped += 1;
    } catch {
      skipped += 1;
    }
  }
  return { attempted: rows.length, indexed, skipped };
};

export const countIndexedEmbeddings = async (): Promise<number> => {
  const db = await getSovereignDb();
  if (!db) return 0;
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM zines WHERE embedding IS NOT NULL`)
    .get<{ n: number | string }>();
  return Number(row?.n || 0);
};
