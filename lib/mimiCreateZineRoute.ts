import { z } from "zod";
import {
  cors,
  readJsonBody,
  requireMethod,
  sendError,
  sendJson,
  validateBody,
} from "./apiUtils.js";
import { runFundedGatewayObject } from "./mimiFundedText.js";

const createZineSchema = z.object({
  text: z.string().trim().min(1, "Source text is required.").max(12000),
  tone: z.string().trim().max(80).optional(),
  titleHint: z.string().trim().max(160).optional(),
});

const zineDraftSchema = z.object({
  title: z.string(),
  thesis: z.string(),
  tone: z.string(),
  pages: z
    .array(
      z.object({
        headline: z.string(),
        body: z.string(),
        visualDirection: z.string(),
      }),
    )
    .min(2)
    .max(8),
});

/**
 * POST /api/mimi/create-zine
 * Produces a structured zine draft via AI Gateway (not a full studio bake).
 */
export const handleMimiCreateZineRoute = async (req: any, res: any) => {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const body = await readJsonBody(req);
    const input = validateBody(res, createZineSchema, body);
    if (!input) return;

    const result = await runFundedGatewayObject({
      req,
      res,
      task: "copy",
      feature: "mimi:create-zine",
      role: "textDeep",
      temperature: 0.55,
      system:
        "You are Mimi's zine architect. Return only structured editorial drafts. Evidence-first, no fake citations.",
      schema: zineDraftSchema,
      prompt: `Draft a short zine from this source material.

Tone: ${input.tone || "editorial / archival"}
Title hint: ${input.titleHint || "(derive from material)"}

SOURCE:
${input.text}

Produce 3–6 pages with headline, body, and visualDirection for each.`,
    });
    if (!result) return;

    sendJson(res, 200, {
      status: "drafted",
      zine: result.object,
      model: result.model,
      usage: result.usage,
      creditsCharged: result.creditsCharged,
    });
  } catch (error: any) {
    console.error("MIMI // create-zine error:", error);
    sendError(res, 500, error?.message || String(error), "CREATE_ZINE_FAILED");
  }
};
