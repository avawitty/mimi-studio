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

function dedupeInteractionRules(
  rules: TasteInteractionRule[],
): TasteInteractionRule[] {
  const seen = new Set<string>();
  const next: TasteInteractionRule[] = [];
  for (const rule of rules) {
    const pair = [...rule.featureIds].sort().join("|");
    if (rule.featureIds[0] === rule.featureIds[1] || seen.has(pair)) continue;
    seen.add(pair);
    next.push(rule);
  }
  return next;
}

function remapInteractionRules(
  rules: TasteInteractionRule[],
  fromId: string,
  toId: string,
): TasteInteractionRule[] {
  return dedupeInteractionRules(
    rules.map((rule) => ({
      ...rule,
      featureIds: rule.featureIds.map((id) =>
        id === fromId ? toId : id,
      ) as [string, string],
    })),
  );
}

function mergeFeatureWeights(
  survivor: TasteFeatureWeight,
  absorbed: TasteFeatureWeight,
  mergedLabel: string,
): TasteFeatureWeight {
  const totalMass = survivor.evidenceMass + absorbed.evidenceMass;
  const mergedWeight =
    totalMass > 0
      ? (survivor.signedWeight * survivor.evidenceMass +
          absorbed.signedWeight * absorbed.evidenceMass) /
        totalMass
      : (survivor.signedWeight + absorbed.signedWeight) / 2;

  return {
    ...survivor,
    label: mergedLabel,
    signedWeight: mergedWeight,
    confidence: Math.max(survivor.confidence, absorbed.confidence),
    evidenceMass: survivor.evidenceMass + absorbed.evidenceMass,
    explicitMass: survivor.explicitMass + absorbed.explicitMass,
    implicitMass: survivor.implicitMass + absorbed.implicitMass,
    sourceIds: [...new Set([...survivor.sourceIds, ...absorbed.sourceIds])],
    contextScopes: [
      ...new Set([...survivor.contextScopes, ...absorbed.contextScopes]),
    ],
    firstSeenAt: Math.min(
      survivor.firstSeenAt ?? Date.now(),
      absorbed.firstSeenAt ?? Date.now(),
    ),
    lastSeenAt: Math.max(
      survivor.lastSeenAt ?? 0,
      absorbed.lastSeenAt ?? 0,
    ),
  };
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
    case "set_signature":
      next.featureWeights = applyFeaturePatch(next.featureWeights, targetId, {
        signedWeight: 1.2,
      });
      break;
    case "set_contextual":
      next.featureWeights = applyFeaturePatch(next.featureWeights, targetId, {
        contextScopes: ["project"],
      });
      break;
    case "set_saturated":
      next.featureWeights = applyFeaturePatch(next.featureWeights, targetId, {
        signedWeight:
          (next.featureWeights.find((f) => f.featureId === targetId)
            ?.signedWeight ?? 0.6) * 0.5,
      });
      break;
    case "set_dormant":
      next.featureWeights = applyFeaturePatch(next.featureWeights, targetId, {
        signedWeight: 0.1,
        confidence: 0.2,
      });
      break;
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
      const pair = new Set(edit.targetIds);
      next.interactionRules = next.interactionRules.filter(
        (rule) =>
          !(
            pair.has(rule.featureIds[0]) && pair.has(rule.featureIds[1])
          ),
      );
      break;
    }
    case "merge": {
      const [survivorId, absorbedId] = edit.targetIds;
      if (!survivorId || !absorbedId) break;

      const undoSurvivor = edit.after.survivor as TasteFeatureWeight | undefined;
      const undoAbsorbed = edit.after.absorbed as TasteFeatureWeight | undefined;
      if (undoSurvivor && undoAbsorbed) {
        next.featureWeights = next.featureWeights
          .filter((f) => f.featureId !== survivorId && f.featureId !== absorbedId)
          .concat([undoSurvivor, undoAbsorbed]);
        next.interactionRules = dedupeInteractionRules(next.interactionRules);
        break;
      }

      const survivor = next.featureWeights.find(
        (f) => f.featureId === survivorId,
      );
      const absorbed = next.featureWeights.find(
        (f) => f.featureId === absorbedId,
      );
      if (!survivor || !absorbed) break;

      const mergedLabel =
        typeof edit.after.label === "string"
          ? edit.after.label
          : `${survivor.label} + ${absorbed.label}`;
      const merged = mergeFeatureWeights(survivor, absorbed, mergedLabel);

      next.featureWeights = next.featureWeights
        .filter((f) => f.featureId !== absorbedId)
        .map((f) => (f.featureId === survivorId ? merged : f));
      next.interactionRules = remapInteractionRules(
        next.interactionRules,
        absorbedId,
        survivorId,
      );
      break;
    }
    case "split": {
      const parentId = edit.targetIds[0];
      if (!parentId) break;

      const undoParent = edit.after.parent as TasteFeatureWeight | undefined;
      const childId =
        typeof edit.before.newFeatureId === "string"
          ? edit.before.newFeatureId
          : undefined;
      if (undoParent && childId) {
        next.featureWeights = next.featureWeights
          .filter((f) => f.featureId !== childId)
          .map((f) => (f.featureId === parentId ? undoParent : f));
        next.interactionRules = next.interactionRules.filter(
          (rule) => !rule.featureIds.includes(childId),
        );
        break;
      }

      const parent = next.featureWeights.find((f) => f.featureId === parentId);
      if (!parent) break;

      const newFeatureId =
        typeof edit.after.newFeatureId === "string"
          ? edit.after.newFeatureId
          : `${parentId}:split:${edit.id.slice(0, 8)}`;
      const newLabel =
        typeof edit.after.label === "string"
          ? edit.after.label
          : `${parent.label} (variant)`;
      const ratio =
        typeof edit.after.splitRatio === "number"
          ? Math.max(0.1, Math.min(0.9, edit.after.splitRatio))
          : 0.5;

      const child: TasteFeatureWeight = {
        ...parent,
        featureId: newFeatureId,
        label: newLabel,
        signedWeight: parent.signedWeight * ratio,
        evidenceMass: parent.evidenceMass * ratio,
        explicitMass: parent.explicitMass * ratio,
        implicitMass: parent.implicitMass * ratio,
        sourceIds: [...parent.sourceIds],
      };
      const updatedParent: TasteFeatureWeight = {
        ...parent,
        signedWeight: parent.signedWeight * (1 - ratio),
        evidenceMass: parent.evidenceMass * (1 - ratio),
        explicitMass: parent.explicitMass * (1 - ratio),
        implicitMass: parent.implicitMass * (1 - ratio),
      };

      next.featureWeights = next.featureWeights
        .map((f) => (f.featureId === parentId ? updatedParent : f))
        .concat(child);
      break;
    }
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
