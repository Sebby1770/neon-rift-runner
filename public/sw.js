/* Neon Rift Runner — minimal offline shell cache */

/*
 * Must match the version in package.json — src/game/__tests__/sw.test.js fails
 * the build if it drifts.
 *
 * `activate` deletes every cache whose key is not this one, so the name is the
 * only thing that evicts stale assets. It was left at v2.1.0 through the 2.2.0
 * release, which meant the old cache was never purged and installed players kept
 * being served 2.1.0 files.
 */
const CACHE = 'neon-rift-v2.2.0';
const SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

function cachePut(request, response) {
  if (response && response.ok && request.url.startsWith(self.location.origin)) {
    const clone = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, clone)).catch(() => {});
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Navigations go to the network first, falling back to cache offline. Serving
  // index.html cache-first pinned installed players to whichever build they
  // first loaded: the HTML names the hashed asset bundles, so a stale shell
  // keeps pulling stale JS even after a deploy.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => cachePut(request, response))
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html'))),
    );
    return;
  }

  // Everything else is content-hashed by the build, so cache-first with a
  // background refresh is safe and keeps the game responsive offline.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => cachePut(request, response))
        .catch(() => cached);
      return cached || network;
    }),
  );
});
