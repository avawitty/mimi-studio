import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");

const visualizer = read("components/Visualizer.tsx");
const reveal = read("components/AnalysisDisplay.tsx");
const generator = read("services/zineGenerator.ts");
const imageService = read("services/geminiService.ts");

assert.match(
  generator,
  /BLANK-SLATE VISUAL BASELINE/,
  "Zine generation must declare the blank-slate visual baseline.",
);
assert.doesNotMatch(
  generator,
  /BASELINE AESTHETIC DIRECTIVE/,
  "The former Mimi house-style baseline must not return.",
);

const imageGenerator = imageService.slice(
  imageService.indexOf("export const generateZineImage"),
  imageService.indexOf("export function getSimulatedImageBase64"),
);
assert.match(
  imageGenerator,
  /BLANK-SLATE IMAGE POLICY/,
  "Imagen prompts must preserve open visual dimensions.",
);
assert.doesNotMatch(
  imageGenerator,
  /Ilford HP5|Rembrandt lighting|Crushed blacks, desaturated/,
  "Imagen must not receive an implicit monochrome photography treatment.",
);

assert.match(
  visualizer,
  /opacity-100 grayscale-0/,
  "Loaded images must render in their generated color.",
);
assert.doesNotMatch(
  visualizer,
  /opacity-100 grayscale contrast-100/,
  "Loaded images must not retain a grayscale CSS filter.",
);

assert.match(reveal, /Why it belongs|Editorial evidence of taste/, "Commerce cards need an editorial explanation surface.");
assert.match(reveal, /t\.image_url/, "Commerce cards must support verified product thumbnails.");
assert.doesNotMatch(reveal, /<Link2\b|<Printer\b/, "Toolbar duplicate link and PDF controls must stay removed.");
assert.match(reveal, /From thesis to repeatable action/, "Authority Roadmap needs the editorial journey hierarchy.");
assert.doesNotMatch(reveal, /bg-\[#F5F2EA\]|bg-\[#F7F4EC\]/, "Issue plates must not use warm cream fills.");
assert.match(reveal, /ZineSpreadCanvas|Compose spread/, "Visual plates must support composed spreads.");

console.log("✓ Zine visual policy verified");
console.log("  - blank-slate image hierarchy");
console.log("  - color-preserving display");
console.log("  - one toolbar control per intent");
console.log("  - grounded commerce commentary cards");
console.log("  - legible Authority Roadmap journey");
console.log("  - house-style takeaways + spread compose");
