import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "./firebaseInit";
import {
  ScryContextRun,
  ScryFinding,
  ScryOpenRequest,
  ScryOrigin,
  ScryProviderError,
  ScrySourceType,
  ScryWorkflowSession,
} from "../types";
import {
  deriveDeterministicTags,
  generateTagsForSavedArtifact,
} from "./taggingPolicyService";

const LOCAL_PREFIX = "mimi_scry_v1";

const createId = (prefix: string): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const localKey = (userId: string, bucket: string): string =>
  `${LOCAL_PREFIX}:${userId}:${bucket}`;

const readLocal = <T>(userId: string, bucket: string): T[] => {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(localKey(userId, bucket)) || "[]");
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const upsertLocal = <T extends { id: string }>(
  userId: string,
  bucket: string,
  value: T,
): void => {
  if (typeof window === "undefined") return;
  const current = readLocal<T>(userId, bucket);
  const next = [value, ...current.filter((item) => item.id !== value.id)].slice(
    0,
    250,
  );
  localStorage.setItem(localKey(userId, bucket), JSON.stringify(next));
};

const canSyncCloud = (userId: string): boolean =>
  Boolean(
    auth.currentUser?.uid === userId &&
      typeof navigator !== "undefined" &&
      navigator.onLine,
  );

const persistOwnedObject = async <T extends { id: string }>(
  userId: string,
  bucket: string,
  value: T,
): Promise<void> => {
  upsertLocal(userId, bucket, value);
  if (!canSyncCloud(userId)) return;
  try {
    const firestoreSafe = JSON.parse(JSON.stringify(value)) as T;
    await setDoc(
      doc(db, "users", userId, bucket, value.id),
      firestoreSafe,
      { merge: true },
    );
  } catch (error) {
    console.warn(`MIMI // ${bucket} cloud sync deferred.`, error);
  }
};

export interface StartScrySessionInput {
  userId: string;
  query: string;
  projectId?: string;
  origin?: ScryOrigin;
}

