/**
 * Unit-level verification for the ingest-client API handler.
 *
 * Covers: private IPs, redirects to private IPs, malformed URLs,
 * scheme-less URLs, oversized responses, and unsupported content types.
 *
 * Run with: tsx scripts/verifyIngestClient.ts
 */

// ---------------------------------------------------------------------------
// Inline assertion helper (no test framework dependency)
// ---------------------------------------------------------------------------

const assert: (condition: unknown, message: string) => asserts condition = (
  condition,
  message,
) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
};

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

interface MockRes {
  statusCode: number;
  headers: Record<string, string>;
  payload: Record<string, unknown>;
  ended: boolean;
  setHeader(key: string, val: string): void;
  end(data: string): void;
}

function makeReq(url: unknown, method = "POST") {
  return {
    method,
    body: { url },
    headers: {},
  };
}

function makeRes(): MockRes {
  const res: MockRes = {
    statusCode: 0,
    headers: {},
    payload: {},
    ended: false,
    setHeader(key, val) {
      res.headers[key.toLowerCase()] = val;
    },
    end(data) {
      res.ended = true;
      try {
        res.payload = JSON.parse(data);
      } catch {
        res.payload = {};
      }
    },
  };
  return res;
}

// ---------------------------------------------------------------------------
// Streaming-body builder for mock responses
// ---------------------------------------------------------------------------

function makeBodyReader(chunks: Uint8Array[]): ReadableStreamDefaultReader<Uint8Array> {
  let i = 0;
  return {
    read(): Promise<ReadableStreamReadResult<Uint8Array>> {
      if (i < chunks.length) {
        return Promise.resolve({ done: false, value: chunks[i++] });
      }
      return Promise.resolve({ done: true, value: undefined } as any);
    },
    cancel: () => Promise.resolve(undefined),
    releaseLock: () => {},
    get closed(): Promise<undefined> {
      return Promise.resolve(undefined);
    },
  } as any;
}

function htmlBody(text: string) {
  const encoded = new TextEncoder().encode(text);
  return makeBodyReader([encoded]);
}

function oversizedReader(sizeBytes: number): ReadableStreamDefaultReader<Uint8Array> {
  // Delivers one chunk slightly above the limit
  const chunk = new Uint8Array(sizeBytes);
  return makeBodyReader([chunk]);
}

interface FakeFetchOpts {
  url?: string;
  contentType?: string;
  contentLength?: number | null;
  html?: string;
  bodyReader?: ReadableStreamDefaultReader<Uint8Array>;
}

function mockFetch(opts: FakeFetchOpts = {}) {
  const {
    url: responseUrl = "",
    contentType = "text/html; charset=utf-8",
    contentLength = null,
    html = "<html><head><title>Test Page</title></head><body></body></html>",
    bodyReader,
  } = opts;

  (globalThis as any).fetch = async (_url: string | URL, _init?: RequestInit) => {
    const effectiveUrl = responseUrl || String(_url);
    const headers: Record<string, string | null> = {
      "content-type": contentType,
      "content-length": contentLength !== null ? String(contentLength) : null,
    };
    return {
      url: effectiveUrl,
      ok: true,
      status: 200,
      headers: {
        get: (k: string) => headers[k.toLowerCase()] ?? null,
      },
      body: {
        getReader: () =>
          bodyReader ?? htmlBody(html),
      },
      text: () => Promise.resolve(html),
    } as unknown as Response;
  };
}

// ---------------------------------------------------------------------------
// Load handler (after helpers so fetch can be replaced per-test)
// ---------------------------------------------------------------------------

const { default: handler } = await import("../api/ingest-client.js");

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

async function run(label: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (err: any) {
    console.error(`  ✗ ${label}\n    ${err.message}`);
    process.exitCode = 1;
  }
}

console.log("\nverifyIngestClient — URL ingestion hardening\n");

// --- Private IP: RFC 1918 / loopback / link-local ---------------------------

await run("blocks 192.168.x.x (RFC 1918)", async () => {
  const req = makeReq("http://192.168.1.1/admin");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 400, `Expected 400, got ${res.statusCode}`);
  assert(
    String(res.payload.error).toLowerCase().includes("private"),
    "Error should mention private address",
  );
});

await run("blocks 10.x.x.x (RFC 1918)", async () => {
  const req = makeReq("http://10.0.0.1/");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 400, `Expected 400, got ${res.statusCode}`);
});

