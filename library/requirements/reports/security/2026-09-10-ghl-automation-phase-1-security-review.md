# Security review — 2026-09-10 — GHL automation phase 1

## Executive summary

- **Scope:** Tenant boundaries, authorization, webhooks, external side effects, SMS gates, graph recovery, and automation routes introduced or changed by phase one.
- **Coverage:** Code-path review plus targeted regression tests; not a full repository, dependency, deployment, or live-provider assessment.
- **Confirmed findings:** 0 Critical, 2 High fixed, 0 Medium, 0 Low.
- **Gate result:** Confirmed cross-tenant automation paths were removed before quality review. This is not a safety certification.

## Confirmed findings and fixes

### [High — fixed] Tenant-owned linear flows were reachable through unscoped legacy APIs

- **Locations:** `app/api/automation/flows/route.ts`, `[flowId]/route.ts`, `[flowId]/steps/route.ts`, `[flowId]/pause/route.ts`, and `lib/automation/flows.ts`.
- **Risk:** An authenticated administrator from one tenant could list, read, edit, archive, pause, or replace steps on another tenant's flow by identifier.
- **Fix:** Every route now resolves an explicit active tenant; data-layer flow queries require that tenant and return `404` outside it.
- **Legacy behavior:** Unassigned linear flows remain visible/editable for migration, but assigned flows cannot cross tenant boundaries.

### [High — fixed] Creation and manual enrollment could bypass tenant ownership

- **Locations:** `app/api/automation/flows/route.ts`, `[flowId]/activate/route.ts`, `[flowId]/enroll/route.ts`, and `lib/automation/enrollments.ts`.
- **Risk:** Omitting the tenant header could create unowned flows or enroll attacker-selected contacts/subscribers into unassigned flows.
- **Fix:** New flows, activation, and manual enrollment require tenant-admin resolution; flow and target records are filtered by the same tenant in database queries.
- **Additional correction:** Tenant-owned linear enrollments now retain tenant ownership, and only active flows accept contacts.

## Dropped candidates / false positives

- **Template identity reuse:** Not a security boundary because node keys are revision-scoped; fresh key remapping remains as a plan-correctness fix.
- **Template tenant access:** Dropped; system-or-current-tenant lookup and tenant-scoped destination updates fail closed.
- **Recovery authorization:** Dropped; routes require global admin, tenant admin membership, CSRF enforcement, and tenant-scoped mutations.
- **Inbound webhook leakage:** Dropped; signatures, freshness, body limits, database deduplication, and generic responses are enforced.
- **Outbound webhook SSRF:** Dropped after tracing save-time and send-time HTTPS/DNS/IP validation, redirect denial, bounded responses, and reviewed headers.

## Checks actually run

- `bunx vitest run app/api/automation/flows/__tests__/route.test.ts 'app/api/automation/flows/[flowId]/__tests__/route.test.ts' lib/automation` — passed: 10 files, 56 tests.
- `bun run typecheck` — passed.
- `bun run typecheck:worker` — passed.
- Earlier final-pass checks passed formatting, lint, 1,484 tests, production build, local Postgres scenario, and fake external transports.

## Unverified scope

- No full git-history secret scan, dependency/SBOM provenance review, or live infrastructure-policy assessment.
- No real Twilio, Resend, or third-party webhook request was sent; verification intentionally used local recording handlers.
- No external penetration test, fuzzing campaign, or production-data migration was performed.

## Next step

Proceed to the separate quality review. Re-run this security gate if later code changes these boundaries.
