/**
 * Scry → Research Context → Build Brief verification.
 * Uses the real local persistence and context services without network calls.
 */

const storage = new Map<string, string>();

Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
});
Object.defineProperty(globalThis, "navigator", {
  value: { onLine: false },
});
Object.defineProperty(globalThis, "window", {
  value: {
    dispatchEvent: () => true,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  },
});
Object.defineProperty(globalThis, "CustomEvent", {
  value: class {
    type: string;
    detail?: unknown;
    constructor(type: string, options?: { detail?: unknown }) {
      this.type = type;
      this.detail = options?.detail;
    }
  },
});

const assert: (condition: unknown, message: string) => asserts condition = (
  condition,
  message,
) => {
  if (!condition) throw new Error(message);
};

const {
  approveScrySession,
  completeScrySession,
  listScrySessions,
  normalizeScryFinding,
  requestFromLegacyPayload,
  startScrySession,
  updateScrySelection,
} = await import("../services/scrySessionService");
const {
  approveResearchContext,
  createResearchContext,
} = await import("../services/researchContextService");
const { getApprovedUsedContext } = await import(
  "../services/usedContextService"
);

const userId = "ghost";
const origin = {
  type: "semiotic_signal" as const,
  artifactId: "zine_lover_girl",
  signalId: "signal_soft_armor",
  label: "Semiotic touchpoint",
};

const { session, contextRun } = await startScrySession({
  userId,
  query: "soft armor and romantic recurrence",
  origin,
});

const worldFinding = normalizeScryFinding({
  userId,
  sessionId: session.id,
  contextRunId: contextRun.id,
  query: session.query,
  origin,
  resultKind: "world",
  sourceType: "web",
  provider: "verification_world",
  raw: {
    title: "Ritual dress and protective silhouettes",
    snippet: "A current outside-world source.",
    url: "https://example.com/ritual-dress",
  },
});
const creatorFinding = normalizeScryFinding({
  userId,
  sessionId: session.id,
  contextRunId: contextRun.id,
  query: session.query,
  origin,
  resultKind: "creator",
  sourceType: "zine",
  provider: "verification_archive",
  raw: {
    id: "zine_broken_bride",
    type: "zine",
    title: "The Broken Bride",
    snippet: "A prior editorial about romance as protective theater.",
  },
});
const savedFindings = [
  { ...worldFinding, selectionState: "saved" as const },
  { ...creatorFinding, selectionState: "saved" as const },
];

const completed = await completeScrySession({
  session,
  contextRun,
  findings: savedFindings,
  scribeReading: "World evidence and creator history remain distinct.",
  providerErrors: [],
});
await Promise.all(
  savedFindings.map((finding) => updateScrySelection(finding, "saved")),
);
assert(completed.session.status === "complete", "Session should complete.");
assert(
  completed.session.origin.artifactId === origin.artifactId,
  "Touchpoint provenance should survive the search.",
);
assert(
  worldFinding.embeddingStatus === "not_requested",
  "A normalized world finding should not request an embedding.",
);
assert(
  worldFinding.tags.includes("web") && creatorFinding.tags.includes("zine"),
  "Deterministic source tags should make each lane explainable.",
);

const restoredHistory = await listScrySessions(userId);
assert(restoredHistory.length === 1, "Saved query should restore from history.");
assert(
  restoredHistory[0].query === session.query,
  "Restored history should preserve the query.",
);
assert(
  restoredHistory[0].selectedFindingIds.length === 2,
  "Saved finding IDs should persist on the workflow session.",
);

const draft = await createResearchContext({
  userId,
  session: completed.session,
  findings: savedFindings,
  target: "build-brief",
});
assert(draft.approvalState === "draft", "Context must start as a draft.");
assert(
  draft.selectedFindingIds.length === 2,
  "Context should retain both selected evidence IDs.",
);
assert(
  draft.summary?.includes("[World source]") &&
    draft.summary.includes("[Creator history]"),
  "Context should visibly separate world and creator evidence.",
);

const approved = await approveResearchContext(draft, savedFindings);
assert(
  approved.approvalState === "approved",
  "Creator approval should be explicit.",
);
const approvedSession = await approveScrySession(completed.session);
assert(
  approvedSession.approvalState === "approved",
  "The source Scry Session should record downstream approval.",
);

const buildBriefContext = getApprovedUsedContext("build-brief");
assert(
  buildBriefContext.length === 1,
  "Approved context should become a Build Brief input.",
);
assert(
  buildBriefContext[0].objectType === "context_packet",
  "Build Brief input should reference the context packet, not masquerade as a memory atom.",
);
assert(
  buildBriefContext[0].content.includes("[World source]") &&
    buildBriefContext[0].content.includes("[Creator history]"),
  "Build Brief evidence should preserve lane labels.",
);

const request = requestFromLegacyPayload({
  signal: "will i be a lover girl again?",
  autoRun: true,
  originType: "semiotic_signal",
  artifactId: "zine_lover_girl",
});
assert(request?.autoRun === true, "Touchpoint should request an automatic Scry.");
assert(
  request?.origin.artifactId === "zine_lover_girl",
  "Navigation request should retain its originating zine.",
);

console.log("Scry context flow verification: PASS");
console.log("  Semiotic touchpoint provenance survives navigation and persistence");
console.log("  World and creator evidence remain distinct");
console.log("  Findings receive deterministic tags without embedding requests");
console.log("  Search history restores the durable query");
console.log("  Creator approval exposes a Context Packet to Build Brief");
process.exit(0);
