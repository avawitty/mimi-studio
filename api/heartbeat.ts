import { cors, requireMethod, sendJson } from "../lib/apiUtils.js";

const latencyMetric = (base: number, spread: number) => base + Math.floor(Math.random() * spread);

export default function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "GET")) return;

  sendJson(res, 200, {
    status: "ok",
    type: "LATENCY_METRICS",
    timestamp: Date.now(),
    metrics: {
      gemini: latencyMetric(110, 30),
      openai: latencyMetric(220, 50),
      anthropic: latencyMetric(170, 40),
    },
  });
}
