/**
 * Shared embedding space identity and compatibility audits.
 * Architecture Update 21 — one contract across Scry, Taste, Shadow Memory, Sovereign search.
 */

import { z } from "zod";

export const EMBEDDING_CONTRACT_SCHEMA_VERSION = 1 as const;

export const embeddingSpaceIdSchema = z.object({
  provider: z.literal("ai-gateway"),
  /** Executed model id (not merely requested). */
  model: z.string().trim().min(1),
  dims: z.number().int().positive(),
  schemaVersion: z.literal(EMBEDDING_CONTRACT_SCHEMA_VERSION),
});

export const indexedEmbeddingSchema = embeddingSpaceIdSchema.extend({
  vector: z.array(z.number().finite()).optional(),
  updatedAt: z.number().finite().optional(),
  textFingerprint: z.string().optional(),
});

export const embeddingCompatAuditSchema = z.object({
  reference: embeddingSpaceIdSchema.nullable(),
  total: z.number().int().nonnegative(),
  searchable: z.number().int().nonnegative(),
  incompatible: z.number().int().nonnegative(),
  missing: z.number().int().nonnegative(),
  reindexable: z.number().int().nonnegative(),
  needsReindex: z.boolean(),
});

export type EmbeddingSpaceId = z.infer<typeof embeddingSpaceIdSchema>;
export type IndexedEmbedding = z.infer<typeof indexedEmbeddingSchema>;
export type EmbeddingCompatAudit = z.infer<typeof embeddingCompatAuditSchema>;

/** Cosine / cluster only when both sides share model + dims. */
export function embeddingSpacesCompatible(
  a: Pick<EmbeddingSpaceId, "model" | "dims"> | null | undefined,
  b: Pick<EmbeddingSpaceId, "model" | "dims"> | null | undefined,
): boolean {
  if (!a || !b) return false;
  if (!a.model || !b.model) return false;
  if (!a.dims || !b.dims) return false;
  return a.model === b.model && a.dims === b.dims;
}

export function embeddingSpaceId(input: {
  model: string;
  dims: number;
  provider?: "ai-gateway";
}): EmbeddingSpaceId {
  return embeddingSpaceIdSchema.parse({
    provider: input.provider ?? "ai-gateway",
    model: input.model.trim(),
    dims: input.dims,
    schemaVersion: EMBEDDING_CONTRACT_SCHEMA_VERSION,
  });
}

/** Map Shadow Memory audit shape into the shared contract. */
export function toEmbeddingCompatAudit(input: {
  referenceModel?: string | null;
  referenceDims?: number | null;
  total: number;
  searchable: number;
  incompatible: number;
  missingVector: number;
  reindexable: number;
  needsReindex: boolean;
}): EmbeddingCompatAudit {
  const model = String(input.referenceModel || "").trim();
  const dims = input.referenceDims && input.referenceDims > 0 ? input.referenceDims : null;
  const reference =
    model && dims
      ? embeddingSpaceId({ model, dims })
      : null;

  return embeddingCompatAuditSchema.parse({
    reference,
    total: input.total,
    searchable: input.searchable,
    incompatible: input.incompatible,
    missing: input.missingVector,
    reindexable: input.reindexable,
    needsReindex: input.needsReindex,
  });
}
