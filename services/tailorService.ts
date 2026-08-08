import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebaseInit';
import { handleFirestoreError, isFirestoreQuotaError, OperationType } from './firebaseUtils';
import {
  getLocalTailorProject,
  listLocalEvidenceNodes,
  listLocalObservations,
  listLocalPatternClusters,
  listLocalCreativeLaws,
  listLocalTailorProjects,
  mergeLocalTasteGraphIds,
  saveLocalCreativeLaw,
  saveLocalEvidenceNode,
  saveLocalObservation,
  saveLocalPatternCluster,
  saveLocalTailorProject,
  saveLocalTasteGraph,
  getLocalTasteGraph,
  updateLocalCreativeLaw,
  updateLocalEvidenceNode,
  updateLocalPatternCluster,
} from './tailorLocalArchive';
import { evidenceNodeToAtomInput } from '../lib/taste/evidenceNodeBridge';
import { createEvidenceAtom } from './taste/evidenceAtomService';
import { getReadConfidenceLabel } from '../constants/tailorSafetyRules';
import {
  compileTailorProfileFromGraph,
  tailorProfileToLegacyDraft,
  type TailorProfile,
} from './tailorProfileContract';
import { stripUndefined } from '../lib/stripUndefined';
import {
  saveTailorEvidenceLocal,
  listTailorEvidenceLocal,
  mergeEvidenceWithLocal,
  slimEvidenceForFirestore,
} from './tailorEvidenceLocalStore';
import {
  buildCurationEventPayload,
  buildPatternClusterCurationPatch,
} from './tailorCuration';
import { validatePatternSplit, type PatternSplitPartition } from './tailorPatternSplit';
import { assertProjectGraphBinding } from './tailorProjection';
import type {
  TailorProject,
  TailoringIntent,
  EvidenceNode,
  Observation,
  PatternCluster,
  CreativeLaw,
  TasteGraphDocument,
  FieldNote,
  Doll,
  DollMask,
  CreativeDossier,
  ArtworkMatch,
  MarketingAsset,
  DollScene,
  GenerationJob,
  TailorLogicDraft,
  UserCurationStatus,
  UserWeight,
} from '../types';

const uid = () => {
  const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return id;
};

function projectCol(userId: string, projectId: string, sub: string) {
  return collection(db, `users/${userId}/tailorProjects/${projectId}/${sub}`);
}

function userCol(userId: string, sub: string) {
  return collection(db, `users/${userId}/${sub}`);
}

// ─── Projects ───────────────────────────────────────────────────────────────

export async function createTailorProject(
  userId: string,
  intent: TailoringIntent,
  title?: string,
): Promise<TailorProject> {
  if (!userId || userId === 'ghost') throw new Error('Authentication required');

  const id = uid();
  const now = Date.now();
  const project: TailorProject = {
    id,
    userId,
    title: title ?? `Tailor — ${intent.replace(/_/g, ' ')}`,
    intent,
    evidenceCount: 0,
    readConfidence: 'initial',
    analysisStatus: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, `users/${userId}/tailorProjects/${id}`), stripUndefined(project));
    const graph = await createTasteGraph(userId, id);
    await updateDoc(doc(db, `users/${userId}/tailorProjects/${id}`), {
      tasteGraphId: graph.id,
      updatedAt: Date.now(),
    });
    project.tasteGraphId = graph.id;
    await saveLocalTailorProject(project);
    return project;
  } catch (e) {
    if (isFirestoreQuotaError(e)) {
      const graph = await createTasteGraph(userId, id);
      project.tasteGraphId = graph.id;
      await saveLocalTailorProject(project);
      return project;
    }
    handleFirestoreError(e, OperationType.WRITE, `tailorProjects/${id}`);
    throw e;
  }
}

export async function getTailorProject(userId: string, projectId: string): Promise<TailorProject | null> {
  if (!userId || userId === 'ghost') return null;
  try {
    const snap = await getDoc(doc(db, `users/${userId}/tailorProjects/${projectId}`));
    const project = snap.exists() ? (snap.data() as TailorProject) : null;
    if (project) await saveLocalTailorProject(project);
    return project;
  } catch (e) {
    if (isFirestoreQuotaError(e)) {
      return await getLocalTailorProject(userId, projectId);
    }
    handleFirestoreError(e, OperationType.GET, `tailorProjects/${projectId}`);
    return await getLocalTailorProject(userId, projectId);
  }
}

