/**
 * Mirror Pocket saves into canonical EvidenceAtoms (fire-and-forget).
 */
import { doc, setDoc } from "firebase/firestore";
import type { PocketItem } from "../../types";
import { db } from "../firebaseInit";
import { sanitizeFirestoreData } from "../firebaseUtils";
import {
  pocketEvidenceAtomId,
  pocketItemToAtomInput,
} from "../../lib/taste/pocketAtomBridge";
import { buildEvidenceAtomFromInput } from "../../lib/taste/buildEvidenceAtom";
import { getEvidenceAtom } from "./evidenceAtomService";
import { scheduleEvidenceAtomAnalysis } from "./scheduleEvidenceAtomAnalysis";

function evidenceAtomDoc(userId: string, atomId: string) {
  return doc(db, "users", userId, "evidenceAtoms", atomId);
}

export async function mirrorPocketItemToEvidenceAtom(
  userId: string,
  pocketItemId: string,
  type: PocketItem["type"],
  content: Record<string, unknown>,
  title?: string,
): Promise<void> {
  if (!userId || userId === "ghost" || !pocketItemId) return;

  const atomId = pocketEvidenceAtomId(pocketItemId);
  const existing = await getEvidenceAtom(userId, atomId);
  if (existing) return;

  const input = pocketItemToAtomInput(pocketItemId, type, content, title);
  const atom = buildEvidenceAtomFromInput(userId, input, { id: atomId });

  await setDoc(evidenceAtomDoc(userId, atomId), sanitizeFirestoreData(atom));
  scheduleEvidenceAtomAnalysis(atomId);
}
