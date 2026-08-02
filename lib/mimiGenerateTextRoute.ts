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
import {
  chargeMimiFundedGateway,
  fundedGatewayCreditCost,
  resolveFundedGatewayApiKey,
} from "./mimiFundedGateway.js";

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

    const cost = fundedGatewayCreditCost(creditCostForTask("copy"));
    const { apiKey, access, denialReason } = await resolveFundedGatewayApiKey(req, cost);

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
      await chargeMimiFundedGateway(access, {
        model: result.model,
        usage: result.usage,
        feature: "mimi:generate-text",
      });
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
