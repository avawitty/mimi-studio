import { cors, requireMethod, sendJson } from "../../lib/apiUtils.js";
import { isSovereignEnabled, resolveSovereignDbPath } from "../../lib/sovereign/db.js";
import { sovereignStatus } from "../../lib/sovereign/store.js";

/** GET /api/sovereign/status — archive health for ops + client degraded mode. */
export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "GET")) return;

  const status = await sovereignStatus();
  return sendJson(res, 200, {
    ...status,
    enabledFlag: isSovereignEnabled(),
    path: status.path ?? (isSovereignEnabled() ? resolveSovereignDbPath() : null),
    message: status.ready
      ? `Sovereign archive online (${status.backend || "unknown"})`
      : "Sovereign archive offline — Floor may fall back to Firestore",
  });
}
