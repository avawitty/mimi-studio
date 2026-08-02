/**
 * Thin Vercel AI SDK helpers that always route through AI Gateway.
 * Prefer these for new server-side text/JSON generation instead of
 * calling OpenAI/Anthropic SDKs directly.
 *
 * Models resolve via modelFor → lib/models.ts GATEWAY_DEFAULT_MODELS
 * (newest curated text / image / audio / video IDs). Pass `model` only
 * to override; do not hardcode outdated provider strings at call sites.
 */
import { generateText, Output, gateway } from "ai";
import type { ZodType } from "zod";
import { modelFor } from "../../services/modelConfig.js";

export type GatewayTextRole = "textFast" | "textDeep";

const resolveModel = (model?: string, role: GatewayTextRole = "textFast") =>
  model || modelFor(role, "gateway");

/**
 * Plain text generation via AI Gateway (string model ID or explicit gateway()).
 */
export async function generateGatewayText(options: {
  prompt: string;
  system?: string;
  model?: string;
  role?: GatewayTextRole;
  temperature?: number;
}) {
  const modelId = resolveModel(options.model, options.role ?? "textFast");
  const result = await generateText({
    model: gateway(modelId),
    prompt: options.prompt,
    system: options.system,
    temperature: options.temperature,
  });
  return {
    text: result.text,
    model: modelId,
    usage: result.usage,
  };
}

/**
 * Structured JSON via AI SDK Output.object (gateway-routed).
 */
export async function generateGatewayObject<T>(options: {
  prompt: string;
  system?: string;
  schema: ZodType<T>;
  model?: string;
  role?: GatewayTextRole;
  temperature?: number;
}) {
  const modelId = resolveModel(options.model, options.role ?? "textDeep");
  const result = await generateText({
    model: gateway(modelId),
    prompt: options.prompt,
    system: options.system,
    temperature: options.temperature,
    output: Output.object({ schema: options.schema }),
  });
  return {
    object: result.output as T,
    text: result.text,
    model: modelId,
    usage: result.usage,
  };
}
