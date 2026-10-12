---
type: question
title: "Where are CRM Postgres RPCs defined?"
question: "What is the full SQL for upsert_contact_with_hierarchy_protection and update_contact_and_deal_for_booking?"
answer_quality: definitive
created: "2026-05-28"
updated: "2026-05-28"
status: resolved
tags:
  - question
  - database
  - crm
related:
  - "[[entities/functions/pushToCrm]]"
  - "[[entities/runCrmBookingSync]]"
  - "[[concepts/crm-pipeline-stage-promotion]]"
  - "[[entities/functions/contact-status-rank]]"
  - "[[entities/functions/upsert-contact-with-hierarchy-protection]]"
  - "[[entities/functions/update-contact-and-deal-for-booking]]"
  - "[[entities/functions/bulk-add-tags]]"
  - "[[entities/functions/bulk-delete-contacts]]"
sources:
  - "lib/db/drizzle/0011_crm_rpc_functions.sql"
---

# Where are CRM Postgres RPCs defined?

## Resolution (2026-05-28)

**Status: resolved.** All five RPC functions in `lib/db/drizzle/0011_crm_rpc_functions.sql` have been extracted and filed as atomic entity pages.

## Entity pages created

| RPC | Entity page |
|-----|-------------|
| `contact_status_rank` | [[entities/functions/contact-status-rank]] |
| `upsert_contact_with_hierarchy_protection` | [[entities/functions/upsert-contact-with-hierarchy-protection]] |
| `update_contact_and_deal_for_booking` | [[entities/functions/update-contact-and-deal-for-booking]] |
| `bulk_add_tags` | [[entities/functions/bulk-add-tags]] |
| `bulk_delete_contacts` | [[entities/functions/bulk-delete-contacts]] |

## Key findings

- All five functions live in `lib/db/drizzle/0011_crm_rpc_functions.sql` (migration 0011).
- `contact_status_rank` is `IMMUTABLE` — shared dependency for hierarchy protection in both upsert and booking-sync functions.
- `bulk_add_tags` and `bulk_delete_contacts` have no known TypeScript callers in the current scan — flagged in gaps.
