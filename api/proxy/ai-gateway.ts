import { cors, readJsonBody, requireMethod, sendJson, sendText } from "../../lib/apiUtils.js";
import {
  chargeMimiFundedGateway,
  fundedGatewayCreditCost,
  resolveFundedGatewayApiKey,
} from "../../lib/mimiFundedGateway.js";

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const cost = fundedGatewayCreditCost();
    const { apiKey, access } = await resolveFundedGatewayApiKey(req, cost);

    if (!apiKey) {
      return sendJson(res, 403, {
        error: { message: "Vercel AI Gateway requires a personal Gateway key or a paid Mimi plan with credits remaining." },
      });
    }

    const upstream = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(await readJsonBody(req)),
    });

    const text = await upstream.text();
    if (access?.billable && upstream.ok) {
      let parsed: Record<string, any> = {};
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = {};
      }
      await chargeMimiFundedGateway(access, {
        model: parsed.model,
        usage: parsed.usage,
        feature: "ai-gateway:text",
      });
    }
    sendText(res, upstream.status, text, upstream.headers.get("content-type") || "application/json; charset=utf-8");
  } catch (error: any) {
    sendJson(res, 500, { error: { message: error?.message || String(error) } });
  }
}
