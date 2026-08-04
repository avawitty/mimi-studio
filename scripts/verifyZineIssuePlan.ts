import assert from "node:assert/strict";
import { normalizeZineArtifact } from "../lib/zine/normalizeZineArtifact";
import { buildZineProofSequence } from "../lib/zine/zineIssuePlanner";
import { zinePageGrammarSchema } from "../lib/zine/zineArtifactSchema";
import { makeLegacyZineMetadata } from "./fixtures/zineArtifactFixture";

const artifact = normalizeZineArtifact(makeLegacyZineMetadata());
const proofSequence = buildZineProofSequence(artifact);
const sectionTypes = artifact.issueStructure.sections.map(
  (section) => section.type,
);
const pageIds = artifact.pages.map((page) => page.id);
const pageNumbers = artifact.pages.map((page) => page.pageNumber);

assert.deepEqual(sectionTypes, [
  "cover",
  "opening",
  "reading",
  "signal-index",
  "visual-plate",
  "evidence",
  "essay",
  "interlude",
  "roadmap",
  "debris",
  "colophon",
]);
assert.equal(new Set(pageIds).size, pageIds.length, "page IDs must be unique");
assert.equal(
  new Set(pageNumbers).size,
  pageNumbers.length,
  "page numbers must be unique in the fixture",
);
artifact.pages.forEach((page) => {
  assert.equal(zinePageGrammarSchema.safeParse(page.grammar).success, true);
});
assert.equal(proofSequence.length, artifact.issueStructure.totalPages);
assert.equal(proofSequence[0].sectionType, "cover");
assert.equal(proofSequence.at(-1)?.sectionType, "colophon");
assert.ok(artifact.issueStructure.totalPages >= artifact.pages.length);

console.log("✓ Mimi zine issue plan verified");
console.log("  - complete section vocabulary and stable page IDs");
console.log("  - valid six-grammar assignment");
console.log("  - proof sequence matches issue totalPages");
