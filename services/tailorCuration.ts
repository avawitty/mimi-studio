import { stripUndefined } from '../lib/stripUndefined';
import type { ClaimType, UserCurationStatus, UserWeight } from '../types';

export type CurationEventKind =
  | 'status_change'
  | 'rename'
  | 'weight_change'
  | 'split'
  | 'merge';

export interface CurationEventPayload {
  id: string;
  userId: string;
  projectId: string;
  targetType: 'pattern_cluster' | 'creative_law' | 'observation';
  targetId: string;
  kind: CurationEventKind;
  status?: UserCurationStatus;
  previousStatus?: UserCurationStatus;
  claimType?: ClaimType;
  annotation?: string;
  weight?: UserWeight;
  renamedTo?: string;
  createdAt: number;
}

/**
 * Build a Firestore-safe curation event. Status-only events must persist
 * even when annotation/weight/rename fields are absent.
 */
export function buildCurationEventPayload(
  input: Omit<CurationEventPayload, 'id' | 'createdAt'> & {
    id?: string;
    createdAt?: number;
  },
): Record<string, unknown> {
  const payload: CurationEventPayload = {
    id: input.id ?? crypto.randomUUID(),
    userId: input.userId,
    projectId: input.projectId,
    targetType: input.targetType,
    targetId: input.targetId,
    kind: input.kind,
    status: input.status,
    previousStatus: input.previousStatus,
    claimType: input.claimType,
    annotation: input.annotation,
    weight: input.weight,
    renamedTo: input.renamedTo,
    createdAt: input.createdAt ?? Date.now(),
  };

  return stripUndefined(payload as unknown as Record<string, unknown>);
}

export function buildPatternClusterCurationPatch(
  action: UserCurationStatus,
  annotation?: string,
  weight?: UserWeight,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    userStatus: action,
    updatedAt: Date.now(),
  };
  if (annotation !== undefined && annotation !== '') {
    patch.userAnnotation = annotation;
  }
  if (weight !== undefined) {
    patch.userWeight = weight;
  }
  if (action === 'accepted') patch.claimType = 'user_confirmed';
  if (action === 'rejected') patch.claimType = 'user_rejected';
  if (action === 'renamed') patch.claimType = 'user_confirmed';

  return stripUndefined(patch);
}
