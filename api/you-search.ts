import { cors, readJsonBody, requireMethod, sendError, sendJson } from "../lib/apiUtils.js";
import { extractMimiSessionToken, verifyMimiSession } from "../lib/serverFirebaseAdmin.js";
import { runYouSearch } from "../lib/youSearch.js";

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const body = await readJsonBody(req);
    const headerKey = String(req.headers["x-api-key"] || "").trim();

    // Prefer a verified Firebase session for billable Apify runs. Missing /
    // invalid sessions are allowed to fall through to free providers (gateway /
    // local demo) but never consume the shared APIFY_TOKEN.
    let authenticatedUid: string | null = null;
    const sessionToken = extractMimiSessionToken(req.headers || {});
    if (sessionToken) {
      try {
        const decoded = await verifyMimiSession(req.headers);
        authenticatedUid = decoded.uid || null;
      } catch (sessionError: any) {
        const status = Number(sessionError?.status) || 401;
        // Only hard-fail when Firebase Admin is unavailable mid-auth; otherwise
        // continue without Apify privileges.
        if (status === 503) {
          sendError(
            res,
            503,
            sessionError.message || "Authentication temporarily unavailable.",
            sessionError.code || "FIREBASE_ADMIN_UNAVAILABLE",
          );
          return;
        }
        authenticatedUid = null;
      }
    }

    const response = await runYouSearch({
      query: body?.query,
      includeDomains: body?.includeDomains,
      count: body?.count,
      youApiKey: headerKey,
      authenticatedUid,
    });
    sendJson(res, 200, response);
  } catch (error: any) {
    const status = Number(error?.status) || 500;
    if (status === 400 || status === 401 || status === 429) {
      sendError(res, status, error.message || "Request rejected.", error.code);
      return;
    }
    console.error("MIMI // You.com API Proxy Error:", error);
    sendError(res, 500, error?.message || "Failed to fetch and map search results.");
  }
}
