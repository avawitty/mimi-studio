import { describe, expect, it } from "vitest";
import {
  chromeDataAttr,
  getChamberFamily,
  getFaceKind,
  isDarkPlateMode,
  isPublicFaceMode,
  mainShellClassName,
} from "../lib/chamberChrome";

describe("chamberChrome", () => {
  it("classifies create / reflect / refine / signature / observe families", () => {
    expect(getChamberFamily("studio")).toBe("create");
    expect(getChamberFamily("oracle")).toBe("reflect");
    expect(getChamberFamily("scry")).toBe("reflect");
    expect(getChamberFamily("tailor")).toBe("refine");
    expect(getChamberFamily("signature")).toBe("signature");
    expect(getChamberFamily("mimi-rip")).toBe("signature");
    expect(getChamberFamily("observatory")).toBe("observe");
    expect(getChamberFamily("unknown-mode")).toBe("system");
  });

  it("does not double-map residue into signature after reflect", () => {
    expect(getChamberFamily("residue")).toBe("reflect");
    expect(getChamberFamily("intel-hub")).toBe("reflect");
  });

  it("marks public and dark plates for quiet chrome", () => {
    expect(isPublicFaceMode("editorial-home")).toBe(true);
    expect(isPublicFaceMode("scry")).toBe(true);
    expect(isPublicFaceMode("studio")).toBe(false);
    expect(isDarkPlateMode("mimi-rip")).toBe(true);
    expect(isDarkPlateMode("stand")).toBe(false);
    expect(chromeDataAttr("scry")).toBe("public-face-dark");
    expect(chromeDataAttr("stand")).toBe("public-face");
    expect(chromeDataAttr("studio")).toBe("worktable");
  });

  it("returns face kinds and main shell classes", () => {
    expect(getFaceKind("stand")).toBe("public");
    expect(getFaceKind("scry")).toBe("public-dark");
    expect(getFaceKind("oracle")).toBe("void");
    expect(getFaceKind("studio")).toBe("worktable");

    expect(mainShellClassName("studio")).toContain("overflow-hidden");
    expect(mainShellClassName("mimi-rip")).toContain("bg-[#050506]");
    expect(mainShellClassName("editorial-home")).toContain("mimi-page-pad--public");
    expect(mainShellClassName("pocket")).toContain("mimi-page-pad");
    expect(mainShellClassName("pocket")).not.toContain("mimi-page-pad--public");
  });
});
