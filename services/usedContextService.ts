import { MemoryAtom, UsedContextEntry, UsedContextTarget } from "../types";

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
