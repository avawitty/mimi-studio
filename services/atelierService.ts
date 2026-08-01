import type { AtelierObject, SemioticSignal } from "../types";

const STORAGE_KEY = "mimi_atelier_objects";
export const ATELIER_CHANGED = "mimi:atelier-changed";

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

function resolveOwner(ownerUid?: string): { uid: string } | null {
  if (ownerUid) return { uid: ownerUid };
  return resolveActiveOwner();
}

function emitChanged(ownerUid: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(ATELIER_CHANGED, { detail: { ownerUid } }),
  );
}

function readStore(ownerUid?: string): AtelierObject[] {
  const owner = resolveOwner(ownerUid);
  if (!owner?.uid || typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(getScopedKey(owner.uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AtelierObject[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => entry?.ownerUid === owner.uid && entry?.id);
  } catch {
    return [];
  }
}

function writeStore(entries: AtelierObject[], ownerUid: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(getScopedKey(ownerUid), JSON.stringify(entries));
  emitChanged(ownerUid);
}

/** Stable identity for a zine signal so pin/unpin is idempotent. */
export function buildAtelierObjectId(input: {
  ownerUid: string;
  productId?: string;
  link?: string;
  motif: string;
  zineId?: string;
  signalIndex?: number;
}): string {
  const key =
    input.productId ||
    input.link ||
    `${input.zineId || "zine"}:${input.signalIndex ?? 0}:${input.motif}`;
  return `atelier_${input.ownerUid}_${key}`.replace(/[^a-zA-Z0-9_\-.:]/g, "_").slice(0, 180);
}

export function listAtelierObjects(ownerUid?: string): AtelierObject[] {
  return readStore(ownerUid).sort((a, b) => b.savedAt - a.savedAt);
}

export function isAtelierObjectPinned(
  signal: Pick<SemioticSignal, "product_id" | "link" | "motif">,
  opts: { ownerUid?: string; zineId?: string; signalIndex?: number } = {},
): boolean {
  const owner = resolveOwner(opts.ownerUid);
  if (!owner?.uid) return false;
  const id = buildAtelierObjectId({
    ownerUid: owner.uid,
    productId: signal.product_id,
    link: signal.link,
    motif: signal.motif,
    zineId: opts.zineId,
    signalIndex: opts.signalIndex,
  });
  return readStore(owner.uid).some((entry) => entry.id === id);
}

export function pinAtelierObject(input: {
  signal: SemioticSignal;
  ownerUid?: string;
  zineId?: string;
  zineTitle?: string;
  signalIndex?: number;
  intent?: AtelierObject["intent"];
}): AtelierObject | null {
  const owner = resolveOwner(input.ownerUid);
  if (!owner?.uid) return null;
  if (!input.signal?.motif?.trim()) return null;

  const id = buildAtelierObjectId({
    ownerUid: owner.uid,
    productId: input.signal.product_id,
    link: input.signal.link,
    motif: input.signal.motif,
    zineId: input.zineId,
    signalIndex: input.signalIndex,
  });

  const next: AtelierObject = {
    id,
    ownerUid: owner.uid,
    motif: input.signal.motif.trim(),
    context: input.signal.context,
    targeting_rationale: input.signal.targeting_rationale,
    semantic_trigger: input.signal.semantic_trigger,
    image_url: input.signal.image_url,
    vendor: input.signal.vendor,
    price: input.signal.price,
    link: input.signal.link,
    commerce_source: input.signal.commerce_source,
    product_id: input.signal.product_id,
    signal_type: input.signal.type,
    zineId: input.zineId,
    zineTitle: input.zineTitle,
    signalIndex: input.signalIndex,
    intent:
      input.intent ||
      (input.signal.type === "acquisition" ? "acquisition_signal" : "desire"),
    tags: [input.signal.semantic_trigger, input.signal.vendor].filter(
      (t): t is string => Boolean(t),
    ),
    savedAt: Date.now(),
  };

  const existing = readStore(owner.uid).filter((entry) => entry.id !== id);
  writeStore([next, ...existing], owner.uid);
  return next;
}

export function unpinAtelierObject(
  objectId: string,
  ownerUid?: string,
): boolean {
  const owner = resolveOwner(ownerUid);
  if (!owner?.uid) return false;
  const current = readStore(owner.uid);
  const next = current.filter((entry) => entry.id !== objectId);
  if (next.length === current.length) return false;
  writeStore(next, owner.uid);
  return true;
}

export function unpinSignal(
  signal: Pick<SemioticSignal, "product_id" | "link" | "motif">,
  opts: { ownerUid?: string; zineId?: string; signalIndex?: number } = {},
): boolean {
  const owner = resolveOwner(opts.ownerUid);
  if (!owner?.uid) return false;
  const id = buildAtelierObjectId({
    ownerUid: owner.uid,
    productId: signal.product_id,
    link: signal.link,
    motif: signal.motif,
    zineId: opts.zineId,
    signalIndex: opts.signalIndex,
  });
  return unpinAtelierObject(id, owner.uid);
}

export function subscribeAtelierObjects(
  callback: (objects: AtelierObject[]) => void,
  ownerUid?: string,
): () => void {
  const owner = resolveOwner(ownerUid);
  const refresh = () => callback(listAtelierObjects(owner?.uid));
  refresh();
  if (typeof window === "undefined") return () => undefined;
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{ ownerUid?: string }>).detail;
    if (owner?.uid && detail?.ownerUid && detail.ownerUid !== owner.uid) return;
    refresh();
  };
  window.addEventListener(ATELIER_CHANGED, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(ATELIER_CHANGED, handler);
    window.removeEventListener("storage", handler);
  };
}
