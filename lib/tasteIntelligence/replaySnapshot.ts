/**
 * Deterministic replay from a compiled baseline through immutable judgments and model edits.
 */
import type {
  TasteModelEdit,
  TasteRefusal,
} from "../../schemas/tasteIntelligenceContracts.js";
import type { TasteModelSnapshot } from "../tasteModel/contracts.js";
import { applyEditsToSnapshot } from "./applySnapshotEdits.js";
import { createUndoEdit } from "./modelEdits.js";

export const UNDO_EDIT_RATIONALE_PREFIX = "Undo edit ";

export function isUndoModelEdit(edit: TasteModelEdit): boolean {
  return edit.rationale?.startsWith(UNDO_EDIT_RATIONALE_PREFIX) ?? false;
}

export function sortEditsChronologically(edits: TasteModelEdit[]): TasteModelEdit[] {
  return [...edits].sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Replay immutable model edits and refusals onto a compiled baseline snapshot.
 * Order: chronological edits, then active refusals.
 */
export function replayTasteSnapshot(input: {
  baseline: TasteModelSnapshot;
  edits: TasteModelEdit[];
  refusals: TasteRefusal[];
}): TasteModelSnapshot {
  const orderedEdits = sortEditsChronologically(input.edits);
  return applyEditsToSnapshot(input.baseline, orderedEdits, input.refusals);
}

/** Derive the pre-edit compiled baseline by reversing model edits from a materialized snapshot. */
export function deriveEditBaseline(
  materialized: TasteModelSnapshot,
  edits: TasteModelEdit[],
): TasteModelSnapshot {
  let next = materialized;
  const ordered = sortEditsChronologically(edits);
  for (let i = ordered.length - 1; i >= 0; i--) {
    const inverse = createUndoEdit(ordered[i]!);
    next = applyEditsToSnapshot(next, [inverse]);
  }
  return next;
}

/** IDs of forward edits that have a matching undo event in the log. */
export function undoneEditIds(edits: TasteModelEdit[]): Set<string> {
  const undone = new Set<string>();
  for (const edit of edits) {
    if (!isUndoModelEdit(edit) || !edit.rationale) continue;
    const targetId = edit.rationale.slice(UNDO_EDIT_RATIONALE_PREFIX.length).trim();
    if (targetId) undone.add(targetId);
  }
  return undone;
}

/**
 * The single forward edit eligible for undo, if any.
 * Undo is limited to the most recent non-undone forward edit only.
 */
export function getUndoableForwardEdit(edits: TasteModelEdit[]): TasteModelEdit | null {
  const undone = undoneEditIds(edits);
  const forwards = sortEditsChronologically(edits).filter(
    (edit) => !isUndoModelEdit(edit) && !undone.has(edit.id),
  );
  return forwards[forwards.length - 1] ?? null;
}

export function assertUndoableEdit(
  edits: TasteModelEdit[],
  editId: string,
): TasteModelEdit | null {
  const undoable = getUndoableForwardEdit(edits);
  if (!undoable || undoable.id !== editId) return null;
  return undoable;
}
