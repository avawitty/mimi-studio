/**
 * Thin Vercel AI SDK helpers that always route through AI Gateway.
 * Prefer these for new server-side text/JSON/embedding calls instead of
 * calling OpenAI/Anthropic SDKs directly.
 *
 * Models resolve via modelFor → lib/models.ts GATEWAY_DEFAULT_MODELS
 * (newest curated text / image / audio / video / embedding IDs). Pass `model`
 * only to override; do not hardcode outdated provider strings at call sites.
 *
 * Pass `apiKey` for funded-gateway / BYOK request paths so concurrent
 * requests never mutate process.env.AI_GATEWAY_API_KEY.
 *
 * Embeddings: use embedGatewayText / embedManyGatewayText (AI SDK → Gateway).
 * The Gemini-compat proxy still uses lib/aiGatewayCompat.embedGeminiContentViaGateway
 * (OpenAI-compatible POST /v1/embeddings) for client embedContent remaps.
 */
import {
  generateText,
  Output,
  createGateway,
  gateway,
  embed,
  embedMany,
  experimental_generateSpeech as generateSpeech,
} from "ai";
import type { ZodType } from "zod";
import { modelFor } from "../../services/modelConfig.js";

export type GatewayTextRole = "textFast" | "textDeep";

const resolveModel = (model?: string, role: GatewayTextRole = "textFast") =>
  model || modelFor(role, "gateway");

const resolveGatewayModel = (modelId: string, apiKey?: string) =>
  apiKey ? createGateway({ apiKey })(modelId) : gateway(modelId);

const resolveEmbeddingModel = (modelId: string, apiKey?: string) => {
  const provider = apiKey ? createGateway({ apiKey }) : gateway;
  return provider.textEmbeddingModel(modelId);
};

/**
 * Plain text generation via AI Gateway (string model ID or explicit gateway()).
 */
export async function generateGatewayText(options: {
  prompt: string;
  system?: string;
  model?: string;
  role?: GatewayTextRole;
  temperature?: number;
  apiKey?: string;
  abortSignal?: AbortSignal;
}) {
  const modelId = resolveModel(options.model, options.role ?? "textFast");
  const result = await generateText({
    model: resolveGatewayModel(modelId, options.apiKey),
    prompt: options.prompt,
    system: options.system,
    temperature: options.temperature,
    abortSignal: options.abortSignal,
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
  apiKey?: string;
  abortSignal?: AbortSignal;
}) {
  const modelId = resolveModel(options.model, options.role ?? "textDeep");
  const result = await generateText({
    model: resolveGatewayModel(modelId, options.apiKey),
    prompt: options.prompt,
    system: options.system,
    temperature: options.temperature,
    output: Output.object({ schema: options.schema }),
    abortSignal: options.abortSignal,
  });
  return {
    object: result.output as T,
    text: result.text,
    model: modelId,
    usage: result.usage,
  };
}

/**
 * Single-text embedding via AI Gateway (default: openai/text-embedding-3-small).
 * See https://vercel.com/docs/ai-gateway/modalities/embeddings
 */
export async function embedGatewayText(options: {
  value: string;
  model?: string;
  apiKey?: string;
}) {
  const modelId = options.model || modelFor("embedding", "gateway");
  const result = await embed({
    model: resolveEmbeddingModel(modelId, options.apiKey),
    value: options.value,
  });
  return {
    embedding: result.embedding as number[],
    model: modelId,
    usage: result.usage,
    dims: result.embedding.length,
  };
}

/**
 * Batch embeddings via AI Gateway.
 */
export async function embedManyGatewayText(options: {
  values: string[];
  model?: string;
  apiKey?: string;
}) {
  const modelId = options.model || modelFor("embedding", "gateway");
  const result = await embedMany({
    model: resolveEmbeddingModel(modelId, options.apiKey),
    values: options.values,
  });
  const embeddings = result.embeddings as number[][];
  return {
    embeddings,
    model: modelId,
    usage: result.usage,
    dims: embeddings[0]?.length ?? 0,
  };
}

const resolveSpeechProvider = (apiKey?: string) =>
  apiKey ? createGateway({ apiKey }) : gateway;

/**
 * Text-to-speech via AI Gateway (default: xai/grok-tts or env override).
 * See https://vercel.com/docs/ai-gateway/modalities/text-to-speech
 */
export async function generateGatewaySpeech(options: {
  text: string;
  voice?: string;
  instructions?: string;
  outputFormat?: "mp3" | "wav";
  model?: string;
  apiKey?: string;
}) {
  const modelId = options.model || modelFor("tts", "gateway");
  const provider = resolveSpeechProvider(options.apiKey);
  const result = await generateSpeech({
    model: provider.speechModel(modelId),
    text: options.text,
    voice: options.voice,
    instructions: options.instructions,
    outputFormat: options.outputFormat || "mp3",
  });
  const audio = result.audio.uint8Array;
  const mimeType =
    options.outputFormat === "wav" || modelId.includes("gemini")
      ? "audio/wav"
      : "audio/mpeg";
  return {
    audio,
    mimeType,
    model: modelId,
    warnings: result.warnings,
  };
}
