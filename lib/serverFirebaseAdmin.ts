import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "../firebase-applet-config.json";

/** Named DB from client config; `(default)` does not exist on mimistudios. */
const MIMI_FIRESTORE_DATABASE_ID =
  process.env.FIREBASE_FIRESTORE_DATABASE_ID ||
  (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId ||
  "ai-studio-mimi-4c383b50-c596-4b43-8a2e-61d0645e590a";

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

export const getServerFirebaseAdmin = () => {
  if (!getApps().length) {
    const serviceAccount = parseServiceAccount();
    if (!serviceAccount) {
      return { auth: null, db: null };
    }
    initializeApp({ credential: cert(serviceAccount) });
  }

  return {
    auth: getAuth(),
    db: getFirestore(MIMI_FIRESTORE_DATABASE_ID),
  };
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
