/**
 * Sentinel taste-aware agent memory policy engine (headless).
 * CaptiveSentinel.tsx remains the in-app browser guard only.
 */
import type {
  SentinelMemoryPolicy,
  TasteMemoryEpistemicState,
} from "../../schemas/tasteIntelligenceContracts.js";

export interface SentinelPolicyInput {
  ownerId: string;
  projectId?: string;
  targetObjectId: string;
  proposedState: TasteMemoryEpistemicState;
  evidenceIds: string[];
  scope: "persistent" | "project" | "session";
  expiresAt?: number;
}

const EXECUTABLE_STATES: TasteMemoryEpistemicState[] = [
  "confirmed",
  "executable",
];

export function canInfluenceGeneration(
  policy: SentinelMemoryPolicy | null,
): boolean {
  if (!policy) return false;
  if (policy.epistemicState === "withdrawn" || policy.epistemicState === "expired") {
    return false;
  }
  if (policy.expiresAt && policy.expiresAt < Date.now()) return false;
  return EXECUTABLE_STATES.includes(policy.epistemicState);
}

export function createSentinelPolicy(
  input: SentinelPolicyInput,
): SentinelMemoryPolicy {
  const now = Date.now();
  const allowedUses =
    input.proposedState === "executable" || input.proposedState === "confirmed"
      ? ["generation", "retrieval", "used_context"]
      : input.proposedState === "temporary"
        ? ["session_generation"]
        : [];
  const prohibitedUses =
    input.proposedState === "proposed" || input.proposedState === "inferred"
      ? ["generation", "persistent_memory"]
      : [];

  return {
    id: crypto.randomUUID(),
    ownerId: input.ownerId,
    projectId: input.projectId,
    targetObjectId: input.targetObjectId,
    epistemicState: input.proposedState,
    allowedUses,
    prohibitedUses,
    scope: input.scope,
    expiresAt: input.expiresAt,
    creatorApprovedAt:
      input.proposedState === "confirmed" || input.proposedState === "executable"
        ? now
        : undefined,
    evidenceIds: input.evidenceIds,
    createdAt: now,
    updatedAt: now,
  };
}

export function promotePolicy(
  policy: SentinelMemoryPolicy,
  nextState: TasteMemoryEpistemicState,
): SentinelMemoryPolicy {
  const now = Date.now();
  return {
    ...policy,
    epistemicState: nextState,
    creatorApprovedAt:
      nextState === "confirmed" || nextState === "executable"
        ? now
        : policy.creatorApprovedAt,
    updatedAt: now,
    allowedUses:
      nextState === "confirmed" || nextState === "executable"
        ? ["generation", "retrieval", "used_context"]
        : policy.allowedUses,
    prohibitedUses:
      nextState === "proposed" || nextState === "inferred"
        ? ["generation", "persistent_memory"]
        : [],
  };
}

export function withdrawPolicy(
  policy: SentinelMemoryPolicy,
): SentinelMemoryPolicy {
  return {
    ...policy,
    epistemicState: "withdrawn",
    allowedUses: [],
    prohibitedUses: ["generation", "retrieval", "persistent_memory"],
    updatedAt: Date.now(),
  };
}

export function filterExecutablePolicies(
  policies: SentinelMemoryPolicy[],
  scope: "persistent" | "project" | "session",
  projectId?: string,
): SentinelMemoryPolicy[] {
  const now = Date.now();
  return policies.filter((p) => {
    if (!canInfluenceGeneration(p)) return false;
    if (p.scope === "project" && scope !== "project") return false;
    if (p.scope === "session" && scope !== "session") return false;
    if (p.scope === "project" && p.projectId !== projectId) return false;
    if (p.expiresAt && p.expiresAt < now) return false;
    return true;
  });
}
