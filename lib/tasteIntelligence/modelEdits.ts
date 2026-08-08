/**
 * Immutable taste model edit events with inverse support for undo.
 */
import type {
  TasteModelEdit,
  TasteModelEditOperation,
} from "../../schemas/tasteIntelligenceContracts.js";
import type { TasteModelSnapshot } from "../tasteModel/contracts.js";
import { compileTasteModel } from "../tasteModel/compileTasteModel.js";
import type { CompileTasteModelInput } from "../tasteModel/contracts.js";

export interface ApplyEditInput {
  ownerId: string;
  projectId?: string;
  operation: TasteModelEditOperation;
  targetIds: string[];
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  rationale?: string;
  editId?: string;
}

export function createModelEdit(input: ApplyEditInput): TasteModelEdit {
  const now = Date.now();
  const inverse = buildInverseEdit(input.operation, input.before, input.after);
  return {
    id: input.editId ?? crypto.randomUUID(),
    ownerId: input.ownerId,
    projectId: input.projectId,
    operation: input.operation,
    targetIds: input.targetIds,
    before: input.before,
    after: input.after,
    rationale: input.rationale,
    inverseEdit: inverse,
    createdAt: now,
  };
}

function buildInverseEdit(
  operation: TasteModelEditOperation,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, unknown> {
  return {
    operation,
    before: after,
    after: before,
  };
}

export function createUndoEdit(original: TasteModelEdit): TasteModelEdit {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    ownerId: original.ownerId,
    projectId: original.projectId,
    operation: original.operation,
    targetIds: original.targetIds,
    before: original.after,
    after: original.before,
    rationale: `Undo edit ${original.id}`,
    inverseEdit: {
      operation: original.operation,
      before: original.before,
      after: original.after,
    },
    createdAt: now,
  };
}

/** Map compiled feature id to Tailor pattern cluster id when applicable. */
function clusterIdFromFeatureId(featureId: string): string | null {
  const prefix = "pattern_cluster:";
  return featureId.startsWith(prefix) ? featureId.slice(prefix.length) : null;
}

/** Apply edit deltas to compile input clusters/laws metadata before recompilation. */
export function applyEditsToCompileInput(
  input: CompileTasteModelInput,
  edits: TasteModelEdit[],
): CompileTasteModelInput {
  const clusters = input.clusters.map((c) => ({ ...c }));
  const laws = input.laws.map((l) => ({ ...l }));

  for (const edit of edits) {
    switch (edit.operation) {
      case "rename": {
        const featureId = edit.targetIds[0];
        const clusterId = featureId ? clusterIdFromFeatureId(featureId) ?? featureId : null;
        const cluster = clusterId ? clusters.find((c) => c.id === clusterId) : undefined;
        if (cluster && typeof edit.after.label === "string") {
          cluster.name = edit.after.label;
        }
        break;
      }
      case "set_weight": {
        const featureId = edit.targetIds[0];
        const clusterId = featureId ? clusterIdFromFeatureId(featureId) ?? featureId : null;
        const cluster = clusterId ? clusters.find((c) => c.id === clusterId) : undefined;
        if (cluster && typeof edit.after.userWeight === "string") {
          cluster.userWeight = edit.after.userWeight as typeof cluster.userWeight;
        }
        break;
      }
      case "set_polarity": {
        const lawId = edit.targetIds[0];
        const law = laws.find((l) => l.id === lawId);
        if (law && typeof edit.after.userStatus === "string") {
          law.userStatus = edit.after.userStatus as typeof law.userStatus;
        }
        break;
      }
      case "merge": {
        const [survivorFeatureId, absorbedFeatureId] = edit.targetIds;
        if (!survivorFeatureId || !absorbedFeatureId) break;
        const survivorClusterId = clusterIdFromFeatureId(survivorFeatureId);
        const absorbedClusterId = clusterIdFromFeatureId(absorbedFeatureId);
        if (!survivorClusterId || !absorbedClusterId) break;
        const survivor = clusters.find((c) => c.id === survivorClusterId);
        const absorbed = clusters.find((c) => c.id === absorbedClusterId);
        if (!survivor || !absorbed) break;
        if (typeof edit.after.label === "string") {
          survivor.name = edit.after.label;
        }
        survivor.observationIds = [
          ...new Set([...survivor.observationIds, ...absorbed.observationIds]),
        ];
        survivor.supportingEvidenceNodeIds = [
          ...new Set([
            ...survivor.supportingEvidenceNodeIds,
            ...absorbed.supportingEvidenceNodeIds,
          ]),
        ];
        const absorbedIndex = clusters.findIndex((c) => c.id === absorbedClusterId);
        if (absorbedIndex >= 0) clusters.splice(absorbedIndex, 1);
        break;
      }
      case "split": {
        const parentFeatureId = edit.targetIds[0];
        if (!parentFeatureId) break;
        const parentClusterId = clusterIdFromFeatureId(parentFeatureId);
        if (!parentClusterId) break;
        const parent = clusters.find((c) => c.id === parentClusterId);
        if (!parent) break;
        const newClusterId =
          typeof edit.after.newFeatureId === "string"
            ? clusterIdFromFeatureId(edit.after.newFeatureId) ??
              edit.after.newFeatureId.replace(/^pattern_cluster:/, "")
            : `${parentClusterId}:split:${edit.id.slice(0, 8)}`;
        const newLabel =
          typeof edit.after.label === "string"
            ? edit.after.label
            : `${parent.name} (variant)`;
        const ratio =
          typeof edit.after.splitRatio === "number"
            ? Math.max(0.1, Math.min(0.9, edit.after.splitRatio))
            : 0.5;
        const childObs = parent.observationIds.slice(
          0,
          Math.max(1, Math.floor(parent.observationIds.length * ratio)),
        );
        clusters.push({
          ...parent,
          id: newClusterId,
          name: newLabel,
          observationIds: childObs,
          supportingEvidenceNodeIds: [...parent.supportingEvidenceNodeIds],
          createdAt: edit.createdAt,
          updatedAt: edit.createdAt,
        });
        parent.observationIds = parent.observationIds.filter(
          (id) => !childObs.includes(id),
        );
        break;
      }
      case "connect":
      case "disconnect":
      case "set_alias":
      case "set_scope":
      case "set_signature":
      case "set_contextual":
      case "set_saturated":
      case "set_dormant":
      case "correct_provenance":
        break;
      default: {
        const _exhaustive: never = edit.operation;
        void _exhaustive;
      }
    }
  }

  return { ...input, clusters, laws };
}

export function recompileAfterEdits(
  input: CompileTasteModelInput,
  edits: TasteModelEdit[],
): TasteModelSnapshot {
  const patched = applyEditsToCompileInput(input, edits);
  return compileTasteModel(patched);
}
