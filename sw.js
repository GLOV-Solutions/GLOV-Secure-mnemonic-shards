// Minimal offline-only service worker
// - Precaches root on install; then dynamically caches all same-origin GETs on first use
// - Serves same-origin from cache (or network then caches)
// - Blocks all cross-origin requests with 403

const CACHE_NAME = 'offline-cache-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.add('/').catch(() => undefined)) // best-effort root precache
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? undefined : caches.delete(k))))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Block any external (cross-origin) requests
  if (url.origin !== self.location.origin) {
    event.respondWith(new Response('Forbidden', { status: 403 }));
    return;
  }

  // For same-origin non-GET, just pass-through (no caching)
  if (req.method !== 'GET') {
    event.respondWith(fetch(req));
    return;
  }

  // For HTML navigations, prefer network to avoid stale app shell after deploys.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(async (res) => {
          const cache = await caches.open(CACHE_NAME);
          if (res && res.ok) await cache.put(req, res.clone());
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(req);
          const root = await cache.match('/');
          return cached || root || new Response('Offline', { status: 503 });
        })
    );
    return;
  }

  // Cache-first for same-origin GET assets; network fallback then cache
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      } catch (e) {
        // Offline fallback: try cached root, else 503
        const root = await cache.match('/');
        return root || new Response('Offline', { status: 503 });
      }
    })
  );
});
