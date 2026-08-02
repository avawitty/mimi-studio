import { cors, providerKey, readJsonBody, requireMethod, sendJson } from "../../lib/apiUtils.js";
import { creditCostForTask } from "../../lib/aiCreditPolicy.js";
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

type FundedAccess = {
  allowed: boolean;
  billable: boolean;
  uid?: string;
  cost: number;
} | null;

/**
 * Resolve a gateway key without statically importing firebase-admin.
 * Credit metering is best-effort; if the funded path fails to load, fall back
 * to the server AI Gateway key (same resilience as /api/proxy/openai).
 */
async function resolveGeminiGatewayKey(
  req: any,
  headerGeminiKey: string,
  cost?: number,
): Promise<{ apiKey: string; access: FundedAccess }> {
  if (headerGeminiKey) return { apiKey: "", access: null };

  const serverKey = getServerAiGatewayKey();
  if (!serverKey) return { apiKey: "", access: null };

  try {
    const funded = await import("../../lib/mimiFundedGateway.js");
    const resolvedCost =
      typeof cost === "number" ? cost : funded.fundedGatewayCreditCost();
    const resolved = await funded.resolveFundedGatewayApiKey(req, resolvedCost);
    if (resolved.apiKey) {
      return { apiKey: resolved.apiKey, access: resolved.access };
    }
    // Real credit exhaustion — do not bypass metering.
    if (resolved.denialReason === "credits_exhausted") {
      return { apiKey: "", access: resolved.access };
    }
    // Sign-in required or infra denial: prefer server key so zine/generation
    // stays available (OpenAI/Anthropic proxies already do this).
    if (process.env.MIMI_REQUIRE_GATEWAY_AUTH === "1") {
      return { apiKey: "", access: null };
    }
    return { apiKey: serverKey, access: null };
  } catch (err) {
    console.warn("MIMI // funded gateway unavailable for gemini proxy; using server AI Gateway key:", err);
    return { apiKey: serverKey, access: null };
  }
}

async function maybeCharge(
  access: FundedAccess,
  meta: { model?: string; usage?: unknown; feature?: string },
) {
  if (!access?.billable || !(access.cost > 0)) return;
  try {
    const funded = await import("../../lib/mimiFundedGateway.js");
    await funded.chargeMimiFundedGateway(access, meta);
  } catch (err) {
    console.warn("MIMI // gemini credit charge skipped:", err);
  }
}

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const { action, params } = await readJsonBody(req);
    const headerGeminiKey = String(req.headers["x-api-key"] || "").trim();
    // Embeddings are free_internal (0 credits); other Gemini-compat actions keep the text default.
    let creditCost: number | undefined;
    if (action === "embedContent") {
      const funded = await import("../../lib/mimiFundedGateway.js");
      creditCost = funded.fundedGatewayCreditCost(creditCostForTask("embedding"));
    }
    const { apiKey: gatewayKey, access } = await resolveGeminiGatewayKey(
      req,
      headerGeminiKey,
      creditCost,
    );

    if (gatewayKey) {
      if (action === "generateContent") {
        const result = isGeminiImageRequest(params)
          ? await generateGeminiImageViaGateway(params, gatewayKey)
          : await generateGeminiContentViaGateway(params, gatewayKey, {
              feature: "gemini-compat-content",
            });
        await maybeCharge(access, {
          model: (result as any)?.modelVersion,
          usage: (result as any)?.usageMetadata,
          feature: "gemini-compat-content",
        });
        return sendJson(res, 200, result);
      }
      if (action === "embedContent") {
        const result = await embedGeminiContentViaGateway(params, gatewayKey);
        // free_internal — never charge for indexing embeddings
        return sendJson(res, 200, result);
      }
      if (action === "generateImages") {
        const result = await generateGeminiImagesViaGateway(params, gatewayKey);
        await maybeCharge(access, {
          model: (result as any)?.modelVersion,
          usage: (result as any)?.usageMetadata,
          feature: "gemini-compat-image",
        });
        return sendJson(res, 200, result);
      }
      if (action === "generateVideos") {
        const result = await generateGeminiVideoViaGateway(params, gatewayKey);
        await maybeCharge(access, { feature: "gemini-compat-video" });
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
