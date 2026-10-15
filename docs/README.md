# STB Documentation Index

**Documentation baseline date:** 2026-10-15

Start here before changing code:

1. [Design-to-development master plan](DESIGN_TO_DEVELOPMENT_MASTER_PLAN.md) — product direction, design workflow, execution phases and release gates.
2. [Agent handoff](AGENT_HANDOFF.md) — current PR inventory, CI evidence, next priorities and autonomous working rules.
3. [Repository audit](REPOSITORY_AUDIT.md) — architecture, documentation drift, risks and recommended sequence.
4. [Agile development and QA method](AGILE_DEVELOPMENT_QA_METHOD.md) — acceptance criteria, workflow, test matrix and release gates.
5. [Architecture](ARCHITECTURE.md) — request flow and deployment topology.
6. [API reference](API_REFERENCE.md) — endpoint surface and expected behavior.
7. [Database](DATABASE.md) — tables, relationships and migrations.
8. [Booking flow](BOOKING_FLOW.md) — trip modes, pricing and booking lifecycle.
9. [Admin modules](ADMIN_MODULES.md) — current module scope/completeness.
10. [Authentication and RBAC](AUTHENTICATION_AND_RBAC.md) — sessions, roles and permissions.
11. [Security](SECURITY.md) — security controls and hardening guidance.
12. [Technical debt](TECHNICAL_DEBT.md) — historical findings to revalidate against source.
13. [Implementation roadmap](IMPLEMENTATION_ROADMAP.md) — legacy backlog; reconcile with the master plan.
14. [Testing](TESTING.md) and [QA phases](QA-PHASES.md) — test entry points and historical process.
15. [PWA](PWA.md) — manifest, service worker and offline/install behavior.
16. [Google Maps](GOOGLE_MAPS.md) — Maps, Places, Routes and key configuration.
17. [Integrations](INTEGRATIONS.md) — provider setup and current capabilities.
18. [Performance and caching](PERFORMANCE_AND_CACHING.md) — caching and performance notes.
19. [Deployment](DEPLOYMENT.md) and [live runbook](LIVE-RUNBOOK.md) — deployment operations; verify the intended environment before use.
20. [UX review (2026-10-04)](UX-REVIEW-2026-10-04.md) — dated review, not a substitute for fresh device testing.
21. [QA report (2026-10-15)](QA-REPORT-2026-10-15.md) — isolated CI run and explicit skipped checks.
22. [QA report (2026-09-30)](QA-REPORT-2026-09-30.md) — historical 160-check report; not a current run.
23. [Idempotency QA report](https://github.com/TenSketch/landing-stb/blob/fix/booking-idempotency/docs/QA-REPORT-2026-10-15-IDEMPOTENCY.md) — isolated CI evidence for PR #6.
24. [Provider-cache QA report](QA-REPORT-2026-10-15-PROVIDER-CACHE.md) — isolated CI evidence for PR #7.
25. [Admin dialog QA report](QA-REPORT-2026-10-15-ADMIN-DIALOG.md) — isolated CI evidence for PR #8.

## Source-of-truth rules

- Current code and executable tests define implemented behavior; docs describe it and must be updated with code changes.
- The repository audit is the current baseline for discrepancies identified on 2026-10-15.
- Dated QA reports are immutable historical evidence. Add a new dated report for each full run rather than rewriting old results.
- `STATUS.md`, `IMPLEMENTATION_PLAN.md` and `docs/IMPLEMENTATION_ROADMAP.md` are legacy status/planning documents until reconciled.
- A successful CI/preview check does not establish that E2E, security, browser/PWA or production runtime verification passed.
- Never commit credentials, customer data or unredacted production logs.
