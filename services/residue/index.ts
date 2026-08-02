/**
 * Mimi Residue Engine — public API (Phases 2–9).
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
export {
  APIFY_ACTOR_CANDIDATES,
  resolveResidueApifyActorId,
} from "./acquisition/providers/apify/actorRegistry";
export { mapApifyDatasetItemsToAcquiredSources } from "./acquisition/providers/apify/mapApifyDatasetItems";
export { acquireResidueSources } from "./acquisition/composeAcquisition";

export {
  runCulturalResidue,
  type CulturalResidueEngineOutput,
  type CulturalResidueRunOptions,
} from "./cultural/culturalResidueEngine";
export {
  runEmotionalResidue,
  type EmotionalResidueEngineOutput,
  type EmotionalResidueRunOptions,
} from "./emotional/emotionalResidueEngine";
export { normalizeSources } from "./shared/normalizeSources";
export { extractEvidenceOffline } from "./shared/extractEvidence";
export { separateResearchFromCommunityReports } from "./emotional/separateResearchFromCommunityReports";

export {
  adaptResidueToMeanMedianMode,
  adaptCulturalInterpretive,
  adaptEmotionalInterpretive,
  toMeanMedianMode,
} from "./adapters/meanMedianModeAdapter";
export {
  buildInterpretiveMeanMedianMode,
  buildLiteralMeanMedianMode,
} from "./shared/meanMedianMode";
export {
  adaptResidueToIntelligenceReport,
  intelligenceReportSchema,
  type IntelligenceReport,
} from "./adapters/intelligenceReportAdapter";
export {
  RESIDUE_INTEL_HUB_CHANGED,
  RESIDUE_INTEL_HUB_KEY,
  adaptResidueToIntelHubObject,
  buildResidueHubBundle,
  createIntelProjectRunFromResidue,
  createResidueIntelHubRegistry,
  filterResidueIntelHubObjects,
  persistReportArtifactForRun,
  pinFindingOnIntelObject,
  residueIntelHubObjectSchema,
  residueToIntelEvidenceItems,
  type ResidueIntelHubObject,
} from "./adapters/intelHubAdapter";
export {
  adaptResidueToZinePages,
  residueZineArtifactSchema,
  type ResidueZineArtifact,
} from "./adapters/zineAdapter";
export {
  adaptResidueToEditorialDirection,
  residueEditorialDirectionSchema,
  type ResidueEditorialDirection,
} from "./adapters/editAdapter";
export {
  adaptResidueToForecast,
  residueForecastArtifactSchema,
  type ResidueForecastArtifact,
} from "./adapters/forecastAdapter";
export {
  adaptResidueToTasteGraphDelta,
  residueTasteGraphDeltaSchema,
  type ResidueTasteGraphDelta,
} from "./adapters/tasteGraphAdapter";
export {
  adaptResidueToMemoryAtomProposals,
  persistMemoryAtomProposalsForRun,
  residueMemoryAtomProposalSchema,
  type ResidueMemoryAtomProposal,
} from "./adapters/memoryAtomAdapter";
export {
  buildResidueProductOutputBundle,
  persistPhase7ArtifactsForRun,
} from "./adapters/productOutputsBundle";
