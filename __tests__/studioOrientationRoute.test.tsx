import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("submits nested zineOptions with lowercase editorial tone", () => {
    const onRefine = vi.fn();
    render(<StudioOrientationEntry onRefine={onRefine} />);

    fireEvent.change(screen.getByPlaceholderText(/Write freely/i), {
      target: { value: "A soft cobalt wash over archival grain" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Begin with this/i }));

    expect(onRefine).toHaveBeenCalledTimes(1);
    const [, , tone, opts] = onRefine.mock.calls[0];
    expect(tone).toBe("editorial");
    expect(opts).toMatchObject({
      zineOptions: expect.objectContaining({
        style: "balanced",
        theme: "organic",
        plateMediaMode: "generated",
      }),
    });
    expect(opts).not.toHaveProperty("style");
  });

  it("defaults to Imagen toolbar and exposes stock / references toggles", () => {
    render(<StudioOrientationEntry />);

    expect(screen.getByRole("toolbar", { name: /Plate media/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /^Imagen$/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: /^Stock$/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /^References$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Darkroom/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Load a Pinterest board and read its aesthetic/i),
    ).toBeInTheDocument();
  });

  it("shows inspo carousel after typing and publishes Imagen rendition", () => {
    const onRefine = vi.fn();
    render(<StudioOrientationEntry onRefine={onRefine} />);

    fireEvent.change(screen.getByPlaceholderText(/Write freely/i), {
      target: { value: "Slow fashion in Lisbon" },
    });

    expect(screen.getByLabelText(/Inspos/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Publish my rendition/i }));

    expect(onRefine).toHaveBeenCalledTimes(1);
    const [, , , opts] = onRefine.mock.calls[0];
    expect(opts.zineOptions.plateMediaMode).toBe("generated");
  });

  it("passes plate media mode through zineOptions on submit", () => {
    const onRefine = vi.fn();
    render(<StudioOrientationEntry onRefine={onRefine} />);

    fireEvent.click(screen.getByRole("radio", { name: /^Stock$/i }));
    fireEvent.change(screen.getByPlaceholderText(/Write freely/i), {
      target: { value: "Slow fashion in Lisbon" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Begin with this/i }));

    expect(onRefine).toHaveBeenCalledTimes(1);
    const [, , , opts] = onRefine.mock.calls[0];
    expect(opts.zineOptions.plateMediaMode).toBe("photography-first");
  });
});
