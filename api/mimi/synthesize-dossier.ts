import { z } from "zod";
import { cors, readJsonBody, requireMethod, sendError, sendJson, validateBody } from "../../lib/apiUtils.js";
import {
  chargeMimiFundedGateway,
  fundedGatewayCreditCost,
  resolveFundedGatewayApiKey,
} from "../../lib/mimiFundedGateway.js";
import {
  CREATIVE_DOSSIER_SYSTEM_PROMPT,
  buildCreativeDossierUserPrompt,
} from "../../lib/creativeDossierPrompts.js";
import { creditCostForTask } from "../../lib/aiCreditPolicy.js";

const DOSSIER_MODEL = process.env.MIMI_DOSSIER_GATEWAY_MODEL || "google/gemini-3.5-flash";

type DossierImagePayload = { base64: string; mimeType: string };

const dossierSchema = z.object({
  images: z
    .array(
      z.object({
        base64: z.string().min(1, "Image data is required."),
        mimeType: z.string().min(1, "Image mime type is required."),
      }),
    )
    .max(8, "Upload at most 8 reference images."),
  userBlurb: z.string().optional(),
  blueprintDigest: z.string().optional(),
});

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const body = await readJsonBody(req);
    const input = validateBody(res, dossierSchema, body);
    if (!input) return;
    const images = input.images as DossierImagePayload[];
    const userBlurb = input.userBlurb;
    const blueprintDigest = input.blueprintDigest?.trim() || undefined;

    if (images.length < 3 && !blueprintDigest) {
      return sendError(
        res,
        400,
        "Provide a Tailor blueprint or upload at least 3 reference images to compile a full read.",
        "INSUFFICIENT_INPUT",
      );
    }

    const cost = fundedGatewayCreditCost(creditCostForTask("tailor_analysis"));
    const { apiKey, access } = await resolveFundedGatewayApiKey(req, cost);

    if (!apiKey) {
      return sendError(
        res,
        403,
        "Sign in with trial credits remaining, upgrade to a paid plan, or add your own Gemini key in Settings.",
        "NO_CREDITS",
      );
    }

    const userPrompt = buildCreativeDossierUserPrompt(images.length, userBlurb, blueprintDigest);
    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: "text", text: userPrompt },
    ];

    for (let i = 0; i < images.length; i += 1) {
      const img = images[i];
      const refId = `ref_${String(i + 1).padStart(2, "0")}`;
      content.push({ type: "text", text: `[${refId}]` });
      content.push({
        type: "image_url",
        image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
      });
    }

    const upstream = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DOSSIER_MODEL,
        messages: [
          { role: "system", content: `${CREATIVE_DOSSIER_SYSTEM_PROMPT}\nRespond strictly in valid JSON.` },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      }),
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      let message = text;
      try {
        const parsed = JSON.parse(text);
        message = parsed?.error?.message || message;
      } catch {
        // keep raw text
      }
      return sendError(res, upstream.status, message || "Dossier synthesis failed.", "GATEWAY_ERROR");
    }

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      return sendError(res, 502, "Invalid response from AI Gateway.", "BAD_GATEWAY_RESPONSE");
    }

    const rawContent = parsed.choices?.[0]?.message?.content;
    let dossierRaw: unknown = rawContent;
    if (typeof rawContent === "string") {
      try {
        dossierRaw = JSON.parse(rawContent.replace(/```json/g, "").replace(/```/g, "").trim());
      } catch {
        dossierRaw = null;
      }
    }

    if (!dossierRaw || typeof dossierRaw !== "object") {
      return sendError(res, 502, "Model returned an invalid dossier payload.", "INVALID_DOSSIER");
    }

    if (access?.billable) {
      await chargeMimiFundedGateway(access, {
        model: String(parsed.model || DOSSIER_MODEL),
        usage: parsed.usage,
        feature: "tailor:dossier-scry",
      });
    }

    sendJson(res, 200, { dossier: dossierRaw, creditsCharged: access?.billable ? cost : 0 });
  } catch (error: any) {
    console.error("MIMI // Dossier synthesis error:", error);
    sendError(res, 500, error?.message || String(error), "DOSSIER_FAILED");
  }
}
