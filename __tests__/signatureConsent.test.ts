import { describe, expect, it } from "vitest";
import type { AestheticSignature } from "../types";
import {
  hasPublishedPublicSignature,
  isSignatureMemoryApproved,
  isSignaturePublished,
} from "../lib/signature/signatureConsent";

const baseSignature = (): AestheticSignature => ({
  primaryAxis: "Archival restraint",
  secondaryAxis: "Warm geometry",
  motifs: ["parchment"],
  moodCluster: "Quiet",
  generatedAt: Date.now(),
  influenceLineage: [],
  creativeCycles: [],
  motifEvolution: [],
});

describe("signatureConsent", () => {
  it("treats approved without publishedAt as private memory only", () => {
    const sig = {
      ...baseSignature(),
      status: "approved" as const,
      approvedAt: Date.now(),
    };
    expect(isSignatureMemoryApproved(sig)).toBe(true);
    expect(isSignaturePublished(sig)).toBe(false);
  });

  it("requires explicit publishedAt for public signature routes", () => {
    const sig = {
      ...baseSignature(),
      status: "approved" as const,
      approvedAt: Date.now(),
      publishedAt: Date.now(),
    };
    expect(isSignaturePublished(sig)).toBe(true);
    expect(
      hasPublishedPublicSignature({
        uid: "u1",
        handle: "atelier",
        currentSeason: "blooming",
        createdAt: Date.now(),
        tasteProfile: {
          semantic_signature: "hidden",
          archetype_weights: {},
          color_frequency: {},
          aestheticSignature: sig,
        },
      }),
    ).toBe(true);
  });
});
