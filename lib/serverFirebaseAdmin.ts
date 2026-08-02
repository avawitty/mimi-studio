import { createRequire } from "module";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const require = createRequire(import.meta.url);

type AdminBundle = {
  auth: Auth | null;
  db: Firestore | null;
};

let cached: AdminBundle | undefined;

/**
 * Named DB from client config; `(default)` does not exist on mimistudios.
 * Resolved at call time (not module import) so `server.ts` dotenv / `.env.local`
 * can override before Admin-backed routes touch Firestore.
 */
function resolveMimiFirestoreDatabaseId(): string {
  return (
    process.env.FIREBASE_FIRESTORE_DATABASE_ID ||
    (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId ||
    "ai-studio-mimi-4c383b50-c596-4b43-8a2e-61d0645e590a"
  );
}

const parseServiceAccount = () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    console.error("MIMI // FIREBASE_SERVICE_ACCOUNT is not valid JSON.");
    return null;
  }
};

/**
 * Lazily initialize Firebase Admin for server routes.
 * Uses dynamic require so Vercel serverless functions that only need Admin for
 * optional credit checks do not crash at module-evaluation time when the
 * firebase-admin graph fails to load in the isolate.
 */
export const getServerFirebaseAdmin = (): AdminBundle => {
  if (cached) return cached;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cert, getApps, initializeApp } = require("firebase-admin/app") as typeof import("firebase-admin/app");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getAuth } = require("firebase-admin/auth") as typeof import("firebase-admin/auth");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFirestore } = require("firebase-admin/firestore") as typeof import("firebase-admin/firestore");

    if (!getApps().length) {
      const serviceAccount = parseServiceAccount();
      if (!serviceAccount) {
        cached = { auth: null, db: null };
        return cached;
      }
      initializeApp({ credential: cert(serviceAccount) });
    }

    let auth: Auth | null = null;
    let db: Firestore | null = null;

    try {
      auth = getAuth();
    } catch (err) {
      console.warn("MIMI // Firebase Auth init failed:", err);
    }

    try {
      db = getFirestore(resolveMimiFirestoreDatabaseId());
    } catch (err) {
      console.warn("MIMI // Firestore init failed:", err);
    }

    cached = { auth, db };
    return cached;
  } catch (err) {
    console.warn("MIMI // Firebase Admin unavailable:", err);
    cached = { auth: null, db: null };
    return cached;
  }
};

export const extractMimiSessionToken = (headers: Record<string, any>) => {
  const candidates = [headers["x-user-token"], headers.authorization].filter(Boolean);

  for (const candidate of candidates) {
    const value = Array.isArray(candidate) ? candidate[0] : candidate;
    const text = String(value || "").trim();
    if (!text) continue;
    if (text.startsWith("Bearer ey")) return text.slice("Bearer ".length);
    if (text.startsWith("ey")) return text;
  }

  return "";
};

export const verifyMimiSession = async (headers: Record<string, any>) => {
  const token = extractMimiSessionToken(headers);
  if (!token) {
    throw Object.assign(new Error("Mimi sign-in is required."), {
      status: 401,
      code: "MISSING_MIMI_SESSION",
    });
  }

  const { auth } = getServerFirebaseAdmin();
  if (!auth) {
    throw Object.assign(
      new Error("Mimi authentication is temporarily unavailable on the server."),
      {
        status: 503,
        code: "FIREBASE_ADMIN_UNAVAILABLE",
      },
    );
  }

  try {
    return await auth.verifyIdToken(token);
  } catch {
    throw Object.assign(new Error("Mimi session is invalid or expired."), {
      status: 401,
      code: "INVALID_MIMI_SESSION",
    });
  }
};
