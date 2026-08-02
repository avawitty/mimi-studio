/**
 * Collective intelligence contracts — Mean Median Mode / Observatory.
 * Distinct from Residue per-run MeanMedianModeResult.
 */

import { z } from "zod";

const nonEmpty = z.string().trim().min(1);

export const collectiveSignalCategorySchema = z.enum([
  "query",
  "topic",
  "motif",
  "mood",
  "tension",
  "reference",
  "material",
  "silhouette",
  "color",
  "technology",
  "social_condition",
  "assistance_type",
  "artifact_form",
  "expressive_mode",
]);

export const cyclePositionSchema = z.enum([
  "Latent",
  "Emergent",
  "Coalescing",
  "Saturated",
  "Fragmenting",
  "Residual",
  "Recurrent",
]);

export const confidenceLabelSchema = z.enum([
  "insufficient",
  "tentative",
  "moderate",
  "strong",
]);

export const centralTendencyUnitSchema = z.enum([
  "occurrences_per_day",
  "share_of_artifacts",
  "normalized_intensity",
]);

export const skewHintSchema = z.enum([
  "mean_above_median",
  "aligned",
  "median_above_mean",
]);

export const modalitySchema = z.enum([
  "unimodal",
  "bimodal",
  "multimodal",
  "insufficient",
]);

export const summationInterpretationSchema = z.enum([
  "spike_driven",
  "broadly_shared",
  "contested",
  "insufficient_evidence",
]);

export const centralTendencyProfileSchema = z.object({
  signalId: nonEmpty,
  windowStart: z.number().finite(),
  windowEnd: z.number().finite(),
  unit: centralTendencyUnitSchema,
  mean: z.number().finite(),
  median: z.number().finite(),
  mode: z.object({
    label: nonEmpty,
    count: z.number().int().nonnegative(),
    share: z.number().min(0).max(1),
  }),
  summation: z.object({
    combinedIndex: z.number().finite(),
    skewHint: skewHintSchema,
    modality: modalitySchema,
    interpretation: summationInterpretationSchema,
  }),
  sampleSize: z.number().int().nonnegative(),
  uniqueArtifactCount: z.number().int().nonnegative(),
  uniqueContributorBand: nonEmpty,
  methodologyVersion: nonEmpty,
});

export const collectiveSignalSchema = z.object({
  id: nonEmpty,
  canonicalLabel: nonEmpty,
  aliases: z.array(z.string()),
  category: collectiveSignalCategorySchema,
  sourceArtifactId: nonEmpty,
  sourceType: z.enum([
    "public_zine",
    "public_scry",
    "proscenium_transmission",
    "public_remix",
    "rss",
    "approved_external_source",
  ]),
  observedAt: z.number().finite(),
  extractedAt: z.number().finite(),
  extractionMethod: z.enum([
    "user_tagged",
    "rule_based",
    "model_proposed",
    "human_approved",
  ]),
  confidence: z.number().min(0).max(1).optional(),
  /** Never shown in public MMM readout. */
  contextExcerpt: z.string().optional(),
  /**
   * Opaque stable contributor key for banding (never a raw uid in UI).
   * Aggregation uses this so multiple artifacts from one creator count as one contributor.
   */
  opaqueContributorKey: nonEmpty.optional(),
  publicContributionAllowed: z.boolean(),
  anonymizationStatus: z.enum(["pending", "eligible", "excluded"]),
  sensitivityFlags: z.array(z.string()),
  provenance: z.object({
    sourceId: nonEmpty,
    sourceKind: nonEmpty,
    modelRunId: z.string().optional(),
    extractorVersion: nonEmpty,
  }),
});

export const contributionReceiptSchema = z.object({
  artifactId: nonEmpty,
  contributedSignalIds: z.array(nonEmpty),
  excludedSignals: z.array(nonEmpty),
  exclusionReasons: z.array(z.string()),
  aggregationWindows: z.array(nonEmpty),
  createdAt: z.number().finite(),
});

export const prosceniumPublishConsentSchema = z.object({
  artifactId: nonEmpty,
  stagedPublicly: z.literal(true),
  contributeToMeanMedianMode: z.boolean(),
  disclosedAt: z.number().finite(),
  disclosureVersion: nonEmpty,
});

export const methodologyRecordSchema = z.object({
  version: nonEmpty,
  windowStart: z.number().finite(),
  windowEnd: z.number().finite(),
  sampleSize: z.number().int().nonnegative(),
  uniqueArtifactCount: z.number().int().nonnegative(),
  limitations: z.array(z.string()),
  exclusions: z.array(z.string()),
  lastUpdated: z.number().finite(),
});

export const meanMedianModeReportSchema = z.object({
  runId: nonEmpty,
  status: z.enum(["success", "partial", "empty", "failed", "demonstration"]),
  windowStart: z.number().finite(),
  windowEnd: z.number().finite(),
  profiles: z.array(centralTendencyProfileSchema),
  presentAtmosphere: z.string(),
  seekingModes: z.array(
    z.object({
      label: nonEmpty,
      share: z.number().min(0).max(1),
      sampleSize: z.number().int().nonnegative(),
    }),
  ),
  cycleNotes: z.array(
    z.object({
      signalId: nonEmpty,
      position: cyclePositionSchema,
      evidence: z.array(z.string()),
    }),
  ),
  methodologyVersion: nonEmpty,
  limitations: z.array(z.string()),
  whatMayBeMissing: z.array(z.string()).min(1),
  lastUpdated: z.number().finite(),
  demonstration: z.boolean().optional(),
  methodology: methodologyRecordSchema.optional(),
});

export type CollectiveSignalCategory = z.infer<typeof collectiveSignalCategorySchema>;
export type CyclePosition = z.infer<typeof cyclePositionSchema>;
export type CentralTendencyProfile = z.infer<typeof centralTendencyProfileSchema>;
export type CollectiveSignal = z.infer<typeof collectiveSignalSchema>;
export type ContributionReceipt = z.infer<typeof contributionReceiptSchema>;
export type ProsceniumPublishConsent = z.infer<typeof prosceniumPublishConsentSchema>;
export type MethodologyRecord = z.infer<typeof methodologyRecordSchema>;
export type MeanMedianModeReport = z.infer<typeof meanMedianModeReportSchema>;

export function safeParseCentralTendencyProfile(data: unknown) {
  return centralTendencyProfileSchema.safeParse(data);
}

export function safeParseMeanMedianModeReport(data: unknown) {
  return meanMedianModeReportSchema.safeParse(data);
}

export function safeParseProsceniumPublishConsent(data: unknown) {
  return prosceniumPublishConsentSchema.safeParse(data);
}
