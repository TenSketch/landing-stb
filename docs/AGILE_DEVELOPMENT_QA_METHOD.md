# STB Agile Development & QA Methodology

**Version:** 1.0  
**Created:** 2026-10-15  
**Status:** Proposed working method, approved to proceed with audit and planning  
**Repository:** `TenSketch/landing-stb`  
**Companion document:** [Repository Audit](REPOSITORY_AUDIT.md)

## 1. Mission and outcome

Deliver a dependable, mobile-first booking PWA for customers and a simple operational PWA for STB staff. Keep the existing Node.js/Express/PostgreSQL foundation unless evidence demonstrates a compelling reason to change it.

The product must make booking quick, keep fares and booking state authoritative on the server, give admins clear control of operational data, and be testable from a reproducible environment.

## 2. Product principles

1. **Customer intent first:** the main page helps users start and complete a booking. Avoid competing navigation and excessive choices.
2. **Admin is for operations:** prioritize finding bookings, assigning drivers, updating vehicle/pricing data and seeing what needs attention.
3. **Dynamic by contract:** customer-visible operational data comes from validated APIs/database settings; no frontend-only business rules.
4. **Server is authoritative:** prices, permissions, availability/state transitions and driver assignment are revalidated on the server.
5. **Mobile-first, not mobile-only:** support phone, tablet and desktop; test touch, keyboard and screen-reader flows.
6. **Progressive enhancement:** core booking should remain understandable if Maps, fonts, analytics or other optional external resources fail.
7. **Secure by default:** least privilege, safe secrets, bounded inputs, idempotent writes, auditability and privacy-aware logs.
8. **Evidence before status:** “done” means reviewed and tested; a historical QA report is not a current green build.
9. **Small, reversible changes:** focused branches and PRs, regression tests with each fix, no unapproved production deployment.
10. **No invented business decisions:** do not invent fares, cancellation terms, provider credentials, legal terms or operational policies.

## 3. Scope

### In scope

- Existing customer booking flow and customer-facing responsive UI.
- Admin SPA/PWA, booking operations, dispatch, vehicles, pricing, content, settings, users/roles and audit.
- API/database contracts, migrations, data validation and transactional behavior.
- Dynamic data, currency behavior, Maps/Places/Routes configuration and fallback.
- PWA install/update/offline behavior.
- E2E, regression, security, accessibility, performance and integration QA.
- Technical documentation, runbooks, release gates and defect tracking.

### Out of scope unless separately approved

- Production deployment, DNS changes, destructive production migrations or data cleanup.
- Real payment collection or real SMS/WhatsApp/FCM delivery before provider credentials and business rules are confirmed.
- Full framework/backend rewrite without comparative evidence.
- Inventing commercial pricing, refund/cancellation policies or legal claims.
- Committing credentials, production data, customer PII or private logs.

## 4. Target user journeys

### 4.1 Customer booking

1. Open the site/PWA.
2. Enter pickup and destination with autocomplete or an explicit fallback.
3. Select trip mode, date/time and duration where applicable.
4. See available vehicles and a server-calculated fare.
5. Enter passenger/contact details and review a complete summary.
6. Submit once; receive booking reference and confirmation/next steps.
7. Return later to retrieve booking status using the approved account/guest flow.

**Acceptance:** no duplicate booking on safe retries; invalid input is explained inline; fare and booking details are persisted consistently; failures do not falsely report success; the core form remains usable if Maps is unavailable.

### 4.2 Admin operations

1. Authorized staff sign in and see only permitted modules/actions.
2. Find and filter bookings; inspect status/history.
3. Assign a valid driver through a server-validated selector.
4. Update vehicle, pricing, content or operational settings.
5. See save status, validation failures and retry guidance.
6. Review integration status and audit history.

**Acceptance:** unauthorized API calls are denied even if the UI is bypassed; updates persist; the customer app reflects intended changes; errors are visible and actionable; critical mutations have audit records.

### 4.3 PWA

