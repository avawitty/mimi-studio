import type {
  CalibrationSelectionReason,
  TasteCalibrationPair,
  TasteCalibrationSession,
  TastePairwiseJudgment,
} from "../../../lib/tasteCalibration/contracts.js";
import type { TasteModelSnapshot } from "../../../lib/tasteModel/contracts.js";
import type { TasteCalibrationSessionRecord } from "../../../domain/tasteCalibration/types.js";
import type {
  tasteCalibrationPairs,
  tasteCalibrationSessions,
  tastePairwiseJudgments,
} from "./schema.js";

type SessionRow = typeof tasteCalibrationSessions.$inferSelect;
type PairRow = typeof tasteCalibrationPairs.$inferSelect;
type JudgmentRow = typeof tastePairwiseJudgments.$inferSelect;

function toMillis(value: Date | null | undefined): number | undefined {
  return value ? value.getTime() : undefined;
}

export function mapSessionRow(row: SessionRow): TasteCalibrationSessionRecord {
  const session: TasteCalibrationSession = {
    id: row.id,
    ownerId: row.ownerId,
    workspaceId: row.workspaceId ?? undefined,
    projectId: row.projectId ?? undefined,
    status: row.status,
    targetQuestionCount: row.targetQuestionCount,
    answeredCount: row.answeredCount,
    seed: row.seed,
    algorithmVersion: row.algorithmVersion,
    baselineSnapshotId: row.baselineSnapshotId ?? undefined,
    currentSnapshotId: row.currentSnapshotId ?? undefined,
    scope: row.scope,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    completedAt: toMillis(row.completedAt),
  };

  return {
    ...session,
    currentModelState: (row.currentModelState as unknown as TasteModelSnapshot | null) ?? null,
  };
}

export function mapPairRow(row: PairRow): TasteCalibrationPair {
  return {
    id: row.id,
    sessionId: row.sessionId,
    pairIndex: row.pairIndex,
    leftCandidateId: row.leftCandidateId,
    rightCandidateId: row.rightCandidateId,
    isolatedFeatureIds: row.isolatedFeatureIds,
    selectionReason: row.selectionReason as CalibrationSelectionReason,
    predictedLeftPreference: Number(row.predictedLeftPreference),
    expectedInformationGain: Number(row.expectedInformationGain),
    askedAt: row.askedAt.getTime(),
    answeredAt: toMillis(row.answeredAt),
  };
}

export function mapJudgmentRow(row: JudgmentRow): TastePairwiseJudgment {
  return {
    id: row.id,
    sessionId: row.sessionId,
    pairId: row.pairId,
    choice: row.choice,
    decidingFeatureIds: row.decidingFeatureIds,
    correctionNote: row.correctionNote ?? undefined,
    scope: row.scope,
    projectId: row.projectId ?? undefined,
    answeredAt: row.answeredAt.getTime(),
  };
}
