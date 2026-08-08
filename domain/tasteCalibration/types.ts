import type {
  CalibrationChoice,
  CalibrationSelectionReason,
  CalibrationSessionStatus,
  TasteCalibrationPair,
  TasteCalibrationSession,
  TasteModelDelta,
  TastePairwiseJudgment,
} from '../../lib/tasteCalibration/contracts';
import type { TasteModelSnapshot } from '../../lib/tasteModel/contracts';

export type {
  CalibrationChoice,
  CalibrationSelectionReason,
  CalibrationSessionStatus,
  TasteCalibrationPair,
  TasteCalibrationSession,
  TasteModelDelta,
  TastePairwiseJudgment,
};

export interface CreateCalibrationSessionInput {
  id: string;
  ownerId: string;
  workspaceId?: string;
  projectId?: string;
  targetQuestionCount: number;
  seed: string;
  algorithmVersion: string;
  baselineSnapshotId?: string;
  scope: 'persistent' | 'project' | 'session';
}

export interface CreateCalibrationPairInput {
  id: string;
  sessionId: string;
  pairIndex: number;
  leftCandidateId: string;
  rightCandidateId: string;
  isolatedFeatureIds: string[];
  selectionReason: CalibrationSelectionReason;
  predictedLeftPreference: number;
  expectedInformationGain: number;
  askedAt: number;
}

export interface CreatePairwiseJudgmentInput {
  id: string;
  sessionId: string;
  pairId: string;
  ownerId: string;
  choice: CalibrationChoice;
  decidingFeatureIds: string[];
  correctionNote?: string;
  scope: 'persistent' | 'project' | 'session';
  projectId?: string;
  answeredAt: number;
}

export interface UpdateSessionSnapshotInput {
  sessionId: string;
  ownerId: string;
  currentSnapshotId: string;
  currentModelState: TasteModelSnapshot;
  answeredCount: number;
  status?: CalibrationSessionStatus;
  completedAt?: number;
}

export interface TasteCalibrationSessionRecord extends TasteCalibrationSession {
  currentModelState?: TasteModelSnapshot | null;
}

export interface SessionJudgmentHistory {
  pairs: TasteCalibrationPair[];
  judgments: TastePairwiseJudgment[];
}
