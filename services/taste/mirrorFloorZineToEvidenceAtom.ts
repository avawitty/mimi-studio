import { doc, setDoc } from "firebase/firestore";
import type { ZineMetadata } from "../../types";
import { db } from "../firebaseInit";
import { sanitizeFirestoreData } from "../firebaseUtils";
import {
  floorZineEvidenceAtomId,
  floorZineToAtomInput,
} from "../../lib/taste/floorAtomBridge";
import { buildEvidenceAtomFromInput } from "../../lib/taste/buildEvidenceAtom";
import { getEvidenceAtom } from "./evidenceAtomService";
import { scheduleEvidenceAtomAnalysis } from "./scheduleEvidenceAtomAnalysis";

function evidenceAtomDoc(userId: string, atomId: string) {
  return doc(db, "users", userId, "evidenceAtoms", atomId);
}

/**
 * When a zine is published to Stand Floor, mirror it as taste evidence.
 */
export async function mirrorFloorZineToEvidenceAtom(
  userId: string,
  zine: ZineMetadata,
): Promise<void> {
  if (!userId || userId === "ghost" || !zine?.id) return;

  const input = floorZineToAtomInput(zine);
  if (!input) return;

  const atomId = floorZineEvidenceAtomId(zine.id);
  const existing = await getEvidenceAtom(userId, atomId);

  if (existing) {
    await setDoc(
      evidenceAtomDoc(userId, atomId),
      sanitizeFirestoreData({
        originalSource: input.originalSource,
        assetUrl: input.assetUrl,
        thumbnailUrl: input.thumbnailUrl,
        sourceMetadata: input.sourceMetadata,
        updatedAt: Date.now(),
      }),
      { merge: true },
    );
    return;
  }

  const atom = buildEvidenceAtomFromInput(userId, input, { id: atomId });
  await setDoc(evidenceAtomDoc(userId, atomId), sanitizeFirestoreData(atom));
  scheduleEvidenceAtomAnalysis(atomId);
}
