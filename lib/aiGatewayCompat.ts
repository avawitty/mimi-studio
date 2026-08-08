import { modelFor } from "../services/modelConfig.js";

// Resolve text / image / video models via modelFor(..., "gateway") so calls
// use the newest curated IDs from lib/models.ts (env-overridable).
const AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1";
const DATA_URL_RE = /^data:([^;]+);base64,(.+)$/;

type GatewayRequestOptions = {
  feature?: string;
  model?: string;
};

const parseJson = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const throwGatewayError = (status: number, raw: string, fallback: string): never => {
  const payload = parseJson(raw);
  const message = payload?.error?.message || payload?.message || raw || fallback;
  throw Object.assign(new Error(message), {
    status,
    code: payload?.error?.code || payload?.code || "AI_GATEWAY_REQUEST_FAILED",
    providerStatus: status,
  });
};

const textFromUnknown = (value: any): string => {
  if (typeof value === "string") return value;
  if (!value) return "";
  if (typeof value.text === "string") return value.text;
  if (Array.isArray(value.parts)) {
    return value.parts.map((part: any) => textFromUnknown(part)).filter(Boolean).join("\n");
  }
  if (Array.isArray(value)) {
    return value.map((item) => textFromUnknown(item)).filter(Boolean).join("\n");
  }
  return "";
};

