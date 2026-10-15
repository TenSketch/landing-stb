# STB Design-to-Development Master Plan

**Version:** 1.0  
**Updated:** 2026-10-15  
**Repository:** `TenSketch/landing-stb`  
**Status:** Execution contract for autonomous test/PR work  
**Owner approval required:** Production merge/deploy, real-provider side effects, destructive data operations, or unresolved business-policy decisions only.

## 1. Mission

Deliver a trustworthy, mobile-first Singapore Tour Booking customer booking experience and a simple operational admin experience by improving the existing Node.js, Express and PostgreSQL application. Work incrementally. Preserve working behavior unless evidence shows it is incorrect or unsafe.

The primary customer intent is **book a trip quickly**. The admin's primary intent is **manage bookings and dispatch reliably**. The server remains authoritative for fare, booking state, authorization, driver assignment and persistence.

## 2. How the agent must operate

The agent is authorized to continue independent work without asking the owner for approval at every step, including source inspection, design decisions within this document, documentation, code changes on feature/fix branches, tests, CI runs, and opening/updating PRs.

The agent must pause and ask only when a decision is genuinely owner-specific, such as:
- production deployment, merge if repository policy requires owner sign-off, DNS/hosting changes, or destructive production data/schema actions;
- real payment collection, sending real customer notifications, or using production credentials;
- a business rule not inferable from code/docs (commercial pricing, cancellation/refund policy, operating hours, legal wording, or consent);
- a breaking external API/customer contract with no safe backward-compatible path;
- a security incident or suspected exposure requiring owner coordination.

**Do not wait for approval** to continue unrelated tasks while one item is blocked. Record the blocker, use safe defaults only where specified, and move to the next independent task. Never ask for secrets in chat; identify the exact environment variable and secure configuration action instead.

## 3. Product and experience direction

### Customer web/PWA
- Homepage prioritizes search and booking; avoid excessive tabs, competing calls to action and unnecessary sections.
- Keep the booking flow guided and short: locations → trip type/date/time/duration → vehicle/fare → passenger details/review → submit → reference/confirmation.
- Make each step usable on a phone, keyboard and screen reader.
- Use progressive enhancement: the core flow remains understandable when Maps, fonts or optional external services fail.
- Never display a successful booking result unless the server confirms persistence.
- Never silently imply a route fallback is exact road distance or a final quote.

### Admin web/PWA
- Optimize for bookings, dispatch, vehicles/pricing, customers/drivers, settings/integrations, users/roles and audit.
- Show loading, empty, success, validation, network-error and retry states.
- Use validated selectors for entities such as drivers, not free-text/prompt input.
- UI permissions are helpful navigation only; the API must enforce authorization.
- Keep the interface mobile-first and accessible without hiding important operational details.

### Design system
Before large visual changes, inspect the actual app and document current design tokens (colors, typography, spacing, radii, elevation, focus states), reusable components and responsive breakpoints. Prefer one or two primary brand colors, consistent type scale and clear focus/contrast. Do not invent a new brand direction or replace the entire UI without evidence. Implement a small, representative vertical slice, validate it, then apply the established system consistently.

## 4. Design-to-development workflow

Every meaningful feature follows this sequence:

1. **Discover:** inspect source, docs, API, schema/migrations, tests and current branch/PR state.
2. **Define:** identify user, problem, scope, non-goals, data sources, dependencies, security/privacy implications and failure modes.
3. **Specify:** write user story and observable acceptance criteria; include empty/loading/error/offline states and accessibility requirements.
4. **Design:** describe the screen/state flow, hierarchy, interactions, responsive behavior and design tokens. For API/database work, specify request/response, authorization, state changes, transaction boundaries and migration/rollback.
5. **Plan:** split into small tasks, select priority, name affected files, tests and safe rollback strategy.
6. **Implement:** one focused branch/PR per coherent change; use existing architecture and APIs where practical.
7. **Verify:** targeted unit tests → database/API integration → E2E/security/accessibility checks relevant to the change → full isolated CI.
8. **Review:** inspect the diff for security, compatibility, race conditions, secrets, logging, performance and scope creep.
9. **Document:** update relevant architecture/API/database/UX/technical debt/runbook docs and create a dated QA report for full test runs.
10. **Deliver:** open/update PR with summary, acceptance criteria, test evidence, known gaps, migration/config instructions and rollback notes. Do not merge/deploy without explicit authorization.

Do not start a large redesign before the existing workflow and its contracts are understood. For UI work, include before/after screenshots or reproducible browser notes when tooling is available. For inaccessible device/browser checks, mark them blocked rather than passed.

## 5. Definition of Ready

A task is ready when:
- the observed problem and affected user are stated;
- existing behavior and source-of-truth files are identified;
- acceptance criteria are testable;
- dependencies and data contract are known;
- security, privacy, concurrency and failure-path risks are listed;
- unresolved business decisions are separated from independent implementation work;
- a focused PR and regression strategy are feasible.

## 6. Definition of Done

A task is done only when applicable criteria are satisfied:
- acceptance criteria pass against a known commit SHA;
- tests cover normal, invalid, failure and relevant concurrent/retry behavior;
- API authorization and server-side validation are verified;
- persistence, status history and audit effects are consistent;
- UI changes have loading/empty/error states and keyboard/accessibility checks;
- docs match code; stale claims are corrected with evidence;
- no secrets, production PII or sensitive logs enter the repository;
- migration safety and rollback/recovery are documented;
- failures and skips are listed individually; no test not run is reported as passed;
- merge, deploy and production runtime verification are described as separate states.

## 7. Priority order and phase gates

