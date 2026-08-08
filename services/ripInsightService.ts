import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebaseInit";
import { handleFirestoreError, OperationType, sanitizeFirestoreData } from "./firebaseUtils";
import type { RipInverseFunction, RipSavableInsight, RipSavableInsightKind } from "../types";

const uid = () =>
  crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function insightCol(userId: string) {
  return collection(db, `users/${userId}/ripInsights`);
}

export const RIP_INSIGHTS_CHANGED = "mimi:rip-insights-changed";
export const RIP_INSIGHTS_SOFT_CAP = 48;

function emitChanged(ownerUid: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(RIP_INSIGHTS_CHANGED, { detail: { ownerUid } }),
  );
}

export function buildRipInsightId(input: {
  ripReadingId: string;
  kind: RipSavableInsightKind;
  value: string;
}): string {
  const slug = input.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48);
  return `rip_${input.ripReadingId}_${input.kind}_${slug}`;
}

export async function listRipInsights(userId: string): Promise<RipSavableInsight[]> {
  if (!userId || userId === "ghost") return [];
  try {
    const q = query(insightCol(userId), orderBy("savedAt", "desc"), limit(RIP_INSIGHTS_SOFT_CAP));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as RipSavableInsight);
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, "ripInsights");
    return [];
  }
}

export async function saveRipInsight(
  userId: string,
  input: {
    kind: RipSavableInsightKind;
    label: string;
    value: string;
    ripReadingId: string;
    inverseFunction?: RipInverseFunction;
    intent?: RipSavableInsight["intent"];
    tags?: string[];
  },
): Promise<RipSavableInsight> {
  const id = buildRipInsightId({
    ripReadingId: input.ripReadingId,
    kind: input.kind,
    value: input.value,
  });
  const now = Date.now();
  const insight: RipSavableInsight = {
    id,
    ownerUid: userId,
    kind: input.kind,
    label: input.label,
    value: input.value,
    ripReadingId: input.ripReadingId,
    inverseFunction: input.inverseFunction,
    savedAt: now,
    intent: input.intent,
    tags: input.tags,
  };
  await setDoc(doc(insightCol(userId), id), sanitizeFirestoreData(insight));
  emitChanged(userId);
  return insight;
}

export async function removeRipInsight(userId: string, insightId: string): Promise<void> {
  if (!userId || userId === "ghost" || !insightId) return;
  try {
    await deleteDoc(doc(insightCol(userId), insightId));
    emitChanged(userId);
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, "ripInsights");
  }
}

export async function isRipInsightSaved(
  userId: string,
  ripReadingId: string,
  kind: RipSavableInsightKind,
  value: string,
): Promise<boolean> {
  const id = buildRipInsightId({ ripReadingId, kind, value });
  const all = await listRipInsights(userId);
  return all.some((entry) => entry.id === id);
}
