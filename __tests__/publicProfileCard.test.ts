import { describe, expect, it } from "vitest";
import {
  buildPublicSignatureExcerpt,
  formatPublicLinkLabel,
  getPublicExternalLinks,
  hasPublishedRip,
  resolvePublicProfileIdentity,
} from "../lib/publicProfileCard";
import type { PublicRipSnapshot, PublicShowcaseSnapshot, UserProfile } from "../types";

const baseProfile = (overrides: Partial<UserProfile> = {}): UserProfile =>
  ({
    uid: "u1",
    handle: "atelier",
    currentSeason: "blooming",
    createdAt: Date.now(),
    ...overrides,
  }) as UserProfile;

const showcase: PublicShowcaseSnapshot = {
  handle: "atelier",
  dollLabel: "Studio Doll",
  philosophy: "Quiet evidence over noise.",
  accentHex: "#5A5A40",
  voiceAdjectives: ["precise"],
  motifCandidates: ["lace", "grain"],
  dollPortraitUrl: "https://example.com/doll.jpg",
  updatedAt: Date.now(),
};

describe("publicProfileCard helpers", () => {
  it("resolves identity with doll portrait as public avatar", () => {
    const identity = resolvePublicProfileIdentity(
      baseProfile({
        displayName: "Atelier",
        bio: "Editorial studio.",
        photoURL: "https://example.com/avatar.jpg",
      }),
      showcase,
    );

    expect(identity.handle).toBe("atelier");
    expect(identity.displayName).toBe("Atelier");
    expect(identity.bio).toBe("Editorial studio.");
    expect(identity.avatarUrl).toBe("https://example.com/doll.jpg");
    expect(identity.avatarIsDoll).toBe(true);
    expect(identity.dollLabel).toBe("Studio Doll");
  });

  it("falls back to photoURL only before doll likeness is published", () => {
    const identity = resolvePublicProfileIdentity(
      baseProfile({ photoURL: "https://example.com/avatar.jpg" }),
      { ...showcase, dollPortraitUrl: undefined },
    );

    expect(identity.avatarUrl).toBe("https://example.com/avatar.jpg");
    expect(identity.avatarIsDoll).toBe(false);
  });

  it("prefers published aesthetic signature for public excerpt", () => {
    const excerpt = buildPublicSignatureExcerpt(
      baseProfile({
        tasteProfile: {
          semantic_signature: "Soft brutalism with archival warmth.",
          archetype_weights: {},
          color_frequency: {},
          aestheticSignature: {
            primaryAxis: "Archival restraint",
            secondaryAxis: "Warm geometry",
            motifs: ["parchment", "olive"],
            moodCluster: "Quiet",
            generatedAt: Date.now(),
            influenceLineage: [],
            creativeCycles: [],
            motifEvolution: [],
            status: "approved",
            approvedAt: Date.now(),
            publishedAt: Date.now(),
          },
        },
      }),
      showcase,
    );

    expect(excerpt?.title).toBe("Archival restraint");
    expect(excerpt?.subtitle).toBe("Warm geometry");
    expect(excerpt?.motifs).toEqual(["parchment", "olive"]);
    expect(excerpt?.fullPagePath).toBe("/u/atelier/signature");
  });

  it("does not expose unpublished approved signature on public card", () => {
    const excerpt = buildPublicSignatureExcerpt(
      baseProfile({
        tasteProfile: {
          semantic_signature: "Should not leak",
          archetype_weights: {},
          color_frequency: {},
          aestheticSignature: {
            primaryAxis: "Private axis",
            secondaryAxis: "",
            motifs: ["secret"],
            moodCluster: "Quiet",
            generatedAt: Date.now(),
            influenceLineage: [],
            creativeCycles: [],
            motifEvolution: [],
            status: "approved",
            approvedAt: Date.now(),
          },
        },
      }),
      showcase,
    );

    expect(excerpt?.title).toBe("Studio Doll");
    expect(excerpt?.semanticLine).toBe("Quiet evidence over noise.");
    expect(excerpt?.fullPagePath).toBeUndefined();
  });

  it("links to full signature page only when published", () => {
    const draft = buildPublicSignatureExcerpt(
      baseProfile({
        handle: "atelier",
        tasteProfile: {
          semantic_signature: "",
          archetype_weights: {},
          color_frequency: {},
          aestheticSignature: {
            primaryAxis: "Draft axis",
            secondaryAxis: "",
            motifs: [],
            moodCluster: "Quiet",
            generatedAt: Date.now(),
            influenceLineage: [],
            creativeCycles: [],
            motifEvolution: [],
            status: "draft",
          },
        },
      }),
      showcase,
    );
    expect(draft?.fullPagePath).toBeUndefined();

    const published = buildPublicSignatureExcerpt(
      baseProfile({
        handle: "atelier",
        tasteProfile: {
          semantic_signature: "",
          archetype_weights: {},
          color_frequency: {},
          aestheticSignature: {
            primaryAxis: "Archival restraint",
            secondaryAxis: "",
            motifs: [],
            moodCluster: "Quiet",
            generatedAt: Date.now(),
            influenceLineage: [],
            creativeCycles: [],
            motifEvolution: [],
            status: "approved",
            approvedAt: Date.now(),
            publishedAt: Date.now(),
          },
        },
      }),
      showcase,
    );
    expect(published?.fullPagePath).toBe("/u/atelier/signature");
  });

  it("detects published rip snapshots", () => {
    const rip: PublicRipSnapshot = {
      handle: "atelier",
      title: "Shadow shelf",
      shadowThesis: "You avoid ornament until it becomes absence.",
      antiMotifs: ["chrome"],
      thingsToAvoid: [],
      blindSpots: [],
      oppositePalette: ["#111"],
      oppositeSilhouette: "wide",
      oppositeRegister: "cold",
      inversions: [],
      sourceRipId: "rip-1",
      accentHex: "#5c1a2e",
      updatedAt: Date.now(),
    };

    expect(hasPublishedRip(rip)).toBe(true);
    expect(hasPublishedRip(null)).toBe(false);
  });

  it("filters external links to public http(s) urls", () => {
    const links = getPublicExternalLinks({
      externalLinks: [
        { title: "Portfolio", url: "https://example.com" },
        { title: "Bad", url: "javascript:alert(1)" },
        { title: "Link", url: "not-a-url" },
      ],
    } as any);

    expect(links).toHaveLength(1);
    expect(links[0]?.url).toBe("https://example.com");
    expect(formatPublicLinkLabel(links[0]!)).toBe("Portfolio");
  });
});
