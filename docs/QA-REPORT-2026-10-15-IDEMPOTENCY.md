# STB QA Report — Booking Idempotency PR

**Run date:** 2026-10-15  
**PR:** [#6 — Booking idempotency](https://github.com/TenSketch/landing-stb/pull/6)  
**Tested commit:** `121ed72d453aa1c7f14495d5087fd97b45b8401a`  
**Workflow:** [GitHub Actions run 38702778525](https://github.com/TenSketch/landing-stb/actions/runs/38702778525)  
**Environment:** GitHub-hosted Ubuntu, Node.js 20, ephemeral PostgreSQL 16, local Express test server  
**Production touched:** No  
**Deployment performed:** No

## Result

**PASS for the isolated CI scope.** The workflow completed successfully on the recorded commit.

| Suite | Passed | Failed | Skipped |
|---|---:|---:|---:|
| Pricing unit tests | 8 | 0 | 0 |
| Auth/session helper tests | 3 | 0 | 0 |
| Backend/database integration tests | 10 | 0 | 0 |
| Booking transaction/dispatch tests | 8 | 0 | 0 |
| Google Maps key-separation tests | 5 | 0 | 0 |
| Local E2E | 93 | 0 | 3 |
| Local security audit | 43 | 0 | 1 |
| **Total** | **170** | **0** | **4** |

## Idempotency checks added to E2E

- Same key and same payload returns the original voucher.
- Same key with a changed payload returns HTTP 409.
- Only one booking row exists for the voucher after a replay.
- Concurrent requests with the same key return the same voucher and create one row.
- Malformed idempotency key returns HTTP 400.

The E2E booking phase recorded 11 passes and no failures. Syntax checks, unit/database tests, E2E enforcement and local security audit enforcement all passed.

## Skipped checks and limits

- Three E2E checks were skipped in the existing edge/cleanup sections.
- One public-domain security audit check was skipped by design.
- No live-domain probes, real email/SMS/WhatsApp delivery, Google Cloud billing/key restriction test, mobile-device PWA test or production runtime check was performed.
- The test is against the stacked PR #6 head based on PR #5. PR #6 is not merged, and its base should be retargeted to main only after the PR #5 changes are integrated.

## Review notes

- Booking persistence and the initial idempotency response are written in the same DB transaction.
- Email sends occur after booking commit. The documented idempotency guarantee prevents duplicate bookings and avoids repeated notification sends on a replay; it does not provide exactly-once external delivery. A transactional outbox remains a separate reliability improvement.
- The cache is updated with final email results after sends. A very fast replay while the original request is still sending email can receive the initial response with null email-result fields, but it receives the same voucher and does not create another booking.

## Recommendation

Keep PR #6 open for code review and stacked-PR integration. The CI result is green for the isolated scope, but it does not authorize merge or deployment.
