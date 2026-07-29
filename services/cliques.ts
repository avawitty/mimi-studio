import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db, auth } from "./firebaseInit";
import { handleFirestoreError, OperationType } from "./firebaseUtils";

export interface Clique {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  memberIds: string[];
  createdAt: number;
  updatedAt: number;
}

const cliqueCollection = "cliques";

export const createClique = async (
  name: string,
  description?: string,
): Promise<Clique | null> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Must be logged in to create a clique");

  const id = `${currentUser.uid}_${Date.now()}`;
  const now = Date.now();
  const clique: Clique = {
    id,
    name: name.trim(),
    description: description?.trim() || "",
    ownerId: currentUser.uid,
    memberIds: [currentUser.uid],
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, cliqueCollection, id), clique);
    return clique;
  } catch (e) {
    handleFirestoreError(e, OperationType.CREATE, cliqueCollection);
    return null;
  }
};

export const fetchCliques = async (userId: string): Promise<Clique[]> => {
  try {
    const q = query(
      collection(db, cliqueCollection),
      where("ownerId", "==", userId),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Clique);
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, cliqueCollection);
    return [];
  }
};

export const subscribeToCliques = (
  userId: string,
  callback: (cliques: Clique[]) => void,
) => {
  const q = query(
    collection(db, cliqueCollection),
    where("ownerId", "==", userId),
  );
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => d.data() as Clique)),
    (error: any) => {
      if (error.code === "permission-denied" && !auth.currentUser) return;
      console.error("MIMI // Cliques subscription error", error);
    },
  );
};

export const updateClique = async (
  cliqueId: string,
  updates: Partial<Pick<Clique, "name" | "description">>,
): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Must be logged in");

  try {
    await updateDoc(doc(db, cliqueCollection, cliqueId), {
      ...updates,
      updatedAt: Date.now(),
    });
  } catch (e) {
    handleFirestoreError(e, OperationType.UPDATE, cliqueCollection);
  }
};

export const addMemberToClique = async (
  cliqueId: string,
  memberId: string,
): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Must be logged in");

  try {
    await updateDoc(doc(db, cliqueCollection, cliqueId), {
      memberIds: arrayUnion(memberId),
      updatedAt: Date.now(),
    });
  } catch (e) {
    handleFirestoreError(e, OperationType.UPDATE, cliqueCollection);
  }
};

export const removeMemberFromClique = async (
  cliqueId: string,
  memberId: string,
): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Must be logged in");

  try {
    await updateDoc(doc(db, cliqueCollection, cliqueId), {
      memberIds: arrayRemove(memberId),
      updatedAt: Date.now(),
    });
  } catch (e) {
    handleFirestoreError(e, OperationType.UPDATE, cliqueCollection);
  }
};

export const deleteClique = async (cliqueId: string): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Must be logged in");

  try {
    await deleteDoc(doc(db, cliqueCollection, cliqueId));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, cliqueCollection);
  }
};
