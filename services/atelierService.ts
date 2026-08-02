import type { AtelierObject, SemioticSignal } from "../types";

const STORAGE_KEY = "mimi_atelier_objects";
export const ATELIER_CHANGED = "mimi:atelier-changed";
/** Soft archive size — prefer pruning stale references before desire pins. */
export const ATELIER_SOFT_CAP = 40;
/** Pins older than this without a resonance confirm surface “Still resonant?” */
export const ATELIER_RESONANCE_STALE_MS = 1000 * 60 * 60 * 24 * 21;

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

/** Drop oldest reference pins first, then oldest overall, until at/under soft cap. */
export function enforceAtelierSoftCap(entries: AtelierObject[]): AtelierObject[] {
  if (entries.length <= ATELIER_SOFT_CAP) return entries;
  const rankedForDrop = [...entries].sort((a, b) => {
    const refBias = (obj: AtelierObject) => (obj.intent === "reference" ? 0 : 1);
    return refBias(a) - refBias(b) || a.savedAt - b.savedAt;
  });
  const dropCount = entries.length - ATELIER_SOFT_CAP;
  const dropIds = new Set(rankedForDrop.slice(0, dropCount).map((entry) => entry.id));
  return entries.filter((entry) => !dropIds.has(entry.id));
}

export function isAtelierObjectStale(
  obj: AtelierObject,
  now = Date.now(),
): boolean {
  const anchor = obj.lastResonantAt || obj.savedAt;
  return now - anchor >= ATELIER_RESONANCE_STALE_MS;
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
  const capped = enforceAtelierSoftCap([next, ...existing]);
  writeStore(capped, owner.uid);
  return capped.find((entry) => entry.id === id) || next;
}

export function confirmAtelierResonance(
  objectId: string,
  ownerUid?: string,
): AtelierObject | null {
  const owner = resolveOwner(ownerUid);
  if (!owner?.uid) return null;
  const current = readStore(owner.uid);
  const index = current.findIndex((entry) => entry.id === objectId);
  if (index < 0) return null;
  const now = Date.now();
  const updated: AtelierObject = {
    ...current[index],
    lastResonantAt: now,
    savedAt: now,
  };
  const next = [...current];
  next[index] = updated;
  writeStore(next, owner.uid);
  return updated;
}

export function getAtelierCapacity(ownerUid?: string): {
  count: number;
  cap: number;
  remaining: number;
  atCap: boolean;
} {
  const count = listAtelierObjects(ownerUid).length;
  return {
    count,
    cap: ATELIER_SOFT_CAP,
    remaining: Math.max(0, ATELIER_SOFT_CAP - count),
    atCap: count >= ATELIER_SOFT_CAP,
  };
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

export function updateAtelierObjectIntent(
  objectId: string,
  intent: NonNullable<AtelierObject["intent"]>,
  ownerUid?: string,
): AtelierObject | null {
  const owner = resolveOwner(ownerUid);
  if (!owner?.uid) return null;
  const current = readStore(owner.uid);
  const index = current.findIndex((entry) => entry.id === objectId);
  if (index < 0) return null;
  const updated: AtelierObject = { ...current[index], intent };
  const next = [...current];
  next[index] = updated;
  writeStore(next, owner.uid);
  return updated;
}

function intentWeight(intent?: AtelierObject["intent"]): number {
  switch (intent) {
    case "desire":
      return 3;
    case "acquisition_signal":
      return 2;
    case "reference":
      return 1;
    case undefined:
      return 2;
    default: {
      const _exhaustive: never = intent;
      return _exhaustive;
    }
  }
}

function formatObjectLine(obj: AtelierObject): string {
  const meta = [obj.vendor, obj.price, obj.semantic_trigger].filter(Boolean).join(" · ");
  const why = obj.targeting_rationale || obj.context;
  return `- ${obj.motif}${meta ? ` (${meta})` : ""}${why ? `: ${why}` : ""}`;
}

export type AtelierPriorSignals = {
  desire: string[];
  reference: string[];
};

/** Compact signals for Tailor prior-context / dossier synthesis. */
export function summarizeAtelierForPriorContext(
  ownerUid?: string,
  limits: { desire?: number; reference?: number } = {},
): AtelierPriorSignals {
  const desireLimit = limits.desire ?? 8;
  const referenceLimit = limits.reference ?? 3;
  const objects = listAtelierObjects(ownerUid);
  const desire = objects
    .filter((obj) => obj.intent !== "reference")
    .sort((a, b) => intentWeight(b.intent) - intentWeight(a.intent) || b.savedAt - a.savedAt)
    .slice(0, desireLimit)
    .map((obj) => {
      const bits = [obj.motif, obj.vendor, obj.semantic_trigger].filter(Boolean);
      return bits.join(" · ");
    });
  const reference = objects
    .filter((obj) => obj.intent === "reference")
    .slice(0, referenceLimit)
    .map((obj) => {
      const bits = [obj.motif, obj.vendor].filter(Boolean);
      return bits.join(" · ");
    });
  return { desire, reference };
}

/**
 * Soft taste context for Studio/zine generation.
 * Desire / acquisition pins steer orientation; reference pins are lighter evidence only.
 */
export function formatAtelierTasteContextForPrompt(
  ownerUid?: string,
  limits: { desire?: number; reference?: number } = {},
): string {
  const objects = listAtelierObjects(ownerUid);
  if (objects.length === 0) return "";

  const desireLimit = limits.desire ?? 8;
  const referenceLimit = limits.reference ?? 3;
  const desireObjects = objects
    .filter((obj) => obj.intent !== "reference")
    .sort((a, b) => intentWeight(b.intent) - intentWeight(a.intent) || b.savedAt - a.savedAt)
    .slice(0, desireLimit);
  const referenceObjects = objects
    .filter((obj) => obj.intent === "reference")
    .slice(0, referenceLimit);

  if (desireObjects.length === 0 && referenceObjects.length === 0) return "";

  const lines: string[] = [
    "\nATELIER TASTE OBJECTS (Pinned commerce/semiotic evidence of the user's desires and buyer orientation — NOT a shopping list or purchase instruction):",
    "Weight desire signals when shaping motifs, materials, silhouette language, and acquisition-type semiotic_signals. Treat reference-only pins as optional cultural context with lower weight.",
  ];
  if (desireObjects.length > 0) {
    lines.push("DESIRE / BUYER ORIENTATION:");
    lines.push(...desireObjects.map(formatObjectLine));
  }
  if (referenceObjects.length > 0) {
    lines.push("REFERENCE ONLY (do not treat as purchase intent):");
    lines.push(...referenceObjects.map(formatObjectLine));
  }
  return lines.join("\n");
}

/** Resolve pin intent from the Desire vs Reference choice. */
export function resolvePinIntent(
  choice: "desire" | "reference",
  signalType?: SemioticSignal["type"],
): NonNullable<AtelierObject["intent"]> {
  if (choice === "reference") return "reference";
  return signalType === "acquisition" ? "acquisition_signal" : "desire";
}
