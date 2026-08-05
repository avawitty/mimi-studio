import { describe, expect, it } from "vitest";
import { referenceSlidesFromMedia } from "../lib/fetchStudioInspos";
import type { MediaFile } from "../types";

describe("referenceSlidesFromMedia", () => {
  it("maps image references into inspo slides", () => {
    const media: MediaFile[] = [
      {
        type: "image",
        url: "https://example.com/a.jpg",
        data: "https://example.com/a.jpg",
        mimeType: "image/jpeg",
        name: "Mood board still",
      },
    ];

    const slides = referenceSlidesFromMedia(media);
    expect(slides).toHaveLength(1);
    expect(slides[0]).toMatchObject({
      source: "reference",
      label: "Mood board still",
      imageUrl: "https://example.com/a.jpg",
    });
  });
});
