import assert from "node:assert/strict";
import { normalizeZineArtifact } from "../lib/zine/normalizeZineArtifact";
import { makeLegacyZineMetadata } from "./fixtures/zineArtifactFixture";

const artifact = normalizeZineArtifact(makeLegacyZineMetadata());
const plan = artifact.issuePlan!;

assert.ok(plan.compression);
assert.ok(plan.compression.removedPageIds.length > 0);
assert.equal(plan.pages.length, 5);
assert.deepEqual(
  plan.pages.map((page) => page.sectionType),
  ["cover", "reading", "visual-plate", "evidence", "colophon"],
);
assert.equal(plan.evaluation.result, "pass");

console.log("✓ Mimi zine plan compression verified");
console.log("  - sparse issues lose redundant threshold, signal, roadmap, and debris beats");
console.log("  - compressed plans remain valid and proof-ready");
