import assert from "node:assert/strict";
import { normalizeZineArtifact } from "../lib/zine/normalizeZineArtifact";
import {
  reconcileZineReadingOrder,
  resolveZineReadingOrder,
  validateZineReadingOrder,
} from "../lib/zine/zineReadingOrder";
import { makeLegacyZineMetadata } from "./fixtures/zineArtifactFixture";

const artifact = normalizeZineArtifact(makeLegacyZineMetadata());
const composed = artifact.pages[1];

assert.equal(validateZineReadingOrder(composed).valid, true);
assert.deepEqual(resolveZineReadingOrder(composed), ["headline", "body"]);

const invalid = {
  ...composed,
  customLayout: {
    ...composed.customLayout!,
    readingOrder: ["headline", "headline", "missing"],
  },
};
const result = validateZineReadingOrder(invalid);
assert.equal(result.valid, false);
assert.deepEqual(result.duplicateIds, ["headline"]);
assert.deepEqual(result.missingElementIds, ["missing"]);
assert.deepEqual(result.omittedElementIds, ["body"]);
assert.deepEqual(
  reconcileZineReadingOrder(
    ["deleted", "headline"],
    composed.customLayout!.elements,
  ),
  ["headline", "body"],
);

console.log("✓ Mimi zine reading order verified");
console.log("  - explicit order validation");
console.log("  - duplicate, missing, omitted, added, and deleted element handling");
