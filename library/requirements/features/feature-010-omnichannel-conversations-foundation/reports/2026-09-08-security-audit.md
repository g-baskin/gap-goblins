# Security audit - 2026-09-08 - Feature #010 Phase 0

## Executive summary

- Scope: current changed/new Feature #010 Phase 0 code only: additive Drizzle schema/migration, `lib/conversations` contracts/fakes/memory/services/tests, `/admin/conversations` local demo UI, and sidebar navigation; read PRD #010 and ADR-0001 through ADR-0004.
- Coverage: reduced coverage because this repository is Next.js/TypeScript/PostgreSQL, outside the Stinger's primary SvelteKit/Neon/WorkOS stack. Generic authorization, tenancy, persistence, secrets, provider-boundary, unsafe-rendering, and supply-chain checks were applied.
- Findings: 0 Critical, 0 High, 0 Medium, 0 Low.
- Ship Gate status: cleared to proceed to `quality-stinger` for this Phase 0 diff.

## Surface coverage checklist

### SvelteKit attack surface

Not applicable. The changed page is a Next.js server component that passes static, synthetic fixture data to a client component; no route handler, server action, request input, or unauthenticated data fetch was added (`app/admin/(dashboard)/conversations/page.tsx:1`). Existing dashboard authentication remains outside this changed-code-only scope.

### Authorization and tenancy (Drizzle / Neon)

None detected. Tenant context is required and UUID-validated before normalization/persistence (`lib/conversations/domain.ts:90`, `lib/conversations/services.ts:78`). Provider and provider-account identity must match context before inbound or outbound work (`lib/conversations/services.ts:79`, `lib/conversations/services.ts:82`, `lib/conversations/services.ts:184`, `lib/conversations/services.ts:187`). External mappings are keyed by tenant, provider account, and external thread (`lib/conversations/memory.ts:69`, `lib/conversations/memory.ts:85`).

The schema establishes composite tenant FKs for location, contact, channel-account, thread/contact, event, mapping, webhook receipt, and outbound-operation relationships (`lib/db/drizzle/0012_omnichannel_persistence_foundation.sql:152`, `lib/db/drizzle/0012_omnichannel_persistence_foundation.sql:155`, `lib/db/drizzle/0012_omnichannel_persistence_foundation.sql:157`, `lib/db/drizzle/0012_omnichannel_persistence_foundation.sql:163`, `lib/db/drizzle/0012_omnichannel_persistence_foundation.sql:166`, `lib/db/drizzle/0012_omnichannel_persistence_foundation.sql:173`, `lib/db/drizzle/0012_omnichannel_persistence_foundation.sql:176`). These constraints preserve cross-tenant relational integrity. They do not replace query-layer authorization/RLS, which is a future runtime requirement below.

### Secrets and environment

None detected. `secret_reference` stores only an indirection reference (`lib/db/drizzle/0012_omnichannel_persistence_foundation.sql:10`); no credentials, environment access, SDK configuration, or secret-like literals occur in the audited implementation.

### Webhooks and third-party intake

No live webhook route exists. The contract accepts already-attributed input and the service checks provider-account consistency (`lib/conversations/services.ts:73`, `lib/conversations/services.ts:82`). Fake normalization is local array processing only (`lib/conversations/fakes.ts:48`). In-memory and database identities scope deduplication to provider account (`lib/conversations/domain.ts:138`, `lib/db/drizzle/0012_omnichannel_persistence_foundation.sql:196`). Duplicate events are suppressed by the fake receipt port and tested (`lib/conversations/memory.ts:16`, `lib/conversations/services.test.ts:55`).

Signature verification, raw-body limits, authentication, durable receipt transactions, retry/dead-letter behavior, and payload retention are not implemented and must remain future requirements—not claims about a current exploitable route.

### Dependencies and supply chain

None detected. No dependency or lockfile changed. No Chatwoot source/package/artifact is present in the audited code. The only Chatwoot strings are neutral idempotency examples in tests (`lib/conversations/domain.test.ts:47`). No Enterprise-only code, tests, assets, API, or deployment artifact was detected.

### Headers and transport

