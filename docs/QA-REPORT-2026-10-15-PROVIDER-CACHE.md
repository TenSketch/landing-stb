# STB QA Report — Notification Provider Cache PR

**Run date:** 2026-10-15  
**PR:** [#7 — Notification provider cache](https://github.com/TenSketch/landing-stb/pull/7)  
**Tested commit:** `5376845fbbfc44a4903fe9c89fd83ce79cc1c2df`  
**Workflow:** [GitHub Actions run 38703088482](https://github.com/TenSketch/landing-stb/actions/runs/38703088482)  
**Environment:** GitHub-hosted Ubuntu, Node.js 20, ephemeral PostgreSQL 16, local Express test server  
**Production touched:** No  
**Deployment performed:** No

## Result

**PASS for the isolated CI scope.** All workflow steps completed successfully.

| Suite | Passed | Failed | Skipped |
|---|---:|---:|---:|
| Pricing unit tests | 8 | 0 | 0 |
| Auth/session helper tests | 3 | 0 | 0 |
| Backend/database integration tests | 10 | 0 | 0 |
| Booking transaction/dispatch tests | 8 | 0 | 0 |
| Google Maps key-separation tests | 5 | 0 | 0 |
| Async TTL cache assertions | 9 | 0 | 0 |
| Local E2E | 93 | 0 | 3 |
| Local security audit | 43 | 0 | 1 |

The workflow completed syntax checks, unit/database tests, local E2E, local security audit and enforcement steps successfully.

## Provider-cache verification

The new cache utility tests cover:
- reusing a value within the TTL;
- refreshing after TTL expiry;
- explicit invalidation;
- concurrent callers sharing one in-flight load;
- invalidation while an older load is in progress, preventing stale cache overwrite;
- retry after a loader failure.

The integration code invalidates the provider cache after create/update/default/delete mutations. Provider settings use a default 30-second TTL, configurable through `STB_PROVIDER_CACHE_TTL_MS` with a minimum of one second.

## Skipped checks and limits

- Three existing E2E checks were skipped in the edge/cleanup sections.
- One public-domain security audit check was skipped by design.
- No real email/SMS/WhatsApp/FCM provider delivery, live-domain probes, Google Cloud billing/restriction checks, mobile-device PWA tests or production runtime checks were performed.
- PR #7 is stacked on PR #6. Retarget it to main only after the base work is integrated.

## Recommendation

Keep PR #7 open for review. The CI result is green for the isolated scope; it does not authorize merge or deployment.
