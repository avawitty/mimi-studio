import { cors, readJsonBody, requireMethod, sendJson, sendText } from "../../lib/apiUtils.js";
import {
  chargeMimiFundedGateway,
  fundedGatewayCreditCost,
  resolveFundedGatewayApiKey,
} from "../../lib/mimiFundedGateway.js";

const DENIAL_MESSAGES: Record<string, string> = {
  sign_in_required:
    "Sign in to use Mimi trial credits on Vercel AI Gateway, or add a personal Gateway / provider key in Settings.",
  credits_exhausted:
    "Mimi trial/plan credits for AI Gateway are exhausted. Add a personal OpenAI, Anthropic, Gemini, or Gateway key in Settings, or upgrade.",
  server_gateway_unconfigured:
    "AI Gateway is not configured on this server. Add AI_GATEWAY_API_KEY or a personal provider key in Settings.",
  missing_personal_or_funded_key:
    "Vercel AI Gateway requires a personal Gateway key or a paid Mimi plan with credits remaining.",
  access_denied:
    "AI Gateway access was denied. Sign in with credits remaining, upgrade, or add a personal provider key in Settings.",
};

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const cost = fundedGatewayCreditCost();
    const { apiKey, access, denialReason } = await resolveFundedGatewayApiKey(req, cost);

    if (!apiKey) {
      return sendJson(res, 403, {
        error: {
          message: DENIAL_MESSAGES[denialReason || "missing_personal_or_funded_key"],
          code: denialReason || "missing_personal_or_funded_key",
        },
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
