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
  "createZine must not run the editorial issue-plan pipeline",
);

const app = read("App.tsx");
assert.doesNotMatch(
  app,
  /issuePlan: result\.issuePlan/,
  "Hi-fi bake must not depend on issue plan slots",
);

const bake = read("lib/bakeZinePlates.ts");
assert.doesNotMatch(
  bake,
  /planAuthoredPageIdsRequiringMedia/,
  "Bake must develop prompt-backed pages directly",
);

console.log("✓ Mimi zine generation layout verified");
console.log("  - createZine seeds spread layouts without issue-plan compression");
console.log("  - hi-fi bake develops pages with image prompts directly");
