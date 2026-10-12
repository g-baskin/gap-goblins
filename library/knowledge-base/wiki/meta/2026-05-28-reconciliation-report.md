---
type: meta
title: "2026-05-28 Wiki Reconciliation Report"
report_kind: reconciliation
date: 2026-05-28
created: "2026-05-28"
updated: "2026-05-28"
partial_scan: true
tags:
  - meta
  - reconciliation
---

# 2026-05-28 Wiki Reconciliation Report

> **Note:** `index.md`, `<type>/_index.md`, `log.md`, `hot.md`, and `.legion/file-hashes.json` were NOT touched. Global state reconciliation is delegated to the TS driver post-pass. `partial_scan: true`.

---

## 1a — Flat duplicates merged and deleted

Four function entity pages existed in two locations: `entities/<name>.md` (flat, created 2026-05-28, `status: developing`) and `entities/functions/<name>.md` (canonical, created 2026-05-27, `status: mature`). The `entities/functions/` version was the canonical target.

**Merge strategy:** canonical page (older, richer `depends_on`, correct `used_by` paths, mature status) retained as base. Unique content from the flat page (additional `related:` entries, payload code blocks, voice-rule detail, contact-routing numbered steps) merged in. Canonical `updated:` bumped to `2026-05-28`.

| Deleted flat path | Canonical `functions/` path | Unique content merged |
|---|---|---|
| `entities/pushToCrm.md` | `entities/functions/pushToCrm.md` | Added `[[concepts/crm-pipeline-stage-promotion]]` to related |
| `entities/handleEmailReceived.md` | `entities/functions/handleEmailReceived.md` | Added `[[concepts/outreach-reply-to-threading]]` to related; contact-routing numbered steps |
| `entities/enqueueOutreachSendEmail.md` | `entities/functions/enqueueOutreachSendEmail.md` | Added payload interface code block; `handleOutreachSendEmail` handler note in Connections |
| `entities/analyzeReply.md` | `entities/functions/analyzeReply.md` | Added Voice rules section with line citations (`reply-analyzer.ts:56-77`, `:71`) |

---

## 1b — Wikilink repair

Stale links pointing to deleted flat paths were replaced with canonical `functions/` paths across all surviving `.md` files. The flat pages themselves were deleted — no repair needed there.

**Total stale link instances repaired: 14**

| Stale link | Canonical replacement | Files repaired |
|---|---|---|
| `[[entities/pushToCrm]]` | `[[entities/functions/pushToCrm]]` | `questions/where-are-crm-postgres-rpcs-defined.md` (1 instance), `concepts/crm-pipeline-stage-promotion.md` (4 instances: frontmatter + 3 body), `entities/functions/upsert-contact-with-hierarchy-protection.md` (3 instances: frontmatter `used_by` + 2 body) |
| `[[entities/handleEmailReceived]]` | `[[entities/functions/handleEmailReceived]]` | `concepts/outreach-reply-to-threading.md` (3 instances: frontmatter + body examples + body connections), `entities/RESEND_API_KEY-env-var.md` (2 instances: frontmatter `used_by` + body connections), `entities/getThreadingHeaders.md` (1 instance: body) |
| `[[entities/enqueueOutreachSendEmail]]` | _(no stale links found)_ | — |
| `[[entities/analyzeReply]]` | _(only in flat pages — deleted)_ | — |

**Files with link repairs: 6** (initial scan missed `entities/functions/upsert-contact-with-hierarchy-protection.md`; caught in verification pass)

---

## 1c — Concept cross-link additions

Two concept pairs with overlapping content received bidirectional `related:` frontmatter entries and "See also" body notes. Neither page was deleted.

| Pair | Direction | Change made |
|---|---|---|
| `concepts/deal-stage-promotion-rules.md` (2026-05-27) | → newer | Added `[[concepts/crm-pipeline-stage-promotion]]` to `related:`; added "See also" note |
| `concepts/crm-pipeline-stage-promotion.md` (2026-05-28) | → older | Added `[[concepts/deal-stage-promotion-rules]]` to `related:`; added "See also" note |
| `concepts/cal-webhook-hooks-subdomain.md` (2026-05-27) | → newer | Added `[[concepts/cal-com-webhook-idempotency]]` to `related:`; added "See also" note |
| `concepts/cal-com-webhook-idempotency.md` (2026-05-28) | → older | Added `[[concepts/cal-webhook-hooks-subdomain]]` to `related:`; added "See also" note |

**Total concept cross-link additions: 4 frontmatter entries + 4 "See also" body notes = 8 changes across 4 files**

---

## Summary

| Action | Count |
|---|---|
| Canonical pages merged + updated | 4 |
| Flat duplicate pages deleted | 4 |
| Stale wikilink instances repaired | 14 |
| Files with link repairs | 6 |
| Concept cross-link frontmatter entries added | 4 |
| Concept "See also" notes added | 4 |
| Global state files touched | **0** |

`partial_scan: true` — TS driver must run a reconciliation pass to update `index.md`, `entities/_index.md`, `log.md`, `hot.md`, and `.legion/file-hashes.json`.
