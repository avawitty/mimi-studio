import { describe, expect, it } from "vitest";
import {
  planAuthoredPageIdsRequiringMedia,
  planCoverRequiresGeneratedMedia,
  realizeZineContentFromPlan,
} from "../lib/zine/realizeZineContentFromPlan";
import type { ZineContent } from "../types";

function draftContent(): ZineContent {
  return {
    meta: { mode: "editorial", intent: "test issue", timestamp: Date.now() },
    taste_context: { active_archetype: "Archivist", active_palette: [] },
    structure: { hero_prompt: "cover study", pages: [] },
    visual_guidance: {
      strict_palette: [],
      negative_prompt: "",
      composition_density: 0.5,
    },
    title: "Test Issue",
    oracular_mirror: "Central observation for the issue.",
    strategic_hypothesis: "A test hypothesis.",
    header_image_prompt: "editorial cover study",
    pages: [
      {
        pageNumber: 1,
        headline: "Visual plate one",
        bodyCopy: "Body one",
        imagePrompt: "first visual",
      },
      {
        pageNumber: 2,
        headline: "Evidence ledger",
        bodyCopy: "Body two",
        imagePrompt: "evidence ledger",
        sourceIds: ["atom-1"],
      },
    ],
  };
}

describe("generate-to-plan realization", () => {
  it("aligns authored pages to compressed plan slots", () => {
    const realized = realizeZineContentFromPlan({
      content: draftContent(),
      artifactId: "draft-test-1",
      originalInput: "source prompt",
      fragmentIds: ["atom-1"],
    });

    expect(realized.issuePlan.pages[0].sectionType).toBe("cover");
    expect(realized.issuePlan.pages.at(-1)?.sectionType).toBe("colophon");
    expect(realized.content.pages?.length).toBe(
      realized.issuePlan.pages.filter((page) => !page.derived).length,
    );
  });

  it("marks only prompt-backed pages without images for media development", () => {
    const realized = realizeZineContentFromPlan({
      content: draftContent(),
      artifactId: "draft-test-2",
      originalInput: "source prompt",
    });
    const mediaIds = planAuthoredPageIdsRequiringMedia(realized.issuePlan);

    expect(mediaIds.size).toBeGreaterThan(0);
    for (const page of realized.content.pages || []) {
      if (page.id && mediaIds.has(page.id)) {
        expect(page.imagePrompt).toBeTruthy();
        expect(page.image_url).toBeFalsy();
      }
    }
  });

  it("skips cover media when a cover URL is already supplied", () => {
    const realized = realizeZineContentFromPlan({
      content: draftContent(),
      artifactId: "draft-test-3",
      originalInput: "source prompt",
      existingCoverUrl: "https://cdn.example.test/cover.jpg",
    });

    expect(realized.coverRequiresGeneratedMedia).toBe(false);
    expect(
      planCoverRequiresGeneratedMedia(
        realized.issuePlan,
        "https://cdn.example.test/cover.jpg",
      ),
    ).toBe(false);
  });
});
