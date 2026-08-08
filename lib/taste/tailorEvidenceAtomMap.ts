import type { EvidenceAtom } from "../../types";

/** Map Tailor evidenceNodeId → canonical EvidenceAtom id (project-scoped mirror). */
export function buildTailorNodeToAtomMap(atoms: EvidenceAtom[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const atom of atoms) {
    const nodeId = (atom.sourceMetadata as { tailorEvidenceNodeId?: string })?.tailorEvidenceNodeId;
    if (nodeId) map.set(nodeId, atom.id);
  }
  return map;
}

/** Resolve mirrored atom ids for Tailor evidence node ids (deduped, stable order). */
export function atomIdsForEvidenceNodes(
  nodeIds: string[],
  nodeToAtom: Map<string, string>,
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const nodeId of nodeIds) {
    const atomId = nodeToAtom.get(nodeId);
    if (atomId && !seen.has(atomId)) {
      seen.add(atomId);
      ids.push(atomId);
    }
  }
  return ids;
}
