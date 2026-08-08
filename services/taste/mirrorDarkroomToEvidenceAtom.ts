/**
 * Mirror Darkroom fragments and saved treatments into canonical EvidenceAtoms.
 */
import { doc, setDoc } from "firebase/firestore";
import type { StyleTreatment } from "../../types";
import { db } from "../firebaseInit";
import {
  darkroomEvidenceAtomId,
  darkroomFragmentToAtomInput,
  darkroomTreatmentToAtomInput,
} from "../../lib/taste/darkroomAtomBridge";
import { buildEvidenceAtomFromInput } from "../../lib/taste/buildEvidenceAtom";
import { getEvidenceAtom } from "./evidenceAtomService";
import { scheduleEvidenceAtomAnalysis } from "./scheduleEvidenceAtomAnalysis";

function evidenceAtomDoc(userId: string, atomId: string) {
  return doc(db, "users", userId, "evidenceAtoms", atomId);
}

export async function mirrorDarkroomFragmentToEvidenceAtom(
  userId: string,
  darkroomId: string,
  item: Record<string, unknown>,
): Promise<void> {
  if (!userId || userId === "ghost" || !darkroomId) return;

  const input = darkroomFragmentToAtomInput(darkroomId, item);
  if (!input) return;

  const atomId = darkroomEvidenceAtomId(darkroomId);
  const existing = await getEvidenceAtom(userId, atomId);

  if (existing) {
    await setDoc(
      evidenceAtomDoc(userId, atomId),
      {
        originalSource: input.originalSource,
        assetUrl: input.assetUrl,
        thumbnailUrl: input.thumbnailUrl,
        sourceMetadata: input.sourceMetadata,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
    return;
  }

  const atom = buildEvidenceAtomFromInput(userId, input, { id: atomId });
  await setDoc(evidenceAtomDoc(userId, atomId), atom);
  scheduleEvidenceAtomAnalysis(atomId);
}

export async function mirrorDarkroomTreatmentToEvidenceAtom(
  userId: string,
  treatment: StyleTreatment,
): Promise<void> {
  if (!userId || userId === "ghost" || !treatment?.id) return;

  const input = darkroomTreatmentToAtomInput(treatment);
  if (!input) return;

  const atomId = darkroomEvidenceAtomId(treatment.id);
  const existing = await getEvidenceAtom(userId, atomId);

  if (existing) {
    await setDoc(
      evidenceAtomDoc(userId, atomId),
      {
        originalSource: input.originalSource,
        sourceMetadata: input.sourceMetadata,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
    return;
  }

  const atom = buildEvidenceAtomFromInput(userId, input, { id: atomId });
  await setDoc(evidenceAtomDoc(userId, atomId), atom);
  scheduleEvidenceAtomAnalysis(atomId);
}