export async function listTailorProjects(userId: string): Promise<TailorProject[]> {
  if (!userId || userId === 'ghost') return [];
  try {
    const q = query(
      collection(db, `users/${userId}/tailorProjects`),
      orderBy('updatedAt', 'desc'),
      limit(50),
    );
    const snap = await getDocs(q);
    const projects = snap.docs.map((d) => d.data() as TailorProject);
    for (const p of projects) await saveLocalTailorProject(p);
    return projects;
  } catch (e) {
    if (isFirestoreQuotaError(e)) {
      return await listLocalTailorProjects(userId);
    }
    handleFirestoreError(e, OperationType.GET, 'tailorProjects');
    return await listLocalTailorProjects(userId);
  }
}

export async function updateTailorProject(
  userId: string,
  projectId: string,
  patch: Partial<TailorProject>,
): Promise<void> {
  if (!userId || userId === 'ghost') return;
  const updatedAt = Date.now();
  try {
    await updateDoc(doc(db, `users/${userId}/tailorProjects/${projectId}`), {
      ...patch,
      updatedAt,
    });
    const existing = await getLocalTailorProject(userId, projectId);
    if (existing) {
      await saveLocalTailorProject({ ...existing, ...patch, updatedAt });
    }
  } catch (e) {
    if (isFirestoreQuotaError(e)) {
      const existing = await getLocalTailorProject(userId, projectId);
      if (existing) {
        await saveLocalTailorProject({ ...existing, ...patch, updatedAt });
      }
      return;
    }
    handleFirestoreError(e, OperationType.WRITE, `tailorProjects/${projectId}`);
  }
}

// ─── Evidence Nodes ─────────────────────────────────────────────────────────

