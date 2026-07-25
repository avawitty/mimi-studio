import { cors, readJsonBody, requireMethod, sendJson } from "../../lib/apiUtils.js";
import { verifyMimiSession } from "../../lib/serverFirebaseAdmin.js";
import { publishShopifyDraft } from "../../lib/shopifyAdmin.js";

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    await verifyMimiSession(req.headers || {});
    const body = await readJsonBody(req);
    if (body?.confirmed !== true) {
      sendJson(res, 400, {
        error: "Explicit draft-publication confirmation is required.",
        code: "SHOPIFY_CONFIRMATION_REQUIRED",
      });
      return;
    }

    sendJson(res, 200, await publishShopifyDraft(body?.product));
  } catch (error: any) {
    console.error("MIMI // Shopify draft publish failed:", {
      code: error?.code,
      message: error?.message,
    });
    sendJson(res, Number(error?.status) || 500, {
      error: error?.message || "Shopify draft publish failed.",
      code: error?.code || "SHOPIFY_PUBLISH_FAILED",
    });
  }
}