### Phase 0 — Establish trustworthy baseline (P0)
- Reconcile current default branch and open PRs; inspect diffs/comments/checks.
- Make isolated QA portable and safe.
- Keep source-of-truth docs and agent handoff current.
- Gate: reproducible CI with explicit skips and no unclassified failures.

### Phase 1 — Security and data integrity (P0)
- Review webhook validation and side effects.
- Ensure booking status/driver assignment use a single DB client for the entire transaction.
- Implement booking creation idempotency only after tracing route/schema and defining retry semantics.
- Verify admin route authorization, CSRF, rate limits, secret exposure, audit consistency and input validation.
- Gate: regression tests for authorization, duplicate/concurrent writes, rollback and secret boundaries.

### Phase 2 — Core booking and dispatch correctness (P0/P1)
- Verify trip types, date/time/timezone, duration, authoritative pricing, vehicle selection, passenger validation and booking confirmation.
- Validate driver eligibility and concurrency.
- Verify customer/admin data remains consistent through status changes.
- Gate: customer booking and admin dispatch journeys pass isolated E2E plus relevant DB tests.

### Phase 3 — Integrations and operational reliability (P1)
- Separate browser/server Maps keys and validate safe fallback.
- Cache provider configuration only with explicit TTL and invalidation.
- Distinguish provider configured, test passed, delivery succeeded and delivery failed.
- Add bounded timeouts/retries only where idempotency and provider semantics make them safe.
- Gate: mocked-provider tests pass; real-provider checks are opt-in and separately authorized.

### Phase 4 — Admin product quality (P1/P2)
- Replace prompt-based dispatch with accessible, server-validated controls.
- Add consistent loading, empty, success, error and retry states.
- Improve list search/filter/pagination and dashboard query bounds.
- Verify keyboard use, labels, focus, contrast and responsive layouts.
- Gate: representative admin tasks pass API tests and accessible manual/browser checks where available.

### Phase 5 — Customer UX and design system (P1/P2)
- Map existing customer flow and record friction.
- Establish tokens/components and responsive rules from the current brand.
- Improve location input, step clarity, fare transparency, error recovery and confirmation.
- Keep homepage focused and guided.
- Gate: primary booking task is clear on mobile, keyboard-accessible, and passes E2E.

### Phase 6 — PWA and performance (P1/P2)
- Verify manifests, icon assets, scope, service-worker registration, versioning and cache cleanup.
- Never cache booking mutations or API responses in a way that can misrepresent current state.
- Provide honest offline status and safe recovery.
- Verify Android Chrome/iOS Safari when device access exists; otherwise explicitly block the device-specific gate.
- Gate: install/update/offline tests pass on target devices or are explicitly blocked with owner-visible evidence.

### Phase 7 — Release readiness (P0)
- Run full candidate-SHA regression, security review, migration rehearsal, staging smoke and observability checks.
- Review residual risk and rollback.
- Gate: owner sign-off and explicit deployment authorization. CI green alone never authorizes release.

## 8. Required artifact per feature

Each PR should contain or link:
- user story/problem and scope;
- acceptance criteria;
- affected screens/API/database/migrations;
- security/privacy/concurrency review;
- tests run and exact results/commit;
- skipped/blocked checks and reason;
- config requirements (variable names only, never values);
- migration and rollback/recovery notes;
- screenshots or browser reproduction where useful;
- documentation changes and next known priority.

## 9. Test and environment rules

- Use the isolated CI database or a clearly identified disposable local database for mutation tests.
- Public-domain smoke checks must be read-only and explicitly opted in.
- Real email/SMS/WhatsApp/payment/provider calls are disabled by default.
- Use synthetic, labeled fixtures and guarantee cleanup in teardown/finally paths.
- Do not use production as a test environment.
- Record environment, Node version, database/migration state, commit SHA, command, counts, artifacts and cleanup status.
- Treat test outcomes as PASS, FAIL, SKIPPED or BLOCKED; never convert skipped/blocked to pass.

## 10. Current starting point and next task

Read [AGENT_HANDOFF.md](AGENT_HANDOFF.md) for PR links and the latest recorded isolated CI result. Re-check all details against GitHub before work.

**Booking idempotency is now implemented in stacked PR #6** ([review PR](https://github.com/TenSketch/landing-stb/pull/6), [contract](BOOKING_IDEMPOTENCY.md)); CI was running when this plan was updated. The next agent must inspect the latest PR head/checks, fix any failure, and review transaction/notification semantics before considering this item verified. PR #6 currently targets the PR #5 branch, not main, to avoid duplicating PR #5 changes; retarget it only after the base work is integrated.

**Notification provider refresh is implemented in stacked PR #7** ([review PR](https://github.com/TenSketch/landing-stb/pull/7)) and its isolated CI passed: [run 38703088482](https://github.com/TenSketch/landing-stb/actions/runs/38703088482). It adds a configurable 30-second TTL cache, single-flight loading, invalidation after integration mutations and tests for expiry, concurrent refresh, invalidation during load and failure recovery. The PR remains open and must receive code review before merge.

**Next engineering task: admin error handling/accessibility/authorization.** Inspect actual admin UI catch blocks and dispatch flow, verify API authorization independently, and select the highest-impact reproducible issue. Fix it in a focused PR with regression tests and updated docs. Then continue PWA behavior and customer UX. Continue independently and update this plan/handoff after each material phase.

## 11. Decision log

- Preserve Node.js/Express/PostgreSQL unless measured evidence warrants change.
- Do not merge or deploy automatically.
- Do not request secrets in chat.
- Do not invent fares, cancellation/refund rules, operating hours or legal terms.
- Continue autonomous work on independent tasks; ask the owner only for genuinely blocking decisions listed in Section 2.
- When a test environment or device is unavailable, document the limitation and continue with tests that can safely run.