const toGatewayContentParts = (parts: any[]): any[] => {
  const converted: any[] = [];

  for (const part of parts || []) {
    if (!part) continue;
    if (typeof part === "string") {
      converted.push({ type: "text", text: part });
      continue;
    }
    if (typeof part.text === "string") {
      converted.push({ type: "text", text: part.text });
      continue;
    }
    if (part.inlineData?.data) {
      const mimeType = String(part.inlineData.mimeType || "application/octet-stream");
      if (mimeType.startsWith("image/") && !mimeType.includes("svg")) {
        converted.push({
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${part.inlineData.data}`,
            detail: "auto",
          },
        });
      } else {
        converted.push({
          type: "text",
          text: `[Attached ${mimeType} media is available to the application but is not an image input for this text request.]`,
        });
      }
      continue;
    }
    if (part.fileData?.fileUri) {
      converted.push({
        type: "text",
        text: `[Attached file reference: ${part.fileData.fileUri}]`,
      });
    }
  }

  return converted;
};

const toGatewayMessages = (contents: any): any[] => {
  if (typeof contents === "string") {
    return [{ role: "user", content: contents }];
  }

  if (!Array.isArray(contents)) {
    const parts = toGatewayContentParts(contents?.parts || [contents]);
    return [{
      role: "user",
      content: parts.length === 1 && parts[0]?.type === "text" ? parts[0].text : parts,
    }];
  }

  if (contents.every((item: any) => typeof item === "string")) {
    return [{ role: "user", content: contents.join("\n") }];
  }

  return contents.map((content: any) => {
    if (typeof content === "string") {
      return { role: "user", content };
    }
    const role = content?.role === "model" || content?.role === "assistant"
      ? "assistant"
      : "user";
    const parts = toGatewayContentParts(content?.parts || [content]);
    return {
      role,
      content: parts.length === 1 && parts[0]?.type === "text" ? parts[0].text : parts,
    };
  });
};

const hasGoogleSearchTool = (config: any) =>
  Array.isArray(config?.tools) &&
  config.tools.some((tool: any) => Boolean(tool?.googleSearch || tool?.google_search));

const requestedGatewayTextModel = (params: any) => {
  const requested = String(params?.model || "").toLowerCase();
  const config = params?.config || {};
  const deep =
    requested.includes("pro") ||
    requested.includes("deep") ||
    Boolean(config?.thinkingConfig);
  return modelFor(deep ? "textDeep" : "textFast", "gateway");
};

const gatewayMessageText = (message: any): string => {
  if (typeof message?.content === "string") return message.content;
  if (Array.isArray(message?.content)) {
    return message.content
      .map((part: any) => part?.text || part?.content || "")
      .filter(Boolean)
      .join("\n");
  }
  return "";
};

/**
 * Server-side AI Gateway credential resolver.
 *
 * On Vercel deployments, prefer the platform-provided OIDC token over a
 * long-lived API key. This avoids stale or revoked AI_GATEWAY_API_KEY values
 * shadowing the deployment identity that AI Gateway automatically supports.
 * Local/dev and non-Vercel runtimes still use AI_GATEWAY_API_KEY first.
 */
export const getServerAiGatewayKey = () => {
  const oidcToken = process.env.VERCEL_OIDC_TOKEN || "";
  const apiKey = process.env.AI_GATEWAY_API_KEY || "";
  return process.env.VERCEL ? oidcToken || apiKey : apiKey || oidcToken;
};

export const gatewayChatCompletion = async (
  apiKey: string,
  body: Record<string, any>,
  options: GatewayRequestOptions = {},
) => {
  if (!apiKey) {
    throw Object.assign(new Error("AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN is required."), {
      status: 403,
      code: "MISSING_AI_GATEWAY_KEY",
    });
  }

  const upstream = await fetch(`${AI_GATEWAY_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      ...body,
      model: options.model || body.model || modelFor("textFast", "gateway"),
      stream: false,
    }),
  });

  const raw = await upstream.text();
  if (!upstream.ok) {
    throwGatewayError(upstream.status, raw, "Vercel AI Gateway text generation failed.");
  }
  return parseJson(raw) || {};
};

export const generateGeminiContentViaGateway = async (
  params: any,
  apiKey: string,
  options: GatewayRequestOptions = {},
) => {
  const config = params?.config || {};
  const wantsJson = config.responseMimeType === "application/json";
  const systemInstruction = textFromUnknown(config.systemInstruction);
  const messages = toGatewayMessages(params?.contents);

  if (wantsJson) {
    const jsonInstruction = "Return valid JSON only. Do not wrap the JSON in Markdown.";
    messages.unshift({
      role: "system",
      content: [systemInstruction, jsonInstruction].filter(Boolean).join("\n\n"),
    });
  } else if (systemInstruction) {
    messages.unshift({ role: "system", content: systemInstruction });
  }

  const body: Record<string, any> = {
    messages,
    temperature: typeof config.temperature === "number" ? config.temperature : undefined,
    max_tokens: config.maxOutputTokens || config.max_output_tokens || undefined,
  };

  if (hasGoogleSearchTool(config)) {
    body.web_search_options = { search_context_size: "medium" };
  }

  const model = options.model || requestedGatewayTextModel(params);
  const result = await gatewayChatCompletion(apiKey, body, {
    ...options,
    model,
  });
  const choice = result?.choices?.[0] || {};
  const text = gatewayMessageText(choice.message);

  return {
    text,
    candidates: [
      {
        content: {
          role: "model",
          parts: [{ text }],
        },
        finishReason: String(choice.finish_reason || "stop").toUpperCase(),
        groundingMetadata: {
          groundingChunks: [] as any[],
        },
      },
    ],
    usageMetadata: {
      promptTokenCount: result?.usage?.prompt_tokens || 0,
      candidatesTokenCount: result?.usage?.completion_tokens || 0,
      totalTokenCount: result?.usage?.total_tokens || 0,
    },
    modelVersion: result?.model || model,
    provider: "vercel-ai-gateway",
    gatewayGenerationId: result?.generationId,
  };
};

export const embedGeminiContentViaGateway = async (
  params: any,
  apiKey: string,
) => {
  const input = Array.isArray(params?.contents)
    ? params.contents.map((item: any) => textFromUnknown(item)).filter(Boolean)
    : [textFromUnknown(params?.contents)].filter(Boolean);
  const model = modelFor("embedding", "gateway");

  const upstream = await fetch(`${AI_GATEWAY_BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: input.length === 1 ? input[0] : input,
    }),
  });

  const raw = await upstream.text();
  if (!upstream.ok) {
    throwGatewayError(upstream.status, raw, "Vercel AI Gateway embedding failed.");
  }
  const payload = parseJson(raw) || {};
  return {
    embeddings: (payload.data || []).map((item: any) => ({ values: item.embedding || [] })),
    modelVersion: payload.model || model,
    provider: "vercel-ai-gateway",
    usageMetadata: payload.usage,
  };
};

const extractImagePrompt = (params: any): string => {
  if (typeof params?.prompt === "string") return params.prompt;
  const contents = params?.contents;
  if (typeof contents === "string") return contents;
  return textFromUnknown(contents) || "Create an editorial image for Mimi.";
};

export const imageSizeFromAspectRatio = (aspectRatio?: string) => {
  if (
    aspectRatio === "16:9" ||
    aspectRatio === "3:2" ||
    aspectRatio === "4:3" ||
    aspectRatio === "landscape"
  ) {
    return "1536x1024";
  }
  if (
    aspectRatio === "9:16" ||
    aspectRatio === "2:3" ||
    aspectRatio === "3:4" ||
    aspectRatio === "portrait"
  ) {
    return "1024x1536";
  }
  return "1024x1024";
};

/**
 * Gemini Flash/Pro Image models are multimodal *language* models on the AI Gateway.
 * They reject `/v1/images/generations` with ModelTypeMismatchError and must be
 * called via `/v1/chat/completions` with `modalities: ["text","image"]`.
 * True image endpoints (gpt-image, Imagen, Flux) keep using `/images/generations`.
 */
export const gatewayImageUsesChatModalities = (model: string): boolean => {
  const id = String(model || "").toLowerCase();
  return id.includes("gemini") && id.includes("image");
};

const parseDataUrl = (value: string): { base64: string; mimeType: string } | null => {
  const match = String(value || "").match(DATA_URL_RE);
  if (!match) return null;
  return { mimeType: match[1] || "image/png", base64: match[2] };
};

export const extractGatewayChatImageBytes = (
  message: any,
): { base64: string; mimeType: string } | null => {
  const images = Array.isArray(message?.images) ? message.images : [];
  for (const image of images) {
    const url = image?.image_url?.url || image?.url || "";
    const parsed = parseDataUrl(url);
    if (parsed?.base64) return parsed;
  }

  const content = message?.content;
  if (Array.isArray(content)) {
    for (const part of content) {
      if (part?.type === "image_url") {
        const parsed = parseDataUrl(part?.image_url?.url || "");
        if (parsed?.base64) return parsed;
      }
      if (part?.inlineData?.data) {
        return {
          base64: String(part.inlineData.data),
          mimeType: String(part.inlineData.mimeType || "image/png"),
        };
      }
    }
  }

  if (typeof content === "string") {
    const parsed = parseDataUrl(content);
    if (parsed?.base64) return parsed;
  }

  return null;
};

export type GatewayImageReference = {
  dataUrl?: string;
  mimeType?: string;
  data?: string;
  url?: string;
};

export type GatewayImageGenerationInput = {
  apiKey: string;
  model: string;
  prompt: string;
  aspectRatio?: string;
  references?: GatewayImageReference[];
};

const referenceToDataUrl = (reference: GatewayImageReference): string => {
  if (reference.dataUrl && reference.dataUrl.startsWith("data:")) return reference.dataUrl;
  if (reference.url && reference.url.startsWith("data:")) return reference.url;
  if (reference.data) {
    return `data:${reference.mimeType || "image/png"};base64,${reference.data}`;
  }
  return "";
};

const collectReferenceDataUrls = (
  references: GatewayImageReference[] | undefined,
  params?: any,
): string[] => {
  const urls: string[] = [];
  for (const reference of references || []) {
    const dataUrl = referenceToDataUrl(reference);
    if (dataUrl.startsWith("data:image/")) urls.push(dataUrl);
  }

  // Gemini-compat generateContent often ships references as inlineData parts.
  const messages = params ? toGatewayMessages(params.contents) : [];
  for (const message of messages) {
    const content = message?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (part?.type === "image_url" && part?.image_url?.url?.startsWith("data:image/")) {
        urls.push(part.image_url.url);
      }
    }
  }

  return urls.slice(0, 6);
};

/**
 * Generate image bytes through Vercel AI Gateway, routing Gemini image models
 * through chat completions + modalities and other models through
 * `/images/generations`.
 */
export const generateGatewayImageBytesForModel = async (
  input: GatewayImageGenerationInput,
): Promise<{ base64: string; mimeType: string; model: string }> => {
  const apiKey = String(input.apiKey || "").trim();
  const model = String(input.model || modelFor("image", "gateway")).trim();
  const prompt = String(input.prompt || "").trim() || "Create an editorial image for Mimi.";
  const aspectRatio = input.aspectRatio || "1:1";

  if (!apiKey) {
    throw Object.assign(new Error("AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN is required."), {
      status: 403,
      code: "MISSING_AI_GATEWAY_KEY",
    });
  }

  if (gatewayImageUsesChatModalities(model)) {
    const referenceUrls = collectReferenceDataUrls(input.references);
    const content: any[] = [{ type: "text", text: prompt }];
    for (const url of referenceUrls) {
      content.push({
        type: "image_url",
        image_url: { url, detail: "auto" },
      });
    }

    const result = await gatewayChatCompletion(
      apiKey,
      {
        messages: [{ role: "user", content }],
        modalities: ["text", "image"],
      },
      { model, feature: "gateway-image-chat" },
    );

    const message = result?.choices?.[0]?.message;
    const extracted = extractGatewayChatImageBytes(message);
    if (!extracted?.base64) {
      throw Object.assign(new Error("Vercel AI Gateway did not return image bytes."), {
        status: 502,
        code: "NO_IMAGE_RETURNED",
      });
    }
    return { base64: extracted.base64, mimeType: extracted.mimeType, model: result?.model || model };
  }

  const gatewayBody: Record<string, unknown> = {
    model,
    prompt,
    n: 1,
    response_format: "b64_json",
  };
  // OpenAI-compatible sizing; BFL/Flux use their own size behavior.
  if (!model.startsWith("bfl/")) {
    gatewayBody.size = imageSizeFromAspectRatio(aspectRatio);
    gatewayBody.quality = process.env.AI_GATEWAY_IMAGE_QUALITY || "medium";
  }

  const upstream = await fetch(`${AI_GATEWAY_BASE_URL}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(gatewayBody),
  });

  const raw = await upstream.text();
  if (!upstream.ok) {
    throwGatewayError(upstream.status, raw, "Vercel AI Gateway image generation failed.");
  }
  const payload = parseJson(raw) || {};
  const first = payload?.data?.[0] || {};
  const base64 = first.b64_json || "";
  if (!base64) {
    throw Object.assign(new Error("Vercel AI Gateway did not return image bytes."), {
      status: 502,
      code: "NO_IMAGE_RETURNED",
    });
  }
  return { base64, mimeType: "image/png", model: payload?.model || model };
};

const generateGatewayImageBytes = async (
  params: any,
  apiKey: string,
) => {
  const prompt = extractImagePrompt(params);
  const aspectRatio =
    params?.config?.aspectRatio ||
    params?.config?.imageConfig?.aspectRatio ||
    "1:1";
  const model = modelFor("image", "gateway");
  const { base64, mimeType } = await generateGatewayImageBytesForModel({
    apiKey,
    model,
    prompt,
    aspectRatio,
    references: collectReferenceDataUrls(undefined, params).map((dataUrl) => ({ dataUrl })),
  });
  return { base64, mimeType, model, prompt };
};

export const generateGeminiImageViaGateway = async (
  params: any,
  apiKey: string,
) => {
  const { base64, mimeType, model } = await generateGatewayImageBytes(params, apiKey);
  return {
    candidates: [
      {
        content: {
          role: "model",
          parts: [
            {
              inlineData: {
                mimeType: mimeType || "image/png",
                data: base64,
              },
            },
          ],
        },
        finishReason: "STOP",
      },
    ],
    modelVersion: model,
    provider: "vercel-ai-gateway",
  };
};

export const generateGeminiImagesViaGateway = async (
  params: any,
  apiKey: string,
) => {
  const { base64, mimeType, model } = await generateGatewayImageBytes(params, apiKey);
  return {
    generatedImages: [
      {
        image: {
          imageBytes: base64,
          mimeType: mimeType || "image/png",
        },
      },
    ],
    modelVersion: model,
    provider: "vercel-ai-gateway",
  };
};

export const openAiMessagesViaGateway = async (
  messages: any[],
  systemInstruction: string,
  temperature: number | undefined,
  apiKey: string,
  format: "openai" | "anthropic",
) => {
  const normalizedMessages = [...(messages || [])];
  if (systemInstruction) {
    normalizedMessages.unshift({ role: "system", content: systemInstruction });
  }

  const result = await gatewayChatCompletion(
    apiKey,
    {
      messages: normalizedMessages,
      temperature,
    },
    { feature: `proxy-${format}` },
  );

  if (format === "openai") return result;

  const choice = result?.choices?.[0] || {};
  const text = gatewayMessageText(choice.message);
  return {
    id: result?.id || `msg_${Math.random().toString(36).slice(2, 15)}`,
    type: "message",
    role: "assistant",
    content: [{ type: "text", text }],
    model: result?.model || modelFor("textFast", "gateway"),
    stop_reason: choice.finish_reason === "length" ? "max_tokens" : "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: result?.usage?.prompt_tokens || 0,
      output_tokens: result?.usage?.completion_tokens || 0,
    },
  };
};

