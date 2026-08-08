import { auth } from "../firebaseInit";
import type { EvidenceAtom, TasteScope } from "../../types";

export type EvidenceAtomSearchHit = {
  atom: EvidenceAtom;
  score: number;
};

/**
 * Client wrapper for POST /api/mimi/evidence/search (semantic retrieval).
 */
export async function searchEvidenceAtomsClient(
  query: string,
  options: {
    context?: TasteScope;
    projectId?: string;
    maxResults?: number;
  } = {},
): Promise<EvidenceAtomSearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const user = auth.currentUser;
  if (!user) return [];

  const token = await user.getIdToken();
  const response = await fetch("/api/mimi/evidence/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-token": `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: trimmed,
      context: options.context,
      projectId: options.projectId,
      maxResults: options.maxResults,
    }),
  });

  if (!response.ok) return [];

  const payload = (await response.json()) as { results?: EvidenceAtomSearchHit[] };
  return payload.results ?? [];
}
