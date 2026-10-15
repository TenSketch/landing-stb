# STB Documentation Index

**Documentation baseline date:** 2026-10-15

Start here before changing code:

1. [Agent handoff](AGENT_HANDOFF.md) — current PR inventory, verified CI baseline, next priorities and safety rules for the next agent.
2. [Repository audit](REPOSITORY_AUDIT.md) — current architecture, documentation drift, risks and recommended sequence.
3. [Agile development and QA method](AGILE_DEVELOPMENT_QA_METHOD.md) — epics, acceptance criteria, workflow, test matrix and release gates.
3. [Architecture](ARCHITECTURE.md) — request flow and deployment topology.
4. [API reference](API_REFERENCE.md) — endpoint surface and expected behavior.
5. [Database](DATABASE.md) — tables, relationships and migrations.
6. [Booking flow](BOOKING_FLOW.md) — trip modes, pricing and booking lifecycle.
7. [Admin modules](ADMIN_MODULES.md) — current module scope/completeness.
8. [Authentication and RBAC](AUTHENTICATION_AND_RBAC.md) — sessions, roles and permissions.
9. [Security](SECURITY.md) — security controls and hardening guidance.
10. [Technical debt](TECHNICAL_DEBT.md) — legacy findings that must be revalidated against source.
11. [Implementation roadmap](IMPLEMENTATION_ROADMAP.md) — previous prioritized backlog; reconcile with the new Agile method.
12. [Testing](TESTING.md) and [QA phases](QA-PHASES.md) — test entry points and historical process.
13. [PWA](PWA.md) — manifest, service worker and offline/install behavior.
14. [Google Maps](GOOGLE_MAPS.md) — Maps, Places, Routes and key configuration.
15. [Integrations](INTEGRATIONS.md) — provider setup and current capabilities.
16. [Performance and caching](PERFORMANCE_AND_CACHING.md) — caching and performance notes.
17. [Deployment](DEPLOYMENT.md) and [live runbook](LIVE-RUNBOOK.md) — deployment operations; verify the intended environment before use.
18. [UX review (2026-10-04)](UX-REVIEW-2026-10-04.md) — dated review, not a substitute for fresh device testing.
19. [QA report (2026-10-15)](QA-REPORT-2026-10-15.md) — fresh isolated CI run and explicit skipped checks.
20. [QA report (2026-09-30)](QA-REPORT-2026-09-30.md) — historical 160-check report; not a current run.

## Source-of-truth rules

- Current code and executable tests define implemented behavior; docs describe it and must be updated with code changes.
- The repository audit is the current baseline for discrepancies identified on 2026-10-15.
- Dated QA reports are immutable historical evidence. Add a new dated report for each full run rather than rewriting old results.
- `STATUS.md`, `IMPLEMENTATION_PLAN.md` and `docs/IMPLEMENTATION_ROADMAP.md` are legacy status/planning documents until reconciled.
- A successful CI/preview check does not establish that E2E, security, browser/PWA or production runtime verification passed.
- Never commit credentials, customer data or unredacted production logs.
