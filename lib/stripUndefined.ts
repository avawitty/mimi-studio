/**
 * Firestore rejects `undefined` field values. Strip them (recursively) before writes.
 * `null` is preserved — callers that mean "clear field" should use null or FieldValue.delete().
 */
export function stripUndefined<T>(value: T): T {
  if (value === undefined) {
    return value;
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }
  if (value instanceof Date) {
    return value;
  }
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (entry === undefined) continue;
    out[key] = stripUndefined(entry);
  }
  return out as T;
}
