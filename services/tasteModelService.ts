import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebaseInit';
import { stripUndefined } from '../lib/stripUndefined';
import {
  compileTasteModel,
  normalizeTasteEvent,
  scoreTasteCandidate,
  type AnyTasteEvent,
  type CompileTasteModelInput,
  type NormalizedTasteEvent,
  type TasteCandidateInput,
  type TasteCandidateScore,
  type TasteEventV2,
  type TasteLearningAction,
  type TasteModelSnapshot,
  type TasteTargetType,
  buildTasteEventDedupeKey,
} from '../lib/tasteModel';
import type {
  CreativeLaw,
  EvidenceNode,
  Observation,
  PatternCluster,
  TasteGraphDocument,
  UserCurationStatus,
  UserWeight,
} from '../types';
import {
  listCreativeLaws,
  listEvidenceNodes,
  listObservations,
  listPatternClusters,
} from './tailorService';

function eventsCol(userId: string) {
  return collection(db, `users/${userId}/tasteLearningEvents`);
}

function snapshotDoc(userId: string, scope: 'global' | string) {
  const docId = scope === 'global' ? 'global' : scope;
  return doc(db, `users/${userId}/tasteModelSnapshots/${docId}`);
}

async function persistSnapshotToNeon(
  userId: string,
  snapshot: TasteModelSnapshot,
  opts?: { projectId?: string; workspaceId?: string },
): Promise<void> {
  const { getNeonUnitOfWork } = await import(
    '../infrastructure/database/neon/unitOfWork.js'
  );
  await getNeonUnitOfWork().transaction(async (repositories) => {
    await repositories.tasteIntelligence.saveSnapshot(userId, snapshot, opts);
  });
}

async function readSnapshotFromNeon(
  userId: string,
  scope: 'global' | { projectId: string },
): Promise<TasteModelSnapshot | null> {
  try {
    const { getNeonTasteIntelligenceRepository } = await import(
      '../infrastructure/database/neon/tasteIntelligenceRuntime.js'
    );
    const neonScope =
      scope === 'global' ? 'global' : scope.projectId;
    const row = await getNeonTasteIntelligenceRepository().getLatestSnapshot(
      userId,
      neonScope,
    );
    return row?.snapshot ?? null;
  } catch {
    return null;
  }
}

const uid = () =>
  crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// ─── Event Recording ──────────────────────────────────────────────────────────

export interface RecordTasteLearningEventInput {
  userId: string;
  projectId?: string;
  sessionId?: string;
  action: TasteLearningAction;
  targetType: TasteTargetType;
  targetId: string;
  surface: string;
  intent?: string;
  scope?: 'persistent' | 'project' | 'session';
  polarity?: -1 | 0 | 1;
  strength?: number;
  explicit?: boolean;
  provenance?: {
    evidenceNodeIds?: string[];
    observationIds?: string[];
    patternClusterIds?: string[];
    creativeLawIds?: string[];
  };
  dedupeKey?: string;
}

export function buildTasteLearningEventV2(
  input: RecordTasteLearningEventInput,
): TasteEventV2 {
  const occurredAt = Date.now();
  const dedupeKey =
    input.dedupeKey ??
    buildTasteEventDedupeKey(
      input.userId,
      input.action,
      input.targetType,
      input.targetId,
      Math.floor(occurredAt / 60_000),
    );

  return {
    schemaVersion: 2,
    id: uid(),
    userId: input.userId,
    projectId: input.projectId,
    sessionId: input.sessionId,
    action: input.action,
    target: { type: input.targetType, id: input.targetId },
    occurredAt,
    context: {
      surface: input.surface,
      intent: input.intent,
      scope: input.scope ?? (input.projectId ? 'project' : 'persistent'),
    },
    signal: {
      polarity: input.polarity ?? 1,
      strength: input.strength ?? 0.8,
      explicit: input.explicit ?? true,
    },
    provenance: {
      evidenceNodeIds: input.provenance?.evidenceNodeIds ?? [],
      observationIds: input.provenance?.observationIds ?? [],
      patternClusterIds: input.provenance?.patternClusterIds ?? [],
      creativeLawIds: input.provenance?.creativeLawIds ?? [],
    },
    dedupeKey,
  };
}

