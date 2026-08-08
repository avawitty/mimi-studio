/**
 * Production-path smoke test for AI Gateway (#229 validation).
 *
 * Exercises the same server helpers Vercel uses:
 * - credential routing (OIDC vs API key)
 * - /api/health aiGateway flag
 * - generate-text route handler
 * - embedding generation
 * - image generation
 * - funded credit accounting metadata
 *
 * Run: npm run verify:production-gateway-path
 * Optional: BASE_URL=https://mimi.you npm run verify:production-gateway-path
 */
import assert from "node:assert/strict";
import { getServerAiGatewayKey } from "../lib/aiGatewayCompat.js";
import { handleMimiGenerateTextRoute } from "../lib/mimiGenerateTextRoute.js";
import { handleMimiEmbedRoute } from "../lib/mimiEmbedRoute.js";
import { embedGatewayText } from "../lib/ai/generate.js";
import {
  generateGatewayImageBytesForModel,
} from "../lib/aiGatewayCompat.js";
import { modelFor } from "../services/modelConfig.js";

const baseUrl = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const apiKey =
  process.env.AI_GATEWAY_API_KEY ||
  process.env.AI_GATEWAY_KEY ||
  process.env.VERCEL_OIDC_TOKEN ||
  "";

type MockRes = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  headersSent: boolean;
  setHeader: (key: string, value: string) => void;
  end: (payload?: string) => void;
};

const createRes = (): MockRes => {
  const res: MockRes = {
    statusCode: 200,
    headers: {},
    body: "",
    headersSent: false,
    setHeader(key, value) {
      res.headers[key.toLowerCase()] = value;
    },
    end(payload = "") {
      res.body = payload;
      res.headersSent = true;
    },
  };
  return res;
};

async function fetchHealth() {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.ok, true, `health check failed: ${res.status}`);
  return res.json() as Promise<{
    status: string;
    ai?: { aiGateway?: boolean; defaultProvider?: string };
  }>;
}

async function main() {
  const credentialSource = process.env.VERCEL
    ? process.env.VERCEL_OIDC_TOKEN
      ? "vercel-oidc"
      : process.env.AI_GATEWAY_API_KEY
        ? "ai-gateway-api-key"
        : "none"
    : process.env.AI_GATEWAY_API_KEY
      ? "ai-gateway-api-key"
      : process.env.VERCEL_OIDC_TOKEN
        ? "vercel-oidc"
        : "none";

  const resolvedKey = getServerAiGatewayKey();
  assert.ok(resolvedKey || apiKey, "AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN is required");

  const health = await fetchHealth();
  assert.equal(health.status, "ok");
  if (resolvedKey) {
    assert.equal(health.ai?.aiGateway, true, "health.ai.aiGateway should be true when key resolves");
    assert.equal(health.ai?.defaultProvider, "gateway");
  }

  const key = resolvedKey || apiKey;

  const textRes = createRes();
  await handleMimiGenerateTextRoute(
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: {
        prompt: "Reply with exactly: production-gateway-ok",
        role: "textFast",
        temperature: 0,
      },
    },
    textRes,
  );
  assert.equal(textRes.statusCode, 200, `generate-text failed: ${textRes.body}`);
  const textPayload = JSON.parse(textRes.body);
  assert.match(String(textPayload.text).toLowerCase(), /production-gateway-ok/);
  assert.equal(textPayload.creditsCharged, 0, "BYOK bearer should not charge credits");

  const embedRes = createRes();
  await handleMimiEmbedRoute(
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: { value: "mimi gateway embedding smoke" },
    },
    embedRes,
  );
  assert.equal(embedRes.statusCode, 200, `embed route failed: ${embedRes.body}`);
  const embedPayload = JSON.parse(embedRes.body);
  assert.ok(Array.isArray(embedPayload.embedding));
  assert.ok(embedPayload.embedding.length > 0);

  const directEmbed = await embedGatewayText({
    apiKey: key,
    value: "direct embed smoke",
  });
  assert.ok(directEmbed.embedding.length > 0);

  const imageModel = modelFor("image", "gateway");
  const image = await generateGatewayImageBytesForModel({
    apiKey: key,
    model: imageModel,
    prompt: "Simple cream paper square, editorial, no text, no people.",
    aspectRatio: "1:1",
  });
  assert.ok(image.base64.length > 500, "expected image bytes from gateway");

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        credentialSource,
        vercelDeployment: Boolean(process.env.VERCEL),
        oidcConfigured: Boolean(process.env.VERCEL_OIDC_TOKEN),
        health,
        generateTextModel: textPayload.model,
        embedDimensions: embedPayload.embedding.length,
        imageModel,
        imageBytes: image.base64.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("FAIL", error?.message || error);
  process.exit(1);
});