export async function addEvidenceNode(
  userId: string,
  projectId: string,
  node: Omit<EvidenceNode, 'id' | 'userId' | 'projectId' | 'createdAt' | 'updatedAt' | 'analysisStatus'>,
): Promise<EvidenceNode> {
  const id = uid();
  const now = Date.now();
  const evidence: EvidenceNode = {
    ...node,
    id,
    userId,
    projectId,
    analysisStatus: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  await saveTailorEvidenceLocal(evidence);

  const cloudPayload = slimEvidenceForFirestore(evidence);

  try {
    await setDoc(doc(projectCol(userId, projectId, 'evidenceNodes'), id), stripUndefined(cloudPayload));
    try {
      const nodes = await listEvidenceNodesFromFirestore(userId, projectId);
      const readConfidence = getReadConfidenceLabel(nodes.length);
      await updateTailorProject(userId, projectId, {
        evidenceCount: nodes.length,
        readConfidence,
      });
      const project = await getTailorProject(userId, projectId);
      if (project?.tasteGraphId) {
        await appendToTasteGraph(userId, project.tasteGraphId, { evidenceNodeIds: [id] });
      }
    } catch (postErr) {
      console.warn("MIMI // Tailor evidence post-write sync skipped:", postErr);
    }

    void createEvidenceAtom(userId, evidenceNodeToAtomInput(evidence, projectId)).catch((err) => {
      console.warn("MIMI // Tailor → EvidenceAtom mirror failed (non-blocking):", err);
    });

    await saveLocalEvidenceNode(evidence);
    return evidence;
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    if (isFirestoreQuotaError(e) || /offline/i.test(raw)) {
      const localOnly: EvidenceNode = {
        ...evidence,
        extractedMetadata: {
          ...(evidence.extractedMetadata || {}),
          storageTier: 'local_only',
          localMediaKey: id,
        },
      };
      await saveTailorEvidenceLocal(localOnly);
      await saveLocalEvidenceNode(localOnly);
      const archiveLocal = await listLocalEvidenceNodes(userId, projectId);
      const merged = mergeEvidenceWithLocal(archiveLocal, await listTailorEvidenceLocal(userId, projectId));
      const readConfidence = getReadConfidenceLabel(merged.length);
      await updateTailorProject(userId, projectId, {
        evidenceCount: merged.length,
        readConfidence,
      });
      const project = await getTailorProject(userId, projectId);
      if (project?.tasteGraphId) {
        await mergeLocalTasteGraphIds(userId, project.tasteGraphId, { evidenceNodeIds: [id] });
      }
      console.warn("MIMI // Tailor evidence cloud sync deferred; kept on device.", raw);
      return localOnly;
    }
    handleFirestoreError(e, OperationType.WRITE, `evidenceNodes/${id}`);
    throw e;
  }
}

async function listEvidenceNodesFromFirestore(
  userId: string,
  projectId: string,
): Promise<EvidenceNode[]> {
  const snap = await getDocs(projectCol(userId, projectId, 'evidenceNodes'));
  return snap.docs.map((d) => d.data() as EvidenceNode);
}

export async function listEvidenceNodes(userId: string, projectId: string): Promise<EvidenceNode[]> {
  if (!userId || userId === 'ghost') return [];
  const blobLocal = await listTailorEvidenceLocal(userId, projectId);
  try {
    const cloud = await listEvidenceNodesFromFirestore(userId, projectId);
    for (const node of cloud) await saveLocalEvidenceNode(node);
    return mergeEvidenceWithLocal(cloud, blobLocal);
  } catch (e) {
    if (isFirestoreQuotaError(e)) {
      const archiveLocal = await listLocalEvidenceNodes(userId, projectId);
      return mergeEvidenceWithLocal(archiveLocal, blobLocal);
    }
    if (blobLocal.length > 0) {
      console.warn("MIMI // Firestore evidence list failed; using local blob cache.", e);
      return blobLocal;
    }
    handleFirestoreError(e, OperationType.GET, 'evidenceNodes');
    return await listLocalEvidenceNodes(userId, projectId);
  }
}

export async function updateEvidenceNode(
  userId: string,
  projectId: string,
  nodeId: string,
  patch: Partial<EvidenceNode>,
): Promise<void> {
  const updatedAt = Date.now();
  try {
    await updateDoc(doc(projectCol(userId, projectId, 'evidenceNodes'), nodeId), {
      ...patch,
      updatedAt,
    });
    await updateLocalEvidenceNode(userId, projectId, nodeId, { ...patch, updatedAt });
  } catch (e) {
    if (isFirestoreQuotaError(e)) {
      await updateLocalEvidenceNode(userId, projectId, nodeId, { ...patch, updatedAt });
      return;
    }
    handleFirestoreError(e, OperationType.WRITE, `evidenceNodes/${nodeId}`);
  }
}

// ─── Observations ───────────────────────────────────────────────────────────

export async function saveObservations(
  userId: string,
  projectId: string,
  observations: Omit<Observation, 'id' | 'userId' | 'projectId' | 'createdAt'>[],
): Promise<Observation[]> {
  const saved: Observation[] = [];
  const ids: string[] = [];

  for (const obs of observations) {
    const id = uid();
    const full: Observation = {
      ...obs,
      id,
      userId,
      projectId,
      userStatus: obs.userStatus ?? 'suggested',
      createdAt: Date.now(),
    };
    try {
      await setDoc(doc(projectCol(userId, projectId, 'observations'), id), full);
    } catch (e) {
      if (!isFirestoreQuotaError(e)) throw e;
    }
    await saveLocalObservation(full);
    saved.push(full);
    ids.push(id);
  }

  const project = await getTailorProject(userId, projectId);
  if (project?.tasteGraphId) {
    await appendToTasteGraph(userId, project.tasteGraphId, { observationIds: ids });
  }
  return saved;
}

export async function listObservations(userId: string, projectId: string): Promise<Observation[]> {
  if (!userId || userId === 'ghost') return [];
  try {
    const snap = await getDocs(projectCol(userId, projectId, 'observations'));
    const observations = snap.docs.map((d) => d.data() as Observation);
    for (const obs of observations) await saveLocalObservation(obs);
    return observations;
  } catch (e) {
    if (isFirestoreQuotaError(e)) {
      return await listLocalObservations(userId, projectId);
    }
    handleFirestoreError(e, OperationType.GET, 'observations');
    return await listLocalObservations(userId, projectId);
  }
}

// ─── Pattern Clusters ───────────────────────────────────────────────────────

export async function savePatternClusters(
  userId: string,
  projectId: string,
  clusters: Omit<PatternCluster, 'id' | 'userId' | 'projectId' | 'createdAt' | 'updatedAt'>[],
): Promise<PatternCluster[]> {
  const saved: PatternCluster[] = [];
  const ids: string[] = [];

  for (const cluster of clusters) {
    const id = uid();
    const now = Date.now();
    const full: PatternCluster = {
      ...cluster,
      id,
      userId,
      projectId,
      userStatus: cluster.userStatus ?? 'suggested',
      userWeight: cluster.userWeight ?? 'medium',
      createdAt: now,
      updatedAt: now,
    };
    try {
      await setDoc(doc(projectCol(userId, projectId, 'patternClusters'), id), stripUndefined(full));
    } catch (e) {
      if (!isFirestoreQuotaError(e)) throw e;
    }
    await saveLocalPatternCluster(full);
    saved.push(full);
    ids.push(id);
  }

  const project = await getTailorProject(userId, projectId);
  if (project?.tasteGraphId) {
    await appendToTasteGraph(userId, project.tasteGraphId, { patternClusterIds: ids });
  }
  return saved;
}

export async function listPatternClusters(userId: string, projectId: string): Promise<PatternCluster[]> {
  if (!userId || userId === 'ghost') return [];
  try {
    const snap = await getDocs(projectCol(userId, projectId, 'patternClusters'));
    const clusters = snap.docs.map((d) => d.data() as PatternCluster);
    for (const cluster of clusters) await saveLocalPatternCluster(cluster);
    return clusters;
  } catch (e) {
    if (isFirestoreQuotaError(e)) {
      return await listLocalPatternClusters(userId, projectId);
    }
    handleFirestoreError(e, OperationType.GET, 'patternClusters');
    return await listLocalPatternClusters(userId, projectId);
  }
}

export async function updatePatternCluster(
  userId: string,
  projectId: string,
  clusterId: string,
  patch: Partial<PatternCluster>,
): Promise<void> {
  const updatedAt = Date.now();
  try {
    await updateDoc(
      doc(projectCol(userId, projectId, 'patternClusters'), clusterId),
      stripUndefined({
        ...patch,
        updatedAt,
      }),
    );
    await updateLocalPatternCluster(userId, projectId, clusterId, { ...patch, updatedAt });
  } catch (e) {
    if (isFirestoreQuotaError(e)) {
      await updateLocalPatternCluster(userId, projectId, clusterId, { ...patch, updatedAt });
      return;
    }
    handleFirestoreError(e, OperationType.WRITE, `patternClusters/${clusterId}`);
  }
}

// ─── Creative Laws ──────────────────────────────────────────────────────────

export async function saveCreativeLaws(
  userId: string,
  projectId: string,
  laws: Omit<CreativeLaw, 'id' | 'userId' | 'projectId' | 'createdAt' | 'updatedAt'>[],
): Promise<CreativeLaw[]> {
  const saved: CreativeLaw[] = [];
  const ids: string[] = [];

  for (const law of laws) {
    const id = uid();
    const now = Date.now();
    const full: CreativeLaw = {
      ...law,
      id,
      userId,
      projectId,
      userStatus: law.userStatus ?? 'suggested',
      createdAt: now,
      updatedAt: now,
    };
    try {
      await setDoc(doc(projectCol(userId, projectId, 'creativeLaws'), id), full);
    } catch (e) {
      if (!isFirestoreQuotaError(e)) throw e;
    }
    await saveLocalCreativeLaw(full);
    saved.push(full);
    ids.push(id);
  }

  const project = await getTailorProject(userId, projectId);
  if (project?.tasteGraphId) {
    await appendToTasteGraph(userId, project.tasteGraphId, { creativeLawIds: ids });
  }
  return saved;
}

export async function listCreativeLaws(userId: string, projectId: string): Promise<CreativeLaw[]> {
  if (!userId || userId === 'ghost') return [];
  try {
    const snap = await getDocs(projectCol(userId, projectId, 'creativeLaws'));
    const laws = snap.docs.map((d) => d.data() as CreativeLaw);
    for (const law of laws) await saveLocalCreativeLaw(law);
    return laws;
  } catch (e) {
    if (isFirestoreQuotaError(e)) {
      return await listLocalCreativeLaws(userId, projectId);
    }
    handleFirestoreError(e, OperationType.GET, 'creativeLaws');
    return await listLocalCreativeLaws(userId, projectId);
  }
}

export async function updateCreativeLaw(
  userId: string,
  projectId: string,
  lawId: string,
  patch: Partial<CreativeLaw>,
): Promise<void> {
  const updatedAt = Date.now();
  try {
    await updateDoc(
      doc(projectCol(userId, projectId, 'creativeLaws'), lawId),
      stripUndefined({
        ...patch,
        updatedAt,
      }),
    );
    await updateLocalCreativeLaw(userId, projectId, lawId, { ...patch, updatedAt });
  } catch (e) {
    if (isFirestoreQuotaError(e)) {
      await updateLocalCreativeLaw(userId, projectId, lawId, { ...patch, updatedAt });
      return;
    }
    handleFirestoreError(e, OperationType.WRITE, `creativeLaws/${lawId}`);
  }
}

// ─── Taste Graph Document ───────────────────────────────────────────────────

export async function createTasteGraph(userId: string, projectId?: string): Promise<TasteGraphDocument> {
  const id = uid();
  const now = Date.now();
  const graph: TasteGraphDocument = {
    id,
    userId,
    projectId,
    evidenceNodeIds: [],
    observationIds: [],
    patternClusterIds: [],
    creativeLawIds: [],
    fieldNoteIds: [],
    dollIds: [],
    dossierIds: [],
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await setDoc(doc(userCol(userId, 'tasteGraphs'), id), stripUndefined(graph));
  } catch (e) {
    if (!isFirestoreQuotaError(e)) throw e;
  }
  await saveLocalTasteGraph(graph);
  return graph;
}

export async function getTasteGraphDocument(
  userId: string,
  graphId: string,
): Promise<TasteGraphDocument | null> {
  if (!userId || userId === 'ghost') return null;
  try {
    const snap = await getDoc(doc(userCol(userId, 'tasteGraphs'), graphId));
    const graph = snap.exists() ? (snap.data() as TasteGraphDocument) : null;
    if (graph) await saveLocalTasteGraph(graph);
    return graph;
  } catch (e) {
    if (isFirestoreQuotaError(e)) {
      return await getLocalTasteGraph(userId, graphId);
    }
    handleFirestoreError(e, OperationType.GET, `tasteGraphs/${graphId}`);
    return await getLocalTasteGraph(userId, graphId);
  }
}

export async function appendToTasteGraph(
  userId: string,
  graphId: string,
  patch: Partial<
    Pick<
      TasteGraphDocument,
      | 'evidenceNodeIds'
      | 'observationIds'
      | 'patternClusterIds'
      | 'creativeLawIds'
      | 'fieldNoteIds'
      | 'dollIds'
      | 'dossierIds'
    >
  >,
): Promise<void> {
  const graph = await getTasteGraphDocument(userId, graphId);
  if (!graph) return;

  const mergeIds = (existing: string[], incoming?: string[]) =>
    incoming ? [...new Set([...existing, ...incoming])] : existing;

  const updatedGraph: TasteGraphDocument = {
    ...graph,
    evidenceNodeIds: mergeIds(graph.evidenceNodeIds, patch.evidenceNodeIds),
    observationIds: mergeIds(graph.observationIds, patch.observationIds),
    patternClusterIds: mergeIds(graph.patternClusterIds, patch.patternClusterIds),
    creativeLawIds: mergeIds(graph.creativeLawIds, patch.creativeLawIds),
    fieldNoteIds: mergeIds(graph.fieldNoteIds, patch.fieldNoteIds),
    dollIds: mergeIds(graph.dollIds, patch.dollIds),
    dossierIds: mergeIds(graph.dossierIds, patch.dossierIds),
    version: graph.version + 1,
    updatedAt: Date.now(),
  };

  try {
    await updateDoc(doc(userCol(userId, 'tasteGraphs'), graphId), {
      evidenceNodeIds: updatedGraph.evidenceNodeIds,
      observationIds: updatedGraph.observationIds,
      patternClusterIds: updatedGraph.patternClusterIds,
      creativeLawIds: updatedGraph.creativeLawIds,
      fieldNoteIds: updatedGraph.fieldNoteIds,
      dollIds: updatedGraph.dollIds,
      dossierIds: updatedGraph.dossierIds,
      version: updatedGraph.version,
      updatedAt: updatedGraph.updatedAt,
    });
  } catch (e) {
    if (!isFirestoreQuotaError(e)) {
      handleFirestoreError(e, OperationType.WRITE, `tasteGraphs/${graphId}`);
      return;
    }
  }
  await saveLocalTasteGraph(updatedGraph);
}

// ─── Field Notes ────────────────────────────────────────────────────────────

export async function createFieldNote(
  userId: string,
  note: Omit<FieldNote, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
): Promise<FieldNote> {
  const id = uid();
  const now = Date.now();
  const full: FieldNote = {
    ...note,
    id,
    userId,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(doc(userCol(userId, 'fieldNotes'), id), stripUndefined(full));

  if (note.projectId) {
    const project = await getTailorProject(userId, note.projectId);
    if (project?.tasteGraphId) {
      await appendToTasteGraph(userId, project.tasteGraphId, { fieldNoteIds: [id] });
    }
  }
  return full;
}

export async function listFieldNotes(userId: string, projectId?: string): Promise<FieldNote[]> {
  if (!userId || userId === 'ghost') return [];
  try {
    const col = userCol(userId, 'fieldNotes');
    const q = projectId
      ? query(col, where('projectId', '==', projectId), orderBy('updatedAt', 'desc'))
      : query(col, orderBy('updatedAt', 'desc'), limit(100));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => d.data() as FieldNote)
      .filter((n) => !n.archived);
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, 'fieldNotes');
    return [];
  }
}

