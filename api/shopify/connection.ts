import { cors, requireMethod, sendJson } from "../../lib/apiUtils.js";
import { getShopifyConnectionStatus } from "../../lib/shopifyAdmin.js";

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "GET")) return;

  try {
    const { verifyMimiSession } = await import("../../lib/serverFirebaseAdmin.js");
    await verifyMimiSession(req.headers || {});
    sendJson(res, 200, getShopifyConnectionStatus());
  } catch (error: any) {
    sendJson(res, Number(error?.status) || 500, {
      error: error?.message || "Shopify connection status unavailable.",
      code: error?.code || "SHOPIFY_CONNECTION_STATUS_FAILED",
    });
  }
}
