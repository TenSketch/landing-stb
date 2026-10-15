# STB Agent Handoff — Current Work & Next Actions

**Updated:** 2026-10-15 (reconciliation pass R0, verified against GitHub API and local source)  
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

## Reconciled PR and CI state (GitHub API, 2026-10-15)

All nine PRs below were re-checked directly against GitHub. Heads and checks are exact as of this update.

| PR | Base | Head | Head SHA | CI on head |
|---|---|---|---|---|
| [#2 Webhook hardening](https://github.com/TenSketch/landing-stb/pull/2) | main | fix/webhook-body-limit-and-routing | `e66158f9e968` | **No run** — workflow file does not exist on this branch (added later by PR #4/#5) |
| [#3 Audit & QA docs](https://github.com/TenSketch/landing-stb/pull/3) | main | docs/full-audit-agile-development-plan | `7e04566efdbe` | **No run** — docs-only branch without workflow file |
| [#4 Portable QA & isolated CI](https://github.com/TenSketch/landing-stb/pull/4) | main | test/portable-ci-baseline | `35eb114b3ff5` | success — [run 38690638384](https://github.com/TenSketch/landing-stb/actions/runs/38690638384) |
| [#5 Booking transactions & Maps key split](https://github.com/TenSketch/landing-stb/pull/5) | main | fix/booking-transaction-ci | `a10637088b1f` | success — [run 38691010883](https://github.com/TenSketch/landing-stb/actions/runs/38691010883) |
| [#6 Booking idempotency](https://github.com/TenSketch/landing-stb/pull/6) | #5 branch | fix/booking-idempotency | `121ed72d453a` | success — [run 38702778525](https://github.com/TenSketch/landing-stb/actions/runs/38702778525) |
| [#7 Provider cache](https://github.com/TenSketch/landing-stb/pull/7) | #6 branch | perf/notification-provider-cache | `5376845fbbfc` | success — [run 38703088482](https://github.com/TenSketch/landing-stb/actions/runs/38703088482) |
| [#8 Admin dialog accessibility](https://github.com/TenSketch/landing-stb/pull/8) | #7 branch | fix/admin-dialog-accessibility | `326790f53731` | success — [run 38703397239](https://github.com/TenSketch/landing-stb/actions/runs/38703397239) |
| [#9 Server-validated driver assignment](https://github.com/TenSketch/landing-stb/pull/9) | #8 branch | fix/validate-driver-assignment | `5cb83e75b0a2` | success — [run 38703786164](https://github.com/TenSketch/landing-stb/actions/runs/38703786164) |
| [#10 Admin error feedback](https://github.com/TenSketch/landing-stb/pull/10) | #9 branch | fix/admin-error-feedback | `8e3c837d1d2f` | success — [run 38704232283](https://github.com/TenSketch/landing-stb/actions/runs/38704232283) |

A passing CI run is not approval to merge or deploy. Pull requests #6–#10 form a stack on PR #5; each `base` is the previous PR's branch.

### Branch topology notes

- **PR #4 vs PR #5 duplication:** `fix/booking-transaction-ci` contains its own cherry-picked copies of PR #4's CI/test commits (same messages, different SHAs; `origin/test/portable-ci-baseline` is *not* an ancestor). Merging both #4 and #5 into main will produce duplicate file additions (`.github/workflows/node-postgres-tests.yml`, `tests/audit.cjs`, `tests/e2e-suite.cjs`) and require conflict resolution. Merge order is an owner decision — do not merge either without explicit authorization.
- **Stale branch:** `origin/fix/booking-transaction-safety` has no PR and is superseded by `fix/booking-transaction-ci`. Candidate for deletion after owner confirmation.
- **Local unpushed branch** `fix/booking-ux-data-audit` (worktree at `/home/balaadmin/stb-qa`, 3 commits from a prior session, not pushed):
  - `ac6f82d` From/To input jumping fix + suggestion styling → unique, Phase 6 material.
  - `fb2617b` `docs/VEHICLE_PRICING_DATA-FLOW.md` → unique doc.
  - `6e9f989` optional `GOOGLE_MAPS_API_KEY_SERVER` in `lib/handlers.js` → **superseded by PR #5's key separation** (`GOOGLE_MAPS_BROWSER_API_KEY`/`GOOGLE_MAPS_SERVER_API_KEY`); must not be merged as-is.
  - Plan: re-land the two unique commits on a fresh branch from main during Phase 6; drop the maps commit.

## Codex review findings triage (verified against current heads)

| PR | Finding | Verification | Disposition |
|---|---|---|---|
| #7 | **P1** `invalidateProviderCache()` called in `lib/integrations.js` but never imported/defined | **CONFIRMED** — head `5376845f`: 4 call sites, only `db.js` and `security.js` imported; `invalidateProviderCache` is exported from `notifications.js`. Every integration mutation throws `ReferenceError` after persisting (400 to client, cache never invalidated). CI passed because no suite exercises integration mutations. | Fix commit on `perf/notification-provider-cache` + regression test |
| #8 | **P1** focus trap collects focusables with `$()` (single `querySelector`) then `.filter()` | To verify on head `326790f5` during fix pass | Fix on `fix/admin-dialog-accessibility` if reproduced |
| #6 | **P1** Vercel route `api/bookings.js` omits the `Idempotency-Key` argument to `handleCreateBooking` | To verify on head `121ed72d` | Fix on `fix/booking-idempotency` + handler test |
| #6 | **P2** Vercel `api/config.js` ignores `GOOGLE_MAPS_BROWSER_API_KEY` selector | To verify on head `121ed72d` | Fix on `fix/booking-idempotency` |
| #9 | **P2** driver-active check runs outside the assignment transaction (deactivation race) | To verify on head `5cb83e75` | Fix on `fix/validate-driver-assignment` + transaction test |
| #9 | **P2** `docs/ADMIN_MODULES.md` still documents `{ driverName, driverPhone }` request body | To verify | Docs fix on same branch |
| #10 | **P2** login catch swallows API errors after global toast removal (silent failed sign-in) | To verify on head `8e3c837d` | Fix on `fix/admin-error-feedback` |
| #4 | **P2** `npm install --no-package-lock` makes CI nondeterministic; `package-lock.json` exists on main | **CONFIRMED** in workflow on #4/#5 heads | Fix on `test/portable-ci-baseline` (and mirror if #5 carries its own copy) |
| #3 | **P2** `docs/REPOSITORY_AUDIT.md` keeps the revalidated-no-longer-confirmed XSS item under "P0 — release-blocking" | **CONFIRMED** — item text already says the claim "is not confirmed by this inspection" yet stays in the P0 release-blocking list | Reclassify on `docs/full-audit-agile-development-plan` |
| #2 | **P2** spawn `error` handler plus `close` handler can send duplicate deployment-failure alerts | To verify on head `e66158f9` | Fix on `fix/webhook-body-limit-and-routing` |
| #5 | Codex **code review status "failed"** at `31f450f` with unresolved findings | Findings were never published — Codex usage quota hit immediately after (comment on PR #5) | **BLOCKED — external dependency** (Codex quota); re-trigger when quota resets |

## Local verification baseline (VPS, 2026-10-15)

- `main` `57c9677`: `npm test` **green** — pricing 8/8, auth/session 3/3, platform hardening 10/10 (21 total) against a disposable `stb_test` database (PostgreSQL 18, port 5433), Node v24.19.0.
- **How to run tests on this VPS:** `sudo sh -c 'cd /root/landing-stb && env NODE_ENV=test INITIAL_ADMIN_EMAIL=admin@example.com SUPER_ADMIN_OTP_REQUIRED=false PG_SSL=false STB_SECRET_KEY="test-only-secret-key-32-bytes-minimum!!" SMTP_HOST="" SMTP_USER="" SMTP_PASSWORD="" EMAIL_FROM="" /usr/local/bin/node <test-file>'`.
  - Let dotenv load `.env` for `DATABASE_URL`. **Never pass a hand-built `DATABASE_URL`** — the real password contains shell/URL-sensitive characters and a mangled override fails scram auth with a misleading `28P01`.
  - `SMTP_*` must be forced empty in every test run so no real email can reach the client mailbox (2026-09 incident: STB test mail landed in Theesma's inbox).
  - `platform_hardening.test.js` drops and recreates `stb_test` itself; other suites are read-only or use `stb_test`.
- CI parity: GitHub workflow uses Node 20 + ephemeral PostgreSQL 16 on Ubuntu; local runs use Node 24 + PostgreSQL 18 — record this difference in QA reports.

## Blockers (external — record and continue independent work)

1. **Codex review quota exhausted** — PR #5's unresolved findings were never published; re-run `@codex review` when quota resets.
2. **No CI on main / PR #2 / PR #3** — the workflow file ships inside PRs #4 and #5; until one merges (owner decision), those refs get no checks.
3. **Vercel preview quota** — preview deployments on PRs hit the free-tier daily limit; this affects previews only, never production. Not agent-actionable.
4. **Browser/device/manual accessibility checks** — no browser tooling on this VPS; headless attempts will be recorded, otherwise marked BLOCKED (never passed).
5. **Live-domain probes, real provider sends, Google Maps billing/restrictions** — opt-in and owner-authorized only.
6. **Owner-pending decisions (do not touch):** brand tagline, reply-to `bala@tensketch.com`, audit report filters, new GCP Maps key rotation.

## Execution plan for this session (one phase = one commit = one PR update)

| Phase | Scope | Status |
|---|---|---|
| R0 | Reconcile branches/PRs/CI/reviews; update this handoff | **this commit** |
| R1 | Fix confirmed review defects on their owning PR branches (#7, #8, #6, #9, #10, #4, #3, #2), each with tests | NOT STARTED |
| R2 | Reconcile local `fix/booking-ux-data-audit`: re-land unique commits on a fresh branch, drop superseded maps commit | NOT STARTED |
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
