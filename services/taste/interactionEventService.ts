/**
 * Lightweight audit trail for taste corrections and confirmations.
 * Firestore path: users/{uid}/interactionEvents/{id}
 */
import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "../firebaseInit";
import type { CorrectionState, TasteScope } from "../../types";
import type { CorrectionTargetType } from "./correctionService";

export type TasteInteractionEvent = {
  id: string;
  userId: string;
  targetType: CorrectionTargetType;
  targetId: string;
  correction: CorrectionState;
  contextScope?: TasteScope;
  createdAt: number;
};

const uid = () =>
  crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function interactionEventsCol(userId: string) {
  return collection(db, "users", userId, "interactionEvents");
}

export async function recordTasteInteractionEvent(
  userId: string,
  event: Omit<TasteInteractionEvent, "id" | "userId" | "createdAt">,
): Promise<void> {
  if (!userId || userId === "ghost") {
    throw new Error("Authentication required to record interaction events.");
  }

  const id = uid();
  const record: TasteInteractionEvent = {
    id,
    userId,
    createdAt: Date.now(),
    ...event,
  };

  await setDoc(doc(interactionEventsCol(userId), id), record);
}
