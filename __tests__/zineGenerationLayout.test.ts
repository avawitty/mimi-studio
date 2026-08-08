import { describe, expect, it } from "vitest";
import {
  draftZineArtifactId,
  enhanceZineGenerationLayout,
} from "../lib/zine/enhanceZineGenerationLayout";
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

describe("zine generation layout enhancement", () => {
  it("assigns stable page ids, grammars, and default spread layouts", () => {
    const enhanced = enhanceZineGenerationLayout({
      content: draftContent(),
      artifactId: draftZineArtifactId(),
    });

    expect(enhanced.pages).toHaveLength(2);
    for (const page of enhanced.pages || []) {
      expect(page.id).toBeTruthy();
      expect(page.grammar).toBeTruthy();
      expect(page.customLayout?.elements.length).toBeGreaterThan(0);
      expect(page.customLayout?.readingOrder?.length).toBeGreaterThan(0);
    }
  });

  it("persists pages through pagesJson", () => {
    const enhanced = enhanceZineGenerationLayout({
      content: draftContent(),
      artifactId: "draft-test-json",
    });

    expect(enhanced.pagesJson).toBeTruthy();
    expect(JSON.parse(enhanced.pagesJson!)).toHaveLength(2);
  });

  it("preserves existing custom layouts", () => {
    const content = draftContent();
    content.pages![1] = {
      ...content.pages![1],
      customLayout: {
        elements: [
          {
            id: "headline",
            type: "text",
            content: "Custom headline",
            style: {
              top: 10,
              left: 10,
              width: 80,
              fontSize: 2,
              fontFamily: "Cormorant Garamond",
            },
          },
        ],
        readingOrder: ["headline"],
      },
    };

    const enhanced = enhanceZineGenerationLayout({
      content,
      artifactId: "draft-test-custom",
    });

    expect(enhanced.pages?.[1].customLayout?.elements).toHaveLength(1);
    expect(enhanced.pages?.[1].customLayout?.elements[0].content).toBe(
      "Custom headline",
    );
  });
});
