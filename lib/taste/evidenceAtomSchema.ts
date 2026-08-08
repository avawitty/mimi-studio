import { z } from "zod";

export const evidenceAtomKindSchema = z.enum([
  "image",
  "url",
  "text",
  "note",
  "screenshot",
  "film",
  "product",
  "brand",
  "generated",
  "rejection",
]);

export const stabilityClassSchema = z.enum([
  "stable",
  "recurring",
  "fascination",
  "project",
  "temporary",
  "declared",
]);

export const correctionStateSchema = z.enum([
  "YES",
  "SORT_OF",
  "NOT_ANYMORE",
  "ONLY_HERE",
  "NOT_ME",
  "MORE_LIKE_THIS",
]);

export const createEvidenceAtomSchema = z.object({
  projectId: z.string().trim().min(1).optional(),
  contextId: z.string().trim().min(1).optional(),
  kind: evidenceAtomKindSchema,
  sourceType: z.string().trim().min(1),
  originalSource: z.string().trim().min(1).max(100_000),
  title: z.string().trim().max(500).optional(),
  assetUrl: z.string().trim().max(20_000).optional(),
  thumbnailUrl: z.string().trim().max(20_000).optional(),
  sourceMetadata: z.record(z.string(), z.unknown()).default({}),
  extractedText: z.string().max(200_000).optional(),
  semanticDescription: z.string().max(20_000).optional(),
  embeddingRef: z.string().trim().max(2_000).optional(),
  confidence: z.number().min(0).max(1).default(0.5),
  stabilityClass: stabilityClassSchema.default("temporary"),
  processingState: z.enum(["pending", "processing", "analyzed", "failed"]).default("pending"),
});

export const evidenceCorrectionSchema = z.object({
  correction: correctionStateSchema,
  assertionId: z.string().trim().min(1).optional(),
});

export type CreateEvidenceAtomInput = z.input<typeof createEvidenceAtomSchema>;
export type ParsedEvidenceAtomInput = z.output<typeof createEvidenceAtomSchema>;
