/**
 * Optional AI Gateway structured-generation wrapper for Residue stages.
 * Prefer offline/deterministic builders when no key is available (CI / verify).
 */

import { z, type ZodType } from "zod";
import { generateGatewayObject } from "../../lib/ai/generate.js";
import type { GatewayTextRole } from "../../lib/ai/generate.js";

export interface ResidueLlmOptions {
  apiKey?: string;
  role?: GatewayTextRole;
  temperature?: number;
  /** When true, never call the gateway. */
  offline?: boolean;
}

export async function generateResidueObject<T>(options: {
  schema: ZodType<T>;
  prompt: string;
  system: string;
  llm?: ResidueLlmOptions;
  retries?: number;
}): Promise<{ object: T | null; model?: string; usedLlm: boolean; error?: string }> {
  const offline = options.llm?.offline || !options.llm?.apiKey;
  if (offline) {
    return { object: null, usedLlm: false };
  }

  const retries = options.retries ?? 1;
  let lastError: string | undefined;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const result = await generateGatewayObject({
        schema: options.schema,
        prompt: options.prompt,
        system: options.system,
        role: options.llm?.role ?? "textDeep",
        temperature: options.llm?.temperature ?? 0.3,
        apiKey: options.llm?.apiKey,
      });
      const parsed = options.schema.safeParse(result.object);
      if (!parsed.success) {
        lastError = parsed.error.message;
        continue;
      }
      return { object: parsed.data, model: result.model, usedLlm: true };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  return { object: null, usedLlm: true, error: lastError };
}

/** Intermediate structured outputs for Cultural stages (LLM). */
export const culturalNormalizeLlmSchema = z.object({
  normalizedQuery: z.string().min(1),
  keyTerms: z.array(z.string()),
  analysisAngles: z.array(z.string()),
  warnings: z.array(z.string()).default([]),
});

export const culturalEvidenceLlmSchema = z.object({
  evidence: z.array(
    z.object({
      sourceId: z.string().min(1),
      claimSupported: z.string().min(1),
      excerpt: z.string().optional(),
      evidenceStrength: z.enum(["strong", "moderate", "weak", "speculative"]),
      limitations: z.array(z.string()),
      relevanceScore: z.number().min(0).max(1),
    }),
  ),
});

export const culturalSynthesisLlmSchema = z.object({
  definition: z.string().min(1),
  origins: z.array(z.string()),
  lineage: z.array(
    z.object({
      label: z.string(),
      stage: z.enum([
        "prehistory",
        "emergence",
        "amplification",
        "commercialization",
        "fatigue",
        "counter-signal",
        "revival",
        "absorption",
      ]),
      startYear: z.number().optional(),
      endYear: z.number().optional(),
      description: z.string(),
      evidenceSourceIds: z.array(z.string()),
      confidence: z.number().min(0).max(1),
    }),
  ),
  culturalCodes: z.array(
    z.object({
      category: z.enum([
        "visual",
        "linguistic",
        "behavioral",
        "commercial",
        "infrastructural",
      ]),
      label: z.string(),
      description: z.string(),
      evidenceSourceIds: z.array(z.string()),
      confidence: z.number().min(0).max(1),
    }),
  ),
  descendants: z.array(z.string()),
  survivingMeanings: z.array(z.string()),
  lostMeanings: z.array(z.string()),
  computationallyIntroducedMeanings: z.array(z.string()),
  commercialAbsorption: z.array(z.string()),
  counterSignals: z.array(z.string()),
  associations: z.array(
    z.object({
      origin: z.string(),
      target: z.string(),
      relationship: z.enum([
        "resembles",
        "descends-from",
        "reacts-against",
        "commercializes",
        "absorbs",
        "translates-into",
        "co-occurs-with",
        "is-commonly-interpreted-as",
        "is-alternatively-interpreted-as",
        "may-lead-to",
        "is-distinct-from",
      ]),
      description: z.string(),
      evidenceSourceIds: z.array(z.string()),
      confidence: z.number().min(0).max(1),
      status: z.enum([
        "observed",
        "reported",
        "historical",
        "interpretive",
        "causal-hypothesis",
        "model-proposed",
      ]),
    }),
  ),
  evidenceGaps: z.array(z.string()),
});

export type CulturalNormalizeLlm = z.infer<typeof culturalNormalizeLlmSchema>;
export type CulturalEvidenceLlm = z.infer<typeof culturalEvidenceLlmSchema>;
export type CulturalSynthesisLlm = z.infer<typeof culturalSynthesisLlmSchema>;
