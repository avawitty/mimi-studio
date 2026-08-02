/**
 * Tiny in-process write rate limiter for sovereign mutations.
 * Enough to blunt burst abuse on a single Node isolate; not a distributed limiter.
 */

type Bucket = { tokens: number; updatedAt: number };

const buckets = new Map<string, Bucket>();

const DEFAULT_CAPACITY = 40;
const DEFAULT_REFILL_PER_MS = 40 / 60_000; // 40 writes / minute

export const allowSovereignWrite = (
  key: string,
  opts?: { capacity?: number; refillPerMs?: number },
): boolean => {
  const capacity = opts?.capacity ?? DEFAULT_CAPACITY;
  const refillPerMs = opts?.refillPerMs ?? DEFAULT_REFILL_PER_MS;
  const now = Date.now();
  const current = buckets.get(key) || { tokens: capacity, updatedAt: now };
  const elapsed = Math.max(0, now - current.updatedAt);
  const tokens = Math.min(capacity, current.tokens + elapsed * refillPerMs);
  if (tokens < 1) {
    buckets.set(key, { tokens, updatedAt: now });
    return false;
  }
  buckets.set(key, { tokens: tokens - 1, updatedAt: now });
  return true;
};

/** Test helper */
export const resetSovereignRateLimitForTests = (): void => {
  buckets.clear();
};