// ─── Dolls ────────────────────────────────────────────────────────────────────

export async function saveDoll(
  userId: string,
  doll: Omit<Doll, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
): Promise<Doll> {
  const id = uid();
  const now = Date.now();
  const full: Doll = {
    ...doll,
    id,
    userId,
    maskIds: doll.maskIds ?? [],
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(doc(userCol(userId, 'dolls'), id), stripUndefined(full));
  await appendToTasteGraph(userId, doll.tasteGraphId, { dollIds: [id] });
  return full;
}

export async function updateDoll(
  userId: string,
  dollId: string,
  updates: Partial<Doll>
): Promise<void> {
  if (!userId || userId === 'ghost') return;
  try {
    const docRef = doc(userCol(userId, 'dolls'), dollId);
    await setDoc(docRef, { ...updates, updatedAt: Date.now() }, { merge: true });
  } catch (e) {
    handleFirestoreError(e, OperationType.UPDATE, 'dolls');
  }
}

export async function listDolls(userId: string, tasteGraphId?: string): Promise<Doll[]> {
  if (!userId || userId === 'ghost') return [];
  try {
    const col = userCol(userId, 'dolls');
    const q = tasteGraphId
      ? query(col, where('tasteGraphId', '==', tasteGraphId))
      : query(col, orderBy('updatedAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Doll);
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, 'dolls');
    return [];
  }
}

export async function getDoll(userId: string, dollId: string): Promise<Doll | null> {
  if (!userId || userId === 'ghost' || !dollId) return null;
  try {
    const snap = await getDoc(doc(userCol(userId, 'dolls'), dollId));
    return snap.exists() ? (snap.data() as Doll) : null;
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, 'dolls');
    return null;
  }
}

export async function saveDollMask(userId: string, mask: Omit<DollMask, 'id' | 'createdAt'>): Promise<DollMask> {
  const id = uid();
  const full: DollMask = { ...mask, id, createdAt: Date.now() };
  await setDoc(doc(userCol(userId, 'dollMasks'), id), full);
  const dollRef = doc(userCol(userId, 'dolls'), mask.dollId);
  const dollSnap = await getDoc(dollRef);
  if (dollSnap.exists()) {
    const doll = dollSnap.data() as Doll;
    await updateDoc(dollRef, {
      maskIds: [...(doll.maskIds ?? []), id],
      updatedAt: Date.now(),
    });
  }
  return full;
}

export async function listDollMasks(userId: string, dollId?: string): Promise<DollMask[]> {
  if (!userId || userId === 'ghost') return [];
  try {
    const col = userCol(userId, 'dollMasks');
    const q = dollId
      ? query(col, where('dollId', '==', dollId), limit(40))
      : query(col, limit(80));
    const snap = await getDocs(q);
    const masks = snap.docs.map((d) => d.data() as DollMask);
    return dollId ? masks.filter((m) => m.dollId === dollId) : masks;
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, 'dollMasks');
    return [];
  }
}

