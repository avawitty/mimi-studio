import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeZineArtifact } from "../lib/zine/normalizeZineArtifact";
import {
  buildZineProofDiagnostics,
  summarizeZineProof,
} from "../lib/zine/zineProofDiagnostics";
import { makeLegacyZineMetadata } from "./fixtures/zineArtifactFixture";

const artifact = normalizeZineArtifact(makeLegacyZineMetadata());
artifact.pages[1] = {
  ...artifact.pages[1],
  pageNumber: artifact.pages[0].pageNumber,
  sourceIds: [],
  customLayout: {
    ...artifact.pages[1].customLayout!,
    readingOrder: ["headline", "missing"],
    elements: artifact.pages[1].customLayout!.elements.map((element) =>
      element.id === "headline"
        ? {
            ...element,
            style: { ...element.style, left: 90, width: 25 },
          }
        : element,
    ),
  },
};
artifact.publication.visibility = "public";
artifact.colophon.publicSourceIds = ["atom-private"];

const diagnostics = buildZineProofDiagnostics(artifact);
const ids = new Set(diagnostics.map((diagnostic) => diagnostic.id));

assert.ok(ids.has("duplicate-page-number"));
assert.ok(ids.has("text-overflow"));
assert.ok(ids.has("invalid-reading-order"));
assert.ok(ids.has("absent-provenance"));
assert.ok(ids.has("private-context-exposure"));
assert.equal(summarizeZineProof(diagnostics).canApprove, false);

const proofMode = readFileSync(
  resolve(process.cwd(), "components/zine/ZineProofMode.tsx"),
  "utf8",
);
assert.match(
  proofMode,
  /buildZineProofDiagnostics\(artifact\)/,
  "proof must validate canonical pages before derived proof pages",
);
assert.match(proofMode, /endsWith\(":derived"\)/);

console.log("✓ Mimi zine proof diagnostics verified");
console.log("  - geometry, numbering, provenance, privacy, and reading order");
console.log("  - blocking diagnostics prevent approval");
