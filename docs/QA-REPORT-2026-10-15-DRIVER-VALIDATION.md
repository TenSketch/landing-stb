# STB QA Report — Server-Validated Driver Assignment PR

**Run date:** 2026-10-15  
**PR:** [#9 — Server-validated driver assignment](https://github.com/TenSketch/landing-stb/pull/9)  
**Tested commit:** `d824e35cfa4e9c7a64f7a9bbf682d2720df2b04f`  
**Workflow:** [GitHub Actions run 38703786164](https://github.com/TenSketch/landing-stb/actions/runs/38703786164)  
**Environment:** GitHub-hosted Ubuntu, Node.js 20, ephemeral PostgreSQL 16, local Express test server  
**Production touched:** No  
**Deployment performed:** No

## Result

**PASS for the isolated CI scope.**

- Pricing unit tests: 8 passed
- Auth/session helper tests: 3 passed
- Backend/database integration tests: 10 passed
- Booking transaction/dispatch tests: 8 passed
- Google Maps key-separation tests: 5 passed
- Async TTL cache assertions: 9 passed
- Local E2E: 98 passed, 0 failed, 3 skipped
- Local security audit: 43 passed, 0 failed, 1 skipped

Syntax checks and all workflow enforcement steps passed.

## Driver assignment checks

- Dispatch-only active-driver choices endpoint requires the assignment permission and returns only fields needed by the modal.
- Valid active driver ID is resolved from the database; client-supplied name/phone/plate are ignored.
- Malformed driver ID is rejected.
- Active driver assignment succeeds and booking state/history remain consistent.
- Inactive driver is rejected.
- E2E also verifies the assignable endpoint requires authentication.

## Limits

- Browser/device accessibility checks for PR #8 (keyboard focus, screen reader and narrow viewport) remain manual and have not been claimed as passed.
- No live-domain, production or real-provider tests were performed.
- PR #9 is stacked on PR #8, which is stacked on PR #7; retarget to main only after base work is integrated.

## Recommendation

Keep PR #9 open for review. CI is green for the isolated scope; merge/deployment remains separately authorized.
