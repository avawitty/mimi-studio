import { describe, expect, it } from "vitest";
import { buildPublicProfileSeoData, escapeHtml, renderPublicProfileOgHtml } from "../lib/publicProfileSeo";
import type { UserProfile } from "../types";

const profile = {
  handle: "atelier",
  displayName: "Atelier",
  bio: "Editorial studio for quiet evidence.",
  photoURL: "https://example.com/human.jpg",
  publicShowcase: {
    handle: "atelier",
    dollLabel: "Studio Doll",
    philosophy: "Quiet evidence over noise.",
    accentHex: "#5A5A40",
    voiceAdjectives: [],
    motifCandidates: [],
    dollPortraitUrl: "https://example.com/doll.jpg",
    updatedAt: Date.now(),
  },
} as UserProfile;

describe("publicProfileSeo", () => {
  it("builds SEO from published showcase fields only", () => {
    const seo = buildPublicProfileSeoData(profile, "https://mimi.you");
    expect(seo.title).toBe("Studio Doll (@atelier)");
    expect(seo.description).toBe("Quiet evidence over noise.");
    expect(seo.imageUrl).toBe("https://example.com/doll.jpg");
    expect(seo.pageUrl).toBe("https://mimi.you/u/atelier");
  });

  it("escapes HTML in OG output", () => {
    const seo = buildPublicProfileSeoData(
      {
        ...profile,
        bio: 'Line with <tags> & "quotes"',
      } as UserProfile,
      "https://mimi.you",
    );
    const html = renderPublicProfileOgHtml(seo);
    expect(html).toContain(escapeHtml(seo.description));
    expect(html).not.toContain('<tags>');
  });
});
