import { cors, providerKey, readJsonBody, requireMethod, sendJson } from "../../lib/apiUtils.js";
import { creditCostForTask } from "../../lib/aiCreditPolicy.js";
import {
  embedGeminiContentViaGateway,
  generateGeminiContentViaGateway,
  generateGeminiImageViaGateway,
  generateGeminiImagesViaGateway,
  generateGeminiSpeechViaGateway,
  generateGeminiVideoViaGateway,
  pollGatewayVideoOperation,
  getServerAiGatewayKey,
  isGeminiAudioRequest,
  isGeminiImageRequest,
} from "../../lib/aiGatewayCompat.js";

type FundedAccess = {
  allowed: boolean;
  billable: boolean;
  uid?: string;
  cost: number;
} | null;

type GatewayResolution = {
  apiKey: string;
  access: FundedAccess;
  denialReason?: string;
  /** Only when AI Gateway is unavailable — escape hatch for personal Gemini keys. */
  useDirectGemini?: boolean;
};

const DENIAL_MESSAGES: Record<string, string> = {
  sign_in_required:
    "Sign in to use Mimi AI Gateway.",
  credits_exhausted:
    "Mimi membership credits for AI Gateway are exhausted. Credits reload with your billing period.",
  server_gateway_unconfigured:
    "AI Gateway is not configured on this server. Add AI_GATEWAY_API_KEY, or a personal Gemini key in Settings as a temporary fallback.",
  missing_personal_or_funded_key:
    "AI generation requires a signed-in Mimi membership with credits, or a personal Gateway key.",
  access_denied:
    "AI Gateway access was denied. Sign in with an active membership and credits remaining.",
};

/**
 * Resolve a gateway key without statically importing firebase-admin.
 *
 * Gemini-shaped client calls always prefer Vercel AI Gateway (funded or
 * server key). Personal `x-api-key` Gemini BYOK no longer skips the gateway —
 * that path was forcing lab users with a stale key into "configure API keys"
 * instead of plan-funded gateway routing.
 */
async function resolveGeminiGatewayKey(
  req: any,
  headerGeminiKey: string,
  cost?: number,
): Promise<GatewayResolution> {
  const serverKey = getServerAiGatewayKey();

  if (serverKey) {
    try {
      const funded = await import("../../lib/mimiFundedGateway.js");
      const resolvedCost =
        typeof cost === "number" ? cost : funded.fundedGatewayCreditCost();
      const resolved = await funded.resolveFundedGatewayApiKey(req, resolvedCost);
      if (resolved.apiKey) {
        return { apiKey: resolved.apiKey, access: resolved.access };
      }
      // Real credit exhaustion — do not bypass metering with the server key.
      // Direct Gemini BYOK remains an escape hatch only when the user supplied one.
      if (resolved.denialReason === "credits_exhausted") {
        if (headerGeminiKey) {
          return { apiKey: "", access: resolved.access, useDirectGemini: true };
        }
        return {
          apiKey: "",
          access: resolved.access,
          denialReason: "credits_exhausted",
        };
      }
      // Sign-in required or infra denial: prefer server key so generation
      // stays available (OpenAI/Anthropic proxies already do this).
      if (process.env.MIMI_REQUIRE_GATEWAY_AUTH === "1") {
        return {
          apiKey: "",
          access: null,
          denialReason: resolved.denialReason || "access_denied",
        };
      }
      return { apiKey: serverKey, access: null };
    } catch (err) {
      console.warn("MIMI // funded gateway unavailable for gemini proxy; using server AI Gateway key:", err);
      return { apiKey: serverKey, access: null };
    }
  }

  // No AI Gateway configured — only then fall back to direct Gemini.
  if (headerGeminiKey) {
    return { apiKey: "", access: null, useDirectGemini: true };
  }
  return {
    apiKey: "",
    access: null,
    denialReason: "server_gateway_unconfigured",
    useDirectGemini: true,
  };
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
    const {
      apiKey: gatewayKey,
      access,
      denialReason,
      useDirectGemini,
    } = await resolveGeminiGatewayKey(req, headerGeminiKey, creditCost);

    if (gatewayKey) {
      if (action === "generateContent") {
        const isAudio = isGeminiAudioRequest(params);
        const result = isGeminiImageRequest(params)
          ? await generateGeminiImageViaGateway(params, gatewayKey)
          : isAudio
            ? await generateGeminiSpeechViaGateway(params, gatewayKey, {
                feature: "gemini-compat-tts",
              })
            : await generateGeminiContentViaGateway(params, gatewayKey, {
                feature: "gemini-compat-content",
              });
        await maybeCharge(access, {
          model: (result as any)?.modelVersion,
          usage: (result as any)?.usageMetadata,
          feature: isAudio ? "gemini-compat-tts" : "gemini-compat-content",
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

    if (denialReason && !useDirectGemini) {
      return sendJson(res, 403, {
        error: {
          message: DENIAL_MESSAGES[denialReason] || DENIAL_MESSAGES.access_denied,
          code: denialReason,
        },
      });
    }

    const apiKey = providerKey(req, "gemini");
    if (!apiKey) {
      return sendJson(res, 403, {
        error: {
          message:
            DENIAL_MESSAGES[denialReason || "missing_personal_or_funded_key"] ||
            "Gemini requires AI Gateway (AI_GATEWAY_API_KEY) or a personal Gemini key.",
          code: denialReason || "missing_personal_or_funded_key",
        },
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
          ? "Gemini key is blocked or missing Generative Language API access. Prefer Vercel AI Gateway (AI_GATEWAY_API_KEY) for plan-funded generation."
          : raw,
        code: error?.code,
        status: error?.status,
      },
    });
  }
}
