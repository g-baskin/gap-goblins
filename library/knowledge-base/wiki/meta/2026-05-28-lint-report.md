---
type: meta
title: "Phase 4 Lint Report — 2026-05-28"
created: "2026-05-28"
updated: "2026-05-28"
status: developing
tags:
  - meta
  - lint
partial_scan: true
---

# Phase 4 Lint Report — 2026-05-28

**Mode:** lint  
**Scope:** Full wiki pass — `entities/`, `concepts/`, `questions/`, `decisions/`  
**Invocation:** Direct `@`-mention (escape hatch) — `partial_scan: true`  
**Checks run:** Frontmatter validation · Wikilink resolution · Pairing integrity · Stale flat endpoint · Endpoint coverage  
**NOT touched:** `index.md`, `_index.md` files, `log.md`, `hot.md`, `.legion/file-hashes.json`

---

## Summary Table

| Check | Result | Issue Count |
|---|---|---|
| 1. Frontmatter — missing required fields | ⚠️ WARN | 4 |
| 1. Frontmatter — unquoted YAML dates | ❌ ERROR | 418 occurrences, 209 files |
| 1. Frontmatter — invalid `status` value | ❌ ERROR | 3 |
| 1. Frontmatter — invalid `entity_type` value | ❌ ERROR | 1 |
| 1. Frontmatter — ADR `adr_number` format | ⚠️ WARN | 3 |
| 2. Broken wikilinks (in-chunk) | ⚠️ WARN | 248 |
| 3. Pairing integrity | ⚠️ WARN | 2 |
| 4. Stale flat endpoint at entities/ root | ❌ ERROR | 1 |
| 5. Endpoint coverage gap | ℹ️ INFO | +1 wiki page |

**Total issues: 680** (4 error categories, 4 warning categories, 1 info)

---

## 1. Frontmatter Validation

### 1a. Unquoted YAML Date Objects — CRITICAL

**418 occurrences across 209 files.** Fields `created:` and `updated:` are written as bare YAML dates (e.g., `created: 2026-05-28`) instead of quoted strings (`created: "2026-05-28"`). YAML parsers will deserialize these as `Date` objects, not strings, breaking downstream Zod/frontmatter consumers that expect strings.

This is a systemic authoring error present in virtually every file created in the current session. All pages created from the initial bulk scan inherit this pattern.

**Remediation:** A single `sed -i` or Python pass across `library/knowledge-base/wiki/**/*.md` can quote all unquoted ISO-date frontmatter values. **Do not auto-fix in this pass** — flag for a dedicated bulk-fix commit.

Representative examples:
```
entities/worker-pg-boss.md:              created: 2026-05-28  ← bare YAML Date
entities/AUTH_SECRET-env-var.md:         created: 2026-05-28
entities/admin-users-sql-table.md:       created: 2026-05-28
concepts/newsletter-double-opt-in-flow.md: created: 2026-05-28
... (209 files total)
```

---

### 1b. Missing `last_commit_hash` on Entity Pages

| Severity | Page | Missing Field |
|---|---|---|
| error | `entities/functions/formatDate.md` | `last_commit_hash` |

Only one entity page is missing the delta-tracking key. All other entity pages — including root-level SQL table and data-model pages — have the field present.

---

### 1c. Invalid `status` Values

| Severity | Page | Field | Got | Expected |
|---|---|---|---|---|
| error | `concepts/newsletter-double-opt-in-flow.md` | `status` | `active` | `seed \| developing \| mature \| evergreen \| stub` |
| error | `questions/where-is-syncNewsletterBranding-defined.md` | `status` | `resolved` | `seed \| developing \| mature \| evergreen \| stub` |
| error | `questions/where-are-crm-postgres-rpcs-defined.md` | `status` | `resolved` | `seed \| developing \| mature \| evergreen \| stub` |

`resolved` is not in the 5-value allowed set for entity/concept/question pages. `active` is similarly invalid for concept pages. The `resolved` questions are likely outdated; they should be moved to `evergreen` or archived.

---

