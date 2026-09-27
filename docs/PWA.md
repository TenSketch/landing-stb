# PWA

> Verified against `public/sw.js`, `public/manifest.json`, `public/index.html` as of commit `15e4184`.

## Service Worker

`public/sw.js` implements cache-first strategy for all non-API GET requests:

```javascript
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;  // Skip API
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request).then((res) => {
        // Cache-first: store response
        return caches.open('stb-v1').then((cache) => {
          cache.put(event.request, res.clone());
          return res;
        });
      })
    )
  );
});
```

## Manifest

`public/manifest.json` is essentially empty — only contains `{}`. The PWA is not properly configured.

**Required manifest fields missing:**
- `name`, `short_name`
- `start_url`
- `display`: `"standalone"`
- `icons` (multiple sizes including maskable)
- `theme_color`, `background_color`
- `orientation` or `scope`

## Installability

Without a proper manifest and HTTPS (required for service workers), the PWA cannot be installed on mobile devices.

## Known Issues

| Severity | Issue | Impact |
|----------|-------|--------|
| **High** | Service worker uses cache-first for all static assets | Users may run outdated JS/CSS after deployment |
| **High** | manifest.json is empty `{}` | PWA not installable |
| **Medium** | No offline fallback page | Offline users see blank/error |
| **Medium** | Service worker caches admin pages | Authenticated pages cached in shared cache |

## PWA in main.js

`public/src/main.js` does NOT register the service worker. The SW is served as a static file but `navigator.serviceWorker.register('/sw.js')` is not called anywhere in `main.js`.

This means the service worker is never activated.
