import type { MemoryAtom } from "../../types";
import type { CreateEvidenceAtomInput } from "./evidenceAtomSchema";

/** Deterministic EvidenceAtom document id for a Scribe memory atom. */
export function scribeEvidenceAtomId(memoryAtomId: string): string {
  return `scribe_${memoryAtomId}`;
}

/**
 * Mirror a Scribe MemoryAtom into the canonical EvidenceAtom shape.
 */
export function memoryAtomToAtomInput(atom: MemoryAtom): CreateEvidenceAtomInput {
  const title = atom.title?.trim();
  const original =
    atom.content.trim().length > 0
      ? atom.content.trim().slice(0, 10_000)
      : title || "scribe memory capture";

  return {
    kind: "text",
    sourceType: "note",
    originalSource: original,
    projectId: atom.projectId,
    contextScope: "editorial",
    sourceMetadata: {
      scribeMemoryAtomId: atom.id,
      title: atom.title ?? null,
      signalType: atom.signalType ?? null,
      source: atom.source ?? null,
      ...(atom.tags?.length ? { tags: atom.tags } : {}),
      ...(atom.metadata ?? {}),
    },
    ingestSource: "scribe",
    tasteImpact: true,
    stabilityClass: "recurring",
  };
}
