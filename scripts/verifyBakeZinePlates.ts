import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { hydrateZineContentPages, shouldAutoDevelopPlates } from "../lib/zineSpreadLayout";
import type { ZineMetadata } from "../types";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

assert.equal(
  shouldAutoDevelopPlates({ isHighFidelity: true, isLite: false }),
  true,
);
assert.equal(
  shouldAutoDevelopPlates({ isHighFidelity: true, isLite: true }),
  false,
);

const withJson = {
  id: "z1",
  content: {
    pages: [],
    pagesJson: JSON.stringify([
      {
        pageNumber: 1,
        headline: "H",
        bodyCopy: "B",
        imagePrompt: "p",
      },
    ]),
  },
} as unknown as ZineMetadata;

const hydrated = hydrateZineContentPages(withJson);
assert.equal(hydrated.content?.pages?.length, 1);
assert.equal(hydrated.content?.pages?.[0].headline, "H");

const app = read("App.tsx");
assert.match(app, /bakeZineVisualPlates/, "Hi-fi create path must bake plates before save.");
assert.match(app, /Developing hi-fi plates/, "User-facing bake progress signal required.");

const panel = read("components/IssueSpreadsPanel.tsx");
assert.match(panel, /ZineLayoutEditor/, "Edit spreads must compose in-chamber.");
assert.match(panel, /updateZineMetadata/, "In-Edit compose must persist layouts.");
assert.match(panel, /hydrateZineContentPages/, "List must hydrate pagesJson.");

const bake = read("lib/bakeZinePlates.ts");
assert.match(bake, /MAX_BAKE_PLATES\s*=\s*24/, "Bake fan-out must hard-cap plate jobs.");
assert.match(bake, /slice\(0,\s*MAX_BAKE_PLATES\)/, "Bake jobs must slice to the plate cap.");
assert.match(
  bake,
  /allowStorageFallback:\s*false/,
  "Bake uploads must refuse data-URL storage fallback.",
);

const firebaseUtils = read("services/firebaseUtils.ts");
assert.match(
  firebaseUtils,
  /No current user[\s\S]*saveZineLocally\(metadata\)/,
  "Ghost/no-auth updates must persist locally.",
);

console.log("✓ Hi-fi plate bake + Edit compose verified");
console.log("  - hydrate pagesJson");
console.log("  - App.tsx hi-fi bake wiring");
console.log("  - IssueSpreadsPanel in-chamber compose");
console.log("  - bake plate cap + no data-URL Firestore fallback");
console.log("  - ghost/no-auth local persist");
