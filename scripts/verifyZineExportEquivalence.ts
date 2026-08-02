import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildStructuredZinePdf,
  summarizePagesForExport,
} from "../lib/structuredZinePdf";
import { buildExportManifest } from "../services/exportManifestService";
import type { ZinePageSpec } from "../types";
import { makeLegacyZineMetadata } from "./fixtures/zineArtifactFixture";

const metadata = makeLegacyZineMetadata();
const legacyPages = JSON.parse(
  metadata.content.pagesJson || "[]",
) as ZinePageSpec[];
const pages: ZinePageSpec[] = legacyPages.map(
  (page): ZinePageSpec => ({
    ...page,
    image_url: undefined,
    originalMediaUrl: undefined,
    assetVariants: undefined,
  }),
);
metadata.coverImageUrl = undefined;
metadata.content.pages = [];
metadata.content.pagesJson = JSON.stringify(pages);

const summaries = summarizePagesForExport(metadata);
const manifest = buildExportManifest(metadata);
const pdf = await buildStructuredZinePdf(metadata, { sections: ["plates"] });
const pdfSource = readFileSync(
  resolve(process.cwd(), "lib/structuredZinePdf.ts"),
  "utf8",
);

assert.equal(summaries.length, pages.length);
assert.equal(manifest.pages?.length, pages.length);
assert.equal(manifest.pdfMode, "structured");
assert.equal(pdf.getNumberOfPages(), pages.length);
assert.match(
  pdf.output(),
  /Custody of the stray thought/,
  "structured PDF must retain native selectable text",
);
assert.doesNotMatch(pdfSource, /html2canvas/);

console.log("✓ Mimi zine export equivalence verified");
console.log(`  - ${pages.length} hydrated artifact pages → ${pdf.getNumberOfPages()} PDF pages`);
console.log("  - native selectable text and structured export mode");
