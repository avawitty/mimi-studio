import { describe, expect, it } from "vitest";
import {
  elementsInReadingOrder,
  resolveZineReadingOrder,
  validateZineReadingOrder,
} from "../lib/zine/zineReadingOrder";
import type { ZinePageSpec } from "../types";

function page(readingOrder?: string[]): ZinePageSpec {
  return {
    pageNumber: 1,
    headline: "Reading order",
    bodyCopy: "",
    imagePrompt: "",
    customLayout: {
      elements: [
        {
          id: "lower",
          type: "text",
          content: "Second",
          style: { top: 60, left: 10, width: 40 },
        },
        {
          id: "upper",
          type: "text",
          content: "First",
          style: { top: 10, left: 10, width: 40 },
        },
      ],
      readingOrder,
    },
  };
}

describe("zine custom-layout reading order", () => {
  it("uses an explicit valid order", () => {
    const subject = page(["lower", "upper"]);
    expect(validateZineReadingOrder(subject).valid).toBe(true);
    expect(elementsInReadingOrder(subject).map((element) => element.id)).toEqual([
      "lower",
      "upper",
    ]);
  });

  it("reports missing, duplicate, and omitted references", () => {
    const result = validateZineReadingOrder(
      page(["upper", "upper", "missing"]),
    );

    expect(result.valid).toBe(false);
    expect(result.duplicateIds).toEqual(["upper"]);
    expect(result.missingElementIds).toEqual(["missing"]);
    expect(result.omittedElementIds).toEqual(["lower"]);
  });

  it("falls back to deterministic visual order", () => {
    expect(resolveZineReadingOrder(page())).toEqual(["upper", "lower"]);
  });
});
