# STB Repository & Documentation Audit

**Audit date:** 2026-10-15  
**Repository:** `TenSketch/landing-stb`  
**Branch inspected:** `main`  
**Base commit inspected:** `57c967767dcb6b376514c84b9ad3aa30ffa3f19b`  
**Purpose:** Establish an evidence-based baseline before product redesign or further implementation.

> This is a source/documentation audit, not a claim that the live service or full E2E suite was executed on the audit date. Findings are classified as confirmed from source, documented historical evidence, or requiring runtime verification. No production change is authorized by this document.

## 1. Executive summary

STB is an existing transport-booking platform, not a greenfield application. The repository contains a Node.js/Express API and server, PostgreSQL persistence and migrations, a customer-facing web application, a separate admin SPA, a pricing engine, authentication/RBAC, integrations, a PWA manifest/service worker, and existing test scripts.

The immediate priority is to reconcile the documentation with the current implementation, verify the core booking path end-to-end, close security and data-integrity defects, and only then refine the customer/admin experience. Replacing the stack or rebuilding working modules is not justified without further evidence.

## 2. Evidence reviewed

The audit reviewed the current `main` reference and the following files/directories:

- `package.json`, `server.js`, `lib/api.js`, `lib/handlers.js`
- `lib/pricing.js`, `lib/store.js`, `lib/db.js`, `lib/bookingStatus.js`
- `lib/auth.js`, `lib/customerAuth.js`, `lib/rbac.js`, `lib/settings.js`
- `lib/notifications.js`, `lib/integrations.js`
- `public/index.html`, `public/src/main.js`, `public/admin/app.js`
- `public/manifest.json`, `public/sw.js`
- Existing docs: architecture, API reference, database, deployment, booking flow, admin modules, Google Maps, technical debt, implementation roadmap, QA phases, and the 2026-09-30 QA report
- Existing tests: `tests/e2e-suite.cjs`, `tests/audit.cjs`, and `npm test` scripts

The source snapshot identified for this audit is main commit `57c967767dcb6b376514c84b9ad3aa30ffa3f19b`. Branches and pull requests can change independently; implementation work must re-check the target branch before changing code.

## 3. Current architecture — observed

| Area | Current implementation | Audit implication |
|---|---|---|
| Runtime | Node.js (>=20), Express 4, ES modules | Preserve the current server model unless a measured constraint requires change |
| Persistence | PostgreSQL through `lib/db.js`; migration scripts under `migrations/` | Verify schema and migration behavior against a clean test database |
| Customer app | Static HTML + JavaScript under `public/` | Current experience can be simplified incrementally without a framework rewrite |
| Admin app | Separate SPA under `public/admin/` | Keep it operationally focused and mobile responsive |
| API | Express routes in `lib/api.js`, mounted by `server.js` | Use API as the authoritative boundary for business rules |
| Pricing | `lib/pricing.js` and DB-backed rules/overrides/surcharges | Customer-visible estimates must be server-calculated and reproducible |
| Auth | Admin and customer authentication modules, cookie sessions and RBAC | Test every privileged route independently of UI visibility |
| Notifications | Central notification layer and provider abstractions | Provider setup and actual delivery must be distinguished from placeholders |
| PWA | Customer root page links `/manifest.json` and registers `/sw.js`; admin has `public/admin/manifest.json` | Customer registration is present in source; admin-origin service-worker registration is not present in `public/admin/index.html` and requires a dedicated install/offline verification |
| Tests | `npm test`, `tests/e2e-suite.cjs`, `tests/audit.cjs` | Existing test scripts must be run in a controlled test environment; prior reports are not current runs |

## 4. Documentation drift and conflicts

