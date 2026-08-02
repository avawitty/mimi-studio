/**
 * Mimi Residue Engine — public API (Phases 2–3).
 */

export * from "./constants";
export * from "./validation";
export * from "./types";
export * from "./scoring";
export * from "./uncertainty";
export * from "./provenance";
export * from "./pipeline";

export {
  buildResidueRunDocument,
  createMemoryResidueStore,
  deleteResidueArtifact,
  deleteResidueRun,
  getResidueRun,
  listResidueRuns,
  saveMemoryAtomProposal,
  saveResidueArtifact,
  saveResidueRun,
} from "./storage/residueStore";

export {
  emptyAcquisitionResult,
  type SourceAcquisitionProvider,
} from "./acquisition/SourceAcquisitionProvider";
export { ManualSourceProvider } from "./acquisition/providers/manualSourceProvider";
export {
  ApifySourceAcquisitionProvider,
  createApifySourceAcquisitionProvider,
} from "./acquisition/providers/apify/apifySourceAcquisitionProvider";
export { APIFY_ACTOR_CANDIDATES } from "./acquisition/providers/apify/actorRegistry";

export {
  runCulturalResidue,
  type CulturalResidueEngineOutput,
  type CulturalResidueRunOptions,
} from "./cultural/culturalResidueEngine";
export { normalizeSources } from "./shared/normalizeSources";
export { extractEvidenceOffline } from "./shared/extractEvidence";
