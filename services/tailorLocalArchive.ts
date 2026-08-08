/**
 * Local IndexedDB archive for Tailor chamber data when Firestore free-tier quota is exhausted.
 * Work persists on-device until cloud quota resets; successful cloud reads are mirrored here.
 */
import type {
  CreativeLaw,
  EvidenceNode,
  Observation,
  PatternCluster,
  TailorProject,
  TasteGraphDocument,
} from "../types";

const DB_NAME = "MimiTailorLocal";
const DB_VERSION = 1;

const STORES = {
  projects: "projects",
  evidenceNodes: "evidence_nodes",
  observations: "observations",
  patternClusters: "pattern_clusters",
  creativeLaws: "creative_laws",
  tasteGraphs: "taste_graphs",
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("MIMI // Tailor Local: IndexedDB not available."));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      for (const name of Object.values(STORES)) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: "id" });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

async function putItem<T extends { id: string }>(store: StoreName, item: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getItem<T extends { id: string }>(store: StoreName, id: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(id);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => resolve(null);
  });
}

async function getAllItems<T>(store: StoreName): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => resolve([]);
  });
}

// ─── Projects ───────────────────────────────────────────────────────────────

export async function saveLocalTailorProject(project: TailorProject): Promise<void> {
  await putItem(STORES.projects, project);
}

export async function getLocalTailorProject(
  userId: string,
  projectId: string,
): Promise<TailorProject | null> {
  const project = await getItem<TailorProject>(STORES.projects, projectId);
  if (!project || project.userId !== userId) return null;
  return project;
}

export async function listLocalTailorProjects(userId: string): Promise<TailorProject[]> {
  const all = await getAllItems<TailorProject>(STORES.projects);
  return all
    .filter((p) => p.userId === userId)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

// ─── Evidence nodes ─────────────────────────────────────────────────────────

export async function saveLocalEvidenceNode(node: EvidenceNode): Promise<void> {
  await putItem(STORES.evidenceNodes, node);
}

export async function listLocalEvidenceNodes(
  userId: string,
  projectId: string,
): Promise<EvidenceNode[]> {
  const all = await getAllItems<EvidenceNode>(STORES.evidenceNodes);
  return all.filter((n) => n.userId === userId && n.projectId === projectId);
}

export async function updateLocalEvidenceNode(
  userId: string,
  projectId: string,
  nodeId: string,
  patch: Partial<EvidenceNode>,
): Promise<void> {
  const existing = await getItem<EvidenceNode>(STORES.evidenceNodes, nodeId);
  if (!existing || existing.userId !== userId || existing.projectId !== projectId) return;
  await putItem(STORES.evidenceNodes, { ...existing, ...patch, updatedAt: Date.now() });
}

// ─── Observations ───────────────────────────────────────────────────────────

export async function saveLocalObservation(obs: Observation): Promise<void> {
  await putItem(STORES.observations, obs);
}

export async function listLocalObservations(
  userId: string,
  projectId: string,
): Promise<Observation[]> {
  const all = await getAllItems<Observation>(STORES.observations);
  return all.filter((o) => o.userId === userId && o.projectId === projectId);
}

// ─── Pattern clusters ───────────────────────────────────────────────────────

export async function saveLocalPatternCluster(cluster: PatternCluster): Promise<void> {
  await putItem(STORES.patternClusters, cluster);
}

export async function listLocalPatternClusters(
  userId: string,
  projectId: string,
): Promise<PatternCluster[]> {
  const all = await getAllItems<PatternCluster>(STORES.patternClusters);
  return all.filter((c) => c.userId === userId && c.projectId === projectId);
}

export async function updateLocalPatternCluster(
  userId: string,
  projectId: string,
  clusterId: string,
  patch: Partial<PatternCluster>,
): Promise<void> {
  const existing = await getItem<PatternCluster>(STORES.patternClusters, clusterId);
  if (!existing || existing.userId !== userId || existing.projectId !== projectId) return;
  await putItem(STORES.patternClusters, { ...existing, ...patch, updatedAt: Date.now() });
}

// ─── Creative laws ──────────────────────────────────────────────────────────

export async function saveLocalCreativeLaw(law: CreativeLaw): Promise<void> {
  await putItem(STORES.creativeLaws, law);
}

export async function listLocalCreativeLaws(
  userId: string,
  projectId: string,
): Promise<CreativeLaw[]> {
  const all = await getAllItems<CreativeLaw>(STORES.creativeLaws);
  return all.filter((l) => l.userId === userId && l.projectId === projectId);
}

export async function updateLocalCreativeLaw(
  userId: string,
  projectId: string,
  lawId: string,
  patch: Partial<CreativeLaw>,
): Promise<void> {
  const existing = await getItem<CreativeLaw>(STORES.creativeLaws, lawId);
  if (!existing || existing.userId !== userId || existing.projectId !== projectId) return;
  await putItem(STORES.creativeLaws, { ...existing, ...patch, updatedAt: Date.now() });
}

// ─── Taste graphs ───────────────────────────────────────────────────────────

export async function saveLocalTasteGraph(graph: TasteGraphDocument): Promise<void> {
  await putItem(STORES.tasteGraphs, graph);
}

export async function getLocalTasteGraph(
  userId: string,
  graphId: string,
): Promise<TasteGraphDocument | null> {
  const graph = await getItem<TasteGraphDocument>(STORES.tasteGraphs, graphId);
  if (!graph || graph.userId !== userId) return null;
  return graph;
}

export async function mergeLocalTasteGraphIds(
  userId: string,
  graphId: string,
  patch: Partial<
    Pick<
      TasteGraphDocument,
      | "evidenceNodeIds"
      | "observationIds"
      | "patternClusterIds"
      | "creativeLawIds"
      | "fieldNoteIds"
      | "dollIds"
      | "dossierIds"
    >
  >,
): Promise<void> {
  const graph = await getLocalTasteGraph(userId, graphId);
  if (!graph) return;
  const mergeIds = (existing: string[], incoming?: string[]) =>
    incoming ? [...new Set([...existing, ...incoming])] : existing;
  await saveLocalTasteGraph({
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
  });
}
