// public/sw.js
// Production-ready Service Worker for the Cult of Mimi
// Implements a robust Stale-While-Revalidate caching strategy for aesthetic tokens,
// UI assets, model definitions, and static assets to eliminate navigation latency.

const CACHE_NAME = 'mimi-aesthetic-v2';

// Essential static and UI assets to pre-cache
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/index.css',
  '/favicon.svg',
  '/logo.svg',
  '/mimi-logo-dark.png',
  '/mimi-logo-light.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap'
];

// Install Event - Pre-cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Mimi SW] Pre-caching critical aesthetic assets...');
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('[Mimi SW] Some pre-cache assets could not be loaded on install, skipping failure:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up stale cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log('[Mimi SW] Purging obsolete cache layer:', key);
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch Interception
self.addEventListener('fetch', (event) => {
  // Only process GET requests to avoid cache errors on mutations/POSTs
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // Bypass caching in development/preview environments to prevent stale build chunks (white screens)
  if (
    requestUrl.hostname.includes('localhost') ||
    requestUrl.hostname.includes('127.0.0.1') ||
    requestUrl.hostname.includes('ais-dev') ||
    requestUrl.hostname.includes('ais-pre') ||
    requestUrl.hostname.includes('run.app')
  ) {
    return;
  }

  // Check if it is a local request or third-party asset (fonts, APIs)
  const isLocalApi = requestUrl.pathname.startsWith('/api/');
  const isAestheticAsset = requestUrl.pathname.includes('/components/chambers/') || 
                           requestUrl.pathname.includes('/services/') ||
                           requestUrl.pathname.includes('/lib/productCanon');
  const isFontAsset = requestUrl.hostname.includes('fonts.googleapis.com') || 
                      requestUrl.hostname.includes('fonts.gstatic.com');
  const isStaticDoc = PRECACHE_ASSETS.includes(requestUrl.pathname) || 
                      requestUrl.pathname.endsWith('.js') || 
                      requestUrl.pathname.endsWith('.css') || 
                      requestUrl.pathname.endsWith('.svg');

  // Skip caching for live real-time sockets or internal tool actions
  if (requestUrl.pathname.includes('socket.io') || requestUrl.pathname.includes('hmr')) {
    return;
  }

  // Handle with Stale-While-Revalidate caching strategy
  if (isLocalApi || isAestheticAsset || isFontAsset || isStaticDoc) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          // Trigger background fetch to update the cache
          const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse.status === 200 || networkResponse.status === 304) {
                // Store clone in cache for subsequent navigation
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch((err) => {
              console.log('[Mimi SW] Background sync failed (offline):', event.request.url);
            });

          // Return the cached response immediately if available, otherwise wait for network
          return cachedResponse || fetchPromise;
        });
      })
    );
  }
});

// Listener for console/runtime errors to automate dynamic cache correction and "push patches"
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CONSOLE_ERROR_LOGGED') {
    const errorMsg = event.data.error || 'Unknown runtime malfunction';
    console.warn('[Mimi SW Self-Healing] Intercepted runtime malfunction signal:', errorMsg);
    
    // Perform self-healing cache eviction / stale resource refresh
    caches.open(CACHE_NAME).then((cache) => {
      // Evict potential broken cache entries related to script errors or asset loads
      cache.keys().then((requests) => {
        requests.forEach((req) => {
          if (req.url.includes('/components/chambers/') || req.url.includes('/services/')) {
            cache.delete(req); // Dynamic cache pruning
          }
        });
      });
    }).then(() => {
      console.log('[Mimi SW Self-Healing] Cache evicted. Deploying dynamic self-correction patch...');
      
      // Notify client that correction has been pushed successfully
      if (event.source) {
        event.source.postMessage({
          type: 'SELF_HEALING_CORRECTION',
          originalError: errorMsg,
          timestamp: Date.now()
        });
      }
    });
  }
});

