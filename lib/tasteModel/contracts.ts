import { z } from 'zod';
import type {
  CreativeLaw,
  EvidenceNode,
  Observation,
  PatternCluster,
  TasteEvent,
  TasteGraphDocument,
} from '../../types';

// ─── Taste Learning Actions ───────────────────────────────────────────────────

export const TASTE_LEARNING_ACTIONS = [
  'view',
  'linger',
  'save',
  'reject',
  'reuse',
  'approve_observation',
  'reject_observation',
  'accept_cluster',
  'reject_cluster',
  'rename_cluster',
  'mark_signature',
  'reduce_weight',
  'accept_law',
  'reject_law',
  'edit_law',
  'context_only',
  'add_note',
] as const;

export type TasteLearningAction = (typeof TASTE_LEARNING_ACTIONS)[number];

export const TASTE_TARGET_TYPES = [
  'evidence',
  'observation',
  'pattern_cluster',
  'creative_law',
  'artifact',
  'candidate',
] as const;

export type TasteTargetType = (typeof TASTE_TARGET_TYPES)[number];

export const TASTE_CONTEXT_SCOPES = [
  'persistent',
  'project',
  'session',
] as const;

export type TasteContextScope = (typeof TASTE_CONTEXT_SCOPES)[number];

export const TASTE_FEATURE_TRENDS = [
  'emerging',
  'strengthening',
  'stable',
  'declining',
  'uncertain',
] as const;

export type TasteFeatureTrend = (typeof TASTE_FEATURE_TRENDS)[number];

export const TASTE_INTERACTION_RELATIONS = [
  'reinforces',
  'contrasts',
  'rejects_when_combined',
  'contextual_only',
] as const;

export type TasteInteractionRelation = (typeof TASTE_INTERACTION_RELATIONS)[number];

// ─── TasteEventV2 ─────────────────────────────────────────────────────────────

export const tasteEventV2Schema = z.object({
  schemaVersion: z.literal(2),
  id: z.string(),
  userId: z.string(),
  projectId: z.string().optional(),
  sessionId: z.string().optional(),
  action: z.enum(TASTE_LEARNING_ACTIONS),
  target: z.object({
    type: z.enum(TASTE_TARGET_TYPES),
    id: z.string(),
  }),
  occurredAt: z.number(),
  context: z.object({
    surface: z.string(),
    intent: z.string().optional(),
    scope: z.enum(TASTE_CONTEXT_SCOPES),
  }),
  signal: z.object({
    polarity: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
    strength: z.number().min(0).max(1),
    explicit: z.boolean(),
    dwellMs: z.number().optional(),
    revisitCount: z.number().optional(),
  }),
  provenance: z.object({
    evidenceNodeIds: z.array(z.string()),
    observationIds: z.array(z.string()),
    patternClusterIds: z.array(z.string()),
    creativeLawIds: z.array(z.string()),
  }),
  dedupeKey: z.string().optional(),
});

export type TasteEventV2 = z.infer<typeof tasteEventV2Schema>;

// ─── Normalized Taste Event ───────────────────────────────────────────────────

export interface NormalizedTasteEvent {
  id: string;
  userId: string;
  projectId?: string;
  sessionId?: string;
  action: TasteLearningAction;
  targetType: TasteTargetType;
  targetId: string;
  occurredAt: number;
  surface: string;
  intent?: string;
  scope: TasteContextScope;
  polarity: -1 | 0 | 1;
  strength: number;
  explicit: boolean;
  dwellMs?: number;
  revisitCount?: number;
  evidenceNodeIds: string[];
  observationIds: string[];
  patternClusterIds: string[];
  creativeLawIds: string[];
  dedupeKey?: string;
  sourceSchema: 1 | 2;
}

// ─── Feature Weights & Interaction Rules ──────────────────────────────────────

export interface TasteFeatureWeight {
  featureId: string;
  label: string;
  category: string;
  sourceType:
    | 'observation'
    | 'pattern_cluster'
    | 'creative_law'
    | 'tag'
    | 'embedding_dimension';

  signedWeight: number;
  confidence: number;
  evidenceMass: number;
  explicitMass: number;
  implicitMass: number;

  firstSeenAt?: number;
  lastSeenAt?: number;

