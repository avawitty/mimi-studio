import assert from "node:assert/strict";
import {
  commitBalance,
  reserveBalance,
} from "../domain/credits/invariants.js";
import {
  creditPolicyFor,
  operationFor,
  scribeProposeAtomsOutputSchema,
} from "../application/operations/registry.js";
import { normalizeGatewayUsage } from "../infrastructure/ai-gateway/vercelGateway.js";

const operation = operationFor("scribe.propose-atoms");
assert(operation, "Scribe operation must be registered");
assert.equal(operation.entitlement, "ai.scribe.propose");
assert.equal(operation.routingPolicy, "structured-standard");

const reserved = reserveBalance(
  { available: 25n, reserved: 0n },
  { amount: 3n, operationId: operation.id },
);
const committed = commitBalance(
  reserved,
  {
    id: "81515584-24ec-4798-a133-9135fc679d4c",
    status: "active",
    estimatedAmount: 3n,
  },
  { actual: 1n, maximum: 3n },
);
assert.deepEqual(committed, {
  available: 24n,
  reserved: 0n,
  released: 2n,
});

const output = scribeProposeAtomsOutputSchema.parse({
  evidence: [
    {
      id: "evidence-1",
      statement: "A saved source repeats hand-finished material choices.",
      contextIds: ["source-1"],
    },
  ],
  inferences: [
    {
      id: "inference-1",
      statement: "Material irregularity may be a recurring preference.",
      confidence: 88,
      evidenceIds: ["evidence-1"],
    },
  ],
  recommendations: [
    {
      id: "recommendation-1",
      action: "Keep one hand-finished element in the next composition.",
      rationale: "It tests the proposed preference without making it identity.",
      inferenceIds: ["inference-1"],
    },
  ],
});
const usage = normalizeGatewayUsage({ inputTokens: 120, outputTokens: 80 });
const charge = creditPolicyFor(operation.creditPolicy).actualCharge(usage);
assert.equal(charge, 1n);

console.log(
  JSON.stringify(
    {
      operation: {
        id: operation.id,
        version: operation.version,
        entitlement: operation.entitlement,
        routingPolicy: operation.routingPolicy,
      },
      credits: {
        before: 25,
        reserved: 3,
        charged: Number(charge),
        released: Number(committed.released),
        remaining: Number(committed.available),
      },
      output: {
        evidence: output.evidence.length,
        proposals: output.inferences.length,
        recommendations: output.recommendations.length,
        state: "awaiting_approval",
      },
    },
    null,
    2,
  ),
);
