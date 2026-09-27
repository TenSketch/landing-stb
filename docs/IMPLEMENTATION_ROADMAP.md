# Implementation Roadmap

> Based on Phase 1 audit findings. Ordered by severity and dependency.

## Phase 2 — Architecture & Code Quality

**Priority**: Fix the most dangerous code-level bugs before adding features.

### Must Fix (Critical Security/Safety)
- [ ] Fix XSS in `renderAssignPage` — escape all user-supplied fields (`lib/handlers.js:370-451`)
- [ ] Fix `escapeHtml` in admin SPA — use DOMPurify or complete encoder (`public/admin/app.js:17`)
- [ ] Fix `updateBooking` COALESCE — allow NULL clearing for driver fields (`lib/store.js:109-119`)
- [ ] Fix `createRole` transaction — wrap in BEGIN/COMMIT (`lib/rbac.js:162-172`)
- [ ] Fix `assignDriver` transaction — wrap in BEGIN/COMMIT (`lib/bookingStatus.js:94-125`)
- [ ] Fix OTP race condition — atomic compare-and-increment (`lib/auth.js:148-152`)
- [ ] Audit log failure — log to console.error, don't swallow (`lib/audit.js:72-74`)
- [ ] `requirePermission` audit log failure — add console.error (`lib/api.js:120-124`)

### Should Fix (High Priority)
- [ ] Fail-fast on missing `ROOT_DOMAIN` — throw instead of fallback (`server.js:26`)
- [ ] `referer` → fixed internal referer in Google Routes call (`lib/api.js:247`)
- [ ] Remove OTP console.log (`lib/auth.js:123-125`)
- [ ] `refreshProviders()` cache — add TTL cache (`lib/notifications.js:62-73`)
- [ ] Dashboard filter at DB level — remove JS filter (`lib/api.js:137-148`)
- [ ] Hardcode WhatsApp number → centralize in settings (4 places)
- [ ] Fix wrong element IDs for date/time inputs (`public/src/main.js:2576,2623,2680`)
- [ ] Replace `window.prompt()` driver assign — searchable dropdown (`public/admin/app.js:383-391`)

