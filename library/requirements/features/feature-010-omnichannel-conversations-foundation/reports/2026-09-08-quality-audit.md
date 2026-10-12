# Quality audit - 2026-09-08 - Feature #010 Phase 0

## Executive summary

- **Source plan:** `../prd-feature-010-omnichannel-conversations-foundation.md`
- **Security prerequisite:** passed in `2026-09-08-security-audit.md` before this quality review.
- **Scope reviewed:** additive persistence schema and migration; canonical conversation domain contracts; deterministic messaging and voice adapters; in-memory idempotent ingestion/outbound orchestration; synthetic persistence fixture; authenticated local Conversations demonstration; sidebar navigation; focused and repository-wide verification.
- **Gate result:** **PASS for the local-only Phase 0 foundation.**
- **Live-provider readiness:** **NOT APPROVED.** Chatwoot, Twilio, provider webhooks, real sends/calls, production DB repositories, and rollout remain intentionally deferred.
- **Findings:** 0 Critical, 0 High, 0 Medium, 0 Low in the implemented Phase 0 scope.

## Acceptance-criteria traceability

| PRD criterion | Result | Evidence |
|---|---|---|
| AC-1: one tenant, agent membership, contact, and email/phone/web identities | Pass | `lib/conversations/persistence-fixture.ts`; fixture tests verify exact counts, tenant consistency, and verified identities. |
| AC-2: fake web chat, SMS, email, and voice normalize into one model | Pass | `lib/conversations/fakes.ts`, `lib/conversations/services.ts`, `lib/conversations/services.test.ts`. |
| AC-3: preserve `occurredAt` and `receivedAt` | Pass | Domain contracts and out-of-order event test in `lib/conversations/services.test.ts`. |
| AC-4: duplicate inbound events and outbound commands are idempotent | Pass for deterministic Phase 0 | Provider-account-scoped keys, in-memory receipt/operation ports, and duplicate tests. Durable DB claiming/transactions remain deferred. |
| AC-5: no real external send/call | Pass | No live routes, SDKs, credentials, network calls, or environment access were added; security audit independently confirmed. |
| AC-6: one custom mixed-channel timeline | Pass | `/admin/conversations` renders web chat, SMS, email, voice, and system/CRM events in one chronological workspace. |
| AC-7: channel/direction/status/time are understandable | Pass | Timeline badges/icons, status labels, timestamps, call metadata, and channel-aware composer state. |
| AC-8: provider mappings and ownership are explicit | Pass at schema/contract level | `external_record_mappings`, provider context validation, mapping ports, and source account provenance on events. |
| AC-9: tenant isolation demonstrated | Pass at schema/contract level | Mandatory UUID tenant context plus composite tenant-aware foreign keys. Runtime query authorization/RLS remains deferred. |
| AC-10: Chatwoot Enterprise excluded | Pass | No Chatwoot package/source/deployment artifact exists; only neutral test/documentation references. |
| AC-11: security then quality reports exist | Pass | Security and this quality report are stored in the PRD reports directory. |
| AC-12: phased deployment and rollback | Deferred by design | No database or provider deployment was attempted in this local-only slice. Migration 0012 is additive and un-applied. |

## Implementation review

### Persistence

The implementation adds tenant-owned canonical records without modifying inherited CRM tables:

- `tenants`
- `locations`
- `tenant_memberships`
- `omnichannel_contacts`
- `contact_identities`
- `channel_accounts`
- `conversation_threads`
- `communication_events`
- `external_record_mappings`
- `provider_webhook_events`
- `outbound_operations`

Migration `0012_omnichannel_persistence_foundation.sql` and its Drizzle snapshot were generated from the schema. Composite foreign keys keep contacts, locations, channel accounts, threads, events, webhook receipts, and outbound operations within the owning tenant.

A review correction made canonical threads provider-neutral. Provider provenance is recorded per event through nullable `source_channel_account_id`, so one thread can contain events from multiple channels while system/CRM events can have no provider source. Details are recorded in `2026-09-08-neon-drizzle-schema-correction.md`.

### Domain and deterministic adapters

`lib/conversations` now provides:

- validated tenant/provider context;
- normalized channel, direction, status, and event contracts;
- provider-neutral messaging and voice interfaces;
- programmable local-only fake adapters;
- provider-account-scoped webhook and outbound idempotency keys;
- in-memory receipt, mapping, event, and outbound-operation ports;
- inbound normalization and outbound orchestration services;
- a typed synthetic persistence fixture.

The fake layer can represent success, failure, duplicates, and out-of-order provider timestamps without contacting a provider.

### Unified Conversations UI

`/admin/conversations` adds a distinct, responsive workspace using deterministic local data:

- searchable/filterable thread list;
- mixed-channel chronological timeline;
- visible web chat, SMS, email, voice, and system events;
- contact and CRM context panel;
- one channel-selectable composer that clearly remains non-sending in Phase 0;
- a call action that clearly remains simulated;
- accessible labels, focus-visible controls, and mobile sheets for inbox/contact context.

The inherited Inbox remains available; Conversations was added as a separate navigation entry.

## Deferred work and limitations

These items are expected later milestones, not defects in this local-only slice:

1. Implement PostgreSQL repositories and transactionally claim webhook receipts/outbound work.
2. Decide whether thread-level `channel` means initial, primary, or preferred channel; it does not constrain event membership.
3. Apply migration 0012 only through a reviewed deployment plan; no database was modified here.
4. Derive tenant context from authenticated server-side membership on every runtime request.
5. Add webhook signature verification, bounded raw-body handling, retry/dead-letter policies, observability, and payload retention/redaction before live ingestion.
6. Add direct end-to-end wiring from fake ingestion to the rendered page; Phase 0 currently proves the service and UI contracts separately with deterministic fixtures.
7. Add Chatwoot Community only after license provenance/pinning controls are implemented.
8. Add Twilio only after credentials, registration, consent, quiet-hour, recording, and rollback controls are approved.
9. Run browser-assisted visual/accessibility testing against a locally authenticated session before accepting a customer-facing release.
10. Establish the intended `dev` -> `qa` -> `main` branch/ruleset workflow for the new remote.

## Verification

Final repository-level verification completed on 2026-09-08:

- `bun run lint`: passed, 531 files checked.
- `bun run format:check`: passed, 531 files checked.
- `bun run typecheck`: passed.
- `bun run typecheck:worker`: passed.
- `bunx drizzle-kit check`: passed.
- Focused Conversations tests: passed, 4 files / 17 tests.
- Full Vitest suite: passed, 97 files passed, 1 skipped; 1,443 tests passed, 12 skipped.
- `bun run build:verify`: passed; `/admin/conversations` included in the production route build.
- `git diff --check`: passed.

The full suite/build ran before the final provider-neutral thread schema correction; after that correction, Drizzle check, Biome, TypeScript, and focused Conversations tests passed again. No live database or provider integration was exercised.

## Final ruling

The implementation satisfies the selected local Phase 0 foundation and is suitable for owner review. It must not be represented as a live omnichannel integration or production-ready provider stack. No commit or push should occur until repository-health review is completed and the owner authorizes publishing the feature branch.
