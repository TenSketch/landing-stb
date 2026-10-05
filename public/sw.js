// STB Singapore — Service Worker (PWA)
// v3 (2026-10-05): the old v2 was cache-first for EVERYTHING (including
// cross-origin Google Fonts) with an unversioned cache — one bad fetch got
// pinned in Cache Storage forever and clearing the browser cache did not
// remove it. Now:
//   - cross-origin requests (fonts, GA, CDNs) are NEVER handled/cached here
//   - HTML + JS + CSS are network-first (fresh content on every load,
//     cache only as offline fallback)
//   - bump CACHE_NAME on deploy -> old caches purged on activate
const CACHE_NAME = 'stb-v3';
const PRECACHE = [
  '/',
  '/index.html',
  '/src/tailwind.css',
  '/src/styles.css',
  '/src/customer-app.js',
  '/stb-logo.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never intercept cross-origin (Google Fonts, analytics, image CDNs):
  // let the browser HTTP cache handle them — a poisoned SW cache here is
  // exactly what "cleared cache but icons still broken" looks like.
  if (url.origin !== self.location.origin) return;

  // APIs: always straight to network.
  if (url.pathname.startsWith('/api/')) return;

  const isFresh = event.request.mode === 'navigate'
    || url.pathname === '/'
    || url.pathname === '/index.html'
    || /\.(js|css)$/.test(url.pathname);

  if (isFresh) {
    // Network-first: users always get the latest deploy; cache as fallback.
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || Response.error()))
    );
    return;
  }

  // Static media (images, manifest): cache-first with network fill.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
        return res;
      }).catch(() => cached);
    })
  );
});
