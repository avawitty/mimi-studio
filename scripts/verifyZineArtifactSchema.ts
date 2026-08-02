import assert from "node:assert/strict";
import { normalizeZineArtifact } from "../lib/zine/normalizeZineArtifact";
import { safeParseMimiZineArtifact } from "../lib/zine/zineArtifactSchema";
import { makeLegacyZineMetadata } from "./fixtures/zineArtifactFixture";

const metadata = makeLegacyZineMetadata();
const artifact = normalizeZineArtifact(metadata);

assert.equal(artifact.schemaVersion, 1);
assert.equal(artifact.pages.length, 2, "pagesJson must hydrate into artifact pages");
assert.equal(artifact.pages[1].customLayout?.elements.length, 2);
assert.equal(
  artifact.pages[0].originalMediaUrl,
  "https://cdn.example.test/original-source.jpg",
);
assert.equal(
  artifact.cover.originalImageUrl,
  "https://cdn.example.test/original-cover.jpg",
);
assert.equal(artifact.cover.overlays.length, 1);
assert.equal(safeParseMimiZineArtifact(artifact).success, true);

console.log("✓ Mimi zine artifact schema verified");
console.log("  - legacy pagesJson hydration");
console.log("  - custom layout and original media preservation");
console.log("  - editable cover overlay preservation");
