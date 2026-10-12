# Neon/Drizzle Schema Correction — Feature #010

- Date: 2026-09-08
- Scope: Phase 0 canonical conversation persistence schema, migration 0012, and deterministic fixture/tests.

## Decisions

1. `conversation_threads` is provider-neutral. Its `channel_account_id`, direct FK, tenant-composite FK, and generated migration metadata were removed. A thread can contain web chat, SMS, email, and voice events.
2. Provider provenance is event-level: `communication_events.source_channel_account_id` is nullable. This permits system/CRM-originated canonical events without a provider account.
3. Event provenance is tenant-safe through `(tenant_id, source_channel_account_id) -> channel_accounts(tenant_id, id)`. Drizzle also generates its normal single-column FK from the column reference.
4. Migration `0012_omnichannel_persistence_foundation` and its snapshot were regenerated from the schema and retained as 0012; no 0013 remains.
5. The deterministic fixture keeps one mixed-channel thread, assigns messaging/voice source accounts to corresponding canonical events, and includes a source-less CRM/system event. Tests explicitly assert thread neutrality, deterministic provider provenance, and nullable provenance for the CRM/system event.

## Verification

- `bunx drizzle-kit check` — passed.
- `bunx biome check lib/db/schema.ts lib/conversations/persistence-fixture.ts lib/conversations/persistence-fixture.test.ts lib/db/drizzle/meta/_journal.json` — passed.
- `bun run typecheck` — passed.
- `bunx vitest run lib/conversations/*.test.ts` — passed: 3 files, 13 tests.

## Remaining limitations

- `conversation_threads.channel` remains as the thread's product-level classification/initial channel because the PRD explicitly includes channel on threads; it is not provider ownership. A later product decision may clarify semantics for mixed-channel filtering.
- No database was contacted and no migration was applied. Runtime PostgreSQL constraint behavior was not integration-tested.
- This correction precedes the requested quality report. Before commit/push, complete quality and repository-health gates and obtain user approval.
