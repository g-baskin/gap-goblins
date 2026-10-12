# Milestone 1 omnichannel schema review

Date: 2026-09-08
Status: Completed, uncommitted

## Scope reviewed

PRD #010, ADR-0001 through ADR-0004, the uncommitted schema additions, generated migration 0012, Drizzle metadata, and focused conversation-domain tests.

## Changes

- Added `omnichannel_contacts`, a new tenant-owned canonical contact table deliberately separate from legacy global `contacts`.
- Added composite tenant/contact foreign keys from `contact_identities`, `conversation_threads`, and `communication_events` to `(omnichannel_contacts.tenant_id, omnichannel_contacts.id)`.
- Added composite tenant foreign keys for location, channel-account, thread/contact, event, mapping, webhook, and outbound-operation relationships where the child already carries `tenant_id`.
- Required each communication event's `(tenant_id, thread_id, contact_id)` tuple to match its thread, preventing a tenant-valid event contact from differing from the thread contact.
- Added supporting composite unique indexes needed as foreign-key targets.
- Regenerated migration 0012, snapshot 0012, and journal through Drizzle Kit; no migration SQL or snapshot was manually patched after generation.

## Verification

- `bun run db:generate -- --name omnichannel_persistence_foundation`: passed.
- `bun run typecheck`: passed.
- `bun run lint`: passed after formatting generated metadata and schema.
- `bun vitest run lib/conversations/domain.test.ts`: passed, 4/4 tests.
- `git diff --check`: passed.

## Remaining integrity limits

- `external_record_mappings.canonical_id` is polymorphic by `object_type`, so it cannot have one ordinary FK to every possible canonical table.
- Nullable relationships remain optional; composite FKs still enforce tenant consistency whenever their referenced ID is non-null.
- Database constraints establish referential tenant consistency, not request authorization. App-layer tenant authorization (or RLS if adopted) remains required.
