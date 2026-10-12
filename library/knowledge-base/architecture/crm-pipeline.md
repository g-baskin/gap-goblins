# CRM Pipeline

> Category: Architecture | Version: 1.0 | Date: May 2026 | Status: Active

Sales pipeline stages, contact status hierarchy, deal movement, Cal.com booking sync, and async `crm_sync_queue` retries.

**Related:**
- [`database-schema.md`](database-schema.md)
- [`outreach-pipeline.md`](outreach-pipeline.md)
- [`lib/crm/`](../../../lib/crm/)

---

## Overview

Default pipeline slug: **`sales-pipeline`**. Seeded by `scripts/seed-crm-pipeline.ts` (`bun run db:seed`).

Stages (ordered): **Lead → Contacted → Meeting Booked → Proposal Sent → Won → Lost**

---

## Entry points

| Source | Contact status | Deal stage | Code path |
|---|---|---|---|
| Contact form | `lead` | Lead | Form handler → contact + deal create |
| Outreach positive reply | `lead` (hierarchy-safe) | Contacted | `lib/outreach/crm/push-to-crm.ts` |
| Cal.com booking | `qualified` | Meeting Booked | `app/api/webhooks/cal/route.ts` → RPC |
| Manual admin | any (no downgrade) | user-selected | `/api/crm/deals/[id]/move` |

**Critical rule:** AI-classified reply intent does **not** advance past Contacted. Only real Cal.com webhooks promote to Meeting Booked.

---

## Status hierarchy protection

Order (low → high): `subscriber` < `lead` < `qualified` < `customer`

The database RPC `upsert_contact_with_hierarchy_protection` prevents downgrades when multiple systems write the same email (e.g. newsletter subscriber later becomes outreach lead).

Used in:

- `lib/outreach/crm/push-to-crm.ts`
- `lib/crm-retry-queue.ts`

---

## Deal movement

- Kanban UI: `components/crm/` + `/admin/crm`
- API: `PATCH /api/crm/deals/[id]/move` — updates stage, writes `deal_stage_history`, may sync timeline
- Bulk: `/api/crm/deals/bulk-update`, `bulk-delete`
- Tests: `app/api/crm/deals/[id]/move/__tests__/route.test.ts`, `lib/crm/__tests__/deals.test.ts`

---

## Cal.com webhook

**Production URL (locked):** `https://hooks.__YOUR_DOMAIN__/api/webhooks/cal`

Must use **grey-cloud** `hooks` subdomain — orange-cloud apex breaks Cal.com POSTs (Cloudflare 403).

Handler: verifies HMAC with `CAL_WEBHOOK_SECRET`, calls `update_contact_and_deal_for_booking`.

Docs: `app/api/webhooks/cal/README.md`  
Tests: `app/api/webhooks/cal/__tests__/route.test.ts`

---

## crm_sync_queue

Async retry table (`crm_sync_queue`) for CRM operations that fail mid-flight (e.g. external sync). Processed by:

- `GET /api/cron/process-crm-queue` (cron secret)
- `lib/crm-retry-queue.ts`

Tests: `lib/__tests__/crm-retry-queue.test.ts`

---

## Metrics & dashboard

- RPC: `get_crm_metrics`, `get_crm_dashboard_data`
- TS module: `lib/crm/metrics.ts` (fallback if RPC fails)
- API: `GET /api/crm/metrics`, `GET /api/admin/dashboard`

---

## Timeline

`contact_timeline` events written via `lib/crm/timeline.ts` on create, stage change, booking, outreach sync.

---

## Related code

- `lib/crm/contacts.ts`, `lib/crm/deals.ts`
- `app/api/crm/*`
- `components/crm/PipelineKanban.tsx` (and related)

---

## Related docs

- [`api/crm-api.md`](../api/crm-api.md)
- [`guides/locked-business-rules.md`](../guides/locked-business-rules.md)
- [`requirements/features/feature-001-crm-pipeline/`](../../requirements/features/feature-001-crm-pipeline/)

---

## Changelog

- v1.0 (2026-05) — Initial CRM pipeline doc.
