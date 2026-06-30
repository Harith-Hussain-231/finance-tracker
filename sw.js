/* wc-planner service worker.
   Strategy: NETWORK-FIRST for the app, cache fallback for offline.
   - Online: always fetches the latest files, so updates show immediately on reload.
   - Offline: serves the last cached copy, so the app still works with no connection.
   You normally do NOT need to bump CACHE_VERSION anymore — network-first means updates
   appear on their own. Bump it only if you want to force-clear the offline cache. */
const CACHE_VERSION = 'wc-planner-v24';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap'
];

// Install: pre-cache the app shell so it works offline straight away, then take over.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: drop old caches, claim open pages immediately.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: NETWORK-FIRST. Try the network; if it succeeds, use it AND refresh the cache.
// If the network fails (offline), fall back to whatever's cached.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then((response) => {
      // Got a fresh copy online — cache it for offline use, then return it.
      if (response && response.status === 200) {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }).catch(() =>
      // Offline (or fetch failed) — serve the cached copy if we have one.
      caches.match(event.request).then((cached) => cached || caches.match('./index.html'))
    )
  );
});
