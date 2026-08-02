import { z } from 'zod';
import { MARKETING_ASSET_TYPES } from './tailorReadiness';

export const tailorIntentSchema = z.enum([
  'creative_practice',
  'brand',
  'illustrations',
  'writing',
  'product',
  'wardrobe',
  'internet_presence',
  'campaign',
  'room',
  'world',
]);

export const evidenceSourceTypeSchema = z.enum([
  'image',
  'book',
  'artwork',
  'website',
  'screenshot',
  'note',
  'quote',
  'fashion',
  'object',
  'music',
  'film',
  'architecture',
  'product',
  'moodboard',
]);

export const userCurationStatusSchema = z.enum([
  'suggested',
  'accepted',
  'rejected',
  'renamed',
  'merged',
  'split',
  'hidden',
]);

export const marketingAssetTypeSchema = z.enum(MARKETING_ASSET_TYPES);

export const createProjectBodySchema = z.object({
  intent: z.string().min(1),
  title: z.string().optional(),
});

export const addEvidenceBodySchema = z.object({
  sourceType: evidenceSourceTypeSchema.optional(),
  title: z.string().optional(),
  uploadedFileUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  userCaption: z.string().optional(),
});

export const patternPatchBodySchema = z
  .object({
    userStatus: userCurationStatusSchema.optional(),
    userAnnotation: z.string().optional(),
    userWeight: z.enum(['low', 'medium', 'high', 'signature']).optional(),
    name: z.string().optional(),
    claimType: z
      .enum(['observed', 'inferred', 'speculative', 'user_confirmed', 'user_rejected'])
      .optional(),
  })
  .strict();

export const createMarketingJobBodySchema = z.object({
  assetType: marketingAssetTypeSchema,
  dollId: z.string().optional(),
  tasteGraphId: z.string().min(1),
});

export const artHistoryBodySchema = z.object({
  searchQueries: z.array(z.string()).optional(),
  patternClusterIds: z.array(z.string()).optional(),
  creativeLawIds: z.array(z.string()).optional(),
  tasteGraphId: z.string().optional(),
});

export function parseBody<T>(
  schema: z.ZodType<T>,
  body: unknown,
): { ok: true; data: T } | { ok: false; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path?.length ? issue.path.join('.') : 'body';
    return { ok: false, error: `${path}: ${issue?.message ?? 'invalid'}` };
  }
  return { ok: true, data: result.data };
}