export const isGeminiImageRequest = (params: any) => {
  const model = String(params?.model || "").toLowerCase();
  return model.includes("image") || Array.isArray(params?.config?.responseModalities) &&
    params.config.responseModalities.some((value: any) => String(value).toLowerCase().includes("image"));
};

export const isGeminiVideoRequest = (params: any) => {
  const model = String(params?.model || "").toLowerCase();
  return model.includes("veo") || model.includes("video");
};

/**
 * Generate a video via the Vercel AI Gateway using the /v1/videos/generations endpoint.
 * Returns a Gemini-compat shape so existing callers can consume it unchanged.
 */
export const generateGeminiVideoViaGateway = async (
  params: any,
  apiKey: string,
): Promise<{ done: boolean; response?: any; _gatewayJobId?: string }> => {
  const model = modelFor("video", "gateway");
  const prompt = String(params?.prompt || extractImagePrompt(params) || "");
  const aspectRatio = params?.config?.aspectRatio || "16:9";
  const imageBytes = params?.image?.imageBytes || null;
  const imageMimeType = params?.image?.mimeType || "image/jpeg";

  const body: Record<string, any> = {
    model,
    prompt,
    aspect_ratio: aspectRatio,
    duration_seconds: 5,
    n: 1,
  };

  if (imageBytes) {
    body.image = { b64_json: imageBytes, mime_type: imageMimeType };
  }

  const upstream = await fetch(`${AI_GATEWAY_BASE_URL}/videos/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const raw = await upstream.text();
  if (!upstream.ok) {
    throwGatewayError(upstream.status, raw, "Vercel AI Gateway video generation failed.");
  }
  const payload = parseJson(raw) || {};

  // If the gateway returns a job ID (async), surface it; otherwise treat as done
  const jobId = payload?.id || payload?.jobId || "";
  const videoUrl = payload?.data?.[0]?.url || payload?.url || "";

  return {
    done: Boolean(videoUrl),
    _gatewayJobId: jobId,
    response: videoUrl
      ? {
          generatedVideos: [
            {
              video: { uri: videoUrl, mimeType: "video/mp4" },
            },
          ],
          provider: "vercel-ai-gateway",
          model,
        }
      : undefined,
  };
};

/**
 * Poll the AI Gateway for an async video job result.
 */
export const pollGatewayVideoOperation = async (
  jobId: string,
  apiKey: string,
): Promise<{ done: boolean; response?: any }> => {
  const upstream = await fetch(`${AI_GATEWAY_BASE_URL}/videos/generations/${jobId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const raw = await upstream.text();
  if (!upstream.ok) {
    throwGatewayError(upstream.status, raw, "Vercel AI Gateway video poll failed.");
  }
  const payload = parseJson(raw) || {};
  const videoUrl = payload?.data?.[0]?.url || payload?.url || "";
  return {
    done: Boolean(videoUrl) || payload?.status === "succeeded",
    response: videoUrl
      ? {
          generatedVideos: [{ video: { uri: videoUrl, mimeType: "video/mp4" } }],
          provider: "vercel-ai-gateway",
        }
      : undefined,
  };
};
