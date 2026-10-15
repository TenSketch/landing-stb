# STB Agent Handoff — Current Work & Next Actions

**Updated:** 2026-10-15  
**Repository:** `TenSketch/landing-stb`  
**Mode:** Test/PR work only. Production must remain untouched.

## Instructions to the next agent

Read these documents before editing code:

1. [Repository audit](REPOSITORY_AUDIT.md)
2. [Agile development and QA method](AGILE_DEVELOPMENT_QA_METHOD.md)
3. [Latest isolated QA report](QA-REPORT-2026-10-15.md)
4. [Technical debt inventory](TECHNICAL_DEBT.md)
5. [Google Maps configuration](GOOGLE_MAPS.md)

Then independently inspect the current default branch, open PRs, branch heads, changed files, and CI status. Do not assume this handoff is newer than the repository state; reconcile it with GitHub before acting.

## Work completed in open PRs (not merged)

| PR | Scope | Current evidence | Required next step |
|---|---|---|---|
| [#2 Webhook hardening](https://github.com/TenSketch/landing-stb/pull/2) | Request body cap, timing-safe HMAC comparison, route/method handling, JSON errors and spawn error handling | Open PR; inspect latest checks and review the complete diff | Review webhook signature/body handling and deployment side effects; add targeted tests if gaps remain |
| [#3 Audit and QA documentation](https://github.com/TenSketch/landing-stb/pull/3) | Repository audit, Agile QA method, docs index and this handoff | Open PR; documentation changes only | Check all claims against the current source and keep this handoff updated as work progresses |
| [#4 Portable QA and isolated CI](https://github.com/TenSketch/landing-stb/pull/4) | Removes hard-coded VPS paths from QA scripts; configurable local target/DB; opt-in public probes; PostgreSQL-backed CI workflow | Prior workflow passed; see [CI run](https://github.com/TenSketch/landing-stb/actions/runs/38690638384) | Review workflow safety, cleanup and skipped checks; verify latest run rather than relying on this historical link |
| [#5 Booking transaction safety and Maps key split](https://github.com/TenSketch/landing-stb/pull/5) | Client-scoped DB transactions for booking status/driver assignment, audit writes in transaction, concurrency/rollback regression tests, browser/server Maps key separation | Latest recorded combined run: [CI run](https://github.com/TenSketch/landing-stb/actions/runs/38691010883) | Inspect the latest PR head and diff; verify transaction boundaries and all key paths before considering complete |

All four PRs were recorded as open and unmerged when this handoff was written. Re-check status before reporting. A passing CI run is not approval to merge or deploy.

## Latest recorded isolated CI result

The dated report records the tested PR #5 head `a10637088b1f42494fdbf73479c5607ab75b92ac` on GitHub-hosted Ubuntu, Node.js 20 and ephemeral PostgreSQL 16:

- Pricing unit tests: 8 passed
- Auth/session helper tests: 3 passed
- Backend/database integration tests: 10 passed
- Booking transaction/dispatch tests: 8 passed
- Google Maps browser/server separation tests: 5 passed
- Local E2E: 87 passed, 0 failed, 3 skipped
- Local security audit: 43 passed, 0 failed, 1 skipped
- Total recorded: 164 passed, 0 failed, 4 skipped

Skipped checks were webhook service probes, public-domain smoke checks, explicit server error-log diff, and public-domain security audit. This evidence does **not** verify production, real provider delivery, live Google restrictions/billing, or mobile PWA behavior. See the full dated report for details.

## Continue autonomously — priority order

### P0 — Reconcile and validate the open PRs
- Fetch current PR state, latest head SHAs, review comments and required checks.
- Review complete diffs, especially transaction safety, webhook signature verification, test environment isolation and public config secret exposure.
- Fix test failures or defects in focused commits/PRs. Never merge or deploy without explicit owner approval.

### P0/P1 — Booking idempotency
- Trace the actual booking creation API, request schema, persistence model and migrations before designing the contract.
- Check existing unique constraints and voucher/reference generation.
- Implement server-side idempotency only after defining key scope, expiry/retention, duplicate-request response semantics, transaction/unique-constraint behavior and safe backward compatibility.
- Add tests for same-key retries, concurrent requests, mismatched payload with same key, failures/rollback and key reuse policy.
- Do not assume a frontend double-click guard alone is sufficient.

### P1 — Notifications provider refresh
- Inspect `lib/notifications.js` and every mutation path in `lib/integrations.js`.
- If provider settings are reloaded for every notification, introduce a bounded TTL cache with explicit invalidation after integration setting changes.
- Add tests for cache expiry, invalidation, concurrent refresh and provider failure. Do not cache credentials in logs or expose them in test output.

### P1 — Google Maps configuration
- Re-check `lib/googleMapsConfig.js`, `lib/handlers.js`, `server.js`, `/api/config`, and frontend loader on the current PR head.
- Confirm browser key is the only Maps key returned publicly; server Routes key and legacy fallback remain server-only.
- Test missing/invalid configuration and graceful booking fallback without real credentials.
- Do not ask the owner to paste secrets into chat. Request only configuration action after the code and exact API requirements are verified.

### P1 — Admin usability and authorization
- Inspect `public/admin/app.js` for silent catch blocks, unsafe prompt-based assignment, missing loading/error/empty states, keyboard access and API authorization.
- Trace every proposed UI fix to its actual API/data contract. Do not rely on frontend hiding as an authorization control.
- Add focused tests where feasible and document anything requiring browser/device verification.

### P1/P2 — PWA and operational checks
- Verify customer service-worker cache/update behavior, and determine whether admin PWA service-worker registration is an explicit requirement.
- Test that API calls and booking mutations are not served from stale cache or falsely marked successful offline.
- Keep live-domain probes read-only and opt-in; use disposable fixtures and guarantee cleanup.
- Mark unexecuted mobile, provider, live-domain and billing tests as skipped/blocked, never passed.

## Required working rules

- Work in a focused branch and PR; inspect branch base/head before edits.
- Run targeted tests first, then affected suites and isolated CI.
- Update the relevant docs and add a dated QA report for each meaningful full run.
- Report exact commit SHA, environment, passed/failed/skipped/blocked counts and artifact links.
- Never commit keys, passwords, customer data, production logs or other secrets.
- Do not run mutation tests against production, send real notifications, alter production settings, merge PRs or deploy without explicit approval.
- If a task is blocked by owner-only credentials or a commercial decision, document the precise blocker and continue all independent work.

## Definition of next useful update

When reporting back, provide: current PR status; latest CI link and counts; changes made; new defects found/fixed; skipped/blocked verification; next priority. Avoid saying “production verified” unless a separately authorized production check actually occurred.
