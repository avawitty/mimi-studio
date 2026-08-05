import { describe, expect, it, vi } from "vitest";
import { swapZinePlateStock } from "../lib/swapZinePlateStock";
import type { ZinePageSpec } from "../types";

const samplePage: ZinePageSpec = {
  pageNumber: 2,
  headline: "Quiet light",
  bodyCopy: "A study in morning shadow.",
  imagePrompt: "editorial portrait soft window light",
  image_url: "https://images.unsplash.com/old.jpg",
  plateMediaOrigin: "unsplash",
  stockAttribution: "Photo by Old / Unsplash",
};

describe("swapZinePlateStock", () => {
  it("returns null when stock search misses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await swapZinePlateStock(samplePage, 1);
    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/inspo/search?q="),
    );
    expect(fetchMock.mock.calls[0][0]).toContain("page=2");

    vi.unstubAllGlobals();
  });
});
