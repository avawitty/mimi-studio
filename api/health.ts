import { cors, sendJson } from "../lib/apiUtils.js";
import { isSovereignEnabled } from "../lib/sovereign/db.js";
import { isSovereignGatewayEmbedEnabled } from "../lib/sovereign/embeddings.js";
import { neonAuthStatusSnippet } from "../lib/sovereign/neonAuth.js";

/** Keep /api/health under typical serverless wait budgets when Neon is slow. */
const SOVEREIGN_HEALTH_BUDGET_MS = 9_000;

const fallbackSovereignStatus = () => ({
  enabled: isSovereignEnabled(),
  ready: false,
  backend: null as "sqlite" | "postgres" | null,
  path: null as string | null,
  zineCount: 0,
  publicCount: 0,
  profileCount: 0,
  pocketCount: 0,
  schemaVersion: null as number | null,
  latencyMs: null as number | null,
  gatewayEmbed: isSovereignGatewayEmbedEnabled(),
  embeddedCount: 0,
  ...neonAuthStatusSnippet(),
});

const sovereignStatusSafe = async () => {
  const fallback = fallbackSovereignStatus();
  try {
    // Dynamic import keeps health bootable even if sovereign modules fail to load.
    const { sovereignStatus } = await import("../lib/sovereign/store.js");
    return await Promise.race([
      sovereignStatus(),
      new Promise<Awaited<ReturnType<typeof sovereignStatus>>>((resolve) => {
        setTimeout(() => resolve(fallback), SOVEREIGN_HEALTH_BUDGET_MS);
      }),
    ]);
  } catch (error: unknown) {
    console.warn("MIMI // health: sovereign status failed", error);
    return {
      ...fallback,
      error: error instanceof Error ? error.message.slice(0, 200) : String(error).slice(0, 200),
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

  let sovereign: Record<string, unknown> = fallbackSovereignStatus();
  try {
    sovereign = await sovereignStatusSafe();
  } catch (error: unknown) {
    console.warn("MIMI // health: sovereign probe crashed", error);
    sovereign = {
      ...fallbackSovereignStatus(),
      error: error instanceof Error ? error.message.slice(0, 200) : String(error).slice(0, 200),
    };
  }

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
    sovereign,
    timestamp: new Date().toISOString(),
  });
}
