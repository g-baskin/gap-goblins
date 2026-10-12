---
type: meta
title: "2026-05-27 full repo scan report"
report_type: scan
date: 2026-05-27
partial_scan: true
pages_created_count: 42
pages_updated_count: 0
tags:
  - meta
  - scan-report
related: []
sources: []
---

# 2026-05-27 full repo scan report

## Scan parameters

| Field | Value |
|---|---|
| Mode | `scan-directory` (full repo, user confirmed) |
| `partial_scan` | **true** — TS driver must reconcile `index.md`, `_index.md`, `log.md`, `hot.md`, `.legion/file-hashes.json` |
| Invocation | Cursor escape hatch (wiki-guardian subagent) |
| Date | 2026-05-27 |

## Summary

Initial wiki population for template-crm: **42 atomic pages** created across entities, concepts, decisions, questions, comparisons. Priority targets (auth, db, queue/worker, outreach, webhooks, CRM core, theming) covered. No prior entity pages existed (greenfield). No contradictions detected (no prior_state).

## Pages created (42)

### Entities (27)

**Modules:** proxy, auth-config, auth, db-client, queue-index, worker-process, crm-contacts, theme-user-override, cloudflare-client

**Functions:** pushToCrm, handleEmailReceived, sendEmail, analyzeReply, enqueueOutreachSendEmail, applySkin, getStorageClient, uploadFile, writeTimelineEvent

**Queues:** outreach-send-email

**Cron:** outreach-process-cron

**Endpoints:** post-api-webhooks-cal, post-api-outreach-webhooks-resend

**Components:** EmailThread, ReplyComposer, SkinApplier, skin-picker

**Env vars:** DATABASE_URL, RESEND_WEBHOOK_SECRET

**Data models:** contacts-table

### Concepts (8) — all required minimum met

- outreach-reply-to-matching
- crm-status-hierarchy
- deal-stage-promotion-rules
- pg-boss-job-lifecycle
- resend-webhook-event-flow
- nextauth-proxy-split
- skin-preview-vs-applied
- cal-webhook-hooks-subdomain

### Decisions (3) — Tier-1 commits only

- pending-40438e4-biome-over-eslint
- pending-40438e4-middleware-to-proxy
- pending-aa1f2eb-switch-to-bun

### Questions (3)

- was-drizzle-adopted-over-supabase
- was-plain-mailbox-reply-to-an-adr
- was-grey-cloud-hooks-subdomain-an-adr

### Comparisons (1)

- drizzle-vs-supabase-client

## Pages updated

None (greenfield scan).

## ADRs not filed (by design)

| Candidate | Reason |
|---|---|
| drizzle-over-supabase-client | No Tier-1 commit message in scanned history → question page |
| plain-mailbox-reply-to | Documented in CLAUDE.md/code, no decision commit → question page |
| grey-cloud-cal-webhook | Documented in README/proxy, no decision commit → question + concept |

## Coverage gaps (for TS driver / follow-up scans)

1. **lib/db/schema.ts** — only `contacts` table modeled; deals, stages, outreach_* tables, admin_users, newsletter tables remain
2. **app/api/crm/** — 15 route files not individually filed as endpoints
3. **lib/crm/** — deals.ts, metrics.ts, timeline.ts, activity-feed.ts need entity pages
4. **lib/newsletter/** — pipeline jobs, enqueue functions beyond cross-reference in pg-boss concept
5. **app/api/admin/settings/route.ts** — referenced but no dedicated endpoint page
6. **Individual newsletter queue entities** — newsletter-send/curate/publish/cleanup queues named but not separate entity pages
7. **lib/outreach/** subtree — campaigns, contacts, scheduling, processor modules not individually filed
8. **Test files** — not extracted as entities (by scope preference)
9. **Git blame / History sections** — partial; only last_commit_hash + key commits cited
10. **Non-TS files** — SQL migrations, Dockerfiles, YAML get stub treatment in v2 only (not filed this pass)

## Contradictions

None — no prior wiki entity state to contradict.

## Next steps for TS driver

1. Reconcile global indexes and hash manifest
2. Allocate ADR numbers for `decisions/pending-*` files
3. Schedule chunk scans for gaps above (schema tables, CRM API routes, newsletter domain)
4. Reverse-lookup `used_by` edges from full-repo import graph
