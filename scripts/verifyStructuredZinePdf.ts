import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildStructuredZinePdf,
  summarizePagesForExport,
} from "../lib/structuredZinePdf";
import { buildExportManifest } from "../services/exportManifestService";
import type { ZineMetadata } from "../types";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const metadata = {
  id: "zine_verify_structured",
  fragmentsUsed: [],
  createdAt: Date.now(),
  theme: "white editorial",
  aestheticVector: {},
  userId: "user_1",
  userHandle: "curator",
  title: "Structured Export Specimens",
  tone: "editorial",
  timestamp: Date.now(),
  likes: 0,
  coverImageUrl: undefined,
  content: {
    meta: {
      mode: "editorial",
      intent: "Verify structured PDF pages.",
      timestamp: Date.now(),
    },
    taste_context: {
      active_archetype: "Witness",
      active_palette: ["#0A0A0A", "#FFFFFF"],
    },
    structure: {
      hero_prompt: "cover still",
      pages: [],
    },
    visual_guidance: {
      strict_palette: [],
      negative_prompt: "",
      composition_density: 0.4,
    },
    title: "Structured Export Specimens",
    oracular_mirror: "The archive prefers vectors to screenshots.",
    strategic_hypothesis: "Metadata-drawn pages survive CORS better.",
    semiotic_signals: [
      {
        type: "lexical",
        motif: "Provenance",
        context: "Colophon over chrome.",
      },
    ],
    pages: [
      {
        pageNumber: 1,
        headline: "Plate One",
        bodyCopy: "Default template plate for structured draw.",
        imagePrompt: "editorial still",
      },
      {
        pageNumber: 2,
        headline: "Composed",
        bodyCopy: "Has layout elements.",
        imagePrompt: "composed",
        customLayout: {
          elements: [
            {
              id: "t1",
              type: "text",
              content: "Composed headline",
              style: { top: 20, left: 10, width: 80, fontSize: 2, fontStyle: "italic" },
            },
          ],
        },
      },
    ],
    roadmap: {
      strategicThesis: "Keep the issue authored.",
      positioningAxis: "Archive / chrome",
      authorityAnchor: {
        coreClaim: "Provenance is UI",
        repetitionVector: "Colophon",
        exclusionPrinciple: "No cream lifestyle fill",
      },
      intensity: "medium",
      densityLevel: 0.5,
      entropyLevel: 0.2,
      timelineMode: "standard",
      phases: [],
      driftForecast: {
        predictedClusterShift: "",
        audienceEvolution: "",
        absorptionRisk: "",
        overexposureRisk: "",
        refusalPoint: "",
      },
    },
    originalThought: "Verify debris",
  },
  originalInput: "Raw field note for debris page.",
} as unknown as ZineMetadata;

const summaries = summarizePagesForExport(metadata);
assert.equal(summaries.length, 2);
assert.equal(summaries[0].hasCustomLayout, false);
assert.equal(summaries[1].hasCustomLayout, true);

const manifest = buildExportManifest(metadata);
assert.equal(manifest.pdfMode, "structured");
assert.ok(manifest.pages?.some((p) => p.hasCustomLayout));

const doc = await buildStructuredZinePdf(metadata, {
  sections: ["cover", "reading", "signals", "plates", "roadmap", "debris"],
});
const pageCount = doc.getNumberOfPages();
assert.ok(pageCount >= 5, `expected multi-page structured PDF, got ${pageCount}`);

const exportChamber = read("components/ExportChamber.tsx");
assert.match(exportChamber, /downloadStructuredZinePdf/, "PDF export must use structured builder");
assert.match(exportChamber, /STRUCTURED ARCHIVAL PDF/, "UI must label structured PDF mode");
assert.doesNotMatch(
  exportChamber,
  /generatePDF[\s\S]{0,200}html2canvas/,
  "Structured PDF path must not call html2canvas",
);

const editCompile = read("components/TheEditCompile.tsx");
assert.match(editCompile, /IssueSpreadsPanel/, "The Edit must surface issue spreads worktable");

console.log("✓ Structured zine PDF verified");
console.log(`  - ${pageCount} A4 pages from metadata`);
console.log("  - manifest pdfMode=structured + page summaries");
console.log("  - ExportChamber + Edit spreads wiring");
