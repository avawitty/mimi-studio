import { extractMimiSessionToken } from "../mimiSessionToken";
import { getServerFirebaseAdmin } from "../serverFirebaseAdmin";

export type SovereignAuthResult =
  | { ok: true; uid: string; via: "ingest_key" | "id_token" | "user_header" }
  | { ok: false; status: number; code: string; message: string };

const strictAuthEnabled = (): boolean =>
  process.env.MIMI_SOVEREIGN_STRICT_AUTH === "1" ||
  process.env.MIMI_SOVEREIGN_STRICT_AUTH === "true" ||
  (process.env.NODE_ENV === "production" && process.env.MIMI_SOVEREIGN_STRICT_AUTH !== "0");

/**
 * Authorize a sovereign write for `expectedUid`.
 * Preference order: ingest key → Firebase ID token → matching x-user-id (dev / no-admin).
 * In production (or MIMI_SOVEREIGN_STRICT_AUTH=1), soft x-user-id alone is rejected
 * unless MIMI_SOVEREIGN_TRUST_USER_HEADER=1.
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
  const ingestKey = process.env.MIMI_SOVEREIGN_INGEST_KEY?.trim();
  if (ingestKey) {
    const provided =
      String(headers["x-mimi-ingest-key"] || "").trim() ||
      String(headers["x-api-key"] || "").trim();
    if (provided && provided === ingestKey) {
      return { ok: true, uid: expectedUid, via: "ingest_key" };
    }
  }

  const token = extractMimiSessionToken(headers);
  if (token) {
    const { auth } = getServerFirebaseAdmin();
    if (auth) {
      try {
        const decoded = await auth.verifyIdToken(token);
        if (decoded?.uid && decoded.uid === expectedUid) {
          return { ok: true, uid: decoded.uid, via: "id_token" };
        }
        return {
          ok: false,
          status: 403,
          code: "UID_MISMATCH",
          message: "Token uid does not match resource owner",
        };
      } catch {
        return {
          ok: false,
          status: 401,
          code: "INVALID_MIMI_SESSION",
          message: "Mimi session is invalid or expired",
        };
      }
    }
  }

  const headerUid = String(headers["x-user-id"] || "").trim();
  if (headerUid && headerUid === expectedUid) {
    const allowSoftHeader =
      process.env.MIMI_SOVEREIGN_TRUST_USER_HEADER === "1" ||
      (!strictAuthEnabled() && !ingestKey);
    if (allowSoftHeader) {
      return { ok: true, uid: headerUid, via: "user_header" };
    }
  }

  return {
    ok: false,
    status: 401,
    code: "UNAUTHORIZED",
    message: strictAuthEnabled()
      ? "Strict sovereign auth requires ID token or ingest key"
      : "Unauthorized sovereign write",
  };
};
