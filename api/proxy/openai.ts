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
      const messages = body.messages || [];
      const systemInstruction = messages.find((message: any) => message.role === "system")?.content || "";
      const userMessages = messages.filter((message: any) => message.role !== "system");
      const result = await openAiMessagesViaGateway(
        userMessages,
        systemInstruction,
        body.temperature,
        serverGatewayKey,
        "openai",
      );
      return sendJson(res, 200, result);
    }

    let apiKey = providerKey(req, "openai");
    let url = "https://api.openai.com/v1/chat/completions";

    if (!apiKey) {
      const gatewayKey = providerKey(req, "gateway");
      if (gatewayKey) {
        apiKey = gatewayKey;
        url = "https://ai-gateway.vercel.sh/v1/chat/completions";
        if (body.model && !body.model.startsWith("openai/")) {
          body.model = "openai/" + body.model;
        }
      } else {
        return sendJson(res, 403, {
          error: { message: "OpenAI requires a personal API key or MIMI_ENABLE_SERVER_AI=true with OPENAI_API_KEY." },
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
