# Authentication & RBAC

> Verified against `lib/auth.js`, `lib/customerAuth.js`, `lib/rbac.js` as of commit `15e4184`.

## Admin Authentication

### Login Flow
1. `POST /api/admin/auth/login` with `{ email, password }`
2. Password verified against `admin_users.password_hash` (scrypt)
3. Session created: `INSERT INTO admin_sessions (admin_id, token_hash, expires_at)`
4. HTTP-only cookie set: `stb_admin_session=<token>`, domain=`.singaporetourbooking.com`, `sameSite=lax`
5. Returns `{ admin: { id, name, email, role }, permissions: [...] }`

### OTP (2FA for Super Admin)
1. `POST /api/admin/auth/request-otp` → generates 6-digit OTP, sends via email
2. `POST /api/admin/auth/verify-otp` with `{ email, otp }` → validates against stored OTP
3. OTP is single-use, expires after 5 minutes, max 3 attempts
4. OTP verification required in addition to password for `role_slug === 'SUPER_ADMIN'`

### Password Reset
1. `POST /api/admin/auth/request-password-reset` with `{ email }` → sends email with reset link
2. `POST /api/admin/auth/reset-password` with `{ token, password }` → token is hashed, single-use

### Session
- 8-hour expiry (`admin_sessions.expires_at`)
- Token stored as SHA-256 hash in DB
- Middleware `requireAdminAuth` extracts from cookie or `Authorization: Bearer <token>`
- Failed auth returns `401` with `INVALID_CREDENTIALS` code

## Customer Authentication

### Registration
1. `POST /api/customer/register` with `{ email, password, name, phone, whatsapp? }`
2. Email verification required — verification token sent via email
3. `email_verified_at` set on verification

### Login
1. `POST /api/customer/login` with `{ email, password }`
2. Creates `customer_sessions` record
3. HTTP-only cookie: `stb_session=<token>`, domain=`.singaporetourbooking.com`

### Guest Booking
- Booking does NOT require authentication
- Guest bookings store `customer_id = NULL`
- Guest must provide email + phone in booking form
- Guest receives booking reference via WhatsApp/email if configured

## RBAC

### Roles & Permissions

| Role | Slug | Permissions |
|------|------|-------------|
| Super Admin | `SUPER_ADMIN` | All (`*` wildcard) |
| Admin | `ADMIN` | bookings.*, customers.*, vehicles.*, pricing.*, operational.*, reports.view |
| Dispatcher | `DISPATCHER` | bookings.view, bookings.update_status, bookings.assign_driver, notifications.send |
| Operations | `OPERATIONS` | bookings.view, vehicles.manage, drivers.*, operational.* |
| Viewer | `VIEWER` | bookings.view, customers.view, vehicles.view, pricing.view, reports.view |

### Permission Pattern
`module.action` format, e.g. `bookings.update_status`, `vehicles.manage`, `pricing.view`.

Wildcard `*` grants all permissions within a module or globally.

### Middleware Usage
```javascript
// Per-route
router.put('/bookings/:voucherCode/status', requirePermission('bookings.update_status'), handler)

// Inline
const { requirePermission, requireAnyPermission } = require('../lib/rbac.js')
```

### Frontend Visibility
- Admin SPA fetches `/api/admin/auth/session` on boot
- `permissions` array returned; UI hides/disables elements `if (!hasPerm('module.action'))`
- **Frontend checks are for UX only — all enforcement is server-side**

## Security Issues

| Severity | Issue | Status |
|----------|-------|--------|
| **High** | `SUPER_ADMIN` implicit `*` permission in `getAdminPermissions` | Known — should enumerate explicitly |
| **High** | OTP race condition (attempts check then increment, not atomic) | Known |
| **High** | `*` wildcard in `hasPerm()` client-side short-circuits | UI only — server enforced separately |
| **Medium** | `sameSite: "lax"` (not `"strict"`) allows some CSRF on same-domain | Known |
| **Medium** | Bearer token fallback in admin cookie extraction | Legacy compatibility |
| **Low** | `getAdminPermissions` cached 1 minute — permission changes not immediate | Acceptable |

## Audit Events

| Event | Actor | Logged |
|-------|-------|--------|
| Login success/failure | Admin | Yes (IP, user-agent) |
| OTP request/verify | Admin | Yes |
| Password reset request | Admin | Yes |
| RBAC denied (403) | Admin | Yes |
| Booking status change | Admin | Yes |
| Driver assignment | Admin | Yes |
| Vehicle create/update/delete | Admin | Yes |
| Pricing rule change | Admin | Yes |
| Settings change | Admin | Yes |

**NOT logged**: passwords, OTPs, tokens, API keys, raw secret values.
