import type { Request, Response, NextFunction } from "express";
import { FIREBASE_AUTH_HELPER_ORIGIN } from "./resolveAuthDomain.js";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

async function readRawBody(req: Request): Promise<Buffer | undefined> {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body);
  if (req.body != null && Object.keys(req.body).length > 0) {
    return Buffer.from(JSON.stringify(req.body));
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

/**
 * Transparent reverse proxy for Firebase Auth helper pages.
 * Required so custom domains can use same-site authDomain with redirect sign-in.
 */
export async function proxyFirebaseAuthHelpers(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const targetUrl = `${FIREBASE_AUTH_HELPER_ORIGIN}${req.originalUrl}`;
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (!value || HOP_BY_HOP.has(key.toLowerCase())) continue;
      if (Array.isArray(value)) headers.set(key, value.join(","));
      else headers.set(key, value);
    }
    headers.set("host", "mimistudios.firebaseapp.com");

    const body = await readRawBody(req);
    const init: RequestInit = {
      method: req.method,
      headers,
      redirect: "manual",
      body: body && body.length ? new Uint8Array(body) : undefined,
    };

    const upstream = await fetch(targetUrl, init);
    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (HOP_BY_HOP.has(key.toLowerCase())) return;
      if (key.toLowerCase() === "location") {
        try {
          const loc = new URL(value, FIREBASE_AUTH_HELPER_ORIGIN);
          if (loc.origin === FIREBASE_AUTH_HELPER_ORIGIN) {
            res.setHeader("location", `${loc.pathname}${loc.search}${loc.hash}`);
            return;
          }
        } catch {
          /* keep original */
        }
      }
      res.setHeader(key, value);
    });

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (error) {
    console.error("MIMI // Firebase auth helper proxy failed:", error);
    res.status(502).send("Auth helper proxy unavailable.");
  }
}
