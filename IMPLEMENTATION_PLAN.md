# STB Platform Hardening + Self-Configurable Admin + Customer Auth — Implementation Plan

> Work locally only. No git commit/push/pull. No VPS/production access. No deployment.
> Preserve all unrelated existing changes. Leave everything uncommitted.
> Do not invent commercial rates or credentials.

## Repository
`/home/bala/Desktop/WEBSITE_PROJECTS/landing-stb`

## Current Stack
- Node 20, Express, ES modules, `cookie-parser`, `pg`, `nodemailer`, `dotenv`, Tailwind CSS v3
- PostgreSQL via `lib/db.js` query helper
- Static customer app: `public/index.html` + `public/src/main.js`
- Admin SPA: `public/admin/index.html` + `public/admin/admin.js` + `public/admin/admin.css`
- Pricing engine: `lib/pricing.js` (vehicle rules, route overrides, surcharges)
- Booking handlers: `lib/handlers.js` + `lib/store.js`
- Auth: email OTP via `lib/auth.js` (no passwords, no RBAC yet)
- Migrations: `scripts/migrate.js` runs all `migrations/*.sql` in sorted order

## Goal
Evolve STB into a production-ready cab-booking-style transport platform with:
1. Dedicated, secure admin app with password auth + RBAC + session management.
2. Self-configurable operational/business settings via admin panel.
3. Optional customer accounts with guest-booking preserved.
4. Provider-abstracted payments, SMS, WhatsApp, EFC, Firebase push.
5. Central notification engine.
6. PWA standards.
7. Expanded audit logging and security hardening.
8. Tests pass + manual local browser checks.

## Implementation Strategy
1. Foundation first: migrations, core libs (auth, settings, audit, notification, providers), then server routes.
2. Admin UI: build the new module structure behind `public/admin/`, while preserving existing customer app.
3. Customer UI: enhance `public/src/main.js` for accounts and simplified flow, without redesigning homepage.
4. Tests: run existing tests after each major phase, then add new tests.
5. Manual checks: use browser and curl against locally running server.

## Phase 1: Database Foundation

### Task 1.1: Add core entity migrations
**Files created:**
- `migrations/004_rbac_and_users.sql`
- `migrations/005_customers_and_booking_lifecycle.sql`
- `migrations/006_configuration_and_integrations.sql`
- `migrations/007_audit_and_notifications.sql`

**Details:**
Create tables:
- `roles` (id SERIAL PK, name VARCHAR unique, slug VARCHAR unique, description, is_system_role, created_at, updated_at)
- `permissions` (id SERIAL PK, module VARCHAR, action VARCHAR, key VARCHAR unique, description)
- `role_permissions` (role_id, permission_id, PK(role_id, permission_id), FKs)
- `admin_users` migrate existing table: add `id` uuid PK, `password_hash`, `role_id` FK, `name`, `email_verified_at`, `is_active`, `last_login`, `created_at`, `updated_at`; keep email unique.
- `password_reset_tokens` (id uuid PK, email, token_hash, expires_at, used_at, created_at)
- `customers` (id uuid PK, email unique, password_hash, name, phone, whatsapp, email_verified_at, is_active, created_at, updated_at)
- `customer_sessions` (id uuid PK, customer_id FK, session_token_hash unique, expires_at, created_at)
- `customer_password_reset_tokens` (id uuid PK, customer_id FK, token_hash, expires_at, used_at)
- `customer_device_tokens` (id uuid PK, customer_id FK, token, provider, created_at, updated_at)
- `system_settings` (key VARCHAR PK, value JSONB not null, updated_at)
- `booking_settings` (key VARCHAR PK, value JSONB not null, updated_at)
- `notification_settings` (channel VARCHAR PK, enabled BOOLEAN, config JSONB, updated_at)
- `notification_templates` (id SERIAL PK, channel, event, name, subject, body, is_active, updated_at)
- `integration_settings` (provider_type VARCHAR PK, provider_key VARCHAR, enabled BOOLEAN, config JSONB, secrets_encrypted TEXT, updated_at)
  - provider_type in `PAYMENT`, `SMS`, `WHATSAPP`, `EFC`, `FIREBASE`, `EMAIL`
