/**
 * Mimi Residue Engine — public Phase 2 API.
 */

export * from "./constants";
export * from "./validation";
export * from "./types";
export * from "./scoring";
export * from "./uncertainty";
export * from "./provenance";

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
