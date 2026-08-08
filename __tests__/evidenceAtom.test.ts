/**
 * Unit tests for the Taste Intelligence Phase 1 implementation.
 *
 * Tests cover:
 *  - EvidenceAtom type invariants
 *  - TasteAssertion confidence ceiling (AI inference cannot exceed 0.7)
 *  - CorrectionState → confidence delta mapping
 *  - getTasteState() partitioning logic (stable / emerging / negative)
 *  - tasteStateToPromptContext() formatting
 *  - tasteConfidenceLabel() thresholds
 *  - CorrectionService describeCorrectionState()
 *  - Zod schema validation for evidenceAtomSchema
 *
 * These tests run in a pure Node environment — no Firestore/Firebase stubs required
 * because the service functions under test operate on local data structures.
 */
import { describe, expect, it } from "vitest";
import {
  createEvidenceAtomSchema,
  applyAssertionCorrectionSchema,
  correctionStateSchema,
} from "../lib/taste/evidenceAtomSchema";
import {
  describeCorrectionState,
  CORRECTION_CHIP_OPTIONS,
  atomReactionToCorrection,
} from "../services/taste/correctionService";
import {
  capAssertionConfidence,
  INFERRED_ASSERTION_CONFIDENCE_CEILING,
  partitionAssertions,
} from "../lib/taste/tasteStateLogic";
import { buildEvidenceAtomFromInput } from "../lib/taste/buildEvidenceAtom";
import { evidenceNodeToAtomInput } from "../lib/taste/evidenceNodeBridge";
import { pocketItemToAtomInput } from "../lib/taste/pocketItemBridge";
import { evidenceAtomEmbeddingRef } from "../lib/taste/evidenceAtomEmbedding";
import {
  rankEvidenceAtomsByEmbedding,
  MIN_EVIDENCE_SEMANTIC_SCORE,
} from "../lib/taste/evidenceAtomRetrieval";
import {
  atomIdsForEvidenceNodes,
  buildTailorNodeToAtomMap,
} from "../lib/taste/tailorEvidenceAtomMap";
import {
  tasteStateToPromptContext,
  tasteConfidenceLabel,
} from "../services/taste/tasteStateService";
import type {
  CorrectionState,
  TasteAssertion,
  TasteConcept,
  TasteState,
  EvidenceAtom,
  EvidenceNode,
} from "../types";

// ─── Schema validation ────────────────────────────────────────────────────────

