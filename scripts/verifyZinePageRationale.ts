import assert from "node:assert/strict";
import { normalizeZineArtifact } from "../lib/zine/normalizeZineArtifact";
import { buildZineProofSequence } from "../lib/zine/zineIssuePlanner";
import {
  describeZinePageRationale,
  sectionAbbreviation,
} from "../lib/zine/zinePageRationale";
import { stampZineArtifactMetadata } from "../lib/zine/stampZineArtifactMetadata";
import { makeLegacyZineMetadata } from "./fixtures/zineArtifactFixture";

const artifact = normalizeZineArtifact(makeLegacyZineMetadata());
const sequence = buildZineProofSequence(artifact);
const coverRationale = describeZinePageRationale(sequence[0], artifact);
const colophonRationale = describeZinePageRationale(sequence.at(-1)!, artifact);

assert.equal(coverRationale.derived, true);
assert.equal(coverRationale.narrativeFunction, "invitation");
assert.match(coverRationale.whyExists, /threshold/i);
assert.equal(colophonRationale.sectionType, "colophon");
assert.equal(sectionAbbreviation("reading"), "RDG");

const metadata = makeLegacyZineMetadata();
const pages = JSON.parse(metadata.content.pagesJson || "[]");
const stamped = stampZineArtifactMetadata(metadata, pages);

assert.equal(stamped.artifactSchemaVersion, 1);
assert.equal(stamped.lifecycleStatus, "proof");
assert.ok(stamped.content.pages?.every((page) => Boolean(page.id)));

console.log("✓ Mimi zine page rationale verified");
console.log("  - derived and authored pages expose editorial why/sequence copy");
console.log("  - new saves stamp section-aware pages and artifact envelope");
