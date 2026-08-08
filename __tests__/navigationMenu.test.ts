import { describe, expect, it } from "vitest";
import { isExtendedMenuMode, WORKFLOW_MAP_CHROME_MODES } from "../lib/navigationMenu";

describe("navigationMenu", () => {
  it("treats dev/advanced chambers as extended by default", () => {
    expect(isExtendedMenuMode("codex")).toBe(true);
    expect(isExtendedMenuMode("observatory")).toBe(true);
    expect(isExtendedMenuMode("profile")).toBe(false);
    expect(isExtendedMenuMode("signature")).toBe(false);
  });

  it("exposes workflow modes that get a Studio Map chrome shortcut", () => {
    expect(WORKFLOW_MAP_CHROME_MODES.has("studio")).toBe(true);
    expect(WORKFLOW_MAP_CHROME_MODES.has("stand")).toBe(true);
    expect(WORKFLOW_MAP_CHROME_MODES.has("chamber-map")).toBe(false);
  });
});
