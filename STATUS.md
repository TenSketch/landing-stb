# STB Platform Hardening — Implementation Status

> Last updated: 2026-09-15
> Repository: `/home/bala/Desktop/WEBSITE_PROJECTS/landing-stb`

## What is done ✅

### Database
- All 8 migrations run successfully against `stb_dev`.
- Roles/permissions, admin users, customers, bookings lifecycle, drivers, vehicles, settings, integrations, audit logs, notification templates seeded.

### Auth & RBAC
- Admin password auth with first-time setup, login, logout, session, password reset, optional Super Admin OTP/2FA.
- Customer register/login/logout/profile/password reset/change password/booking history.
- Capability-based RBAC with roles SUPER_ADMIN, ADMIN, DISPATCHER, OPERATIONS, VIEWER.
- Secure sessions with HTTP-only cookies and token hashing.

### Core libraries
- `lib/security.js` (scrypt, tokens, OTP, encryption)
- `lib/ratelimit.js` (in-memory rate limiting)
- `lib/settings.js` (config getter/setter)
- `lib/audit.js` (immutable audit logging)
- `lib/providers/*.js` (base + email/SMS/WhatsApp/payment/Firebase/EFC abstractions)
- `lib/notifications.js` (notification engine)
- `lib/customerAuth.js`, `lib/auth.js`, `lib/rbac.js`, `lib/vehicles.js`, `lib/drivers.js`, `lib/integrations.js`, `lib/bookingStatus.js`

### API routes
- `lib/api.js` exposes admin dashboard, users/roles, settings, vehicles, drivers, pricing, bookings, notifications, integrations, audit logs, customer auth, profile, bookings.
- `server.js` serves public `/api/config` and mounts the new API router; legacy admin OTP endpoints preserved.

### Admin & Customer UI
- Admin SPA shell in `public/admin/` with app shell and manifest.
- Customer UI `public/index.html` has `data-dynamic` attributes and a loader script for brand/contact config.
- Customer account modal integrated into homepage; opens login/register/profile modal when clicking account icon.
- PWA service worker updated.

### Tests
- `scripts/smoke-test.js` created and passing: **16/16 passed**.
- `backend/tests/platform_hardening.test.js` added and passing: **10/10 passed**.
- `npm test` (pricing + auth/audit + platform hardening) passing: **21/21 total**.

### Browser checks
- Admin login → dashboard renders with all modules.
- Vehicles page loads category list correctly.
- Customer account icon opens login modal on homepage.

## What is partially done ⚠️

- Admin Panel UI deep CRUD: modules (roles, integrations, templates, pricing rules, driver assignment) have API routes and UI stubs; only vehicles and dashboard were manually exercised in the browser.
- Real provider credentials remain unconfigured.

## What is not done yet ❌

- Real payment/SMS/WhatsApp/Firebase/EFC provider credentials.
- Production `STB_SECRET_KEY` rotation.
- CSRF-token header enforcement (deferred; SameSite=Strict cookies currently used).
- SMTP configured (email still logs to console for local dev).

## Next todo list

1. ✅ Run `npm test` and fix regressions — **DONE**.
2. ✅ Create backend unit tests — **DONE**.
3. ✅ Manual browser checks for admin dashboard + vehicles, and customer account modal — **DONE**.
4. ✅ Integrate customer account modals into homepage — **DONE**.
5. ✅ Configure local SMTP/Google Maps placeholder state — **DONE** (placeholders in `integration_settings`).
6. ⚠️ Add CSRF protection — **DEFERRED**.
7. ✅ Final end-to-end smoke test — **DONE** (16/16 passed).
8. Push to `dev` branch — **READY**.

## Known limitations

- Provider secrets are encrypted at rest with `STB_SECRET_KEY` placeholder value; production needs a real 32-byte hex key.
- Payment/SMS/WhatsApp/Firebase/EFC vendors need real credentials entered via Admin Panel → Integrations.
- In-memory rate limiter; production multi-instance deployment needs Redis.
- SameSite=Strict session cookies require HTTPS for cross-site scenarios; local dev uses plain HTTP.

## Git status
All changes are local and uncommitted.
