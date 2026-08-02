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

const generateSpecSchema = z.object({
  brief: z.string().trim().min(1, "Brief is required.").max(8000),
  format: z.string().trim().max(80).optional(),
  constraints: z.string().trim().max(2000).optional(),
});

const specSchema = z.object({
  title: z.string(),
  objective: z.string(),
  audience: z.string(),
  deliverables: z.array(z.string()),
  visualSystem: z.object({
    palette: z.array(z.string()),
    typography: z.array(z.string()),
    materials: z.array(z.string()),
  }),
  shotsOrPages: z.array(
    z.object({
      name: z.string(),
      direction: z.string(),
    }),
  ),
  openQuestions: z.array(z.string()),
});

/**
 * POST /api/mimi/generate-spec
 * Turn a creative brief into an operational production spec.
 */
export const handleMimiGenerateSpecRoute = async (req: any, res: any) => {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const body = await readJsonBody(req);
    const input = validateBody(res, generateSpecSchema, body);
    if (!input) return;

    const result = await runFundedGatewayObject({
      req,
      res,
      task: "copy",
      feature: "mimi:generate-spec",
      role: "textDeep",
      temperature: 0.4,
      system:
        "You are Mimi's spec writer. Convert briefs into precise, executable creative specs. Prefer concrete constraints over vibe adjectives.",
      schema: specSchema,
      prompt: `Generate a production spec.

Format: ${input.format || "editorial / campaign"}
Constraints: ${input.constraints || "none stated"}

BRIEF:
${input.brief}`,
    });
    if (!result) return;

    sendJson(res, 200, {
      spec: result.object,
      model: result.model,
      usage: result.usage,
      creditsCharged: result.creditsCharged,
    });
  } catch (error: any) {
    console.error("MIMI // generate-spec error:", error);
    sendError(res, 500, error?.message || String(error), "GENERATE_SPEC_FAILED");
  }
};