- `payment_settings`, `sms_settings`, `whatsapp_settings`, `firebase_settings` as views/aliases or separate tables? Keep them as rows in `integration_settings` with type-specific keys, plus dedicated tables for clarity.
- `firebase_settings` (id SERIAL PK, project_id, config_json, server_key_encrypted, enabled, updated_at)
- `booking_status_history` (id uuid PK, booking_id FK/VARCHAR, status, changed_by_email, notes, created_at)
- `audit_logs` (id uuid PK, actor_email, actor_type, action, table_name, record_id, old_values JSONB, new_values JSONB, ip_address, user_agent, created_at)

Use JSONB for flexible configuration. Do not store plaintext secrets where possible: use `crypto.createCipheriv` with `STB_SECRET_KEY` for provider secrets. Provide helper `lib/secrets.js` for encrypt/decrypt.

### Task 1.2: Seed safe initial data
**File modified:** `migrations/008_seed_platform_baseline.sql`

Seed roles and permissions, super-admin bootstrap, default booking modes, initial vehicle types (existing), default notification templates.

Bootstrap super admin from `INITIAL_ADMIN_EMAIL` env only. If admin does not have password_hash, first login/setup route lets them set password. Migration should not set a hardcoded password.

## Phase 2: Core Library Layer

### Task 2.1: Password hashing + token helpers
**File created:** `lib/security.js`
Functions:
- `hashPassword(plain)` -> argon2id hash string. Since argon2 may not be installed, fallback to bcrypt if available, else `crypto.scryptSync` with 64-byte salt and 131072 iterations memory-hard fallback. Prefer `bcrypt` if present.
- `verifyPassword(plain, hash)` -> boolean.
- `generateSecureToken(bytes=32)` -> hex.
- `hashToken(token)` -> sha256 hex.
- `generateNumericOtp(length=6)` -> string.
- `encryptSecret(plain)` / `decryptSecret(cipher)` using AES-256-GCM with `STB_SECRET_KEY`.
- `rateLimitKey(prefix, identifier)` for Redis-less in-memory rate limiting.

### Task 2.2: In-memory rate limiter
**File created:** `lib/ratelimit.js`
Simple map-based rate limiter with configurable window and max attempts. Methods: `isAllowed(key, maxAttempts, windowMs)`. Used for login, password reset, OTP.

### Task 2.3: Settings/configuration service
**File created:** `lib/settings.js`
Functions:
- `getSetting(key, defaultValue=null)` from `system_settings`.
- `getSettingsByPrefix(prefix)`.
- `setSetting(key, value, actorEmail=null)`.
- `getBookingConfig()` merges `booking_settings` rows into one object.
- `getBrandConfig()` merges `system_settings` brand rows.

### Task 2.4: Audit logger (expanded)
**File modified:** `lib/db.js` and new `lib/audit.js`
- `logAudit` becomes wrapper around `lib/audit.js`.
- Audit service accepts `actorEmail`, `actorType` (`admin`, `customer`, `system`), `action`, `tableName`, `recordId`, `oldValues`, `newValues`, `req` (to capture ip/user-agent).
- Never log passwords, OTPs, tokens, card data, or raw API secrets.
- Keep existing pricing_audit_history rows by migrating data? We will add new `audit_logs` table and keep `pricing_audit_history` for backward compatibility.

### Task 2.5: Provider abstraction layer
**Files created:**
- `lib/providers/base.js` (BaseProvider class with `send(payload)`, `isConfigured()`)
- `lib/providers/email.js` (nodemailer wrapper)
- `lib/providers/sms.js` (placeholder + config loader)
- `lib/providers/whatsapp.js` (placeholder + config loader + fallback wa.me link builder)
- `lib/providers/payment.js` (placeholder + config loader)
- `lib/providers/firebase.js` (FCM placeholder + config loader)
- `lib/providers/efc.js` (placeholder + config loader)

