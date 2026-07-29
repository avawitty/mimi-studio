import { cors, readJsonBody, requireMethod, sendJson } from "../lib/apiUtils.js";
import { getServerFirebaseAdmin } from "../lib/serverFirebaseAdmin.js";
import { proxySessionLogin } from "../lib/proxySessionToFunctions.js";
import { buildSessionCookieHeader, SESSION_EXPIRES_MS } from "../lib/sessionCookie.js";

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  const body = await readJsonBody(req);
  const idToken = body?.idToken;
  if (!idToken || typeof idToken !== "string") {
    sendJson(res, 400, { error: "idToken is required." });
    return;
  }

  const { auth } = getServerFirebaseAdmin();
  if (!auth) {
    try {
      const proxied = await proxySessionLogin({ idToken });
      if (proxied.setCookie) {
        res.setHeader("Set-Cookie", proxied.setCookie);
      }
      // Sanitize upstream payload to avoid forwarding internal error details or stack traces
      const payload = proxied.status < 400
        ? proxied.payload
        : { error: (proxied.payload as any)?.error || "Authentication failed." };
      sendJson(res, proxied.status, payload);
    } catch (error) {
      console.error("MIMI // sessionLogin proxy failed:", error);
      sendJson(res, 503, { error: "Session login unavailable." });
    }
    return;
  }

  try {
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_EXPIRES_MS });
    res.setHeader("Set-Cookie", buildSessionCookieHeader(sessionCookie));
    sendJson(res, 200, { status: "success" });
  } catch (error) {
    console.error("MIMI // sessionLogin failed:", error);
    sendJson(res, 401, { error: "Unauthorized" });
  }
}
