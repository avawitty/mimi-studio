import { collection, doc, setDoc, getDocs, writeBatch } from "firebase/firestore";
import { db, auth } from "./firebaseInit";
import { handleFirestoreError, OperationType } from "./firebaseUtils";
import { TasteGraphNode, TasteGraphEdge } from "../types";

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

