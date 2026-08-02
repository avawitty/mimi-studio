import { cors, sendJson } from "../lib/apiUtils.js";
import { sovereignStatus } from "../lib/sovereign/store.js";

const sovereignStatusSafe = async () => {
  try {
    return await Promise.race([
      sovereignStatus(),
      new Promise<Awaited<ReturnType<typeof sovereignStatus>>>((resolve) => {
        setTimeout(
          () =>
            resolve({
              enabled: false,
              ready: false,
              backend: null,
              path: null,
              zineCount: 0,
              publicCount: 0,
              profileCount: 0,
              pocketCount: 0,
              schemaVersion: null,
              latencyMs: null,
              gatewayEmbed: false,
              embeddedCount: 0,
            }),
          9_000,
        );
      }),
    ]);
  } catch {
    return {
      enabled: false,
      ready: false,
      backend: null as "sqlite" | "postgres" | null,
      path: null as string | null,
      zineCount: 0,
      publicCount: 0,
      profileCount: 0,
      pocketCount: 0,
      schemaVersion: null as number | null,
      latencyMs: null as number | null,
      gatewayEmbed: false,
      embeddedCount: 0,
    };
  }
};

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  const serverAiEnabled =
    process.env.MIMI_ENABLE_SERVER_AI === "true" ||
    process.env.MIMI_ENABLE_SERVER_AI === "1";

  const aiGatewayAvailable = Boolean(
    process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN,
  );

  sendJson(res, 200, {
    ok: true,
    service: "mimi",
    ai: {
      serverAiEnabled,
      defaultProvider: aiGatewayAvailable ? "gateway" : "legacy",
      gemini: serverAiEnabled && Boolean(process.env.GEMINI_API_KEY || process.env.API_KEY),
      openai: serverAiEnabled && Boolean(process.env.OPENAI_API_KEY),
      anthropic: serverAiEnabled && Boolean(process.env.ANTHROPIC_API_KEY),
      openrouter: serverAiEnabled && Boolean(process.env.OPENROUTER_API_KEY),
      aiGateway: aiGatewayAvailable,
      gateway: aiGatewayAvailable,
      replicate: serverAiEnabled && Boolean(process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY),
    },
    sovereign: await sovereignStatusSafe(),
    timestamp: new Date().toISOString(),
  });
}