/** Ensure a Doll has default role masks; returns current masks (existing or newly seeded). */
export async function ensureDefaultDollMasks(userId: string, doll: Doll): Promise<DollMask[]> {
  if (!userId || userId === 'ghost') return [];
  const existing = await listDollMasks(userId, doll.id);
  if (existing.length > 0) return existing;

  const { defaultMaskSeedsForDoll } = await import('./dollEngine');
  const seeds = defaultMaskSeedsForDoll(doll);
  const created: DollMask[] = [];
  for (const seed of seeds) {
    created.push(await saveDollMask(userId, seed));
  }
  if (created[0] && !doll.activeMaskId) {
    await updateDoll(userId, doll.id, { activeMaskId: created[0].id });
  }
  return created;
}

// ─── Creative Dossier ─────────────────────────────────────────────────────────

export async function saveCreativeDossier(
  userId: string,
  dossier: Omit<CreativeDossier, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
): Promise<CreativeDossier> {
  const id = uid();
  const now = Date.now();
  const full: CreativeDossier = { ...dossier, id, userId, createdAt: now, updatedAt: now };
  await setDoc(doc(projectCol(userId, dossier.projectId, 'creativeDossiers'), id), full);
  await appendToTasteGraph(userId, dossier.tasteGraphId, { dossierIds: [id] });
  return full;
}

