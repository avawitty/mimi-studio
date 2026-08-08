/**
 * Local-first Tailor evidence — keeps references readable when Firestore quota,
 * offline, or oversized inline blobs block cloud sync.
 */

import type { EvidenceNode } from "../types";

const DB_NAME = "MimiTailorEvidence";
const DB_VERSION = 1;
const STORE = "evidence_nodes";

interface TailorEvidenceLocalRow {
  key: string;
  userId: string;
  projectId: string;
  node: EvidenceNode;
  updatedAt: number;
}

const rowKey = (userId: string, projectId: string, nodeId: string) =>
  `${userId}|${projectId}|${nodeId}`;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IDB open failed"));
  });
};

export async function saveTailorEvidenceLocal(node: EvidenceNode): Promise<void> {
  if (!node.userId || !node.projectId || !node.id) return;
  try {
    const db = await openDB();
    const row: TailorEvidenceLocalRow = {
      key: rowKey(node.userId, node.projectId, node.id),
      userId: node.userId,
      projectId: node.projectId,
      node,
      updatedAt: Date.now(),
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).put(row);
    });
  } catch (err) {
    console.warn("MIMI // Tailor local evidence save failed:", err);
  }
}

export async function listTailorEvidenceLocal(
  userId: string,
  projectId: string,
): Promise<EvidenceNode[]> {
  if (!userId || !projectId) return [];
  try {
    const db = await openDB();
    const rows = await new Promise<TailorEvidenceLocalRow[]>((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).getAll();
      request.onsuccess = () => resolve((request.result as TailorEvidenceLocalRow[]) || []);
      request.onerror = () => resolve([]);
    });
    return rows
      .filter((r) => r.userId === userId && r.projectId === projectId)
      .map((r) => r.node)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export function mergeEvidenceWithLocal(
  cloud: EvidenceNode[],
  local: EvidenceNode[],
): EvidenceNode[] {
  const byId = new Map<string, EvidenceNode>();
  for (const node of cloud) {
    byId.set(node.id, node);
  }
  for (const localNode of local) {
    const existing = byId.get(localNode.id);
    if (!existing) {
      byId.set(localNode.id, localNode);
      continue;
    }
    byId.set(localNode.id, {
      ...existing,
      uploadedFileUrl: localNode.uploadedFileUrl ?? existing.uploadedFileUrl,
      thumbnailUrl: localNode.thumbnailUrl ?? existing.thumbnailUrl,
      extractedMetadata: {
        ...(existing.extractedMetadata || {}),
        ...(localNode.extractedMetadata || {}),
        storageTier:
          (localNode.extractedMetadata?.storageTier as string) ||
          (existing.extractedMetadata?.storageTier as string),
      },
    });
  }
  return Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt);
}

const INLINE_DATA_URL_MAX = 12_000;

export function isOversizedInlineDataUrl(url?: string): boolean {
  return Boolean(url?.startsWith("data:") && url.length > INLINE_DATA_URL_MAX);
}

/** Strip huge base64 payloads before Firestore write; blobs live in IndexedDB. */
export function slimEvidenceForFirestore(node: EvidenceNode): EvidenceNode {
  const stripUploaded = isOversizedInlineDataUrl(node.uploadedFileUrl);
  const stripThumb = isOversizedInlineDataUrl(node.thumbnailUrl);
  const needsLocalBlob = stripUploaded || stripThumb;

  const extractedMetadata = {
    ...(node.extractedMetadata || {}),
    ...(needsLocalBlob
      ? {
          localMediaKey: node.id,
          storageTier: "local_blob" as const,
        }
      : {}),
  };

  return {
    ...node,
    uploadedFileUrl: stripUploaded ? undefined : node.uploadedFileUrl,
    thumbnailUrl: stripThumb ? undefined : node.thumbnailUrl,
    extractedMetadata,
  };
}

export function evidenceSavedLocallyOnly(node: EvidenceNode): boolean {
  return node.extractedMetadata?.storageTier === "local_blob" ||
    node.extractedMetadata?.storageTier === "local_only";
}
