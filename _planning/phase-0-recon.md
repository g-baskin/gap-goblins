# Phase 0 recon

Base: online-crm-ai@`eabca74` exported into this repo (commit `09baa3d`). Line numbers refer to the **base** files as of commit `71db5d3` (before Milestone 1), unless noted.

## 1. Tenancy and role model

- `tenants` table: `lib/db/schema.ts:1236`. `tenant_memberships` (`tenant_id`, `user_id`, `role` default `agent`, `status` default `active`): `lib/db/schema.ts:1269`.
- Admin roles live on `admin_users.role` (`lib/db/schema.ts:110`, default `admin`). API routes allow `admin` / `super_admin` only: `app/api/automation/_lib.ts:4-16`.
- Active-tenant resolution: `lib/tenancy/resolve-active-tenant.ts:39-72`. The user's active memberships are loaded. A requested tenant id must be one of them (`TENANT_FORBIDDEN` → 403). With no request and exactly one membership, that one is used; otherwise `TENANT_REQUIRED` (400). Errors are mapped to HTTP responses at `:74-78`.
- The request carries the tenant in the `x-tenant-id` header: `app/api/automation/_lib.ts:22`. Tenant-admin-only actions check `role in (owner, admin)`: `:23-25`.
- Pages list the user's tenants with `listAvailableTenants` (`resolve-active-tenant.ts:20`) and pass them to a client tenant picker: `app/admin/(dashboard)/automation/components/AutomationDashboard.tsx:19-47`.
- Composite tenant FK pattern (`unique (tenant_id, id)` plus `foreign key (tenant_id, x_id)`): for example `channel_accounts` (`lib/db/schema.ts:1349-1384`).

**How new tables resolve tenant:** every Lead Finder table has `tenant_id uuid NOT NULL REFERENCES tenants(id)`, with tenant-leading indexes and composite FKs where rows reference each other. Routes resolve the tenant with `resolveActiveTenant(userId, x-tenant-id | ?tenantId)` through `app/api/lead-finder/_lib.ts`. Every service function takes `tenantId` and filters on it. Feasible; no blocker.

**Not tenant-scoped (do not use for tenant data):** `outreach_*` (for example `outreach_campaigns`, `lib/db/schema.ts:909`, which has no `tenant_id`), `site_settings` (`:1190`), `admin_settings` (`:75`), `integration_credentials` (`:659`). Branding therefore lives in the new `tenant_branding` table.

## 2. Contacts, deals, pipelines and stages → business mapping

- `contacts`: `lib/db/schema.ts:470`. `tenant_id` is **nullable** in the base schema (`:474`); `email` is NOT NULL. Also `company`, `contact_status`, `source` and friends, `phone`, `website`, `location`, `industry` and `tags`.
- `contact_timeline`: `:453` (`tenant_id`, `contact_id`, `event_type`, `title`, `description`, `metadata`).
- `deals`: `:542` (`tenant_id` nullable `:546`, `contact_id` NOT NULL `:548`, `stage_id` NOT NULL `:559`, `status` `:560`, `source` NOT NULL).
- `deal_stage_history`: `:520`. `pipelines`: `:1135` (`tenant_id`, `slug`; no unique (tenant, slug)). `stages`: `:1152` (`pipeline_id`, `slug`, `display_order`, `is_terminal`, `is_positive`).

**Mapping (implemented in `lib/lead-finder/crm.ts`):**

| Business field | Contact | Deal |
| --- | --- | --- |
| name | `first_name`, `company` | `name` = business name |
| phone (E.164, else raw) | `phone` | |
| website / address / category | `website` / `location` / `industry` | |
| source email (omkar enrichment only) | `email` (else `""` because the column is NOT NULL) | |
| — | `contact_status = 'lead'`, `source = 'gap-goblins'`, `source_detail = 'lead_scan:<id>'`, `tags = ['gap-goblins']` | `status = 'open'`, stage New Lead in "Gap Goblins Prospects" |

The pipeline is seeded idempotently under a per-tenant advisory lock (needed because `pipelines` has no unique (tenant, slug)). `lead_businesses.contact_id` / `deal_id` link a business to its CRM rows. Score and flags live in `lead_scan_results`.

## 3. pg-boss job registration

- Queue names: `lib/queue/index.ts:22` (`QUEUE` const). Enqueue helpers call `boss.send(...)` (for example `:51`) after `getBoss()` (`lib/queue/client.ts`).
- The worker (`scripts/worker.ts`) creates every queue on boot (`:349-353`, since pg-boss v10+ requires that) and registers handlers with `boss.work(name, opts, retryableWorker(name, handler))` (`:358-366`). It uses `lib/db/worker.ts` (no `server-only`).
- Milestone 1 adds `lead-scan.run` and `lead-report.generate` to `QUEUE` and registers both in the worker. Report jobs use `batchSize: 1` because each one launches Chromium.

