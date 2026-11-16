# STB Testing & QA

**Revalidated:** 2026-10-15  
**Current QA evidence:** [QA report 2026-10-15](QA-REPORT-2026-10-15.md)  
**Proposed automated workflow:** [PR #4](https://github.com/TenSketch/landing-stb/pull/4), integrated with booking regressions in [PR #5](https://github.com/TenSketch/landing-stb/pull/5)

## Test entry points

### On current `main`

```bash
npm test
```

The current main package script runs:

- `backend/tests/pricing_engine.test.js`
- `backend/tests/auth_and_audit.test.js`
- `backend/tests/platform_hardening.test.js`

The last script creates and resets a dedicated `stb_test` database, runs all SQL migrations, and exercises auth/RBAC/customer auth/settings behavior. Run it only against a disposable PostgreSQL instance; do not point it at production.

### Proposed PR branch

PR #5 adds `backend/tests/booking_status.test.js` to `npm test`. It covers transactional driver assignment, concurrent dispatch, rollback after a failed write, status history/audit consistency and rejection of assignment to closed bookings.

The portable E2E harness is `tests/e2e-suite.cjs`; the extended security/operations probes are `tests/audit.cjs`. PRs #4 and #5 add a GitHub Actions workflow that provisions ephemeral PostgreSQL, starts a local Express server and runs these suites. The default workflow does not mutate public domains.

## Current isolated CI evidence

For commit `cdb645af4b35a1d81542e2a3516909108c349c9c`:

| Suite | Passed | Failed | Skipped |
|---|---:|---:|---:|
| Pricing | 8 | 0 | 0 |
| Auth/session helpers | 3 | 0 | 0 |
| Backend/database integration | 10 | 0 | 0 |
| Booking transaction regressions | 8 | 0 | 0 |
| Google Maps browser/server key separation | 5 | 0 | 0 |
| Local E2E | 87 | 0 | 3 |
| Local security audit | 43 | 0 | 1 |

The combined isolated workflow passed syntax checks and all executed tests: **164 passed, 0 failed, 4 skipped**. See [workflow run 38691010883](https://github.com/TenSketch/landing-stb/actions/runs/38691010883).

### Explicitly skipped in this run

- Separate webhook service probes (no test webhook configured).
- Public-domain E2E smoke checks (local-only by default).
- Server error-log diff (no explicit test log path).
- Public-domain security audit (disabled by default to avoid unsafe mutation against live services).

Skipped checks are not passes. The current QA report lists these exclusions.

## Safety requirements

- Use an isolated disposable database, never production, for test suites that create/drop `stb_test`.
- Set a synthetic test `STB_SECRET_KEY` and test-only admin account in CI.
- Use mock provider configuration by default; real notifications need explicit safe destinations.
- Public-domain checks must be read-only by default. Do not register users or create bookings on live domains during an audit.
- Set `STB_E2E_BASE_URL` to an explicit local/staging target when needed.
- Public domain checks require explicit opt-in; webhook checks require `STB_WEBHOOK_BASE_URL`.
- Save run output, commit SHA, environment, passed/failed/skipped counts and cleanup status.

## Required future coverage

- Browser-based customer journey on phone and desktop.
- Admin CRUD and dispatch journey with real browser state/cookies.
- Booking idempotency and concurrent status/driver assignment.
- Dynamic-data propagation from admin → DB → API → customer UI.
- Customer and admin PWA install/update/offline checks.
- Google Maps valid/missing/invalid/quota-exceeded key scenarios.
- CSRF, authorization boundaries, XSS, injection, rate limits and secret exposure.
- Real-provider delivery only in a dedicated safe staging environment.
