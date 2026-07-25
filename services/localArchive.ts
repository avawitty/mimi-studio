
import { ZineMetadata, PocketItem, UserProfile } from "../types";

const DB_NAME = 'MimiSovereignArchive';
const DB_VERSION = 2;
const STORES = {
  ZINES: 'zines',
  POCKET: 'pocket',
  PROFILE: 'profile',
  FOLDERS: 'dossier_folders',
  ARTIFACTS: 'dossier_artifacts'
};

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error("MIMI // Archive Engine: IndexedDB not supported on this frequency."));
      return;
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORES.ZINES)) {
          db.createObjectStore(STORES.ZINES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.POCKET)) {
          db.createObjectStore(STORES.POCKET, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.PROFILE)) {
          db.createObjectStore(STORES.PROFILE, { keyPath: 'uid' });
        }
        if (!db.objectStoreNames.contains(STORES.FOLDERS)) {
          db.createObjectStore(STORES.FOLDERS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.ARTIFACTS)) {
          db.createObjectStore(STORES.ARTIFACTS, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (e) {
      reject(e);
    }
  });
};

export const getArchiveCounts = async (): Promise<{ zines: number, pocket: number }> => {
  try {
    const db = await openDB();
    const countZines = () => new Promise<number>((resolve) => {
      const tx = db.transaction(STORES.ZINES, 'readonly');
      const request = tx.objectStore(STORES.ZINES).count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
    const countPocket = () => new Promise<number>((resolve) => {
      const tx = db.transaction(STORES.POCKET, 'readonly');
      const request = tx.objectStore(STORES.POCKET).count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
    return { zines: await countZines(), pocket: await countPocket() };
  } catch (e) { return { zines: 0, pocket: 0 }; }
};

export const saveZineLocally = async (zine: ZineMetadata) => {
  if (!zine || !zine.id) return;
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.ZINES, 'readwrite');
      const store = tx.objectStore(STORES.ZINES);
      const request = store.put(zine);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("MIMI // Archive: Zine preservation failed.", e);
    throw e;
  }
};

export const getLocalZines = async (): Promise<ZineMetadata[]> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.ZINES, 'readonly');
    const store = tx.objectStore(STORES.ZINES);
    const request = store.getAll();
    
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const results = request.result as ZineMetadata[];
        resolve(results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
      };
      request.onerror = () => resolve([]);
    });
  } catch (e) { return []; }
};

export const savePocketItemLocally = async (item: PocketItem) => {
  if (!item || !item.id) return;
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.POCKET, 'readwrite');
      const store = tx.objectStore(STORES.POCKET);
      const request = store.put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("MIMI // Archive: Pocket item preservation failed.", e);
  }
};

export const getLocalPocket = async (): Promise<PocketItem[]> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.POCKET, 'readonly');
    const store = tx.objectStore(STORES.POCKET);
    const request = store.getAll();
    
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const results = request.result as PocketItem[];
        resolve(results.sort((a, b) => b.savedAt - a.savedAt));
      };
      request.onerror = () => resolve([]);
    });
  } catch (e) { return []; }
};

export const saveProfileLocally = async (profile: UserProfile) => {
  if (!profile || !profile.uid) return;
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.PROFILE, 'readwrite');
      const store = tx.objectStore(STORES.PROFILE);
      const request = store.put(profile);
      tx.oncomplete = () => {
        try {
          localStorage.setItem('mimi_local_profile', JSON.stringify(profile));
        } catch(err) {}
        resolve();
      };
      tx.onerror = () => reject(tx.error);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("MIMI // Archive: Profile preservation failed.", e);
  }
};

export const getLocalProfile = async (): Promise<UserProfile | null> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.PROFILE, 'readonly');
    const store = tx.objectStore(STORES.PROFILE);
    const request = store.getAll();
    
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const results = request.result as UserProfile[];
        // Returns the most recently updated profile if multiple exist
        resolve(results.sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0))[0] || null);
      };
      request.onerror = () => {
        // Fallback to legacy localStorage during migration
        try {
          const legacy = localStorage.getItem('mimi_local_profile');
          resolve(legacy ? JSON.parse(legacy) : null);
        } catch(err) {
          resolve(null);
        }
      };
    });
  } catch (e) { 
    // Storage restricted, check localStorage as last resort
    try {
      const legacy = localStorage.getItem('mimi_local_profile');
      return legacy ? JSON.parse(legacy) : null;
    } catch(err) {
      return null; 
    }
  }
};

export const deleteLocalZine = async (id: string) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.ZINES, 'readwrite');
    await tx.objectStore(STORES.ZINES).delete(id);
  } catch (e) {}
};

export const deleteLocalPocketItem = async (id: string) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.POCKET, 'readwrite');
    await tx.objectStore(STORES.POCKET).delete(id);
  } catch (e) {}
};

export const saveFolderLocally = async (folder: any) => {
  if (!folder || !folder.id) return;
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.FOLDERS, 'readwrite');
      const store = tx.objectStore(STORES.FOLDERS);
      const request = store.put(folder);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {}
};

export const getLocalFolders = async (): Promise<any[]> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.FOLDERS, 'readonly');
    const request = tx.objectStore(STORES.FOLDERS).getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve([]);
    });
  } catch (e) { return []; }
};

export const saveArtifactLocally = async (artifact: any) => {
  if (!artifact || !artifact.id) return;
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.ARTIFACTS, 'readwrite');
      const store = tx.objectStore(STORES.ARTIFACTS);
      const request = store.put(artifact);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {}
};

export const getLocalArtifacts = async (folderId: string): Promise<any[]> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.ARTIFACTS, 'readonly');
    const request = tx.objectStore(STORES.ARTIFACTS).getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const results = request.result as any[];
        resolve(results.filter(a => a.folderId === folderId));
      };
      request.onerror = () => resolve([]);
    });
  } catch (e) { return []; }
};

export const clearLocalMemory = async () => {
  try {
    localStorage.removeItem('mimi_sovereign_id');
    localStorage.removeItem('mimi_local_profile');
  } catch(e) {}
  
  try {
    const db = await openDB();
    const txZ = db.transaction(STORES.ZINES, 'readwrite');
    await txZ.objectStore(STORES.ZINES).clear();
    const txP = db.transaction(STORES.POCKET, 'readwrite');
    await txP.objectStore(STORES.POCKET).clear();
    const txPr = db.transaction(STORES.PROFILE, 'readwrite');
    await txPr.objectStore(STORES.PROFILE).clear();
    const txF = db.transaction(STORES.FOLDERS, 'readwrite');
    await txF.objectStore(STORES.FOLDERS).clear();
    const txA = db.transaction(STORES.ARTIFACTS, 'readwrite');
    await txA.objectStore(STORES.ARTIFACTS).clear();
  } catch (e) {}
  window.location.reload();
};
