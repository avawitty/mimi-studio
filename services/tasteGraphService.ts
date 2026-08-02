import { collection, doc, setDoc, getDocs, getDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebaseInit";
import { handleFirestoreError, OperationType } from "./firebaseUtils";
import { TasteGraphNode, TasteGraphEdge } from "../types";
import {
  compileTasteFootprint,
  emptyTasteFootprint,
  type CompileTasteFootprintInput,
  type TasteFootprint,
} from "../lib/tasteFootprint";

export type { TasteFootprint, CompileTasteFootprintInput };
export { compileTasteFootprint, emptyTasteFootprint };

export const saveTasteGraph = async (uid: string, nodes: TasteGraphNode[], edges: TasteGraphEdge[], options?: { incremental?: boolean }) => {
  if (!uid || uid === 'ghost') return;

  const nodesCol = collection(db, `users/${uid}/tasteGraphNodes`);
  const edgesCol = collection(db, `users/${uid}/tasteGraphEdges`);

  try {
    let currentBatch = writeBatch(db);
    let opCount = 0;

    const commitBatch = async () => {
      if (opCount > 0) {
        await currentBatch.commit();
        currentBatch = writeBatch(db);
        opCount = 0;
      }
    };

    const addOp = async (op: () => void) => {
      op();
      opCount++;
      if (opCount >= 490) {
        await commitBatch();
      }
    };

    if (!options?.incremental) {
      const oldNodes = await getDocs(nodesCol);
      const oldEdges = await getDocs(edgesCol);
      for (const d of oldNodes.docs) {
        await addOp(() => currentBatch.delete(d.ref));
      }
      for (const d of oldEdges.docs) {
        await addOp(() => currentBatch.delete(d.ref));
      }
    }

    for (const n of nodes) {
      await addOp(() => currentBatch.set(doc(nodesCol, n.id), n, { merge: !!options?.incremental }));
    }
    for (const e of edges) {
      await addOp(() => currentBatch.set(doc(edgesCol, `${e.source}_${e.target}`), e, { merge: !!options?.incremental }));
    }

    await commitBatch();
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `users/${uid}/tasteGraph`);
  }
};

export const appendTasteGraphNodes = async (uid: string, nodes: TasteGraphNode[], edges: TasteGraphEdge[] = []) => {
  return saveTasteGraph(uid, nodes, edges, { incremental: true });
};

export const getTasteGraph = async (uid: string): Promise<{ nodes: TasteGraphNode[], edges: TasteGraphEdge[] }> => {
  if (!uid || uid === 'ghost') return { nodes: [], edges: [] };

  try {
    const nodesSnap = await getDocs(collection(db, `users/${uid}/tasteGraphNodes`));
    const edgesSnap = await getDocs(collection(db, `users/${uid}/tasteGraphEdges`));

    return {
      nodes: nodesSnap.docs.map(d => d.data() as TasteGraphNode),
      edges: edgesSnap.docs.map(d => d.data() as TasteGraphEdge)
    };
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, `users/${uid}/tasteGraph`);
    return { nodes: [], edges: [] };
  }
};

export const updateTasteGraphNodeStatus = async (uid: string, nodeId: string, status: 'accepted' | 'rejected') => {
  if (!uid || uid === 'ghost') return;
  try {
    const nodeRef = doc(db, `users/${uid}/tasteGraphNodes`, nodeId);
    await setDoc(nodeRef, { userStatus: status }, { merge: true });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `users/${uid}/tasteGraphNodes/${nodeId}`);
  }
};

const FOOTPRINT_DOC = "footprint";

function footprintDocRef(uid: string) {
  return doc(db, `users/${uid}/tasteMeta`, FOOTPRINT_DOC);
}

function coerceStoredFootprint(raw: unknown): TasteFootprint | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  return compileTasteFootprint({
    nodes: Array.isArray(data.plottedAnchors)
      ? (data.plottedAnchors as CompileTasteFootprintInput["nodes"])
      : [],
    points: Array.isArray(data.listedEmbeddings)
      ? (data.listedEmbeddings as CompileTasteFootprintInput["points"])
      : [],
    clusters: Array.isArray(data.patternClusters)
      ? (data.patternClusters as CompileTasteFootprintInput["clusters"])
      : [],
    dimension: typeof data.dimension === "number" ? data.dimension : 0,
    compiledAt: typeof data.compiledAt === "number" ? data.compiledAt : Date.now(),
    source: "stored",
  });
}

/** Persist a compiled Taste Footprint for the map-side ledger. */
export const saveTasteFootprint = async (uid: string, footprint: TasteFootprint): Promise<void> => {
  if (!uid || uid === "ghost") return;
  try {
    await setDoc(
      footprintDocRef(uid),
      {
        ...footprint,
        source: "stored",
        updatedAt: Date.now(),
      },
      { merge: true },
    );
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `users/${uid}/tasteMeta/${FOOTPRINT_DOC}`);
  }
};

/** Load the last compiled Taste Footprint, if any. */
export const getTasteFootprint = async (uid: string): Promise<TasteFootprint | null> => {
  if (!uid || uid === "ghost") return null;
  try {
    const snap = await getDoc(footprintDocRef(uid));
    if (!snap.exists()) return null;
    return coerceStoredFootprint(snap.data());
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, `users/${uid}/tasteMeta/${FOOTPRINT_DOC}`);
    return null;
  }
};

/**
 * Compile footprint from live streams, optionally persist, and return the compiled doc.
 * Call after extract / re-scry so Plotted Anchors · Listed Embeddings · Retrieved Tags · Pattern Clusters stay in sync.
 */
export const compileAndSaveTasteFootprint = async (
  uid: string | null | undefined,
  input: CompileTasteFootprintInput,
): Promise<TasteFootprint> => {
  const footprint = compileTasteFootprint({
    ...input,
    compiledAt: Date.now(),
    source: "live",
  });
  if (uid && uid !== "ghost") {
    await saveTasteFootprint(uid, footprint);
    return { ...footprint, source: "stored" };
  }
  return footprint;
};

