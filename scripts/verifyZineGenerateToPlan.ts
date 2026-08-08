import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  draftZineArtifactId,
  enhanceZineGenerationLayout,
} from "../lib/zine/enhanceZineGenerationLayout";
import { applyDirectPathEditorialIntelligence } from "../lib/zine/applyDirectPathEditorialIntelligence";
import type { ZineContent } from "../types";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const content: ZineContent = {
  meta: { mode: "editorial", intent: "verify", timestamp: Date.now() },
  taste_context: { active_archetype: "Archivist", active_palette: [] },
  structure: { hero_prompt: "cover", pages: [] },
  visual_guidance: {
    strict_palette: [],
    negative_prompt: "",
    composition_density: 0.5,
  },
  title: "Verify Issue",
  oracular_mirror: "Observation.",
  header_image_prompt: "cover prompt",
  pages: [
    {
      pageNumber: 1,
      headline: "Plate",
      bodyCopy: "Body",
      imagePrompt: "visual",
    },
  ],
};

const artifactId = draftZineArtifactId();
const enhanced = enhanceZineGenerationLayout({ content, artifactId });
const editorial = applyDirectPathEditorialIntelligence({
  content: enhanced,
  artifactId,
  originalInput: "verify source",
});

assert.equal(editorial.content.pages?.length, editorial.issuePlan.pages.filter((p) => !p.derived).length);
assert.ok(editorial.content.pages?.[0].id);
assert.ok(editorial.content.pages?.[0].grammar);
assert.ok(editorial.content.pages?.[0].customLayout?.elements.length);
assert.ok(editorial.content.pagesJson);
assert.equal(JSON.parse(editorial.content.pagesJson!).length, editorial.content.pages?.length);
assert.equal(editorial.issuePlan.pages[0].sectionType, "cover");
assert.equal(editorial.issuePlan.pages.at(-1)?.sectionType, "colophon");
assert.ok(editorial.issuePlan.evaluation);
assert.ok(editorial.issuePlan.pages.every((page) => page.earnsExistenceBy.length > 0));

const generator = read("services/zineGenerator.ts");
assert.match(
  generator,
  /enhanceZineGenerationLayout/,
  "createZine must enhance layout after generation",
);
assert.match(
  generator,
  /applyDirectPathEditorialIntelligence/,
  "createZine must run editorial compiler behind the direct path",
);
assert.match(
  generator,
  /issuePlan: editorial\.issuePlan/,
  "createZine must attach compiled issue plan for readiness/provenance",
);

const app = read("App.tsx");
assert.doesNotMatch(
  app,
  /ZineProofMode/,
  "Studio reveal must not mount proof UI",
);

const firebaseUtils = read("services/firebaseUtils.ts");
const saveStart = firebaseUtils.indexOf("export const saveZineToProfile");
const saveEnd = firebaseUtils.indexOf("export const updateTasteGraph");
const saveBlock = firebaseUtils.slice(saveStart, saveEnd);
assert.doesNotMatch(
  saveBlock,
  /updateTasteGraph\(/,
  "saveZineToProfile must not auto-mutate taste graph from generated zines",
);
assert.doesNotMatch(
  generator,
  /scryShadowMemory/,
  "createZine must not pull unapproved shadow memory into generation",
);

const bake = read("lib/bakeZinePlates.ts");
assert.doesNotMatch(
  bake,
  /planAuthoredPageIdsRequiringMedia/,
  "Bake must develop prompt-backed pages directly",
);

console.log("✓ Mimi zine generation layout verified");
console.log("  - createZine seeds spread layouts then runs editorial compiler");
console.log("  - issuePlan + compression + rationale preserved without proof UI");
console.log("  - hi-fi bake develops pages with image prompts directly");
console.log("  - generated zines do not silently write taste graph vectors");
