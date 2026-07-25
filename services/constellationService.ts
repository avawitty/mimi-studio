import { collection, doc, setDoc, getDocs, deleteDoc } from "firebase/firestore";
import { db, auth } from "./firebaseInit";
import { handleFirestoreError, OperationType } from "./firebaseUtils";
import { Constellation } from "../types";

export const saveConstellation = async (constellation: Constellation) => {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  try {
    await setDoc(doc(db, `users/${uid}/constellations`, constellation.id), constellation);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `users/${uid}/constellations`);
  }
};

export const getConstellations = async (): Promise<Constellation[]> => {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];

  try {
    const snap = await getDocs(collection(db, `users/${uid}/constellations`));
    return snap.docs.map(d => d.data() as Constellation);
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, `users/${uid}/constellations`);
    return [];
  }
};

export const deleteConstellation = async (id: string) => {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  try {
    await deleteDoc(doc(db, `users/${uid}/constellations`, id));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, `users/${uid}/constellations`);
  }
};
