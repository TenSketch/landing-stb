# STB QA — Testing Phases (audit → fix → test → commit → next)

Status of each phase for the Singapore Tour Booking landing/platform.
Harness: `tests/e2e-suite.cjs` (90-check functional/e2e suite) + `tests/audit.cjs` (69 extended security/ops probes).

## Phase 1 — Recon ✅
- Route surface mapped from source: ~70 API routes (`lib/api.js` router mounted at `/api`), page routes + SPA fallback in `server.js`.
- Auth model documented: `stb_admin_session` / `stb_customer_session` cookies (httpOnly) OR `Authorization: Bearer <token>`; sessions stored hashed in `admin_sessions` / customer session table.
- Notification side-effect gate: SMTP sender = `info@singaporetourbooking.com` (project's own Zoho mailbox). Test bookings are labelled `E2E-TEST` / `safe to delete` and purged after every run.
- Topology: pm2 `stb-server` :3003 (+ webhook :9003), nginx vhosts for apex / admin. / api subdomains.

## Phase 2 — Audit ✅ (69 probes, 10 categories)
Categories: A sensitive-file exposure · B path traversal · C cookie flags · D CORS reflection · E HTTP methods · F login rate limit · G Host-header handling · H live headers/redirects · I secret scan on public JSON · J error shapes.
Result: **66/69 → 3 findings** (see QA report).

## Phase 3 — Fix ✅
1. `C-cookies` — session cookies missing `Secure` flag → forced `secure: true` (site is HTTPS-only + HSTS preload).
2. `J-errors` — unknown `/api/*` returned SPA HTML with 200 → dedicated JSON 404 handler before the SPA fallback.
3. `F-ratelimit` — **harness bug** (probe used a fresh email per attempt; limiter keys on email) → fixed the probe, app unchanged.

## Phase 4 — Test ✅
- Audit: **69/69**
- E2E suite: **89/90** (only failure: `GOOGLE_MAPS_API_KEY` not configured — environment gap, needs the key from ops)
- Combined: **158/159**

## Phase 5 — Commit ✅
- Fixes + test harness (`tests/`) + docs (`docs/`) committed and pushed.
- `.gitignore` extended with the secret-bearing runtime files (`ecosystem.config.cjs`, `stb-webhook-start.sh`, `webhook-server.js`) so they can never be committed by accident.

## Phase 6 — Live ✅
- Public-domain verification: HTTPS, redirects, HSTS, single CSP, JSON 404 on live API host, Secure cookie flag on live login, certificate validity.
- Runbook: `docs/LIVE-RUNBOOK.md`.

## Known open items
| Item | Owner | Note |
|---|---|---|
| `GOOGLE_MAPS_API_KEY` missing | ops (Bala) | only failing check; `/api/estimate` 500s until set in `.env` |
| Outbound port 465 blocked on VPS | provider | SMTP uses 587 STARTTLS (equivalent TLS) |
| IMAP disabled on `info@` Zoho mailbox | optional | enable only for scriptable mailbox checks |