export async function getCreativeDossier(
  userId: string,
  projectId: string,
  dossierId: string,
): Promise<CreativeDossier | null> {
  try {
    const snap = await getDoc(doc(projectCol(userId, projectId, 'creativeDossiers'), dossierId));
    return snap.exists() ? (snap.data() as CreativeDossier) : null;
  } catch (e) {
    return null;
  }
}

export async function listCreativeDossiers(userId: string, projectId: string): Promise<CreativeDossier[]> {
  try {
    const snap = await getDocs(projectCol(userId, projectId, 'creativeDossiers'));
    return snap.docs.map((d) => d.data() as CreativeDossier);
  } catch (e) {
    return [];
  }
}

// ─── Artwork Matches & Marketing Assets ───────────────────────────────────────

export async function saveArtworkMatches(
  userId: string,
  matches: Omit<ArtworkMatch, 'id' | 'userId' | 'createdAt'>[],
): Promise<ArtworkMatch[]> {
  const saved: ArtworkMatch[] = [];
  for (const match of matches) {
    const id = uid();
    const full: ArtworkMatch = { ...match, id, userId, createdAt: Date.now() };
    await setDoc(doc(userCol(userId, 'artworkMatches'), id), full);
    saved.push(full);
  }
  return saved;
}

export async function listArtworkMatches(userId: string, projectId?: string): Promise<ArtworkMatch[]> {
  if (!userId || userId === 'ghost') return [];
  try {
    const col = userCol(userId, 'artworkMatches');
    const q = projectId
      ? query(col, where('projectId', '==', projectId))
      : query(col, orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ArtworkMatch);
  } catch (e) {
    return [];
  }
}

