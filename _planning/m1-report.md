# Milestone 1 report: Scan → Score → CRM → Gap Report

Run date: 2026-10-11. Repo: https://github.com/g-baskin/gap-goblins (**PRIVATE**). Branch `feat/m1-scan-score-report` is pushed and not merged. `main` and `dev` = `71db5d3`.

## Commits

| Hash | Branch | Message |
| --- | --- | --- |
| `09baa3d` | main | chore: bootstrap Gap Goblins from online-crm-ai@eabca74 (fresh history) |
| `71db5d3` | main | chore: Gap Goblins identity, isolated ports/containers, SeaweedFS local S3, disable hosted CI |
| `c6274e1` | feat | feat(lead-finder): tenant-scoped schema, scoring rubric, lead sources, CRM upsert |
| `5bdc986` | feat | feat(lead-finder): tenant-scoped queries + Postgres integration tests (dedupe, re-scan idempotency, isolation, pipeline seed) |
| `d1f09b6` | feat | feat(lead-finder): gap report copy, HTML, Playwright PDF; lead-scan.run + lead-report.generate worker jobs; move playwright to dependencies |
| `356cce1` | feat | feat(lead-finder): tenant-checked API routes (scans, businesses, report preview/PDF, branding, logo) + route isolation tests |
| `c231fe4` | feat | feat(lead-finder): Lead Finder UI (sidebar, scan form + history, polling scan results, prospect detail with report preview/PDF, report branding settings) |
| `7ced379` | feat | feat(lead-finder): local e2e script + sample PDF, Phase 0 recon doc, dedupe worker queue list, PDF test timeout |
| (this file) | feat | docs: Milestone 1 report |

## Migrations added

- `lib/db/drizzle/0014_lead_finder.sql` (additive only: 5 `CREATE TABLE`, indexes, FKs; no drops, no changes to existing tables).
  - `lead_scans`, `lead_businesses`, `lead_scan_results`, `tenant_branding`, `lead_reports`.
  - All have `tenant_id uuid NOT NULL` → `tenants(id)` and tenant-leading indexes. There is a unique partial index on `(tenant_id, kgmid) where kgmid is not null`, indexes on `(tenant_id, place_id|cid|phone_e164|gbp_url)`, and composite `(tenant_id, id)` FKs from scan results to scans and businesses. A CHECK constraint keeps `lead_reports.storage_key` under `tenants/<tenant_id>/`. Business → contact/deal links use `ON DELETE SET NULL`, so existing CRM deletes still work.
  - Applied with `bun --env-file=.env.local run db:migrate` (15 migrations recorded).

## Files touched (vs bootstrap `09baa3d`; 57 files changed, excluding drizzle meta)

- **Phase 0 identity:** `package.json`, `.env.example`, `docker-compose.yml`, `docker/seaweedfs/s3.json`, `README.md`, `CLAUDE.md`, `HANDOFF.md`, `PROVENANCE.md`, `.gitignore`, `scripts/test-outreach-booking.ts`, `lib/automation/sender.ts` (3500 → 3510 in dev URLs), `.github/*` → `docs/reference/disabled-github-config/` (moved, plus a README).
- **Schema/queue/worker:** `lib/db/schema.ts`, `lib/db/drizzle/0014_lead_finder.sql`, `lib/queue/index.ts`, `scripts/worker.ts`, `lib/storage/worker.ts`, `bun.lock` (the playwright move only).
- **Domain:** `lib/lead-finder/{types,scoring-config,scoring,phone,csv,normalize,db,crm,queries,scan-runner,report-copy,report-html,report-pdf,report-service,image-validation}.ts`, `lib/lead-finder/sources/{fixture,csv-import,omkar-desktop,index}.ts`.
- **API (all tenant-checked):** `app/api/lead-finder/_lib.ts`, `scans/route.ts`, `scans/[scanId]/route.ts`, `sources/route.ts`, `businesses/[businessId]/route.ts`, `businesses/[businessId]/report/route.ts` (HTML preview), `businesses/[businessId]/reports/route.ts` (queue PDF), `reports/[reportId]/download/route.ts`, `branding/route.ts`, `branding/logo/route.ts`.
- **UI:** `components/shadcn/app-sidebar.tsx` (the "Lead Finder" entry), `components/lead-finder/{shared,LeadFinderHome,ScanDetail,ProspectDetail,BrandingSettings}.tsx`, `app/admin/(dashboard)/lead-finder/{page,branding/page,scans/[scanId]/page,prospects/[businessId]/page}.tsx`.
- **Tests:** `lib/lead-finder/__tests__/{scoring,csv-sources,report}.test.ts`, `__tests__/integration/{harness.ts,scan-crm.test.ts,routes-isolation.test.ts}`.
- **Docs/scripts:** `_planning/phase-0-recon.md`, `_planning/m1-report.md`, `_planning/samples/sample-gap-report.pdf`, `scripts/lead-finder-e2e.ts`.

