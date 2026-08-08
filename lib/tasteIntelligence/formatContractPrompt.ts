import type { TasteGenerationContract } from "../../schemas/tasteIntelligenceContracts.js";
import type { GenerationContractReconciliation } from "./mergeGenerationContracts.js";

export function formatGenerationContractPrompt(
  contract: TasteGenerationContract,
  reconciliation?: GenerationContractReconciliation,
): string {
  const lines = [
    "[TASTE GENERATION CONTRACT — compiled + reconciled]",
    `Mode: ${contract.mode} · Medium: ${contract.medium} · Confidence: ${Math.round(contract.confidence * 100)}%`,
  ];

  if (reconciliation?.sources.includes("tailor_profile_v2")) {
    lines.push("Reconciled with Tailor Profile v2 generationContract.");
  }

  if (contract.preserve.length > 0) {
    lines.push(`Preserve: ${contract.preserve.join("; ")}`);
  }
  if (contract.emphasize.length > 0) {
    lines.push(`Emphasize: ${contract.emphasize.join("; ")}`);
  }
  if (contract.permit.length > 0) {
    lines.push(`Permit variation: ${contract.permit.join("; ")}`);
  }
  if (contract.transform.length > 0) {
    lines.push(`Transform: ${contract.transform.join("; ")}`);
  }
  if (contract.avoid.length > 0) {
    lines.push(`Avoid: ${contract.avoid.join("; ")}`);
  }
  if (contract.interactionRules.length > 0) {
    lines.push(`Interactions: ${contract.interactionRules.join("; ")}`);
  }
  if (contract.contextRules.length > 0) {
    lines.push(`Context: ${contract.contextRules.join("; ")}`);
  }

  lines.push(
    `Novelty envelope: ${contract.noveltyEnvelope.minimum.toFixed(2)}–${contract.noveltyEnvelope.maximum.toFixed(2)} (target ${contract.noveltyEnvelope.target.toFixed(2)})`,
  );

  return lines.join("\n");
}
