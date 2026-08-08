/**
 * Authenticated API client for Taste Intelligence OS v2.
 * React must use this — never Neon directly.
 */
import type {
  CalibrationChoice,
  TasteCalibrationPair,
  TasteCalibrationSession,
  TasteModelEdit,
  TasteModelEditOperation,
  TasteRefusal,
  TasteRefusalType,
  SavedReasonHypothesis,
  GenerationMedium,
  GenerationMode,
  TasteGenerationContract,
  TasteCritique,
} from "../schemas/tasteIntelligenceContracts.js";
import type { TasteModelSnapshot } from "../lib/tasteModel/contracts.js";
import type { TasteModelDelta } from "../lib/tasteIntelligence/computeModelDelta.js";
import type {
  GenerationContractReconciliation,
  TailorGenerationContractInput,
} from "../lib/tasteIntelligence/mergeGenerationContracts.js";

async function authHeaders(): Promise<HeadersInit> {
  const { auth } = await import("./firebaseInit");
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`/api/mimi/taste-intelligence${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers ?? {}) },
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(json?.error?.message ?? `Taste API failed (${res.status})`);
  }
  return json;
}

export interface CalibrationCandidateInput {
  id: string;
  label?: string;
  featureIds: string[];
  sourceIds?: string[];
}

export async function startCalibrationSession(input: {
  projectId?: string;
  workspaceId?: string;
  modelSnapshotId?: string;
  targetQuestionCount?: number;
  candidates: CalibrationCandidateInput[];
  idempotencyKey?: string;
}): Promise<{
  session: TasteCalibrationSession;
  pair: TasteCalibrationPair | null;
  left?: CalibrationCandidateInput;
  right?: CalibrationCandidateInput;
  modelSnapshotId?: string;
}> {
  return apiFetch("/calibration/start", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function submitCalibrationJudgment(input: {
  sessionId: string;
  pairId: string;
  choice: CalibrationChoice;
  decidingFeatureIds?: string[];
  correctionNote?: string;
  confidence?: number;
  contextScope?: "persistent" | "project" | "session";
  leftFeatureIds?: string[];
  rightFeatureIds?: string[];
  idempotencyKey?: string;
}): Promise<{
  judgment: unknown;
  calibrationDeltas: Record<string, unknown>;
  affectedFeatureIds: string[];
}> {
  return apiFetch("/calibration/judgment", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getActiveCalibrationSession(projectId?: string): Promise<{
  session: TasteCalibrationSession | null;
}> {
  const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
  return apiFetch(`/calibration/session${qs}`);
}

export async function getLatestTasteSnapshot(scope = "global"): Promise<{
  snapshot: TasteModelSnapshot | null;
}> {
  return apiFetch(`/snapshot/latest?scope=${encodeURIComponent(scope)}`);
}

export async function listTasteRefusals(projectId?: string): Promise<{
  refusals: TasteRefusal[];
}> {
  const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
  return apiFetch(`/refusals${qs}`);
}

export async function createTasteRefusal(input: {
  featureIds: string[];
  refusalType: TasteRefusalType;
  projectId?: string;
  scope?: "persistent" | "project" | "session";
  signedWeight?: number;
  confidence?: number;
  sourceIds?: string[];
  snapshot?: TasteModelSnapshot;
  idempotencyKey?: string;
}): Promise<{
  refusal: TasteRefusal;
  snapshot: TasteModelSnapshot | null;
  modelDelta: TasteModelDelta | null;
}> {
  return apiFetch("/refusals", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function submitTasteModelEdit(input: {
  operation: TasteModelEditOperation;
  targetIds: string[];
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  projectId?: string;
  rationale?: string;
  snapshot: TasteModelSnapshot;
  idempotencyKey?: string;
}): Promise<{
  edit: TasteModelEdit;
  snapshot: TasteModelSnapshot;
  modelDelta: TasteModelDelta;
}> {
  return apiFetch("/model-edits", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function undoTasteModelEdit(input: {
  editId: string;
  projectId?: string;
  snapshot: TasteModelSnapshot;
}): Promise<{
  edit: TasteModelEdit;
  snapshot: TasteModelSnapshot;
  modelDelta: TasteModelDelta;
}> {
  return apiFetch("/model-edits/undo", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function proposeSavedReasonHypotheses(input: {
  artifactId: string;
  tags?: string[];
  projectId?: string;
}): Promise<{
  hypotheses: SavedReasonHypothesis[];
  snapshotAvailable: boolean;
}> {
  return apiFetch("/saved-reason/propose", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listSavedReasonHypotheses(artifactId?: string): Promise<{
  hypotheses: SavedReasonHypothesis[];
}> {
  const qs = artifactId ? `?artifactId=${encodeURIComponent(artifactId)}` : "";
  return apiFetch(`/saved-reason${qs}`);
}

export async function reviewSavedReasonHypothesis(input: {
  hypothesis: SavedReasonHypothesis;
  action: "confirm" | "reject" | "edit" | "skip";
  editedText?: string;
}): Promise<{ hypothesis: SavedReasonHypothesis }> {
  return apiFetch("/saved-reason/review", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function persistTasteModelSnapshot(input: {
  snapshot: TasteModelSnapshot;
  projectId?: string;
  workspaceId?: string;
}): Promise<{ ok: true }> {
  return apiFetch("/snapshot/persist", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function compileTasteGenerationContract(input: {
  medium: GenerationMedium;
  mode: GenerationMode;
  projectId?: string;
  workspaceId?: string;
  modelSnapshotId?: string;
  persist?: boolean;
  tailorGenerationContract?: TailorGenerationContractInput;
}): Promise<{
  contract: TasteGenerationContract;
  reconciliation: GenerationContractReconciliation;
  snapshotId: string;
  promptBlock: string;
}> {
  return apiFetch("/compiler/compile", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function critiqueTasteCandidate(input: {
  contractId?: string;
  contract?: TasteGenerationContract;
  candidate: {
    id: string;
    featureIds?: string[];
    tags?: string[];
  };
  persist?: boolean;
  projectId?: string;
}): Promise<{
  critique: TasteCritique;
  extracted: {
    featureIds: string[];
    labels: string[];
    tags: string[];
    evidenceIds: string[];
  };
}> {
  return apiFetch("/critic/critique", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
