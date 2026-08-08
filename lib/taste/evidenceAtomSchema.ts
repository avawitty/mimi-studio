/**
 * Zod schemas for EvidenceAtom ingestion and validation.
 * Used by both the API route and the client-side service.
 */
import { z } from "zod";

export const evidenceSourceTypeSchema = z.enum([
  "image",
  "book",
  "artwork",
  "website",
  "screenshot",
  "note",
  "quote",
  "fashion",
  "object",
  "music",
  "film",
  "architecture",
  "product",
  "moodboard",
]);

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

export const userCurationStatusSchema = z.enum([
  "suggested",
  "accepted",
  "rejected",
  "renamed",
  "merged",
  "split",
  "hidden",
]);

export const claimTypeSchema = z.enum([
  "observed",
  "inferred",
  "speculative",
  "user_confirmed",
  "user_rejected",
]);

export const assertionRelationSchema = z.enum([
  "LIKES",
  "DISLIKES",
  "PREFERS_OVER",
  "ASSOCIATES",
  "LIKES_ONLY_IN",
  "QUESTIONS",
]);

/** Input schema for creating a new EvidenceAtom via POST /api/mimi/evidence */
export const createEvidenceAtomSchema = z.object({
  /** The kind of evidence being submitted */
  kind: evidenceAtomKindSchema,
  /** Source type classification */
  sourceType: evidenceSourceTypeSchema,
  /** The raw original value — a URL, text body, or description — NEVER overwritten */
  originalSource: z.string().min(1).max(10_000),
  /** Optional asset URL (image CDN URL, screenshot URL, etc.) */
  assetUrl: z.string().url().optional(),
  /** Optional thumbnail URL */
  thumbnailUrl: z.string().url().optional(),
  /** Project context if evidence is captured within a specific project */
  projectId: z.string().optional(),
  /** Domain scope for contextual preference modeling */
  contextScope: z
    .enum([
      "global",
      "project",
      "brand",
      "fashion",
      "interface",
      "editorial",
      "experimental",
    ])
    .optional(),
  /** Structured source metadata (page title, author, platform, etc.) */
  sourceMetadata: z.record(z.string(), z.unknown()).optional(),
  /** Where in the app this atom was ingested from */
  ingestSource: z
    .enum(["tailor", "scribe", "pocket", "darkroom", "api", "direct"])
    .default("direct"),
  /** Whether this atom should influence taste modeling */
  tasteImpact: z.boolean().default(true),
  /** Initial stability classification — can be updated after user interaction */
  stabilityClass: stabilityClassSchema.default("temporary"),
});

export type CreateEvidenceAtomInput = z.infer<typeof createEvidenceAtomSchema>;

/** Input schema for applying a correction to a TasteAssertion */
export const applyAssertionCorrectionSchema = z.object({
  assertionId: z.string().min(1),
  correction: correctionStateSchema,
});

export type ApplyAssertionCorrectionInput = z.infer<
  typeof applyAssertionCorrectionSchema
>;

/** Input schema for creating a TasteAssertion */
export const createTasteAssertionSchema = z.object({
  conceptA: z.string().min(1).max(200),
  relation: assertionRelationSchema,
  conceptB: z.string().max(200).optional(),
  context: z.string().optional(),
  claimType: claimTypeSchema,
  confidence: z.number().min(0).max(1),
  evidenceAtomIds: z.array(z.string()).default([]),
  projectId: z.string().optional(),
});

export type CreateTasteAssertionInput = z.infer<
  typeof createTasteAssertionSchema
>;
