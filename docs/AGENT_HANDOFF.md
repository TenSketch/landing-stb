# STB Agent Handoff — Current Work & Next Actions

**Updated:** 2026-10-15  
**Repository:** `TenSketch/landing-stb`  
**Mode:** Test/PR work only. Production must remain untouched.

## Instructions to the next agent

Read these documents before editing code, in this order:

1. [Design-to-development master plan](DESIGN_TO_DEVELOPMENT_MASTER_PLAN.md) — execution contract, phases, design principles and release gates.
2. [Repository audit](REPOSITORY_AUDIT.md)
3. [Agile development and QA method](AGILE_DEVELOPMENT_QA_METHOD.md)
4. [Latest isolated QA report](QA-REPORT-2026-10-15.md)
5. [Technical debt inventory](TECHNICAL_DEBT.md)
6. [Google Maps configuration](GOOGLE_MAPS.md)

**Autonomy rule:** Continue source inspection, documentation, branch-based fixes, tests, CI and PR updates without asking for routine approval. Pause only for production merge/deploy, destructive production operations, real provider side effects, secrets, breaking contract choices or unresolved business policy. If one item is blocked, record it and continue independent work.

Then independently inspect the current default branch, open PRs, branch heads, changed files, and CI status. Do not assume this handoff is newer than the repository state; reconcile it with GitHub before acting.

## Work completed in open PRs (not merged)

| PR | Scope | Current evidence | Required next step |
|---|---|---|---|
| [#2 Webhook hardening](https://github.com/TenSketch/landing-stb/pull/2) | Request body cap, timing-safe HMAC comparison, route/method handling, JSON errors and spawn error handling | Open PR; inspect latest checks and review the complete diff | Review webhook signature/body handling and deployment side effects; add targeted tests if gaps remain |
| [#3 Audit and QA documentation](https://github.com/TenSketch/landing-stb/pull/3) | Repository audit, Agile QA method, docs index and this handoff | Open PR; documentation changes only | Check all claims against the current source and keep this handoff updated as work progresses |
| [#4 Portable QA and isolated CI](https://github.com/TenSketch/landing-stb/pull/4) | Removes hard-coded VPS paths from QA scripts; configurable local target/DB; opt-in public probes; PostgreSQL-backed CI workflow | Prior workflow passed; see [CI run](https://github.com/TenSketch/landing-stb/actions/runs/38690638384) | Review workflow safety, cleanup and skipped checks; verify latest run rather than relying on this historical link |
| [#5 Booking transaction safety and Maps key split](https://github.com/TenSketch/landing-stb/pull/5) | Client-scoped DB transactions for booking status/driver assignment, audit writes in transaction, concurrency/rollback regression tests, browser/server Maps key separation | Latest recorded combined run: [CI run](https://github.com/TenSketch/landing-stb/actions/runs/38691010883) | Inspect the latest PR head and diff; verify transaction boundaries and all key paths before considering complete |
| [#6 Booking idempotency](https://github.com/TenSketch/landing-stb/pull/6) | Transactional idempotency key storage, same-key replay, mismatched-payload conflict, customer key reuse and E2E concurrency tests | [CI passed](https://github.com/TenSketch/landing-stb/actions/runs/38702778525): 93 E2E passed, 0 failed, 3 skipped; 43 security checks passed, 1 skipped; unit/database/transaction/Maps suites all passed | Review idempotency failure/notification semantics and keep stacked on PR #5 until its base changes are integrated. PR #6 is stacked on PR #5's branch and should be retargeted to main only after its base changes are integrated.
| [#7 Notification provider cache](https://github.com/TenSketch/landing-stb/pull/7) | Configurable 30-second TTL cache, single-flight refresh, invalidation on integration mutations and cache utility tests | [CI passed](https://github.com/TenSketch/landing-stb/actions/runs/38703088482): 9 cache assertions passed, 93 E2E passed, 0 failed, 3 skipped; 43 security checks passed, 1 skipped; all workflow steps green | Review cache invalidation/failure behavior and keep stacked on PR #6 until its base changes are integrated |
| [#8 Accessible driver assignment dialog](https://github.com/TenSketch/landing-stb/pull/8) | Dialog semantics, labels, focus entry/trap/restore, Escape close | [CI passed](https://github.com/TenSketch/landing-stb/actions/runs/38703397239): 93 E2E passed, 0 failed, 3 skipped; 43 security checks passed, 1 skipped | Manual keyboard/screen-reader/device checks remain blocked until a browser/device pass is recorded; PR #8 is stacked on PR #7 |
| [#9 Server-validated driver assignment](https://github.com/TenSketch/landing-stb/pull/9) | Active-driver-only API, dispatch-scoped safe choices, driver ID validation, E2E tests for active/malformed/inactive records | [CI passed](https://github.com/TenSketch/landing-stb/actions/runs/38703786164): 98 E2E passed, 0 failed, 3 skipped; 43 security checks passed, 1 skipped; all workflow steps green | Review authorization/data contract; stacked on PR #8 |
| [#10 Admin error feedback](https://github.com/TenSketch/landing-stb/pull/10) | Removes global toast duplication; action handlers show one toast and page loaders show inline errors | CI pending at handoff update | Verify the latest CI and check expired-session behavior; stacked on PR #9 |

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

### P0/P1 — Booking idempotency (implementation in PR #6; pending CI)
- Traced `POST /api/bookings`, customer submit code, voucher generation, `saveBooking`, and migration strategy.
- Added an optional `Idempotency-Key` header, payload fingerprinting, hashed key storage, 24-hour expiry, transaction-scoped booking persistence and replay response.
- Customer form reuses a key for retries of the same payload and generates a new key when payload changes.
- E2E now checks same-key replay, payload mismatch, malformed key, single-row persistence and concurrent same-key requests.
- Verify latest CI and review failure/notification semantics before marking complete. See [PR #6](https://github.com/TenSketch/landing-stb/pull/6) and [idempotency contract](https://github.com/TenSketch/landing-stb/blob/fix/booking-idempotency/docs/BOOKING_IDEMPOTENCY.md).

### P1 — Notifications provider refresh (PR #7 CI passed)
- Confirm CI and review `lib/asyncTtlCache.js`, `lib/notifications.js`, and all mutation paths in `lib/integrations.js`.
- Provider settings are cached for 30 seconds by default (`STB_PROVIDER_CACHE_TTL_MS`); integration changes invalidate the cache.
- Tests cover TTL expiry, shared in-flight loads, invalidation during refresh and failure recovery. Ensure no secret values are emitted in logs. CI evidence is in [QA-REPORT-2026-10-15-PROVIDER-CACHE.md](QA-REPORT-2026-10-15-PROVIDER-CACHE.md).

### P1 — Google Maps configuration
- Re-check `lib/googleMapsConfig.js`, `lib/handlers.js`, `server.js`, `/api/config`, and frontend loader on the current PR head.
- Confirm browser key is the only Maps key returned publicly; server Routes key and legacy fallback remain server-only.
- Test missing/invalid configuration and graceful booking fallback without real credentials.
- Do not ask the owner to paste secrets into chat. Request only configuration action after the code and exact API requirements are verified.

### P1 — Admin usability and authorization (PR #8/#9 CI passed)
- PR #8 adds keyboard/screen-reader dialog semantics; CI passed, but manual browser/device verification is still required.
- PR #9 validates the driver ID against active database records and restricts the assignment-choice endpoint by dispatch permission; isolated CI passed.
- PR #10 addresses duplicate error toasts; verify its CI. Then audit remaining loading/empty states and API authorization boundaries, followed by PWA behavior.

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
