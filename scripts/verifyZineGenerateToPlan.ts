import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  draftZineArtifactId,
  enhanceZineGenerationLayout,
} from "../lib/zine/enhanceZineGenerationLayout";
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

const enhanced = enhanceZineGenerationLayout({
  content,
  artifactId: draftZineArtifactId(),
});

assert.equal(enhanced.pages?.length, 1);
assert.ok(enhanced.pages?.[0].id);
assert.ok(enhanced.pages?.[0].grammar);
assert.ok(enhanced.pages?.[0].customLayout?.elements.length);
assert.ok(enhanced.pagesJson);
assert.equal(JSON.parse(enhanced.pagesJson!).length, 1);

const generator = read("services/zineGenerator.ts");
assert.match(
  generator,
  /enhanceZineGenerationLayout/,
  "createZine must enhance layout after generation",
);
assert.doesNotMatch(
  generator,
  /realizeZineContentFromPlan/,
  "createZine must not run issue-plan realization (orchestrated in App.handleRefine)",
);
assert.doesNotMatch(
  generator,
  /scryShadowMemory/,
  "createZine must not pull unapproved shadow memory into generation",
);

const app = read("App.tsx");
assert.match(
  app,
  /realizeZineContentFromPlan/,
  "App.handleRefine must run editorial issue-plan realization after createZine",
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

const bake = read("lib/bakeZinePlates.ts");
assert.doesNotMatch(
  bake,
  /planAuthoredPageIdsRequiringMedia/,
  "Bake develops prompt-backed pages directly on aligned content",
);

console.log("✓ Mimi zine generation layout verified");
console.log("  - createZine seeds spread layouts; App orchestrates issue-plan realization");
console.log("  - hi-fi bake develops pages with image prompts on plan-aligned content");
console.log("  - generated zines do not silently write taste graph vectors");
