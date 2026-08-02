import { extractSessionCookie } from "../sessionCookie.js";
import { extractMimiSessionToken } from "../mimiSessionToken.js";
import { getServerFirebaseAdmin } from "../serverFirebaseAdmin.js";

export type SovereignAuthVia = "ingest_key" | "id_token" | "session_cookie" | "user_header";

export type SovereignAuthResult =
  | { ok: true; uid: string; via: SovereignAuthVia }
  | { ok: false; status: number; code: string; message: string };

export type SovereignRequester =
  | { uid: string; via: SovereignAuthVia }
  | null;

const strictAuthEnabled = (): boolean =>
  process.env.MIMI_SOVEREIGN_STRICT_AUTH === "1" ||
  process.env.MIMI_SOVEREIGN_STRICT_AUTH === "true" ||
  (process.env.NODE_ENV === "production" && process.env.MIMI_SOVEREIGN_STRICT_AUTH !== "0");

const readHeader = (headers: Record<string, unknown>, name: string): string => {
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) return String(value[0] || "").trim();
  return String(value || "").trim();
};

const tryIngestKey = (
  headers: Record<string, unknown>,
): { matched: boolean; headerUid: string } => {
  const ingestKey = process.env.MIMI_SOVEREIGN_INGEST_KEY?.trim();
  if (!ingestKey) return { matched: false, headerUid: "" };
  const provided =
    readHeader(headers, "x-mimi-ingest-key") || readHeader(headers, "x-api-key");
  if (!provided || provided !== ingestKey) return { matched: false, headerUid: "" };
  return { matched: true, headerUid: readHeader(headers, "x-user-id") };
};

const verifyIdTokenUid = async (token: string): Promise<string | null> => {
  const { auth } = getServerFirebaseAdmin();
  if (!auth) return null;
  try {
    const decoded = await auth.verifyIdToken(token);
    return decoded?.uid ? String(decoded.uid) : null;
  } catch {
    return null;
  }
};

const verifySessionCookieUid = async (cookie: string): Promise<string | null> => {
  const { auth } = getServerFirebaseAdmin();
  if (!auth) return null;
  try {
    const decoded = await auth.verifySessionCookie(cookie, true);
    return decoded?.uid ? String(decoded.uid) : null;
  } catch {
    return null;
  }
};

/**
 * Authorize a sovereign write for `expectedUid`.
 * Preference: ingest key → Firebase ID token → Firebase __session cookie → soft x-user-id.
 * Soft header is rejected in production unless MIMI_SOVEREIGN_TRUST_USER_HEADER=1.
 */
export const authorizeSovereignWrite = async (
  req: { headers?: Record<string, unknown> },
  expectedUid: string,
): Promise<SovereignAuthResult> => {
  if (!expectedUid) {
    return {
      ok: false,
      status: 400,
      code: "MISSING_UID",
      message: "userId is required",
    };
  }

  const headers = req.headers || {};
  const ingest = tryIngestKey(headers);
  if (ingest.matched) {
    return { ok: true, uid: expectedUid, via: "ingest_key" };
  }

  const token = extractMimiSessionToken(headers);
  if (token) {
    const { auth } = getServerFirebaseAdmin();
    if (auth) {
      const uid = await verifyIdTokenUid(token);
      if (!uid) {
        return {
          ok: false,
          status: 401,
          code: "INVALID_MIMI_SESSION",
          message: "Mimi session is invalid or expired",
        };
      }
      if (uid !== expectedUid) {
        return {
          ok: false,
          status: 403,
          code: "UID_MISMATCH",
          message: "Token uid does not match resource owner",
        };
      }
      return { ok: true, uid, via: "id_token" };
    }
  }

  // EventSource and some same-origin credentialed calls only send cookies.
  const sessionCookie = extractSessionCookie(headers);
  if (sessionCookie) {
    const { auth } = getServerFirebaseAdmin();
    if (auth) {
      const uid = await verifySessionCookieUid(sessionCookie);
      if (!uid) {
        return {
          ok: false,
          status: 401,
          code: "INVALID_SESSION_COOKIE",
          message: "Session cookie is invalid or expired",
        };
      }
      if (uid !== expectedUid) {
        return {
          ok: false,
          status: 403,
          code: "UID_MISMATCH",
          message: "Session uid does not match resource owner",
        };
      }
      return { ok: true, uid, via: "session_cookie" };
    }
  }

  const headerUid = readHeader(headers, "x-user-id");
  if (headerUid && headerUid === expectedUid) {
    const allowSoftHeader =
      process.env.MIMI_SOVEREIGN_TRUST_USER_HEADER === "1" ||
      (!strictAuthEnabled() && !process.env.MIMI_SOVEREIGN_INGEST_KEY?.trim());
    if (allowSoftHeader) {
      return { ok: true, uid: headerUid, via: "user_header" };
    }
  }

  return {
    ok: false,
    status: 401,
    code: "UNAUTHORIZED",
    message: strictAuthEnabled()
      ? "Strict sovereign auth requires ID token, session cookie, or ingest key"
      : "Unauthorized sovereign write",
  };
};

/**
 * Resolve the authenticated requester uid for sovereign reads (private zines, user SSE).
 * Never trusts x-user-id alone in strict/production mode.
 */
export const resolveSovereignRequesterUid = async (req: {
  headers?: Record<string, unknown>;
}): Promise<SovereignRequester> => {
  const headers = req.headers || {};
  const ingest = tryIngestKey(headers);
  if (ingest.matched && ingest.headerUid) {
    return { uid: ingest.headerUid, via: "ingest_key" };
  }

  const token = extractMimiSessionToken(headers);
  if (token) {
    const uid = await verifyIdTokenUid(token);
    if (uid) return { uid, via: "id_token" };
    // Invalid bearer — do not fall through to soft header in strict mode.
    if (strictAuthEnabled()) return null;
  }

  const sessionCookie = extractSessionCookie(headers);
  if (sessionCookie) {
    const uid = await verifySessionCookieUid(sessionCookie);
    if (uid) return { uid, via: "session_cookie" };
    if (strictAuthEnabled()) return null;
  }

  const headerUid = readHeader(headers, "x-user-id");
  if (headerUid) {
    const allowSoftHeader =
      process.env.MIMI_SOVEREIGN_TRUST_USER_HEADER === "1" ||
      (!strictAuthEnabled() && !process.env.MIMI_SOVEREIGN_INGEST_KEY?.trim());
    if (allowSoftHeader) return { uid: headerUid, via: "user_header" };
  }

  return null;
};
