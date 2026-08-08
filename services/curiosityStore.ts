/**
 * Curiosity persistence — Firestore when signed in, localStorage fallback.
 * Questions from Mesopic Lens and Scry; used for pattern reports only.
 */
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit as firestoreLimit,
} from "firebase/firestore";
import { db } from "./firebaseInit";
import {
  buildCuriosityRecord,
  safeParseCuriosityRecord,
  type CuriosityRecord,
  type CuriositySource,
} from "../schemas/curiosityContracts";
import type { CuriosityPromptId } from "./tailorEvidenceIntake";
import { deriveCuriosityThemes } from "../lib/curiosity/curiosityAnalytics";

const LOCAL_KEY_PREFIX = "mimi_curiosities";
const MAX_LOCAL = 200;

function localKey(userId?: string): string {
  return `${LOCAL_KEY_PREFIX}_${userId ?? "guest"}`;
}

function readLocal(userId?: string): CuriosityRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(localKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    return parsed
      .map((item) => safeParseCuriosityRecord(item))
      .filter((r) => r.success)
      .map((r) => r.data);
  } catch {
    return [];
  }
}

function writeLocal(records: CuriosityRecord[], userId?: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      localKey(userId),
      JSON.stringify(records.slice(0, MAX_LOCAL)),
    );
  } catch {
    // quota / private mode — non-fatal
  }
}

export async function saveCuriosityRecord(input: {
  source: CuriositySource;
  question: string;
  userId?: string;
  curiosityIds?: CuriosityPromptId[];
  customCuriosity?: string;
  readingPreview?: string;
  webCitationCount?: number;
  celestialEnabled?: boolean;
}): Promise<CuriosityRecord> {
  const themes = deriveCuriosityThemes(input.question);
  const record = buildCuriosityRecord({ ...input, themes });

  const local = readLocal(input.userId);
  writeLocal([record, ...local], input.userId);

  if (input.userId) {
    try {
      await addDoc(collection(db, `users/${input.userId}/curiosities`), record);
    } catch (err) {
      console.warn("MIMI // Curiosity Firestore write failed:", err);
    }
  }

  return record;
}

export async function listCuriosityRecords(options?: {
  userId?: string;
  limit?: number;
}): Promise<CuriosityRecord[]> {
  const cap = options?.limit ?? 100;
  const userId = options?.userId;

  if (userId) {
    try {
      const q = query(
        collection(db, `users/${userId}/curiosities`),
        orderBy("createdAt", "desc"),
        firestoreLimit(cap),
      );
      const snap = await getDocs(q);
      const remote = snap.docs
        .map((d) => safeParseCuriosityRecord(d.data()))
        .filter((r) => r.success)
        .map((r) => r.data);
      if (remote.length > 0) {
        writeLocal(remote, userId);
        return remote;
      }
    } catch (err) {
      console.warn("MIMI // Curiosity Firestore read failed:", err);
    }
  }

  return readLocal(userId).slice(0, cap);
}