Each provider loads its config from `integration_settings` and decrypts secrets. Providers do not contain vendor-specific API logic unless already present (nodemailer email). They expose `isEnabled()`, `validateConfig()`, `send(notificationPayload)`.

### Task 2.6: Notification engine
**File created:** `lib/notifications.js`
- `registerProvider(channel, providerInstance)`
- `notify(eventName, payload)` where eventName is one of booking lifecycle events.
- Loads templates from `notification_templates` table.
- Routes to enabled channels.
- Builds email from template using simple token replacement (`{{booking.reference}}`, etc.).
- Integrates with existing `emails/templates.js` by migrating existing templates into `notification_templates` on startup/migration.

### Task 2.7: Customer auth service
**File created:** `lib/customerAuth.js`
Functions:
- `registerCustomer(payload)`
- `verifyCustomerEmail(customerId)`
- `loginCustomer(email, password, userAgent?)`
- `logoutCustomer(sessionToken)`
- `requestPasswordReset(email)`
- `resetPassword(token, newPassword)`
- `changePassword(customerId, oldPassword, newPassword)`
- `getCustomerBySession(token)`
- `requireCustomerAuth` middleware (optional for routes; guest remains allowed for booking)

### Task 2.8: Admin RBAC service
**File created:** `lib/rbac.js`
Functions:
- `seedRolesAndPermissions()` called at migration + startup.
- `getAdminPermissions(adminEmail)` returns set of permission keys (role + direct overrides).
- `hasPermission(adminEmail, permissionKey)`
- `requirePermission(permissionKey)` Express middleware.
- `getRoles()`, `getRoleById(id)`, `createRole`, `updateRole`, `deleteRole`.
- `assignRole(adminEmail, roleId)`.

Roles seeded:
- SUPER_ADMIN: all permissions
- ADMIN: bookings.*, customers.*, vehicles.*, pricing.*, operational.*, reports.view
- DISPATCHER: bookings.view, bookings.update_status, bookings.assign_driver, notifications.send
- OPERATIONS: bookings.view, vehicles.manage, drivers.*, operational.*
- VIEWER: bookings.view, customers.view, vehicles.view, pricing.view, reports.view

Permission keys use pattern `{module}.{action}`.

### Task 2.9: Password-based admin auth service
**File modified:** `lib/auth.js`
Add:
- `registerAdminPassword(email, password)` for first-time setup.
- `requestPasswordReset(email)` for secure reset flow.
- `resetPassword(token, newPassword)`.
- `loginAdmin(email, password)` -> creates session, sets secure cookie.
- Keep existing OTP functions but make OTP optional/2FA for SUPER_ADMIN only (configurable). Provide `requestAdminOtp` and `verifyAdminOtp` as optional second factor.
- Session expiry: 8 hours for admin, configurable.
- Secure cookies: HttpOnly, Secure in production, SameSite=Strict, maxAge from config.
- Rate limiting on login and reset.

## Phase 3: Server Routes

### Task 3.1: Admin auth routes
**File modified:** `server.js`
Replace current OTP-only admin routes with:
- `POST /api/admin/auth/login` -> password login, set cookie.
- `POST /api/admin/auth/logout` -> clear cookie.
- `GET /api/admin/auth/me` -> current admin + role + permissions.
- `POST /api/admin/auth/setup` -> first-time password setup if no password_hash set and email matches INITIAL_ADMIN_EMAIL.
- `POST /api/admin/auth/request-password-reset` -> send reset email.
- `POST /api/admin/auth/reset-password` -> token + new password.
- `POST /api/admin/auth/otp/request` -> optional 2FA OTP (Super Admin).
- `POST /api/admin/auth/otp/verify` -> verify OTP after password login.

