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

const analyzeSignalsSchema = z.object({
  signals: z
    .array(z.string().trim().min(1))
    .min(1, "At least one signal is required.")
    .max(40),
  focus: z.string().trim().max(400).optional(),
});

const signalReportSchema = z.object({
  summary: z.string(),
  clusters: z.array(
    z.object({
      label: z.string(),
      weight: z.number(),
      members: z.array(z.string()),
    }),
  ),
  tensions: z.array(z.string()),
  nextMoves: z.array(z.string()),
});

/**
 * POST /api/mimi/analyze-signals
 * Cluster and interpret aesthetic / research signals.
 */
export const handleMimiSignalReaderRoute = async (req: any, res: any) => {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const body = await readJsonBody(req);
    const input = validateBody(res, analyzeSignalsSchema, body);
    if (!input) return;

    const result = await runFundedGatewayObject({
      req,
      res,
      task: "copy",
      feature: "mimi:analyze-signals",
      role: "textDeep",
      temperature: 0.35,
      system:
        "You are Mimi's signal reader. Cluster sparse aesthetic signals into actionable editorial intelligence. No invented sources.",
      schema: signalReportSchema,
      prompt: `Analyze these signals.

Focus: ${input.focus || "general aesthetic trajectory"}

Signals:
${input.signals.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Return clusters (label, weight 0-1, members), tensions, and nextMoves.`,
    });
    if (!result) return;

    sendJson(res, 200, {
      report: result.object,
      model: result.model,
      usage: result.usage,
      creditsCharged: result.creditsCharged,
    });
  } catch (error: any) {
    console.error("MIMI // analyze-signals error:", error);
    sendError(res, 500, error?.message || String(error), "ANALYZE_SIGNALS_FAILED");
  }
};
