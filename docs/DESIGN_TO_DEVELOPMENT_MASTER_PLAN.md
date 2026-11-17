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

**Admin dispatch/accessibility work is in PRs #8 and #9** ([#8](https://github.com/TenSketch/landing-stb/pull/8), [#9](https://github.com/TenSketch/landing-stb/pull/9)); both isolated CI runs passed. PR #8 still requires manual browser/device accessibility verification. PR #9 adds active-driver server validation and dispatch-scoped driver choices.

**Next engineering task:** audit admin error handling and remaining API authorization boundaries. Check duplicate error toasts, loading/empty/error states and route-level permission enforcement. Fix the highest-impact reproducible issue with focused tests. Then move to PWA cache/update/offline behavior, followed by customer UX and design-system refinement. Continue independently and update this plan/handoff after each material phase.

## 11. Decision log

- Preserve Node.js/Express/PostgreSQL unless measured evidence warrants change.
- Do not merge or deploy automatically.
- Do not request secrets in chat.
- Do not invent fares, cancellation/refund rules, operating hours or legal terms.
- Continue autonomous work on independent tasks; ask the owner only for genuinely blocking decisions listed in Section 2.
- When a test environment or device is unavailable, document the limitation and continue with tests that can safely run.


## 12. Phase execution contract: one phase, one commit, then continue

This is the required unit of delivery for the autonomous agent. A phase is a coherent, independently reviewable outcome. Do not combine unrelated phases into one commit or one PR. A phase may contain several small commits only when technically necessary, but the default is **one phase = one implementation commit = one PR or a clearly separated PR commit**.

For each phase, the agent must:
1. Start from the latest safe branch/PR head and confirm upstream dependencies.
2. Read the relevant source and documentation; record verified current behavior before editing.
3. Create a focused branch from the correct dependency head. Do not stack a branch on another unmerged branch unless the dependency is required and the PR base is explicitly set to that dependency.
4. Write/confirm acceptance criteria in the PR description before implementation.
5. Implement only that phase's scope; update tests and docs in the same phase.
6. Run targeted checks, then the full isolated CI suite. Record exact commit SHA, commands, pass/fail/skip/block counts and links to artifacts.
7. Review the complete diff and check secrets, compatibility, concurrency, migration rollback and unintended changes.
8. Commit with the prescribed message, open/update the PR, and update `AGENT_HANDOFF.md` with status and next phase.
9. **Immediately continue to the next independent phase** after a phase is committed and its verification result is recorded. Do not wait for the owner to say “continue”. If CI fails, fix the failure within that phase before advancing; if blocked by external access, record the blocker and continue only with independent work.
10. Never merge or deploy unless explicitly authorized. A commit or green CI is not production approval.

### Commit and PR conventions

Use conventional commit prefixes:
- `docs:` documentation-only
- `test:` tests and test harness
- `fix:` bug/security/data-integrity corrections
- `feat:` additive user-facing or API capability
- `perf:` measured performance improvement
- `refactor:` behavior-preserving structural work

Suggested commit format: `<type>: <phase outcome in imperative language>`.

Each PR body must state: phase ID; problem; scope/non-goals; acceptance criteria; files and migrations; tests with exact outcomes; skipped/blocked checks; compatibility/configuration; rollback/recovery; remaining risk; next phase. If PRs are stacked, clearly state the base PR and dependency. Avoid stale claims about tests that ran on a different SHA.

### Phase status vocabulary

Use exactly one status per phase: `NOT STARTED`, `IN PROGRESS`, `PASS — PR OPEN`, `FAIL — FIX REQUIRED`, `BLOCKED — EXTERNAL DEPENDENCY`, `OWNER DECISION REQUIRED`, or `COMPLETE — MERGED`. Never mark a phase complete just because code was written. In this test-only project, a phase with a green CI and an open PR is still `PASS — PR OPEN`, not merged/complete.

## 13. Phase-by-phase execution backlog

The order below is the default order. Re-evaluate only when code inspection proves a dependency or risk requires it. Do not ask for approval to make ordinary implementation choices that preserve the existing contracts and product intent.

### Phase 0 — Repository truth and delivery baseline
**Goal:** Establish an accurate map of the app and a reliable isolated test process.

**Work:** Reconcile open PRs, branch bases and CI; identify authoritative server/client entry points; document runtime and deployment topology; make tests portable; ensure CI uses disposable PostgreSQL and synthetic fixtures; classify each external/public-domain probe as opt-in; ensure cleanup runs even on failure.

**Acceptance:** Default branch and each open PR are inventoried with exact heads; CI results are reproducible and attached to a SHA; tests never target production by default; skips are explicit; a failing test makes the workflow fail; architecture/API/database docs match verified source.