### Task 3.2: Admin user & role management routes
**File modified:** `server.js`
- `GET /api/admin/roles` (super admin only)
- `GET /api/admin/roles/:id`
- `POST /api/admin/roles`
- `PUT /api/admin/roles/:id`
- `DELETE /api/admin/roles/:id`
- `GET /api/admin/users`
- `POST /api/admin/users` (create admin user, assign role)
- `PUT /api/admin/users/:id` (role, active, name)
- `DELETE /api/admin/users/:id`

### Task 3.3: Admin configuration routes
**File modified:** `server.js`
- `GET /api/admin/settings/general`
- `PUT /api/admin/settings/general` (requires `settings.manage`)
- `GET /api/admin/settings/booking`
- `PUT /api/admin/settings/booking` (requires `booking_settings.manage`)
- `GET /api/admin/settings/notifications`
- `PUT /api/admin/settings/notifications` (requires `notifications.manage`)
- `GET /api/admin/notification-templates`
- `PUT /api/admin/notification-templates/:id`

### Task 3.4: Vehicle management routes
**File modified:** `server.js`
- `GET /api/admin/vehicles`
- `POST /api/admin/vehicles` (requires `vehicles.manage`)
- `PUT /api/admin/vehicles/:id`
- `DELETE /api/admin/vehicles/:id` (soft deactivate)

### Task 3.5: Pricing management routes
Mostly already exist. Add RBAC permission checks. Ensure route overrides match `origin_place_id` and `destination_place_id`.

### Task 3.6: Customer auth routes
**File modified:** `server.js`
- `POST /api/customer/register`
- `POST /api/customer/login`
- `POST /api/customer/logout`
- `POST /api/customer/request-password-reset`
- `POST /api/customer/reset-password`
- `POST /api/customer/change-password` (authenticated)
- `GET /api/customer/me`
- `PUT /api/customer/me`
- `GET /api/customer/bookings` (upcoming/completed/cancelled filters)
- `GET /api/customer/bookings/:id`

### Task 3.7: Booking lifecycle & dispatch routes
**File modified:** `server.js`
- `GET /api/admin/bookings` (filters: status, date, assigned/unassigned)
- `GET /api/admin/bookings/:id`
- `PUT /api/admin/bookings/:id/status` (requires `bookings.update_status`)
- `PUT /api/admin/bookings/:id/assign` (requires `bookings.assign_driver`)
- Existing `/assign/:voucherCode` and `/api/assign/:voucherCode` remain, but backend `lib/handlers.js` updates booking status history.

### Task 3.8: Integration configuration routes
**File modified:** `server.js`
- `GET /api/admin/integrations` (safe fields only: provider, enabled, mode, public config; no secrets)
- `PUT /api/admin/integrations/:type` (requires `integrations.manage`)
- Endpoint to test integration connectivity where feasible (email only).

### Task 3.9: Public configuration route
**File modified:** `/api/config.js` and `server.js /api/config`
Expose safe customer-facing config from `system_settings`: brand, contact, currency, timezone, booking modes enabled, tolls text, fare disclaimer, etc. Never expose secrets.

### Task 3.10: Dashboard data route
**File modified:** `server.js`
- `GET /api/admin/dashboard` returns today's/upcoming/pending/confirmed/assigned/unassigned/active/completed/cancelled counts, revenue summary if payments enabled, recent activity, integration health.

## Phase 4: Admin UI Overhaul

### Task 4.1: Admin app shell
**Files modified:** `public/admin/index.html`, `public/admin/admin.css`, `public/admin/admin.js`
- New layout: top navbar + sidebar navigation.
- Sidebar modules: Dashboard, Bookings, Customers, Vehicles, Pricing, Drivers/Partners, Notifications, Payments, Integrations, Settings, Users & Roles, Audit Logs.
- Module visibility based on permissions returned by `/api/admin/auth/me`.
- Login page: email + password, forgot password link, optional OTP step for Super Admin.
- Mobile responsive.

