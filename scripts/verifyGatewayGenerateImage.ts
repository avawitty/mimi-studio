/**
 * Smoke-test gateway image generation for the default Gemini image model
 * (chat completions + modalities) and the Mimi image server helper.
 *
 * Run: npm run verify:gateway-generate-image
 */
import assert from "node:assert/strict";
import {
  generateGatewayImageBytesForModel,
  gatewayImageUsesChatModalities,
} from "../lib/aiGatewayCompat.js";
import { generateMimiImageServer } from "../lib/serverMimiImage.js";
import { modelFor } from "../services/modelConfig.js";

const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_KEY || "";
if (!apiKey) {
  console.error("FAIL: AI_GATEWAY_API_KEY is not set");
  process.exit(1);
}

async function main() {
  const model = modelFor("image", "gateway");
  assert.equal(
    gatewayImageUsesChatModalities(model),
    true,
    `default gateway image model should use chat modalities, got ${model}`,
  );

  const direct = await generateGatewayImageBytesForModel({
    apiKey,
    model,
    prompt: "Simple editorial red circle on cream paper, quiet, no text, no people.",
    aspectRatio: "3:4",
  });
  assert.ok(direct.base64.length > 1000, "expected non-trivial image bytes");
  assert.ok(direct.mimeType.startsWith("image/"), `unexpected mime ${direct.mimeType}`);

  const viaServer = await generateMimiImageServer(
    {
      prompt: "Simple editorial blue square on cream paper, quiet, no text, no people.",
      aspectRatio: "3:4",
      provider: "gateway",
      mode: "reference-led",
    },
    { apiKey, provider: "gateway" },
  );
  assert.equal(viaServer.ok, true);
  assert.equal(viaServer.provider, "gateway");
  assert.ok(viaServer.base64 && viaServer.base64.length > 1000);
  assert.ok(String(viaServer.imageUrl || "").startsWith("data:image/"));

  console.log(
    JSON.stringify(
      {
        ok: true,
        model,
        directBytes: direct.base64.length,
        serverBytes: viaServer.base64?.length || 0,
        serverModel: viaServer.model,
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
