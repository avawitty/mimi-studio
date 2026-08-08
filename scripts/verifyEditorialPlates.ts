import assert from "node:assert/strict";
import { enrichEditorialPlateContent } from "../lib/zine/enrichEditorialPlateContent";
import { insertEditorialPlates } from "../lib/zine/insertEditorialPlates";
import { EDITORIAL_PLATE_IDS } from "../lib/tailor/tailorDefaults";
import type { ZineContent } from "../types";

const base: ZineContent = {
  meta: { mode: "editorial", intent: "verify", timestamp: Date.now() },
  taste_context: { active_archetype: "test", active_palette: [] },
  structure: { hero_prompt: "hero", pages: [], sonic_layer: "hum" },
  visual_guidance: {
    strict_palette: [],
    negative_prompt: "",
    composition_density: 0.5,
  },
  pages: [
    {
      pageNumber: 1,
      headline: "Visual",
      bodyCopy: "Body",
      imagePrompt: "scene",
    },
  ],
  screenwrite_excerpt: "INT. ROOM — NIGHT",
  semiotic_signals: [{ motif: "dust", context: "grain", type: "conceptual" }],
};

assert.equal(EDITORIAL_PLATE_IDS.length, 10, "expected ten editorial plate ids");

const fullStack = insertEditorialPlates({
  ...base,
  contact_sheet_frames: [
    { id: "f1", imageUrl: "https://example.com/a.jpg", label: "Ref" },
  ],
  chromatic_palette: {
    colors: [{ name: "Ink", hex: "#111111" }],
    sourceLabel: "Tailor",
  },
  material_specimen: {
    materiality: ["Linen"],
    silhouettes: ["Fluid"],
    sourceLabel: "Tailor",
  },
  forecast_drift: {
    oversaturatedClusters: ["Quiet luxury"],
    fragileDifferentiators: ["Grain"],
    isDemonstration: false,
  },
  celestial_calibration: "Sun in Gemini",
  used_context_atoms: [
    { atomId: "a1", title: "Atom", content: "Approved memory" },
  ],
  owner_plates: [{ id: "o1", kind: "text", body: "Owner note" }],
});

const grammars = fullStack.map((page) => page.grammar);
assert.deepEqual(grammars.slice(0, 10), [
  "contact-sheet",
  "screenwrite",
  "chromatic",
  "material-specimen",
  "forecast-drift",
  "celestial",
  "signal-index",
  "used-context",
  "sonic",
  "owner-carousel",
]);

const legacy = enrichEditorialPlateContent(
  { ...base, pages: base.pages },
  {
    artifactId: "legacy-zine",
    usedContextSnapshots: [
      { atomId: "snap-1", title: "Legacy atom", content: "Filed" },
    ],
    intakeArtifacts: [
      {
        type: "image",
        url: "https://example.com/intake.jpg",
        data: "",
        mimeType: "image/jpeg",
        name: "Intake",
      },
    ],
    profile: {
      tailorDraft: {
        positioningCore: {
          aestheticCore: {
            materiality: ["Ceramic"],
            silhouettes: [],
            eraBias: "Analog",
            density: 5,
            entropy: 5,
            tags: [],
          },
        },
        strategicVectors: {
          expansionTolerance: 5,
          fiscalVelocity: "measured",
          desireVectors: { deepen: [], reduce: [], experiment: [], refuse: [] },
          saturationAwareness: {
            oversaturatedClusters: ["Techwear"],
            fragileDifferentiators: [],
          },
        },
        diagnostics: {
          contradictionFlags: [],
          dilutionRisks: [],
          authorityStrengthScore: 50,
          driftVulnerability: 3,
        },
      } as any,
    },
  },
);

assert.ok(
  legacy.pages?.some((page) => page.grammar === "used-context"),
  "legacy zine backfill should render used-context plate",
);
assert.ok(
  legacy.pages?.some((page) => page.grammar === "contact-sheet"),
  "legacy zine backfill should render contact-sheet plate",
);

console.log("✓ Editorial plates contract verified");
console.log(`  - ${EDITORIAL_PLATE_IDS.length} plate ids registered`);
console.log("  - full stack plate order");
console.log("  - legacy metadata backfill + refresh");
