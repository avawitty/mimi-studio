import { modelFor } from "../services/modelConfig.js";

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

export const getServerAiGatewayKey = () =>
  process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || "";

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
          groundingChunks: [],
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

const imageSizeFromAspectRatio = (aspectRatio?: string) => {
  if (aspectRatio === "16:9" || aspectRatio === "3:2") return "1536x1024";
  if (aspectRatio === "9:16" || aspectRatio === "2:3" || aspectRatio === "3:4") return "1024x1536";
  return "1024x1024";
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

  const upstream = await fetch(`${AI_GATEWAY_BASE_URL}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size: imageSizeFromAspectRatio(aspectRatio),
      quality: process.env.AI_GATEWAY_IMAGE_QUALITY || "medium",
      response_format: "b64_json",
    }),
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
  return { base64, model, prompt };
};

export const generateGeminiImageViaGateway = async (
  params: any,
  apiKey: string,
) => {
  const { base64, model } = await generateGatewayImageBytes(params, apiKey);
  return {
    candidates: [
      {
        content: {
          role: "model",
          parts: [
            {
              inlineData: {
                mimeType: "image/png",
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
  const { base64, model } = await generateGatewayImageBytes(params, apiKey);
  return {
    generatedImages: [
      {
        image: {
          imageBytes: base64,
          mimeType: "image/png",
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
