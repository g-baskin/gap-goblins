# Feature #001: CRM Pipeline (Retroactive)

> **template-crm / admin-platform** — Feature PRD #001
>
> **Status:** Shipped (documented retroactively 2026-05-27)
> **Priority:** P0 (core product)
> **Schema changes:** `contacts`, `deals`, `pipelines`, `stages`, `deal_stage_history`, `contact_timeline`, `contact_submissions`, `crm_sync_queue` + PostgreSQL RPCs

---

## Phase Overview

### Problem statement

Operators need a single admin CRM to track leads from first touch through closed deals, with a visual pipeline, contact enrichment, metrics dashboard, and automatic promotion when prospects book calls — without status downgrades when the same person enters via multiple channels.

### Goals (as shipped)

- Kanban pipeline for default `sales-pipeline` with ordered stages.
- Contact CRUD with tags, bulk operations, and timeline history.
- Deal CRUD with drag/move stage transitions and history audit.
- Hierarchy-safe contact upsert via PostgreSQL RPC.
- Cal.com booking webhook promotes to Meeting Booked + qualified status.
- Async retry queue for failed CRM sync operations.
- Dashboard metrics via RPC with TypeScript fallback.

### Scope

- Admin UI under `/admin/crm`
- REST API under `/api/crm/*`
- Cal.com webhook integration
- Seed script for default pipeline
- CRM metrics on admin dashboard

### Out of scope (not implemented)

- Multi-pipeline UI switching (schema supports pipelines; UI defaults to sales pipeline)
- Public marketing contact form in this template (submissions table exists for integration)

---

## User Stories (as shipped)

### US-1.1 — View pipeline

**As an** authenticated admin, **I can** open the CRM kanban **so that** I see deals grouped by stage with counts and drag targets.

**Acceptance:** Pipeline loads via `GET /api/crm/pipeline-deals`; stages match seeded order.

### US-1.2 — Move deal stage

**As an** admin, **I can** move a deal to another stage **so that** `deal_stage_history` records the transition and the board updates.

**Acceptance:** `PATCH /api/crm/deals/[id]/move` returns updated deal; history row created.

### US-1.3 — Manage contacts

**As an** admin, **I can** create/edit/delete contacts and bulk-tag **so that** outreach and newsletter data consolidate on one record.

**Acceptance:** Bulk tag uses `bulk_add_tags` RPC; bulk delete uses `bulk_delete_contacts`.

### US-1.4 — Booking upgrades deal

**As the** system, **when** Cal.com sends `BOOKING_CREATED` **I** upgrade contact to qualified and move deal to Meeting Booked **so that** sales knows a call is scheduled.

**Acceptance:** Webhook verifies HMAC; RPC `update_contact_and_deal_for_booking` runs; tests pass.

---

## Data Model (shipped)

| Table | Purpose |
|---|---|
| `pipelines` | Pipeline definitions |
| `stages` | Ordered stages per pipeline |
| `contacts` | CRM contacts + status hierarchy |
| `deals` | Deals linked to contacts + current stage |
| `deal_stage_history` | Stage change audit |
| `contact_pipeline_stages` | Junction metadata |
| `contact_timeline` | Human-readable activity feed |
| `contact_submissions` | Form submission + Cal booking linkage |
| `crm_sync_queue` | Retry queue for async CRM writes |

| RPC | Purpose |
|---|---|
| `upsert_contact_with_hierarchy_protection` | Safe upsert without downgrade |
| `update_contact_and_deal_for_booking` | Cal.com booking handler |
| `bulk_add_tags` / `bulk_delete_contacts` | Bulk contact ops |
| `get_crm_metrics` / `get_crm_dashboard_data` | Aggregations |

Full schema: [`knowledge-base/architecture/database-schema.md`](../../../knowledge-base/architecture/database-schema.md)

---

## API Surface (shipped)

| Method | Path |
|---|---|
| GET, POST | `/api/crm/contacts` |
| GET, PATCH, DELETE | `/api/crm/contacts/[id]` |
| POST | `/api/crm/contacts/bulk-update`, `bulk-delete` |
| GET, POST | `/api/crm/deals` |
| GET, PATCH, DELETE | `/api/crm/deals/[id]` |
| PATCH | `/api/crm/deals/[id]/move` |
| POST | `/api/crm/deals/bulk-update`, `bulk-delete` |
| GET | `/api/crm/pipeline-deals` |
| GET | `/api/crm/metrics` |
| GET | `/api/crm/activity` |
| POST | `/api/webhooks/cal` |
| GET | `/api/cron/process-crm-queue` |

Detail: [`knowledge-base/api/crm-api.md`](../../../knowledge-base/api/crm-api.md)

---

## File Map (existing)

| Path | Role |
|---|---|
| `app/admin/(dashboard)/crm/` | CRM pages |
| `components/crm/` | Kanban, sheets, tables |
| `app/api/crm/` | REST handlers |
| `app/api/webhooks/cal/route.ts` | Cal.com webhook |
| `app/api/cron/process-crm-queue/route.ts` | Queue drain |
| `lib/crm/contacts.ts` | Contact queries + bulk RPC |
| `lib/crm/deals.ts` | Deal queries |
| `lib/crm/metrics.ts` | Metrics RPC + fallback |
| `lib/crm/timeline.ts` | Timeline writer |
| `lib/crm-retry-queue.ts` | Async retry processor |
| `lib/outreach/crm/push-to-crm.ts` | Outreach → CRM (Contacted) |
| `scripts/seed-crm-pipeline.ts` | Default pipeline seed |
| `lib/db/schema.ts` | Table definitions |

---

## Locked Constraints

- Pipeline slug default: `sales-pipeline`
- Status hierarchy: subscriber < lead < qualified < customer
- Outreach replies → Contacted only; Cal.com → Meeting Booked only
- Cal webhook URL on grey-cloud `hooks.*` subdomain

See [`knowledge-base/guides/locked-business-rules.md`](../../../knowledge-base/guides/locked-business-rules.md)

---

## Test Coverage (existing)

| Test file | Covers |
|---|---|
| `lib/crm/__tests__/contacts.test.ts` | Contact CRUD, bulk RPC |
| `lib/crm/__tests__/deals.test.ts` | Deal operations |
| `app/api/crm/contacts/__tests__/route.test.ts` | Contacts API |
| `app/api/crm/deals/__tests__/route.test.ts` | Deals API |
| `app/api/crm/deals/[id]/move/__tests__/route.test.ts` | Stage moves |
| `app/api/webhooks/cal/__tests__/route.test.ts` | Booking webhook |
| `lib/outreach/crm/__tests__/push-to-crm.test.ts` | Outreach CRM push |
| `lib/__tests__/crm-retry-queue.test.ts` | Sync queue |

---

## Related docs

- [`knowledge-base/architecture/crm-pipeline.md`](../../../knowledge-base/architecture/crm-pipeline.md)
- [`knowledge-base/architecture/database-schema.md`](../../../knowledge-base/architecture/database-schema.md)

---

## Risks and Open Questions

- `get_crm_metrics` RPC failure falls back to slower TS queries — monitor in production.
- Multi-pipeline admin UX not built; schema ready if needed.
