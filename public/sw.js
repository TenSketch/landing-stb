// Service Worker for STB Singapore
// Minimal native caching strategy: network-first for pages/api, cache-first for static assets
const CACHE_NAME = 'stb-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/stb-logo.png',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass cache for POST/PUT requests and API endpoints
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api') || url.pathname.startsWith('/booking')) {
    return;
  }

  // Network First for HTML and unknown assets, falling back to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for GET requests
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(event.request);
      })
  );
});
