/**
 * Map technical failures to short, human-readable copy for toasts and inline UI.
 */

const QUOTA_RE =
  /quota|free tier|read units|write units|RESOURCE_EXHAUSTED|exceed.*quota/i;

function parseJsonErrorMessage(raw: string): string | null {
  if (!raw.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(raw) as { error?: string; message?: string };
    const inner = parsed.error || parsed.message;
    if (typeof inner === "string" && inner.trim()) {
      return toUserFacingError(inner);
    }
  } catch {
    /* not JSON */
  }
  return null;
}

export function isFirestoreQuotaError(message: string): boolean {
  return QUOTA_RE.test(message);
}

export function toUserFacingError(
  error: unknown,
  fallback = "Something went wrong. Try again.",
): string {
  const raw =
    error instanceof Error ? error.message : typeof error === "string" ? error : fallback;

  const fromJson = parseJsonErrorMessage(raw.trim());
  if (fromJson) return fromJson;

  if (isFirestoreQuotaError(raw)) {
    return "Cloud sync is paused (database limit). References stay on this device — you can still read them.";
  }

  if (/offline|Failed to get document because the client is offline/i.test(raw)) {
    return "You're offline. References are saved on this device.";
  }

  if (/permission-denied|invalid-credential|api-key-expired/i.test(raw)) {
    return "Couldn't reach the cloud archive. References are saved on this device.";
  }

  if (raw.length > 220) {
    return `${raw.slice(0, 200).trim()}…`;
  }

  return raw.trim() || fallback;
}