1. **Status vs source:** `STATUS.md` contains older claims that the manifest is empty and service worker is never registered. The current repository has a populated `public/manifest.json`, `public/sw.js` v3, a customer registration block in `public/index.html`, and a separate admin manifest. The admin page links `/admin/manifest.json` but has no visible service-worker registration in its entry HTML; admin-origin offline/update behavior remains an open gap.
2. **Technical-debt entries need revalidation:** `docs/TECHNICAL_DEBT.md` lists both important risks and items whose status may have changed. Keep each item open until verified fixed by code and tests, then close it with evidence.
3. **Implementation plan has obsolete assumptions:** `IMPLEMENTATION_PLAN.md` describes earlier auth/RBAC and PWA gaps that do not fully match the later code/docs. Use it as history, not the authoritative implementation plan.
4. **Google Maps docs are stale in places:** `docs/GOOGLE_MAPS.md` refers to older initialization names and commit references. Current customer code calls `initGoogleMapsAndPlaces()`, loads configuration from `/api/config`, and has a local landmark fallback. Re-map actual key names, API usage, and server-side routing before requesting credentials.
5. **QA results are historical:** `docs/QA-REPORT-2026-09-30.md` records 160/160 checks from 2026-09-30. That result is useful history only; it is not evidence of current health.
6. **Vercel and VPS documentation conflict:** `README-DEPLOY.md` describes a Vercel serverless/KV path while `docs/ARCHITECTURE.md` and `STATUS.md` describe the Express/PostgreSQL VPS architecture. Confirm the intended authoritative production/test topology before changing deployment.
7. **Test harness is environment-coupled:** `tests/e2e-suite.cjs` references absolute VPS paths such as `/root/landing-stb/node_modules/pg`, `/root/landing-stb/.env`, and PM2 logs. This is not portable CI and must not be run against production casually.

## 5. Findings requiring immediate validation

Severity reflects potential impact, not a claim that exploitation or failure was observed during this documentation-only pass.

### P0 — release-blocking until verified

- **Booking data integrity:** `lib/bookingStatus.js` uses transaction statements through the shared `query()` helper, which delegates to the pool. Unless a single database client is held for the full transaction, statements may execute on different connections. Audit and implement a client-scoped transaction across all writes and audit history.
- **Booking duplicate/retry behavior:** No idempotency-key implementation was found by the initial repository search. Verify current routes and DB constraints, then implement safe idempotency before relying on retries/timeouts.
- **Secrets and environment separation:** Verify production secrets are not returned by public configuration endpoints, logged, or placed in source. Never commit API keys or real customer data.

### P1 — high priority

- **Driver assignment HTML / XSS verification (reclassified from P0 on 2026-10-16):** The current `renderAssignPage()` source uses an escaping helper for dynamic text and attributes, so the older technical-debt claim of plainly unescaped passenger fields is not confirmed by this inspection and does not block release. Keep a hostile-input regression test and separately validate URL schemes for configurable image URLs before closing the finding.
- **Driver assignment validation:** Replace free-text/prompt-style assignment with server-validated driver selection, authorization checks and clear failure feedback.
- **Pricing/date-time correctness:** Confirm actual date/time element IDs, timezone interpretation, hourly/daily durations, route fallback behavior, and server-side fare calculation.
- **Notification provider cost and freshness:** The current notification path calls `refreshProviders()` for every event, which reloads four integration settings. Add a safe invalidation/TTL strategy and verify changes take effect predictably.
- **Google Maps key conflation:** On the audited `main` snapshot, `/api/config` returns `GOOGLE_MAPS_API_KEY` while `lib/handlers.js` also uses that same variable for server-side Routes API calls. Separate browser and server keys before requesting credentials; a server-restricted key must never be exposed to the browser.
- **Admin operational feedback:** Audit silent catch blocks, loading states, empty states, validation and retry behavior across CRUD modules.
- **Dashboard/list scalability:** Verify that dashboard and list endpoints are paginated/aggregated in SQL instead of loading all bookings into memory.
- **Integration truthfulness:** Mark each integration as configured, testable, and actually delivering; do not present log-only placeholders as live delivery.

### P2 — product quality

