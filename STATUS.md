# STB Singapore Tour Booking — Platform Status

> Last updated: 2026-09-27 (commit `15e4184`)
> Repository: https://github.com/TenSketch/landing-stb
> Production: Node.js + Express on Hetzner VPS, PostgreSQL

---

## What's Implemented

### Architecture
- **Subdomain routing**: `admin.*` → Admin SPA, `api.*` → REST API, root → Customer landing
- **Single Express process** on VPS port 3003, Nginx reverse-proxies subdomains
- **Cookie-based auth**: HTTP-only, `sameSite=lax`, cross-subdomain for `.singaporetourbooking.com`
- **10 migrations** (001–010) creating: places, vehicle_types, drivers, roles, permissions, admin_users, admin_sessions, password_reset_tokens, customers, customer_sessions, customer_device_tokens, bookings, booking_status_history, pricing_rules, vehicle_route_overrides, surcharges, system_settings, booking_settings, notification_settings, notification_templates, integration_settings, content_blocks, audit_logs

### Auth & RBAC
- Admin password login + session + optional OTP 2FA for Super Admin
- Password reset flow (token via email link)
- Customer register/login/logout/profile/booking history
- 5 roles: SUPER_ADMIN, ADMIN, DISPATCHER, OPERATIONS, VIEWER
- Capability-based permissions (`module.action` pattern)
- Rate limiting on login/OTP/password reset
- Immutable audit log for security events

### Admin SPA (`public/admin/app.js`)
- Dashboard (stats cards + recent bookings)
- Bookings (list + status change + driver assign)
- Vehicles (full CRUD: image, features, fares, slug, category, tag)
- Pricing (rules + route overrides + surcharges)
- Content (FAQ/services/hero/footer dynamic blocks)
- Settings (general + booking + notification)
- Integrations (payment/SMS/WhatsApp/email/Firebase/EFC)
- Users & Roles (role editor + user CRUD)
- Audit Logs (filterable)
- Mobile-responsive sidebar drawer

### Customer Website (`public/src/main.js`)
- Dynamic content from `/api/config` and `/api/content`
- Vehicle catalog from `/api/vehicles`
- Booking form: one-way / hourly / daily
- Google Places Autocomplete for pickup/destination
- Server-calculated fare estimates
- Booking confirmation with WhatsApp fallback
- Guest checkout (no account required)
- Customer account modal (login/register/profile)
- Booking history (authenticated customers)

### API Endpoints
- Public: `/api/config`, `/api/vehicles`, `/api/content`, `/api/estimate`, `/api/bookings`
- Admin: auth, dashboard, bookings, vehicles, drivers, pricing, content, settings, integrations, users, roles, audit
- Customer: register, login, logout, me, bookings, password reset

### Integrations (partial)
- Email: Nodemailer + SMTP — actually sends
- SMS/WhatsApp/Payment/Firebase/EFC: placeholders (logs only)
- Google Maps + Places + Routes API
- Encrypted secrets storage (AES-256-GCM)

---

## Known Gaps (from Phase 1 audit)

### Critical
- XSS in `renderAssignPage` (`lib/handlers.js`) — unescaped user data in HTML
- In-memory rate limiter bypassable in multi-node deployments
- `updateBooking` cannot clear driver fields (GDPR issue)
- Provider placeholders: SMS, WhatsApp, Payment, Firebase, EFC don't actually send

### High
- `createRole` / `assignDriver` not transactional — inconsistent state possible
- `refreshProviders()` called on every notification — DB round-trip collapse
- Dashboard loads ALL bookings then filters in JS — memory exhaustion risk
- `window.prompt()` for driver assignment — no server-side driver validation
- Hardcoded WhatsApp number in 4 places
- OTP race condition (attempts check-then-increment not atomic)
- Silent catch blocks throughout admin SPA — no user feedback on failure

### Medium
- Admin modules not implemented: Customers, Drivers, Notifications, Payments UI
- Service worker never registered — PWA features inactive
- `manifest.json` is empty `{}` — PWA not installable
- No idempotency key on booking — duplicate possible on timeout retry
- Wrong element IDs for date/time inputs — time-based pricing broken
- No CSRF token (mitigated by `sameSite=lax` cookies)
- Migration script non-idempotent — no tracking table

### Low
- `escapeHtml` only covers 4 characters
- Currency formatting loses decimals for non-JPY/INR
- Static exchange rates never updated
- Phone validation too permissive
- No offline.html fallback page

**Full audit: see `docs/TECHNICAL_DEBT.md` and `docs/IMPLEMENTATION_ROADMAP.md`**

---

## What's Working (smoke tested 2026-09-27)

- ✅ `npm run dev` starts cleanly on port 3003
- ✅ Admin login at `http://admin.localhost:3003/admin`
- ✅ GET `/api/admin/vehicles` → 200 with full extended fields
- ✅ PUT `/api/admin/vehicles/1/extended` → 200, DB updated, public API reflects
- ✅ GET `/api/vehicles` (public) → 200 with correct fares
- ✅ Dashboard stats load correctly
- ✅ Content blocks load from DB (no hardcoded fallback)
- ✅ Migrations 009 + 010 applied cleanly