### 1d. Invalid `entity_type` Value

| Severity | Page | Field | Got | Expected |
|---|---|---|---|---|
| error | `entities/pages/cloudflare-settings-page.md` | `entity_type` | `page` | one of the 13 allowed types |

`page` is not in the 13-type catalog. The correct type for a Next.js App Router page component is `react-component`. The `entities/pages/` subdirectory was created with a custom type not in the schema. All three pages-subdir files should be reviewed:
- `entities/pages/cloudflare-settings-page.md`
- `entities/pages/newsletter-subscribe-page.md`
- `entities/pages/subscribe-form-settings-page.md`

---

### 1e. ADR `adr_number` Format

| Severity | Page | Field | Got | Expected |
|---|---|---|---|---|
| warning | `decisions/pending-40438e4-biome-over-eslint.md` | `adr_number` | `pending` | `"<pending>"` or 4-digit string |
| warning | `decisions/pending-40438e4-middleware-to-proxy.md` | `adr_number` | `pending` | `"<pending>"` |
| warning | `decisions/pending-aa1f2eb-switch-to-bun.md` | `adr_number` | `pending` | `"<pending>"` |

The spec requires the literal string `<pending>` (with angle brackets) as a sentinel that the TS driver can match when allocating real ADR numbers in the post-pass. Bare `pending` will not be recognized. Low-severity but blocks driver allocation.

---

## 2. Broken Wikilinks (In-Chunk)

**248 broken wikilinks** were detected. All are flagged as `warning` severity (`unresolved-in-chunk`) — the driver's global pass may resolve some if the target is in the vault but not in this chunk's visible scope. However, given the pattern analysis below, the vast majority are genuinely missing targets.

### Breakdown by Root Cause

| Category | Count | Description |
|---|---|---|
| `lib-module-not-extracted` | 160 | Links to `lib-*` module pages not yet extracted |
| `other-missing-entity` | 71 | Functions/data-models not yet scanned |
| `env-var-slug-mismatch` | 14 | Env-var slug format inconsistency |
| `old-flat-endpoint-prefix` | 3 | Legacy flat endpoint names (POST-/GET-) |

### Env-Var Slug Mismatch — 14 links

The env-var namespace is split across two locations causing link failures:
- **Root level:** `entities/AUTH_SECRET-env-var.md`, `entities/CAL_WEBHOOK_SECRET-env-var.md`, etc. (old naming)
- **Subdir:** `entities/env-vars/DATABASE_URL.md`, `entities/env-vars/RESEND_WEBHOOK_SECRET.md`, etc. (new naming)

Links reference slugs that exist in one location but not the other:

| File | Line | Broken Link | Issue |
|---|---|---|---|
| `entities/endpoints/get-api-newsletter-health.md` | 16 | `[[entities/RESEND_API_KEY]]` | slug `RESEND_API_KEY` not found; exists as `RESEND_API_KEY-env-var` |
| `entities/endpoints/get-api-newsletter-health.md` | 17 | `[[entities/NEWSLETTER_FROM_EMAIL]]` | not extracted yet |
| `entities/endpoints/get-api-newsletter-health.md` | 18 | `[[entities/NEXT_PUBLIC_SITE_URL]]` | not extracted yet |
| `entities/endpoints/get-api-cron-newsletter-schedule.md` | 20 | `[[entities/CRON_SECRET]]` | not extracted yet |
| `entities/endpoints/post-api-webhooks-cal.md` | 16 | `[[entities/env-vars/CAL_WEBHOOK_SECRET]]` | only exists as `entities/CAL_WEBHOOK_SECRET-env-var.md` at root |
| `entities/endpoints/get-api-newsletter-queue-stats.md` | 19 | `[[entities/NEWSLETTER_API_KEY]]` | not extracted yet |
| `entities/endpoints/get-api-newsletter-stats.md` | 20 | `[[entities/NEWSLETTER_API_KEY]]` | not extracted yet |
| `entities/endpoints/post-api-newsletter-curate.md` | 18 | `[[entities/NEWSLETTER_API_KEY]]` | not extracted yet |
| `entities/endpoints/post-api-newsletter-send.md` | 19 | `[[entities/NEWSLETTER_API_KEY]]` | not extracted yet |
| `entities/endpoints/get-api-cron-process-crm-queue.md` | 20 | `[[entities/CRON_SECRET]]` | not extracted yet |
| `entities/endpoints/api-newsletter-jobs-id.md` | 20 | `[[entities/NEWSLETTER_API_KEY]]` | not extracted yet |
| `entities/endpoints/post-api-newsletter-send-test.md` | 18 | `[[entities/RESEND_API_KEY]]` | slug mismatch (`RESEND_API_KEY-env-var`) |
| `entities/endpoints/post-api-newsletter-send-test.md` | 19 | `[[entities/NEWSLETTER_FROM_EMAIL]]` | not extracted yet |
| `entities/modules/auth-config.md` | 11 | `[[entities/env-vars/AUTH_SECRET]]` | only exists at root as `AUTH_SECRET-env-var.md` |

