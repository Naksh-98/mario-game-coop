// Minimal service worker — required for PWA installability.
// Uses a network-first strategy so the game and multiplayer always get fresh data,
// while still allowing the app to be installed to the home screen.

const CACHE = 'mario-coop-v1';
const PRECACHE = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Never cache socket.io / API / audio streaming — always go to network
  const url = new URL(req.url);
  if (
    req.method !== 'GET' ||
    url.pathname.startsWith('/socket.io') ||
    url.pathname.startsWith('/api')
  ) {
    return; // let the browser handle it normally
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Cache a copy of successful same-origin GETs
        if (res && res.status === 200 && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('/')))
  );
});