**Artifacts:** repository audit, architecture map, test/QA report, current agent handoff.

**Commit:** `docs: establish verified repository baseline` or `test: make isolated QA reproducible` as a single coherent change. Existing baseline PRs may satisfy this phase only after review and current CI verification.

### Phase 1 — Security boundaries and webhook safety
**Goal:** Prevent unauthorized access, secret exposure and unsafe webhook-triggered side effects.

**Work:** Verify webhook authentication/signature algorithm and raw-body requirements; request size and method/path allowlists; replay protection if the provider supports it; safe process invocation (no shell interpolation); rate limiting; consistent generic errors; admin/customer authorization on every mutation; CSRF/session cookie policy; secret redaction; security headers and input/output encoding.

**Acceptance:** Valid and invalid signature tests; oversized body 413; unknown route/method rejected; replay behavior documented; authorization tests cover unauthenticated, insufficient role and allowed role; no secrets in public config or logs; security tests run in isolated CI.

**Dependencies/guardrails:** Do not invent a provider signature scheme. If provider docs or credentials are needed, implement only what can be verified and mark live validation blocked. Never execute production deploy side effects in tests.

**Commit:** `fix: enforce webhook and authorization boundaries`.

### Phase 2 — Booking data integrity, retry and concurrency
**Goal:** Ensure a customer submission creates one durable booking and that lifecycle changes cannot race.

**Work:** Trace booking creation from browser through route, validation, pricing, voucher generation, DB schema, audit and notifications. Confirm idempotency behavior, transaction scope and unique constraints. Validate driver assignment and status transitions with row locks. Ensure server-side validation owns authoritative status and fare. Decide notification retry semantics separately from booking persistence.

**Acceptance:** Same idempotency key/payload returns the same voucher; changed payload with same key conflicts; concurrent requests create one row; rollback leaves no partial booking/history/audit; illegal transitions and closed-booking assignment are rejected; duplicate external notifications are not triggered by replay; migration and rollback/recovery instructions are documented.

**Dependencies/guardrails:** Preserve existing clients by keeping the key optional until all clients are confirmed upgraded. Do not silently alter commercial fare/cancellation rules. No production database testing.

**Commit:** `fix: guarantee booking retry and lifecycle integrity`.

### Phase 3 — Booking rules and customer-to-dispatch workflow
**Goal:** Make the end-to-end booking journey correct, transparent and recoverable.

**Work:** Map all trip modes (one-way/airport, hourly, daily); validate date/time and Singapore timezone; inspect server fare calculation vs displayed estimate; validate vehicle/passenger limits; verify pickup/destination inputs and fallback labeling; confirm guest/customer association; booking reference/confirmation; dispatch, reassignment, cancellation and completion behavior; audit/history consistency.

**Acceptance:** Each supported trip type has success, validation-error and persistence-failure tests; browser estimate is explicitly an estimate unless server-confirmed; date/time values round-trip in Asia/Singapore; client cannot set privileged booking state or trusted fare; admin dispatch sees the persisted booking and valid state; E2E checks the customer submission through admin-visible booking.

**Owner-only decisions:** If commercial pricing, surcharge policy, refund/cancellation policy or customer-facing legal wording is not inferable, record the exact decision needed, use existing documented behavior temporarily, and continue independent work.

**Commit:** `fix: align booking rules and dispatch workflow`.

### Phase 4 — Integration reliability and configuration
**Goal:** Make Maps, email, messaging and other providers safe to configure, test and recover.

**Work:** Separate browser-restricted Maps key from server key; verify allowed API set, referrer/IP restrictions and environment names; avoid exposing server secrets; implement clear unavailable/fallback states; review notification provider lookup latency and caching; add bounded timeouts and retries only when safe; report configured/tested/delivered/failed states distinctly; test with mocks.

**Acceptance:** Public config contains only intended browser-safe values; missing/denied Maps APIs do not break booking; estimates label fallback precision honestly; provider cache has TTL and mutation invalidation; provider failures do not corrupt a saved booking; logs contain no credentials or sensitive payloads; mocked provider tests pass.

**Dependencies/guardrails:** Real provider credentials and live sends are not required for isolated CI and must not be fabricated. Live-provider checks are opt-in and separately authorized.

**Commit:** `fix: harden provider configuration and failure handling` or `perf: reduce repeated provider configuration queries` for a distinct measured change.

### Phase 5 — Admin usability, accessibility and operational correctness
**Goal:** Let authorized staff manage bookings and dispatch without ambiguous or inaccessible controls.

