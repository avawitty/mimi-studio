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

function mergeUsedContextEntries(
  local: UsedContextEntry[],
  server: UsedContextEntry[],
  ownerUid: string,
): UsedContextEntry[] {
  const map = new Map<string, UsedContextEntry>();

  for (const entry of server) {
    const key = `${entry.atomId}::${entry.target}`;
    map.set(key, { ...entry, ownerUid: entry.ownerUid || ownerUid });
  }

  for (const entry of local) {
    const key = `${entry.atomId}::${entry.target}`;
    const existing = map.get(key);
    if (!existing || entry.addedAt >= existing.addedAt) {
      map.set(key, { ...entry, ownerUid: entry.ownerUid || ownerUid });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.addedAt - a.addedAt);
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
  void syncUsedContextToServer(entries, owner.uid);
}

async function authHeaders(): Promise<HeadersInit> {
  try {
    const { auth } = await import("./firebaseInit");
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  } catch {
    return { "Content-Type": "application/json" };
  }
}

/** Fire-and-forget server mirror for cross-device Used Context. */
export async function syncUsedContextToServer(
  entries: UsedContextEntry[],
  ownerUid?: string,
): Promise<void> {
  const owner = resolveOwner(ownerUid);
  if (!owner?.uid || owner.uid === "ghost") return;
  try {
    const headers = await authHeaders();
    await fetch("/api/mimi/used-context", {
      method: "PUT",
      headers,
      body: JSON.stringify({ entries }),
    });
  } catch {
    /* local tray remains authoritative offline */
  }
}

/**
 * Merge server Used Context with local tray (cross-device sync).
 */
export async function hydrateUsedContextFromServer(ownerUid?: string): Promise<void> {
  const owner = resolveOwner(ownerUid);
  if (!owner?.uid || owner.uid === "ghost") return;
  migrateLegacyStore(owner.uid, owner.handle);

  try {
    const headers = await authHeaders();
    const res = await fetch("/api/mimi/used-context", { headers });
    if (!res.ok) return;
    const json = (await res.json()) as { entries?: UsedContextEntry[] };
    if (!Array.isArray(json.entries)) return;

    const local = readStore(ownerUid);
    if (json.entries.length === 0 && local.length === 0) return;

    const merged = mergeUsedContextEntries(local, json.entries, owner.uid);
    localStorage.setItem(getScopedKey(owner.uid), JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent(USED_CONTEXT_CHANGED));
    void refreshUsedContextConflicts(ownerUid);
  } catch {
    /* ignore */
  }
}

export type UsedContextConflictField = "approved" | "content";

export interface UsedContextConflict {
  atomId: string;
  target: UsedContextTarget;
  field: UsedContextConflictField;
  local: UsedContextEntry;
  server: UsedContextEntry;
}

export const USED_CONTEXT_CONFLICTS_CHANGED = "mimi:used-context-conflicts-changed";

let cachedConflicts: UsedContextConflict[] = [];

export function getUsedContextConflicts(): UsedContextConflict[] {
  return cachedConflicts;
}

function detectUsedContextConflicts(
  local: UsedContextEntry[],
  server: UsedContextEntry[],
): UsedContextConflict[] {
  const conflicts: UsedContextConflict[] = [];
  const serverMap = new Map(server.map((e) => [`${e.atomId}::${e.target}`, e]));

  for (const loc of local) {
    const srv = serverMap.get(`${loc.atomId}::${loc.target}`);
    if (!srv) continue;

    if (loc.approved !== srv.approved) {
      conflicts.push({
        atomId: loc.atomId,
        target: loc.target,
        field: "approved",
        local: loc,
        server: srv,
      });
      continue;
    }

    if (
      loc.content.trim() !== srv.content.trim() &&
      Math.abs(loc.addedAt - srv.addedAt) > 2000
    ) {
      conflicts.push({
        atomId: loc.atomId,
        target: loc.target,
        field: "content",
        local: loc,
        server: srv,
      });
    }
  }

  return conflicts;
}

async function fetchServerUsedContext(ownerUid: string): Promise<UsedContextEntry[]> {
  const headers = await authHeaders();
  const res = await fetch("/api/mimi/used-context", { headers });
  if (!res.ok) return [];
  const json = (await res.json()) as { entries?: UsedContextEntry[] };
  return Array.isArray(json.entries) ? json.entries : [];
}

export async function refreshUsedContextConflicts(
  ownerUid?: string,
): Promise<UsedContextConflict[]> {
  const owner = resolveOwner(ownerUid);
  if (!owner?.uid || owner.uid === "ghost") {
    cachedConflicts = [];
    return [];
  }

  const local = readStore(ownerUid);
  const server = await fetchServerUsedContext(owner.uid);
  cachedConflicts = detectUsedContextConflicts(local, server);
  window.dispatchEvent(new CustomEvent(USED_CONTEXT_CONFLICTS_CHANGED));
  return cachedConflicts;
}

export async function resolveUsedContextKeepLocal(ownerUid?: string): Promise<void> {
  const owner = resolveOwner(ownerUid);
  if (!owner?.uid) return;
  const entries = readStore(ownerUid);
  await syncUsedContextToServer(entries, owner.uid);
  await refreshUsedContextConflicts(ownerUid);
}

export async function resolveUsedContextKeepServer(ownerUid?: string): Promise<void> {
  const owner = resolveOwner(ownerUid);
  if (!owner?.uid) return;
  const server = await fetchServerUsedContext(owner.uid);
  localStorage.setItem(getScopedKey(owner.uid), JSON.stringify(server));
  window.dispatchEvent(new CustomEvent(USED_CONTEXT_CHANGED));
  await refreshUsedContextConflicts(ownerUid);
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
