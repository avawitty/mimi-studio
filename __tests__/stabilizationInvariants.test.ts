import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("stabilization invariants", () => {
  it("keeps /studio default on InputStudio in App.tsx", () => {
    const app = read("App.tsx");
    expect(app).toMatch(
      /isStudioOrientation\s*\?\s*\([\s\S]*?<StudioOrientationEntry[\s\S]*?\)\s*:\s*\(\s*<InputStudio/,
    );
  });

  it("runs realizeZineContentFromPlan in handleRefine after createZine", () => {
    const app = read("App.tsx");
    const refineIdx = app.indexOf("const handleRefine = useCallback");
    expect(refineIdx).toBeGreaterThan(-1);
    const section = app.slice(refineIdx, refineIdx + 12000);
    expect(section).toMatch(/await createZine\(/);
    expect(section).toMatch(/realizeZineContentFromPlan/);
    expect(section.indexOf("realizeZineContentFromPlan")).toBeGreaterThan(
      section.indexOf("await createZine("),
    );
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
