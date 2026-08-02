// public/sw.js
// Production Service Worker for Mimi — careful with hashed /assets/*.
// Never cache HTML as JS/CSS (that causes 'text/html' is not a valid JavaScript MIME type).

const CACHE_NAME = "mimi-aesthetic-v3";

const PRECACHE_ASSETS = [
  "/",
  "/favicon.svg",
  "/favicon-32.png",
  "/apple-touch-icon.png",
  "/mimi-app-icon.png",
  "/mimi-header.png",
];

function isScriptOrStyle(requestUrl) {
  return (
    requestUrl.pathname.startsWith("/assets/") ||
    requestUrl.pathname.endsWith(".js") ||
    requestUrl.pathname.endsWith(".mjs") ||
    requestUrl.pathname.endsWith(".css")
  );
}

function contentTypeLooksLikeHtml(response) {
  const ct = (response.headers.get("content-type") || "").toLowerCase();
  return ct.includes("text/html");
}

function contentTypeOkForRequest(requestUrl, response) {
  if (contentTypeLooksLikeHtml(response)) return false;
  const ct = (response.headers.get("content-type") || "").toLowerCase();
  if (requestUrl.pathname.endsWith(".css")) return ct.includes("text/css");
  if (requestUrl.pathname.endsWith(".js") || requestUrl.pathname.endsWith(".mjs")) {
    return ct.includes("javascript") || ct.includes("ecmascript");
  }
  return true;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn("[Mimi SW] Pre-cache skipped some assets:", err);
        }),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log("[Mimi SW] Purging obsolete cache:", key);
              return caches.delete(key);
            }
            return undefined;
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);

  // Never intercept APIs, sockets, or HMR
  if (
    requestUrl.pathname.startsWith("/api/") ||
    requestUrl.pathname.includes("socket.io") ||
    requestUrl.pathname.includes("hmr")
  ) {
    return;
  }

  // Bypass SW entirely in local / ephemeral hosts
  if (
    requestUrl.hostname.includes("localhost") ||
    requestUrl.hostname.includes("127.0.0.1") ||
    requestUrl.hostname.includes("ais-dev") ||
    requestUrl.hostname.includes("ais-pre") ||
    requestUrl.hostname.includes("run.app")
  ) {
    return;
  }

  // Hashed build assets: network-only. Caching them risks serving a prior
  // deploy's chunk or (worse) an HTML SPA fallback with the wrong MIME.
  if (requestUrl.pathname.startsWith("/assets/")) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (contentTypeLooksLikeHtml(networkResponse)) {
          console.warn(
            "[Mimi SW] Refusing HTML response for asset:",
            requestUrl.pathname,
          );
          return new Response("Stale asset — reload required", {
            status: 404,
            statusText: "Stale Asset",
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
        return networkResponse;
      }),
    );
    return;
  }

  const isFont =
    requestUrl.hostname.includes("fonts.googleapis.com") ||
    requestUrl.hostname.includes("fonts.gstatic.com");
  const isShell =
    PRECACHE_ASSETS.includes(requestUrl.pathname) ||
    requestUrl.pathname === "/index.html" ||
    requestUrl.pathname.endsWith(".svg") ||
    requestUrl.pathname.endsWith(".png") ||
    requestUrl.pathname.endsWith(".jpg") ||
    requestUrl.pathname.endsWith(".webp");

  if (!isFont && !isShell) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (
              (networkResponse.status === 200 || networkResponse.status === 304) &&
              !contentTypeLooksLikeHtml(networkResponse) &&
              !isScriptOrStyle(requestUrl)
            ) {
              cache.put(event.request, networkResponse.clone());
            } else if (
              networkResponse.status === 200 &&
              contentTypeOkForRequest(requestUrl, networkResponse) &&
              !contentTypeLooksLikeHtml(networkResponse)
            ) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        // Prefer network for navigations / shell so deploys land quickly
        if (event.request.mode === "navigate") {
          return fetchPromise.then((r) => r || cachedResponse);
        }
        return cachedResponse || fetchPromise;
      }),
    ),
  );
});

self.addEventListener("message", (event) => {
  if (!event.data) return;

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (event.data.type === "PURGE_ALL_CACHES") {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))),
    );
    return;
  }

  if (event.data.type === "CONSOLE_ERROR_LOGGED") {
    const errorMsg = String(event.data.error || "");
    const looksStale =
      /mime type|dynamically imported module|loading chunk|chunkloaderror/i.test(
        errorMsg,
      );

    console.warn("[Mimi SW Self-Healing] Runtime signal:", errorMsg);

    event.waitUntil(
      (async () => {
        if (looksStale) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
          console.log("[Mimi SW Self-Healing] Purged all caches after stale-asset signal");
        } else {
          const cache = await caches.open(CACHE_NAME);
          const requests = await cache.keys();
          await Promise.all(
            requests
              .filter(
                (req) =>
                  req.url.includes("/components/") ||
                  req.url.includes("/services/") ||
                  req.url.includes("/assets/"),
              )
              .map((req) => cache.delete(req)),
          );
        }

        if (event.source) {
          event.source.postMessage({
            type: "SELF_HEALING_CORRECTION",
            originalError: errorMsg,
            purgedAll: looksStale,
            timestamp: Date.now(),
          });
        }
      })(),
    );
  }
});
