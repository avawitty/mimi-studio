/**
 * Apply model edits directly to a compiled snapshot (presentation + scoring layer).
 */
import type {
  TasteModelEdit,
  TasteRefusal,
} from "../../schemas/tasteIntelligenceContracts.js";
import type {
  TasteFeatureWeight,
  TasteInteractionRule,
  TasteModelSnapshot,
} from "../tasteModel/contracts.js";

const USER_WEIGHT_TO_SIGNED: Record<string, number> = {
  low: 0.25,
  medium: 0.6,
  high: 1,
  signature: 1.2,
};

function cloneSnapshot(snapshot: TasteModelSnapshot): TasteModelSnapshot {
  return {
    ...snapshot,
    featureWeights: snapshot.featureWeights.map((f) => ({ ...f })),
    interactionRules: snapshot.interactionRules.map((r) => ({ ...r })),
    trajectory: { ...snapshot.trajectory },
    diagnostics: { ...snapshot.diagnostics },
    sourceWindow: { ...snapshot.sourceWindow },
  };
}

function applyFeaturePatch(
  features: TasteFeatureWeight[],
  featureId: string,
  patch: Partial<TasteFeatureWeight>,
): TasteFeatureWeight[] {
  return features.map((f) =>
    f.featureId === featureId ? { ...f, ...patch } : f,
  );
}

function applyEditToSnapshot(
  snapshot: TasteModelSnapshot,
  edit: TasteModelEdit,
): TasteModelSnapshot {
  const next = cloneSnapshot(snapshot);
  const targetId = edit.targetIds[0];
  if (!targetId) return next;

  switch (edit.operation) {
    case "rename": {
      const label = edit.after.label;
      if (typeof label === "string") {
        next.featureWeights = applyFeaturePatch(next.featureWeights, targetId, {
          label,
        });
      }
      break;
    }
    case "set_alias": {
      const alias = edit.after.alias;
      if (typeof alias === "string") {
        next.featureWeights = applyFeaturePatch(next.featureWeights, targetId, {
          label: alias,
        });
      }
      break;
    }
    case "set_weight": {
      const userWeight = edit.after.userWeight;
      const signedWeight =
        typeof edit.after.signedWeight === "number"
          ? edit.after.signedWeight
          : typeof userWeight === "string"
            ? USER_WEIGHT_TO_SIGNED[userWeight] ?? 0.6
            : undefined;
      if (signedWeight !== undefined) {
        next.featureWeights = applyFeaturePatch(next.featureWeights, targetId, {
          signedWeight,
        });
      }
      break;
    }
    case "set_polarity": {
      const fw = next.featureWeights.find((f) => f.featureId === targetId);
      if (fw) {
        next.featureWeights = applyFeaturePatch(next.featureWeights, targetId, {
          signedWeight: -fw.signedWeight,
        });
      }
      break;
    }
    case "set_scope": {
      const scope = edit.after.scope;
      if (typeof scope === "string") {
        next.featureWeights = applyFeaturePatch(next.featureWeights, targetId, {
          contextScopes: [scope],
        });
      }
      break;
    }
    case "set_signature": {
      const patch: Partial<TasteFeatureWeight> = {};
      if (typeof edit.after.signedWeight === "number") {
        patch.signedWeight = edit.after.signedWeight;
      } else {
        patch.signedWeight = 1.2;
      }
      next.featureWeights = applyFeaturePatch(next.featureWeights, targetId, patch);
      break;
    }
    case "set_contextual": {
      const scopes = edit.after.contextScopes;
      next.featureWeights = applyFeaturePatch(next.featureWeights, targetId, {
        contextScopes: Array.isArray(scopes)
          ? scopes.filter((s): s is string => typeof s === "string")
          : ["project"],
      });
      break;
    }
    case "set_saturated": {
      const patch: Partial<TasteFeatureWeight> = {};
      if (typeof edit.after.signedWeight === "number") {
        patch.signedWeight = edit.after.signedWeight;
      } else {
        patch.signedWeight =
          (next.featureWeights.find((f) => f.featureId === targetId)
            ?.signedWeight ?? 0.6) * 0.5;
      }
      next.featureWeights = applyFeaturePatch(next.featureWeights, targetId, patch);
      break;
    }
    case "set_dormant": {
      const patch: Partial<TasteFeatureWeight> = {};
      if (typeof edit.after.signedWeight === "number") {
        patch.signedWeight = edit.after.signedWeight;
      } else {
        patch.signedWeight = 0.1;
      }
      if (typeof edit.after.confidence === "number") {
        patch.confidence = edit.after.confidence;
      } else if (patch.signedWeight === 0.1) {
        patch.confidence = 0.2;
      }
      next.featureWeights = applyFeaturePatch(next.featureWeights, targetId, patch);
      break;
    }
    case "correct_provenance": {
      const sourceIds = edit.after.sourceIds;
      if (Array.isArray(sourceIds)) {
        next.featureWeights = applyFeaturePatch(next.featureWeights, targetId, {
          sourceIds: sourceIds.filter((id): id is string => typeof id === "string"),
        });
      }
      break;
    }
    case "connect": {
      const [a, b] = edit.targetIds;
      if (!a || !b) break;
      const pair = new Set(edit.targetIds);
      const shouldRemove =
        edit.after.connected === false ||
        (typeof edit.after.relation !== "string" &&
          typeof edit.after.signedWeight !== "number");
      if (shouldRemove) {
        next.interactionRules = next.interactionRules.filter(
          (rule) =>
            !(pair.has(rule.featureIds[0]) && pair.has(rule.featureIds[1])),
        );
        break;
      }
      const relation =
        typeof edit.after.relation === "string"
          ? (edit.after.relation as TasteInteractionRule["relation"])
          : "reinforces";
      const rule: TasteInteractionRule = {
        id: edit.id,
        featureIds: [a, b],
        relation,
        signedWeight:
          typeof edit.after.signedWeight === "number"
            ? edit.after.signedWeight
            : 0.6,
        supportCount: 1,
        confidence: 0.8,
        contextScopes: ["persistent"],
        sourceIds: [edit.id],
      };
      next.interactionRules = [...next.interactionRules, rule];
      break;
    }
    case "disconnect": {
      const [a, b] = edit.targetIds;
      if (!a || !b) break;
      if (edit.after.connected === true) {
        const relation =
          typeof edit.before.relation === "string"
            ? (edit.before.relation as TasteInteractionRule["relation"])
            : "reinforces";
        const rule: TasteInteractionRule = {
          id: edit.id,
          featureIds: [a, b],
          relation,
          signedWeight:
            typeof edit.before.signedWeight === "number"
              ? edit.before.signedWeight
              : 0.6,
          supportCount: 1,
          confidence: 0.8,
          contextScopes: ["persistent"],
          sourceIds: [edit.id],
        };
        next.interactionRules = [...next.interactionRules, rule];
        break;
      }
      const pair = new Set(edit.targetIds);
      next.interactionRules = next.interactionRules.filter(
        (rule) =>
          !(pair.has(rule.featureIds[0]) && pair.has(rule.featureIds[1])),
      );
      break;
    }
    case "merge":
    case "split":
      break;
    default: {
      const _exhaustive: never = edit.operation;
      void _exhaustive;
    }
  }

  return next;
}

