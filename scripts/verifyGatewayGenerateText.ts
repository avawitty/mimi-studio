/**
 * Smoke-test POST /api/mimi/generate-text via the route handler.
 * Uses AI_GATEWAY_API_KEY as a personal BYOK bearer (no Firebase session).
 *
 * Run: npm run verify:gateway-generate-text
 */
import assert from "node:assert/strict";
import { handleMimiGenerateTextRoute } from "../lib/mimiGenerateTextRoute.js";

const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_KEY || "";
if (!apiKey) {
  console.error("FAIL: AI_GATEWAY_API_KEY is not set");
  process.exit(1);
}

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

async function main() {
  const req = {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: {
      prompt: "Reply with exactly: sdk-route-ok",
      role: "textFast",
      temperature: 0,
    },
  };

  const res = createRes();
  await handleMimiGenerateTextRoute(req, res);

  assert.equal(res.statusCode, 200, `expected 200, got ${res.statusCode}: ${res.body}`);
  const payload = JSON.parse(res.body);
  assert.equal(typeof payload.text, "string");
  assert.match(String(payload.text).toLowerCase(), /sdk-route-ok/);
  assert.equal(typeof payload.model, "string");
  assert.ok(payload.model.includes("/"), `model should be provider/model, got ${payload.model}`);
  assert.equal(payload.creditsCharged, 0, "BYOK path should not charge funded credits");

  console.log(
    JSON.stringify(
      {
        ok: true,
        model: payload.model,
        text: String(payload.text).trim().slice(0, 80),
        creditsCharged: payload.creditsCharged,
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
