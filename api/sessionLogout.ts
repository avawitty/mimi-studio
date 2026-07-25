import { cors, requireMethod, sendJson } from "../lib/apiUtils.js";
import { proxySessionLogout } from "../lib/proxySessionToFunctions.js";
import { clearSessionCookieHeader } from "../lib/sessionCookie.js";
import { getServerFirebaseAdmin } from "../lib/serverFirebaseAdmin.js";

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  const { auth } = getServerFirebaseAdmin();
  if (!auth) {
    try {
      const proxied = await proxySessionLogout();
      if (proxied.setCookie) {
        res.setHeader("Set-Cookie", proxied.setCookie);
      } else {
        res.setHeader("Set-Cookie", clearSessionCookieHeader());
      }
      sendJson(res, proxied.status, proxied.payload);
    } catch (error) {
      console.warn("MIMI // sessionLogout proxy failed, clearing local cookie:", error);
      res.setHeader("Set-Cookie", clearSessionCookieHeader());
      sendJson(res, 200, { status: "success" });
    }
    return;
  }

  res.setHeader("Set-Cookie", clearSessionCookieHeader());
  sendJson(res, 200, { status: "success" });
}
