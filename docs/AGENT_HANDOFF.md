# STB Agent Handoff — Current Work & Next Actions

**Updated:** 2026-10-16 (phase R1 complete — all confirmed review findings fixed on their owning branches)  
**Repository:** `TenSketch/landing-stb`  
**Mode:** Test/PR work only. Production must remain untouched.

## Instructions to the next agent

Read these documents before editing code, in this order:

1. [Design-to-development master plan](DESIGN_TO_DEVELOPMENT_MASTER_PLAN.md) — execution contract, phases, design principles and release gates.
2. [Repository audit](REPOSITORY_AUDIT.md)
3. [Agile development and QA method](AGILE_DEVELOPMENT_QA_METHOD.md)
4. [Latest isolated QA report](QA-REPORT-2026-10-16-R1-REVIEW-FIXES.md)
5. [Technical debt inventory](TECHNICAL_DEBT.md)
6. [Google Maps configuration](GOOGLE_MAPS.md)

**Autonomy rule:** Continue source inspection, documentation, branch-based fixes, tests, CI and PR updates without asking for routine approval. Pause only for production merge/deploy, destructive production operations, real provider side effects, secrets, breaking contract choices or unresolved business policy. If one item is blocked, record it and continue independent work.

## PR and CI state (GitHub, 2026-10-16)

