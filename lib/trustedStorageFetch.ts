/**
 * Trusted remote asset fetch for server-side pipelines.
 * Blocks SSRF to private networks; allowlists known Mimi storage hosts.
 */

const PRIVATE_IP_RE: RegExp[] = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^fe80:/i,
  /^fc[\da-f]{2}:/i,
  /^fd[\da-f]{2}:/i,
];

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "broadcasthost",
  "ip6-localhost",
  "ip6-loopback",
]);

/** Host suffixes for user-owned object storage (Firebase / GCS). */
const TRUSTED_STORAGE_HOST_SUFFIXES = [
  ".firebasestorage.app",
  ".appspot.com",
  "storage.googleapis.com",
  "firebasestorage.googleapis.com",
];

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export class TrustedStorageFetchError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INVALID_URL"
      | "BLOCKED_HOST"
      | "UNTRUSTED_HOST"
      | "RESPONSE_TOO_LARGE"
      | "FETCH_FAILED",
  ) {
    super(message);
    this.name = "TrustedStorageFetchError";
  }
}

export function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTNAMES.has(h)) return true;
  return PRIVATE_IP_RE.some((re) => re.test(h));
}

export function isTrustedStorageHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return TRUSTED_STORAGE_HOST_SUFFIXES.some(
    (suffix) => h === suffix.slice(1) || h.endsWith(suffix),
  );
}

/**
 * Returns true when the URL may be fetched server-side for evidence analysis.
 * Allows data: URLs (handled separately) and HTTPS to trusted storage hosts only.
 */
export function assertTrustedRemoteAssetUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new TrustedStorageFetchError("Invalid asset URL", "INVALID_URL");
  }

  if (parsed.protocol !== "https:") {
    throw new TrustedStorageFetchError(
      "Only HTTPS asset URLs are allowed for server fetch",
      "INVALID_URL",
    );
  }

  if (isPrivateHost(parsed.hostname)) {
    throw new TrustedStorageFetchError("Blocked private network host", "BLOCKED_HOST");
  }

  if (!isTrustedStorageHost(parsed.hostname)) {
    throw new TrustedStorageFetchError(
      `Untrusted asset host: ${parsed.hostname}`,
      "UNTRUSTED_HOST",
    );
  }

  return parsed;
}

export async function fetchTrustedStorageAsset(
  rawUrl: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const parsed = assertTrustedRemoteAssetUrl(rawUrl);

  let response: Response;
  try {
    response = await fetch(parsed.toString(), { redirect: "follow" });
  } catch {
    throw new TrustedStorageFetchError("Asset fetch failed", "FETCH_FAILED");
  }

  if (!response.ok) {
    throw new TrustedStorageFetchError(
      `Asset fetch failed (${response.status})`,
      "FETCH_FAILED",
    );
  }

  const finalUrl = response.url ? new URL(response.url) : parsed;
  if (isPrivateHost(finalUrl.hostname) || !isTrustedStorageHost(finalUrl.hostname)) {
    throw new TrustedStorageFetchError("Redirected to untrusted host", "UNTRUSTED_HOST");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_IMAGE_BYTES) {
      throw new TrustedStorageFetchError("Asset exceeds size limit", "RESPONSE_TOO_LARGE");
    }
    return {
      buffer,
      mimeType: response.headers.get("content-type") || "image/jpeg",
    };
  }

  const parts: Buffer[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.length;
    if (received > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new TrustedStorageFetchError("Asset exceeds size limit", "RESPONSE_TOO_LARGE");
    }
    parts.push(Buffer.from(value));
  }

  return {
    buffer: Buffer.concat(parts),
    mimeType: response.headers.get("content-type") || "image/jpeg",
  };
}
