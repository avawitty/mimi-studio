import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildExportManifest } from "../services/exportManifestService";
import { makeLegacyZineMetadata } from "./fixtures/zineArtifactFixture";

const metadata = makeLegacyZineMetadata();
const manifest = buildExportManifest(metadata);

assert.deepEqual(
  manifest.usedContextSnapshots.map((snapshot) => snapshot.atomId),
  ["atom-export"],
);
assert.ok(
  manifest.usedContextSnapshots.every((snapshot) => snapshot.content === ""),
  "exportable Used Context bodies must be redacted",
);

const originalWarn = console.warn;
console.warn = () => undefined;
const mismatched = buildExportManifest({
  ...metadata,
  editorialCompileMarkdown: "# Foreign compile",
  editorialCompileOwnerUid: "other-owner",
});
console.warn = originalWarn;
assert.equal(
  mismatched.editorialCompileMarkdown,
  undefined,
  "compile ownership mismatch must remain enforced",
);

const exportChamber = readFileSync(
  resolve(process.cwd(), "components/ExportChamber.tsx"),
  "utf8",
);
assert.match(
  exportChamber,
  /JSON\.stringify\(manifest\.usedContextSnapshots/,
  "asset ZIP must use sanitized manifest context",
);
assert.doesNotMatch(
  exportChamber,
  /JSON\.stringify\(metadata\.usedContextSnapshots/,
  "asset ZIP must not write raw context snapshots",
);

console.log("✓ Mimi zine private context verified");
console.log("  - export visibility filtering and body redaction");
console.log("  - compile ownership and asset ZIP privacy");
