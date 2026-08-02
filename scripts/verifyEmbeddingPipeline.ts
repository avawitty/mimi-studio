/**
 * Offline + optional live checks for the embeddings pipeline (AI Gateway).
 *
 * Offline (always): modelConfig role resolution, cosine guards, shadow-doc shape.
 * Live (when AI_GATEWAY_API_KEY is set):
 *   1) AI SDK helper embedGatewayText
 *   2) Gemini-compat embedGeminiContentViaGateway
 *   3) POST /api/mimi/embed route handler
 *
 * Run: npm run verify:embeddings
 */
import assert from "node:assert/strict";
import { cosineSimilarity, embeddingsCompatible, meanEmbedding } from "../lib/embeddingMath.js";
import {
  auditShadowEmbeddings,
  selectDocsForReindex,
  shadowAuditToEmbeddingCompat,
} from "../lib/shadowMemoryIndex.js";
import {
  embeddingSpaceId,
  embeddingSpacesCompatible,
} from "../schemas/embeddingContracts.js";
import { MODELS, modelFor } from "../services/modelConfig.js";
import { GATEWAY_DEFAULT_MODELS } from "../lib/models.js";

function assertOffline() {
  const geminiModel = modelFor("embedding", "gemini");
  const gatewayModel = modelFor("embedding", "gateway");
  const openaiModel = modelFor("embedding", "openai");

  assert.equal(geminiModel, MODELS.gemini.embedding);
  assert.equal(gatewayModel, GATEWAY_DEFAULT_MODELS.embedding);
  assert.equal(openaiModel, MODELS.openai.embedding);
  assert.ok(geminiModel.length > 0, "gemini embedding model must resolve");
  assert.ok(gatewayModel.includes("/"), `gateway embedding should be provider/model, got ${gatewayModel}`);

  const a = [1, 0, 0];
  const b = [1, 0];
  assert.equal(embeddingsCompatible(a, b), false);
  assert.equal(cosineSimilarity(a, b), 0);
  assert.ok(cosineSimilarity([1, 0], [1, 0]) > 0.99);

  const center = meanEmbedding([
    [1, 0],
    [0, 1],
  ]);
  assert.deepEqual(center, [0.5, 0.5]);

  const shadowShape = {
    kind: "embedding_shadow",
    embedding_field: [0.1, 0.2],
    embedding_dims: 2,
    embedding_model: geminiModel,
  };
  assert.equal(shadowShape.kind, "embedding_shadow");
  assert.equal(shadowShape.embedding_dims, shadowShape.embedding_field.length);

  const mixed = [
    {
      id: "legacy",
      kind: "embedding_shadow" as const,
      embedding_field: Array(768).fill(0.01),
      content_preview: "legacy gemini",
    },
    {
      id: "fresh",
      kind: "embedding_shadow" as const,
      embedding_field: Array(1536).fill(0.01),
      embed_text: "gateway vector",
    },
  ];
  const audit = auditShadowEmbeddings(mixed, 1536, gatewayModel);
  assert.equal(audit.needsReindex, true);
  assert.equal(audit.incompatible, 1);
  assert.deepEqual(
    selectDocsForReindex(mixed, 1536).map((d) => d.id),
    ["legacy"],
  );

  const spaceA = embeddingSpaceId({ model: gatewayModel, dims: 1536 });
  const spaceB = embeddingSpaceId({ model: gatewayModel, dims: 768 });
  assert.equal(embeddingSpacesCompatible(spaceA, spaceA), true);
  assert.equal(embeddingSpacesCompatible(spaceA, spaceB), false);
  const sharedAudit = shadowAuditToEmbeddingCompat(audit);
  assert.equal(sharedAudit.needsReindex, true);
  assert.equal(sharedAudit.reference?.dims, 1536);
  assert.equal(sharedAudit.reference?.model, gatewayModel);

  console.log(
    JSON.stringify(
      {
        ok: true,
        phase: "offline",
        geminiEmbeddingModel: geminiModel,
        gatewayEmbeddingModel: gatewayModel,
        openaiEmbeddingModel: openaiModel,
        shadowReindex: {
          needsReindex: audit.needsReindex,
          incompatible: audit.incompatible,
        },
      },
      null,
      2,
    ),
  );
}

async function assertLiveSdkEmbed(apiKey: string) {
  const { embedGatewayText } = await import("../lib/ai/generate.js");
  const result = await embedGatewayText({
    value: "mimi embedding pipeline verify",
    apiKey,
  });
  assert.ok(Array.isArray(result.embedding) && result.embedding.length > 0);
  assert.ok(result.model.includes("/"));
  assert.equal(result.dims, result.embedding.length);

  console.log(
    JSON.stringify(
      {
        ok: true,
        phase: "live-sdk",
        model: result.model,
        dims: result.dims,
      },
      null,
      2,
    ),
  );
}

async function assertLiveCompatEmbed(apiKey: string) {
  const { embedGeminiContentViaGateway } = await import("../lib/aiGatewayCompat.js");
  const result = await embedGeminiContentViaGateway(
    { contents: [{ text: "mimi embedding compat verify" }] },
    apiKey,
  );
  const values = result?.embeddings?.[0]?.values;
  assert.ok(Array.isArray(values) && values.length > 0, "gateway compat embed must return values");

  console.log(
    JSON.stringify(
      {
        ok: true,
        phase: "live-compat",
        model: result.modelVersion,
        dims: values.length,
      },
      null,
      2,
    ),
  );
}

async function assertLiveRoute(apiKey: string) {
  const { handleMimiEmbedRoute } = await import("../lib/mimiEmbedRoute.js");

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

  const req = {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: {
      value: "mimi embed route verify",
    },
  };

  const res = createRes();
  await handleMimiEmbedRoute(req, res);

  assert.equal(res.statusCode, 200, `expected 200, got ${res.statusCode}: ${res.body}`);
  const payload = JSON.parse(res.body);
  assert.ok(Array.isArray(payload.embedding) && payload.embedding.length > 0);
  assert.equal(payload.dims, payload.embedding.length);
  assert.ok(String(payload.model).includes("/"));
  assert.equal(payload.creditsCharged, 0, "embedding task should remain free_internal");

  console.log(
    JSON.stringify(
      {
        ok: true,
        phase: "live-route",
        model: payload.model,
        dims: payload.dims,
        creditsCharged: payload.creditsCharged,
      },
      null,
      2,
    ),
  );
}

async function main() {
  assertOffline();

  const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_KEY || "";
  if (!apiKey) {
    console.log(JSON.stringify({ ok: true, phase: "live", skipped: true, reason: "no AI_GATEWAY_API_KEY" }));
    return;
  }

  await assertLiveSdkEmbed(apiKey);
  await assertLiveCompatEmbed(apiKey);
  await assertLiveRoute(apiKey);
}

main().catch((err) => {
  console.error("FAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
