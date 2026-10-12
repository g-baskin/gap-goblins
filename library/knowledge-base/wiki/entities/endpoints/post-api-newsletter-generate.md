---
type: entity
title: "POST /api/newsletter/generate"
entity_type: endpoint
status: developing
created: "2026-05-28"
updated: "2026-05-28"
path: "app/api/newsletter/generate/route.ts"
language: ts
depends_on:
  - "[[entities/functions/createNewsletterOrchestrator]]"
  - "[[entities/modules/newsletter-validations]]"
  - "[[entities/modules/newsletter-edition-length]]"
  - "[[entities/modules/db-client]]"
used_by:
  - "[[entities/components/GenerateNewsletterDialog]]"
last_commit_hash: "40438e4"
tested_by: []
tags:
  - entity
  - newsletter
  - endpoint
related: []
sources:
  - "app/api/newsletter/generate/route.ts"
partial_scan: true
---

# POST /api/newsletter/generate

## Overview

Next.js App Router route handler that triggers an AI-curated newsletter edition. Admin-only, rate-limited. Accepts optional `campaignId`, `topic`, `sources` (inline RSS list), and `length` preset. Orchestrates the full pipeline via `createNewsletterOrchestrator` and writes an audit log entry for every attempt. Modified this session to parse and forward `topic`, `sources`, and `length` from the request body.

## Signature / Definition

```
POST /api/newsletter/generate
Auth: session.user.role = "admin" | "super_admin"
Body: GenerateNewsletterRequest (generateNewsletterSchema)
Returns 201: { success, newsletterId, preview: {subject, html, articleCount}, metadata }
Returns 401/403/400/429/500 on error
```

## Behavior

**Auth** (`app/api/newsletter/generate/route.ts:37–53`): Validates session; rejects non-admin roles with 403.

**Rate limit** (`app/api/newsletter/generate/route.ts:56–83`): Keyed `newsletter-generate:{userId}`, constants from `lib/constants`. Returns 429 with `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers on breach.

**Validation** (`app/api/newsletter/generate/route.ts:86–89`): `parseBody` against `generateNewsletterSchema` — campaignId (uuid?), manual (bool), topic (str ≤500), sources (array 1–20), length (enum, default "medium").

**Campaign resolution** (`app/api/newsletter/generate/route.ts:107–137`): If `campaignId` provided, fetches from `newsletter_campaigns`; maps camelCase Drizzle result to snake_case `CampaignConfig` interface for the orchestrator.

**Pipeline** (`app/api/newsletter/generate/route.ts:146–159`): Constructs orchestrator and calls `generateNewsletter` with resolved `articleLimit = articleLimitForLength(length)`.

**Error classification** (`app/api/newsletter/generate/route.ts:213–220`): Maps known error substrings (`not_found_error`, `ANTHROPIC_API_KEY`, `No articles found`) to human-readable messages for the UI.

**Audit log** (`app/api/newsletter/generate/route.ts:170–188`): Writes `newsletter_generated` or `newsletter_generation_failed` action to `admin_audit_log`.

## Connections

- **depends_on:** [[entities/functions/createNewsletterOrchestrator]], [[entities/modules/newsletter-validations]], [[entities/modules/newsletter-edition-length]], [[entities/modules/db-client]]
- **used_by:** [[entities/components/GenerateNewsletterDialog]]

## History

- **Modified:** commit `40438e4` — added topic, sources, length forwarding (this session)

## Sources

- `app/api/newsletter/generate/route.ts` (lines 1–256)
