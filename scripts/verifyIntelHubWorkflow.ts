import {
  buildCommerceQuery,
  buildIntelEvidence,
  createIntelProjectRun,
  createIntelProjectRunFromHandoff,
  normalizeIntelCatalogCandidate,
  readIntelHubPressHandoff,
  readIntelProjectRun,
  updateIntelProjectRun,
  writeIntelHubPressHandoff,
  writeIntelProjectRun,
  type IntelHubPressHandoff,
} from "../lib/intelHubWorkflow";

const assert: (condition: unknown, message: string) => asserts condition = (
  condition,
  message,
) => {
  if (!condition) throw new Error(message);
};

const strategy = {
  clientName: "Mimi Editions",
  tagline: "Restrained editorial objects with architectural silhouettes.",
  wedgeFocus: 88,
  editorialOrthodoxy: 76,
  dataSovereignty: true,
  thesis: {
    chapter: "CHAPTER I",
    title: "Quiet structure over trend noise",
    summary1: "The system privileges controlled form and durable material signals.",
    summary2: "References become approved creative rules before generation.",
    bullets: ["Neutral palette", "Architectural tailoring", "Natural fibers"],
  },
  wedge: {
    title: "Explainable commerce discovery",
    summary: "Use approved creative rules to find candidates without delegating taste to a catalog.",
  },
};

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
});
Object.defineProperty(globalThis, "window", {
  value: { dispatchEvent: () => true },
});

const evidence = buildIntelEvidence(strategy, "https://example.com/catalog");
assert(evidence.some((item) => item.kind === "evidence"), "Expected supplied evidence.");
assert(evidence.some((item) => item.kind === "inference"), "Expected Tailor inference.");
assert(
  evidence.every((item) => item.source && item.confidence >= 0.5),
  "Every review item should expose source and confidence.",
);

const approved = evidence.slice(0, 2).map((item) => ({
  atomId: item.id,
  title: item.title,
  content: item.content,
  source: item.source,
}));
const query = buildCommerceQuery(strategy, approved);
assert(query.includes("mimi"), "Commerce query should retain project identity.");
assert(query.split(/\s+/).length <= 10, "Commerce query should stay bounded.");

const candidate = normalizeIntelCatalogCandidate(
  {
    id: "gid://shopify/Product/1",
    title: "Architectural Linen Coat",
    vendor: "Example Atelier",
    priceRange: { minVariantPrice: { amount: "280.00" } },
    featuredImage: { url: "https://example.com/coat.jpg" },
  },
  0,
);
assert(candidate.title === "Architectural Linen Coat", "Candidate title should normalize.");
assert(candidate.price === "280.00", "Nested price should normalize.");

const handoff: IntelHubPressHandoff = {
  version: 1,
  id: "intel-pack-test",
  clientName: strategy.clientName,
  sourceUrl: "https://example.com/catalog",
  thesis: strategy.thesis.title,
  approvedContext: approved,
  commerceQuery: query,
  selectedCandidate: candidate,
  compiledAt: Date.now(),
  status: "review_required",
};
writeIntelHubPressHandoff(handoff);
const restored = readIntelHubPressHandoff();
assert(restored?.id === handoff.id, "Press handoff should round-trip through storage.");
assert(restored?.status === "review_required", "Press handoff must require human review.");
const restoredFromHandoff = createIntelProjectRunFromHandoff(handoff);
assert(
  restoredFromHandoff.stage === "press-review",
  "A legacy Press handoff should restore the cross-chamber project state.",
);

const initialRun = createIntelProjectRun(strategy.clientName, evidence.length, 100);
assert(initialRun.stage === "review", "A run with evidence should begin in review.");
const approvedRun = updateIntelProjectRun(
  initialRun,
  {
    selectedReviewCount: 2,
    approvedContextCount: 2,
    reusableRuleCount: 1,
    commerceQuery: query,
  },
  200,
);
assert(approvedRun.stage === "used-context", "Approved evidence should advance to Used Context.");
const discoveryRun = updateIntelProjectRun(
  approvedRun,
  {
    catalogCandidateCount: 1,
    selectedCandidateId: candidate.id,
  },
  300,
);
assert(discoveryRun.stage === "discovery", "Catalog results should advance to discovery.");
const pressRun = updateIntelProjectRun(
  discoveryRun,
  {
    artifactPackId: handoff.id,
    pressStatus: "review_required",
  },
  400,
);
assert(pressRun.stage === "press-review", "A compiled pack should wait in Press review.");
writeIntelProjectRun(pressRun);
const restoredRun = readIntelProjectRun();
assert(restoredRun?.artifactPackId === handoff.id, "Project run should persist across chambers.");
assert(restoredRun?.reusableRuleCount === 1, "Project run should retain durable-rule state.");

console.log("Intel Hub orchestration verification: PASS");
console.log("  Evidence and inference remain separate");
console.log("  Project Run preserves cross-chamber state");
console.log("  Commerce query is derived from approved context");
console.log("  Catalog candidates normalize without becoming truth");
console.log("  Artifact pack reaches Press as review-required");
