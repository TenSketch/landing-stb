# Performance & Caching

## Known Issues

| Severity | Issue | Location | Impact |
|----------|-------|----------|--------|
| **High** | `refreshProviders()` called on every notification | `lib/notifications.js:62-73` | DB round-trip per notification; collapse under load |
| **High** | Dashboard endpoint loads ALL bookings then filters in JS | `lib/api.js:137-148` | Memory exhaustion on large datasets |
| **High** | `listAllBookings()` hardcoded LIMIT 100 | `lib/store.js:137` | No pagination for large booking tables |
| **Medium** | No template caching in notifications | `lib/notifications.js:80-88` | Repeated DB queries for same templates |
| **Medium** | No pricing config caching | `lib/pricing.js:46` | Every fare calculation fetches all pricing config |
| **Medium** | No settings caching | `lib/settings.js` | Every `getSetting` call hits DB |
| **Low** | Slow query log logs full SQL text | `lib/db.js:44-46` | Could leak sensitive data in params |
| **Low** | Service worker cache-first for all non-API GETs | `public/sw.js` | Stale JS/CSS after deployment |
| **Low** | No Google Routes API response caching | `lib/api.js` | Repeated same-route calls billed by Google |

## Recommendations

1. Cache provider config and templates with 60s TTL
2. Add `LIMIT/OFFSET` to all list endpoints
3. Filter bookings at DB level with `WHERE` clauses
4. Use network-first for HTML/JS/CSS in service worker
5. Add Redis for shared cache (if scaling beyond single-node)

## CLS (Cumulative Layout Shift)

- Image elements missing explicit `width`/`height` attributes
- Vehicle cards may shift as images load
- Font loading may cause FOUT/FOIT

## Bundle Size

- Tailwind CSS loaded from CDN (`https://cdn.tailwindcss.com`) not compiled
- No tree-shaking evident
- `main.js` is large (~3000+ lines) — consider code splitting