## Gate results

Command, run once in order on `7ced379`: `bun run lint && bun run typecheck && bun run typecheck:worker && bun run test:run && bun run build` → **exit 0**.

| Step | Result |
| --- | --- |
| `bun run lint` | `biome check .`, 639 files checked, no errors |
| `bun run typecheck` | `tsc --noEmit`, clean |
| `bun run typecheck:worker` | `tsc --noEmit -p tsconfig.worker.json`, clean |
| `bun run test:run` | **110 files: 109 passed, 1 skipped; 1594 tests: 1582 passed, 12 skipped, 0 failed** |
| `bun run build` | Next build succeeded; all 13 `lead-finder` routes compiled |

- **Baseline (`71db5d3`, before Milestone 1):** lint, typecheck, worker typecheck and build passed. Tests: 105 files, 1491 passed, 12 skipped, **1 failed**. The failure was a pre-existing timing flake, `lib/newsletter/lib/resilience/__tests__/integration-examples.test.ts` "should rate limit OpenAI API by tokens", which passes 15/15 in isolation. It did not fail in the final run.
- The 12 skipped tests are pre-existing (`lib/newsletter/modules/sources/__tests__/integration.test.ts`, skipped in the baseline too).
- Milestone 1 adds 91 tests: 25 scoring, 39 CSV/sources/phone/omkar, 11 report/PDF, 9 DB integration, 6 route isolation, plus the build check. DB tests use a real Postgres (`gap_goblins_test` on 5442, created and migrated automatically). PDF tests launch real Chromium.

## Acceptance checklist

- [x] **Private repo, fresh history, main = bootstrap, feature branch pushed, online-crm-ai untouched.** `gh repo view` → `PRIVATE`. The history starts at `09baa3d` (no online-crm-ai history). `main` holds the bootstrap commit plus the separate identity commit the spec asked for. `feat/m1-scan-score-report` is at `7ced379`+ on origin. The online-crm-ai `git status --porcelain | shasum` was `eed55e2c155782f96f6fb99262a45d7c08f81f11` before and after (branch still `fix/automation-release-review`). Read only via `git archive` / `ls-tree`.
- [x] **Local gate passes.** Full gate exit 0 (above). The only baseline failure was the pre-existing flake.
- [x] **Fixture and csv-import scans: up to 50 scored prospects, weakest first; a re-run creates zero contacts/deals.**
  - Through the real worker and queue (`scripts/lead-finder-e2e.ts`, "plumbers" in "Fredericksburg VA"):
    - First run: found 60, skipped closed 3, scored 50, created 50, contacts 50, deals 50.
    - Re-run: created 0, updated 50, contacts 50, deals 50.
    - Results sorted by score descending (top: 100, 100, 100…).
  - Integration tests cover the same for fixture, plus the CSV path (an uploaded file drives the scan; niche and location are labels), dedupe order kgmid → place_id → cid → phone_e164 → gbp_url, and deal stages never moving backward.
- [x] **omkar-desktop clearly disabled with an UNVERIFIED note; never returns fake data.**
  - `fetch()` always throws `LeadSourceUnavailableError` with the UNVERIFIED message.
  - The health check reads `OMKAR_DESKTOP_API_URL` (no hardcoded port), uses GET only, and confirms a Botasaurus task list on `/tasks`, so a FastAPI 404 is rejected (tested).
  - Live check on this machine: nothing was listening on :8000 (app closed), and it reported "connection failed. Is the app open?". The UI shows the source as unavailable with that message.
  - No searches were run, per the owner.
- [x] **Each prospect is a tenant-scoped contact + deal in "Gap Goblins Prospects", linked to its scan, score and flags.** The pipeline and 7 stages are seeded idempotently (including concurrent calls, tested). `lead_businesses.contact_id/deal_id` link to the CRM. `lead_scan_results` holds the score, flags and rubric version per scan. Timeline entries read "Found by Gap Goblins scan: score N" and "Rescanned: score X → Y".
- [x] **HTML preview and Playwright PDF render with tenant branding, show only verified gaps, and pass the escaping test.**
  - Escaping: a `<script>` / `<img onerror>` / `<svg onload>` business name renders inert, and tenant branding text is escaped too.
  - Only TRUE flags get sections; unknown flags go under "Not checked".
  - CSP `default-src 'none'; img-src data:`; JavaScript disabled, `offline: true`, and every request aborted (tested: a remote image is blocked).
  - Letter size, 1–2 pages, including a very long business name (tested).
  - Sample: `_planning/samples/sample-gap-report.pdf`, generated by the worker from fixture data with demo branding: 2 pages, 127,609 bytes, stored at `tenants/<id>/lead-reports/...`.
