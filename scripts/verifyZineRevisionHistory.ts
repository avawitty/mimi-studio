import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeZineArtifact } from "../lib/zine/normalizeZineArtifact";
import {
  createArtifactRevision,
  reviseEditorialDirection,
} from "../lib/zine/zineMigrations";
import { makeLegacyZineMetadata } from "./fixtures/zineArtifactFixture";

const normalized = normalizeZineArtifact(makeLegacyZineMetadata());
const approved = { ...normalized, status: "approved" as const };
const revised = createArtifactRevision(approved, {
  now: 1_800_000_000_000,
  reason: "Post-approval proof correction",
  changedPageIds: [approved.pages[0].id!],
});

assert.equal(revised.revision, approved.revision + 1);
assert.equal(revised.status, "proof");
assert.equal(revised.revisions.at(-1)?.parentRevision, approved.revision);

const customLayout = structuredClone(normalized.pages[1].customLayout);
const directionRevision = reviseEditorialDirection(
  normalized,
  { ...normalized.direction, approved: false, thesis: "Revision" },
  { restageDefaultLayouts: true, now: 1_800_000_000_001 },
);
assert.deepEqual(
  directionRevision.pages[1].customLayout,
  customLayout,
  "direction restage must not destroy custom layouts",
);

const analysisDisplay = readFileSync(
  resolve(process.cwd(), "components/AnalysisDisplay.tsx"),
  "utf8",
);
[
  "Issue copy revised",
  "Cover image revised",
  "Plate image revised",
  "Hypothesis image revised",
  "Issue page order revised",
].forEach((reason) => {
  assert.match(
    analysisDisplay,
    new RegExp(reason),
    `${reason} must use the revision-aware mutation path`,
  );
});

console.log("✓ Mimi zine revision history verified");
console.log("  - approved edits create a child proof revision");
console.log("  - direction restage preserves custom layouts");
console.log("  - copy, media, spread, and order edits are revision-aware");
