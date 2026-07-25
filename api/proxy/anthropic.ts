import { cors, providerKey, readJsonBody, requireMethod, sendJson, sendText } from "../../lib/apiUtils.js";
import {
  getServerAiGatewayKey,
  openAiMessagesViaGateway,
} from "../../lib/aiGatewayCompat.js";

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const body = await readJsonBody(req);
    const serverGatewayKey = getServerAiGatewayKey();
    if (serverGatewayKey) {
      const result = await openAiMessagesViaGateway(
        body.messages || [],
        body.system || "",
        body.temperature,
        serverGatewayKey,
        "anthropic",
      );
      return sendJson(res, 200, result);
    }

    let apiKey = providerKey(req, "anthropic");
    let url = "https://api.anthropic.com/v1/messages";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (!apiKey) {
      const gatewayKey = providerKey(req, "gateway");
      if (gatewayKey) {
        apiKey = gatewayKey;
        url = "https://ai-gateway.vercel.sh/v1/messages";
        headers["Authorization"] = `Bearer ${apiKey}`;
        if (body.model && !body.model.startsWith("anthropic/")) {
          body.model = "anthropic/" + body.model;
        }
      } else {
        return sendJson(res, 403, {
          error: { message: "Anthropic requires a personal API key or MIMI_ENABLE_SERVER_AI=true with ANTHROPIC_API_KEY." },
        });
      }
    } else {
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = String(req.headers["anthropic-version"] || "2023-06-01");
    }

    const upstream = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    sendText(res, upstream.status, text, upstream.headers.get("content-type") || "application/json; charset=utf-8");
  } catch (error: any) {
    sendJson(res, 500, { error: { message: error?.message || String(error) } });
  }
}