export async function saveMarketingAsset(
  userId: string,
  asset: Omit<MarketingAsset, 'id' | 'userId' | 'createdAt'>,
): Promise<MarketingAsset> {
  const id = uid();
  const full: MarketingAsset = { ...asset, id, userId, createdAt: Date.now() };
  await setDoc(doc(userCol(userId, 'marketingAssets'), id), stripUndefined(full));
  return full;
}

// ─── Doll Scenes (Omni Loop time travel) ─────────────────────────────────────

export async function saveDollScene(
  userId: string,
  scene: Omit<DollScene, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
): Promise<DollScene> {
  const id = uid();
  const now = Date.now();
  const full: DollScene = {
    ...scene,
    id,
    userId,
    friendUserIds: scene.friendUserIds ?? [],
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(doc(userCol(userId, 'dollScenes'), id), stripUndefined(full));
  return full;
}

export async function updateDollScene(
  userId: string,
  sceneId: string,
  patch: Partial<DollScene>,
): Promise<void> {
  if (!userId || userId === 'ghost') return;
  try {
    await setDoc(
      doc(userCol(userId, 'dollScenes'), sceneId),
      stripUndefined({ ...patch, updatedAt: Date.now() }),
      { merge: true },
    );
  } catch (e) {
    handleFirestoreError(e, OperationType.UPDATE, 'dollScenes');
  }
}

export async function listDollScenes(
  userId: string,
  opts?: { dollId?: string; visibility?: 'public' },
): Promise<DollScene[]> {
  if (!userId || userId === 'ghost') return [];
  try {
    const col = userCol(userId, 'dollScenes');
    let q;
    if (opts?.dollId) {
      q = query(col, where('dollId', '==', opts.dollId), orderBy('createdAt', 'desc'), limit(50));
    } else if (opts?.visibility === 'public') {
      q = query(col, where('visibility', '==', 'public'), orderBy('createdAt', 'desc'), limit(50));
    } else {
      q = query(col, orderBy('createdAt', 'desc'), limit(50));
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as DollScene);
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, 'dollScenes');
    return [];
  }
}

export async function getDollScene(userId: string, sceneId: string): Promise<DollScene | null> {
  if (!userId || userId === 'ghost' || !sceneId) return null;
  try {
    const snap = await getDoc(doc(userCol(userId, 'dollScenes'), sceneId));
    return snap.exists() ? (snap.data() as DollScene) : null;
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, 'dollScenes');
    return null;
  }
}

// ─── Generation Jobs ────────────────────────────────────────────────────────