| PR | Base | Head | Head SHA | CI on head |
|---|---|---|---|---|
| [#2 Webhook hardening](https://github.com/TenSketch/landing-stb/pull/2) | main | fix/webhook-body-limit-and-routing | `55c039b61062` | **No run** — workflow file is not on this branch; local `npm test` 35/35 PASS |
| [#3 Audit & QA docs](https://github.com/TenSketch/landing-stb/pull/3) | main | docs/full-audit-agile-development-plan | tip of this branch | **No run** — docs-only branch without workflow file |
| [#4 Portable QA & isolated CI](https://github.com/TenSketch/landing-stb/pull/4) | main | test/portable-ci-baseline | `4e74b0f93597` | success — [run 38733592011](https://github.com/TenSketch/landing-stb/actions/runs/38733592011) |
| [#5 Booking transactions & Maps key split](https://github.com/TenSketch/landing-stb/pull/5) | main | fix/booking-transaction-ci | `84d415b730d7` | success — [run 38733597625](https://github.com/TenSketch/landing-stb/actions/runs/38733597625) |
| [#6 Booking idempotency](https://github.com/TenSketch/landing-stb/pull/6) | #5 branch | fix/booking-idempotency | `f24f24a09dd9` | success — [run 38733600659](https://github.com/TenSketch/landing-stb/actions/runs/38733600659) |
| [#7 Provider cache](https://github.com/TenSketch/landing-stb/pull/7) | #6 branch | perf/notification-provider-cache | `ca6f3b3a1ee0` | success — [run 38840864921](https://github.com/TenSketch/landing-stb/actions/runs/38840864921) |
| [#8 Admin dialog accessibility](https://github.com/TenSketch/landing-stb/pull/8) | #7 branch | fix/admin-dialog-accessibility | `ad34993e02e2` | success — [run 38841011312](https://github.com/TenSketch/landing-stb/actions/runs/38841011312) |
| [#9 Server-validated driver assignment](https://github.com/TenSketch/landing-stb/pull/9) | #8 branch | fix/validate-driver-assignment | `408ad700d95f` | success — [run 38841360509](https://github.com/TenSketch/landing-stb/actions/runs/38841360509) |
| [#10 Admin error feedback](https://github.com/TenSketch/landing-stb/pull/10) | #9 branch | fix/admin-error-feedback | `475b78ec9f8b` | success — [run 38841357324](https://github.com/TenSketch/landing-stb/actions/runs/38841357324) |

A passing CI run is not approval to merge or deploy. Pull requests #6–#10 form a stack on PR #5; each `base` is the previous PR's branch, and each head now contains its base head (`#10 ⊇ #9 ⊇ #8 ⊇ #7 ⊇ #6 ⊇ #5`), verified with `git merge-base --is-ancestor`.

### Branch topology notes

- **PR #4 vs PR #5 duplication:** `fix/booking-transaction-ci` contains its own cherry-picked copies of PR #4's CI/test commits (same messages, different SHAs). Merging both #4 and #5 into main will produce duplicate file additions (`.github/workflows/node-postgres-tests.yml`, `tests/audit.cjs`, `tests/e2e-suite.cjs`) and require conflict resolution. Merge order is an owner decision — do not merge either without explicit authorization.
- **Stack conflicts resolved on 2026-10-16:** PRs #7 and #8 were `mergeable: dirty` (each branch appended its own file to the single-line `test` script in `package.json`), so GitHub created no `pull_request` run for heads `6e61655` and `3017529`. The base branch was merged into each head with the test lists unioned, then propagated to #9 and #10. Keep the `test` script as a union of every suite in the stack when adding tests, or the next stacked PR will go dirty again.
- **Stale branch:** `origin/fix/booking-transaction-safety` has no PR and is superseded by `fix/booking-transaction-ci`. Candidate for deletion after owner confirmation.
- **Local unpushed branch** `fix/booking-ux-data-audit` (worktree at `/home/balaadmin/stb-qa`, 3 commits from a prior session, not pushed):
  - `ac6f82d` From/To input jumping fix + suggestion styling → unique, Phase 6 material.
  - `fb2617b` `docs/VEHICLE_PRICING_DATA-FLOW.md` → unique doc.
  - `6e9f989` optional `GOOGLE_MAPS_API_KEY_SERVER` in `lib/handlers.js` → **superseded by PR #5's key separation** (`GOOGLE_MAPS_BROWSER_API_KEY`/`GOOGLE_MAPS_SERVER_API_KEY`); must not be merged as-is.
  - Plan: re-land the two unique commits on a fresh branch from main during Phase 6; drop the maps commit.

## Review findings triage — resolved on 2026-10-16 (phase R1)

| PR | Finding | Disposition |
|---|---|---|
| #7 | **P1** `invalidateProviderCache()` called in `lib/integrations.js` but never imported | **FIXED** `eb6f68265bc8` + `backend/tests/integration_cache_invalidation.test.js` (6 assertions), CI green |
| #8 | **P1** focus trap collected focusables with `$()` then `.filter()`; `.modal-close` rebound to `$()` | **FIXED** `b03364951c9f` + `backend/tests/admin_ui_static.test.js` (8 assertions), CI green |
| #6 | **P1** Vercel `api/bookings.js` omitted the `Idempotency-Key` argument | **FIXED** `bbec787488c0` + `backend/tests/vercel_routes.test.js`, CI green |
| #6 | **P2** Vercel `api/config.js` ignored `GOOGLE_MAPS_BROWSER_API_KEY` | **FIXED** same commit, covered by the same test file |
| #9 | **P2** driver-active check ran outside the assignment transaction | **FIXED** `14b235c4cf33` (in-transaction `FOR SHARE` revalidation) + booking-status regression tests, CI green |
| #9 | **P2** `docs/ADMIN_MODULES.md` documented `{ driverName, driverPhone }` | **FIXED** same commit (`{ driverId }` body) |
| #10 | **P2** login catch swallowed API errors after global toast removal | **FIXED** `10637aeac9ba` + `backend/tests/admin_error_feedback_static.test.js` (5 assertions), CI green |
| #4 | **P2** `npm install --no-package-lock` made CI nondeterministic | **FIXED** on every branch carrying the workflow (`4e74b0f`, `84d415b`, `f24f24a`, `ca6f3b3`, `ad34993`, `408ad70`, `475b78e`) |
| #3 | **P2** revalidated XSS item stayed under "P0 — release-blocking" | **FIXED** — moved to P1 with the reclassification recorded in `docs/REPOSITORY_AUDIT.md` §5 |
| #2 | **P2** spawn `error` + `close` handlers sent duplicate deploy-failure alerts | **FIXED** `55c039b61062` (`spawnFailed` guard) + `backend/tests/webhook_hardening.test.js` (14 assertions), local 35/35 PASS |
| #5 | Codex **code review status "failed"** with unpublished findings | **BLOCKED — external dependency** (Codex quota); re-trigger when quota resets |

Dated evidence: `docs/QA-REPORT-2026-10-16-R1-REVIEW-FIXES.md` (local 35/63/71/78 assertions across the tested heads; seven green CI runs).

## Local verification baseline (VPS, 2026-10-16)

- Suites pass on the fully propagated stack head `475b78e`: pricing 8/8, auth 3/3, platform hardening 10/10, booking transactions 10/10, Maps key separation 5/5, async TTL cache 9/9, integration cache invalidation 6/6, Vercel routes 14/14, admin UI static 8/8, admin error feedback static 5/5 — **78 assertions, 0 failures**, against the disposable `stb_test` database (PostgreSQL 18, port 5433), Node v24.19.0.
- **How to run tests on this VPS** (worktree `/root/stb-work`; run as root):

  ```sh
  sudo sh -c 'cd /root/stb-work && export $(python3 -c "
  import io
  for line in io.open(\"/root/stb-work/.env\",encoding=\"utf-8\"):
      line=line.strip()
      if line.startswith(\"DATABASE_URL=\"):
          print(\"DATABASE_URL=\"+line.split(\"=\",1)[1].strip().strip(chr(34)).strip(chr(39)))
          break
  ") && env PATH=/usr/local/bin:/usr/bin:/bin NODE_ENV=test INITIAL_ADMIN_EMAIL=admin@example.com \
  SUPER_ADMIN_OTP_REQUIRED=false PG_SSL=false \
  STB_SECRET_KEY="test-only-secret-key-32-bytes-minimum!!" \
  SMTP_HOST="" SMTP_USER="" SMTP_PASSWORD="" EMAIL_FROM="" /usr/local/bin/npm test'
  ```

  - **`DATABASE_URL` must be exported from `.env` before npm runs.** `booking_status`, `vercel_routes` and `integration_cache_invalidation` read `process.env.DATABASE_URL` before anything imports dotenv, so a run without the export fails at line 8 with `DATABASE_URL must point to a disposable PostgreSQL instance`.
  - **Never pass a hand-built `DATABASE_URL`** — the real password contains shell/URL-sensitive characters and a mangled override fails scram auth with a misleading `28P01`.
  - `SMTP_*` must be forced empty in every test run so no real email can reach the client mailbox (2026-09 incident: STB test mail landed in Theesma's inbox).
  - The DB-dependent suites rewrite the path to `/stb_test` themselves; `platform_hardening.test.js` drops and recreates it.
- CI parity: GitHub workflow uses Node 20 + ephemeral PostgreSQL 16 on Ubuntu; local runs use Node 24 + PostgreSQL 18 — record this difference in QA reports.

## Blockers (external — record and continue independent work)

1. **Codex review quota exhausted** — PR #5's unresolved findings were never published; re-run `@codex review` when quota resets.
2. **No CI on main / PR #2 / PR #3** — the workflow file ships inside PRs #4 and #5; until one merges (owner decision), those refs get no checks. Do not copy the workflow onto #2/#3 without the owner's merge-order decision.
3. **Vercel preview quota** — preview deployments on PRs hit the free-tier daily limit; this affects previews only, never production. Not agent-actionable.
4. **Browser/device/manual accessibility checks** — no browser tooling on this VPS; the dialog and admin-feedback fixes are verified by static source assertions only.
5. **Live-domain probes, real provider sends, Google Maps billing/restrictions** — opt-in and owner-authorized only.
6. **Owner-pending decisions (do not touch):** brand tagline, reply-to `bala@tensketch.com`, audit report filters, new GCP Maps key rotation.
7. **Unauthenticated GitHub API quota (60/h)** — `gh` is not logged in and no token is stored; use `git` over SSH for refs and scrape `https://github.com/.../actions/runs/<id>` HTML when API calls are rate-limited.

## Execution plan for this session (one phase = one commit = one PR update)

| Phase | Scope | Status |
|---|---|---|
| R0 | Reconcile branches/PRs/CI/reviews; update this handoff | **COMPLETE — merged into this update** |
| R1 | Fix confirmed review defects on their owning PR branches (#7, #8, #6, #9, #10, #4, #3, #2), each with tests | **COMPLETE — all fixes pushed, seven CI runs green, evidence in QA-REPORT-2026-10-16-R1-REVIEW-FIXES.md** |
| R2 | Reconcile local `fix/booking-ux-data-audit`: re-land unique commits on a fresh branch, drop superseded maps commit | NOT STARTED (next) |
| R3 | Phase 5 remainder — API authorization boundary audit; extend tests for any gap found | NOT STARTED |
| R4 | Phase 6 — customer UX/design system: design-token inventory, guided-flow vertical slice, validation/keyboard checks | NOT STARTED |
| R5 | Phase 7 — PWA cache/update/offline verification + performance notes; automated service-worker safety checks | NOT STARTED |
| R6 | Phase 8 — full regression on a candidate SHA, migration rehearsal, secrets/dependency review, dated QA report, release dossier | NOT STARTED |

Phase status vocabulary follows the master plan: `NOT STARTED`, `IN PROGRESS`, `PASS — PR OPEN`, `FAIL — FIX REQUIRED`, `BLOCKED — EXTERNAL DEPENDENCY`, `OWNER DECISION REQUIRED`, `COMPLETE — MERGED`.

## Required working rules

- Work in a focused branch and PR; inspect branch base/head before edits.
- Run targeted tests first, then affected suites and isolated CI.
- Update the relevant docs and add a dated QA report for each meaningful full run.
- Report exact commit SHA, environment, passed/failed/skipped/blocked counts and artifact links.
- Never commit keys, passwords, customer data, production logs or other secrets.
- Do not run mutation tests against production, send real notifications, alter production settings, merge PRs or deploy without explicit approval.
- If a task is blocked by owner-only credentials or a commercial decision, document the precise blocker and continue all independent work.

## Definition of next useful update

When reporting back, provide: current PR status; latest CI link and counts; changes made; new defects found/fixed; skipped/blocked verification; next priority. Avoid saying "production verified" unless a separately authorized production check actually occurred.
