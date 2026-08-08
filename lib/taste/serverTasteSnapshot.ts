/**
 * Server-side TasteModelSnapshot reads (Firebase Admin).
 */
import type { TasteModelSnapshot } from "../tasteModel/contracts";

type AdminDb = {
  collection: (path: string) => {
    doc: (id: string) => {
      collection: (sub: string) => {
        doc: (subId: string) => {
          get: () => Promise<{ exists: boolean; data: () => unknown }>;
        };
      };
    };
  };
};

export async function getServerTasteModelSnapshot(
  db: AdminDb,
  userId: string,
  scope: "global" | { projectId: string } = "global",
): Promise<TasteModelSnapshot | null> {
  if (!userId || userId === "ghost") return null;

  const docId =
    scope === "global" ? "global" : `project-${scope.projectId}`;

  try {
    const snap = await db
      .collection("users")
      .doc(userId)
      .collection("tasteModelSnapshots")
      .doc(docId)
      .get();

    if (!snap.exists) return null;
    return snap.data() as TasteModelSnapshot;
  } catch {
    return null;
  }
}
