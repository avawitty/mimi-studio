import { cors, readJsonBody, requireMethod, sendJson } from "../lib/apiUtils.js";
import { proxySessionLogin } from "../lib/proxySessionToFunctions.js";
import { buildSessionCookieHeader, SESSION_EXPIRES_MS } from "../lib/sessionCookie.js";

/**
 * Prefer Cloud Functions for session cookies. Firebase Admin has been crashing
 * Vercel isolates at load/init (FUNCTION_INVOCATION_FAILED); keep Admin as an
 * optional fast-path only when MIMI_USE_VERCEL_FIREBASE_ADMIN=1.
 */
export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  const body = await readJsonBody(req);
  const idToken = body?.idToken;
  if (!idToken || typeof idToken !== "string") {
    sendJson(res, 400, { error: "idToken is required." });
    return;
  }

  const preferLocalAdmin = process.env.MIMI_USE_VERCEL_FIREBASE_ADMIN === "1";

  if (preferLocalAdmin) {
    try {
      const { getServerFirebaseAdmin } = await import("../lib/serverFirebaseAdmin.js");
      const { auth } = getServerFirebaseAdmin();
      if (auth) {
        const sessionCookie = await auth.createSessionCookie(idToken, {
          expiresIn: SESSION_EXPIRES_MS,
        });
        res.setHeader("Set-Cookie", buildSessionCookieHeader(sessionCookie));
        sendJson(res, 200, { status: "success" });
        return;
      }
    } catch (error) {
      console.warn("MIMI // local sessionLogin Admin path failed; proxying:", error);
    }
  }

  try {
    const proxied = await proxySessionLogin({ idToken });
    if (proxied.setCookie) {
      res.setHeader("Set-Cookie", proxied.setCookie);
    }
    const payload =
      proxied.status < 400
        ? proxied.payload
        : {
            error:
              typeof (proxied.payload as any)?.error === "string"
                ? (proxied.payload as any).error
                : (proxied.payload as any)?.error?.message || "Authentication failed.",
          };
    sendJson(res, proxied.status, payload);
  } catch (error) {
    console.error("MIMI // sessionLogin proxy failed:", error);
    sendJson(res, 503, { error: "Session login unavailable." });
  }
}