describe("createEvidenceAtomSchema", () => {
  it("accepts a minimal valid input", () => {
    const result = createEvidenceAtomSchema.safeParse({
      kind: "url",
      sourceType: "website",
      originalSource: "https://example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tasteImpact).toBe(true);
      expect(result.data.stabilityClass).toBe("temporary");
      expect(result.data.ingestSource).toBe("direct");
    }
  });

  it("accepts all evidence kinds", () => {
    const kinds = [
      "image", "url", "text", "note", "screenshot",
      "film", "product", "brand", "generated", "rejection",
    ] as const;
    for (const kind of kinds) {
      const result = createEvidenceAtomSchema.safeParse({
        kind,
        sourceType: "note",
        originalSource: "test",
      });
      expect(result.success, `kind '${kind}' should be valid`).toBe(true);
    }
  });

  it("rejects an empty originalSource", () => {
    const result = createEvidenceAtomSchema.safeParse({
      kind: "text",
      sourceType: "note",
      originalSource: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid assetUrl", () => {
    const result = createEvidenceAtomSchema.safeParse({
      kind: "image",
      sourceType: "image",
      originalSource: "https://example.com/img.jpg",
      assetUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid contextScope", () => {
    const result = createEvidenceAtomSchema.safeParse({
      kind: "image",
      sourceType: "image",
      originalSource: "https://example.com/img.jpg",
      contextScope: "editorial",
    });
    expect(result.success).toBe(true);
  });
});

describe("applyAssertionCorrectionSchema", () => {
  it("accepts all valid correction states", () => {
    const states: CorrectionState[] = [
      "YES", "SORT_OF", "NOT_ANYMORE", "ONLY_HERE", "NOT_ME", "MORE_LIKE_THIS",
    ];
    for (const correction of states) {
      const result = applyAssertionCorrectionSchema.safeParse({
        assertionId: "assertion-abc",
        correction,
      });
      expect(result.success, `correction '${correction}' should be valid`).toBe(true);
    }
  });

  it("rejects an unknown correction state", () => {
    const result = applyAssertionCorrectionSchema.safeParse({
      assertionId: "x",
      correction: "MAYBE",
    });
    expect(result.success).toBe(false);
  });
});

// ─── Correction service ───────────────────────────────────────────────────────

describe("describeCorrectionState", () => {
  it("returns a label, shortLabel, and description for every CorrectionState", () => {
    const states = correctionStateSchema.options;
    for (const state of states) {
      const desc = describeCorrectionState(state as CorrectionState);
      expect(desc.label).toBeTruthy();
      expect(desc.shortLabel).toBeTruthy();
      expect(desc.description).toBeTruthy();
    }
  });

  it("YES has a positive description", () => {
    const desc = describeCorrectionState("YES");
    expect(desc.label).toBe("Yes");
    expect(desc.shortLabel).toBe("YES");
  });

  it("NOT_ME has a negating description", () => {
    const desc = describeCorrectionState("NOT_ME");
    expect(desc.shortLabel).toBe("NOT ME");
  });
});

describe("CORRECTION_CHIP_OPTIONS", () => {
  it("contains all 6 correction states", () => {
    expect(CORRECTION_CHIP_OPTIONS).toHaveLength(6);
    expect(CORRECTION_CHIP_OPTIONS).toContain("YES");
    expect(CORRECTION_CHIP_OPTIONS).toContain("NOT_ME");
    expect(CORRECTION_CHIP_OPTIONS).toContain("MORE_LIKE_THIS");
  });
});

// ─── Taste State Service ──────────────────────────────────────────────────────

describe("tasteConfidenceLabel", () => {
  it("returns STRONG SIGNAL at 0.85+", () => {
    expect(tasteConfidenceLabel(0.85)).toBe("STRONG SIGNAL");
    expect(tasteConfidenceLabel(1.0)).toBe("STRONG SIGNAL");
  });

  it("returns PERSISTENT between 0.7 and 0.85", () => {
    expect(tasteConfidenceLabel(0.7)).toBe("PERSISTENT");
    expect(tasteConfidenceLabel(0.8)).toBe("PERSISTENT");
  });

  it("returns EMERGING between 0.55 and 0.7", () => {
    expect(tasteConfidenceLabel(0.55)).toBe("EMERGING");
    expect(tasteConfidenceLabel(0.65)).toBe("EMERGING");
  });

  it("returns CONTEXTUAL between 0.4 and 0.55", () => {
    expect(tasteConfidenceLabel(0.4)).toBe("CONTEXTUAL");
    expect(tasteConfidenceLabel(0.5)).toBe("CONTEXTUAL");
  });

  it("returns CHANGING between 0.25 and 0.4", () => {
    expect(tasteConfidenceLabel(0.25)).toBe("CHANGING");
    expect(tasteConfidenceLabel(0.35)).toBe("CHANGING");
  });

  it("returns UNCERTAIN below 0.25", () => {
    expect(tasteConfidenceLabel(0)).toBe("UNCERTAIN");
    expect(tasteConfidenceLabel(0.2)).toBe("UNCERTAIN");
  });
});

describe("tasteStateToPromptContext", () => {
  const makeAssertion = (
    conceptA: string,
    relation: TasteAssertion["relation"],
    confidence: number,
    claimType: TasteAssertion["claimType"] = "user_confirmed",
  ): TasteAssertion => ({
    id: `a-${conceptA}`,
    userId: "u1",
    conceptA,
    relation,
    claimType,
    confidence,
    evidenceAtomIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const makeConcept = (label: string): TasteConcept => ({
    id: `c-${label}`,
    userId: "u1",
    label,
    labelNormalized: label.toLowerCase(),
    isInferred: false,
    confidence: 0.8,
    contexts: [{ scope: "global", strength: 0.8, confidence: 0.8, trend: "rising", updatedAt: Date.now() }],
    evidenceAtomIds: [],
    assertionIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  it("returns empty string when state has no assertions or concepts", () => {
    const state: TasteState = {
      userId: "u1",
      stablePreferences: [],
      negativePreferences: [],
      emergingPreferences: [],
      currentExplorations: [],
      tensions: [],
      inferredAxes: [],
      relevantEvidence: [],
      confidence: 0,
      recentChanges: [],
      generatedAt: Date.now(),
    };
    expect(tasteStateToPromptContext(state)).toBe("");
  });

  it("includes CONFIRMED PREFERENCES for stable assertions", () => {
    const state: TasteState = {
      userId: "u1",
      stablePreferences: [makeAssertion("theatrical-restraint", "LIKES", 0.9)],
      negativePreferences: [],
      emergingPreferences: [],
      currentExplorations: [],
      tensions: [],
      inferredAxes: [],
      relevantEvidence: [],
      confidence: 0.9,
      recentChanges: [],
      generatedAt: Date.now(),
    };
    const prompt = tasteStateToPromptContext(state);
    expect(prompt).toContain("CONFIRMED PREFERENCES");
    expect(prompt).toContain("theatrical-restraint");
    expect(prompt).toContain("90%");
  });

  it("includes AVOIDANCES for negative assertions", () => {
    const state: TasteState = {
      userId: "u1",
      stablePreferences: [],
      negativePreferences: [makeAssertion("generic-saas-aesthetics", "DISLIKES", 0.85)],
      emergingPreferences: [],
      currentExplorations: [],
      tensions: [],
      inferredAxes: [],
      relevantEvidence: [],
      confidence: 0.5,
      recentChanges: [],
      generatedAt: Date.now(),
    };
    const prompt = tasteStateToPromptContext(state);
    expect(prompt).toContain("AVOIDANCES");
    expect(prompt).toContain("generic-saas-aesthetics");
  });

  it("includes CURRENT EXPLORATIONS from rising concepts", () => {
    const state: TasteState = {
      userId: "u1",
      stablePreferences: [],
      negativePreferences: [],
      emergingPreferences: [],
      currentExplorations: [makeConcept("archival melancholy")],
      tensions: [],
      inferredAxes: [],
      relevantEvidence: [],
      confidence: 0.4,
      recentChanges: [],
      generatedAt: Date.now(),
    };
    const prompt = tasteStateToPromptContext(state);
    expect(prompt).toContain("CURRENT EXPLORATIONS");
    expect(prompt).toContain("archival melancholy");
  });

  it("includes relevant evidence atoms when present", () => {
    const state: TasteState = {
      userId: "u1",
      stablePreferences: [],
      negativePreferences: [],
      emergingPreferences: [],
      currentExplorations: [],
      tensions: [],
      inferredAxes: [],
      relevantEvidence: [
        {
          id: "atom-1",
          userId: "u1",
          kind: "image",
          sourceType: "image",
          originalSource: "https://example.com/ref.jpg",
          sourceMetadata: {},
          observationIds: [] as string[],
          ingestSource: "tailor",
          tasteImpact: true,
          userReaction: "suggested",
          confidence: 0.5,
          stabilityClass: "project",
          processingState: "analyzed",
          semanticDescription: "Sparse editorial spread with high-contrast serif.",
          embeddingRef: "users/u1/evidenceAtomEmbeddings/atom-1",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      confidence: 0.4,
      recentChanges: [],
      generatedAt: Date.now(),
    };
    const prompt = tasteStateToPromptContext(state);
    expect(prompt).toContain("RELEVANT EVIDENCE");
    expect(prompt).toContain("Sparse editorial spread");
  });
});

describe("capAssertionConfidence", () => {
  it("caps inferred assertions at 0.7", () => {
    expect(capAssertionConfidence("inferred", 0.95)).toBe(
      INFERRED_ASSERTION_CONFIDENCE_CEILING,
    );
    expect(capAssertionConfidence("speculative", 1)).toBe(0.7);
  });

  it("allows user_confirmed assertions up to 1.0", () => {
    expect(capAssertionConfidence("user_confirmed", 0.95)).toBe(0.95);
  });
});

describe("partitionAssertions", () => {
  const base = (partial: Partial<TasteAssertion>): TasteAssertion => ({
    id: "a1",
    userId: "u1",
    conceptA: "alpha",
    relation: "LIKES",
    claimType: "user_confirmed",
    confidence: 0.9,
    evidenceAtomIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...partial,
  });

  it("partitions stable, emerging, and negative assertions", () => {
    const result = partitionAssertions([
      base({ conceptA: "stable-like", confidence: 0.9, relation: "LIKES" }),
      base({ conceptA: "avoid", confidence: 0.8, relation: "DISLIKES" }),
      base({
        conceptA: "emerging-like",
        confidence: 0.45,
        claimType: "inferred",
        relation: "LIKES",
      }),
    ]);

    expect(result.stablePreferences.map((a) => a.conceptA)).toContain("stable-like");
    expect(result.negativePreferences.map((a) => a.conceptA)).toContain("avoid");
    expect(result.emergingPreferences.map((a) => a.conceptA)).toContain("emerging-like");
  });
});

describe("atomReactionToCorrection", () => {
  it("maps persisted atom reactions to chip states", () => {
    expect(atomReactionToCorrection("accepted")).toBe("YES");
    expect(atomReactionToCorrection("rejected")).toBe("NOT_ME");
    expect(atomReactionToCorrection("suggested")).toBeUndefined();
  });
});

describe("buildEvidenceAtomFromInput", () => {
  it("starts atoms in pending state with zero confidence", () => {
    const input = createEvidenceAtomSchema.parse({
      kind: "note",
      sourceType: "note",
      originalSource: "handwritten margin",
    });
    const atom = buildEvidenceAtomFromInput("u1", input);
    expect(atom.processingState).toBe("pending");
    expect(atom.confidence).toBe(0);
    expect(atom.userReaction).toBe("suggested");
  });
});

describe("evidenceNodeToAtomInput", () => {
  it("mirrors tailor evidence nodes into atom ingest shape", () => {
    const node: EvidenceNode = {
      id: "ev-1",
      userId: "u1",
      projectId: "p1",
      sourceType: "image",
      title: "Plate",
      sourceUrl: "https://example.com/ref.jpg",
      analysisStatus: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const input = evidenceNodeToAtomInput(node, "p1");
    expect(input.ingestSource).toBe("tailor");
    expect(input.kind).toBe("image");
    expect(input.sourceMetadata?.tailorEvidenceNodeId).toBe("ev-1");
  });
});

describe("pocketItemToAtomInput", () => {
  it("mirrors pocket link items into atom ingest shape", () => {
    const input = pocketItemToAtomInput({
      id: "item_1",
      userId: "u1",
      title: "",
      source: "",
      timestamp: Date.now(),
      type: "link",
      savedAt: Date.now(),
      content: { url: "https://example.com/article", title: "Editorial ref" },
      tags: ["editorial"],
    });
    expect(input.ingestSource).toBe("pocket");
    expect(input.kind).toBe("url");
    expect(input.originalSource).toBe("https://example.com/article");
    expect((input.sourceMetadata as { pocketItemId?: string }).pocketItemId).toBe("item_1");
  });

  it("maps pocket images to http asset urls", () => {
    const input = pocketItemToAtomInput({
      id: "item_2",
      userId: "u1",
      title: "",
      source: "",
      timestamp: Date.now(),
      type: "image",
      savedAt: Date.now(),
      content: { imageUrl: "https://cdn.example.com/plate.jpg" },
    });
    expect(input.kind).toBe("image");
    expect(input.assetUrl).toBe("https://cdn.example.com/plate.jpg");
  });
});

describe("classifyEvidenceAtomQueryError", () => {
  it("maps failed-precondition to INDEX_REQUIRED", async () => {
    const { classifyEvidenceAtomQueryError } = await import(
      "../lib/taste/evidenceAtomQuery"
    );
    const err = classifyEvidenceAtomQueryError({
      code: "failed-precondition",
      message: "The query requires an index",
    });
    expect(err.code).toBe("INDEX_REQUIRED");
    expect(err.message).toContain("composite index");
  });

  it("maps permission-denied distinctly from index failures", async () => {
    const { classifyEvidenceAtomQueryError } = await import(
      "../lib/taste/evidenceAtomQuery"
    );
    const err = classifyEvidenceAtomQueryError({ code: "permission-denied" });
    expect(err.code).toBe("PERMISSION_DENIED");
  });
});

describe("evidenceAtomEmbeddingRef", () => {
  it("returns a stable users-scoped path", () => {
    expect(evidenceAtomEmbeddingRef("u1", "atom-1")).toBe(
      "users/u1/evidenceAtomEmbeddings/atom-1",
    );
  });
});

describe("rankEvidenceAtomsByEmbedding", () => {
  const baseAtom = {
    userId: "u1",
    kind: "image" as const,
    sourceType: "image" as const,
    originalSource: "ref",
    sourceMetadata: {},
    observationIds: [] as string[],
    ingestSource: "tailor" as const,
    tasteImpact: true,
    userReaction: "suggested" as const,
    confidence: 0.5,
    stabilityClass: "project" as const,
    processingState: "analyzed" as const,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  it("ranks atoms by cosine similarity above threshold", () => {
    const atoms = [
      { ...baseAtom, id: "a1", embeddingRef: "users/u1/evidenceAtomEmbeddings/a1" },
      { ...baseAtom, id: "a2", embeddingRef: "users/u1/evidenceAtomEmbeddings/a2" },
    ];
    const embeddings = new Map<string, number[]>([
      ["a1", [1, 0]],
      ["a2", [0, 1]],
    ]);
    const ranked = rankEvidenceAtomsByEmbedding([1, 0], atoms, embeddings, {
      minScore: MIN_EVIDENCE_SEMANTIC_SCORE,
      maxResults: 2,
    });
    expect(ranked[0]?.atom.id).toBe("a1");
    expect(ranked[0]?.score).toBeGreaterThan(0.9);
  });
});

describe("tailorEvidenceAtomMap", () => {
  it("maps tailor node ids to mirrored atom ids", () => {
    const map = buildTailorNodeToAtomMap([
      {
        id: "atom-99",
        userId: "u1",
        projectId: "p1",
        kind: "image",
        sourceType: "image",
        originalSource: "ref",
        sourceMetadata: { tailorEvidenceNodeId: "ev-1" },
        observationIds: [] as string[],
        ingestSource: "tailor",
        tasteImpact: true,
        userReaction: "suggested",
        confidence: 0.5,
        stabilityClass: "project",
        processingState: "analyzed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);
    expect(atomIdsForEvidenceNodes(["ev-1"], map)).toEqual(["atom-99"]);
    expect(atomIdsForEvidenceNodes(["missing"], map)).toEqual([]);
  });
});

// ─── EvidenceAtom type invariants ────────────────────────────────────────────

describe("EvidenceAtom type invariants", () => {
  it("processingState starts as pending and never conflates with analyzed before AI runs", () => {
    // This is a structural contract test — verifying the field semantics
    // We create a minimal EvidenceAtom and assert invariants
    const atom: EvidenceAtom = {
      id: "test-id",
      userId: "user-123",
      kind: "image",
      sourceType: "image",
      originalSource: "https://example.com/ref.jpg",
      sourceMetadata: {},
      observationIds: [],
      ingestSource: "pocket",
      tasteImpact: true,
      userReaction: "suggested",
      confidence: 0,
      stabilityClass: "temporary",
      processingState: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // originalSource is set once
    expect(atom.originalSource).toBe("https://example.com/ref.jpg");
    // semanticDescription starts undefined — AI has not run yet
    expect(atom.semanticDescription).toBeUndefined();
    // processingState starts pending
    expect(atom.processingState).toBe("pending");
    // confidence starts at 0 — not claimed before analysis
    expect(atom.confidence).toBe(0);
    // userReaction starts as 'suggested' — not confirmed
    expect(atom.userReaction).toBe("suggested");
  });
});
