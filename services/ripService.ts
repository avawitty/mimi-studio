import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebaseInit";
import { handleFirestoreError, OperationType, sanitizeFirestoreData } from "./firebaseUtils";
import type { RipReading } from "../types";
import { buildPublicRipSnapshot, buildRipReadingDraft, type RipBuildInput } from "./ripEngine";

const uid = () =>
  crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function ripCol(userId: string) {
  return collection(db, `users/${userId}/ripReadings`);
}

export async function saveRipReading(
  userId: string,
  reading: Omit<RipReading, "id" | "userId" | "createdAt" | "updatedAt">,
): Promise<RipReading> {
  const id = uid();
  const now = Date.now();
  const full: RipReading = {
    ...reading,
    id,
    userId,
    visibility: reading.visibility || "private",
    createdAt: now,
    updatedAt: now,
  };
  // Firestore rejects `undefined` field values; optional ids (project/taste/doll)
  // are often absent for users without a bound Doll.
  await setDoc(doc(ripCol(userId), id), sanitizeFirestoreData(full));
  return full;
}

export async function updateRipReading(
  userId: string,
  ripId: string,
  updates: Partial<RipReading>,
): Promise<void> {
  if (!userId || userId === "ghost") return;
  try {
    await setDoc(
      doc(ripCol(userId), ripId),
      sanitizeFirestoreData({ ...updates, updatedAt: Date.now() }),
      { merge: true },
    );
  } catch (e) {
    handleFirestoreError(e, OperationType.UPDATE, "ripReadings");
  }
}

export async function getRipReading(
  userId: string,
  ripId: string,
): Promise<RipReading | null> {
  if (!userId || userId === "ghost" || !ripId) return null;
  try {
    const snap = await getDoc(doc(ripCol(userId), ripId));
    return snap.exists() ? (snap.data() as RipReading) : null;
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, "ripReadings");
    return null;
  }
}

export async function listRipReadings(userId: string): Promise<RipReading[]> {
  if (!userId || userId === "ghost") return [];
  try {
    const q = query(ripCol(userId), orderBy("updatedAt", "desc"), limit(30));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as RipReading);
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, "ripReadings");
    return [];
  }
}

/** Build + persist a private Rip reading from existing Taste Graph material. */
export async function generateRipReading(
  input: RipBuildInput,
): Promise<RipReading> {
  const draft = buildRipReadingDraft(input);
  return saveRipReading(input.userId, draft);
}

export { buildPublicRipSnapshot, buildRipReadingDraft };
export type { RipBuildInput };
