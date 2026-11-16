# STB PR reconciliation and booking application audit

**Date:** 2026-11-17  
**Review branch:** `integration/stb-booking-reconciliation-2026-11-17`  
**Review PR:** [#11](https://github.com/TenSketch/landing-stb/pull/11)  
**Production:** Not merged or deployed

## Goal and architecture

Improve the **existing** Express/PostgreSQL STB customer inquiry/booking application. Preserve public homepage, admin/customer modules, booking API, database and deployments. Do not replace the app.

Current customer workflow: pickup/destination and trip mode → Singapore pickup date and time → vehicle/fare estimate → passenger details/review → persisted inquiry reference. Booking inquiries require operator availability confirmation; there is no advance payment flow.

## Existing PR disposition

| PRs | Finding | Resolution |
| --- | --- | --- |
| #2–#5 | Their heads had conflicts against changed `main`. | Reconciled relevant file changes into #11 based on current `main`. |
| #6–#10 | Stacked cleanly against each other, but depended on stale base branches. | Included the complete stacked changes in #11, preserving mainline admin/customer additions. |
| #11 | Consolidated review branch. | Integration CI and security audit must remain green on the final head before owner approval. |

Specific overlapping files resolved: `lib/store.js` (preserve `customer_id`, status and transaction client), `package.json` (all existing test suites), and `tests/e2e-suite.cjs` (both added admin/customer and portable booking checks). Changes from webhook and documentation PRs were carried forward.

## Findings and changes

| Priority | Finding | Disposition |
| --- | --- | --- |
| P0 | E2E fixture bookings used October 2026 dates, now expired. | Replaced with future dates generated at test runtime. |
| P0 | An old E2E driver assignment sent free-form name/phone/plate instead of an active driver ID. | Updated to use the server-validated driver record. |
| P0 | E2E provider test endpoint could trigger an external probe without an explicit test opt-in. | Probe now requires `STB_E2E_RUN_PROVIDER_TESTS=true`. |
| P0 | Booking API only checked passenger field presence; missing pickup/route, malformed date, and short-notice requests could be stored. | Added server-side validation with Singapore-local date parsing and a 24-hour advance rule, with unit tests. |
| P1 | Browser error screen claimed a booking was definitely not received even after ambiguous network errors. | Replaced with explicit unconfirmed status and same-key retry guidance; server validation errors shown accessibly. |
| P1 | Repeated admin error toasts and unsafe driver assignment fields existed in older branches. | Carried forward the existing targeted fixes (#8–#10). |

## Residual review risks (not claimed as complete)

1. **Fare authority:** Server-side pricing currently accepts `distanceKm` and place IDs from booking payloads; fare must remain indicative until route/distance and availability are independently verified. Confirm the final quote/booking policy before collecting payment or automatically confirming bookings.
2. **Manual design QA:** Test responsive booking flow, screen reader and keyboard navigation on real mobile and desktop devices; automated CI does not prove visual quality.
3. **Provider configuration:** Verify Maps key restrictions, SMTP, WhatsApp and other providers in a permitted staging environment. No production provider call was made during this work.
4. **Data and deployment:** Rehearse migrations on an isolated database and validate production migration plans; production merge/deploy require explicit owner approval.
5. **Operational wording:** The form creates a **booking inquiry**, not a guaranteed vehicle reservation; confirmation and cancellation wording should remain consistent with dispatch policy.

## Verification evidence

- The first integrated head `c949853` passed GitHub Actions unit/database, isolated E2E and audit workflow.
- Booking server validation was subsequently added and a follow-up CI run at `3bc7f2c` passed.
- The subsequent UI fixes at `6d486c4` passed CI; the audit report commit `b4ca4e2` also passed its final-head GitHub Actions run.
- Live booking flows, design sign-off, external provider calls and production deployment have **not** been verified.

## Release criteria

Final branch: green syntax/unit/database/E2E/audit checks; booking success/error/retry flow checked in staging; manual mobile/accessibility checks; safe migration rehearsal; owner approval for merge and production deployment.

The superseded PRs #2–#10 were closed with links back to PR #11, preserving their branches and review histories. No PR was merged and nothing was deployed.
