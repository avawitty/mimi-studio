/**
 * Mirror Scribe MemoryAtoms into canonical EvidenceAtoms (fire-and-forget).
 */
import { doc, setDoc } from "firebase/firestore";
import type { MemoryAtom } from "../../types";
import { db } from "../firebaseInit";
import { sanitizeFirestoreData } from "../firebaseUtils";
import {
  memoryAtomToAtomInput,
  scribeEvidenceAtomId,
} from "../../lib/taste/scribeAtomBridge";
import { buildEvidenceAtomFromInput } from "../../lib/taste/buildEvidenceAtom";
import { getEvidenceAtom } from "./evidenceAtomService";
import { scheduleEvidenceAtomAnalysis } from "./scheduleEvidenceAtomAnalysis";

function evidenceAtomDoc(userId: string, atomId: string) {
  return doc(db, "users", userId, "evidenceAtoms", atomId);
}

export async function mirrorScribeMemoryToEvidenceAtom(
  userId: string,
  atom: MemoryAtom,
): Promise<void> {
  if (!userId || userId === "ghost" || !atom.id) return;

  const evidenceId = scribeEvidenceAtomId(atom.id);
  const existing = await getEvidenceAtom(userId, evidenceId);
  if (existing) {
    // Refresh interpretation fields when Scribe content changes.
    await setDoc(
      evidenceAtomDoc(userId, evidenceId),
      sanitizeFirestoreData({
        originalSource: memoryAtomToAtomInput(atom).originalSource,
        sourceMetadata: memoryAtomToAtomInput(atom).sourceMetadata,
        updatedAt: Date.now(),
      }),
      { merge: true },
    );
    return;
  }

  const input = memoryAtomToAtomInput(atom);
  const built = buildEvidenceAtomFromInput(userId, input, { id: evidenceId });
  await setDoc(evidenceAtomDoc(userId, evidenceId), sanitizeFirestoreData(built));
  scheduleEvidenceAtomAnalysis(evidenceId);
}