**Structural note:** `DATABASE_URL` exists in BOTH `entities/DATABASE_URL-env-var.md` (root) and `entities/env-vars/DATABASE_URL.md` (subdir) — this is a duplication that should be resolved during a follow-up env-var migration pass.

### Old Flat Endpoint Prefix — 3 links

| File | Line | Broken Link |
|---|---|---|
| `entities/auth-module.md` | 15 | `[[entities/POST-api-newsletter-settings]]` |
| `entities/adminUsers-data-model.md` | 50 | `[[entities/POST-api-admin-invitations-accept]]` |
| `entities/admin-users-sql-table.md` | 23 | `[[entities/POST-api-admin-invitations-accept]]` |

These reference the pre-reorganization flat endpoint naming style. The pages now live in `entities/endpoints/` with the pattern `api-admin-invitations.md` (multi-method combined) or `post-api-admin-invitations-accept.md` (method-specific). Update the wikilinks to use the correct current slugs.

### Lib-Module and Other Missing Entities — 231 links

160 links target `lib-*` module pages (e.g., `[[entities/lib-auth]]`, `[[entities/lib-db]]`, `[[entities/lib-outreach-sending-sender]]`). These modules have not yet been extracted into the wiki — they represent coverage gaps. 71 additional links target functions and data-models similarly not yet scanned (e.g., `[[entities/newsletterEditions]]`, `[[entities/downloadFile]]`, `[[entities/adminAuditLog]]`).

These are `gap` entries for the response payload — not errors in existing pages, but missing extraction targets.

---

## 3. Pairing Integrity

### 3a. Queue ↔ Handler Pairing — `outreach-send-email`

**Issue: Path mismatch on handler reference.**

| Entity | Page | Declares | Target Exists? |
|---|---|---|---|
| queue | `entities/queues/outreach-send-email.md` | `triggers: [[entities/functions/handleOutreachSendEmail]]` | Slug resolves via `entities/handleOutreachSendEmail.md` (root level), but path points to non-existent `entities/functions/handleOutreachSendEmail.md` |
| handler | `entities/handleOutreachSendEmail.md` | `used_by: [[entities/worker-pg-boss]]` | Does NOT backlink to the queue entity |

The queue entity declares the handler as its trigger, but the handler (`handleOutreachSendEmail`) lives at the entity root, not in `entities/functions/`. The backlink is also missing — the handler lists `worker-pg-boss` as its consumer but not the `outreach-send-email` queue.

**Resolution needed:**
1. Either move `entities/handleOutreachSendEmail.md` → `entities/functions/handleOutreachSendEmail.md` to match the declared path, OR update the queue's `triggers:` wikilink to `[[entities/handleOutreachSendEmail]]`
2. Add `[[entities/queues/outreach-send-email]]` to `handleOutreachSendEmail.md`'s `used_by:` field

### 3b. SQL Table ↔ Data-Model Pairing — PASS (with note)

