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
    {
      id: "d",
      type: "zine",
      title: "Untitled plate",
      originalInput: "lover girl soft focus diary",
      content: {
        the_reading: "A slow return to tenderness after armor.",
        pages: [{ pageNumber: 1, headline: "Ash linen", bodyCopy: "Quiet wardrobe residue.", imagePrompt: "x" }],
      },
    },
  ];

  it("scores only when query terms appear in archive text", () => {
    expect(scoreArchiveDoc(docs[0], ["saturation", "chic"])).toBeGreaterThan(0);
    expect(scoreArchiveDoc(docs[0], ["moss"])).toBe(0);
  });

  it("scores saved zine content fields beyond title/tags", () => {
    expect(scoreArchiveDoc(docs[3], ["lover", "girl"])).toBeGreaterThan(0);
    expect(scoreArchiveDoc(docs[3], ["tenderness"])).toBeGreaterThan(0);
    expect(scoreArchiveDoc(docs[3], ["wardrobe"])).toBeGreaterThan(0);
    expect(selectKeywordMatchedArchive(docs, "lover girl tenderness").map((m) => m.doc.id)).toContain(
      "d",
    );
  });

  it("returns empty when no archive item matches the query", () => {
    const matched = selectKeywordMatchedArchive(docs, "will i be a quantum flux capacitor?");
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
