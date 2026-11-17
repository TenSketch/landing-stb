# STB Progressive Web App (PWA) Audit

**Revalidated:** 2026-10-15  
**Current source:** `public/index.html`, `public/manifest.json`, `public/sw.js`, `public/admin/index.html`, `public/admin/manifest.json`

## Current implementation

### Customer app

- `public/index.html` links `/manifest.json`.
- The customer entry page contains a call to `navigator.serviceWorker.register('/sw.js')`.
- `public/manifest.json` is populated with app name, short name, description, `start_url: "/"`, `display: "standalone"`, scope, theme/background colors, portrait orientation, icons, shortcuts and a screenshot.
- `public/sw.js` currently uses cache name `stb-v3`.
- Cross-origin resources (including Google Fonts/CDNs/analytics) are not intercepted by the service worker.
- API requests are not intercepted/cached.
- Navigations and HTML/JS/CSS are network-first, with cache fallback if the network fails.
- Static media uses cache-first with network fill.
- Activation removes old caches whose names differ from the current cache.

### Admin app

- `public/admin/index.html` links `/admin/manifest.json`.
- The admin has a separate manifest under the admin path, but its entry HTML has no visible `navigator.serviceWorker.register(...)` call.
- The admin subdomain is a different origin from the customer app, so a service worker registered on the customer origin does not control the admin origin.
- Admin installation, offline behavior and update behavior have not been demonstrated by the isolated CI suite.

## Remaining risks and work

| Priority | Item | Required verification |
|---|---|---|
| High | Admin PWA service-worker registration | Decide whether admin needs install/offline support; if yes, add an admin-origin registration with a safe scope and test it |
| Medium | No dedicated offline page is listed in the customer service-worker precache | Verify offline navigation fallback and add an explicit offline page if needed |
| Medium | Install metadata references the same logo for multiple icon sizes | Verify actual image dimensions, maskable-safe padding and install prompts on devices |
| Medium | Service-worker update behavior | Test update while open, waiting worker activation and cache cleanup on real supported browsers |
| Medium | Authenticated admin data must never be cached on the customer origin | Keep the origins isolated and verify no private responses are cached |
| Medium | Offline booking submission | Clearly state that a booking was not submitted when offline; never queue/replay a booking silently |

## Required device/browser checks

1. Install customer PWA on Android Chrome and iOS Safari where supported.
2. Verify launch URL, standalone display, icons and orientation.
3. Load once online, go offline, navigate to a previously visited page and a new page.
4. Confirm API calls fail clearly while offline and no false booking success appears.
5. Deploy a new asset version and verify the app updates without stale JS/CSS.
6. Check the service-worker controller and cache contents; no customer booking POST should be cached or replayed.
7. Repeat separately on the admin origin if admin PWA is in scope.

## Current QA evidence

The isolated CI run on commit `cdb645af4b35a1d81542e2a3516909108c349c9c` passed the HTTP E2E/security harness, but it did not run a real browser install/offline matrix. See [QA report 2026-10-15](QA-REPORT-2026-10-15.md). Browser/device validation remains open.