- [x] **Cross-tenant isolation for all new surfaces.**
  - Query level: tenant B can't read or run tenant A's scans, businesses, results, reports or branding.
  - Route level, every route, with real membership resolution against Postgres:
    - Asking for tenant A in the header → 403 on all 8 surfaces.
    - Using tenant A's ids from tenant B → 404, and nothing is queued.
    - The logo/branding of each tenant stays separate.
  - The download route also re-checks the storage key prefix.
- [x] **Existing CRM, outreach and inbox features still build and their tests pass.** All 103 pre-existing test files pass and the build is green. The base schema and existing routes are unchanged (the only edits are the sidebar entry and two new queue names).

**Not verified by hand:** the Lead Finder pages were not clicked through in a logged-in browser this run. They compile and type-check, and every API they call is covered by the route tests, but nobody has looked at the UI yet.

## UNVERIFIED items

1. **omkar desktop task contract:** the `scraper_name` and input keys for Google Maps searches, the API result key casing, and the value formats (booleans, HOURS, OWNER, OWNER_POSTS). Live scanning stays disabled until someone copies the contract from the app's "API Integration" tab with the app open.
2. **omkar CSV/JSON value formats:** the parser accepts common boolean spellings and JSON or plain-text lists, and maps anything unrecognised to "unknown" (scores 0). It has not been tested against a real omkar export file. Please run one real export through CSV import.
3. **omkar terms** (below): no app licence, EULA or terms page found.

## omkar terms findings (reported, not decided)

- The GitHub repo is MIT (docs/code of the repo only). No licence or EULA was found for the desktop binary or its exported data, and `omkar.cloud/terms` returns 404.
- The product page says the tool is for "educational and research purposes only" and that users must comply with scraping and privacy laws.
- Pricing pages are inconsistent: a free tier of 200 searches/month and subscriptions, but also "one-time payment".
- Nothing found on resale, redistribution, or commercial / multi-tenant use. **Recommendation:** get written confirmation from omkar before tenants rely on omkar data in the paid product. Sources are in `_planning/phase-0-recon.md` §6–7.

## Production notes

- **Chromium for the worker:** PDFs render in the worker with Playwright Chromium. `Dockerfile.worker` was **not** changed (out of scope). Before deploying, add `bunx playwright install --with-deps chromium` (or use the `mcr.microsoft.com/playwright` base image) to the worker image. Without it, `lead-report.generate` jobs fail and retry twice. The web image does not need Chromium.
- **Storage:** reports go to `tenants/<tenant>/lead-reports/<business>/<uuid>.pdf`, imports to `tenants/<tenant>/lead-imports/`, logos to `tenants/<tenant>/branding/`, all in the existing `BUCKET_MEDIA_NAME` bucket. They are served only through tenant-checked routes (no public URLs). Local dev uses SeaweedFS because MinIO's free images were withdrawn in September 2026; production can use any S3-compatible store (unchanged env vars).
- **Env vars (new):**
  - `OMKAR_DESKTOP_API_URL`: empty disables the source; it is a local-desktop concept and stays empty in production.
  - `OMKAR_DESKTOP_TIMEOUT_MS`: default 10000.
  - `LEAD_SCAN_MAX_RESULTS_CAP`: default 200, hard cap 1000.
- **Unchanged:** `DATABASE_URL`, `BUCKET_*`, `AUTH_SECRET`.
- **Worker:** registers `lead-scan.run` (retry 1) and `lead-report.generate` (batch 1, retry 2). Run `bun --env-file=.env.local run worker`. Without `RESEND_API_KEY`, the inherited outreach tick logs an error every 5 minutes. That is pre-existing behaviour and doesn't affect Lead Finder.

## Top risks