export async function createGenerationJob(
  userId: string,
  projectId: string,
  jobType: GenerationJob['jobType'],
): Promise<GenerationJob> {
  const id = uid();
  const now = Date.now();
  const job: GenerationJob = {
    id,
    userId,
    projectId,
    jobType,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(doc(userCol(userId, 'generationJobs'), id), stripUndefined(job));
  return job;
}

export async function updateGenerationJob(
  userId: string,
  jobId: string,
  patch: Partial<GenerationJob>,
): Promise<void> {
  await updateDoc(
    doc(userCol(userId, 'generationJobs'), jobId),
    stripUndefined({
      ...patch,
      updatedAt: Date.now(),
    }),
  );
}

// ─── Curation helpers ─────────────────────────────────────────────────────────

export async function appendCurationEvent(
  userId: string,
  projectId: string,
  event: Parameters<typeof buildCurationEventPayload>[0],
): Promise<Record<string, unknown>> {
  const payload = buildCurationEventPayload({
    ...event,
    userId,
    projectId,
  });
  const eventId = String(payload.id);
  await setDoc(
    doc(projectCol(userId, projectId, 'curationEvents'), eventId),
    payload,
  );
  return payload;
}

export async function curatePatternCluster(
  userId: string,
  projectId: string,
  clusterId: string,
  action: UserCurationStatus,
  annotation?: string,
  weight?: UserWeight,
): Promise<void> {
  const patch = buildPatternClusterCurationPatch(action, annotation, weight);
  await updateDoc(
    doc(projectCol(userId, projectId, 'patternClusters'), clusterId),
    patch,
  );

  // Status-only events must persist even when annotation/weight are omitted.
  await appendCurationEvent(userId, projectId, {
    userId,
    projectId,
    targetType: 'pattern_cluster',
    targetId: clusterId,
    kind: action === 'renamed' ? 'rename' : 'status_change',
    status: action,
    claimType:
      action === 'accepted' || action === 'renamed'
        ? 'user_confirmed'
        : action === 'rejected'
          ? 'user_rejected'
          : undefined,
    annotation,
    weight,
  });

  if (action === 'rejected' && annotation) {
    await createFieldNote(userId, {
      projectId,
      title: 'Curation correction',
      body: annotation,
      noteType: 'correction',
      linkedPatternClusterIds: [clusterId],
      linkedEvidenceNodeIds: [],
      linkedCreativeLawIds: [],
      linkedDollIds: [],
      tags: ['curation'],
    });
  }
}

/**
 * Split a pattern cluster into disjoint partitions. Rejects invalid splits.
 * Both new clusters are persisted; the source cluster is marked `split`.
 */
export async function splitPatternCluster(
  userId: string,
  projectId: string,
  clusterId: string,
  partitions: PatternSplitPartition[],
): Promise<PatternCluster[]> {
  const clusters = await listPatternClusters(userId, projectId);
  const source = clusters.find((c) => c.id === clusterId);
  if (!source) {
    throw new Error(`Pattern cluster not found: ${clusterId}`);
  }

  const validation = validatePatternSplit(source.observationIds, partitions);
  if (validation.ok === false) {
    throw new Error(validation.reason);
  }

  const created: PatternCluster[] = [];
  for (const part of validation.partitions) {
    const saved = await savePatternClusters(userId, projectId, [
      {
        name: part.name,
        description: source.description,
        category: source.category,
        observationIds: part.observationIds,
        supportingEvidenceNodeIds: source.supportingEvidenceNodeIds,
        frequency: part.observationIds.length,
        confidence: source.confidence,
        possibleInterpretations: source.possibleInterpretations,
        claimType: 'observed',
        userStatus: 'suggested',
        userWeight: source.userWeight ?? 'medium',
      },
    ]);
    created.push(...saved);
  }

  await updatePatternCluster(userId, projectId, clusterId, {
    userStatus: 'split',
  });

  await appendCurationEvent(userId, projectId, {
    userId,
    projectId,
    targetType: 'pattern_cluster',
    targetId: clusterId,
    kind: 'split',
    status: 'split',
    annotation: created.map((c) => c.id).join(','),
  });

  return created;
}

/** List dolls bound to a project's taste graph — never "first of all dolls". */
export async function listDollsForProject(
  userId: string,
  project: Pick<TailorProject, 'id' | 'tasteGraphId'>,
): Promise<Doll[]> {
  if (!project.tasteGraphId) {
    throw new Error(`Tailor project ${project.id} has no tasteGraphId`);
  }
  assertProjectGraphBinding(project, project.tasteGraphId);
  return listDolls(userId, project.tasteGraphId);
}

// ─── Compile canonical Tailor profile + legacy projection from graph ──────────

export async function exportTailorProfileFromGraph(
  userId: string,
  projectId: string,
): Promise<TailorProfile> {
  const [project, evidence, observations, clusters, laws] = await Promise.all([
    getTailorProject(userId, projectId),
    listEvidenceNodes(userId, projectId),
    listObservations(userId, projectId),
    listPatternClusters(userId, projectId),
    listCreativeLaws(userId, projectId),
  ]);

  if (!project) throw new Error(`Tailor project not found: ${projectId}`);

  return compileTailorProfileFromGraph({
    project,
    evidence,
    observations,
    clusters,
    laws,
  });
}

export async function exportTailorDraftFromGraph(
  userId: string,
  projectId: string,
): Promise<TailorLogicDraft> {
  const profile = await exportTailorProfileFromGraph(userId, projectId);
  return tailorProfileToLegacyDraft(profile);
}
