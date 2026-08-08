/**
 * Curiosity records — questions asked in Mesopic Lens and Scry.
 * Persisted for pattern reports; never conflated with approved Taste Graph memory.
 */
import { z } from "zod";
import type { CuriosityPromptId } from "../services/tailorEvidenceIntake";

export const curiositySourceSchema = z.enum(["mesopic-lens", "scry"]);

export const curiosityRecordSchema = z.object({
  id: z.string().min(1),
  userId: z.string().optional(),
  source: curiositySourceSchema,
  question: z.string().min(1),
  curiosityIds: z.array(z.string()).optional(),
  customCuriosity: z.string().optional(),
  readingPreview: z.string().optional(),
  webCitationCount: z.number().int().nonnegative().default(0),
  celestialEnabled: z.boolean().default(false),
  themes: z.array(z.string()).default([]),
  createdAt: z.number().finite(),
});

export const curiosityThemeCountSchema = z.object({
  theme: z.string().min(1),
  count: z.number().int().positive(),
  sampleQuestions: z.array(z.string()).min(1),
});

export const curiosityPatternReportSchema = z.object({
  generatedAt: z.number().finite(),
  windowDays: z.number().int().positive(),
  totalQuestions: z.number().int().nonnegative(),
  sourceBreakdown: z.record(curiositySourceSchema, z.number().int().nonnegative()),
  curiosityChipFrequency: z.record(z.string(), z.number().int().nonnegative()),
  recurringThemes: z.array(curiosityThemeCountSchema),
  narrativeSummary: z.string(),
  demonstration: z.boolean().optional(),
});

export type CuriositySource = z.infer<typeof curiositySourceSchema>;
export type CuriosityRecord = z.infer<typeof curiosityRecordSchema>;
export type CuriosityThemeCount = z.infer<typeof curiosityThemeCountSchema>;
export type CuriosityPatternReport = z.infer<typeof curiosityPatternReportSchema>;

export function createCuriosityRecordId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `curiosity-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function buildCuriosityRecord(input: {
  source: CuriositySource;
  question: string;
  userId?: string;
  curiosityIds?: CuriosityPromptId[];
  customCuriosity?: string;
  readingPreview?: string;
  webCitationCount?: number;
  celestialEnabled?: boolean;
  themes?: string[];
}): CuriosityRecord {
  return curiosityRecordSchema.parse({
    id: createCuriosityRecordId(),
    userId: input.userId,
    source: input.source,
    question: input.question.trim(),
    curiosityIds: input.curiosityIds,
    customCuriosity: input.customCuriosity?.trim() || undefined,
    readingPreview: input.readingPreview?.slice(0, 400),
    webCitationCount: input.webCitationCount ?? 0,
    celestialEnabled: input.celestialEnabled ?? false,
    themes: input.themes ?? [],
    createdAt: Date.now(),
  });
}

export function safeParseCuriosityRecord(data: unknown) {
  return curiosityRecordSchema.safeParse(data);
}

export function safeParseCuriosityPatternReport(data: unknown) {
  return curiosityPatternReportSchema.safeParse(data);
}