export function applyRefusalToFeatureWeights(
  snapshot: TasteModelSnapshot,
  refusal: TasteRefusal,
): TasteModelSnapshot {
  if (refusal.refusalType === "only_when_combined") {
    return snapshot;
  }

  const next = cloneSnapshot(snapshot);
  for (const featureId of refusal.featureIds) {
    const fw = next.featureWeights.find((f) => f.featureId === featureId);
    if (!fw) continue;

    const patch: Partial<TasteFeatureWeight> = {};
    switch (refusal.refusalType) {
      case "always":
      case "not_why_i_saved_it":
        patch.signedWeight = Math.min(fw.signedWeight, -0.4);
        patch.confidence = Math.max(fw.confidence, refusal.confidence);
        break;
      case "overexposed":
        patch.signedWeight = fw.signedWeight * 0.5;
        break;
      case "formerly_liked":
        patch.signedWeight = Math.min(fw.signedWeight, 0.15);
        break;
      case "wrong_context":
        patch.contextScopes = ["project"];
        break;
      default:
        break;
    }
    next.featureWeights = applyFeaturePatch(
      next.featureWeights,
      featureId,
      patch,
    );
  }
  return next;
}

export function applyEditsToSnapshot(
  snapshot: TasteModelSnapshot,
  edits: TasteModelEdit[],
  refusals: TasteRefusal[] = [],
): TasteModelSnapshot {
  let next = snapshot;
  for (const edit of edits) {
    next = applyEditToSnapshot(next, edit);
  }
  for (const refusal of refusals) {
    next = applyRefusalToFeatureWeights(next, refusal);
  }
  next = {
    ...next,
    compiledAt: Date.now(),
    stale: false,
  };
  return next;
}
