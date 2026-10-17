# QA Report — 2026-10-17 — R1 independent verification (docs head)

**Phase:** R1 (re-verification of the phase completed 2026-10-16)
**Branch:** `docs/full-audit-agile-development-plan` (PR #3)
**Mode:** Test and documentation only. No merge, no deploy, no production access.
**Environment:** VPS worktree `/root/stb-work`, Node v24.19.0, PostgreSQL 18.6 on port 5433
(disposable `stb_test` database — `stb_dev`/`stb` never touched), `SMTP_HOST`/`SMTP_USER`/
`SMTP_PASSWORD`/`EMAIL_FROM` forced **empty** so no notification can reach a real mailbox.

## Why this run happened

The previous session's handoff listed PR #2 and PR #3 as still remaining. Inspection showed both
had in fact been committed and pushed. Because the prior claims were self-reported, everything
below was re-derived from the repository, the test suites and the GitHub API instead of being
carried over.

## 1. PR #2 — webhook duplicate deploy-failure alert

| Step | Command / evidence | Result |
|---|---|---|
| Head matches remote | `git rev-parse HEAD origin/fix/webhook-body-limit-and-routing` | `55c039b61062…` on both — **pushed** |
| Fix present | `spawnFailed` guard at `webhook-server.cjs:105,107,116` | present |
| **RED (fix reverted)** | `git show e66158f:webhook-server.cjs > webhook-server.cjs`, then `node backend/tests/webhook_hardening.test.js` | **FAILED** — `ERR_ASSERTION` at `webhook_hardening.test.js:156` (close-handler guard), non-zero exit |
| GREEN (fix restored) | `git checkout -- webhook-server.cjs`, re-run same suite | **14/14 assertions passed** |
| Full chain on the PR #2 branch | `npm test` | pricing 8/8, auth 3/3, platform hardening 10/10, webhook 14 → **35 assertions, exit 0** |
| Integrity after the RED/GREEN dance | `sha256sum webhook-server.cjs` vs `git show HEAD:webhook-server.cjs \| sha256sum` | `fc59e5d8…` identical; `git status` shows only the known `?? node_modules` symlink quirk |

The test exercises only safe webhook paths: non-`main` branches, non-`push` events, malformed
JSON, missing/invalid signature and oversized bodies. The push-to-`main` deploy path is never
spawned, and the server is started with an empty `TELEGRAM_BOT_TOKEN`, so no alert leaves the box.

## 2. Stack head — full regression re-run

`fix/admin-error-feedback` @ `475b78e` (the top of the PR #6–#10 stack):

| Suite | Assertions |
|---|---|
| pricing engine | 8 |
| auth and audit | 3 |
| platform hardening | 10 |
| booking status | 10 |
| Google Maps key separation | 5 |
| async TTL cache | 9 |
| integration cache invalidation | 6 |
| Vercel routes | 14 |
| admin UI static | 8 |
| admin error feedback static | 5 |
| **Total** | **78 assertions, 0 failures, exit 0** |

This reproduces the 2026-10-16 baseline exactly, one day later and on a clean checkout.

## 3. PR head and CI reconciliation (GitHub API, 2026-10-17)

| PR | Branch | Head SHA | CI on that head |
|---|---|---|---|
| #2 | fix/webhook-body-limit-and-routing | `55c039b61062` | **NO RUN** — no workflow file on the branch (not "pending") |
| #3 | docs/full-audit-agile-development-plan | `55a19c9ffd7e` | **NO RUN** — docs-only branch |
| #4 | test/portable-ci-baseline | `4e74b0f93597` | success — run 38733592011 |
| #5 | fix/booking-transaction-ci | `84d415b730d7` | success — run 38733597625 |
| #6 | fix/booking-idempotency | `f24f24a09dd9` | success — run 38733600659 |
| #7 | perf/notification-provider-cache | `ca6f3b3a1ee0` | success — run 38840864921 |
| #8 | fix/admin-dialog-accessibility | `ad34993e02e2` | success — run 38841011312 |
| #9 | fix/validate-driver-assignment | `408ad700d95f` | success — run 38841360509 |
| #10 | fix/admin-error-feedback | `475b78ec9f8b` | success — run 38841357324 |

Seven green runs, each on the exact recorded head SHA. A passing run is **not** approval to merge.

## 4. PR #3 — XSS reclassification completeness

The reclassification itself was already recorded in `REPOSITORY_AUDIT.md` §5 (P0 → P1). Two legacy
tables still asserted the opposite and are corrected here:

- `docs/SECURITY.md` — the `Known Vulnerabilities` row listed the XSS finding as **Critical** while
  the same page's revalidated section says it is not confirmed. Row marked **Reclassified** with the
  real remaining action (hostile-input regression coverage + URL-scheme validation).
- `docs/TECHNICAL_DEBT.md` — `Critical Debt` row 1 repeated the Critical claim and a fix
  ("add `escapeHtml()` calls") that is already implemented. Row annotated with the revalidation date
  and the accurate next action.

Both files are identical blobs on `main` and on all eight fix branches, so the correction is made
once on the docs branch, which is where the revalidated source of truth lives.

## 5. Documentation-consistency fixes

- `docs/AGENT_HANDOFF.md` PR #3 head cell replaced a knowingly stale SHA with a rule, since a
  commit cannot record its own hash.
- Handoff `Updated:` line and local-baseline section now carry this re-verification; the docs-branch
  chain itself (pricing 8/8, auth 3/3, platform 10/10 = 21 assertions) was re-run green.

## 6. Skipped / blocked

| Item | Status |
|---|---|
| PR #5 Codex code-review findings | **BLOCKED — external dependency** (review quota); still unpublished, not "clean" |
| Browser/device accessibility checks | **BLOCKED** — no browser tooling on this VPS; dialog/admin fixes remain static-assertion evidence only |
| CI on `main`, #2 and #3 | **NOT AVAILABLE** — the workflow ships inside PRs #4/#5; copying it onto #2/#3 is an owner merge-order decision |
| Live-domain probes, real provider sends, Google Maps billing checks | **NOT RUN** — opt-in and owner-authorized only |

## Verdict

R1's eight confirmed findings are **fixed on their owning branches and independently verified** to
the limit of what this environment can prove. Remaining risk is external (Codex quota, no browser
tooling, merge-order decision). Nothing here authorises a merge or a deploy.
