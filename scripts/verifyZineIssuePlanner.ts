import assert from "node:assert/strict";
import { normalizeZineArtifact } from "../lib/zine/normalizeZineArtifact";
import { buildZineIssuePlanFromArtifact } from "../lib/zine/buildZineIssuePlan";
import { summarizeZinePlanEvaluation } from "../lib/zine/evaluateZineIssuePlan";
import { buildZineProofSequence } from "../lib/zine/zineIssuePlanner";
import { makeLegacyZineMetadata } from "./fixtures/zineArtifactFixture";

const artifact = normalizeZineArtifact(makeLegacyZineMetadata());
const plan = artifact.issuePlan!;
const proofSequence = buildZineProofSequence(artifact);

assert.ok(plan.compression);
assert.ok(plan.compression.removedPageIds.length > 0);
assert.ok(plan.pages.length <= 6);
assert.equal(plan.pages[0].sectionType, "cover");
assert.equal(plan.pages.at(-1)?.sectionType, "colophon");
assert.equal(proofSequence.length, plan.pages.length);
assert.equal(
  proofSequence.map((page) => page.sectionType).join(","),
  plan.pages.map((page) => page.sectionType).join(","),
);
assert.ok(plan.pages.every((page) => page.earnsExistenceBy.length > 0));
assert.equal(summarizeZinePlanEvaluation(plan.evaluation).canRealize, true);

const rebuilt = buildZineIssuePlanFromArtifact(artifact);
assert.deepEqual(
  rebuilt.pages.map((page) => page.sectionType),
  plan.pages.map((page) => page.sectionType),
);

console.log("✓ Mimi zine issue planner verified");
console.log("  - deterministic cover → development → colophon sequence");
console.log("  - every planned page records earnsExistenceBy contributions");
console.log("  - proof sequence mirrors plan order and length");
