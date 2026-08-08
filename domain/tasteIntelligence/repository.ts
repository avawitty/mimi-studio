import type {
  CalibrationChoice,
  CollaborativeTasteContract,
  CulturalPositioningReport,
  SavedReasonHypothesis,
  SentinelMemoryPolicy,
  TasteCalibrationPair,
  TasteCalibrationSession,
  TasteCritique,
  TasteEvaluationEvent,
  TasteExperiment,
  TasteExposureEvent,
  TasteGenerationContract,
  TasteModelEdit,
  TastePairwiseJudgment,
  TastePassport,
  TasteRefusal,
} from "../../schemas/tasteIntelligenceContracts.js";
import type { NormalizedTasteEvent, TasteModelSnapshot } from "../../lib/tasteModel/contracts.js";

export interface TasteLearningEventRow {
  id: string;
  ownerId: string;
  workspaceId: string | null;
  projectId: string | null;
  event: NormalizedTasteEvent;
  idempotencyKey: string | null;
  occurredAt: Date;
  createdAt: Date;
}

export interface TasteModelSnapshotRow {
  id: string;
  ownerId: string;
  workspaceId: string | null;
  projectId: string | null;
  scope: "global" | "project";
  schemaVersion: number;
  modelVersion: string;
  snapshot: TasteModelSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCalibrationSessionInput {
  id: string;
  ownerId: string;
  workspaceId?: string;
  projectId?: string;
  modelSnapshotId: string;
  targetQuestionCount: number;
  algorithmVersion: string;
  idempotencyKey: string;
}

export interface RecordJudgmentInput {
  id: string;
  sessionId: string;
  pairId: string;
  choice: CalibrationChoice;
  decidingFeatureIds: string[];
  correctionNote?: string;
  confidence?: number;
  contextScope: "persistent" | "project" | "session";
  idempotencyKey: string;
}

export interface TasteIntelligenceRepository {
  // Learning events & snapshots
  upsertLearningEvent(
    ownerId: string,
    event: NormalizedTasteEvent,
    idempotencyKey?: string,
  ): Promise<TasteLearningEventRow>;
  listLearningEvents(
    ownerId: string,
    opts?: { projectId?: string; limit?: number },
  ): Promise<TasteLearningEventRow[]>;
  saveSnapshot(
    ownerId: string,
    snapshot: TasteModelSnapshot,
    opts?: { workspaceId?: string; projectId?: string },
  ): Promise<TasteModelSnapshotRow>;
  getLatestSnapshot(
    ownerId: string,
    scope: "global" | string,
  ): Promise<TasteModelSnapshotRow | null>;
  findSnapshotById(
    ownerId: string,
    snapshotId: string,
  ): Promise<TasteModelSnapshotRow | null>;

  // Calibration
  createCalibrationSession(
    input: CreateCalibrationSessionInput,
  ): Promise<TasteCalibrationSession>;
  getActiveCalibrationSession(
    ownerId: string,
    projectId?: string,
  ): Promise<TasteCalibrationSession | null>;
  updateCalibrationSession(
    session: TasteCalibrationSession,
  ): Promise<TasteCalibrationSession>;
  saveCalibrationPair(pair: TasteCalibrationPair): Promise<TasteCalibrationPair>;
  listCalibrationPairs(sessionId: string): Promise<TasteCalibrationPair[]>;
  recordPairwiseJudgment(
    input: RecordJudgmentInput,
  ): Promise<TastePairwiseJudgment>;
  listJudgments(sessionId: string): Promise<TastePairwiseJudgment[]>;

  // Refusals & edits
  upsertRefusal(refusal: TasteRefusal): Promise<TasteRefusal>;
  listActiveRefusals(
    ownerId: string,
    projectId?: string,
  ): Promise<TasteRefusal[]>;
  appendModelEdit(edit: TasteModelEdit): Promise<TasteModelEdit>;
  listModelEdits(
    ownerId: string,
    opts?: { projectId?: string; limit?: number },
  ): Promise<TasteModelEdit[]>;

  // Compiler / critic
  saveGenerationContract(
    contract: TasteGenerationContract,
  ): Promise<TasteGenerationContract>;
  getGenerationContract(
    ownerId: string,
    contractId: string,
  ): Promise<TasteGenerationContract | null>;
  saveCritique(ownerId: string, critique: TasteCritique): Promise<TasteCritique>;

  // Exposure
  recordExposureEvent(event: TasteExposureEvent): Promise<TasteExposureEvent>;
  listExposureEvents(
    ownerId: string,
    opts?: { projectId?: string; limit?: number },
  ): Promise<TasteExposureEvent[]>;

  // Experiments, passport, collaboration, cultural, evaluation
  saveExperiment(experiment: TasteExperiment): Promise<TasteExperiment>;
  listExperiments(
    ownerId: string,
    projectId?: string,
  ): Promise<TasteExperiment[]>;
  savePassport(passport: TastePassport): Promise<TastePassport>;
  listPassports(ownerId: string): Promise<TastePassport[]>;
  saveCollaborativeContract(
    contract: CollaborativeTasteContract,
  ): Promise<CollaborativeTasteContract>;
  getCollaborativeContract(
    workspaceId: string,
    contractId: string,
  ): Promise<CollaborativeTasteContract | null>;
  saveCulturalReport(
    report: CulturalPositioningReport,
  ): Promise<CulturalPositioningReport>;
  recordEvaluationEvent(
    event: TasteEvaluationEvent,
  ): Promise<TasteEvaluationEvent>;

  // Why saved & sentinel
  saveSavedReasonHypothesis(
    ownerId: string,
    hypothesis: SavedReasonHypothesis,
  ): Promise<SavedReasonHypothesis>;
  listSavedReasonHypotheses(
    ownerId: string,
    artifactId?: string,
  ): Promise<SavedReasonHypothesis[]>;
  upsertSentinelPolicy(
    policy: SentinelMemoryPolicy,
  ): Promise<SentinelMemoryPolicy>;
  listSentinelPolicies(
    ownerId: string,
    projectId?: string,
  ): Promise<SentinelMemoryPolicy[]>;

  // Legacy migration helpers
  findLegacyMapping(
    legacySystem: string,
    legacyCollection: string,
    legacyId: string,
  ): Promise<string | null>;
  recordLegacyMapping(input: {
    legacySystem: string;
    legacyCollection: string;
    legacyId: string;
    canonicalTable: string;
    canonicalId: string;
    migrationStatus: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}