| SQL Table | Data-Model Link | Reverse Link Present? |
|---|---|---|
| `entities/admin-users-sql-table.md` | `data_model: [[entities/adminUsers-data-model]]` ✓ | Not verified in this scan |
| `entities/webhook-event-dedup-sql-table.md` | `data_model: [[entities/webhookEventDedup-data-model]]` ✓ | Not verified in this scan |

Both SQL table pages declare their data-model counterparts. The data-model pages exist and slugs resolve. However, the reverse `sql_table:` backlink on data-model pages was not verified in this scan — flag for driver global pass.

---

## 4. Stale Flat Endpoint at entities/ Root

**1 stale flat endpoint file found:**

| File | Issue |
|---|---|
| `entities/GET-POST-DELETE-api-outreach-blocklist.md` | File name starts with `GET-POST-DELETE-`, matches the stale flat-endpoint pattern; should live in `entities/endpoints/api-outreach-blocklist.md` |

A canonical page already exists at `entities/endpoints/api-outreach-blocklist.md`. This root-level page is a duplicate/stale artifact from the pre-reorganization era and should be deleted.

---

## 5. Endpoint Coverage

| Metric | Count |
|---|---|
| Actual `route.ts` files in `app/api/` | **92** |
| `.md` pages in `entities/endpoints/` | **93** |
| Gap | **+1 wiki page** (excess) |

The wiki has one more endpoint page than actual routes. The extra page is:
- `entities/endpoints/post-api-admin-subscribers.md` — this covers the `POST` method for `admin/subscribers`, but the canonical multi-method page `entities/endpoints/api-admin-subscribers.md` already covers the same route.

This is a duplication, not a missing-coverage gap. No routes are undocumented. The excess page should be merged into or deleted in favour of the multi-method combined page.

---

## Gaps (Entity Extraction Queue)

The following entity types have NOT been extracted yet and generate the bulk of broken wikilinks. These are `gap` entries — no page authoring errors, just missing coverage:

