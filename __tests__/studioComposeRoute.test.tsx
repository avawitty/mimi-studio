import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("/studio routing", () => {
  it("wires App.tsx so /studio mounts InputStudio directly", () => {
    const appSource = readFileSync(resolve(process.cwd(), "App.tsx"), "utf8");

    expect(appSource).toMatch(
      /import\s+\{\s*InputStudio\s*\}\s+from\s+"\.\/components\/InputStudio"/,
    );
    expect(appSource).not.toMatch(/StudioOrientationEntry/);
    expect(appSource).not.toMatch(/StudioWorktable/);
    expect(appSource).not.toMatch(/studioConsoleOpen/);
    expect(appSource).not.toMatch(/<StudioWorktable/);
    expect(appSource).toMatch(/worktable-legacy/);

    const studioMountIdx = appSource.indexOf('{viewMode === "studio" && (');
    expect(studioMountIdx).toBeGreaterThan(-1);
    const studioMountSection = appSource.slice(studioMountIdx, studioMountIdx + 800);
    expect(studioMountSection).toContain("<InputStudio");
    expect(studioMountSection).not.toContain("<StudioOrientationEntry");
    expect(studioMountSection).not.toContain("<StudioWorktable");
  });

  it("points LAZY_CHAMBERS.studio at InputStudio", () => {
    const routesSource = readFileSync(
      resolve(process.cwd(), "lib/routes.tsx"),
      "utf8",
    );
    expect(routesSource).toMatch(
      /studio:\s*lazy\([\s\S]*?InputStudio/,
    );
    expect(routesSource).not.toMatch(/StudioOrientationEntry/);
    expect(routesSource).not.toMatch(/StudioWorktable/);
  });

  it("registers InputStudio in product canon for /studio", () => {
    const canonSource = readFileSync(
      resolve(process.cwd(), "lib/productCanon.ts"),
      "utf8",
    );
    expect(canonSource).toMatch(/component:\s*"InputStudio"/);
    expect(canonSource).not.toMatch(/StudioOrientationEntry/);
  });
});
