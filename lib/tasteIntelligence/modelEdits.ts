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
        const clusterId = edit.targetIds[0];
        const cluster = clusters.find((c) => c.id === clusterId);
        if (cluster && typeof edit.after.label === "string") {
          cluster.name = edit.after.label;
        }
        break;
      }
      case "set_weight": {
        const clusterId = edit.targetIds[0];
        const cluster = clusters.find((c) => c.id === clusterId);
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
      case "merge":
      case "split":
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
