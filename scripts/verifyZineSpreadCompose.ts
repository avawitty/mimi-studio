import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildDefaultSpreadElements,
  pageHasCustomLayout,
  plateGrammarClass,
  resolveIssueMode,
  shouldAutoDevelopPlates,
  toEditableZinePage,
} from "../lib/zineSpreadLayout";
import type { ZinePageSpec } from "../types";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const samplePage: ZinePageSpec = {
  pageNumber: 1,
  headline: "Signal archive",
  bodyCopy: "A short plate body for layout seeds.",
  imagePrompt: "editorial still life",
  image_url: "data:image/png;base64,abc",
};

assert.equal(pageHasCustomLayout(samplePage), false);
assert.equal(pageHasCustomLayout({ ...samplePage, customLayout: { elements: [] } }), false);

const seeded = buildDefaultSpreadElements(samplePage);
assert.ok(seeded.some((el) => el.type === "image"));
assert.ok(seeded.some((el) => el.type === "text" && el.content === "Signal archive"));
assert.ok(seeded.every((el) => el.style.fontFamily !== "Inter"));

const editable = toEditableZinePage({
  pageNumber: 2,
  headline: "H",
  bodyCopy: "B",
  imagePrompt: "p",
  image_url: "https://example.com/plate.jpg",
});
assert.equal(editable.originalMediaUrl, "https://example.com/plate.jpg");

assert.equal(resolveIssueMode("oracle"), "oracle");
assert.equal(resolveIssueMode("nope"), "editorial");
assert.match(plateGrammarClass("research", 0), /zine-plate--research/);
assert.match(plateGrammarClass("editorial", 1), /md:flex-row-reverse/);

assert.equal(shouldAutoDevelopPlates({ isHighFidelity: true }), true);
assert.equal(shouldAutoDevelopPlates({ isHighFidelity: true, isLite: true }), false);
assert.equal(shouldAutoDevelopPlates({ isHighFidelity: false }), false);

const reveal = read("components/AnalysisDisplay.tsx");
assert.match(reveal, /ZineLayoutEditor/, "Reveal must mount the spread layout editor.");
assert.match(reveal, /ZineSpreadCanvas/, "Reveal must render composed spreads.");
assert.match(reveal, /Compose spread|Edit spread/, "Owners need a compose entry point.");
assert.match(reveal, /shouldAutoDevelopPlates/, "Hi-fi auto-develop must be wired.");
assert.doesNotMatch(reveal, /bg-\[#F5F2EA\]/, "Signature Takeaways must not use cream fill.");

const types = read("types.ts");
assert.match(types, /customLayout\?:/, "ZinePageSpec must persist customLayout.");

const exportChamber = read("components/ExportChamber.tsx");
assert.match(exportChamber, /downloadStructuredZinePdf/, "Press PDF must use structured export.");

console.log("✓ Zine spread compose verified");
console.log("  - layout helpers + mode grammar");
console.log("  - reveal compose + canvas wiring");
console.log("  - hi-fi auto-develop + no cream takeaways");
console.log("  - structured PDF wired in ExportChamber");