export async function recordTasteLearningEvent(
  input: RecordTasteLearningEventInput,
): Promise<TasteEventV2> {
  if (!input.userId || input.userId === 'ghost') {
    throw new Error('Authentication required to record taste learning events');
  }

  const event = buildTasteLearningEventV2(input);
  const eventId = input.dedupeKey ?? event.id;

  await setDoc(
    doc(eventsCol(input.userId), eventId),
    stripUndefined(event as unknown as Record<string, unknown>),
  );

  const normalized = normalizeTasteEvent(event);
  try {
    const { getNeonUnitOfWork } = await import(
      '../infrastructure/database/neon/unitOfWork.js'
    );
    await getNeonUnitOfWork().transaction(async (repositories) => {
      await repositories.tasteIntelligence.upsertLearningEvent(
        input.userId,
        normalized,
        event.dedupeKey,
      );
    });
  } catch {
    /* Firestore remains fallback source during migration */
  }

  return event;
}

// ─── Event Listing ────────────────────────────────────────────────────────────

export async function listTasteLearningEvents(
  userId: string,
  opts?: { projectId?: string; limit?: number },
): Promise<NormalizedTasteEvent[]> {
  if (!userId || userId.startsWith('local_')) return [];

  const q = query(
    eventsCol(userId),
    orderBy('occurredAt', 'desc'),
    limit(opts?.limit ?? 500),
  );

  const snap = await getDocs(q);
  const events: NormalizedTasteEvent[] = [];

  for (const d of snap.docs) {
    const raw = d.data() as AnyTasteEvent;
    try {
      const normalized = normalizeTasteEvent(raw);
      if (opts?.projectId && normalized.projectId !== opts.projectId) continue;
      events.push(normalized);
    } catch {
      // Skip malformed events
    }
  }

  return events;
}

// ─── Model Compilation ────────────────────────────────────────────────────────

export interface CompileAndSaveInput {
  userId: string;
  projectId?: string;
  tasteGraph?: TasteGraphDocument;
  evidence?: EvidenceNode[];
  observations?: Observation[];
  clusters?: PatternCluster[];
  laws?: CreativeLaw[];
  events?: NormalizedTasteEvent[];
}

async function loadProjectGraphData(
  userId: string,
  projectId: string,
): Promise<{
  evidence: EvidenceNode[];
  observations: Observation[];
  clusters: PatternCluster[];
  laws: CreativeLaw[];
}> {
  const [evidence, observations, clusters, laws] = await Promise.all([
    listEvidenceNodes(userId, projectId),
    listObservations(userId, projectId),
    listPatternClusters(userId, projectId),
    listCreativeLaws(userId, projectId),
  ]);
  return { evidence, observations, clusters, laws };
}

export async function compileAndSaveTasteModel(
  input: CompileAndSaveInput,
): Promise<{ global: TasteModelSnapshot; project?: TasteModelSnapshot }> {
  const events =
    input.events ?? (await listTasteLearningEvents(input.userId, { projectId: input.projectId }));

  let evidence = input.evidence ?? [];
  let observations = input.observations ?? [];
  let clusters = input.clusters ?? [];
  let laws = input.laws ?? [];

  if (input.projectId && !input.evidence) {
    const graphData = await loadProjectGraphData(input.userId, input.projectId);
    evidence = graphData.evidence;
    observations = graphData.observations;
    clusters = graphData.clusters;
    laws = graphData.laws;
  }

  const globalInput: CompileTasteModelInput = {
    userId: input.userId,
    scope: 'global',
    tasteGraph: input.tasteGraph,
    evidence,
    observations,
    clusters,
    laws,
    events,
  };

  const globalSnapshot = compileTasteModel(globalInput);
  await setDoc(
    snapshotDoc(input.userId, 'global'),
    stripUndefined(globalSnapshot as unknown as Record<string, unknown>),
  );
  await persistSnapshotToNeon(input.userId, globalSnapshot, {
    projectId: input.projectId,
  }).catch(() => {
    /* Neon optional during migration */
  });

  let projectSnapshot: TasteModelSnapshot | undefined;
  if (input.projectId) {
    const projectInput: CompileTasteModelInput = {
      userId: input.userId,
      projectId: input.projectId,
      scope: 'project',
      tasteGraph: input.tasteGraph,
      evidence,
      observations,
      clusters,
      laws,
      events,
      globalSnapshot,
    };
    projectSnapshot = compileTasteModel(projectInput);
    await setDoc(
      snapshotDoc(input.userId, `project-${input.projectId}`),
      stripUndefined(projectSnapshot as unknown as Record<string, unknown>),
    );
    await persistSnapshotToNeon(input.userId, projectSnapshot, {
      projectId: input.projectId,
    }).catch(() => {});
  }

  return { global: globalSnapshot, project: projectSnapshot };
}

