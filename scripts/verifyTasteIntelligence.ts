/**
 * Contract checks for Taste Intelligence Phase 1.
 * Run: npm run verify:taste-intelligence
 */
import {
  capAssertionConfidence,
  INFERRED_ASSERTION_CONFIDENCE_CEILING,
  partitionAssertions,
  scoreAssertion,
} from "../lib/taste/tasteStateLogic";
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
import { buildEvidenceAtomFromInput } from "../lib/taste/buildEvidenceAtom";
import { createEvidenceAtomSchema } from "../lib/taste/evidenceAtomSchema";
import { atomReactionToCorrection } from "../lib/taste/correctionLogic";
import type { EvidenceNode, TasteAssertion } from "../types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function makeAssertion(
  partial: Partial<TasteAssertion> & Pick<TasteAssertion, "conceptA" | "relation" | "confidence" | "claimType">,
): TasteAssertion {
  const now = Date.now();
  return {
    id: partial.id ?? "a1",
    userId: partial.userId ?? "u1",
    conceptA: partial.conceptA,
    relation: partial.relation,
    conceptB: partial.conceptB,
    context: partial.context,
    claimType: partial.claimType,
    confidence: partial.confidence,
    userCorrection: partial.userCorrection,
    evidenceAtomIds: partial.evidenceAtomIds ?? [],
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
}

// ─── Confidence ceiling ───────────────────────────────────────────────────────

assert(
  capAssertionConfidence("inferred", 0.95) === INFERRED_ASSERTION_CONFIDENCE_CEILING,
  "inferred assertions must cap at 0.7",
);
assert(
  capAssertionConfidence("user_confirmed", 0.95) === 0.95,
  "user_confirmed assertions may reach submitted confidence",
);

// ─── Partitioning ─────────────────────────────────────────────────────────────

const partitioned = partitionAssertions([
  makeAssertion({
    conceptA: "theatrical-restraint",
    relation: "LIKES",
    confidence: 0.9,
    claimType: "user_confirmed",
  }),
  makeAssertion({
    conceptA: "generic-saas",
    relation: "DISLIKES",
    confidence: 0.8,
    claimType: "user_confirmed",
  }),
  makeAssertion({
    conceptA: "archival-melancholy",
    relation: "LIKES",
    confidence: 0.45,
    claimType: "inferred",
  }),
]);

assert(partitioned.stablePreferences.length === 1, "high-confidence likes land in stable");
assert(partitioned.negativePreferences.length === 1, "dislikes land in negative");
assert(partitioned.emergingPreferences.length === 1, "mid-confidence likes land in emerging");

assert(scoreAssertion(partitioned.stablePreferences[0]!, "editorial") > 0, "scoreAssertion returns positive weight");

// ─── Evidence atom builder ────────────────────────────────────────────────────

const parsed = createEvidenceAtomSchema.parse({
  kind: "url",
  sourceType: "website",
  originalSource: "https://example.com",
  ingestSource: "tailor",
});
const atom = buildEvidenceAtomFromInput("u1", parsed, { id: "atom-1", now: 1_700_000_000_000 });
assert(atom.processingState === "pending", "new atoms start pending");
assert(atom.originalSource === "https://example.com", "originalSource preserved");
assert(atom.userReaction === "suggested", "reaction starts suggested");

// ─── Tailor bridge ────────────────────────────────────────────────────────────

const node: EvidenceNode = {
  id: "ev-1",
  userId: "u1",
  projectId: "p1",
  sourceType: "image",
  title: "Reference plate",
  sourceUrl: "https://cdn.example.com/ref.jpg",
  thumbnailUrl: "https://cdn.example.com/ref-thumb.jpg",
  analysisStatus: "pending",
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
const bridged = evidenceNodeToAtomInput(node, "p1");
assert(bridged.ingestSource === "tailor", "tailor nodes mirror with tailor ingestSource");
assert(bridged.kind === "image", "image nodes map to image kind");
assert(
  (bridged.sourceMetadata as { tailorEvidenceNodeId?: string }).tailorEvidenceNodeId === "ev-1",
  "bridge stores tailor node id in metadata",
);

// ─── Reaction mapping ─────────────────────────────────────────────────────────

assert(atomReactionToCorrection("accepted") === "YES", "accepted maps to YES chip");
assert(atomReactionToCorrection("rejected") === "NOT_ME", "rejected maps to NOT_ME chip");
assert(atomReactionToCorrection("suggested") === undefined, "suggested has no chip selection");

// ─── Pocket bridge ────────────────────────────────────────────────────────────

const pocketBridged = pocketItemToAtomInput({
  id: "item_x",
  userId: "u1",
  title: "",
  source: "",
  timestamp: Date.now(),
  type: "text",
  savedAt: Date.now(),
  content: { text: "Sparse editorial note" },
  tags: ["note"],
});
assert(pocketBridged.ingestSource === "pocket", "pocket items mirror with pocket ingestSource");
assert(
  (pocketBridged.sourceMetadata as { pocketItemId?: string }).pocketItemId === "item_x",
  "bridge stores pocket item id in metadata",
);

// ─── Embedding ref ────────────────────────────────────────────────────────────

assert(
  evidenceAtomEmbeddingRef("u1", "atom-1") === "users/u1/evidenceAtomEmbeddings/atom-1",
  "embedding ref is a stable users-scoped path",
);

// ─── Semantic ranking ─────────────────────────────────────────────────────────

const rankAtoms = [
  {
    id: "atom-a",
    userId: "u1",
    kind: "image" as const,
    sourceType: "image" as const,
    originalSource: "a",
    sourceMetadata: {},
    observationIds: [] as string[],
    embeddingRef: "users/u1/evidenceAtomEmbeddings/atom-a",
    ingestSource: "tailor" as const,
    tasteImpact: true,
    userReaction: "suggested" as const,
    confidence: 0.5,
    stabilityClass: "project" as const,
    processingState: "analyzed" as const,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "atom-b",
    userId: "u1",
    kind: "url" as const,
    sourceType: "website" as const,
    originalSource: "b",
    sourceMetadata: {},
    observationIds: [] as string[],
    embeddingRef: "users/u1/evidenceAtomEmbeddings/atom-b",
    ingestSource: "pocket" as const,
    tasteImpact: true,
    userReaction: "suggested" as const,
    confidence: 0.5,
    stabilityClass: "recurring" as const,
    processingState: "analyzed" as const,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];
const ranked = rankEvidenceAtomsByEmbedding(
  [1, 0],
  rankAtoms,
  new Map([
    ["atom-a", [1, 0]],
    ["atom-b", [0, 1]],
  ]),
  { minScore: MIN_EVIDENCE_SEMANTIC_SCORE, maxResults: 1 },
);
assert(ranked[0]?.atom.id === "atom-a", "semantic rank prefers nearest embedding");

// ─── Tailor node → atom map ───────────────────────────────────────────────────

const nodeMap = buildTailorNodeToAtomMap([
  {
    id: "atom-99",
    userId: "u1",
    projectId: "p1",
    kind: "image",
    sourceType: "image",
    originalSource: "ref",
    sourceMetadata: { tailorEvidenceNodeId: "ev-node-1" },
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
assert(atomIdsForEvidenceNodes(["ev-node-1", "missing"], nodeMap)[0] === "atom-99", "node map resolves atom ids");

console.log("verify:taste-intelligence — all checks passed");
