/** @vitest-environment node */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/serverFirebaseAdmin", () => ({
  getServerFirebaseAdmin: vi.fn(() => ({ auth: null, db: null })),
}));

import { extractSessionCookie } from "../lib/sessionCookie";
import {
  authorizeSovereignWrite,
  resolveSovereignRequesterUid,
} from "../lib/sovereign/auth";
import { getServerFirebaseAdmin } from "../lib/serverFirebaseAdmin";

describe("sovereign auth helpers", () => {
  afterEach(() => {
    delete process.env.MIMI_SOVEREIGN_INGEST_KEY;
    delete process.env.MIMI_SOVEREIGN_STRICT_AUTH;
    delete process.env.MIMI_SOVEREIGN_TRUST_USER_HEADER;
    delete process.env.NODE_ENV;
    vi.mocked(getServerFirebaseAdmin).mockReturnValue({ auth: null, db: null });
  });

  it("parses __session from Cookie header", () => {
    expect(
      extractSessionCookie({ cookie: "theme=dark; __session=abc%2Edef; other=1" }),
    ).toBe("abc.def");
    expect(extractSessionCookie({ cookie: "nope=1" })).toBe("");
  });

  it("accepts ingest key for writes", async () => {
    process.env.MIMI_SOVEREIGN_INGEST_KEY = "secret";
    const result = await authorizeSovereignWrite(
      { headers: { "x-mimi-ingest-key": "secret", "x-user-id": "u1" } },
      "u1",
    );
    expect(result).toEqual({ ok: true, uid: "u1", via: "ingest_key" });
  });

  it("rejects soft header in production strict mode", async () => {
    process.env.NODE_ENV = "production";
    process.env.MIMI_SOVEREIGN_STRICT_AUTH = "1";
    const result = await authorizeSovereignWrite(
      { headers: { "x-user-id": "u1" } },
      "u1",
    );
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.status).toBe(401);
  });

  it("resolves requester via verified session cookie", async () => {
    const verifySessionCookie = vi.fn(async () => ({ uid: "cookie-user" }));
    vi.mocked(getServerFirebaseAdmin).mockReturnValue({
      auth: { verifySessionCookie, verifyIdToken: vi.fn() },
      db: null,
    });
    const requester = await resolveSovereignRequesterUid({
      headers: { cookie: "__session=sess.token" },
    });
    expect(requester).toEqual({ uid: "cookie-user", via: "session_cookie" });
    expect(verifySessionCookie).toHaveBeenCalledWith("sess.token", true);
  });
});
