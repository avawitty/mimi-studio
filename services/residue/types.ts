/**
 * Mimi Residue Engine — public type surface (re-exports from Zod schemas).
 */

export type {
  ResidueMode,
  SourceType,
  EvidenceStrength,
  ClaimStatus,
  ResidueOutputType,
  SourceReference,
  EvidenceRecord,
  ResidueClaim,
  ResidueAssociation,
  ResidueUsedContextEntry,
  ConfidenceSummary,
  ResidueRunMetadata,
  CulturalResidueInput,
  CulturalLineageStage,
  CulturalCode,
  CulturalResidueResult,
  EmotionalResidueInput,
  InterpretiveNeighborhood,
  ReportedResponsePattern,
  EmotionalResidueResult,
  MeanMedianModeResult,
  SourceAcquisitionRequest,
  AcquiredSource,
  SourceAcquisitionResult,
  ResidueRunDocument,
} from "./validation";

export type { EvidenceLayer } from "./constants";

export type ResidueResult = import("./validation").CulturalResidueResult | import("./validation").EmotionalResidueResult;

export type PipelineStageId =
  | "normalize-inquiry"
  | "classify-mode"
  | "normalize-sources"
  | "extract-evidence"
  | "generate-associations"
  | "label-claim-status"
  | "find-counter-signals"
  | "group-findings"
  | "mean-median-mode"
  | "calibrate-confidence"
  | "synthesize"
  | "adapt-outputs"
  | "validate"
  | "persist";

export interface PipelineStageError {
  stageId: PipelineStageId;
  message: string;
  recoverable: boolean;
  /** Redacted — never include raw emotional input text. */
  detail?: string;
}

export interface PipelinePartialState {
  completedStages: PipelineStageId[];
  failedStages: PipelineStageError[];
  warnings: string[];
}
