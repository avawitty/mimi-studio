import { z } from "zod";
import {
  cors,
  readJsonBody,
  requireMethod,
  sendError,
  sendJson,
  validateBody,
} from "./apiUtils.js";
import { resolveRouteGatewayKey, sendGatewayDenial, chargeIfBillable } from "./mimiFundedText.js";
import { modelFor } from "../services/modelConfig.js";

const analyzeImageSchema = z.object({
  base64: z.string().min(1, "Image data is required."),
  mimeType: z.string().min(1, "Image mime type is required."),
  context: z.string().trim().max(2000).optional(),
});

/**
 * POST /api/mimi/analyze-image
 * Vision aesthetic read via AI Gateway chat completions.
 */
export const handleMimiAnalyzeImageRoute = async (req: any, res: any) => {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const body = await readJsonBody(req);
    const input = validateBody(res, analyzeImageSchema, body);
    if (!input) return;

    const { apiKey, access, denialReason, cost } = await resolveRouteGatewayKey(
      req,
      "vision_analysis",
    );
    if (!apiKey) {
      sendGatewayDenial(res, denialReason);
      return;
    }

    const model = modelFor("textFast", "gateway");
    const upstream = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are Mimi's vision engine. Return ONLY JSON with keys: culturalReferences (string[3]), motifs (string[]), palette (string[]), mood (string[]), form (string[]), tension (string).",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image for aesthetic DNA.${
                  input.context ? `\nContext: ${input.context}` : ""
                }`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${input.mimeType};base64,${input.base64}`,
                },
              },
            ],
          },
        ],
      }),
    });

    const raw = await upstream.text();
    if (!upstream.ok) {
      return sendError(
        res,
        upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502,
        raw.slice(0, 400) || "Vision analysis failed",
        "ANALYZE_IMAGE_FAILED",
      );
    }

    let payload: any = {};
    try {
      payload = JSON.parse(raw);
    } catch {
      return sendError(res, 502, "Gateway returned non-JSON", "ANALYZE_IMAGE_FAILED");
    }

    const content = payload?.choices?.[0]?.message?.content || "{}";
    let analysis: Record<string, unknown> = {};
    try {
      analysis = JSON.parse(content);
    } catch {
      analysis = { raw: content };
    }

    await chargeIfBillable(access, {
      model: payload?.model || model,
      usage: payload?.usage,
      feature: "mimi:analyze-image",
    });

    sendJson(res, 200, {
      analysis,
      model: payload?.model || model,
      usage: payload?.usage,
      creditsCharged: access?.billable ? cost : 0,
    });
  } catch (error: any) {
    console.error("MIMI // analyze-image error:", error);
    sendError(res, 500, error?.message || String(error), "ANALYZE_IMAGE_FAILED");
  }
};
