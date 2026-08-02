import { createRequire } from "module";
import { extractMimiSessionToken } from "./mimiSessionToken.js";

export { extractMimiSessionToken } from "./mimiSessionToken.js";

const require = createRequire(
  typeof __filename === "string" ? __filename : import.meta.url,
);

type AdminBundle = {
  auth: any | null;
  db: any | null;
};

let cached: AdminBundle | undefined;

/**
 * Named DB from client config; `(default)` does not exist on mimistudios.
 * Resolved at call time (not module import) so `server.ts` dotenv / `.env.local`
 * can override before Admin-backed routes touch Firestore.
 *
 * Loaded via createRequire — ESM `import …json` crashes Vercel Node isolates
 * with ERR_IMPORT_ATTRIBUTE_MISSING ("needs an import attribute of type: json").
 */
function resolveMimiFirestoreDatabaseId(): string {
  let configId = "";
  try {
    const firebaseConfig = require("../firebase-applet-config.json") as {
      firestoreDatabaseId?: string;
    };
    configId = String(firebaseConfig?.firestoreDatabaseId || "").trim();
  } catch (err) {
    console.warn("MIMI // firebase-applet-config.json unavailable:", err);
  }
  return (
    process.env.FIREBASE_FIRESTORE_DATABASE_ID ||
    configId ||
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
 *
 * IMPORTANT: do not statically import anything from `firebase-admin/*` in this
 * file (including `import type`) — Vercel's bundler has been observed to pull
 * the Admin graph into the module init path and crash with
 * FUNCTION_INVOCATION_FAILED before the handler runs.
 */
export const getServerFirebaseAdmin = (): AdminBundle => {
  if (cached) return cached;

  try {
    const { cert, getApps, initializeApp } = require("firebase-admin/app");
    const { getAuth } = require("firebase-admin/auth");
    const { getFirestore } = require("firebase-admin/firestore");

    if (!getApps().length) {
      const serviceAccount = parseServiceAccount();
      if (!serviceAccount) {
        cached = { auth: null, db: null };
        return cached;
      }
      initializeApp({ credential: cert(serviceAccount) });
    }

    let auth: any | null = null;
    let db: any | null = null;

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
