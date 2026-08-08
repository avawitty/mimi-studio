import type { Firestore } from "firebase-admin/firestore";
import type { EvidenceNode, Observation } from "../../types.js";

export async function loadProjectEvidenceServer(
  db: Firestore,
  userId: string,
  projectId: string,
): Promise<EvidenceNode[]> {
  const snap = await db
    .collection(`users/${userId}/tailorProjects/${projectId}/evidenceNodes`)
    .get();
  return snap.docs.map((doc) => doc.data() as EvidenceNode);
}

export async function loadProjectObservationsServer(
  db: Firestore,
  userId: string,
  projectId: string,
): Promise<Observation[]> {
  const snap = await db
    .collection(`users/${userId}/tailorProjects/${projectId}/observations`)
    .get();
  return snap.docs.map((doc) => doc.data() as Observation);
}

export async function loadTasteModelSnapshotServer(
  db: Firestore,
  userId: string,
  projectId?: string,
): Promise<Record<string, unknown> | null> {
  const docId = projectId ? `project-${projectId}` : "global";
  const snap = await db
    .doc(`users/${userId}/tasteModelSnapshots/${docId}`)
    .get();
  if (!snap.exists) return null;
  return snap.data() as Record<string, unknown>;
}
