import { describe, expect, it } from "vitest";
import {
  buildPublicSignatureExcerpt,
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
  updatedAt: Date.now(),
};

describe("publicProfileCard helpers", () => {
  it("resolves identity with avatar, display name, and bio", () => {
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
    expect(identity.avatarUrl).toBe("https://example.com/avatar.jpg");
  });

  it("prefers aesthetic signature for public excerpt", () => {
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
          },
        },
      }),
      showcase,
    );

    expect(excerpt?.title).toBe("Archival restraint");
    expect(excerpt?.subtitle).toBe("Warm geometry");
    expect(excerpt?.motifs).toEqual(["parchment", "olive"]);
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
});