- Verify customer service-worker registration, update behavior, stale cache prevention, offline fallback and install prompts on iOS Safari and Android Chrome.
- Add/verify service-worker registration for the admin origin if admin PWA offline/update support is required; the current admin entry page only links its manifest.
- Improve mobile admin navigation, form ergonomics, keyboard access, contrast and accessible labels.
- Replace hardcoded business settings (including WhatsApp/contact values and currency exchange assumptions) with validated dynamic configuration where appropriate.
- Consolidate duplicate or legacy admin entry points only after checking references and deployment routes.
- Improve migration version tracking and safe re-runs before introducing new schema changes.

## 6. Product direction

### Customer booking PWA

The main job is **book a trip quickly**. The customer path should be a short, guided flow:

1. Enter pickup and destination; select suggested places or a clearly labeled fallback.
2. Select trip type, date/time and duration where relevant.
3. Select a vehicle using clear capacity/features and a server-calculated price.
4. Enter passenger/contact details and review the full booking summary.
5. Submit once, receive a stable booking reference and confirmation, and view next steps.

Keep the homepage focused on the booking action. Secondary content (fleet details, trust information, FAQs and destination inspiration) should not compete with the primary task. Do not remove required information or accessibility support simply to reduce visual clutter.

### Admin PWA

The admin experience should optimize daily operations:

- **Overview:** actionable counts and recent bookings, loaded through bounded server queries.
- **Bookings/dispatch:** search/filter, status history, validated driver assignment, clear next action.
- **Vehicles and pricing:** CRUD with validation, preview and audit trail.
- **Drivers/customers:** operational records and appropriate privacy boundaries.
- **Content/settings:** dynamic public content and business configuration.
- **Notifications/integrations:** configuration status, safe test action, last result and useful errors.
- **Users/roles/audit:** least privilege and traceability.

Use one coherent mobile-first design system shared where practical, but keep customer navigation and admin operations distinct.

## 7. Dynamic-data contract

For every customer-visible value, document its source of truth:

| Data | Authoritative source | Required behavior |
|---|---|---|
| Brand/contact/config | validated settings API + server defaults | safe public fields only; no secrets |
| Vehicles/features/capacity | database-backed vehicle API | admin updates appear in customer app after refresh/cache policy |
| Pricing/rules/surcharges | database + pricing service | server-calculated, auditable, consistent in estimate and final booking |
| Pickup/destination | Places result or explicit fallback choice | store stable place/coordinate metadata when available |
| Booking status/driver | database and authorized API | state transitions validated on server |
| Content/FAQ/services | content API/database | empty/error states do not silently show misleading data |
| Currency | explicit supported rate source or clearly stated SGD-only policy | never silently rely on stale hardcoded exchange rates |
| Notification/integration status | provider configuration and delivery result | configured is not the same as successfully delivered |

No frontend value should be treated as authoritative for fare, permissions, booking state or provider secrets.

## 8. QA baseline and execution rules

### Existing test entry points

- `npm test`: pricing, auth/audit and platform-hardening tests (as declared in `package.json`).
- `node tests/e2e-suite.cjs`: current E2E harness; currently tied to absolute paths and environment-specific assumptions.
- `node tests/audit.cjs`: security/operations probes; inspect target/base URLs before execution.

**Current run status:** Not executed as part of this source/documentation inspection. The 2026-09-30 report is historical. Do not report green until commands are executed against a disposable/staging environment with captured output.

### Mandatory end-to-end journeys

1. Anonymous customer loads homepage and all critical assets.
2. Customer config, content and vehicles load; safe configuration contains no secrets.
3. Pickup/destination autocomplete works; no-key fallback is understandable and does not misrepresent route precision.
4. One-way, hourly and daily fare estimates validate inputs and produce expected values.
5. Customer submits a booking once; duplicate retry does not create duplicate trips.
6. Booking persists with correct price, timezone/date/time, passenger data and stable voucher.
7. Customer confirmation and admin notification behave correctly, with delivery failures visible.
8. Admin login, logout, session expiry and role/permission denial work.
9. Admin updates vehicle/pricing/content/settings and customer app reflects the authoritative values.
10. Dispatcher assigns a valid driver; invalid IDs and concurrent assignment attempts are rejected safely.
11. Booking state transitions and audit history stay consistent under errors/concurrency.
12. PWA install, update, offline fallback and cache invalidation behave correctly on target browsers.
13. Security probes cover auth boundaries, CSRF, XSS, injection, rate limits, secret leakage, headers, path traversal and error responses.
14. Test data is isolated, labeled and cleaned up; never create uncontrolled real notifications or mutate production data.