- Installable metadata and icons are valid.
- Service worker is registered intentionally and updates do not pin stale critical assets.
- API requests and booking submissions are never served as stale cached responses.
- Offline messaging is clear; the app never pretends an offline booking was submitted.
- Test current supported versions of Android Chrome and iOS Safari, plus desktop Chrome/Edge as appropriate.

## 5. Delivery workflow

Use a lightweight Scrum/Kanban hybrid. Work in priority order; do not force unrelated work into a sprint solely to fill capacity.

1. **Discover:** inspect source, docs, tests and runtime evidence.
2. **Specify:** write user story, acceptance criteria, risks and test cases.
3. **Implement:** one focused branch/PR; add migration only when required.
4. **Review:** inspect diff, security impact, data compatibility and failure paths.
5. **Verify:** run targeted tests first, then affected suites and broader regression.
6. **Document:** update architecture/API/runbook/debt/QA evidence alongside behavior changes.
7. **Release decision:** verify release gates; deployment requires separate explicit approval.

### Branch and PR policy

- Use branches such as `fix/<short-issue>`, `feat/<short-feature>`, `docs/<short-topic>`, and `test/<short-topic>`.
- Keep each PR small enough to review; split unrelated changes.
- PR must state purpose, user impact, changed files, migration/config needs, tests run, known limitations and rollback plan.
- Never merge or deploy merely because a check is green. Do not merge changes that have not met the release gates.
- Avoid parallel writes to the same file/branch. Rebase or re-check base SHA when the branch changes.
- Keep production secrets and real data out of diffs, screenshots and test logs.

## 6. Definition of Ready (DoR)

A work item is ready when:

- The user/business problem and affected user are identified.
- Current behavior is reproducible or the evidence gap is explicit.
- Acceptance criteria are testable and observable.
- Dependencies (API, schema, provider, policy, key/config) are known.
- Risks and data/security implications are noted.
- The work can be reviewed in a focused PR.
- Required design/business choices are either confirmed or represented as explicit open decisions.

If required business input is genuinely blocking, isolate that question and continue all independent work. Do not block unrelated tasks waiting for credentials.

## 7. Definition of Done (DoD)

A work item is done only when all applicable conditions are true:

- Acceptance criteria pass.
- Code is reviewed for input validation, authorization, data exposure, concurrency and failure handling.
- Unit/integration/regression tests are added or updated.
- Relevant test commands are executed and results recorded against a commit SHA.
- API/database/docs are updated and do not contradict implementation.
- Accessibility and responsive behavior are checked for UI changes.
- Logs avoid secrets/PII; user-visible errors are helpful without leaking internals.
- Migration is safe and rollback/recovery implications are documented.
- No unexplained test failures remain; blocked tests are explicitly listed.
- Deployment status is described truthfully. Code merged, deployed and runtime-verified are separate states.

## 8. Epics and prioritized backlog

Priority definitions:
- **P0 — Release blocker:** exploitable security issue, data corruption, incorrect booking/fare, or auth bypass.
- **P1 — High:** critical journey broken, unsafe dispatch, duplicate booking, misleading integration state, major operational failure.
- **P2 — Medium:** important UX, accessibility, PWA, scalability or maintainability issue.
- **P3 — Later:** polish or optional capability with low immediate risk.

### Epic A — Documentation and reproducible QA foundation (P0)

**A1.** Reconcile `STATUS.md`, `IMPLEMENTATION_PLAN.md`, architecture, Maps and QA docs against source.  
**A2.** Map API routes to auth requirements, request/response contracts and DB effects.  
**A3.** Inventory migrations and define a clean disposable test database setup.  
**A4.** Make test scripts portable: remove absolute `/root/landing-stb` paths and require explicit test URLs/DB settings.  
**A5.** Separate safe local/staging tests from live-domain read-only smoke checks; require explicit opt-in for mutations.  
**A6.** Produce a baseline report with actual run output, failures and blocked items.

**Exit:** a new developer can set up the test environment from documented steps without production access.

### Epic B — Security and booking data integrity (P0)

