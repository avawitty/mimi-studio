import { cors, readJsonBody, requireMethod, sendJson } from "../lib/apiUtils.js";

// ---------------------------------------------------------------------------
// SSRF / private-IP guard
// ---------------------------------------------------------------------------

const PRIVATE_IP_RE: RegExp[] = [
  /^127\./,                           // loopback (127.0.0.0/8)
  /^10\./,                            // RFC 1918 (10.0.0.0/8)
  /^172\.(1[6-9]|2\d|3[01])\./,      // RFC 1918 (172.16.0.0/12)
  /^192\.168\./,                      // RFC 1918 (192.168.0.0/16)
  /^169\.254\./,                      // link-local (169.254.0.0/16)
  /^0\.0\.0\.0$/,                     // unspecified
  /^::1$/,                            // IPv6 loopback
  /^fe80:/i,                          // IPv6 link-local
  /^fc[\da-f]{2}:/i,                  // IPv6 ULA fc00::/8
  /^fd[\da-f]{2}:/i,                  // IPv6 ULA fd00::/8
];

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "broadcasthost",
  "ip6-localhost",
  "ip6-loopback",
]);

function isPrivateHost(hostname: string): boolean {
  // Strip IPv6 brackets, e.g. [::1] → ::1
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTNAMES.has(h)) return true;
  return PRIVATE_IP_RE.some((re) => re.test(h));
}

// ---------------------------------------------------------------------------
// Body reader with size limit
// ---------------------------------------------------------------------------

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2 MB

async function readBodyWithLimit(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    // No streaming API available; read all at once (best-effort)
    return response.text();
  }
  const parts: Buffer[] = [];
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      if (received > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new RangeError("RESPONSE_TOO_LARGE");
      }
      parts.push(Buffer.from(value));
    }
  } catch (err) {
    reader.cancel().catch(() => {});
    throw err;
  }
  return Buffer.concat(parts).toString("utf8");
}

// ---------------------------------------------------------------------------
// Meta-tag extractor
// ---------------------------------------------------------------------------

const textFromMeta = (html: string, name: string) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req: any, res: any) {
  if (cors(req, res)) return;
  if (!requireMethod(req, res, "POST")) return;

  try {
    const body = await readJsonBody(req);
    const rawUrl: unknown = body?.url;

    if (!rawUrl || typeof rawUrl !== "string") {
      return sendJson(res, 400, { error: "URL required" });
    }

    // Normalise scheme-less input, e.g. "example.com" → "https://example.com"
    const hasScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(rawUrl);
    const normalized = hasScheme ? rawUrl : `https://${rawUrl}`;

    let parsed: URL;
    try {
      parsed = new URL(normalized);
    } catch {
      return sendJson(res, 400, { error: "Malformed URL" });
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return sendJson(res, 400, { error: "Only http/https URLs are supported" });
    }

    if (isPrivateHost(parsed.hostname)) {
      return sendJson(res, 400, { error: "Requests to private or local addresses are not allowed" });
    }

    const response = await fetch(parsed.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 MimiBot/1.0" },
      signal: AbortSignal.timeout(12000),
      redirect: "follow",
    });

    // Guard against open-redirect to a private address
    if (response.url && response.url !== parsed.toString()) {
      try {
        const redirected = new URL(response.url);
        if (isPrivateHost(redirected.hostname)) {
          return sendJson(res, 400, { error: "Redirect to private address blocked" });
        }
      } catch {
        // Unparseable final URL – safe to ignore
      }
    }

    // Reject non-HTML content types
    const contentType = response.headers.get("content-type") ?? "";
    const isHtml =
      contentType.includes("text/html") ||
      contentType.includes("application/xhtml");
    if (!isHtml) {
      return sendJson(res, 415, { error: "Unsupported content type" });
    }

    // Reject oversized responses early via Content-Length header
    const clHeader = response.headers.get("content-length");
    if (clHeader !== null) {
      const contentLength = parseInt(clHeader, 10);
      if (!isNaN(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
        return sendJson(res, 413, { error: "Response too large" });
      }
    }

    let html: string;
    try {
      html = await readBodyWithLimit(response);
    } catch (err: any) {
      if (err instanceof RangeError && err.message === "RESPONSE_TOO_LARGE") {
        return sendJson(res, 413, { error: "Response too large" });
      }
      throw err;
    }

    const title =
      html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ||
      parsed.hostname;
    const description = textFromMeta(html, "description") || textFromMeta(html, "og:description");
    const image = textFromMeta(html, "og:image") || textFromMeta(html, "twitter:image");

    sendJson(res, 200, {
      url: parsed.toString(),
      title,
      description,
      heroImage: image ? new URL(image, parsed).toString() : "",
      source: parsed.hostname,
    });
  } catch (error: any) {
    sendJson(res, 500, { error: error?.message || String(error) });
  }
}