### Code Quality
- [ ] Add LIMIT/OFFSET pagination to all list endpoints
- [ ] Add `schema_migrations` tracking table to migrations
- [ ] Remove deprecated `public/admin/admin.js` (or confirm it's never loaded)
- [ ] Add `aria-label` and keyboard nav to terminal dropdown
- [ ] Fix `formatCurrency` decimal precision (`toFixed(2)`)
- [ ] Add phone validation regex
- [ ] Add `maxLength` to booking form inputs

---

## Phase 3 — Admin Platform Completeness

**Depends on**: Phase 2 critical fixes.

### Missing Admin Modules
- [ ] Customers — list, detail, booking history (`/admin/customers`)
- [ ] Drivers — list, add, edit, deactivate (`/admin/drivers`)
- [ ] Notifications — template editor (subject/body fields) (`/admin/notifications`)
- [ ] Payments — scope TBD (transaction history? refund?)

### Admin Module Improvements
- [ ] Add error feedback to all catch blocks (`showToast()`)
- [ ] Booking detail view — expand from list-only
- [ ] Pricing rules — edit existing rules (currently add-only)
- [ ] Settings — validate inputs before save

---

## Phase 4 — Customer Website & UX/UI

**Depends on**: Phase 2.

### Customer Booking Fixes
- [ ] Fix date/time input IDs — time-based pricing will work
- [ ] Add idempotency key to booking submission
- [ ] Fix booking submission silent failure — show explicit error when `data.booking` missing
- [ ] Improve email regex validation
- [ ] Fix phone validation

### UX Improvements
- [ ] Consistent typography/spacing/colors (design token audit)
- [ ] Loading skeletons instead of blank spaces
- [ ] Empty states for search/filter results
- [ ] Better error messages throughout
- [ ] Responsive mobile/tablet layout review

---

## Phase 5 — First-Load Glitches & Performance

**Depends on**: Phase 2.

### Glitch Fixes
- [ ] Register service worker in `main.js` (`navigator.serviceWorker.register('/sw.js')`)
- [ ] Fix service worker — network-first for HTML/JS/CSS (not cache-first)
- [ ] Add proper `manifest.json` with name/icons/theme/display
- [ ] Add offline.html fallback page
- [ ] Investigate initial render glitch — check JS loading order, runtime Tailwind

### Performance
- [ ] Add pagination to admin booking list
- [ ] Add index on `booking_status_history.booking_id`
- [ ] Add index on `admin_sessions.token_hash`
- [ ] Cache pricing config (60s TTL)
- [ ] Cache templates (60s TTL)
- [ ] Add index on `customer_sessions.token_hash`
- [ ] Reserve image dimensions to reduce CLS
- [ ] Lazy-load non-critical images

---

## Phase 6 — Database, Caching & Storage

**Depends on**: Phase 2.

### localStorage/sessionStorage Audit
- [ ] Search entire codebase for `localStorage` / `sessionStorage` usage
- [ ] Remove inappropriate application data storage
- [ ] Confirm auth cookies are HTTP-only (they are)
- [ ] PWA cache strategy review — don't cache authenticated pages

### DB Improvements
- [ ] Migration idempotency — add `schema_migrations` table
- [ ] Add missing indexes (see DATABASE.md)
- [ ] Consolidate `sort_order` vs `display_order` in `vehicle_types`

---

## Phase 7 — Customer Auth & RBAC

**Depends on**: Phase 2.

### Auth Fixes
- [ ] `SUPER_ADMIN` explicit permissions (not `*`) (`lib/auth.js:94-97`)
- [ ] Password reset token via POST body (not URL param)
- [ ] `sameSite: "strict"` for production auth cookies
- [ ] Implement CSRF token (or confirm `strict` sameSite is sufficient)
- [ ] `deleteAdminUser` fix — guard initial admin properly

### Customer Auth Completion
- [ ] Email verification flow (token + verify endpoint)
- [ ] Customer profile editing
- [ ] Customer booking history + upcoming/completed/cancelled filters

---

## Phase 8 — Booking, Pricing & Dispatch

**Depends on**: Phase 3 (admin modules).

### Booking Completeness
- [ ] Idempotency key on booking submission
- [ ] Server-side pricing session/lock (price valid for N minutes)
- [ ] Proper duplicate booking detection
- [ ] Booking timer server-side enforcement (if needed)

### Dispatch
- [ ] Driver search/autocomplete dropdown (not prompt)
- [ ] Driver-vehicle assignment validation
- [ ] Booking status history audit trail (already partially implemented)

---

## Phase 9 — Google Maps

**Depends on**: Phase 2.

- [ ] Fix `referer` usage — use fixed internal referer
- [ ] Add Places Autocomplete to admin pricing rule editor
- [ ] Add server-side timeout for Routes API call
- [ ] Consider caching Routes API responses (short TTL)

---

## Phase 10 — PWA & Notifications

**Depends on**: Phase 5 (SW registration), Phase 3 (admin modules).

### PWA
- [ ] Service worker registration in `main.js`
- [ ] Proper `manifest.json`
- [ ] Network-first strategy for HTML/JS/CSS
- [ ] Offline.html fallback
- [ ] Maskable icons

### Firebase Push
- [ ] FCM permission flow in customer frontend
- [ ] `getCustomerDeviceTokens` population on permission grant
- [ ] Actual FCM send implementation in `lib/providers/firebase.js`

---

## Phase 11 — Security & Production Readiness

**Depends on**: All previous phases.

### Security Review
- [ ] Run `npm audit` for dependency vulnerabilities
- [ ] Penetration test (out of scope for this implementation)
- [ ] Security headers completeness
- [ ] Input validation audit — all endpoints
- [ ] Rate limiting review — all auth endpoints

### Production
- [ ] PM2 or systemd unit file
- [ ] PostgreSQL backup strategy
- [ ] Log rotation
- [ ] Health check endpoint (`/health`)
- [ ] Graceful shutdown
- [ ] Connection pool tuning

---

## Phase 12 — Testing

**Depends on**: Phase 2 (code quality fixes).

### Test Files to Create
- [ ] `backend/tests/rbac.test.js`
- [ ] `backend/tests/customer_auth.test.js`
- [ ] `backend/tests/booking_lifecycle.test.js`
- [ ] `backend/tests/dynamic_settings.test.js`
- [ ] `backend/tests/notification_engine.test.js`
- [ ] `backend/tests/security_boundaries.test.js`

### Validation
- [ ] `npm test` passes all existing + new tests
- [ ] `node --check` on all modified files
- [ ] No unused dependencies

---

## Estimated Effort

| Phase | Fix Count | High Priority |
|-------|-----------|---------------|
| Phase 2 | 21 items | 12 |
| Phase 3 | 7 items | 3 |
| Phase 4 | 6 items | 2 |
| Phase 5 | 9 items | 3 |
| Phase 6 | 4 items | 1 |
| Phase 7 | 6 items | 3 |
| Phase 8 | 5 items | 2 |
| Phase 9 | 4 items | 1 |
| Phase 10 | 9 items | 2 |
| Phase 11 | 7 items | 1 |
| Phase 12 | 8 items | 0 |

**Total: ~86 items across 12 phases**

Recommended: Start Phase 2 immediately (critical bugs). Phases 3-5 in parallel where dependencies allow.