**B1.** Audit and fix output escaping on driver assignment HTML and any untrusted HTML contexts.  
**B2.** Introduce client-scoped DB transaction helper and use one client for booking mutation, status history and audit writes.  
**B3.** Add idempotency for booking creation with server-side persistence and deterministic response for a repeated key.  
**B4.** Verify role checks at every admin API route, not only in frontend navigation.  
**B5.** Review CSRF protections for cookie-authenticated state-changing routes.  
**B6.** Audit rate limits, OTP attempts, session expiration and concurrent requests.  
**B7.** Validate all external IDs, state transitions, amounts, dates, phone/email fields and maximum lengths.  
**B8.** Remove sensitive console logs; verify public configuration and error responses do not leak secrets or stack traces.

**Exit:** security regression suite passes; concurrent/retry tests prove booking and dispatch consistency.

### Epic C — Booking, pricing and dispatch correctness (P0/P1)

**C1.** Document booking state machine and allowed transitions.  
**C2.** Validate one-way/hourly/daily fare calculation and edge cases.  
**C3.** Fix actual date/time input bindings and timezone rules after reproduction.  
**C4.** Ensure estimate and confirmed booking use the same server-side pricing contract.  
**C5.** Prevent duplicate bookings on double click, retry and network timeout.  
**C6.** Validate driver assignment against active/eligible driver records and prevent conflicting assignment.  
**C7.** Paginate/search bookings and aggregate dashboard statistics in SQL.  
**C8.** Verify driver/contact fields can be cleared or updated according to policy, with history preserved where required.

**Exit:** core booking and dispatch journeys pass E2E and concurrency tests.

### Epic D — Dynamic data and admin operations (P1)

**D1.** Map each customer-visible field to its API/database source of truth.  
**D2.** Verify vehicle and pricing edits flow from admin to DB/API/customer UI.  
**D3.** Replace prompt-based assignment with a validated accessible form.  
**D4.** Add loading, empty, success, validation, network-error and retry states to admin CRUD.  
**D5.** Complete or clearly mark Customers, Drivers, Notifications and Payments modules based on actual product scope.  
**D6.** Centralize brand/contact/WhatsApp settings and remove duplicate hardcoded values.  
**D7.** Make integration status explicit: disabled, missing config, configured, tested, delivery failed, or healthy.  
**D8.** Add safe pagination and filters to large lists.

**Exit:** admin can manage supported data without source edits; customer app reflects valid changes.

### Epic E — Customer experience and accessibility (P1/P2)

**E1.** Audit booking UX on phone-size screens and map the minimum viable steps.  
**E2.** Reduce homepage competition and keep the booking action prominent.  
**E3.** Improve location input focus/typing/selection, clear buttons, keyboard behavior and screen-reader labels.  
**E4.** Present vehicle capacity/features and fare clearly, including what is and is not included.  
**E5.** Preserve validation on errors and prevent silent form resets.  
**E6.** Verify contrast, focus indicators, touch targets, labels, error associations and reduced-motion preferences.  
**E7.** Add concise guided onboarding only if usability checks show it is needed.

**Exit:** representative customer tasks can be completed on mobile without a mouse and without unexplained failure.

### Epic F — PWA and resilience (P1/P2)

**F1.** Verify manifest links, icon sizes, scope, start URL and install prompts.  
**F2.** Verify service worker registration, versioning, activation and old-cache cleanup.  
**F3.** Keep APIs and mutations network-only; never replay a cached POST.  
**F4.** Add a useful offline fallback and clear offline submission behavior.  
**F5.** Test update while the app is open and recovery from failed asset fetches.  
**F6.** Measure initial load and core interaction performance on mobile networks.

**Exit:** installation/update/offline checks pass on target browsers; no false booking success offline.

### Epic G — Google Maps, Places and route calculation (P1)

