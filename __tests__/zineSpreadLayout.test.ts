import { describe, expect, it } from "vitest";
import {
  buildDefaultSpreadElements,
  pageHasCustomLayout,
  plateGrammarClass,
  resolveIssueMode,
  shouldAutoDevelopPlates,
  toEditableZinePage,
} from "../lib/zineSpreadLayout";
import type { ZinePageSpec } from "../types";

const page: ZinePageSpec = {
  pageNumber: 1,
  headline: "Thesis plate",
  bodyCopy: "Body copy for the spread.",
  supportingText: "Footnote",
  imagePrompt: "still life",
  image_url: "https://cdn.example/plate.jpg",
};

describe("zineSpreadLayout", () => {
  it("detects composed layouts", () => {
    expect(pageHasCustomLayout(page)).toBe(false);
    expect(
      pageHasCustomLayout({
        ...page,
        customLayout: {
          elements: [
            {
              id: "t1",
              type: "text",
              content: "Hi",
              style: { top: 0, left: 0, width: 100 },
            },
          ],
        },
      }),
    ).toBe(true);
  });

  it("seeds editor elements without Inter", () => {
    const els = buildDefaultSpreadElements(page);
    expect(els.length).toBeGreaterThanOrEqual(2);
    expect(els.find((e) => e.type === "image")?.content).toBe(page.image_url);
    expect(els.every((e) => e.style.fontFamily !== "Inter")).toBe(true);
  });

  it("maps pages for the layout editor", () => {
    const editable = toEditableZinePage(page);
    expect(editable.originalMediaUrl).toBe(page.image_url);
  });

  it("resolves mode grammars exhaustively", () => {
    expect(resolveIssueMode(undefined)).toBe("editorial");
    expect(plateGrammarClass("seasonal", 0)).toContain("zine-plate--seasonal");
    expect(plateGrammarClass("oracle", 0)).toContain("zine-plate--oracle");
  });

  it("auto-develops only hi-fi finished issues", () => {
    expect(shouldAutoDevelopPlates({ isHighFidelity: true })).toBe(true);
    expect(shouldAutoDevelopPlates({ isHighFidelity: true, isQuickPreview: true })).toBe(false);
  });
});
