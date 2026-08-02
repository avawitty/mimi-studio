import { describe, expect, it } from "vitest";
import {
  scoreArchiveDoc,
  selectKeywordMatchedArchive,
} from "../services/searchService";

describe("searchGrounding keyword gate", () => {
  const docs = [
    { id: "a", type: "zine", title: "Saturation Chic lookbook", tags: ["neon"] },
    { id: "b", type: "pocket", title: "Greige wardrobe notes", content_preview: "ash linen" },
    { id: "c", type: "zine", title: "Untitled", content: { prompt: "moss garden" } },
  ];

  it("scores only when query terms appear in archive text", () => {
    expect(scoreArchiveDoc(docs[0], ["saturation", "chic"])).toBeGreaterThan(0);
    expect(scoreArchiveDoc(docs[0], ["moss"])).toBe(0);
  });

  it("returns empty when no archive item matches the query", () => {
    const matched = selectKeywordMatchedArchive(docs, "will i be a lover girl again?");
    expect(matched).toEqual([]);
  });

  it("ignores stopwords that would false-match substrings", () => {
    // "be" is inside "wardrobe" — must not count as evidence
    const matched = selectKeywordMatchedArchive(docs, "be will again");
    expect(matched).toEqual([]);
  });

  it("keeps only positively scored specimens", () => {
    const matched = selectKeywordMatchedArchive(docs, "neon saturation");
    expect(matched.map((m) => m.doc.id)).toEqual(["a"]);
    expect(matched.every((m) => m.score > 0)).toBe(true);
  });

  it("scores saved zine body fields beyond title and tags", () => {
    const doc = {
      id: "z",
      type: "zine",
      title: "Untitled draft",
      originalInput: "lover girl again moodboard",
      content: {
        the_reading: "saturation chic neon romance",
        pages: [{ headline: "mirror phase", bodyCopy: "wardrobe reset" }],
      },
    };
    expect(scoreArchiveDoc(doc, ["lover", "girl"])).toBeGreaterThan(0);
    expect(scoreArchiveDoc(doc, ["saturation"])).toBeGreaterThan(0);
    expect(scoreArchiveDoc(doc, ["mirror"])).toBeGreaterThan(0);
  });
});