export async function getTasteModelSnapshot(
  userId: string,
  scope: 'global' | { projectId: string },
): Promise<TasteModelSnapshot | null> {
  if (!userId || userId.startsWith('local_')) return null;

  const neonFirst = await readSnapshotFromNeon(userId, scope);
  if (neonFirst) return neonFirst;

  const docId =
    scope === 'global' ? 'global' : `project-${scope.projectId}`;
  const snap = await getDoc(snapshotDoc(userId, docId));
  if (!snap.exists()) return null;
  return snap.data() as TasteModelSnapshot;
}

export async function rebuildTasteModel(
  userId: string,
  projectId?: string,
): Promise<{ global: TasteModelSnapshot; project?: TasteModelSnapshot }> {
  try {
    return await compileAndSaveTasteModel({ userId, projectId });
  } catch (err) {
    const existing = await getTasteModelSnapshot(userId, 'global');
    if (existing) {
      const stale: TasteModelSnapshot = {
        ...existing,
        stale: true,
        recomputeError: err instanceof Error ? err.message : 'Recompilation failed',
      };
      await setDoc(
        snapshotDoc(userId, 'global'),
        stripUndefined(stale as unknown as Record<string, unknown>),
      );
    }
    throw err;
  }
}

export async function scoreCandidateAgainstStoredModel(
  userId: string,
  candidate: TasteCandidateInput,
  context?: { projectId?: string; surface?: string },
): Promise<TasteCandidateScore> {
  const scope = context?.projectId
    ? { projectId: context.projectId }
    : 'global';
  const snapshot = await getTasteModelSnapshot(userId, scope);

  if (!snapshot) {
    return {
      fitScore: 0,
      confidence: 0,
      verdict: 'uncertain',
      components: {
        semanticAffinity: 0,
        ruleFit: 0,
        contextFit: 0,
        trajectoryFit: 0,
        noveltyFit: 0,
        aversionPenalty: 0,
        saturationPenalty: 0,
      },
      explanation: {
        topPositiveFactors: [],
        topNegativeFactors: [],
        contradictions: [],
        unknowns: ['No taste model snapshot available yet.'],
      },
    };
  }

  return scoreTasteCandidate(candidate, snapshot, context);
}

// ─── Curation → Taste Event Bridge ───────────────────────────────────────────

const CURATION_ACTION_MAP: Record<
  UserCurationStatus,
  TasteLearningAction
> = {
  accepted: 'accept_cluster',
  rejected: 'reject_cluster',
  renamed: 'rename_cluster',
  suggested: 'view',
  merged: 'accept_cluster',
  split: 'accept_cluster',
  hidden: 'reduce_weight',
};

export async function recordCurationAsTasteEvent(
  userId: string,
  projectId: string,
  targetType: 'pattern_cluster' | 'creative_law' | 'observation',
  targetId: string,
  action: UserCurationStatus,
  opts?: {
    annotation?: string;
    weight?: UserWeight;
    provenance?: RecordTasteLearningEventInput['provenance'];
  },
): Promise<TasteEventV2 | null> {
  const tasteAction = CURATION_ACTION_MAP[action];
  if (!tasteAction) return null;

  const polarity: -1 | 0 | 1 =
    action === 'rejected' ? -1 : action === 'hidden' ? -1 : 1;

  const strength =
    opts?.weight === 'signature' ? 1.0 :
    opts?.weight === 'high' ? 0.9 :
    opts?.weight === 'low' ? 0.5 : 0.8;

  const targetTypeMap: Record<string, TasteTargetType> = {
    pattern_cluster: 'pattern_cluster',
    creative_law: 'creative_law',
    observation: 'observation',
  };

  return recordTasteLearningEvent({
    userId,
    projectId,
    action: tasteAction,
    targetType: targetTypeMap[targetType] ?? 'pattern_cluster',
    targetId,
    surface: 'tailor',
    scope: 'project',
    polarity,
    strength,
    explicit: true,
    intent: opts?.annotation,
    provenance: opts?.provenance,
  });
}

export async function recordAndRecompile(
  input: RecordTasteLearningEventInput & { projectId?: string },
): Promise<{ event: TasteEventV2; snapshot: TasteModelSnapshot }> {
  const event = await recordTasteLearningEvent(input);
  const result = await compileAndSaveTasteModel({
    userId: input.userId,
    projectId: input.projectId,
  });
  const snapshot = input.projectId ? result.project ?? result.global : result.global;
  return { event, snapshot };
}
