import { z } from "zod";
import { generateGatewayText, type GatewayTextRole } from "./ai/generate.js";
import {
  cors,
  readJsonBody,
  requireMethod,
  sendError,
  sendJson,
  validateBody,
} from "./apiUtils.js";
import { creditCostForTask } from "./aiCreditPolicy.js";
import { getServerAiGatewayKey } from "./aiGatewayCompat.js";

const DENIAL_MESSAGES: Record<string, string> = {
  sign_in_required:
    "Sign in to use Mimi AI Gateway.",
  credits_exhausted:
    "Mimi membership credits for AI Gateway are exhausted. Credits reload with your billing period.",
  server_gateway_unconfigured:
    "AI Gateway is not configured on this server. Add AI_GATEWAY_API_KEY (preferred) or a personal provider key in Settings.",
  missing_personal_or_funded_key:
    "Vercel AI Gateway requires a signed-in Mimi membership with credits remaining (or a personal Gateway key).",
  access_denied:
    "AI Gateway access was denied. Sign in with an active membership and credits remaining.",
};

const generateTextSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt is required.").max(8000, "Prompt is too long."),
  system: z.string().trim().max(4000).optional(),
  role: z.enum(["textFast", "textDeep"]).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

/**
 * POST /api/mimi/generate-text
 * First production consumer of lib/ai/generate.ts (AI SDK → AI Gateway),
 * with the same funded-gateway credit gate as /api/proxy/ai-gateway.
 */
export async function handleMimiGenerateTextRoute(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const body = await readJsonBody(req);
    const input = validateBody(res, generateTextSchema, body);
    if (!input) return;

    let apiKey = "";
    let access: { billable?: boolean } | null = null;
    let denialReason: string | undefined;
    let cost = 1;

    try {
      const funded = await import("./mimiFundedGateway.js");
      cost = funded.fundedGatewayCreditCost(creditCostForTask("copy"));
      const resolved = await funded.resolveFundedGatewayApiKey(req, cost);
      apiKey = resolved.apiKey;
      access = resolved.access;
      denialReason = resolved.denialReason;

      if (!apiKey && denialReason !== "credits_exhausted" && process.env.MIMI_REQUIRE_GATEWAY_AUTH !== "1") {
        const serverKey = getServerAiGatewayKey();
        if (serverKey) {
          apiKey = serverKey;
          access = null;
          denialReason = undefined;
        }
      }
    } catch (err) {
      console.warn("MIMI // funded gateway unavailable for generate-text:", err);
      apiKey = getServerAiGatewayKey() || "";
      access = null;
      if (!apiKey) denialReason = "server_gateway_unconfigured";
    }

    if (!apiKey) {
      return sendError(
        res,
        403,
        DENIAL_MESSAGES[denialReason || "missing_personal_or_funded_key"],
        denialReason || "missing_personal_or_funded_key",
      );
    }

    const role = (input.role || "textFast") as GatewayTextRole;
    const result = await generateGatewayText({
      prompt: input.prompt,
      system: input.system,
      role,
      temperature: input.temperature,
      apiKey,
    });

    if (access?.billable) {
      try {
        const funded = await import("./mimiFundedGateway.js");
        await funded.chargeMimiFundedGateway(access as any, {
          model: result.model,
          usage: result.usage,
          feature: "mimi:generate-text",
        });
      } catch (err) {
        console.warn("MIMI // generate-text credit charge skipped:", err);
      }
    }

    sendJson(res, 200, {
      text: result.text,
      model: result.model,
      role,
      usage: result.usage,
      creditsCharged: access?.billable ? cost : 0,
    });
  } catch (error: any) {
    console.error("MIMI // generate-text error:", error);
    sendError(res, 500, error?.message || String(error), "GENERATE_TEXT_FAILED");
  }
}