await run("blocks 172.16.x.x (RFC 1918)", async () => {
  const req = makeReq("http://172.16.0.1/");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 400, `Expected 400, got ${res.statusCode}`);
});

await run("blocks 172.31.x.x (RFC 1918 upper bound)", async () => {
  const req = makeReq("http://172.31.255.255/");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 400, `Expected 400, got ${res.statusCode}`);
});

await run("allows 172.32.x.x (outside RFC 1918)", async () => {
  mockFetch({ url: "http://172.32.0.1/" });
  const req = makeReq("http://172.32.0.1/");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 200, `Expected 200, got ${res.statusCode}`);
});

await run("blocks 127.0.0.1 (loopback)", async () => {
  const req = makeReq("http://127.0.0.1/");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 400, `Expected 400, got ${res.statusCode}`);
});

await run("blocks localhost", async () => {
  const req = makeReq("http://localhost/");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 400, `Expected 400, got ${res.statusCode}`);
});

await run("blocks 0.0.0.0 (unspecified)", async () => {
  const req = makeReq("http://0.0.0.0/");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 400, `Expected 400, got ${res.statusCode}`);
});

await run("blocks 169.254.x.x (link-local)", async () => {
  const req = makeReq("http://169.254.169.254/latest/meta-data/");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 400, `Expected 400, got ${res.statusCode}`);
});

await run("blocks IPv6 loopback [::1]", async () => {
  const req = makeReq("http://[::1]/");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 400, `Expected 400, got ${res.statusCode}`);
});

// --- Redirect to private IP -------------------------------------------------

await run("blocks redirect to private IP (192.168.x.x)", async () => {
  mockFetch({ url: "http://192.168.1.100/secret" });
  const req = makeReq("https://legit-public.example.com/");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 400, `Expected 400, got ${res.statusCode}`);
  assert(
    String(res.payload.error).toLowerCase().includes("redirect"),
    "Error should mention redirect",
  );
});

await run("blocks redirect to localhost", async () => {
  mockFetch({ url: "http://localhost/internal" });
  const req = makeReq("https://legit.example.com/");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 400, `Expected 400, got ${res.statusCode}`);
});

await run("allows same-host non-redirect (response.url matches request)", async () => {
  mockFetch({ url: "https://example.com/" });
  const req = makeReq("https://example.com/");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 200, `Expected 200, got ${res.statusCode}`);
});

// --- Malformed URLs ---------------------------------------------------------

await run("rejects plainly malformed URL string", async () => {
  const req = makeReq("not a valid url at all ://???");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 400, `Expected 400, got ${res.statusCode}`);
  assert(
    String(res.payload.error).toLowerCase().includes("malformed"),
    "Error should mention malformed",
  );
});

await run("rejects URL with only spaces", async () => {
  const req = makeReq("   ");
  const res = makeRes();
  await handler(req, res);
  // spaces-only: treated as falsy after trim, but raw check is on the string
  // If URL.parse throws → 400 Malformed; if empty-ish → 400 URL required
  assert([400].includes(res.statusCode), `Expected 400, got ${res.statusCode}`);
});

await run("rejects missing URL field", async () => {
  const req = makeReq(undefined);
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 400, `Expected 400, got ${res.statusCode}`);
});

await run("rejects non-string URL field", async () => {
  const req = makeReq(12345);
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 400, `Expected 400, got ${res.statusCode}`);
});

// --- Non-http(s) schemes ----------------------------------------------------

await run("rejects ftp:// scheme", async () => {
  const req = makeReq("ftp://example.com/file.txt");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 400, `Expected 400, got ${res.statusCode}`);
});

await run("rejects javascript: scheme", async () => {
  const req = makeReq("javascript:alert(1)");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 400, `Expected 400, got ${res.statusCode}`);
});

await run("rejects file:// scheme", async () => {
  const req = makeReq("file:///etc/passwd");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 400, `Expected 400, got ${res.statusCode}`);
});

// --- Scheme-less URLs -------------------------------------------------------

await run("auto-prepends https:// for scheme-less input", async () => {
  mockFetch({ url: "https://example.com/" });
  const req = makeReq("example.com");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 200, `Expected 200, got ${res.statusCode}`);
  assert(
    String(res.payload.url).startsWith("https://"),
    "Resolved URL should use https scheme",
  );
});

