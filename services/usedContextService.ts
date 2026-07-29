import { MemoryAtom, UsedContextEntry, UsedContextTarget } from "../types";

const STORAGE_KEY = "mimi_studio_used_context";
export const USED_CONTEXT_CHANGED = "mimi:used-context-changed";
const LINK_VERSION = 1;

function getScopedKey(uid: string): string {
  return `${STORAGE_KEY}::${uid}`;
}

function resolveActiveOwner(): { uid: string; handle?: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("mimi_local_profile");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { uid?: string; handle?: string };
    if (!parsed?.uid) return null;
    return { uid: parsed.uid, handle: parsed.handle };
  } catch {
    return null;
  }
}

function resolveOwner(ownerUid?: string): { uid: string; handle?: string } | null {
  if (ownerUid) return { uid: ownerUid };
  return resolveActiveOwner();
}

function migrateLegacyStore(uid: string, handle?: string): void {
  const scopedKey = getScopedKey(uid);
  if (localStorage.getItem(scopedKey)) return;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as UsedContextEntry[];
    if (!Array.isArray(parsed)) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const migrated = parsed.map((entry) => ({
      ...entry,
      target: entry.target || "studio",
      ownerUid: uid,
      ownerHandle: handle,
      linkVersion: LINK_VERSION,
    }));
    localStorage.setItem(scopedKey, JSON.stringify(migrated));
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function readStore(ownerUid?: string): UsedContextEntry[] {
  const owner = resolveOwner(ownerUid);
  if (!owner?.uid) return [];
  migrateLegacyStore(owner.uid, owner.handle);
  try {
    const raw = localStorage.getItem(getScopedKey(owner.uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UsedContextEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => ({
      ...entry,
      target: entry.target || "studio",
      ownerUid: entry.ownerUid || owner.uid,
      ownerHandle: entry.ownerHandle || owner.handle,
      linkVersion: entry.linkVersion || LINK_VERSION,
    }))
      .filter((entry) => entry.ownerUid === owner.uid);
  } catch {
    return [];
  }
}

function writeStore(entries: UsedContextEntry[], ownerUid?: string): void {
  const owner = resolveOwner(ownerUid);
  if (!owner?.uid) return;
  localStorage.setItem(getScopedKey(owner.uid), JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent(USED_CONTEXT_CHANGED));
}

export function getUsedContext(
  target?: UsedContextTarget,
  ownerUid?: string,
): UsedContextEntry[] {
  const entries = readStore(ownerUid);
  return target ? entries.filter((e) => e.target === target) : entries;
}

export function addToUsedContext(
  atom: MemoryAtom,
  target: UsedContextTarget = "studio",
  ownerUid?: string,
): UsedContextEntry {
  const owner = resolveOwner(ownerUid);
  const entries = readStore(ownerUid);
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
    ownerUid: owner?.uid,
    ownerHandle: owner?.handle,
    linkVersion: LINK_VERSION,
    addedAt: Date.now(),
    approved: false,
    target,
  };

  writeStore([entry, ...entries], ownerUid);
  return entry;
}

export function removeFromUsedContext(
  atomId: string,
  target?: UsedContextTarget,
  ownerUid?: string,
): void {
  writeStore(
    readStore(ownerUid).filter((e) => {
      if (e.atomId !== atomId) return true;
      return target ? e.target !== target : false;
    }),
    ownerUid,
  );
}

export function setUsedContextApproved(
  atomId: string,
  approved: boolean,
  target?: UsedContextTarget,
  ownerUid?: string,
): void {
  writeStore(
    readStore(ownerUid).map((e) => {
      if (e.atomId !== atomId) return e;
      if (target && e.target !== target) return e;
      return { ...e, approved };
    }),
    ownerUid,
  );
}

export function approveAllUsedContext(target?: UsedContextTarget, ownerUid?: string): void {
  writeStore(
    readStore(ownerUid).map((e) => {
      if (target && e.target !== target) return e;
      return { ...e, approved: true };
    }),
    ownerUid,
  );
}

export function getApprovedUsedContext(
  target?: UsedContextTarget,
  ownerUid?: string,
): UsedContextEntry[] {
  return getUsedContext(target, ownerUid).filter((e) => e.approved);
}

export function clearApprovedUsedContext(target?: UsedContextTarget, ownerUid?: string): void {
  writeStore(
    readStore(ownerUid).filter((e) => {
      if (!e.approved) return true;
      return target ? e.target !== target : false;
    }),
    ownerUid,
  );
}

export function clearLegacyUsedContextState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function subscribeUsedContext(onChange: () => void): () => void {
  const handler = () => onChange();
  window.addEventListener(USED_CONTEXT_CHANGED, handler);
  return () => window.removeEventListener(USED_CONTEXT_CHANGED, handler);
}
