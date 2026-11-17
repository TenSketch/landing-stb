# STB QA Report — 2026-10-16 — R1 review-finding fixes

**Result:** PASS for the isolated local and CI test scope
**Scope:** handoff phase R1 — fix every confirmed Codex review finding on its owning PR branch, each with a regression test
**Production touched:** No
**Deployment performed:** No
**Merges performed:** No

## Environment

| Item | Value |
|---|---|
| Host | VPS (Ubuntu), PostgreSQL 18 on `127.0.0.1:5433`, Node v24.19.0 |
| Local worktree | `/root/stb-work` (worktree of `/root/landing-stb`) |
| Disposable database | `stb_test` (created/reset by `platform_hardening.test.js`) |
| CI parity difference | CI runs Node 20 + PostgreSQL 16; local runs Node 24 + PostgreSQL 18 |
| Test env | `NODE_ENV=test`, `SMTP_*` forced empty, `STB_SECRET_KEY` test-only, dotenv `.env` for `DATABASE_URL` |

## Local runs (this host, `npm test`)

| Branch / head | Suites run | Result |
|---|---|---|
| `fix/webhook-body-limit-and-routing` `55c039b61062` | pricing 8, auth 3, platform 10, webhook hardening 14 | 35/35 PASS |
| `perf/notification-provider-cache` `ca6f3b3a1ee0` | + booking transaction 8, Maps key separation 5, async TTL cache 9, integration cache invalidation 6, Vercel routes 14 | 63/63 PASS |
| `fix/admin-dialog-accessibility` `ad34993e02e2` | + admin UI static 8 | 71/71 PASS |
| `fix/admin-error-feedback` `475b78ec9f8b` | + admin error feedback static 5 | 78/78 PASS |

Every run exited 0 with `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` and `EMAIL_FROM` empty, so no real mail could be sent. No live domain, webhook service, provider or production database was contacted.

## CI runs (GitHub Actions, all conclusions `success`)

| PR | Head | Run |
|---|---|---|
| #4 | `4e74b0f93597` | [38733592011](https://github.com/TenSketch/landing-stb/actions/runs/38733592011) |
| #5 | `84d415b730d7` | [38733597625](https://github.com/TenSketch/landing-stb/actions/runs/38733597625) |
| #6 | `f24f24a09dd9` | [38733600659](https://github.com/TenSketch/landing-stb/actions/runs/38733600659) |
| #7 | `ca6f3b3a1ee0` | [38840864921](https://github.com/TenSketch/landing-stb/actions/runs/38840864921) |
| #8 | `ad34993e02e2` | [38841011312](https://github.com/TenSketch/landing-stb/actions/runs/38841011312) |
| #9 | `408ad700d95f` | [38841360509](https://github.com/TenSketch/landing-stb/actions/runs/38841360509) |
| #10 | `475b78ec9f8b` | [38841357324](https://github.com/TenSketch/landing-stb/actions/runs/38841357324) |

Each run passed Node syntax checks, `npm test`, isolated server boot, the E2E suite and the security audit (the E2E and audit steps are enforced by the workflow).

## Defects fixed in this pass

| PR | Finding | Fix commit | Regression coverage |
|---|---|---|---|
| #2 | spawn `error` plus `close` handlers sent two deploy-failure alerts | `55c039b61062` (`spawnFailed` guard) | `backend/tests/webhook_hardening.test.js` (14 assertions: body cap declared and streamed, fail-closed signatures, route/method handling, generic JSON errors, guard source checks) |
| #4 | `npm install --no-package-lock` made CI nondeterministic | `4e74b0f…`, `84d415b…`, `f24f24a…`, `ca6f3b3…`, `ad34993…`, `408ad70…`, `475b78e…` (same 1-line change on every branch carrying the workflow) | workflow runs above |
| #6 | Vercel `api/bookings.js` omitted the `Idempotency-Key` argument; `api/config.js` ignored the browser-key selector | `bbec787488c0` | `backend/tests/vercel_routes.test.js` (14 assertions) |
| #7 | `invalidateProviderCache()` called but never imported — every integration mutation threw `ReferenceError` after persisting | `eb6f68265bc8` | `backend/tests/integration_cache_invalidation.test.js` (6 assertions) |
| #8 | focus trap filtered a single `querySelector` result; `.modal-close` bound with the single-element helper | `b03364951c9f` | `backend/tests/admin_ui_static.test.js` (8 assertions) |
| #9 | driver-active check ran outside the assignment transaction; docs still showed `{ driverName, driverPhone }` | `14b235c4cf33` | in-suite additions to `backend/tests/booking_status.test.js` (inactive driver rejected, authoritative record used) + `docs/ADMIN_MODULES.md` |
| #10 | login catch swallowed API errors after the global toast removal | `10637aeac9ba` | `backend/tests/admin_error_feedback_static.test.js` (5 assertions) |
| #3 | revalidated XSS finding still listed under "P0 — release-blocking" | this branch | item moved to P1 with the reclassification recorded in `docs/REPOSITORY_AUDIT.md` |

## Additional defect found and fixed during this pass

**Stacked PRs #7 and #8 could not run CI at all.** Both reported `mergeable: false / dirty`: each branch appended its own file to the single-line `test` script in `package.json`, so the base/head merge conflicted and GitHub never created a `pull_request` run for those heads (no workflow run exists for `6e61655` or `3017529`). The base branch was merged into each head with the test lists unioned, and the same propagation was applied to #9 and #10, so every head from #6 upward contains its base head (`#10 ⊇ #9 ⊇ #8 ⊇ #7 ⊇ #6`). PRs #6–#10 fork from #5's `a106370`; #5's head `84d415b` differs only by the identical lockfile workflow line, and `git merge-tree` is clean for every adjacent pair. Local `npm test` on the propagated heads passed 63/63, 71/71 and 78/78, and CI is green on all four new heads.

## What was not verified

1. **Browser, keyboard and screen-reader behaviour** — no browser tooling on this host. The admin dialog and error-feedback checks are static source assertions, so they prove the defect pattern is gone from the source, not that a real dialog traps focus on a device.
2. **PR #2 and PR #3 CI** — neither branch carries `.github/workflows/node-postgres-tests.yml`; adding it would duplicate the workflow already shipped in PRs #4/#5 and is an owner merge-order decision.
3. **Codex re-review of PR #5** — still blocked by the exhausted review quota.
4. **Live webhook service, real notification providers, Google Maps billing/restrictions, iOS/Android PWA install/update, production deployment** — not attempted; owner-authorized only.
5. **End-to-end browser check of the fixed login error path** — covered by static contract tests only.

## Release recommendation

**Keep all PRs open.** This report establishes that each reviewed defect is fixed on its owning branch with regression coverage and that the isolated CI scope is green. It does not claim merge approval, production verification or live-provider verification.
