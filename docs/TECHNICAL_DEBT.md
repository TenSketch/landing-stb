# Technical Debt

## Critical Debt

| # | Item | Location | Impact | Fix Effort |
|---|------|----------|--------|------------|
| 1 | XSS in `renderAssignPage` | `lib/handlers.js:370-451` | Arbitrary JS execution | Low — add escapeHtml() calls |
| 2 | In-memory rate limiter | `lib/ratelimit.js` | Multi-node bypass | Medium — add Redis or middleware |
| 3 | Cannot clear driver fields | `lib/store.js:updateBooking` | GDPR violation | Low — fix COALESCE logic |
| 4 | Provider placeholders (SMS/WhatsApp/Payment/FCM) | `lib/providers/*.js` | Notifications don't work | High — needs real provider impl |
| 5 | Empty manifest.json | `public/manifest.json` | PWA not installable | Low — add proper manifest |
| 6 | SW never registered | `public/src/main.js` | PWA features inactive | Low — add SW registration |

## High Debt

| # | Item | Location | Impact | Fix Effort |
|---|------|----------|--------|------------|
| 7 | `createRole` not transactional | `lib/rbac.js:162-172` | Inconsistent role-permission | Low — add BEGIN/COMMIT |
| 8 | `assignDriver` not transactional | `lib/bookingStatus.js:94-125` | Inconsistent booking state | Low — add BEGIN/COMMIT |
| 9 | Audit log failure swallowed | `lib/audit.js:72-74` | Undetected audit gaps | Low — log + metric |
| 10 | OTP race condition | `lib/auth.js:148-152` | Brute-force possible | Low — atomic UPDATE |
| 11 | `refreshProviders()` per notification | `lib/notifications.js:62-73` | Performance collapse | Low — add TTL cache |
| 12 | Dashboard loads all bookings | `lib/api.js:137-148` | Memory exhaustion | Low — add WHERE filter |
| 13 | Hardcoded domain fallbacks | `server.js:26-29` | Cookie domain attack | Low — fail-fast on missing env |
| 14 | `referer` used directly | `lib/api.js:247` | Open redirect risk | Low — use fixed referer |
| 15 | Silent catch blocks in admin SPA | `public/admin/app.js` | UX failure — no error feedback | Low — add showToast() |
| 16 | Wrong element IDs for date/time | `public/src/main.js:2576,2623,2680` | Time-based pricing broken | Low — fix ID selectors |
| 17 | Driver assign uses `window.prompt()` | `public/admin/app.js:383-391` | No driver validation | Medium — dropdown from API |
| 18 | `escapeHtml` incomplete (4 chars) | `public/admin/app.js:17` | XSS risk in admin | Low — use DOMPurify |
| 19 | No idempotency key on booking | `public/src/main.js` | Duplicate bookings | Medium — add idempotency token |
| 20 | WhatsApp number in 4 places | `main.js`, `index.html`, `handlers.js` | Maintenance risk | Low — centralize in settings |
| 21 | OTP printed to console | `lib/auth.js:123-125` | Security risk if enabled prod | Low — remove console.log |

## Medium Debt

| # | Item | Location | Impact | Fix Effort |
|---|------|----------|--------|------------|
| 22 | No CSRF token | API handlers | CSRF risk | Medium — sameSite=strict + token |
| 23 | `sameSite: "lax"` in prod | `lib/api.js:44` | CSRF possible | Low — use "strict" |
| 24 | Migration no version tracking | `scripts/migrate.js` | Non-idempotent migrations | Low — add migrations table |
| 25 | No pagination on list endpoints | `lib/api.js`, `lib/store.js` | Performance | Low — add LIMIT/OFFSET |
| 26 | `getCustomerDeviceTokens` never populated | `lib/notifications.js:166-173` | Push notifications broken | Medium — FCM permission flow |
| 27 | Admin module not implemented (Customers, Drivers, Notifications, Payments) | `public/admin/app.js` | Missing features | High |
| 28 | Static exchange rates never updated | `public/src/main.js:52-60` | Wrong non-SGD prices | Low — fetch from API |
| 29 | Password reset token in URL | `public/admin/reset-password.html` | Token logged in logs | Medium — use POST body |
| 30 | Dual admin SPA (admin.js + app.js) | `public/admin/` | Maintenance confusion | Medium — remove admin.js |
| 31 | `selectCalendarDate` global function | `public/src/main.js:1133-1152` | Fragile pattern | Low — addEventListener |
| 32 | Currency decimal precision | `public/src/main.js:315-321` |显示 Incorrect prices | Low — use toFixed(2) |
| 33 | Phone validation too permissive | `public/src/main.js:1710` | Invalid WhatsApp links | Low — regex validation |
| 34 | No input maxLength enforcement | `public/src/main.js` | DB overflow / long WhatsApp URLs | Low — add maxLength |
| 35 | Content block SQL interpolation | `lib/api.js:248-259` | Potential SQL injection | Low — parameterized query |
| 36 | `deleteAdminUser` allows initial admin delete | `lib/rbac.js:254` | Bootstrap account deletable | Low — fix COALESCE guard |

## Low Debt

| # | Item | Location | Impact | Fix Effort |
|---|------|----------|--------|------------|
| 37 | `STB_SECRET_KEY` weak example | `.env.example:30` | Weak default if not changed | Low — better example |
| 38 | nginx missing security headers | `deploy/nginx.conf` | Missing browser protections | Low — add headers |
| 39 | `rejectUnauthorized: false` for PG SSL | `lib/db.js:25` | MITM on SSL | Low — use true |
| 40 | `formatCurrency` JPY/INR vs others | `public/src/main.js:315-321` | Wrong decimal handling | Low — Intl.NumberFormat |
| 41 | No `aria-label` on terminal dropdown | `public/src/main.js` | Accessibility | Low |
| 42 | `initServiceGrid` no JSON error catch | `public/src/main.js:2190-2214` | Silent failure | Low — add catch |
| 43 | Analytics hardcoded fallback GA4 ID | `public/src/analytics.js:13` | Events to wrong property | Low |
| 44 | Booking timer client-side only | `public/src/main.js:1279-1314` | Timer can be bypassed | None — document |
| 45 | No offline page | `public/` | Blank offline | Low — add offline.html |
| 46 | Super Admin implicit `*` permission | `lib/auth.js:94-97` | Over-privileged | Low — enumerate explicitly |
| 47 | `all_permissions` role has `slug === 'SUPER_ADMIN'` hardcode | `lib/auth.js` | Maintenance | Low — use DB role |