## 4. Storage

- `lib/storage/client.ts:6` creates an S3 client from `BUCKET_ENDPOINT`, `BUCKET_REGION`, `BUCKET_FORCE_PATH_STYLE` and `BUCKET_MEDIA_*`. `lib/storage/index.ts` provides `uploadFile` (`:7`), `downloadFile` (`:23`) and `deleteFile` (`:37`) on bucket `BUCKET_MEDIA_NAME` (default `media`). Both are `server-only`.
- Milestone 1 adds `lib/storage/worker.ts` (same env, no `server-only`) for the worker. Every new object lives under `tenants/<tenant_id>/...`. `lead_reports.storage_key` has a CHECK constraint enforcing that prefix.
- Local dev: MinIO's free images were withdrawn from Docker Hub and Quay in September 2026. With the owner's approval, the compose service `minio` now runs SeaweedFS (`chrislusf/seaweedfs:4.48`, Apache-2.0) on the same ports (9010/9011), with the same keys and bucket. An S3 round trip was verified.

## 5. CSV parsing capability

No CSV library in `package.json` (no papaparse or csv-parse). Milestone 1 ships a small tested RFC 4180 parser and writer in `lib/lead-finder/csv.ts`, with no new dependency. It enforces limits (5 MB / 5,000 rows) and formula-injection-safe re-export.

## 6. omkar local API contract (official sources)

Full notes: the goal research file, summarised here.

- The desktop app embeds the **Botasaurus Desktop API**. Its default base URL is `http://localhost:8000`, and the app developer can configure the port. Source: https://www.omkar.cloud/botasaurus/docs/botasaurus-desktop/botasaurus-desktop-api/adding-api
- Routes come from the official client source (Apache-2.0), https://github.com/omkarcloud/botasaurus/blob/master/js/botasaurus-desktop-api/src/index.ts:
  - `GET /`: health
  - `POST /tasks/create-task-async`: body `{data, scraper_name, enable_cache?}`
  - `GET /tasks/{id}`: status `pending|in_progress|completed|failed|aborted`
  - `GET /tasks?page&per_page`: `{count, total_pages, next, previous, results[]}`
  - `POST /tasks/{id}/results` (paginated) and `/download`
  - No auth by default.
- **UNVERIFIED:** the Google Maps scraper's `scraper_name` and its input keys (queries, max results, enrichment) appear only in the app's in-app "API Integration" tab, not in public docs. Also unverified: whether API result keys are UPPER_SNAKE (as in exports) or lower-case, and the value formats of booleans, HOURS, OWNER and OWNER_POSTS.
- Output fields follow https://github.com/omkarcloud/google-maps-scraper/blob/master/fields.md. KGMID is always present and unique; PLACE_ID can be missing. Emails come only from paid enrichment.
- **Decision (per the owner: health check only, no searches):** the `omkar-desktop` adapter reads `OMKAR_DESKTOP_API_URL` (never assumes :8000), runs only GET requests, and confirms identity with `GET /tasks` returning a Botasaurus task list, so FastAPI's `{"detail":"Not Found"}` is rejected. Its `fetch()` always throws an explicit UNVERIFIED error. It never starts a task and never returns data.
- On 2026-10-11, nothing was listening on :8000 (the app was closed), and the health check reported "connection failed. Is the app open?".

## 7. omkar terms relevant to a multi-tenant SaaS (reported, not decided)

- The repo is MIT (© Chetan Jain), https://github.com/omkarcloud/google-maps-scraper/blob/master/LICENSE. That covers the repo/docs. **No licence or EULA was found for the desktop app binary or its exported data.** The `omkar.cloud/terms` page returned 404 (UNVERIFIED).
- The product page says the tool is "for educational and research purposes only" and that users must comply with applicable scraping and privacy laws: https://www.omkar.cloud/tools/google-maps-extractor
- Pricing is inconsistent across official pages. One page lists Free (200 searches/month), Starter and Unlimited subscriptions, and also says "one-time payment". An older repo lists a one-time price.
- Nothing found on resale, redistribution, or commercial / multi-user / multi-tenant use. **The owner should get written confirmation from omkar** before tenants rely on omkar data in a commercial SaaS.

## 8. Baseline (before Milestone 1, commit `71db5d3`)

- `bun run lint` ✅, `bun run typecheck` ✅, `bun run typecheck:worker` ✅, `bun run build` ✅, migrations 0000–0013 apply ✅.
- `bun run test:run`: **1 pre-existing failure.** `lib/newsletter/lib/resilience/__tests__/integration-examples.test.ts`, "should rate limit OpenAI API by tokens" (`expected 3000000 < 3000000`), is a timing flake. The file passes 15/15 when run alone. Not caused by Milestone 1.

Phase 0 gate: tenancy supports tenant-scoped tables and the baseline build is green, so Milestone 1 proceeds.
