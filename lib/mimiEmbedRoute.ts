import { z } from "zod";
import { embedGatewayText, embedManyGatewayText } from "./ai/generate.js";
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

const embedSchema = z
  .object({
    value: z.string().trim().min(1).max(8000).optional(),
    values: z.array(z.string().trim().min(1).max(8000)).min(1).max(32).optional(),
    model: z.string().trim().min(1).max(120).optional(),
  })
  .refine((body) => Boolean(body.value || body.values?.length), {
    message: "Provide value or values to embed.",
  });

/**
 * POST /api/mimi/embed
 * First-class AI Gateway embeddings (AI SDK embed / embedMany).
 * Indexing is policy-priced at 0 credits (free_internal) but still requires a
 * resolvable Gateway key (personal BYOK or funded server key).
 */
export async function handleMimiEmbedRoute(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const body = await readJsonBody(req);
    const input = validateBody(res, embedSchema, body);
    if (!input) return;

    const cost = fundedGatewayCreditCost(creditCostForTask("embedding"));
    const { apiKey, access, denialReason } = await resolveFundedGatewayApiKey(req, cost);

    if (!apiKey) {
      return sendError(
        res,
        403,
        DENIAL_MESSAGES[denialReason || "missing_personal_or_funded_key"],
        denialReason || "missing_personal_or_funded_key",
      );
    }

    if (input.values?.length) {
      const result = await embedManyGatewayText({
        values: input.values,
        model: input.model,
        apiKey,
      });

      if (access?.billable && cost > 0) {
        await chargeMimiFundedGateway(access, {
          model: result.model,
          usage: result.usage,
          feature: "mimi:embed-many",
        });
      }

      return sendJson(res, 200, {
        embeddings: result.embeddings,
        model: result.model,
        dims: result.dims,
        usage: result.usage,
        creditsCharged: access?.billable ? cost : 0,
      });
    }

    const result = await embedGatewayText({
      value: input.value!,
      model: input.model,
      apiKey,
    });

    if (access?.billable && cost > 0) {
      await chargeMimiFundedGateway(access, {
        model: result.model,
        usage: result.usage,
        feature: "mimi:embed",
      });
    }

    sendJson(res, 200, {
      embedding: result.embedding,
      model: result.model,
      dims: result.dims,
      usage: result.usage,
      creditsCharged: access?.billable ? cost : 0,
    });
  } catch (error: any) {
    console.error("MIMI // embed error:", error);
    sendError(res, 500, error?.message || String(error), "EMBED_FAILED");
  }
}
