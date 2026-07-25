import { ToneTag } from "../types";

const DB_NAME = 'MimiDraftDB';
const STORE_NAME = 'drafts';
const DRAFT_KEY = 'current_session';

export interface DraftData {
  input: string;
  files: File[];
  audioBlob: Blob | null;
  duration: number;
  selectedTone: ToneTag;
  useSearch: boolean;
  updatedAt: number;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    // We rely on the browser window object being present
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error("IndexedDB not supported"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveDraft = async (data: DraftData): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(data, DRAFT_KEY);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("Mimi could not save draft to local storage:", e);
  }
};

export const getDraft = async (): Promise<DraftData | undefined> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(DRAFT_KEY);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("Mimi could not load draft:", e);
    return undefined;
  }
};

export const clearDraft = async (): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(DRAFT_KEY);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn("Mimi could not clear draft:", e);
  }
};
