import { cors, readJsonBody, requireMethod, sendJson } from "../../lib/apiUtils.js";
import { verifyMimiSession } from "../../lib/serverFirebaseAdmin.js";
import { searchShopifyGlobalCatalog } from "../../lib/shopifyCatalog.js";

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    await verifyMimiSession(req.headers || {});
    const body = await readJsonBody(req);
    const agentProfileUrl = process.env.SHOPIFY_UCP_AGENT_PROFILE || "";
    if (!agentProfileUrl) {
      sendJson(res, 503, {
        error: "Shopify discovery is not configured. Set SHOPIFY_UCP_AGENT_PROFILE.",
        code: "SHOPIFY_CATALOG_NOT_CONFIGURED",
      });
      return;
    }

    sendJson(
      res,
      200,
      await searchShopifyGlobalCatalog({
        query: String(body?.query || ""),
        intent: typeof body?.intent === "string" ? body.intent : undefined,
        country: typeof body?.country === "string" ? body.country : "US",
        limit: Number(body?.limit) || 8,
        agentProfileUrl,
      }),
    );
  } catch (error: any) {
    sendJson(res, Number(error?.status) || 500, {
      error: error?.message || "Shopify catalog search failed.",
      code: error?.code || "SHOPIFY_CATALOG_SEARCH_FAILED",
    });
  }
}