Not applicable. No endpoint, middleware, transport, or deployment configuration changed.

### AI-generated code patterns

None detected at exploitable/blocking severity. The audited code consistently carries canonical tenant/account context instead of trusting external identifiers (`lib/conversations/services.ts:78`, `lib/conversations/memory.ts:75`). The local demo has no authorization decision or persistent mutation.

### PII and logging hygiene

None detected. Demo identities and message bodies are visibly synthetic (`app/admin/(dashboard)/conversations/conversations-demo.ts:27`, `app/admin/(dashboard)/conversations/conversations-demo.ts:66`). React renders message text as escaped text; no `dangerouslySetInnerHTML` or equivalent unsafe HTML sink exists (`app/admin/(dashboard)/conversations/conversations-workspace.tsx:512`). No logging was added. Raw provider payload columns exist for future use (`lib/db/drizzle/0012_omnichannel_persistence_foundation.sql:124`) and require a retention/redaction decision before live ingestion.

## Findings detail

None detected in the current changed/new Phase 0 implementation.

## Deterministic local-only confirmation

Confirmed for the audited implementation. The page imports a static local fixture (`app/admin/(dashboard)/conversations/page.tsx:2`), user interactions mutate React state only (`app/admin/(dashboard)/conversations/conversations-workspace.tsx:93`), and fake adapters only record requests and generate sequence-based synthetic references/timestamps (`lib/conversations/fakes.ts:28`, `lib/conversations/fakes.ts:83`, `lib/conversations/fakes.ts:105`). No `fetch`, HTTP client, provider SDK, environment-variable access, server action, route handler, queue dispatch, socket, subprocess, or credential lookup occurs in the audited files. Therefore ordinary rendering/tests cannot send a message, start a real call, or contact Chatwoot/Twilio.

## Future requirements before live providers/routes

These are not current vulnerabilities because the relevant externally reachable/runtime surfaces do not exist yet:

1. Derive tenant/account context from authenticated server-side membership and account lookup; never accept tenant or account attribution from webhook/client payloads.
2. Implement DB repositories with tenant predicates on every read/write and transactionally enforce canonical event + receipt/outbox state. Decide and test RLS/DB-role strategy before live tenant data.
3. Verify webhook authentication/signatures over raw bounded bodies before normalization/persistence; reject malformed, oversized, stale, or unverifiable events fail closed.
4. Make receipt claiming and outbound dispatch concurrency-safe. Do not retry an ambiguously failed provider send without a provider-supported stable idempotency key/reconciliation strategy.
5. Add durable retry/dead-letter policy, attempt limits, backoff, observability, and redacted errors.
6. Minimize/encrypt/expire raw webhook payloads and outbound payloads; prohibit secrets and unrestricted PII in logs/client bundles.
7. Sanitize any future provider HTML with an allowlist before persistence/rendering.
8. Add the planned license/provenance guard before introducing pinned Chatwoot Community integration; continue excluding all Enterprise material.

## Remediation summary

| Severity | Count | Fixed this session | Documented only |
|---|---:|---:|---:|
| Critical | 0 | 0 | 0 |
| High | 0 | 0 | 0 |
| Medium | 0 | 0 | 0 |
| Low | 0 | 0 | 0 |

No product code was changed.

## Verification

- `bunx vitest run lib/conversations app/admin/\(dashboard\)/conversations/conversations-demo.test.ts`: passed, 4 files / 14 tests.
- `bunx tsc --noEmit`: passed.
- `bunx drizzle-kit check`: passed.
- `git diff --check`: passed.
- Focused deterministic scans found no network calls, provider SDK usage, environment access, unsafe HTML APIs, dynamic SQL, credentials, or Chatwoot Enterprise material in audited files.
- `bunx biome check ...`: did not pass due only to three pre-existing formatting/import-order diagnostics in new files; this is a quality issue, not a security finding.

## Re-evaluation

N/A - no Medium-or-above findings required fixes.

## Next step

Security gate is cleared for the scoped Phase 0 diff. Run `quality-stinger` next. Before any commit/push, the orchestrator must then run `github-repo-health-stinger`; provide the user this report and obtain approval before committing or pushing.
