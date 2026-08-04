import { cors, providerKey, readJsonBody, requireMethod, sendJson } from "../lib/apiUtils.js";
import { MimiProvider } from "../lib/mimiProvider.js";
import { generateMimiImageBatchServer, generateMimiImageServer } from "../lib/serverMimiImage.js";
import { MimiImageProvider } from "../lib/mimiImageTypes.js";
import { getServerAiGatewayKey } from "../lib/aiGatewayCompat.js";

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  let body: any = null;
  let provider: MimiImageProvider = "gemini";

  try {
    body = await readJsonBody(req);
    const requestedProvider = (body.provider || "gateway") as MimiImageProvider;
    provider =
      requestedProvider === "simulated" || requestedProvider === "local"
        ? requestedProvider
        : getServerAiGatewayKey()
          ? "gateway"
          : requestedProvider;

    if (provider === "simulated" || provider === "local") {
      const result = await MimiProvider.generateImage({
        userPrompt: body.prompt || body.userPrompt,
        references: body.references,
        mode: body.mode,
        styleGuide: body.styleGuide,
        negativePrompt: body.negativePrompt,
        aspectRatio: body.aspectRatio,
        imageSize: body.imageSize,
        provider,
        model: body.model,
        metadata: {
          ...(body.metadata || {}),
          noKeyPreview: true,
          source: "mimi-image-lab",
        },
      });
      return sendJson(res, 200, result);
    }

    let apiKey = "";
    if (provider === "openai") {
      apiKey = providerKey(req, "openai");
    } else if (provider === "replicate") {
      apiKey = providerKey(req, "replicate");
    } else if (provider === "gateway") {
      apiKey = providerKey(req, "gateway");
    } else {
      apiKey = providerKey(req, "gemini");
    }

    if (!apiKey) {
      return sendJson(res, 403, {
        error: {
          message:
            "Mimi Image requires an AI_GATEWAY_API_KEY, VERCEL_OIDC_TOKEN, or a configured legacy image-provider key.",
          code: "MISSING_IMAGE_KEY",
        },
      });
    }

    const variantCount = Number(body.variantCount) || 1;
    const generate =
      variantCount > 1 ? generateMimiImageBatchServer : generateMimiImageServer;
    const result = await generate(
      variantCount > 1 ? { ...body, variantCount } : body,
      { apiKey, provider },
    );
    return sendJson(res, 200, result);
  } catch (error: any) {
    const raw = error?.message || String(error);
    const isZdrBlocked =
      raw.includes("No ZDR") ||
      raw.includes("ZDR-attested");
    const fallbackWarning = isZdrBlocked
      ? "Gateway privacy policy requires Zero Data Retention, but the selected image model has no eligible ZDR provider. Choose a ZDR-compatible model, configure ZDR-attested BYOK credentials, or review the Gateway privacy setting."
      : `Auto-fallback to Simulated Mirror Mode due to provider limit: ${raw}`;
    console.warn("MIMI // Image generation failed. Triggering automatic fallback to Simulated Mode:", raw);
    
    try {
      const fallbackResult = await MimiProvider.simulated().generateImage({
        userPrompt: body?.prompt || body?.userPrompt || "Untitled Plate",
        references: body?.references,
        mode: body?.mode,
        styleGuide: body?.styleGuide,
        negativePrompt: body?.negativePrompt,
        aspectRatio: body?.aspectRatio,
        imageSize: body?.imageSize,
        provider: "simulated",
        model: body?.model,
        metadata: {
          ...(body?.metadata || {}),
          fallbackFrom: provider,
          fallbackReason: raw,
        },
      });
      return sendJson(res, 200, {
        ...fallbackResult,
        warnings: [
          ...(fallbackResult.warnings || []),
          fallbackWarning,
        ]
      });
    } catch (fallbackErr: any) {
      console.error("MIMI // Simulated fallback failed:", fallbackErr);
    }

    const isBlocked =
      raw.includes("API_KEY_SERVICE_BLOCKED") ||
      raw.includes("PERMISSION_DENIED") ||
      raw.includes("generativelanguage.googleapis.com");

    return sendJson(res, error?.status || error?.code || (isBlocked ? 403 : 500), {
      error: {
        message: isBlocked
          ? "Gemini image key is blocked or missing Generative Language API access. Enable generativelanguage.googleapis.com for the key or use another Gemini key."
          : raw,
        code: error?.code,
        status: error?.status,
        finishReason: error?.finishReason,
      },
    });
  }
}
