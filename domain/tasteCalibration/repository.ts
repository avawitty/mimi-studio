import type {
  CreateCalibrationPairInput,
  CreateCalibrationSessionInput,
  CreatePairwiseJudgmentInput,
  SessionJudgmentHistory,
  TasteCalibrationSessionRecord,
  UpdateSessionSnapshotInput,
} from './types';
import type {
  TasteCalibrationPair,
  TastePairwiseJudgment,
} from '../../lib/tasteCalibration/contracts';

export interface TasteCalibrationRepository {
  createSession(input: CreateCalibrationSessionInput): Promise<TasteCalibrationSessionRecord>;
  getSession(
    sessionId: string,
    ownerId: string,
  ): Promise<TasteCalibrationSessionRecord | null>;
  getActiveSession(
    ownerId: string,
    projectId?: string,
  ): Promise<TasteCalibrationSessionRecord | null>;
  updateSessionSnapshot(
    input: UpdateSessionSnapshotInput,
  ): Promise<TasteCalibrationSessionRecord>;
  completeSession(
    sessionId: string,
    ownerId: string,
    completedAt: number,
  ): Promise<TasteCalibrationSessionRecord>;
  pauseSession(
    sessionId: string,
    ownerId: string,
  ): Promise<TasteCalibrationSessionRecord>;
  createPair(input: CreateCalibrationPairInput, ownerId: string): Promise<TasteCalibrationPair>;
  getPair(
    pairId: string,
    ownerId: string,
  ): Promise<TasteCalibrationPair | null>;
  markPairAnswered(
    pairId: string,
    ownerId: string,
    answeredAt: number,
  ): Promise<void>;
  createJudgment(input: CreatePairwiseJudgmentInput): Promise<TastePairwiseJudgment>;
  getSessionHistory(
    sessionId: string,
    ownerId: string,
  ): Promise<SessionJudgmentHistory>;
  deleteLastJudgment(
    sessionId: string,
    ownerId: string,
  ): Promise<{ judgment: TastePairwiseJudgment; pair: TasteCalibrationPair } | null>;
}
