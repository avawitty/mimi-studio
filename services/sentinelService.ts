import { db } from "./firebaseInit";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { DossierArtifact } from "../types";

export const identifyDormantFragments = async (uid: string) => {
  try {
    const q = query(collection(db, "dossier_artifacts"), where("userId", "==", uid));
    const snap = await getDocs(q);
    const artifacts = snap.docs.map(d => ({ id: d.id, ...d.data() } as DossierArtifact));

    // A fragment is dormant if it has no stackIds (not clustered) and is not already marked dormant
    const dormant = artifacts.filter(a => (!a.stackIds || a.stackIds.length === 0) && a.status !== 'dormant');
    
    for (const artifact of dormant) {
      await updateDoc(doc(db, "dossier_artifacts", artifact.id), { status: 'dormant' });
    }
    
    return dormant;
  } catch (e) {
    console.error("MIMI // Failed to identify dormant fragments:", e);
    return [];
  }
};

export const wakeDormantFragments = async (uid: string) => {
  try {
    const q = query(collection(db, "dossier_artifacts"), where("userId", "==", uid), where("status", "==", "dormant"));
    const snap = await getDocs(q);
    const dormant = snap.docs.map(d => ({ id: d.id, ...d.data() } as DossierArtifact));
    
    // Logic to wake them up: if they are now in a stack, mark them active
    for (const artifact of dormant) {
      if (artifact.stackIds && artifact.stackIds.length > 0) {
          await updateDoc(doc(db, "dossier_artifacts", artifact.id), { status: 'active' });
      }
    }
  } catch (e) {
    console.error("MIMI // Failed to wake dormant fragments:", e);
  }
};
