import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { StudioOrientationEntry } from "../components/studio/StudioOrientationEntry";

const FORBIDDEN_ON_STUDIO = [
  "FIG. 01",
  "fig. 01",
  "SPARK · GENERATE",
  "Spark · Generate",
  "DESK",
  "SCRY",
  "FILE",
  "CUT",
  "DEV",
  "ISSUE",
] as const;

describe("/studio orientation entry route", () => {
  afterEach(() => {
    cleanup();
  });

  it("wires App.tsx so /studio mounts StudioOrientationEntry, not StudioWorktable", () => {
    const appSource = readFileSync(resolve(process.cwd(), "App.tsx"), "utf8");

    expect(appSource).toMatch(
      /import\s+\{\s*StudioOrientationEntry\s*\}\s+from\s+"\.\/components\/studio\/StudioOrientationEntry"/,
    );
    expect(appSource).toMatch(/pathParts\[1\] === "worktable-legacy"/);
    expect(appSource).toMatch(/isStudioWorktableLegacy/);

    // Primary branch renders the new entry
    expect(appSource).toMatch(/<StudioOrientationEntry[\s\S]*?\/>/);

    // Worktable only appears inside the legacy branch
    const legacyBlock = appSource.match(
      /isStudioWorktableLegacy\s*\?\s*\([\s\S]*?\)\s*:\s*\(\s*<StudioOrientationEntry/,
    );
    expect(legacyBlock).toBeTruthy();
    expect(legacyBlock?.[0]).toMatch(/<StudioWorktable/);
    expect(legacyBlock?.[0]).toMatch(/Legacy worktable · experimental/);

    // Ensure the studio mount branch prefers orientation entry
    const studioMountIdx = appSource.indexOf(
      '{viewMode === "studio" &&\n                      (isStudioWorktableLegacy',
    );
    expect(studioMountIdx).toBeGreaterThan(-1);
    const afterStudioMount = appSource.slice(studioMountIdx);
    const nextSiblingIdx = afterStudioMount.indexOf(
      '{viewMode !== "studio" && (',
    );
    const studioMountSection =
      nextSiblingIdx === -1
        ? afterStudioMount.slice(0, 8000)
        : afterStudioMount.slice(0, nextSiblingIdx);
    expect(studioMountSection).toContain("StudioOrientationEntry");
    expect(studioMountSection).toContain("StudioWorktable");
    expect(studioMountSection).toContain("Legacy worktable · experimental");
  });

  it("points LAZY_CHAMBERS.studio at StudioOrientationEntry", () => {
    const routesSource = readFileSync(
      resolve(process.cwd(), "lib/routes.tsx"),
      "utf8",
    );
    expect(routesSource).toMatch(
      /studio:\s*lazy\(\(\)\s*=>\s*import\("\.\.\/components\/studio\/StudioOrientationEntry"\)\)/,
    );
    expect(routesSource).toMatch(
      /"studio-worktable-legacy":\s*lazy\(\s*\(\)\s*=>\s*import\("\.\.\/components\/worktable\/StudioWorktable"\)/,
    );
  });

  it("does not render archival desk chrome on the /studio entry", () => {
    render(<StudioOrientationEntry />);

    expect(screen.getByRole("heading", { name: "Mimi" })).toBeInTheDocument();
    expect(
      screen.getByText(/Start with a thought, image, or fragment/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Begin with this/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Legacy worktable \(experimental\)/i }),
    ).toBeInTheDocument();

    const bodyText = document.body.textContent || "";
    for (const forbidden of FORBIDDEN_ON_STUDIO) {
      expect(bodyText).not.toContain(forbidden);
    }

    // Six-folder mobile nav labels must not appear as a set
    expect(screen.queryByLabelText(/Dossier folders/i)).toBeNull();
    expect(screen.queryByLabelText(/Explore chambers/i)).toBeNull();
  });
});
