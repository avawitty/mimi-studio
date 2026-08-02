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

const sovereignApi = readFileSync(
  resolve(process.cwd(), "api/sovereign/zine.ts"),
  "utf8",
);
assert.match(
  sovereignApi,
  /sanitizeZineForPublicView/,
  "public sovereign reads must enforce public context visibility",
);
const sovereignStore = readFileSync(
  resolve(process.cwd(), "lib/sovereign/store.ts"),
  "utf8",
);
assert.match(
  sovereignStore,
  /sanitizeZineForPublicView/,
  "Floor cards must use the same public projection",
);
const firestoreRules = readFileSync(
  resolve(process.cwd(), "firestore.rules"),
  "utf8",
);
assert.match(firestoreRules, /publicProjectionVersion == 1/);
assert.match(firestoreRules, /match \/zine_working\/\{zineId\}/);
assert.doesNotMatch(
  firestoreRules,
  /match \/artifacts\/\{artifactId\}[\s\S]{0,240}isPublic == true/,
  "public zines must not expose raw artifact subcollections",
);
const firebaseUtils = readFileSync(
  resolve(process.cwd(), "services/firebaseUtils.ts"),
  "utf8",
);
assert.match(firebaseUtils, /collection\(db,\s*"zine_working"\)/);
assert.match(firebaseUtils, /deleteDoc\(doc\(db,\s*"zine_working"/);
assert.match(firebaseUtils, /Lazy migration for pre-split owner archives/);
assert.match(
  firebaseUtils,
  /moveZineToFolder[\s\S]*updateZineMetadata/,
  "folder moves must update owner working state through the projection boundary",
);
assert.match(
  firebaseUtils,
  /where\("publicProjectionVersion",\s*"==",\s*1\)/,
  "Firestore public fallbacks must query only safe projections",
);
[
  "api/og/zine.ts",
  "functions/src/index.ts",
  "server.ts",
].forEach((path) => {
  const source = readFileSync(resolve(process.cwd(), path), "utf8");
  assert.match(
    source,
    /publicProjectionVersion/,
    `${path} must reject private or legacy Admin point reads`,
  );
});
const embeddingService = readFileSync(
  resolve(process.cwd(), "services/zineEmbeddingService.ts"),
  "utf8",
);
assert.match(
  embeddingService,
  /doc\(db,\s*"zine_working"/,
  "embedding vectors must remain owner-only",
);

const shopifyExport = readFileSync(
  resolve(process.cwd(), "services/shopifyExportService.ts"),
  "utf8",
);
assert.match(shopifyExport, /sanitizeUsedContextForExport/);
const shopifyAdmin = readFileSync(
  resolve(process.cwd(), "lib/shopifyAdmin.ts"),
  "utf8",
);
assert.match(
  shopifyAdmin,
  /sanitizeShopifyProvenance/,
  "server-side Shopify publishing must whitelist provenance",
);

console.log("✓ Mimi zine private context verified");
console.log("  - export visibility filtering and body redaction");
console.log("  - public API, Shopify, compile ownership, and ZIP privacy");
