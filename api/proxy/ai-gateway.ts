import { cors, readJsonBody, requireMethod, sendJson, sendText } from "../../lib/apiUtils.js";
import { getServerAiGatewayKey } from "../../lib/aiGatewayCompat.js";

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
    const body = await readJsonBody(req);
    let apiKey = "";
    let access: { billable?: boolean } | null = null;
    let denialReason: string | undefined;

    try {
      const funded = await import("../../lib/mimiFundedGateway.js");
      const cost = funded.fundedGatewayCreditCost();
      const resolved = await funded.resolveFundedGatewayApiKey(req, cost);
      apiKey = resolved.apiKey;
      access = resolved.access;
      denialReason = resolved.denialReason;

      // Infra / sign-in gate failure: fall back to server key like openai proxy.
      if (!apiKey && denialReason !== "credits_exhausted" && process.env.MIMI_REQUIRE_GATEWAY_AUTH !== "1") {
        const serverKey = getServerAiGatewayKey();
        if (serverKey) {
          apiKey = serverKey;
          access = null;
          denialReason = undefined;
        }
      }
    } catch (err) {
      console.warn("MIMI // funded gateway unavailable for ai-gateway proxy:", err);
      apiKey = getServerAiGatewayKey() || "";
      access = null;
      if (!apiKey) denialReason = "server_gateway_unconfigured";
    }

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
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    if (access?.billable && upstream.ok) {
      try {
        const funded = await import("../../lib/mimiFundedGateway.js");
        let parsed: Record<string, any> = {};
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = {};
        }
        await funded.chargeMimiFundedGateway(access as any, {
          model: parsed.model,
          usage: parsed.usage,
          feature: "ai-gateway:text",
        });
      } catch (err) {
        console.warn("MIMI // ai-gateway credit charge skipped:", err);
      }
    }
    sendText(res, upstream.status, text, upstream.headers.get("content-type") || "application/json; charset=utf-8");
  } catch (error: any) {
    sendJson(res, 500, { error: { message: error?.message || String(error) } });
  }
}
