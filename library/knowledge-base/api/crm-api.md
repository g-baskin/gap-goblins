# CRM API

> Category: API | Version: 1.0 | Date: May 2026 | Status: Active

REST endpoints for contacts, deals, pipeline board, metrics, and activity timeline.

**Related:**
- [`architecture/crm-pipeline.md`](../architecture/crm-pipeline.md)
- [`lib/crm/`](../../../lib/crm/)

---

## Authentication

Session required (NextAuth). All handlers use `db` from `@/lib/db`.

---

## Contacts

| Method | Path | Purpose |
|---|---|---|
| GET, POST | `/api/crm/contacts` | List/create contacts |
| GET, PATCH, DELETE | `/api/crm/contacts/[id]` | Single contact CRUD |
| POST | `/api/crm/contacts/bulk-update` | Bulk field/tag updates (uses `bulk_add_tags` RPC) |
| POST | `/api/crm/contacts/bulk-delete` | Bulk delete (uses `bulk_delete_contacts` RPC) |

Implementation: `lib/crm/contacts.ts`  
Tests: `app/api/crm/contacts/__tests__/route.test.ts`, `lib/crm/__tests__/contacts.test.ts`

---

## Deals

| Method | Path | Purpose |
|---|---|---|
| GET, POST | `/api/crm/deals` | List/create deals |
| GET, PATCH, DELETE | `/api/crm/deals/[id]` | Single deal |
| PATCH | `/api/crm/deals/[id]/move` | Change pipeline stage |
| POST | `/api/crm/deals/bulk-update` | Bulk stage/owner updates |
| POST | `/api/crm/deals/bulk-delete` | Bulk delete |

Tests: `app/api/crm/deals/__tests__/route.test.ts`, `app/api/crm/deals/[id]/move/__tests__/route.test.ts`

---

## Pipeline

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/crm/pipeline-deals` | Kanban payload grouped by stage |

UI: `components/crm/`, `/admin/crm`

---

## Metrics & activity

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/crm/metrics` | KPI metrics (`get_crm_metrics` RPC + fallback) |
| GET | `/api/crm/activity` | Recent CRM activity feed |

Implementation: `lib/crm/metrics.ts`

---

## RPC usage

Bulk and upsert operations delegate to PostgreSQL functions — see [`architecture/database-schema.md`](../architecture/database-schema.md).

---

## Related docs

- [`requirements/features/feature-001-crm-pipeline/`](../../requirements/features/feature-001-crm-pipeline/)

---

## Changelog

- v1.0 (2026-05) — Initial CRM API reference.
