import {
  MemoryAtom,
  ResearchContextPacket,
  ScryFinding,
  UsedContextEntry,
  UsedContextTarget,
} from "../types";
import { mergeTags } from "./taggingPolicyService";

const STORAGE_KEY = "mimi_studio_used_context";
export const USED_CONTEXT_CHANGED = "mimi:used-context-changed";

function readStore(): UsedContextEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UsedContextEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => ({
      ...entry,
      target: entry.target || "studio",
    }));
  } catch {
    return [];
  }
}

function writeStore(entries: UsedContextEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent(USED_CONTEXT_CHANGED));
}

export function getUsedContext(target?: UsedContextTarget): UsedContextEntry[] {
  const entries = readStore();
  return target ? entries.filter((e) => e.target === target) : entries;
}

export function addToUsedContext(
  atom: MemoryAtom,
  target: UsedContextTarget = "studio",
): UsedContextEntry {
  const entries = readStore();
  const existing = entries.find(
    (e) => e.atomId === atom.id && e.target === target,
  );
  if (existing) {
    return existing;
  }

  const entry: UsedContextEntry = {
    atomId: atom.id,
    title: atom.title || "Untitled Fragment",
    content: atom.content,
    source: atom.source,
    tags: atom.tags,
    projectId: atom.projectId,
    addedAt: Date.now(),
    approved: false,
    target,
  };

  writeStore([entry, ...entries]);
  return entry;
}

const findingEvidenceLine = (finding: ScryFinding): string => {
  const source =
    finding.resultKind === "world" ? "World source" : "Creator history";
  const location = finding.url ? ` — ${finding.url}` : "";
  return `[${source}] ${finding.title}${location}\n${finding.snippet || ""}`.trim();
};

/**
 * Projects an approved Research Context into the existing Used Context surface.
 * The context packet remains the durable object; this entry is its selectable
 * downstream representation for Build Brief generation.
 */
export function addResearchContextToUsedContext(
  packet: ResearchContextPacket,
  findings: ScryFinding[],
): UsedContextEntry {
  const target: UsedContextTarget = packet.target;
  const entries = readStore();
  const existing = entries.find(
    (entry) => entry.objectId === packet.id && entry.target === target,
  );
  const entry: UsedContextEntry = {
    atomId: packet.id,
    objectType: "context_packet",
    objectId: packet.id,
    title: packet.title,
    content:
      packet.summary ||
      findings.map(findingEvidenceLine).filter(Boolean).join("\n\n"),
    source: "Scry Research Context",
    tags: mergeTags(
      packet.tags,
      ...findings.map((finding) => finding.tags),
    ),
    projectId: packet.projectId,
    addedAt: existing?.addedAt ?? Date.now(),
    approved: packet.approvalState === "approved",
    target,
  };

  writeStore([entry, ...entries.filter((item) => item !== existing)]);
  return entry;
}

/**
 * Projects the given approved research-context entries (typically from the
 * "build-brief" target) into the "studio" used-context target so that the
 * Worktable generation, which consumes only getApprovedUsedContext("studio"),
 * actually includes the selected Scry research. The source entries are left
 * untouched so surfaces like the Build Brief Inspector continue to work.
 */
export function projectResearchContextToStudio(
  sourceEntries: UsedContextEntry[],
): void {
  if (sourceEntries.length === 0) return;
  const keyOf = (entry: UsedContextEntry) => entry.objectId || entry.atomId;
  const projected: UsedContextEntry[] = sourceEntries.map((entry) => ({
    ...entry,
    target: "studio",
    approved: true,
    addedAt: Date.now(),
  }));
  const projectedKeys = new Set(projected.map(keyOf));
  const store = readStore();
  const withoutStale = store.filter(
    (entry) => !(entry.target === "studio" && projectedKeys.has(keyOf(entry))),
  );
  writeStore([...projected, ...withoutStale]);
}

export function removeFromUsedContext(
  atomId: string,
  target?: UsedContextTarget,
): void {
  writeStore(
    readStore().filter((e) => {
      if (e.atomId !== atomId) return true;
      return target ? e.target !== target : false;
    }),
  );
}

export function setUsedContextApproved(
  atomId: string,
  approved: boolean,
  target?: UsedContextTarget,
): void {
  writeStore(
    readStore().map((e) => {
      if (e.atomId !== atomId) return e;
      if (target && e.target !== target) return e;
      return { ...e, approved };
    }),
  );
}

export function approveAllUsedContext(target?: UsedContextTarget): void {
  writeStore(
    readStore().map((e) => {
      if (target && e.target !== target) return e;
      return { ...e, approved: true };
    }),
  );
}

export function getApprovedUsedContext(
  target?: UsedContextTarget,
): UsedContextEntry[] {
  return getUsedContext(target).filter((e) => e.approved);
}

export function clearApprovedUsedContext(target?: UsedContextTarget): void {
  writeStore(
    readStore().filter((e) => {
      if (!e.approved) return true;
      return target ? e.target !== target : false;
    }),
  );
}

export function subscribeUsedContext(onChange: () => void): () => void {
  const handler = () => onChange();
  window.addEventListener(USED_CONTEXT_CHANGED, handler);
  return () => window.removeEventListener(USED_CONTEXT_CHANGED, handler);
}
