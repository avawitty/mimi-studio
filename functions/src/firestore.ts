import { getFirestore, Firestore } from "firebase-admin/firestore";

/**
 * Client + Vercel Admin target this named DB. `(default)` does not exist on
 * project mimistudios — using getFirestore() with no id breaks profile/billing writes.
 */
export const FIRESTORE_DATABASE_ID =
  process.env.FIREBASE_FIRESTORE_DATABASE_ID ||
  "ai-studio-mimi-4c383b50-c596-4b43-8a2e-61d0645e590a";

let cached: Firestore | null = null;

export const getMimiFirestore = (): Firestore => {
  if (!cached) {
    cached = getFirestore(FIRESTORE_DATABASE_ID);
  }
  return cached;
};