  trend: TasteFeatureTrend;
  contextScopes: string[];
  sourceIds: string[];
}

export interface TasteInteractionRule {
  id: string;
  featureIds: [string, string];
  relation: TasteInteractionRelation;
  signedWeight: number;
  supportCount: number;
  confidence: number;
  contextScopes: string[];
  sourceIds: string[];
}

// ─── Taste Model Snapshot ───────────────────────────────────────────────────

export interface TasteModelSnapshot {
  schemaVersion: 1;
  modelVersion: 'mimi-taste-model-v1';

  id: string;
  userId: string;
  projectId?: string;
  tasteGraphId?: string;
  tasteGraphVersion?: number;

  scope: 'global' | 'project';
  compiledAt: number;

  featureWeights: TasteFeatureWeight[];
  interactionRules: TasteInteractionRule[];

  trajectory: {
    emergingFeatureIds: string[];
    strengtheningFeatureIds: string[];
    stableFeatureIds: string[];
    decliningFeatureIds: string[];
  };

  diagnostics: {
    evidenceCount: number;
    eventCount: number;
    explicitEventCount: number;
    contradictionCount: number;
    lowConfidenceFeatureIds: string[];
    missingDataWarnings: string[];
  };

  sourceWindow: {
    oldestEventAt?: number;
    newestEventAt?: number;
  };

  /** Set when recompilation failed but a prior snapshot is retained */
  stale?: boolean;
  /** Set when compilation produced partial results */
  partial?: boolean;
  recomputeError?: string;
}

// ─── Candidate Scoring ────────────────────────────────────────────────────────

export interface TasteCandidateInput {
  id: string;
  label?: string;
  tags?: string[];
  featureIds?: string[];
  patternClusterIds?: string[];
  creativeLawIds?: string[];
  observationIds?: string[];
  canonicalTaste?: {
    motifs?: string[];
    palette?: string[];
    mood?: string[];
    form?: string[];
    density?: number;
    entropy?: number;
  };
}

export interface TasteCandidateScore {
  fitScore: number;
  confidence: number;

  verdict:
    | 'strong_fit'
    | 'promising_adjacent'
    | 'uncertain'
    | 'weak_fit'
    | 'conflicted';

  components: {
    semanticAffinity: number;
    ruleFit: number;
    contextFit: number;
    trajectoryFit: number;
    noveltyFit: number;
    aversionPenalty: number;
    saturationPenalty: number;
  };

  explanation: {
    topPositiveFactors: Array<{
      label: string;
      contribution: number;
      sourceIds: string[];
    }>;
    topNegativeFactors: Array<{
      label: string;
      contribution: number;
      sourceIds: string[];
    }>;
    contradictions: string[];
    unknowns: string[];
  };
}

// ─── Compiler Input ───────────────────────────────────────────────────────────

export interface CompileTasteModelInput {
  userId: string;
  projectId?: string;
  scope: 'global' | 'project';
  compiledAt?: number;
  tasteGraph?: TasteGraphDocument;
  evidence: EvidenceNode[];
  observations: Observation[];
  clusters: PatternCluster[];
  laws: CreativeLaw[];
  events: NormalizedTasteEvent[];
  globalSnapshot?: TasteModelSnapshot;
}

// ─── Graph Projection ─────────────────────────────────────────────────────────

export interface TasteModelGraphNode {
  id: string;
  label: string;
  type: 'concept' | 'motif' | 'era' | 'web_reference';
  weight: number;
  signedStrength: number;
  confidence: number;
  trend: TasteFeatureTrend;
  sourceCount: number;
  contextScope: string;
  sourceIds: string[];
  featureId: string;
  category: string;
}

export interface TasteModelGraphEdge {
  source: string;
  target: string;
  strength: number;
  type: 'relates_to' | 'evolves_from' | 'contrasts_with';
  relation: TasteInteractionRelation;
  confidence: number;
}

export interface TasteModelGraphProjection {
  nodes: TasteModelGraphNode[];
  edges: TasteModelGraphEdge[];
}

// ─── Legacy event type alias ──────────────────────────────────────────────────

export type LegacyTasteEvent = TasteEvent & { id?: string };

export type AnyTasteEvent = LegacyTasteEvent | TasteEventV2;