**G1.** Trace actual public config key names and server-side route key usage.  
**G2.** Confirm required Google APIs and expected billing/quota before asking owner for configuration.  
**G3.** Use separate restricted browser/server keys where appropriate; store server key only in deployment secrets.  
**G4.** Validate Places results, place IDs, coordinates, Singapore restriction and fallback labels.  
**G5.** Add timeout/error handling and bounded caching for route estimates where appropriate.  
**G6.** Test missing, invalid, restricted and quota-exceeded keys; core booking should remain usable.  
**G7.** Add integration smoke tests that do not spend uncontrolled quota.

**Exit:** location and fare behavior is predictable with valid credentials and graceful without them. Only then request the necessary configuration from the owner.

### Epic H — Release readiness (P0)

**H1.** Full regression against the exact candidate commit.  
**H2.** Security audit and high-risk finding review.  
**H3.** Database migration rehearsal and rollback/recovery plan.  
**H4.** Staging smoke test, logs/metrics review and alert verification.  
**H5.** Release checklist, owner sign-off and explicit deployment authorization.

**Exit:** all release gates pass or any accepted residual risk is explicitly documented and approved.

## 9. Test strategy

### Test layers

| Layer | Purpose | When |
|---|---|---|
| Static checks | syntax, unsafe patterns, config/document drift | every PR |
| Unit | pricing, validation, state transitions, utility functions | every logic change |
| Database integration | migrations, transactions, idempotency, authorization data | every data/API change |
| API integration | response schema, status codes, permissions, error paths | every API change |
| E2E | customer/admin workflows in a browser or controlled HTTP harness | every core-flow change and release candidate |
| Security | auth, XSS, CSRF, injection, rate limits, secrets, headers, traversal | every security change and release |
| Accessibility | keyboard, focus, labels, contrast, validation | every UI change |
| PWA/device | install, update, offline, mobile Safari/Chrome | every PWA release candidate |
| Performance | startup, page/API latency, DB query growth, bundle size | baseline and release |
| Live smoke | minimal read-only checks on approved public endpoints | only when explicitly safe |

### Minimum functional matrix

- Public page and assets load.
- `/api/config`, `/api/vehicles`, `/api/content` return expected safe schemas.
- Fare estimate handles valid and invalid one-way/hourly/daily inputs.
- Booking creation persists once and returns a stable reference.
- Retry with the same idempotency key returns the original result without duplicate records.
- Customer auth/session/history behave correctly.
- Admin auth, expiry, logout, roles and route-level permission checks work.
- Vehicle/pricing/content/settings CRUD validates and persists.
- Driver assignment rejects missing/inactive/unauthorized drivers and handles concurrency.
- Status transition and audit record are consistent under failures.
- Notification delivery reports real provider outcome and does not leak secrets.
- Missing/invalid Google key fallback works without broken typing or false precision.
- PWA install/update/offline behavior passes supported browser matrix.
- Security probes do not expose secrets, stack traces or sensitive files.

### Test data and side effects

- Use a dedicated test database and clearly prefixed fixtures such as `E2E-TEST`.
- Use fake/mock provider adapters by default; real notifications require explicit opt-in and safe test destinations.
- Cleanup runs in a `finally`/teardown path and reports cleanup failures.
- Never use real customer data or run mutation suites against production.
- A live smoke test must be read-only unless a separate safe test endpoint/account is configured.

## 10. Test execution and reporting template

Every QA run must record:

```text
Run ID:
Commit SHA:
Branch / PR:
Environment:
Node version:
Database + migration version:
Browser/device:
Commands executed:
Start/end time:
Passed:
Failed:
Skipped:
Blocked:
Artifacts/log location:
Data cleanup result:
Known issues:
Release recommendation: PASS / FAIL / BLOCKED
```

Report each failed test with ID, expected behavior, actual behavior, reproduction steps, severity, logs/artifact and linked defect. Do not hide failures in aggregate totals. A test not executed is skipped or blocked, never passed.

## 11. Severity and defect policy

