/** Tiny TTL cache for hot public reads (Floor). */

type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();

export const cacheGet = <T>(key: string): T | undefined => {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return hit.value as T;
};

export const cacheSet = <T>(key: string, value: T, ttlMs: number): void => {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
};

export const cacheInvalidatePrefix = (prefix: string): void => {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
};

export const cacheClear = (): void => {
  store.clear();
};
