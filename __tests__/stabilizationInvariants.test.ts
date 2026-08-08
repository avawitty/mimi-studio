import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("stabilization invariants", () => {
  it("keeps InputStudio as default /studio surface", () => {
    const app = read("App.tsx");
    expect(app).toMatch(/<InputStudio/);
    expect(app).not.toMatch(/<StudioOrientationEntry/);
    expect(app).not.toMatch(/FIG\. 01/);
  });

  it("runs editorial compiler in createZine direct path", () => {
    const generator = read("services/zineGenerator.ts");
    expect(generator).toMatch(/applyDirectPathEditorialIntelligence/);
    expect(generator).toMatch(/issuePlan: editorial\.issuePlan/);
  });

  it("does not auto-update taste graph on zine save", () => {
    const utils = read("services/firebaseUtils.ts");
    const saveStart = utils.indexOf("export const saveZineToProfile");
    const saveEnd = utils.indexOf("export const updateTasteGraph");
    const saveBlock = utils.slice(saveStart, saveEnd);
    expect(saveBlock).not.toMatch(/updateTasteGraph\(/);
  });

  it("does not inject shadow memory into createZine", () => {
    const generator = read("services/zineGenerator.ts");
    expect(generator).not.toMatch(/scryShadowMemory/);
  });
});