await run("auto-prepends https:// for www. scheme-less input", async () => {
  mockFetch({ url: "https://www.example.com/" });
  const req = makeReq("www.example.com/page");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 200, `Expected 200, got ${res.statusCode}`);
});

// --- Oversized responses ----------------------------------------------------

await run("rejects response with Content-Length > 2 MB", async () => {
  mockFetch({
    url: "https://example.com/big",
    contentLength: 3 * 1024 * 1024, // 3 MB
  });
  const req = makeReq("https://example.com/big");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 413, `Expected 413, got ${res.statusCode}`);
  assert(
    String(res.payload.error).toLowerCase().includes("too large"),
    "Error should mention size",
  );
});

await run("rejects streaming body that exceeds 2 MB", async () => {
  mockFetch({
    url: "https://example.com/big-stream",
    contentLength: null, // No Content-Length header
    bodyReader: oversizedReader(3 * 1024 * 1024),
  });
  const req = makeReq("https://example.com/big-stream");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 413, `Expected 413, got ${res.statusCode}`);
});

await run("accepts response just under 2 MB", async () => {
  const nearLimit = 2 * 1024 * 1024 - 1;
  mockFetch({
    url: "https://example.com/near-limit",
    contentLength: nearLimit,
    html: "<html><head><title>OK</title></head><body></body></html>",
    bodyReader: htmlBody("<html><head><title>OK</title></head><body></body></html>"),
  });
  const req = makeReq("https://example.com/near-limit");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 200, `Expected 200, got ${res.statusCode}`);
});

// --- Unsupported content types ----------------------------------------------

await run("rejects image/png content type", async () => {
  mockFetch({
    url: "https://example.com/photo.png",
    contentType: "image/png",
  });
  const req = makeReq("https://example.com/photo.png");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 415, `Expected 415, got ${res.statusCode}`);
  assert(
    String(res.payload.error).toLowerCase().includes("unsupported"),
    "Error should mention unsupported content type",
  );
});

await run("rejects application/pdf content type", async () => {
  mockFetch({
    url: "https://example.com/doc.pdf",
    contentType: "application/pdf",
  });
  const req = makeReq("https://example.com/doc.pdf");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 415, `Expected 415, got ${res.statusCode}`);
});

await run("rejects application/json content type", async () => {
  mockFetch({
    url: "https://example.com/api",
    contentType: "application/json",
  });
  const req = makeReq("https://example.com/api");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 415, `Expected 415, got ${res.statusCode}`);
});

await run("accepts text/html content type", async () => {
  mockFetch({
    url: "https://example.com/",
    contentType: "text/html; charset=utf-8",
  });
  const req = makeReq("https://example.com/");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 200, `Expected 200, got ${res.statusCode}`);
});

await run("accepts application/xhtml+xml content type", async () => {
  mockFetch({
    url: "https://example.com/page.xhtml",
    contentType: "application/xhtml+xml",
  });
  const req = makeReq("https://example.com/page.xhtml");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 200, `Expected 200, got ${res.statusCode}`);
});

// --- Happy path with metadata extraction ------------------------------------

await run("extracts title, description and og:image from valid HTML", async () => {
  const html = `
    <html>
      <head>
        <title>Brand Site | Editorial</title>
        <meta name="description" content="A test description for verification.">
        <meta property="og:image" content="/assets/hero.jpg">
      </head>
      <body></body>
    </html>
  `;
  mockFetch({ url: "https://brand.example.com/", html });
  const req = makeReq("https://brand.example.com/");
  const res = makeRes();
  await handler(req, res);
  assert(res.statusCode === 200, `Expected 200, got ${res.statusCode}`);
  assert(res.payload.title === "Brand Site | Editorial", "Title mismatch");
  assert(
    res.payload.description === "A test description for verification.",
    "Description mismatch",
  );
  assert(
    String(res.payload.heroImage).includes("https://brand.example.com"),
    "heroImage should be absolute",
  );
  assert(res.payload.source === "brand.example.com", "Source should be hostname");
});

// ---------------------------------------------------------------------------

if (process.exitCode === 1) {
  console.log("\n✗ Some checks failed.\n");
} else {
  console.log("\n✓ All ingest-client hardening checks passed.\n");
}
