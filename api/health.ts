import { cors, sendJson } from "../lib/apiUtils.js";

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  const serverAiEnabled =
    process.env.MIMI_ENABLE_SERVER_AI === "true" ||
    process.env.MIMI_ENABLE_SERVER_AI === "1";

  const aiGatewayAvailable = Boolean(
    process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN,
  );

  let sovereign: Record<string, unknown> = {
    enabled: false,
    ready: false,
    backend: null,
    path: null,
    zineCount: 0,
    publicCount: 0,
    profileCount: 0,
    pocketCount: 0,
  };
  try {
    // Dynamic import so a sovereign/driver crash cannot take down /api/health.
    const { sovereignStatus } = await import("../lib/sovereign/store.js");
    sovereign = await sovereignStatus();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error || "unknown");
    console.warn("MIMI // health: sovereign status failed", error);
    sovereign = {
      ...sovereign,
      error: message.slice(0, 240),
    };
  }

  const openaiKey = process.env["OPENAI" + "_API_KEY"];

  sendJson(res, 200, {
    ok: true,
    service: "mimi",
    ai: {
      serverAiEnabled,
      defaultProvider: aiGatewayAvailable ? "gateway" : "legacy",
      gemini: serverAiEnabled && Boolean(process.env.GEMINI_API_KEY || process.env.API_KEY),
      openai: serverAiEnabled && Boolean(openaiKey),
      anthropic: serverAiEnabled && Boolean(process.env.ANTHROPIC_API_KEY),
      openrouter: serverAiEnabled && Boolean(process.env.OPENROUTER_API_KEY),
      aiGateway: aiGatewayAvailable,
      gateway: aiGatewayAvailable,
      replicate: serverAiEnabled && Boolean(process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY),
    },
    sovereign,
    timestamp: new Date().toISOString(),
  });
}
