import { cors, providerKey, readJsonBody, requireMethod, sendJson } from "../../lib/apiUtils.js";
import { chargeMimiFundedGateway, fundedGatewayCreditCost, resolveFundedGatewayApiKey } from "../../lib/mimiFundedGateway.js";
import {
  embedGeminiContentViaGateway,
  generateGeminiContentViaGateway,
  generateGeminiImageViaGateway,
  generateGeminiImagesViaGateway,
  generateGeminiVideoViaGateway,
  pollGatewayVideoOperation,
  getServerAiGatewayKey,
  isGeminiImageRequest,
} from "../../lib/aiGatewayCompat.js";

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const { action, params } = await readJsonBody(req);
    const headerGeminiKey = String(req.headers["x-api-key"] || "").trim();
    const { apiKey: gatewayKey, access } = !headerGeminiKey && getServerAiGatewayKey()
      ? await resolveFundedGatewayApiKey(req, fundedGatewayCreditCost())
      : { apiKey: "", access: null };

    if (gatewayKey) {
      if (action === "generateContent") {
        const result = isGeminiImageRequest(params)
          ? await generateGeminiImageViaGateway(params, gatewayKey)
          : await generateGeminiContentViaGateway(params, gatewayKey, {
              feature: "gemini-compat-content",
            });
        if (access) {
          await chargeMimiFundedGateway(access, {
            model: (result as any)?.modelVersion ?? (result as any)?.model,
            usage: (result as any)?.usageMetadata ?? (result as any)?.usage,
            feature: "gemini-compat-content",
          });
        }
        return sendJson(res, 200, result);
      }
      if (action === "embedContent") {
        const result = await embedGeminiContentViaGateway(params, gatewayKey);
        if (access) {
          await chargeMimiFundedGateway(access, { model: (result as any)?.modelVersion ?? (result as any)?.model, usage: (result as any)?.usageMetadata ?? (result as any)?.usage, feature: "gemini-compat-embedding" });
        }
        return sendJson(res, 200, result);
      }
      if (action === "generateImages") {
        const result = await generateGeminiImagesViaGateway(params, gatewayKey);
        if (access) {
          await chargeMimiFundedGateway(access, { model: (result as any)?.modelVersion ?? (result as any)?.model, usage: (result as any)?.usageMetadata ?? (result as any)?.usage, feature: "gemini-compat-image" });
        }
        return sendJson(res, 200, result);
      }
      if (action === "generateVideos") {
        const result = await generateGeminiVideoViaGateway(params, gatewayKey);
        if (access) {
          await chargeMimiFundedGateway(access, { feature: "gemini-compat-video" });
        }
        return sendJson(res, 200, result);
      }
      if (action === "getVideosOperation") {
        const jobId = String(params?.operation?._gatewayJobId || params?._gatewayJobId || "");
        if (!jobId) {
          return sendJson(res, 400, { error: { message: "Gateway video job ID is required for polling." } });
        }
        const result = await pollGatewayVideoOperation(jobId, gatewayKey);
        return sendJson(res, 200, result);
      }
      if (action === "downloadVideo") {
        // AI Gateway returns public URLs directly; proxy the download so the client doesn't need CORS
        const uri = String(params?.uri || "");
        if (!uri) return sendJson(res, 400, { error: { message: "Video download URI is required." } });
        const videoResponse = await fetch(uri, {
          headers: { Authorization: `Bearer ${gatewayKey}` },
        });
        if (!videoResponse.ok) {
          return sendJson(res, videoResponse.status, {
            error: { message: `Gateway video download failed: ${videoResponse.statusText}` },
          });
        }
        const arrayBuffer = await videoResponse.arrayBuffer();
        return sendJson(res, 200, {
          data: Buffer.from(arrayBuffer).toString("base64"),
          mimeType: videoResponse.headers.get("content-type") || "video/mp4",
        });
      }
      return sendJson(res, 400, {
        error: { message: `Unsupported AI Gateway compatibility action: ${action}` },
      });
    }

    const apiKey = providerKey(req, "gemini");
    if (!apiKey) {
      return sendJson(res, 403, {
        error: { message: "Gemini requires a personal API key or MIMI_ENABLE_SERVER_AI=true with GEMINI_API_KEY." },
      });
    }

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    if (action === "generateContent") {
      const result = await ai.models.generateContent(params);
      return sendJson(res, 200, { ...result, text: result.text });
    }
    if (action === "embedContent") {
      return sendJson(res, 200, await ai.models.embedContent(params));
    }
    if (action === "generateImages") {
      return sendJson(res, 200, await ai.models.generateImages(params));
    }
    if (action === "generateVideos") {
      return sendJson(res, 200, await ai.models.generateVideos(params));
    }
    if (action === "getVideosOperation") {
      return sendJson(res, 200, await ai.operations.getVideosOperation(params));
    }
    if (action === "downloadVideo") {
      const uri = String(params?.uri || "");
      if (!uri) {
        return sendJson(res, 400, { error: { message: "Video download URI is required." } });
      }
      const videoResponse = await fetch(uri, {
        headers: { "x-goog-api-key": apiKey },
      });
      if (!videoResponse.ok) {
        return sendJson(res, videoResponse.status, {
          error: { message: `Gemini video download failed: ${videoResponse.statusText}` },
        });
      }
      const arrayBuffer = await videoResponse.arrayBuffer();
      return sendJson(res, 200, {
        data: Buffer.from(arrayBuffer).toString("base64"),
        mimeType: videoResponse.headers.get("content-type") || "video/mp4",
      });
    }

    return sendJson(res, 400, { error: { message: `Unsupported Gemini action: ${action}` } });
  } catch (error: any) {
    const raw = error?.message || String(error);
    const isBlocked =
      raw.includes("API_KEY_SERVICE_BLOCKED") ||
      raw.includes("PERMISSION_DENIED") ||
      raw.includes("generativelanguage.googleapis.com");
    sendJson(res, error?.status || error?.code || (isBlocked ? 403 : 500), {
      error: {
        message: isBlocked
          ? "Gemini key is blocked or missing Generative Language API access. Use an unrestricted key or update Google Cloud API restrictions."
          : raw,
        code: error?.code,
        status: error?.status,
      },
    });
  }
}
