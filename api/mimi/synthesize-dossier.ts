import { cors, readJsonBody, requireMethod, sendJson } from "../../lib/apiUtils.js";
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

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const body = await readJsonBody(req);
    const images = Array.isArray(body.images) ? (body.images as DossierImagePayload[]) : [];
    const userBlurb = typeof body.userBlurb === "string" ? body.userBlurb : undefined;

    if (images.length < 3 || images.length > 8) {
      return sendJson(res, 400, { error: "Upload between 3 and 8 reference images." });
    }

    const cost = fundedGatewayCreditCost(creditCostForTask("tailor_analysis"));
    const { apiKey, access } = await resolveFundedGatewayApiKey(req, cost);

    if (!apiKey) {
      return sendJson(res, 403, {
        error:
          "Sign in with trial credits remaining, upgrade to a paid plan, or add your own Gemini key in Settings.",
      });
    }

    const userPrompt = buildCreativeDossierUserPrompt(images.length, userBlurb);
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
      return sendJson(res, upstream.status, { error: message || "Dossier synthesis failed." });
    }

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      return sendJson(res, 502, { error: "Invalid response from AI Gateway." });
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
      return sendJson(res, 502, { error: "Model returned an invalid dossier payload." });
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
    sendJson(res, 500, { error: error?.message || String(error) });
  }
}