### Evidence required per run

Record commit SHA, environment (staging/local), Node version, database/migration state, command, start/end time, passed/failed/skipped counts, failure output, artifacts, test data cleanup, and open defects. A blocked test is **blocked**, not passed.

## 9. Recommended sequence

1. Freeze and reconcile the source-of-truth docs.
2. Build a portable, safe test environment and make current test commands reproducible.
3. Run baseline unit/integration/E2E/security suites and classify findings.
4. Fix P0 security/data-integrity issues with focused regression tests.
5. Fix booking/date-time/pricing and dispatch correctness.
6. Improve admin error feedback and complete high-value operational modules.
7. Simplify customer booking UX and verify responsive/accessibility behavior.
8. Complete PWA behavior and dynamic-data contract.
9. Configure and verify Google Maps only after confirming required APIs, key types and domain/server restrictions.
10. Run full regression and release-gate review; create a deployment plan separately.

## 10. Google Maps decision and credential gate

Do not ask for or paste a key into chat or source code. First confirm the actual configuration variables and which API calls are needed.

Expected separation:

- **Browser key:** Maps JavaScript API and Places Autocomplete, restricted by HTTP referrer to the intended STB domains and only the required APIs.
- **Server key:** Routes API (if used server-side), restricted by server/IP and only the required APIs.
- Enable billing and quota alerts deliberately. Use separate keys for staging and production where feasible.
- Keep server credentials in the deployment secret store. A browser key is visible to users by design; its protection is restriction, not secrecy.
- Test no-key behavior, invalid-key errors, quota errors and network failure without blocking the core booking form.

Only request configuration values from the owner when the implementation is ready and the exact required setup is known. Never request a raw server key in this chat.

## 11. Audit limitations

- No local checkout, database connection, browser session, live VPS shell or full runtime execution was available through this source audit.
- Source findings require runtime confirmation where stated.
- No production files, secrets, database records or deployments were changed.
- This audit supersedes stale claims only for the specific facts it explicitly rechecks; it does not mark old debt as fixed without evidence.


## 12. Follow-up implementation status — 2026-10-15

This section supplements the source snapshot audit above; it does not rewrite the historical findings. The following work was recorded in separate open pull requests and must be re-checked against their latest heads before relying on it:

- **PR #2 — webhook hardening:** request size limit, timing-safe signature comparison and safer route/error handling. Review and test the complete webhook path before merge.
- **PR #3 — audit/QA documentation:** repository audit, Agile QA method, documentation index and agent handoff.
- **PR #4 — portable isolated QA:** configurable local test targets, removal of VPS-specific absolute test paths, opt-in public probes and PostgreSQL-backed CI.
- **PR #5 — booking transaction safety and Maps key separation:** client-scoped booking mutation transaction, audit/history atomicity, concurrency/rollback regression tests and distinct browser/server Maps key configuration.
- **PR #6 — booking idempotency and Vercel route fixes:** idempotency-key persistence for booking creation plus the reviewed route defects — `api/bookings.js` now forwards the `Idempotency-Key` argument and `api/config.js` serves the browser-safe Maps key selector. Head `f24f24a09dd97c1bc1e2e662850973cc339c5bdd`, CI [run 38733600659](https://github.com/TenSketch/landing-stb/actions/runs/38733600659) success.
- **PR #7 — notification provider TTL cache:** `lib/integrations.js` imports and calls `invalidateProviderCache()` so integration mutations no longer throw `ReferenceError` after persisting. Head `ca6f3b3a1ee0a4d53338f8beca9822be66761962`, CI [run 38840864921](https://github.com/TenSketch/landing-stb/actions/runs/38840864921) success.
- **PR #8 — admin dialog accessibility:** the focus trap collects focusables from the full dialog instead of a single `querySelector` result, and `.modal-close` is bound with the multi-element helper again. Head `ad34993e02e26b001044f8cbe7d3729d8ad31d0c`, CI [run 38841011312](https://github.com/TenSketch/landing-stb/actions/runs/38841011312) success.
- **PR #9 — server-validated driver assignment:** driver eligibility is re-validated inside the assignment transaction (`FOR SHARE` against the drivers row), so a concurrently deactivated driver can never be assigned; `docs/ADMIN_MODULES.md` now documents the `{ driverId }` request body. Head `408ad700d95fef1e544ba2758db79f4aa2dd6fde`, CI [run 38841360509](https://github.com/TenSketch/landing-stb/actions/runs/38841360509) success.
- **PR #10 — admin error feedback:** the login form reports API failures itself after the global toast was removed, so a wrong password is visible again. Head `475b78ec9f8bd2eba325daf41d1202efe262a105`, CI [run 38841357324](https://github.com/TenSketch/landing-stb/actions/runs/38841357324) success.
- **PR #4 / PR #5 — CI baseline and lockfile determinism:** `npm ci` from the committed `package-lock.json` replaced `npm install --no-package-lock` on every branch that carries the workflow. Heads `4e74b0f93597` and `84d415b730d7`, CI [runs 38733592011](https://github.com/TenSketch/landing-stb/actions/runs/38733592011) and [38733597625](https://github.com/TenSketch/landing-stb/actions/runs/38733597625) success.

