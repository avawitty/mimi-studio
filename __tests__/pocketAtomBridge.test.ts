import { describe, expect, it } from "vitest";
import { pocketItemToAtomInput, pocketEvidenceAtomId } from "../lib/taste/pocketAtomBridge";

describe("pocketItemToAtomInput", () => {
  it("maps image pocket saves to image evidence atoms", () => {
    const input = pocketItemToAtomInput("pkt_1", "image", {
      imageUrl: "https://cdn.example.com/plate.jpg",
      title: "Reference plate",
      tags: ["editorial"],
    });

    expect(input.kind).toBe("image");
    expect(input.sourceType).toBe("image");
    expect(input.ingestSource).toBe("pocket");
    expect(input.assetUrl).toBe("https://cdn.example.com/plate.jpg");
    expect(input.sourceMetadata?.pocketItemId).toBe("pkt_1");
  });

  it("uses deterministic atom ids for dedupe", () => {
    expect(pocketEvidenceAtomId("abc")).toBe("pocket_abc");
  });

  it("maps link saves to url kind", () => {
    const input = pocketItemToAtomInput("pkt_2", "link", {
      url: "https://vogue.com/article",
      title: "Vogue piece",
    });
    expect(input.kind).toBe("url");
    expect(input.sourceType).toBe("website");
    expect(input.originalSource).toContain("vogue.com");
  });
});
