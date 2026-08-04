import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  planAuthoredPageIdsRequiringMedia,
  realizeZineContentFromPlan,
} from "../lib/zine/realizeZineContentFromPlan";
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

const realized = realizeZineContentFromPlan({
  content,
  artifactId: "draft-verify",
  originalInput: "prompt",
});

assert.ok(realized.issuePlan.compression);
assert.equal(
  realized.content.pages?.length,
  realized.issuePlan.pages.filter((page) => !page.derived).length,
);
assert.ok(planAuthoredPageIdsRequiringMedia(realized.issuePlan).size >= 1);

const generator = read("services/zineGenerator.ts");
assert.match(generator, /realizeZineContentFromPlan/, "createZine must realize through the issue plan");
assert.match(generator, /issuePlan: realized\.issuePlan/, "createZine must return issuePlan for bake");

const app = read("App.tsx");
assert.match(app, /issuePlan: result\.issuePlan/, "Hi-fi bake must receive the issue plan");

const bake = read("lib/bakeZinePlates.ts");
assert.match(bake, /planAuthoredPageIdsRequiringMedia/, "Bake must filter plates by plan media slots");
assert.match(bake, /planCoverRequiresGeneratedMedia/, "Bake must respect plan cover media slot");

console.log("✓ Mimi zine generate-to-plan verified");
console.log("  - createZine aligns pages through buildZineIssuePlan + compression");
console.log("  - hi-fi bake only develops plan-marked media slots");
