/**
 * Pipeline stage bookkeeping helpers.
 */

import type { PipelinePartialState, PipelineStageError, PipelineStageId } from "./types";

export function createPartialState(): PipelinePartialState {
  return { completedStages: [], failedStages: [], warnings: [] };
}

export function markStageComplete(
  state: PipelinePartialState,
  stageId: PipelineStageId,
): void {
  if (!state.completedStages.includes(stageId)) {
    state.completedStages.push(stageId);
  }
}

export function markStageFailed(
  state: PipelinePartialState,
  error: PipelineStageError,
): void {
  state.failedStages.push(error);
  state.warnings.push(`${error.stageId}: ${error.message}`);
}
