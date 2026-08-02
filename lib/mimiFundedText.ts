import { z } from "zod";
import { generateGatewayObject, generateGatewayText, type GatewayTextRole } from "./ai/generate.js";
import { creditCostForTask, type MimiAiTaskKind } from "./aiCreditPolicy.js";
import { getServerAiGatewayKey } from "./aiGatewayCompat.js";
import { sendError } from "./apiUtils.js";

const DENIAL_MESSAGES: Record<string, string> = {
  sign_in_required: "Sign in to use Mimi AI Gateway.",
  credits_exhausted:
    "Mimi membership credits for AI Gateway are exhausted. Credits reload with your billing period.",
  server_gateway_unconfigured:
    "AI Gateway is not configured on this server. Add AI_GATEWAY_API_KEY (preferred) or a personal provider key in Settings.",
  missing_personal_or_funded_key:
    "Vercel AI Gateway requires a signed-in Mimi membership with credits remaining (or a personal Gateway key).",
  access_denied:
    "AI Gateway access was denied. Sign in with an active membership and credits remaining.",
};

export async function resolveRouteGatewayKey(
  req: any,
  task: MimiAiTaskKind = "copy",
): Promise<{
  apiKey: string;
  access: { billable?: boolean } | null;
  denialReason?: string;
  cost: number;
}> {
  let apiKey = "";
  let access: { billable?: boolean } | null = null;
  let denialReason: string | undefined;
  let cost = 1;

  try {
    const funded = await import("./mimiFundedGateway.js");
    cost = funded.fundedGatewayCreditCost(creditCostForTask(task));
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
    console.warn("MIMI // funded gateway unavailable:", err);
    apiKey = getServerAiGatewayKey() || "";
    access = null;
    if (!apiKey) denialReason = "server_gateway_unconfigured";
  }

  return { apiKey, access, denialReason, cost };
}

export function sendGatewayDenial(res: any, denialReason?: string) {
  return sendError(
    res,
    403,
    DENIAL_MESSAGES[denialReason || "missing_personal_or_funded_key"],
    denialReason || "missing_personal_or_funded_key",
  );
}

export async function chargeIfBillable(
  access: { billable?: boolean } | null,
  meta: { model?: string; usage?: unknown; feature: string },
) {
  if (!access?.billable) return;
  try {
    const funded = await import("./mimiFundedGateway.js");
    await funded.chargeMimiFundedGateway(access as any, meta);
  } catch (err) {
    console.warn("MIMI // credit charge skipped:", err);
  }
}

export async function runFundedGatewayText(options: {
  req: any;
  res: any;
  prompt: string;
  system?: string;
  role?: GatewayTextRole;
  temperature?: number;
  task?: MimiAiTaskKind;
  feature: string;
}) {
  const { apiKey, access, denialReason, cost } = await resolveRouteGatewayKey(
    options.req,
    options.task || "copy",
  );
  if (!apiKey) {
    sendGatewayDenial(options.res, denialReason);
    return null;
  }

  const result = await generateGatewayText({
    prompt: options.prompt,
    system: options.system,
    role: options.role || "textFast",
    temperature: options.temperature,
    apiKey,
  });

  await chargeIfBillable(access, {
    model: result.model,
    usage: result.usage,
    feature: options.feature,
  });

  return { ...result, creditsCharged: access?.billable ? cost : 0 };
}

export async function runFundedGatewayObject<T>(options: {
  req: any;
  res: any;
  prompt: string;
  system?: string;
  schema: z.ZodType<T>;
  role?: GatewayTextRole;
  temperature?: number;
  task?: MimiAiTaskKind;
  feature: string;
}) {
  const { apiKey, access, denialReason, cost } = await resolveRouteGatewayKey(
    options.req,
    options.task || "copy",
  );
  if (!apiKey) {
    sendGatewayDenial(options.res, denialReason);
    return null;
  }

  const result = await generateGatewayObject({
    prompt: options.prompt,
    system: options.system,
    schema: options.schema,
    role: options.role || "textDeep",
    temperature: options.temperature,
    apiKey,
  });

  await chargeIfBillable(access, {
    model: result.model,
    usage: result.usage,
    feature: options.feature,
  });

  return { ...result, creditsCharged: access?.billable ? cost : 0 };
}
