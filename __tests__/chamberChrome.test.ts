import { describe, expect, it } from "vitest";
import {
  chromeDataAttr,
  getChamberFamily,
  getFaceKind,
  isDarkPlateMode,
  isPublicFaceMode,
  isPublicEditorialFlowMode,
  mainShellClassName,
} from "../lib/chamberChrome";

describe("chamberChrome", () => {
  it("classifies routes with the eight Studio OS families", () => {
    expect(getChamberFamily("chamber-map")).toBe("orientation");
    expect(getChamberFamily("studio")).toBe("orientation");
    expect(getChamberFamily("oracle")).toBe("intelligence");
    expect(getChamberFamily("scry")).toBe("capture");
    expect(getChamberFamily("pocket")).toBe("library");
    expect(getChamberFamily("tailor")).toBe("identity");
    expect(getChamberFamily("the-press")).toBe("publishing");
    expect(getChamberFamily("private-studio")).toBe("services");
    expect(getChamberFamily("unknown-mode")).toBe("orientation");
  });

  it("keeps evidence-led reports in intelligence", () => {
    expect(getChamberFamily("residue")).toBe("intelligence");
    expect(getChamberFamily("intel-hub")).toBe("intelligence");
  });

  it("marks public and dark plates for quiet chrome", () => {
    expect(isPublicFaceMode("editorial-home")).toBe(true);
    expect(isPublicFaceMode("scry")).toBe(true);
    expect(isPublicFaceMode("studio")).toBe(false);
    expect(isPublicEditorialFlowMode("stand")).toBe(true);
    expect(isPublicEditorialFlowMode("proscenium")).toBe(true);
    expect(isPublicEditorialFlowMode("archival")).toBe(false);
    expect(isPublicEditorialFlowMode("studio")).toBe(false);
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
    expect(getFaceKind("tailor")).toBe("worktable");

    expect(mainShellClassName("studio")).toContain("overflow-hidden");
    expect(mainShellClassName("tailor")).toContain("overflow-hidden");
    expect(mainShellClassName("mimi-rip")).toContain("bg-[#050506]");
    expect(mainShellClassName("editorial-home")).toContain("mimi-page-pad--public");
    expect(mainShellClassName("editorial-home")).toContain("mimi-field");
    expect(mainShellClassName("proscenium")).toContain("mimi-page-pad--public");
    expect(mainShellClassName("archival")).not.toContain("mimi-field");
    expect(mainShellClassName("archival")).toContain("bg-nous-base");
    expect(mainShellClassName("pocket")).toContain("mimi-page-pad");
    expect(mainShellClassName("pocket")).not.toContain("mimi-page-pad--public");
  });
});