The latest recorded isolated run for PR #5 is [GitHub Actions run 38691010883](https://github.com/TenSketch/landing-stb/actions/runs/38691010883), tested head `a10637088b1f42494fdbf73479c5607ab75b92ac`. Its dated evidence is in [QA-REPORT-2026-10-15.md](QA-REPORT-2026-10-15.md): 164 passed, 0 failed, 4 skipped across the reported suites. The three E2E skips and one security-audit skip are explicitly listed in that report.

### Review-finding fixes recorded on 2026-10-16 (handoff phase R1)

Every confirmed Codex review finding from the handoff triage was fixed on its owning branch with a regression test wired into `npm test`: PR #2 duplicate deploy-failure alerts (single-spawn guard plus `backend/tests/webhook_hardening.test.js`), PR #4 deterministic installs, PR #6 Vercel route arguments, PR #7 provider-cache invalidation, PR #8 focus-trap/close-binding repair, PR #9 in-transaction driver revalidation with docs, PR #10 login error feedback, and this PR's XSS reclassification from P0 to P1.

Stacked PRs #7 and #8 were unmergeable (`mergeable_state: dirty`) because each branch appended its own file to the single-line `test` script in `package.json`, so `pull_request` runs were never created for their heads. The base branch was merged into each head with the test lists unioned (`booking_status`, `google_maps_config`, `async_ttl_cache`, `integration_cache_invalidation`, `vercel_routes`, `admin_ui_static`, `admin_error_feedback_static`), and the same propagation was applied to PRs #9 and #10 so the stack stays linear. All ten suites now run on every stack head: 78 local assertions plus the CI E2E and security-audit steps. Evidence: [QA-REPORT-2026-10-16-R1-REVIEW-FIXES.md](QA-REPORT-2026-10-16-R1-REVIEW-FIXES.md).

**Interpretation:** this is isolated CI evidence only. It does not prove that the open PRs are merged, that production has changed, or that live domains, webhook service, real notification providers, Google Cloud billing/restrictions, or mobile PWA installation/update have been verified. The recorded PR state at handoff time was open/unmerged; always check current GitHub status.

### Immediate next actions

1. Review current PR heads, diffs, comments and CI before making further changes.
2. Implement booking-creation idempotency only after tracing the live route/schema and defining safe duplicate-request semantics.
3. Investigate per-notification provider refresh cost and add tested TTL/invalidation if confirmed.
4. Re-check admin error/accessibility/authorization gaps and the customer/admin PWA behavior.
5. Keep all work in branches/PRs. No merge, deployment or production mutation is authorized by this audit.
