import { describe, expect, it } from "vitest";
import {
  buildPublicSignatureExcerpt,
  formatPublicLinkLabel,
  getPublicExternalLinks,
  hasPublishedPublicSignature,
  hasPublishedRip,
  resolvePublicProfileIdentity,
} from "../lib/publicProfileCard";
import { extractPublishedPublicSignature } from "../lib/signature/publicSignature";
import { buildPublicSignatureSnapshot } from "../lib/signature/publishSignature";
import type { AestheticSignature, PublicRipSnapshot, PublicShowcaseSnapshot, UserProfile } from "../types";

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

const approvedSignature = {
  primaryAxis: "Archival restraint",
  secondaryAxis: "Warm geometry",
  motifs: ["parchment", "olive"],
  moodCluster: "Quiet",
  generatedAt: Date.now(),
  influenceLineage: [] as AestheticSignature["influenceLineage"],
  creativeCycles: [] as AestheticSignature["creativeCycles"],
  motifEvolution: [] as AestheticSignature["motifEvolution"],
  status: "approved" as const,
  approvedAt: Date.now(),
};

describe("publicProfileCard helpers", () => {
  it("resolves identity from published showcase only", () => {
    const identity = resolvePublicProfileIdentity(
      baseProfile({
        displayName: "Atelier",
        bio: "Private editorial studio.",
        photoURL: "https://example.com/avatar.jpg",
      }),
      showcase,
    );

    expect(identity.handle).toBe("atelier");
    expect(identity.displayName).toBe("Studio Doll");
    expect(identity.bio).toBe("Quiet evidence over noise.");
    expect(identity.avatarUrl).toBe("https://example.com/doll.jpg");
    expect(identity.avatarIsDoll).toBe(true);
    expect(identity.dollLabel).toBe("Studio Doll");
  });

  it("never leaks OAuth photo or private bio without a published showcase", () => {
    const identity = resolvePublicProfileIdentity(
      baseProfile({
        displayName: "Atelier",
        bio: "Private editorial studio.",
        photoURL: "https://example.com/avatar.jpg",
      }),
      null,
    );

    expect(identity.avatarUrl).toBeUndefined();
    expect(identity.displayName).toBeUndefined();
    expect(identity.bio).toBeUndefined();
  });

  it("uses published signature snapshot for public excerpt", () => {
    const excerpt = buildPublicSignatureExcerpt(
      baseProfile({
        publicSignature: buildPublicSignatureSnapshot("atelier", approvedSignature),
        tasteProfile: {
          semantic_signature: "Private semantic line",
          archetype_weights: {},
          color_frequency: {},
          aestheticSignature: approvedSignature,
        },
      }),
      showcase,
    );

    expect(excerpt?.title).toBe("Archival restraint");
    expect(excerpt?.subtitle).toBe("Warm geometry");
    expect(excerpt?.motifs).toEqual(["parchment", "olive"]);
    expect(excerpt?.fullPagePath).toBe("/u/atelier/signature");
  });

  it("does not expose approved-but-unpublished signatures on public cards", () => {
    const excerpt = buildPublicSignatureExcerpt(
      baseProfile({
        tasteProfile: {
          semantic_signature: "Soft brutalism with archival warmth.",
          archetype_weights: {},
          color_frequency: {},
          aestheticSignature: approvedSignature,
        },
      }),
      showcase,
    );

    expect(excerpt?.title).toBe("Studio Doll");
    expect(excerpt?.semanticLine).toBe("Quiet evidence over noise.");
    expect(excerpt?.fullPagePath).toBeUndefined();
  });

  it("links to full signature page only when published", () => {
    const approvedOnly = buildPublicSignatureExcerpt(
      baseProfile({
        handle: "atelier",
        tasteProfile: {
          semantic_signature: "",
          archetype_weights: {},
          color_frequency: {},
          aestheticSignature: approvedSignature,
        },
      }),
      showcase,
    );
    expect(approvedOnly?.fullPagePath).toBeUndefined();

    const published = buildPublicSignatureExcerpt(
      baseProfile({
        handle: "atelier",
        publicSignature: buildPublicSignatureSnapshot("atelier", approvedSignature),
      }),
      showcase,
    );
    expect(published?.fullPagePath).toBe("/u/atelier/signature");
    expect(
      hasPublishedPublicSignature(
        baseProfile({
          publicSignature: buildPublicSignatureSnapshot("atelier", approvedSignature),
        }),
      ),
    ).toBe(true);
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

  it("does not leak private external links on public cards", () => {
    const links = getPublicExternalLinks({
      externalLinks: [{ title: "Portfolio", url: "https://example.com" }],
    } as UserProfile);

    expect(links).toHaveLength(0);
    expect(formatPublicLinkLabel({ title: "Portfolio", url: "https://example.com" })).toBe(
      "Portfolio",
    );
  });
});

describe("public signature publication boundary", () => {
  it("returns null for approved private signatures on public routes", () => {
    const profile = baseProfile({
      tasteProfile: {
        semantic_signature: "private",
        archetype_weights: {},
        color_frequency: {},
        aestheticSignature: approvedSignature,
      },
    });
    expect(extractPublishedPublicSignature(profile)).toBeNull();
  });

  it("returns published snapshot only when explicitly published", () => {
    const profile = baseProfile({
      publicSignature: buildPublicSignatureSnapshot("atelier", approvedSignature),
    });
    expect(extractPublishedPublicSignature(profile)?.primaryAxis).toBe("Archival restraint");
  });
});
