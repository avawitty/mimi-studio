/**
 * Guardrail for Atelier taste-signal persistence.
 * Run: npm run verify:atelier
 */
import assert from "node:assert/strict";
import {
  buildAtelierObjectId,
  isAtelierObjectPinned,
  listAtelierObjects,
  pinAtelierObject,
  unpinSignal,
} from "../services/atelierService";
import type { SemioticSignal } from "../types";

const memory = new Map<string, string>();
const listeners = new Map<string, Set<EventListener>>();

(globalThis as any).localStorage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
  removeItem: (key: string) => {
    memory.delete(key);
  },
};

(globalThis as any).window = {
  addEventListener: (type: string, listener: EventListener) => {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type)!.add(listener);
  },
  removeEventListener: (type: string, listener: EventListener) => {
    listeners.get(type)?.delete(listener);
  },
  dispatchEvent: (event: { type: string }) => {
    listeners.get(event.type)?.forEach((listener) => listener(event as any));
    return true;
  },
};

const uid = "local_verify_atelier";
memory.set(
  "mimi_local_profile",
  JSON.stringify({ uid, handle: "verify" }),
);

const signal: SemioticSignal = {
  motif: "Archive Wool Coat",
  context: "A silhouette that anchors the issue's winter gravity.",
  type: "acquisition",
  link: "https://example.com/coat",
  semantic_trigger: "structured desire",
  targeting_rationale: "Materials and cut echo the zine's restraint thesis.",
  image_url: "https://example.com/coat.jpg",
  vendor: "Example House",
  price: "$420",
  commerce_source: "shopify",
  product_id: "gid://shopify/Product/1",
};

const pinned = pinAtelierObject({
  signal,
  ownerUid: uid,
  zineId: "zine_1",
  zineTitle: "Winter Gravity",
  signalIndex: 0,
});

assert.ok(pinned, "pin should return an object");
assert.equal(pinned!.intent, "acquisition_signal");
assert.equal(listAtelierObjects(uid).length, 1);
assert.equal(
  isAtelierObjectPinned(signal, { ownerUid: uid, zineId: "zine_1", signalIndex: 0 }),
  true,
);

const again = pinAtelierObject({
  signal,
  ownerUid: uid,
  zineId: "zine_1",
  zineTitle: "Winter Gravity",
  signalIndex: 0,
});
assert.equal(listAtelierObjects(uid).length, 1, "re-pin should be idempotent");
assert.equal(again!.id, pinned!.id);

const id = buildAtelierObjectId({
  ownerUid: uid,
  productId: signal.product_id,
  link: signal.link,
  motif: signal.motif,
  zineId: "zine_1",
  signalIndex: 0,
});
assert.equal(id, pinned!.id);

assert.equal(
  unpinSignal(signal, { ownerUid: uid, zineId: "zine_1", signalIndex: 0 }),
  true,
);
assert.equal(listAtelierObjects(uid).length, 0);

console.log("verify:atelier — ok");