### Task 4.2: Admin dashboard
**Files modified:** `public/admin/admin.js`
- Render stat cards from `/api/admin/dashboard`.
- Recent bookings table.
- Integration health indicators.

### Task 4.3: Admin configuration screens
- General settings form.
- Booking settings form.
- Notification templates editor.
- Integration configuration forms (payment, SMS, WhatsApp, EFC, Firebase) with secret fields masked.

### Task 4.4: Vehicles & pricing screens
- Vehicle list with add/edit/deactivate.
- Pricing rules editor.
- Route overrides editor with Google Places autocomplete.
- Surcharge editor.

### Task 4.5: Bookings & dispatch screen
- Booking list with filters.
- Booking detail view.
- Status update dropdown.
- Driver assignment form.

### Task 4.6: Users & roles screen
- Role editor with permission checklist.
- Admin user list.

### Task 4.7: Audit logs screen
- Filterable audit log table.
- Show who/what/when/old/new.

## Phase 5: Customer UI Enhancements

### Task 5.1: Simplified cab-booking flow
**File modified:** `public/src/main.js`
Refactor booking flow to:
1. Pickup
2. Destination (skip for hourly/daily)
3. Date/time
4. Vehicle
5. Booking mode if required
6. System calculates distance/duration/fare
7. Review trip
8. Passenger/contact details
9. Payment option if enabled
10. Confirm -> reference -> confirmation

Keep existing UI sections but ensure state machine is cleaner.

### Task 5.2: Customer auth UI
**Files modified:** `public/index.html`, `public/src/main.js`
Add small account menu/header:
- Continue as guest
- Login modal
- Register modal
- Forgot password
- Account/profile modal
- Booking history modal

Non-mandatory for booking.

### Task 5.3: Dynamic customer content
**Files modified:** `public/src/main.js`
- Load `/api/config` on startup and apply brand name, contact, currency, booking modes, tolls text, fare disclaimer.
- Vehicle descriptions from `/api/vehicles` (new public endpoint).
- If Google distance available, use it.

