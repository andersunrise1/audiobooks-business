// Dia 73-74: hand-written, zero-build-step service worker. Lives in public/
// (Vite copies it verbatim, no bundling) rather than using vite-plugin-pwa's
// default generateSW/injectManifest strategies - both spin up a separate
// classic-Rollup build internally to bundle the worker script, which this
// dev machine's Windows Application Control policy blocks (a native
// @rollup/rollup-win32-x64-msvc binary, unrelated to this app's own code).
// Trade-off, stated honestly: no exact precache list of this build's hashed
// filenames (that needs the build-time manifest injection this environment
// can't produce) - instead, a runtime "cache what's actually been visited"
// strategy, which is a legitimate, common SW pattern on its own, just a
// different one. Deliberately does not touch /api/* (auth/progress/AI
// responses must always be fresh) or audio files (external storage, could
// be large - packages/desktop already owns real offline audio caching).
const CACHE_NAME = 'techspeak-shell-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add('/')));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

function isCacheable(request) {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith('/api/')) return false;
  return true;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!isCacheable(request)) return;

  // Navigations (loading a page/route): network-first, so a user online
  // always gets the current app shell, falling back to the last cached
  // version if the network fails.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/'))),
    );
    return;
  }

  // Hashed static assets (JS/CSS chunks, icons): content-hashed filenames
  // are immutable, so cache-first is safe and fast, with a network fallback
  // that also populates the cache for next time.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }),
    ),
  );
});
