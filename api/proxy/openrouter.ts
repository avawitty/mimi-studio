import { cors, providerKey, readJsonBody, requireMethod, sendJson, sendText } from "../../lib/apiUtils.js";

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const apiKey = providerKey(req, "openrouter");
    if (!apiKey) {
      return sendJson(res, 403, {
        error: { message: "OpenRouter requires a personal API key or MIMI_ENABLE_SERVER_AI=true with OPENROUTER_API_KEY." },
      });
    }

    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.MIMI_PUBLIC_BASE_URL || "https://mimi.you",
        "X-Title": "Mimi Zine",
      },
      body: JSON.stringify(await readJsonBody(req)),
    });

    const text = await upstream.text();
    sendText(res, upstream.status, text, upstream.headers.get("content-type") || "application/json; charset=utf-8");
  } catch (error: any) {
    sendJson(res, 500, { error: { message: error?.message || String(error) } });
  }
}