### Task 5.4: PWA improvements
**Files modified:** `public/manifest.json`, `public/sw.js`
- Verify manifest has correct name, short_name, icons, theme/background colors, start_url, display.
- Add offline fallback page `public/offline.html`.
- Service worker network-first for pages, cache-first for static assets, never cache /api/admin/* or sensitive data.
- Register service worker in `public/src/main.js`.

## Phase 6: Security Hardening

### Task 6.1: Input validation
- Validate and sanitize all body params using small helper.
- Escape output in admin/customer UI to prevent XSS.
- Use parameterized queries (already done).

### Task 6.2: Auth security
- Passwords hashed with strong algorithm.
- Reset tokens single-use and expire.
- Sessions HTTP-only, Secure, SameSite=Strict.
- Rate limiting on login, reset, OTP.
- No secrets in frontend.
- No production credentials in source.

### Task 6.3: CORS & headers
- Existing security headers remain.
- Ensure admin routes never leak via `X-Powered-By` removal.
- Add CSRF protection? Since we use SameSite=Strict cookies + JSON APIs, CSRF risk is low, but include `csrf-token` header check optional. Keep simple for now.

### Task 6.4: Secrets handling
- Encrypt provider secrets at rest with `STB_SECRET_KEY`.
- Load `STB_SECRET_KEY` from env; warn if not set.

## Phase 7: Tests

### Task 7.1: Keep existing tests passing
- `npm test` runs `backend/tests/pricing_engine.test.js` and `backend/tests/auth_and_audit.test.js`.
- Ensure no regression.

### Task 7.2: Add new test files
**Files created:**
- `backend/tests/customer_auth.test.js`
- `backend/tests/rbac.test.js`
- `backend/tests/admin_auth.test.js`
- `backend/tests/booking_lifecycle.test.js`
- `backend/tests/dynamic_settings.test.js`
- `backend/tests/notification_engine.test.js`
- `backend/tests/security_boundaries.test.js`

Use in-memory mocked services where possible. For DB-dependent tests, require a test database env or mock `query`.

### Task 7.3: Update package.json test script
**File modified:** `package.json`
```json
"test": "node backend/tests/pricing_engine.test.js && node backend/tests/auth_and_audit.test.js && node backend/tests/customer_auth.test.js && node backend/tests/rbac.test.js && node backend/tests/admin_auth.test.js && node backend/tests/booking_lifecycle.test.js && node backend/tests/dynamic_settings.test.js && node backend/tests/notification_engine.test.js && node backend/tests/security_boundaries.test.js"
```

## Phase 8: Manual Local Checks

### Task 8.1: Start server with migrations
```bash
cd /home/bala/Desktop/WEBSITE_PROJECTS/landing-stb
npm run db:migrate
npm run dev
```

### Task 8.2: Admin checks
- First-time setup at `/admin/setup`.
- Login, password reset.
- Role restrictions (create dispatcher user, verify modules hidden).
- Pricing/vehicle changes reflect on customer estimate.
- Booking management and driver assignment.
- Audit logs record changes.

### Task 8.3: Customer checks
- Guest booking (one way, hourly, daily).
- Register/login/password reset.
- Booking history after login.
- Dynamic settings reflect on homepage.

## File Inventory (Expected)

**Files to create:**
- `lib/security.js`
- `lib/ratelimit.js`
- `lib/settings.js`
- `lib/audit.js`
- `lib/providers/base.js`
- `lib/providers/email.js`
- `lib/providers/sms.js`
- `lib/providers/whatsapp.js`
- `lib/providers/payment.js`
- `lib/providers/firebase.js`
- `lib/providers/efc.js`
- `lib/notifications.js`
- `lib/customerAuth.js`
- `lib/rbac.js`
- `migrations/004_rbac_and_users.sql`
- `migrations/005_customers_and_booking_lifecycle.sql`
- `migrations/006_configuration_and_integrations.sql`
- `migrations/007_audit_and_notifications.sql`
- `migrations/008_seed_platform_baseline.sql`
- `backend/tests/customer_auth.test.js`
- `backend/tests/rbac.test.js`
- `backend/tests/admin_auth.test.js`
- `backend/tests/booking_lifecycle.test.js`
- `backend/tests/dynamic_settings.test.js`
- `backend/tests/notification_engine.test.js`
- `backend/tests/security_boundaries.test.js`
- `public/offline.html`

**Files to modify:**
- `server.js` (new routes, RBAC, sessions, security)
- `lib/db.js` (audit enhancements)
- `lib/auth.js` (password auth + optional OTP)
- `lib/handlers.js` (booking lifecycle, notifications)
- `lib/store.js` (customer/booking status updates)
- `lib/pricing.js` (minor: use settings for currency where applicable)
- `public/admin/index.html`, `admin.css`, `admin.js` (full overhaul)
- `public/index.html`, `public/src/main.js` (customer auth, dynamic content)
- `public/manifest.json`, `public/sw.js` (PWA)
- `api/config.js` (dynamic safe config)
- `package.json` (test script)

## Limitations to Document
- Real payment/SMS/WhatsApp/EFC/Firebase credentials/specifications are required to enable live transactions.
- Provider abstractions are wired to load config but actual vendor API calls remain placeholders.
- Firebase push requires FCM server key and browser permission UX.
- Email delivery still depends on configured SMTP.

## Success Criteria
- `npm test` passes.
- `npm run db:migrate` runs cleanly.
- Server starts and serves both customer and admin apps.
- Admin password setup/login/logout works.
- RBAC hides/shows modules and blocks unauthorized API calls.
- Customer can book as guest.
- Registered customer can log in and view history.
- Pricing remains server-authoritative.
- Dynamic settings affect customer UI.
- Audit logs capture major changes.
- No production credentials or secrets in source.
- All changes left uncommitted.
