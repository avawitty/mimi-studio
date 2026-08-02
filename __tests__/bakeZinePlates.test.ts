import { describe, expect, it } from "vitest";
import { hydrateZineContentPages, shouldAutoDevelopPlates } from "../lib/zineSpreadLayout";
import type { ZineMetadata } from "../types";

describe("bakeZinePlates helpers", () => {
  it("gates hi-fi bake with shouldAutoDevelopPlates", () => {
    expect(shouldAutoDevelopPlates({ isHighFidelity: true })).toBe(true);
    expect(shouldAutoDevelopPlates({ isHighFidelity: true, isQuickPreview: true })).toBe(false);
  });

  it("hydrates pages from pagesJson", () => {
    const zine = {
      id: "a",
      content: {
        pagesJson: JSON.stringify([
          { pageNumber: 2, headline: "Two", bodyCopy: "x", imagePrompt: "y" },
        ]),
      },
    } as unknown as ZineMetadata;
    const next = hydrateZineContentPages(zine);
    expect(next.content?.pages?.[0].pageNumber).toBe(2);
  });

  it("leaves existing pages untouched", () => {
    const zine = {
      id: "a",
      content: {
        pages: [{ pageNumber: 1, headline: "Keep", bodyCopy: "a", imagePrompt: "b" }],
        pagesJson: JSON.stringify([]),
      },
    } as unknown as ZineMetadata;
    expect(hydrateZineContentPages(zine).content?.pages?.[0].headline).toBe("Keep");
  });
});
