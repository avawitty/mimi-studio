import { z } from "zod";

export const signatureConfidenceBandSchema = z.enum([
  "well_supported",
  "emerging",
  "speculative",
]);

export type SignatureConfidenceBand = z.infer<typeof signatureConfidenceBandSchema>;

export const signatureEvidenceRefSchema = z.object({
  id: z.string(),
  title: z.string(),
  source: z.string().optional(),
});

export const signatureSemioticTouchpointSchema = z.object({
  motif: z.string(),
  context: z.string(),
  visualDirective: z.string(),
  rationale: z.string(),
  confidence: signatureConfidenceBandSchema.default("emerging"),
  evidenceRefIds: z.array(z.string()).optional(),
});

export const signatureCreativeDirectionSchema = z.object({
  title: z.string(),
  thesis: z.string(),
  constraints: z.array(z.string()).optional(),
  handoff: z
    .enum(["studio", "tailor", "the-edit", "darkroom", "scribe"])
    .optional(),
});

export const signatureRecommendationSchema = z.object({
  title: z.string(),
  hypothesis: z.string(),
  action: z.string(),
  handoff: z.string().optional(),
  evidenceRefIds: z.array(z.string()).optional(),
});

export const signatureDriftNoteSchema = z.object({
  aspect: z.string(),
  statedIntent: z.string().optional(),
  manifestedOutput: z.string().optional(),
  read: z.string(),
});

export const signatureReadingSchema = z.object({
  thesis: z.string(),
  supportingParagraphs: z.array(z.string()).optional(),
  confidence: signatureConfidenceBandSchema.default("emerging"),
  coverageNote: z.string().optional(),
});

export const influenceLineageItemSchema = z.object({
  artist: z.string(),
  movement: z.string(),
  connectionStrength: z.number(),
});

export const creativeCycleSchema = z.object({
  period: z.string(),
  mood: z.string(),
  motifSpikes: z.array(z.string()),
  outputCount: z.number(),
});

export const motifFrequencySchema = z.object({
  motif: z.string(),
  frequency: z.number(),
  date: z.number(),
});

export const aestheticSignatureSchema = z.object({
  primaryAxis: z.string(),
  secondaryAxis: z.string(),
  coreTrait: z.string().optional(),
  motifs: z.array(z.string()),
  core_keywords: z.array(z.string()).optional(),
  moodCluster: z.string(),
  influenceLineage: z.array(influenceLineageItemSchema),
  creativeCycles: z.array(creativeCycleSchema),
  motifEvolution: z.array(motifFrequencySchema),
  paletteExtraction: z.array(z.string()).optional(),
  tactileBias: z
    .object({
      dominant: z.string(),
      secondary: z.string(),
    })
    .optional(),
  typographicPairing: z
    .object({
      serif: z.string(),
      sans: z.string(),
    })
    .optional(),
  promptMatrix: z.array(z.string()).optional(),
  reading: signatureReadingSchema.optional(),
  antiSignature: z.array(z.string()).optional(),
  semioticTouchpoints: z.array(signatureSemioticTouchpointSchema).optional(),
  creativeDirections: z.array(signatureCreativeDirectionSchema).optional(),
  recommendations: z.array(signatureRecommendationSchema).optional(),
  driftNotes: z.array(signatureDriftNoteSchema).optional(),
  evidenceRefs: z.array(signatureEvidenceRefSchema).optional(),
  status: z.enum(["draft", "approved"]).optional(),
  approvedAt: z.number().optional(),
  version: z.number().optional(),
  generatedAt: z.number().optional(),
});

export type ParsedAestheticSignature = z.infer<typeof aestheticSignatureSchema>;

export function parseSignatureJson(text: string): ParsedAestheticSignature | null {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/```json\n?/, "").replace(/```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/```\n?/, "").replace(/```$/, "");
  }
  try {
    const raw = JSON.parse(cleaned);
    const parsed = aestheticSignatureSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
