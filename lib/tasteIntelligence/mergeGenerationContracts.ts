/**
 * Reconcile Taste Intelligence compiler output with Tailor Profile v2 generationContract.
 */
import type { TasteGenerationContract } from "../../schemas/tasteIntelligenceContracts.js";

export type TailorGenerationContractInput = {
  objective: string;
  preserve: string[];
  emphasize: string[];
  transform: Array<{ input: string; method: string; strength: number }>;
  avoid: string[];
  globalRefusals: string[];
  projectConstraints: string[];
};

export type GenerationContractReconciliation = {
  sources: Array<"taste_compiler" | "tailor_profile_v2">;
  tailorObjective?: string;
  mergedFieldCounts: {
    preserve: number;
    emphasize: number;
    avoid: number;
    transform: number;
    contextRules: number;
  };
};

function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export function mergeGenerationContracts(
  compiled: TasteGenerationContract,
  tailor?: TailorGenerationContractInput | null,
): { contract: TasteGenerationContract; reconciliation: GenerationContractReconciliation } {
  if (!tailor) {
    return {
      contract: compiled,
      reconciliation: {
        sources: ["taste_compiler"],
        mergedFieldCounts: {
          preserve: compiled.preserve.length,
          emphasize: compiled.emphasize.length,
          avoid: compiled.avoid.length,
          transform: compiled.transform.length,
          contextRules: compiled.contextRules.length,
        },
      },
    };
  }

  const tailorTransforms = tailor.transform.map(
    (rule) =>
      `${rule.input} → ${rule.method} (${Math.round(rule.strength * 100)}%)`,
  );

  const contract: TasteGenerationContract = {
    ...compiled,
    preserve: uniqueStrings([...tailor.preserve, ...compiled.preserve]),
    emphasize: uniqueStrings([...tailor.emphasize, ...compiled.emphasize]),
    avoid: uniqueStrings([
      ...tailor.avoid,
      ...tailor.globalRefusals,
      ...compiled.avoid,
    ]),
    transform: uniqueStrings([...tailorTransforms, ...compiled.transform]),
    contextRules: uniqueStrings([
      `Objective: ${tailor.objective}`,
      ...tailor.projectConstraints,
      ...compiled.contextRules,
    ]),
    confidence: Math.min(compiled.confidence, 0.95),
  };

  return {
    contract,
    reconciliation: {
      sources: ["taste_compiler", "tailor_profile_v2"],
      tailorObjective: tailor.objective,
      mergedFieldCounts: {
        preserve: contract.preserve.length,
        emphasize: contract.emphasize.length,
        avoid: contract.avoid.length,
        transform: contract.transform.length,
        contextRules: contract.contextRules.length,
      },
    },
  };
}
