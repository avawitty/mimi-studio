import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebaseInit";
import {
  ResearchContextPacket,
  ScryFinding,
  ScryWorkflowSession,
} from "../types";
import { mergeTags } from "./taggingPolicyService";
import { addResearchContextToUsedContext } from "./usedContextService";
import {
  recordProvenanceOrigin,
  recordProvenanceTransfer,
} from "../lib/provenance";

const LOCAL_PREFIX = "mimi_research_context_v1";

const createId = (): string =>
  `research_context_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const localKey = (userId: string): string =>
  `${LOCAL_PREFIX}:${userId}:packets`;

const readLocal = (userId: string): ResearchContextPacket[] => {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(localKey(userId)) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persistPacket = async (
  packet: ResearchContextPacket,
): Promise<ResearchContextPacket> => {
  if (typeof window !== "undefined") {
    const current = readLocal(packet.userId);
    const next = [
      packet,
      ...current.filter((item) => item.id !== packet.id),
    ].slice(0, 100);
    localStorage.setItem(localKey(packet.userId), JSON.stringify(next));
  }

  if (
    auth.currentUser?.uid === packet.userId &&
    typeof navigator !== "undefined" &&
    navigator.onLine
  ) {
    try {
      await setDoc(
        doc(
          db,
          "users",
          packet.userId,
          "researchContexts",
          packet.id,
        ),
        JSON.parse(JSON.stringify(packet)),
        { merge: true },
      );
    } catch (error) {
      console.warn("MIMI // Research Context cloud sync deferred.", error);
    }
  }
  return packet;
};

const hashContext = (parts: string[]): string => {
  let hash = 2166136261;
  for (const char of parts.join("|")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a_${(hash >>> 0).toString(16).padStart(8, "0")}`;
};

const evidenceSummary = (findings: ScryFinding[]): string =>
  findings
    .map((finding) => {
      const source =
        finding.resultKind === "world" ? "World source" : "Creator history";
      const url = finding.url ? `\n${finding.url}` : "";
      return `[${source}] ${finding.title}\n${finding.snippet || ""}${url}`.trim();
    })
    .join("\n\n");

export interface CreateResearchContextInput {
  userId: string;
  session: ScryWorkflowSession;
  findings: ScryFinding[];
  title?: string;
  target?: ResearchContextPacket["target"];
}

export const createResearchContext = async (
  input: CreateResearchContextInput,
): Promise<ResearchContextPacket> => {
  const selected = input.findings.filter(
    (finding) => finding.selectionState === "saved",
  );
  if (selected.length === 0) {
    throw new Error("Save at least one finding before creating context.");
  }
  const now = Date.now();
  const packet: ResearchContextPacket = {
    id: createId(),
    userId: input.userId,
    projectId: input.session.projectId,
    objectType: "context_packet",
    title: input.title?.trim() || `Research: ${input.session.query}`,
    summary: evidenceSummary(selected),
    tags: mergeTags(
      ["research_context", "scry"],
      ...selected.map((finding) => finding.tags),
    ),
    taskIntent: "build_brief_research",
    sourceSessionIds: [input.session.id],
    sourceContextRunIds: [input.session.contextRunId],
    selectedFindingIds: selected.map((finding) => finding.id),
    selectedAtomIds: [],
    approvalState: "draft",
    target: input.target ?? "build-brief",
    integrityHash: hashContext([
      input.session.id,
      input.session.contextRunId,
      ...selected.map((finding) => finding.id),
    ]),
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
  await persistPacket(packet);
  await recordProvenanceOrigin(packet.userId, {
    artifactId: packet.id,
    originChamber: "research",
    originMetadata: {
      taskIntent: packet.taskIntent,
      sourceSessionIds: packet.sourceSessionIds,
      sourceContextRunIds: packet.sourceContextRunIds,
      selectedFindingIds: packet.selectedFindingIds,
      integrityHash: packet.integrityHash,
    },
    creatorTags: packet.tags,
  });
  return packet;
};

export const approveResearchContext = async (
  packet: ResearchContextPacket,
  findings: ScryFinding[],
): Promise<ResearchContextPacket> => {
  const now = Date.now();
  const approved: ResearchContextPacket = {
    ...packet,
    approvalState: "approved",
    approvedAt: now,
    updatedAt: now,
    version: packet.version + 1,
  };
  await persistPacket(approved);
  addResearchContextToUsedContext(approved, findings);
  await recordProvenanceTransfer(approved.userId, approved.id, {
    from: "research",
    to: approved.target,
    note: "Creator approved Scry findings for downstream use.",
  });
  return approved;
};

export const rejectResearchContext = async (
  packet: ResearchContextPacket,
): Promise<ResearchContextPacket> =>
  persistPacket({
    ...packet,
    approvalState: "rejected",
    updatedAt: Date.now(),
    version: packet.version + 1,
  });

export const listResearchContexts = (
  userId: string,
): ResearchContextPacket[] =>
  readLocal(userId).sort((a, b) => b.updatedAt - a.updatedAt);
