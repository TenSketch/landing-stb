# Security

> Verified against code as of commit `15e4184`. Does not include penetration test.

## Authentication

| Item | Status | Notes |
|------|--------|-------|
| Admin password hashing | ✅ | scrypt (fallback from bcrypt/argon2) |
| Customer password hashing | ✅ | scrypt |
| Admin session cookies | ✅ | HTTP-only, Secure, sameSite=lax |
| Customer session cookies | ✅ | HTTP-only, Secure, sameSite=lax |
| OTP for Super Admin | ✅ | 6-digit, 5-min expiry, 3 attempt max |
| Password reset tokens | ✅ | Hashed, single-use |
| Rate limiting on login | ✅ | In-memory (single-node only) |
| Rate limiting on OTP | ✅ | In-memory |
| Secret encryption | ✅ | AES-256-GCM via `lib/security.js` |

## Known Vulnerabilities

| Severity | Vulnerability | Location | Impact | Fix |
|----------|---------------|----------|--------|-----|
| **Critical** | XSS in `renderAssignPage` | `lib/handlers.js:370-451` | Arbitrary JS execution | Escape all user-supplied fields with `escapeHtml()` |
| **Critical** | In-memory rate limiter bypassable in multi-node | `lib/ratelimit.js` | Rate limit bypassed horizontally | Use Redis with shared TTL counters |
| **Critical** | `updateBooking` cannot NULL driver fields | `lib/store.js:109-119` | GDPR right to erasure violation | Use explicit `UPDATE SET driver_name = NULL` path |
| **High** | Hardcoded domain fallbacks | `server.js:26` | Cookie domain mismatch / subdomain cookie toss | Fail-fast on missing `ROOT_DOMAIN` |
| **High** | `createRole` not transactional | `lib/rbac.js:162-172` | Orphaned role without permissions | Wrap in BEGIN/COMMIT |
| **High** | `assignDriver` not transactional | `lib/bookingStatus.js:94-125` | Driver assigned but status wrong | Wrap in BEGIN/COMMIT |
| **High** | `requirePermission` silently swallows audit log failure | `lib/api.js:120-124` | Attack attempts not logged | Log to console.error |
| **High** | `SUPER_ADMIN` implicit `*` permission | `lib/auth.js:94-97` | Over-privileged | Enumerate all permissions explicitly |
| **High** | `referer` used directly in Google Routes call | `lib/api.js:247` | Indirect open redirect | Use fixed internal referer |
| **High** | OTP race condition | `lib/auth.js:148-152` | Concurrent OTP guess attacks | Atomic compare-and-increment |
| **Medium** | CSP `unsafe-inline` in script-src | `server.js:47` | CSP XSS bypass | Use nonces |
| **Medium** | `sameSite: "lax"` (not `"strict"`) | `lib/api.js:44` | CSRF on same-domain | Use `strict` in production |
| **Medium** | No CSRF token | API handlers | CSRF on state-changing ops | `sameSite: strict` + double-submit optional |
| **Medium** | Audit log failure swallowed | `lib/audit.js:72-74` | Audit gaps undetected | Log + re-throw or flag externally |
| **Medium** | `escapeHtml` incomplete | `public/admin/app.js:17` | Only escapes `&<>"` — misses `'` and `/` | Use DOMPurify |
| **Medium** | OTP printed to console in dev | `lib/auth.js:123-125` | Accidental prod enable | Remove console.log |
| **Low** | `STB_SECRET_KEY` weak default | `.env.example` | Weak encryption if not changed | Require 32-char hex; reject shorter |
| **Low** | Reset token in API response body | `lib/auth.js:256` | Token in HTTP body (not just email) | Token only via email |
| **Low** | `rejectUnauthorized: false` for PG SSL | `lib/db.js:25` | MITM on SSL connection | Use `true` in production |

## Security Headers

Set in `server.js`:
```javascript
res.set({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
});
```

CSP header also set (with `unsafe-inline` — see above).

## Input Validation

- All `req.body` params validated with `validateBody()` helper before use
- SQL parameterized queries throughout — no string interpolation in SQL
- File uploads: none currently implemented
- `sanitizeOutput()` / `escapeHtml()` used in admin SPA

## Secrets

- Never logged: passwords, OTPs, tokens, API keys, payment secrets
- `STB_SECRET_KEY` used for AES-256-GCM encryption of provider secrets at rest
- `.env.example` documents all required secrets
- No secrets in source code or git history

## Hardcoded Phone Number

`+6590629107` appears in:
- `public/src/main.js` (WhatsApp URL)
- `public/index.html` (schema.org)
- `lib/handlers.js` (confirmation page fallback)
- `.env.example`

Should be centralized in `system_settings` and served via `/api/config`.

## Dependency Audit

From `package.json` — known used packages:
- `express`, `cookie-parser`, `pg`, `dotenv`, `nodemailer`
- `cors` — configured with explicit allowlist
- `crypto` (built-in) — for encryption

No known malicious dependencies. No audit run (e.g. `npm audit`).
