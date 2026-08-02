import { describe, expect, it } from "vitest";
import { buildStructuredZinePdf, summarizePagesForExport } from "../lib/structuredZinePdf";
import type { ZineMetadata } from "../types";
import { makeLegacyZineMetadata } from "./fixtures/zineMetadata";

const base = {
  id: "z1",
  fragmentsUsed: [],
  createdAt: 1,
  theme: "white editorial",
  aestheticVector: {},
  userId: "u1",
  userHandle: "ava",
  title: "Test Issue",
  tone: "editorial",
  timestamp: 1,
  likes: 0,
  content: {
    meta: { mode: "editorial", intent: "test", timestamp: 1 },
    taste_context: { active_archetype: "Witness", active_palette: ["#000"] },
    structure: { hero_prompt: "h", pages: [] },
    visual_guidance: { strict_palette: [], negative_prompt: "", composition_density: 0.5 },
    oracular_mirror: "Mirror text",
    pages: [
      {
        pageNumber: 1,
        headline: "One",
        bodyCopy: "Body",
        imagePrompt: "p",
      },
    ],
  },
} as unknown as ZineMetadata;

describe("structuredZinePdf", () => {
  it("summarizes custom layouts", () => {
    const withLayout = {
      ...base,
      content: {
        ...base.content,
        pages: [
          {
            pageNumber: 1,
            headline: "One",
            bodyCopy: "Body",
            imagePrompt: "p",
            customLayout: {
              elements: [{ id: "a", type: "text", content: "Hi", style: { top: 0, left: 0, width: 50 } }],
            },
          },
        ],
      },
    } as unknown as ZineMetadata;
    expect(summarizePagesForExport(withLayout)[0].hasCustomLayout).toBe(true);
  });

  it("builds a multi-page document without images", async () => {
    const doc = await buildStructuredZinePdf(base, {
      sections: ["cover", "reading", "plates"],
    });
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(3);
  });

  it("hydrates legacy pagesJson and includes every approved page", async () => {
    const metadata = makeLegacyZineMetadata();
    const pages = JSON.parse(metadata.content.pagesJson || "[]").map(
      (page: Record<string, unknown>) => ({
        ...page,
        image_url: undefined,
        originalMediaUrl: undefined,
        assetVariants: undefined,
      }),
    );
    metadata.coverImageUrl = undefined;
    metadata.content.pages = [];
    metadata.content.pagesJson = JSON.stringify(pages);

    expect(summarizePagesForExport(metadata)).toHaveLength(2);
    const doc = await buildStructuredZinePdf(metadata, {
      sections: ["plates"],
    });
    expect(doc.getNumberOfPages()).toBe(2);
  });
});