1. **omkar licensing/terms** are unclear for a commercial multi-tenant SaaS. This blocks marketing omkar as a supported source.
2. **Prospect contacts have `email = ''`**: the base `contacts.email` column is NOT NULL, and Gap Goblins never discovers emails. Any inherited CRM or outreach code that assumes a real email must skip these contacts. Milestone 2 should either make the column nullable (additive migration) or filter on `source = 'gap-goblins'`.
3. **Chromium in production** (above). PDF generation silently queues and retries until the worker image has a browser.
4. **Base CRM tables keep a nullable `tenant_id`**: Lead Finder always sets it, but legacy rows and routes may not. The legacy `outreach_*` tables are not tenant-scoped at all.
5. **Fixture data looks real** (realistic names, 555 phone numbers). It is labelled "Sample data" in the source picker. Keep it out of production tenants or gate it behind a dev flag.

## Proposed Milestone 2 plan

1. **Connected-mailbox sending:** Gmail and Microsoft 365 OAuth per tenant, on separate outreach domains (never Resend). Encrypted tokens in a new tenant-scoped `mailbox_connections` table, daily send caps, warm-up limits, and per-mailbox health.
2. **Sequences:** tenant-scoped `outreach_sequences` / `steps` / `enrollments`, new and tenant-scoped rather than reusing the legacy `outreach_*` tables. Gap report link or attachment as step 1. Deterministic templates first, LLM copy only with owner approval. Advance deals Report Ready → Contacted → Replied by reading replies.
3. **Compliance:** CAN-SPAM physical address (from `tenant_branding`), a one-click unsubscribe link plus `List-Unsubscribe` headers, a tenant-wide suppression list checked before every send, bounce and complaint handling, and an email-source audit (omkar enrichment only).
4. **Legacy tenant-scoping gap:** plan an additive migration path for `outreach_*`, `site_settings`, `admin_settings` and `integration_credentials` (add a nullable `tenant_id`, backfill, then enforce), or formally retire them.
5. **`/api/v1` + API keys:** tenant-scoped API keys hashed at rest using `lib/auth/compare-api-keys.ts`, rate limits, and read endpoints for scans, prospects and reports first.
6. **Stripe:** plans and metering (scans/month, PDFs/month), with Checkout plus the customer portal and webhooks. Needs owner approval for the new dependency and service.
7. **Carry-overs from Milestone 1:** verify the omkar task contract with the app open and enable live scans behind a flag; test a real omkar export; add Chromium to `Dockerfile.worker`; do a browser click-through of the Lead Finder UI.

## Additions after this report (2026-10-12, owner-approved, outside Milestone 1 scope)

| Commit | What |
| --- | --- |
| `8791aab` | Fixes: report preview blocked by the frame CSP (now a sandboxed `srcdoc`), PDF polling stopping after one check, and phone or maps-link dedupe merging different businesses. |
| `65d899b` | Local pre-push guard for `main`, `.dockerignore` excludes every `.env*` except `.env.example`, removed the CRM's dead Export CSV and Add Deal buttons, type-checking back on in 6 test files. |
| `d4463d9` | Lead Finder territories and two-way Twilio SMS in the Conversations inbox. |

- **Territories** (ADR 0005): ZIP-code and drawn-area territories per workspace, Census ZIP outlines, scans that skip businesses outside a territory and mark unknowns "Not checked". Migration `0015_lead_territories` (additive). New dependencies `leaflet@1.9.4`, `@geoman-io/leaflet-geoman-free@2.20.2`, `@types/leaflet@1.9.22`, pinned. Code adapted from PawOs2 `b78f88e` (recorded in `PROVENANCE.md`).
- **SMS inbox** (ADR 0006, `COMPLIANCE.md`): the demo Conversations screen now uses the tenant-scoped conversation tables; each workspace connects its own Twilio number; incoming texts, replies and delivery updates work through the signed Twilio webhook; sends require recorded consent, respect 8pm–8am quiet hours, and honour STOP-type opt-outs. Migration `0016_conversation_inbox` (additive).
- **Browser walkthroughs done since the report:** territories editor, Lead Finder scan form and territory scan results, Conversations inbox, Settings → Messaging (screenshots taken locally, not committed).
- **Gate at `d4463d9`:** `bun run lint`, `bun run format:check`, `bun run typecheck`, `bun run typecheck:worker`, `bun run test:run` (1,675 passed, 12 skipped) and `bun run build:verify` all pass.
- **Not verified:** a real text through Twilio (needs the owner's account, A2P 10DLC registration and a public https URL); drawing a territory with the mouse.

## Completion

**Milestone 1 scope: 8 of 8 acceptance criteria met = 100%.** The omkar live-scan criterion is met by its "clearly disabled with an UNVERIFIED note" branch, not by a working live integration. The UI had no manual browser walkthrough when this report was written; parts of it have had one since (see the section above).
