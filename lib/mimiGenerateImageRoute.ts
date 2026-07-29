import { cors, providerKey, readJsonBody, requireMethod, sendJson } from "./apiUtils.js";
import { MimiProvider } from "./mimiProvider.js";
import { MimiImageProvider } from "./mimiImageTypes.js";
import { generateMimiImageServer } from "./serverMimiImage.js";
import { getServerAiGatewayKey } from "./aiGatewayCompat.js";

export const handleMimiGenerateImageRoute = async (req: any, res: any) => {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  let body: any = null;
  let provider: MimiImageProvider = "gemini";

  try {
    body = await readJsonBody(req);
    const requestedProvider = (body.provider || "gateway") as MimiImageProvider;
    // Prefer AI Gateway when a server gateway key exists (aligned with /api/mimi-image)
    provider =
      requestedProvider === "simulated" || requestedProvider === "local"
        ? requestedProvider
        : getServerAiGatewayKey()
          ? "gateway"
          : requestedProvider === "gateway"
            ? "gemini"
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

    const apiKey =
      provider === "openai"
        ? providerKey(req, "openai")
        : provider === "replicate"
          ? providerKey(req, "replicate")
          : provider === "gateway"
            ? providerKey(req, "gateway")
            : providerKey(req, "gemini");

    if (!apiKey) {
      return sendJson(res, 403, {
        error: {
          message: "Mimi image generation requires a server or user-owned provider key.",
          code: "MISSING_IMAGE_KEY",
        },
      });
    }

    const result = await generateMimiImageServer(body, { apiKey, provider });
    return sendJson(res, 200, result);
  } catch (error: any) {
    const raw = error?.message || String(error);
    console.warn("MIMI // Image generation failed. Triggering automatic fallback to Simulated Mode in route:", raw);
    
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
          `Auto-fallback to Simulated Mirror Mode due to provider limit: ${raw}`
        ]
      });
    } catch (fallbackErr: any) {
      console.error("MIMI // Simulated fallback failed:", fallbackErr);
    }

    return sendJson(res, error?.status || error?.code || 500, {
      error: {
        message: raw,
        code: error?.code,
        status: error?.status,
      },
    });
  }
};
