import type {
  AnalysisStatus,
  ClaimType,
  EvidenceSourceType,
  Observation,
  UserCurationStatus,
} from "../../types";
import type { ProvenanceRecord } from "../provenance";

export type EvidenceAtomKind =
  | "image"
  | "url"
  | "text"
  | "note"
  | "screenshot"
  | "film"
  | "product"
  | "brand"
  | "generated"
  | "rejection";

export type StabilityClass =
  | "stable"
  | "recurring"
  | "fascination"
  | "project"
  | "temporary"
  | "declared";

export type CorrectionState =
  | "YES"
  | "SORT_OF"
  | "NOT_ANYMORE"
  | "ONLY_HERE"
  | "NOT_ME"
  | "MORE_LIKE_THIS";

export type TasteScope =
  | "global"
  | "project"
  | "brand"
  | "fashion"
  | "interface"
  | "editorial"
  | "experimental"
  | string;

export interface EvidenceAtom {
  id: string;
  userId: string;
  projectId?: string;
  contextId?: string;
  kind: EvidenceAtomKind;
  sourceType: EvidenceSourceType;
  /** Exact user-submitted source. Never replace this with AI output. */
  originalSource: string;
  title?: string;
  assetUrl?: string;
  thumbnailUrl?: string;
  sourceMetadata: Record<string, unknown>;
  extractedText?: string;
  /** AI interpretation is intentionally separate from originalSource. */
  semanticDescription?: string;
  structuredAttributes: Observation[];
  embeddingRef?: string;
  provenance?: ProvenanceRecord;
  userReaction: UserCurationStatus;
  correction?: CorrectionState;
  confidence: number;
  stabilityClass: StabilityClass;
  processingState: AnalysisStatus;
  createdAt: number;
  updatedAt: number;
}

export interface ConceptContext {
  scope: TasteScope;
  strength: number;
  confidence: number;
  trend: "stable" | "rising" | "declining" | "unknown";
  updatedAt: number;
}

export interface TasteConcept {
  id: string;
  userId: string;
  label: string;
  description?: string;
  isInferred: boolean;
  confidence: number;
  contexts: ConceptContext[];
  evidenceAtomIds: string[];
  assertionIds: string[];
  createdAt: number;
  updatedAt: number;
}

export type TasteRelation =
  | "LIKES"
  | "DISLIKES"
  | "PREFERS_OVER"
  | "ASSOCIATES"
  | "LIKES_ONLY_IN"
  | "QUESTIONS";

export interface TasteAssertion {
  id: string;
  userId: string;
  projectId?: string;
  conceptA: string;
  relation: TasteRelation;
  conceptB?: string;
  context?: TasteScope;
  claimType: ClaimType;
  confidence: number;
  evidenceAtomIds: string[];
  correction?: CorrectionState;
  createdAt: number;
  updatedAt: number;
}

export interface TasteAxis {
  id: string;
  userId: string;
  labelA: string;
  labelB: string;
  description?: string;
  confidence: number;
  isConfirmed: boolean;
  evidencePairs: Array<{
    atomA: string;
    atomB: string;
    userPreference: "A" | "B" | "neither";
  }>;
  createdAt: number;
  updatedAt: number;
}

export interface TasteState {
  userId: string;
  context?: TasteScope;
  stablePreferences: TasteAssertion[];
  negativePreferences: TasteAssertion[];
  emergingPreferences: TasteAssertion[];
  currentExplorations: TasteConcept[];
  tensions: Array<{ conceptA: string; conceptB: string; note?: string }>;
  inferredAxes: TasteAxis[];
  relevantEvidence: EvidenceAtom[];
  confidence: number;
  recentChanges: Array<{ label: string; direction: string; at: number }>;
  generatedAt: number;
}
