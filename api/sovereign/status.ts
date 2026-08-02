import { cors, requireMethod, sendJson } from "../../lib/apiUtils.js";
import { isSovereignEnabled, resolveSovereignDbPath } from "../../lib/sovereign/db.js";
import { sovereignStatus } from "../../lib/sovereign/store.js";

/** GET /api/sovereign/status — archive health for ops + /api/health. */
export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "GET")) return;

  const status = sovereignStatus();
  return sendJson(res, 200, {
    ...status,
    enabledFlag: isSovereignEnabled(),
    path: isSovereignEnabled() ? resolveSovereignDbPath() : null,
    backend: "sqlite",
  });
}
