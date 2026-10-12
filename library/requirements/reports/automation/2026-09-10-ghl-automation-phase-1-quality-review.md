# QA Report: GHL Automation Parity — Phase 1

**Plan:** `.gg/plans/ghl-automation-parity-phase-1.md`
**Date:** 2026-09-10
**Scope:** Current worktree on `feature/010-omnichannel-foundation`

## Outcome

**PASS WITH OPERATIONAL WARNINGS.** The requested Phase 1 code is implemented and the prescribed local checks pass. Production tenant assignment and provider delivery remain intentionally blocked until operators supply an approved manifest, credentials, backup, and rollout evidence.

The mandatory security review ran first. Two reachable cross-tenant legacy API paths were confirmed, remediated, and covered by focused route tests. See `library/requirements/reports/security/2026-09-10-ghl-automation-phase-1-security-review.md`.

## Evidence observed

- Formatting and lint passed across 590 files.
- App and worker TypeScript checks passed.
- Full Vitest run passed: 104 files, 1,489 tests; 12 integration tests remain intentionally skipped.
- Baseline suite excluding all seven new test files also passed: 97 files, 1,443 tests.
- Production verification build completed all 69 application routes.
- Focused automation and tenant-route run passed: 10 files, 56 tests.
- A direct local-database probe independently rejected cross-tenant read, list, activation, and enrollment.
- Local Postgres scenario passed signed inbound dispatch, true/false branching, registered note action, deal creation, call-task completion/resume, recording webhook/SMS handlers, and outbox crash recovery.
- Assignment and graph-conversion commands were exercised dry-run-first; no production assignment or conversion occurred.
- Final authenticated captures exist at desktop, tablet, and mobile sizes, including the mobile inspector.

## Requirement traceability

| Area | Status | Evidence |
|---|---|---|
| Additive tenant and graph schema | Pass | `lib/db/schema.ts`, migration `0013_cynical_wolfsbane.sql` |
| Deterministic legacy assignment | Pass | Dry-run-first manifest script, audit rows, runbook |
| Linear-to-graph conversion | Pass | Validated, idempotent draft-only backfill script |
| Closed graph contract/compiler | Pass | Compiler and condition tests cover branches and rejection paths |
| Drafts, publication, rollback | Pass | Optimistic tokens, immutable revisions, atomic pointer changes |
| Tenant isolation | Pass after remediation | Tenant-scoped routes/services and new route regression tests |
| Executor, outbox, recovery | Pass locally | Recording scenario proved branching, resume, and crash recovery |
| Email/SMS | Pass locally | Sanitized email handler; consent-aware recording SMS path |
| Inbound/outbound webhooks | Pass locally | Signature/dedup path and SSRF-focused outbound tests |
| Registered actions/templates | Pass | Server registry, version validation, fresh graph identities |
| Visual builder | Pass | Authenticated responsive screenshots and reducer tests |
| Documentation | Pass | Capability, assignment, failure, and rollback runbooks |
| Full checks/build | Pass | Latest final verification results above |

## Remaining warnings

### W1 — Database orchestration proof is not a committed regression suite

The local scenario exercised publication, execution, call resume, and outbox recovery, but its temporary driver is not part of CI. Convert this scenario into a disposable Postgres integration test before expanding graph execution broadly.

### W2 — Production rollout evidence does not exist by design

No production ownership manifest, backup, tenant assignment, real SMS, or third-party webhook was executed. Production rollout must remain blocked until the runbooks' approval and rollback gates are completed.

### W3 — Review applies to an uncommitted worktree

The evidence is valid for the current files only. Rerun the prescribed checks on the exact review commit before merge or deployment.

## UI evidence

- `.gg/screenshots/automation-builder-desktop-security-final.png`
- `.gg/screenshots/automation-builder-tablet-final.png`
- `.gg/screenshots/automation-builder-mobile-final.png`
- `.gg/screenshots/automation-builder-mobile-inspector.png`

The desktop capture shows the complete branched graph and inspector. Tablet and mobile captures show responsive controls without horizontal page overflow. The mobile inspector capture verifies the settings sheet behavior.

## Final gate

**Code-review progression: PASS WITH WARNINGS.**
**Production rollout: BLOCKED pending operator manifest, backup/rehearsal, exact-commit checks, and deployment monitoring.**
