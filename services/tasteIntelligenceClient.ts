/**
 * Authenticated API client for Taste Intelligence OS v2.
 * React must use this — never Neon directly.
 */
import type {
  CalibrationChoice,
  TasteCalibrationPair,
  TasteCalibrationSession,
  TasteRefusal,
  SavedReasonHypothesis,
} from "../schemas/tasteIntelligenceContracts.js";
import type { TasteModelSnapshot } from "../lib/tasteModel/contracts.js";

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