- **S0 Critical:** remote compromise, privilege bypass, sensitive-data exposure, confirmed corruption/loss. Stop release and contain.
- **S1 High:** booking/fare/dispatch correctness failure, duplicate charge/booking, major auth failure, core journey blocked. Fix before release.
- **S2 Medium:** major UX/accessibility degradation, significant integration or operational failure with workaround. Normally fix before release.
- **S3 Low:** cosmetic or low-impact issue. May be scheduled with owner and rationale.

Security and data integrity findings are severity-assessed based on exploitability and impact, not only the original technical-debt label.

## 12. Release gates

A release candidate cannot be marked PASS unless:

- P0 findings are closed with regression tests.
- Required unit/integration/E2E/security suites ran against the candidate SHA.
- No unexplained failures remain.
- Core customer booking and admin dispatch journeys pass.
- Price, date/time, booking persistence and status history agree.
- Auth/authorization and secret-leak checks pass.
- PWA behavior is verified for supported browsers.
- Migration and rollback/recovery plan are reviewed.
- Monitoring and integration failure paths are understood.
- Deployment is separately authorized.

A successful CI/preview check is one signal only; it is not a substitute for runtime E2E, security testing or production health verification.

## 13. Configuration and secret handling

- Do not ask users to paste secrets into conversation or commit them to the repository.
- Identify the exact variable name and service before requesting setup.
- Use deployment secret stores for database URLs and server-side API keys.
- Restrict browser keys by referrer and API; restrict server keys by source and API.
- Use separate staging/production credentials where feasible.
- Record only whether configuration exists and the outcome of a safe test—not the secret value.
- Set quotas/budget alerts and rotate exposed keys immediately.

## 14. Documentation ownership

Keep these docs aligned with code:

- `docs/REPOSITORY_AUDIT.md`: current-state facts, evidence and drift.
- `docs/ARCHITECTURE.md`: request flow, runtime, auth and deployment topology.
- `docs/API_REFERENCE.md`: routes, schemas, auth, errors and side effects.
- `docs/DATABASE.md`: schema, constraints, migrations and relationships.
- `docs/BOOKING_FLOW.md`: user journey, state machine and pricing contract.
- `docs/ADMIN_MODULES.md`: module completeness and permissions.
- `docs/GOOGLE_MAPS.md`: current keys/config, API restrictions, fallback and quota.
- `docs/TECHNICAL_DEBT.md`: open debt with owner/priority/status/evidence.
- `docs/QA-PHASES.md` and dated QA reports: actual execution evidence.
- `docs/IMPLEMENTATION_ROADMAP.md`: ordered backlog and completion status.
- `docs/DEPLOYMENT.md`: actual authoritative deployment procedure and rollback.

Avoid multiple conflicting “current status” documents. Link to the source-of-truth documents and add dated evidence rather than silently rewriting history.

## 15. First execution sequence

1. Re-check current main and open PR state.
2. Merge/reconcile the repository audit and this method into a docs PR.
3. Inventory every migration, API route, auth guard, and existing test.
4. Make a safe, portable test environment reproducible; do not run the VPS-coupled suite blindly.
5. Run `npm test` in the isolated environment and capture exact results.
6. Refactor E2E/security tests for explicit target configuration and safe test data; then execute the full suite.
7. Fix the highest-severity verified defect with a focused regression test.
8. Repeat test → review → document → PR, ordered by P0/P1.
9. Revisit customer/admin UX only against the verified baseline and acceptance criteria.
10. Request Google Maps configuration only when exact API requirements and restrictions are ready.
11. Produce a final release-readiness report; do not deploy without explicit authorization.

## 16. Open decisions to resolve only when necessary

- Confirm whether VPS/PostgreSQL is the single authoritative deployment or whether Vercel is still intended for any production path.
- Confirm commercial rules that cannot be inferred from source: cancellation/refund policy, booking lead time, operational hours, supported currency display and notification consent.
- Confirm which integrations are required for initial launch versus future phases.
- Confirm supported browser/device matrix and expected offline capability.
- Confirm whether customer account creation should remain optional with guest booking.

These decisions must not block independent code audit, test harness cleanup, security fixes or documentation reconciliation.
