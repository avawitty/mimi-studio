import { cors, requireMethod, sendJson } from "../../lib/apiUtils.js";

/** GET /api/sovereign/status — archive health for ops + client degraded mode. */
export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "GET")) return;

  try {
    const { isSovereignEnabled, resolveSovereignDbPath } = await import("../../lib/sovereign/db.js");
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
    console.warn("MIMI // sovereign status failed", error);
    return sendJson(res, 200, {
      enabled: false,
      ready: false,
      backend: null,
      path: null,
      zineCount: 0,
      publicCount: 0,
      profileCount: 0,
      pocketCount: 0,
      enabledFlag: false,
      message: "Sovereign archive offline — Floor may fall back to Firestore",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