**Work:** Inventory admin screens and roles; replace prompt/alert-based workflows with dialogs and forms; validate driver assignment against active driver/fleet records; provide loading/empty/error/success/retry states; prevent duplicate error toasts; improve filtering/search/pagination; check audit views and destructive confirmations; enforce permissions on the server.

**Acceptance:** Core booking/dispatch tasks are keyboard operable; dialogs have labels, focus management and escape/close behavior; no driver is assignable unless eligible; error messages are actionable and not duplicated; server denies unauthorized mutations even if UI controls are bypassed; responsive/mobile checks are documented.

**Commit:** `fix: make admin dispatch safe and accessible`. Split only if the source shows independent PR-sized changes, each with its own phase ID and commit.

### Phase 6 — Customer experience and design system
**Goal:** Align the interface to the established STB product direction: book quickly, with clear guidance and minimal clutter.

**Work:** Audit the existing page before redesigning; document current logo/brand constraints, typography, color tokens, spacing, component patterns and breakpoints; keep homepage focused on search/booking with no unnecessary navigation; use a short guided flow; improve form validation, route/vehicle/fare clarity, confirmation and recovery; add a first-use guided tour only if it helps without blocking booking; avoid competing tabs and unnecessary sections.

**Acceptance:** A first-time user can identify how to begin booking; one primary action is visually clear; no more than 3–4 purposeful homepage sections unless evidence justifies more; design uses a small consistent palette; all steps work on mobile and keyboard; validation is adjacent to fields and announced accessibly; screenshots or reproducible browser notes compare before/after; existing functionality is not silently removed.

**Design workflow:** Write the screen/state specification first; establish tokens and reusable components; implement one vertical slice; verify it; then apply patterns consistently. Do not perform a broad aesthetic rewrite before recording the current state and test coverage.

**Commit:** `feat: simplify and standardize the customer booking journey`.

### Phase 7 — PWA, caching, performance and resilience
**Goal:** Ensure installation/update behavior is predictable and stale assets do not mislead users.

**Work:** Check customer/admin manifests, icons, scope, service-worker registration and update lifecycle; use versioned cache names and cleanup; avoid cache-first behavior for mutable APIs, booking responses, auth or provider data; add safe offline messaging and retry; inspect large assets and slow DB/API paths; set budgets from measurement rather than guesswork.

**Acceptance:** Customer and admin install paths are verified separately; updates replace old assets; cache invalidation is tested; booking mutations are never replayed from cache; offline mode clearly says booking requires connection; key pages remain usable when optional fonts/maps fail; performance improvements include measured before/after evidence; target-device checks are passed or explicitly blocked.

**Commit:** `fix: make PWA cache and update behavior safe`, with performance optimizations separated if unrelated.

### Phase 8 — Full regression, accessibility/security review and release evidence
**Goal:** Produce a truthful release candidate dossier without deploying.

**Work:** Run migrations against a disposable database; full backend, API, E2E, security and accessibility checks; verify key user journeys; inspect dependencies and secrets; confirm observability, backups and rollback procedures; update all documentation; prepare staging smoke steps and residual-risk list.

**Acceptance:** Every check is marked pass/fail/skipped/blocked; failures are fixed or explicitly unresolved; exact candidate SHA and artifacts are recorded; migration rollback/recovery is documented; no production mutation or deployment occurred; outstanding business decisions are listed plainly.

**Commit:** `test: record release candidate verification` plus documentation updates in the same phase commit where possible.

**Release gate:** Production merge/deploy remains a separate owner-authorized action. No agent may infer deployment permission from a green build or a completed phase.

## 14. Documentation maintenance contract

- Update the relevant source-of-truth doc in the same phase commit as code changes.
- When behavior changes, update API reference, booking flow, database/migration notes, security, integration or PWA docs as applicable.
- Keep `README.md`, `docs/README.md`, `AGENT_HANDOFF.md` and the master plan aligned.
- Mark historical audit/technical-debt findings as fixed only when a source diff and passing regression prove it.
- Do not claim visual/device testing unless performed on that browser/device.
- Each QA report must name exact SHA, environment, commands, counts, skipped/blocked checks, artifacts and cleanup.
- Keep business assumptions separate from verified behavior.

## 15. Start instruction for a fresh agent

Start at `docs/DESIGN_TO_DEVELOPMENT_MASTER_PLAN.md`, then follow `docs/README.md` and `docs/AGENT_HANDOFF.md`. Reconcile current GitHub state before editing. Review open PRs and dependencies; do not duplicate work that already exists in an open PR. Complete or update Phase 0 first, then follow the phase order. For each phase, create one focused branch/commit/PR, run tests, document evidence, update the handoff, and continue automatically to the next phase. Do not ask for routine approval. Do not merge or deploy. If a phase is blocked, record the precise blocker and continue independent work.