| Gap Category | Example Slugs | Approx. Count |
|---|---|---|
| Lib modules | `lib-auth`, `lib-db`, `lib-outreach-sending-sender`, `lib-encryption`, `lib-rate-limit`, `lib-storage`, `lib-crm-metrics`, `lib-outreach-blocklist`, `lib-outreach-ai-reply-analyzer` | ~30 modules |
| Drizzle data-model entities | `newsletterEditions`, `newsletterCampaigns`, `newsletterSubscribers`, `adminAuditLog` | ~10 |
| Functions | `downloadFile`, `triggerPublishWorkflow`, `checkRateLimit`, `compareBearerToken`, `getQueueHealth`, `getRecentWorkflowRuns`, `compareApiKeys`, `triggerSendWorkflow` | ~15 |
| Env-vars (not yet extracted) | `NEWSLETTER_FROM_EMAIL`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`, `NEWSLETTER_API_KEY` | ~6 |

---

## Critical Items Requiring Follow-Up Fix

Ordered by priority:

1. **[CRITICAL] Bulk-quote unquoted YAML dates** — 209 files, 418 occurrences. Single automated pass. Do not merge to main until fixed.
2. **[ERROR] Fix invalid `entity_type: page`** in `entities/pages/cloudflare-settings-page.md` (and sibling pages) — change to `react-component`.
3. **[ERROR] Fix invalid `status` values** — `resolved` → `evergreen` (or archive the question pages); `active` → `developing` or `mature` on concept page.
4. **[ERROR] Delete or move** `entities/GET-POST-DELETE-api-outreach-blocklist.md` — stale duplicate of `entities/endpoints/api-outreach-blocklist.md`.
5. **[WARN] Fix queue ↔ handler pairing** — resolve path mismatch for `handleOutreachSendEmail` and add reverse `used_by` link.
6. **[WARN] Fix ADR `adr_number`** from bare `pending` to `"<pending>"` in all 3 decision pages.
7. **[WARN] Add `last_commit_hash`** to `entities/functions/formatDate.md`.
8. **[WARN] Fix env-var slug inconsistency** — decide on one canonical naming convention (root with `-env-var` suffix OR `entities/env-vars/` subdir) and migrate all pages + links to it. Delete the `DATABASE_URL` duplicate.
9. **[WARN] Fix 3 old flat-endpoint wikilinks** in `auth-module.md`, `adminUsers-data-model.md`, `admin-users-sql-table.md`.
10. **[INFO] Resolve endpoint duplication** — delete or merge `post-api-admin-subscribers.md`.

---

## Structured Response Payload

```json
{
  "pages_created": 1,
  "pages_updated": 0,
  "decisions_filed": 0,
  "contradictions_flagged": 0,
  "meta_reports_written": ["meta/2026-05-28-lint-report.md"],
  "notification_flags": [],
  "entities_detected": [],
  "gaps": [
    {"entity": "lib-auth", "referenced_in": "entities/endpoints/get-api-crm-metrics.md:19", "reason": "module not yet extracted"},
    {"entity": "lib-db", "referenced_in": "entities/endpoints/get-api-health.md:19", "reason": "module not yet extracted"},
    {"entity": "newsletterEditions", "referenced_in": "entities/endpoints/api-newsletter.md:16", "reason": "data-model not yet extracted"},
    {"entity": "downloadFile", "referenced_in": "entities/endpoints/get-api-media-avatars-filename.md:16", "reason": "function not yet extracted"}
  ],
  "lint_findings": [
    {"severity": "error", "category": "frontmatter", "page": "entities/functions/formatDate.md", "details": {"field": "last_commit_hash", "expected": "string", "got": "missing"}},
    {"severity": "error", "category": "frontmatter", "page": "concepts/newsletter-double-opt-in-flow.md", "details": {"field": "status", "expected": "seed|developing|mature|evergreen|stub", "got": "active"}},
    {"severity": "error", "category": "frontmatter", "page": "questions/where-is-syncNewsletterBranding-defined.md", "details": {"field": "status", "expected": "seed|developing|mature|evergreen|stub", "got": "resolved"}},
    {"severity": "error", "category": "frontmatter", "page": "questions/where-are-crm-postgres-rpcs-defined.md", "details": {"field": "status", "expected": "seed|developing|mature|evergreen|stub", "got": "resolved"}},
    {"severity": "error", "category": "frontmatter", "page": "entities/pages/cloudflare-settings-page.md", "details": {"field": "entity_type", "expected": "one of 13 catalog values", "got": "page"}},
    {"severity": "error", "category": "frontmatter", "page": "ALL 209 FILES", "details": {"field": "created/updated", "expected": "quoted YAML string", "got": "YAML Date object", "count": 418}},
    {"severity": "warning", "category": "adr-integrity", "page": "decisions/pending-40438e4-biome-over-eslint.md", "details": {"field": "adr_number", "got": "pending", "expected": "<pending>"}},
    {"severity": "warning", "category": "adr-integrity", "page": "decisions/pending-40438e4-middleware-to-proxy.md", "details": {"field": "adr_number", "got": "pending", "expected": "<pending>"}},
    {"severity": "warning", "category": "adr-integrity", "page": "decisions/pending-aa1f2eb-switch-to-bun.md", "details": {"field": "adr_number", "got": "pending", "expected": "<pending>"}},
    {"severity": "warning", "category": "pairing", "page": "entities/queues/outreach-send-email.md", "details": {"declared_pair": "[[entities/functions/handleOutreachSendEmail]]", "missing_side": "handler at entities/functions/ path does not exist; file is at entities/handleOutreachSendEmail.md"}},
    {"severity": "warning", "category": "pairing", "page": "entities/handleOutreachSendEmail.md", "details": {"declared_pair": "queue outreach-send-email", "missing_side": "used_by does not reference the queue entity"}},
    {"severity": "error", "category": "frontmatter", "page": "entities/GET-POST-DELETE-api-outreach-blocklist.md", "details": {"issue": "stale flat endpoint at entities/ root; duplicate of entities/endpoints/api-outreach-blocklist.md"}}
  ],
  "partial_scan": true
}
```