export const startScrySession = async (
  input: StartScrySessionInput,
): Promise<{ session: ScryWorkflowSession; contextRun: ScryContextRun }> => {
  const now = Date.now();
  const sessionId = createId("scry");
  const contextRunId = createId("context_run");
  const origin: ScryOrigin = input.origin ?? { type: "manual" };
  const session: ScryWorkflowSession = {
    id: sessionId,
    userId: input.userId,
    projectId: input.projectId,
    objectType: "workflow_session",
    workflowType: "scry",
    query: input.query.trim(),
    origin,
    status: "running",
    approvalState: "unreviewed",
    contextRunId,
    findingIds: [],
    selectedFindingIds: [],
    providerErrors: [],
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
  const contextRun: ScryContextRun = {
    id: contextRunId,
    userId: input.userId,
    sessionId,
    projectId: input.projectId,
    objectType: "context_run",
    taskIntent: "scry_research",
    query: input.query.trim(),
    scope: ["world", "zines", "pocket", "shadow_memory"],
    candidateFindingIds: [],
    selectedFindingIds: [],
    rejectedFindingIds: [],
    providerErrors: [],
    retrievalVersion: 1,
    startedAt: now,
  };
  await Promise.all([
    persistOwnedObject(input.userId, "scrySessions", session),
    persistOwnedObject(input.userId, "contextRuns", contextRun),
  ]);
  return { session, contextRun };
};

export interface NormalizeScryFindingInput {
  userId: string;
  sessionId: string;
  contextRunId: string;
  query: string;
  origin: ScryOrigin;
  projectId?: string;
  resultKind: "world" | "creator";
  sourceType: ScrySourceType;
  provider: string;
  raw: Record<string, unknown>;
}

const readString = (
  raw: Record<string, unknown>,
  keys: string[],
): string | undefined => {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
};

const safeDomain = (url?: string): string | undefined => {
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
};

export const normalizeScryFinding = (
  input: NormalizeScryFindingInput,
): ScryFinding => {
  const title =
    readString(input.raw, ["title", "name"]) ||
    readString(input.raw, ["content_preview", "snippet"]) ||
    "Untitled finding";
  const url = readString(input.raw, ["url", "uri", "link"]);
  const referencedObjectId = readString(input.raw, [
    "originalId",
    "id",
    "objectId",
  ]);
  const relevanceValue =
    typeof input.raw.similarity === "number"
      ? input.raw.similarity
      : typeof input.raw.relevanceScore === "number"
        ? input.raw.relevanceScore
        : undefined;
  const deterministicTags = deriveDeterministicTags({
    objectType: "scry_finding",
    sourceType: input.sourceType,
    resultKind: input.resultKind,
    originType: input.origin.type,
    projectId: input.projectId,
  });

  return {
    id: createId("finding"),
    userId: input.userId,
    sessionId: input.sessionId,
    contextRunId: input.contextRunId,
    projectId: input.projectId,
    resultKind: input.resultKind,
    sourceType: input.sourceType,
    title,
    snippet: readString(input.raw, [
      "snippet",
      "content_preview",
      "summary",
      "context",
    ]),
    url,
    sourceDomain: safeDomain(url),
    referencedObjectId,
    displayImage: readString(input.raw, [
      "display_image",
      "imageUrl",
      "coverImageUrl",
    ]),
    provider: input.provider,
    relevance: relevanceValue,
    tags: deterministicTags,
    tagSource: "deterministic",
    embeddingStatus:
      Array.isArray(input.raw.embedding_field) ||
      Array.isArray(input.raw.embedding)
        ? "available"
        : "not_requested",
    capturedAt: Date.now(),
    selectionState: "candidate",
    query: input.query,
    origin: input.origin,
  };
};

export interface CompleteScrySessionInput {
  session: ScryWorkflowSession;
  contextRun: ScryContextRun;
  findings: ScryFinding[];
  scribeReading?: string;
  providerErrors: ScryProviderError[];
}

export const completeScrySession = async (
  input: CompleteScrySessionInput,
): Promise<{ session: ScryWorkflowSession; contextRun: ScryContextRun }> => {
  const completedAt = Date.now();
  const successfulProviders = new Set(
    input.findings.map((finding) => finding.provider),
  );
  const status: ScryWorkflowSession["status"] =
    input.findings.length === 0
      ? "failed"
      : input.providerErrors.length > 0
        ? "partial"
        : "complete";
  const session: ScryWorkflowSession = {
    ...input.session,
    status,
    findingIds: input.findings.map((finding) => finding.id),
    scribeReading: input.scribeReading,
    providerErrors: input.providerErrors,
    updatedAt: completedAt,
    completedAt,
    version: input.session.version + 1,
  };
  const contextRun: ScryContextRun = {
    ...input.contextRun,
    candidateFindingIds: input.findings.map((finding) => finding.id),
    providerErrors: input.providerErrors,
    completedAt,
    retrievalVersion: input.contextRun.retrievalVersion + 1,
  };

  await Promise.all([
    persistOwnedObject(session.userId, "scrySessions", session),
    persistOwnedObject(session.userId, "contextRuns", contextRun),
    ...input.findings.map((finding) =>
      persistOwnedObject(session.userId, "scryFindings", finding),
    ),
  ]);

  if (successfulProviders.size === 0 && input.providerErrors.length === 0) {
    console.warn("MIMI // Scry completed without provider evidence.");
  }
  return { session, contextRun };
};

const persistSelectionIndexes = async (
  finding: ScryFinding,
): Promise<void> => {
  const session = readLocal<ScryWorkflowSession>(
    finding.userId,
    "scrySessions",
  ).find((candidate) => candidate.id === finding.sessionId);
  const contextRun = readLocal<ScryContextRun>(
    finding.userId,
    "contextRuns",
  ).find((candidate) => candidate.id === finding.contextRunId);
  const selected =
    finding.selectionState === "saved"
      ? [finding.id]
      : [];
  const rejected =
    finding.selectionState === "rejected"
      ? [finding.id]
      : [];

  await Promise.all([
    session
      ? persistOwnedObject(finding.userId, "scrySessions", {
          ...session,
          selectedFindingIds: Array.from(
            new Set([
              ...(session.selectedFindingIds ?? []).filter(
                (id) => id !== finding.id,
              ),
              ...selected,
            ]),
          ),
          updatedAt: Date.now(),
          version: session.version + 1,
        })
      : Promise.resolve(),
    contextRun
      ? persistOwnedObject(finding.userId, "contextRuns", {
          ...contextRun,
          selectedFindingIds: Array.from(
            new Set([
              ...(contextRun.selectedFindingIds ?? []).filter(
                (id) => id !== finding.id,
              ),
              ...selected,
            ]),
          ),
          rejectedFindingIds: Array.from(
            new Set([
              ...(contextRun.rejectedFindingIds ?? []).filter(
                (id) => id !== finding.id,
              ),
              ...rejected,
            ]),
          ),
          retrievalVersion: contextRun.retrievalVersion + 1,
        })
      : Promise.resolve(),
  ]);
};

export const saveScryFinding = async (
  finding: ScryFinding,
): Promise<ScryFinding> => {
  const tagged = await generateTagsForSavedArtifact(
    [finding.title, finding.snippet, finding.url].filter(Boolean).join("\n"),
    finding.tags,
  );
  const saved: ScryFinding = {
    ...finding,
    selectionState: "saved",
    tags: tagged.tags,
    tagSource: tagged.tagSource,
  };
  await persistOwnedObject(saved.userId, "scryFindings", saved);
  await persistSelectionIndexes(saved);

  const { recordProvenanceOrigin } = await import("../lib/provenance");
  await recordProvenanceOrigin(saved.userId, {
    artifactId: saved.id,
    originChamber: "scry",
    originMetadata: {
      query: saved.query,
      provider: saved.provider,
      sourceType: saved.sourceType,
      sourceUrl: saved.url ?? null,
      sessionId: saved.sessionId,
      contextRunId: saved.contextRunId,
      originatingArtifactId: saved.origin.artifactId ?? null,
    },
    creatorTags: saved.tags,
  });

  const { archiveManager } = await import("./archiveManager");
  await archiveManager.saveToPocket(
    saved.userId,
    saved.url ? "link" : "text",
    {
      title: saved.title,
      text: saved.snippet,
      url: saved.url,
      source: "scry",
      tags: saved.tags,
      scryFindingId: saved.id,
      scrySessionId: saved.sessionId,
      contextRunId: saved.contextRunId,
      query: saved.query,
      origin: saved.origin,
      provider: saved.provider,
      embeddingPolicy: "not_requested",
      provenanceArtifactId: saved.id,
      provenanceFrom: "scry",
    },
  );
  return saved;
};

export const updateScrySelection = async (
  finding: ScryFinding,
  selectionState: ScryFinding["selectionState"],
): Promise<ScryFinding> => {
  const updated = { ...finding, selectionState };
  await persistOwnedObject(updated.userId, "scryFindings", updated);
  await persistSelectionIndexes(updated);
  return updated;
};

export const approveScrySession = async (
  session: ScryWorkflowSession,
): Promise<ScryWorkflowSession> => {
  const now = Date.now();
  const approved: ScryWorkflowSession = {
    ...session,
    approvalState: "approved",
    approvedAt: now,
    updatedAt: now,
    version: session.version + 1,
  };
  await persistOwnedObject(approved.userId, "scrySessions", approved);
  return approved;
};

export const listScrySessions = async (
  userId: string,
  maxResults = 20,
): Promise<ScryWorkflowSession[]> => {
  const normalizeSession = (
    session: ScryWorkflowSession,
  ): ScryWorkflowSession => ({
    ...session,
    origin: session.origin ?? { type: "manual", label: "Legacy search" },
    approvalState: session.approvalState ?? "unreviewed",
    findingIds: session.findingIds ?? [],
    selectedFindingIds: session.selectedFindingIds ?? [],
    providerErrors: session.providerErrors ?? [],
  });
  const local = readLocal<ScryWorkflowSession>(
    userId,
    "scrySessions",
  ).map(normalizeSession);
  if (!canSyncCloud(userId)) return local.slice(0, maxResults);
  try {
    const snapshot = await getDocs(
      query(
        collection(db, "users", userId, "scrySessions"),
        orderBy("createdAt", "desc"),
        limit(maxResults),
      ),
    );
    const cloud = snapshot.docs.map((entry) =>
      normalizeSession(entry.data() as ScryWorkflowSession),
    );
    const merged = new Map<string, ScryWorkflowSession>();
    [...cloud, ...local].forEach((session) => merged.set(session.id, session));
    return [...merged.values()]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, maxResults);
  } catch (error) {
    console.warn("MIMI // Scry history cloud read deferred.", error);
    return local.slice(0, maxResults);
  }
};

export const requestFromLegacyPayload = (
  payload: unknown,
): ScryOpenRequest | null => {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const query =
    typeof record.query === "string"
      ? record.query
      : typeof record.signal === "string"
        ? record.signal
        : "";
  if (!query.trim()) return null;
  return {
    requestId: createId("scry_request"),
    query: query.trim(),
    autoRun: record.autoRun !== false,
    projectId:
      typeof record.projectId === "string" ? record.projectId : undefined,
    origin: {
      type:
        record.originType === "zine" ||
        record.originType === "pocket" ||
        record.originType === "semiotic_signal"
          ? record.originType
          : "semiotic_signal",
      artifactId:
        typeof record.artifactId === "string" ? record.artifactId : undefined,
      signalId:
        typeof record.signalId === "string" ? record.signalId : undefined,
      label: typeof record.label === "string" ? record.label : undefined,
    },
  };
};
