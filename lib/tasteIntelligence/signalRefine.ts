/**
 * Map creator-facing signal refine options to canonical refusal types and model edits.
 */
import type {
  TasteModelEditOperation,
  TasteRefusal,
  TasteRefusalType,
} from "../../schemas/tasteIntelligenceContracts.js";
import { buildRefusalFromExplicit } from "./refusals.js";

export const SIGNAL_REFINE_OPTIONS = [
  "strong_fit",
  "not_for_me",
  "not_why_i_saved_it",
  "only_in_context",
  "not_when_combined",
  "overexposed",
  "formerly_liked",
  "signature",
  "reduce_importance",
] as const;

export type SignalRefineOption = (typeof SIGNAL_REFINE_OPTIONS)[number];

export const SIGNAL_REFINE_LABELS: Record<SignalRefineOption, string> = {
  strong_fit: "Strong fit",
  not_for_me: "Not for me",
  not_why_i_saved_it: "Not why I saved it",
  only_in_context: "Only in this context",
  not_when_combined: "Not when combined with…",
  overexposed: "Overexposed",
  formerly_liked: "Formerly liked",
  signature: "Signature",
  reduce_importance: "Reduce importance",
};

export function refusalTypeForRefineOption(
  option: SignalRefineOption,
): TasteRefusalType | null {
  switch (option) {
    case "not_for_me":
      return "always";
    case "not_why_i_saved_it":
      return "not_why_i_saved_it";
    case "only_in_context":
      return "wrong_context";
    case "not_when_combined":
      return "only_when_combined";
    case "overexposed":
      return "overexposed";
    case "formerly_liked":
      return "formerly_liked";
    case "strong_fit":
    case "signature":
    case "reduce_importance":
      return null;
    default: {
      const _exhaustive: never = option;
      return _exhaustive;
    }
  }
}

export function modelEditOperationForRefineOption(
  option: SignalRefineOption,
): TasteModelEditOperation | null {
  switch (option) {
    case "strong_fit":
      return "set_weight";
    case "signature":
      return "set_signature";
    case "reduce_importance":
      return "set_weight";
    default:
      return null;
  }
}

export interface BuildRefusalInput {
  ownerId: string;
  projectId?: string;
  featureIds: string[];
  option: SignalRefineOption;
  scope: "persistent" | "project" | "session";
  sourceIds: string[];
  secondaryFeatureId?: string;
}

export function buildRefusalForRefineOption(
  input: BuildRefusalInput,
): TasteRefusal | null {
  const refusalType = refusalTypeForRefineOption(input.option);
  if (!refusalType) return null;

  const featureIds =
    input.option === "not_when_combined" && input.secondaryFeatureId
      ? [...new Set([...input.featureIds, input.secondaryFeatureId])]
      : input.featureIds;

  const scope =
    input.option === "only_in_context" ? "project" : input.scope;

  return buildRefusalFromExplicit({
    ownerId: input.ownerId,
    projectId: input.option === "only_in_context" ? input.projectId : undefined,
    featureIds,
    refusalType,
    signedWeight:
      input.option === "formerly_liked"
        ? -0.35
        : input.option === "overexposed"
          ? -0.5
          : -1,
    confidence: 0.9,
    explicit: true,
    scope,
    sourceIds: input.sourceIds,
  });
}

export interface BuildModelEditInput {
  ownerId: string;
  projectId?: string;
  featureId: string;
  option: SignalRefineOption;
  before: Record<string, unknown>;
  rationale?: string;
}

export function buildModelEditForRefineOption(
  input: BuildModelEditInput,
): {
  operation: TasteModelEditOperation;
  targetIds: string[];
  before: Record<string, unknown>;
  after: Record<string, unknown>;
} | null {
  const operation = modelEditOperationForRefineOption(input.option);
  if (!operation) return null;

  switch (input.option) {
    case "strong_fit":
      return {
        operation,
        targetIds: [input.featureId],
        before: input.before,
        after: { ...input.before, userWeight: "high", signedWeight: 1 },
      };
    case "signature":
      return {
        operation: "set_signature",
        targetIds: [input.featureId],
        before: input.before,
        after: { ...input.before, userWeight: "signature", signedWeight: 1.2 },
      };
    case "reduce_importance":
      return {
        operation: "set_weight",
        targetIds: [input.featureId],
        before: input.before,
        after: { ...input.before, userWeight: "low", signedWeight: 0.25 },
      };
    default:
      return null;
  }
}
