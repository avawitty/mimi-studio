import { cors, providerKey, readJsonBody, requireMethod, sendJson, sendText } from "../../lib/apiUtils.js";

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    let apiKey = providerKey(req, "replicate" as any);
    let url = "https://integrate.replicate.com/v1/chat/completions";
    const body = await readJsonBody(req);

    if (!apiKey) {
      const gatewayKey = providerKey(req, "gateway");
      if (gatewayKey) {
        apiKey = gatewayKey;
        url = "https://ai-gateway.vercel.sh/v1/chat/completions";
        if (body.model && !body.model.startsWith("replicate/")) {
          body.model = "replicate/" + body.model;
        }
      } else {
        return sendJson(res, 403, {
          error: { message: "Replicate requires a personal API key or MIMI_ENABLE_SERVER_AI=true with REPLICATE_API_TOKEN." },
        });
      }
    }

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    sendText(res, upstream.status, text, upstream.headers.get("content-type") || "application/json; charset=utf-8");
  } catch (error: any) {
    sendJson(res, 500, { error: { message: error?.message || String(error) } });
  }
}
