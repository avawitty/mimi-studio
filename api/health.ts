import { cors, sendJson } from "../lib/apiUtils.js";

export default function handler(req: any, res: any) {
  if (cors(req, res)) return;
  const serverAiEnabled =
    process.env.MIMI_ENABLE_SERVER_AI === "true" ||
    process.env.MIMI_ENABLE_SERVER_AI === "1";

  sendJson(res, 200, {
    ok: true,
    service: "mimi",
    ai: {
      serverAiEnabled,
      defaultProvider: process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN
        ? "gateway"
        : "legacy",
      gemini: serverAiEnabled && Boolean(process.env.GEMINI_API_KEY || process.env.API_KEY),
      openai: serverAiEnabled && Boolean(process.env.OPENAI_API_KEY),
      anthropic: serverAiEnabled && Boolean(process.env.ANTHROPIC_API_KEY),
      openrouter: serverAiEnabled && Boolean(process.env.OPENROUTER_API_KEY),
      aiGateway: serverAiEnabled && Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN),
      replicate: serverAiEnabled && Boolean(process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY),
    },
    timestamp: new Date().toISOString(),
  });
}
