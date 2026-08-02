import { cors, requireMethod, sendError, sendJson } from "../../lib/apiUtils.js";
import { isSovereignEnabled, resolveSovereignDbPath } from "../../lib/sovereign/db.js";

/** GET /api/sovereign/status — archive health for ops + client degraded mode. */
export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "GET")) return;

  try {
    const { sovereignStatus } = await import("../../lib/sovereign/store.js");
    const status = await sovereignStatus();
    return sendJson(res, 200, {
      ...status,
      enabledFlag: isSovereignEnabled(),
      path: status.path ?? (isSovereignEnabled() ? resolveSovereignDbPath() : null),
      message: status.ready
        ? `Sovereign archive online (${status.backend || "unknown"})`
        : "Sovereign archive offline — Floor may fall back to Firestore",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error || "unknown");
    return sendError(res, 500, message.slice(0, 240), "SOVEREIGN_STATUS_FAILED");
  }
}
