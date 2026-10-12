You are building Gap Goblins: "They find the gaps. You get the bag." It is a local-business lead finder with gap reports, and it is product #4 of the owner's four-product ecosystem. This run covers Phase 0 (repo bootstrap + recon) and Milestone 1 (Scan → Score → CRM → Gap Report). It does NOT include outreach sending, the public API, or billing.

READ FIRST
- Original brief (background only; where it conflicts with this prompt, this prompt wins): /Users/dellcbyerllc/projects/gap-goblins/_planning/00-original-brief.md
- Target folder: /Users/dellcbyerllc/projects/gap-goblins (it contains only _planning/; keep that folder and commit it)

OWNER DECISIONS (final, do not re-litigate)
1. Repo: new PRIVATE GitHub repo g-baskin/gap-goblins, created from g-baskin/online-crm-ai at origin/dev commit eabca74 ("fix: close automation release review gaps"), with FRESH git history. online-crm-ai must stay untouched.
2. Lead source: a pluggable LeadSource adapter interface. Milestone 1 adapters: `fixture` (tests/dev), `csv-import` (omkarcloud Google Maps Extractor CSV/JSON exports and generic CSV), and `omkar-desktop` (the omkarcloud desktop app's built-in local API, called with fetch). No direct Google Maps scraping in this milestone.
3. Prospect outreach (Milestone 2, NOT now) will send through the tenant's connected Gmail/Microsoft 365 mailboxes on separate outreach domains. Resend is for system/transactional email only and must NEVER send prospect outreach, because Resend's Acceptable Use Policy prohibits cold outreach and scraped contact data.
4. Gap report PDF engine: Playwright `page.pdf()` (Playwright ^1.60 is already in the repo). You may move `playwright` from devDependencies to dependencies; that counts as approved. Do NOT change Dockerfiles or install Chromium into images in this milestone; note the production requirement in the report instead.

HARD RULES
- Do not modify /Users/dellcbyerllc/projects/online-crm-ai in any way: no checkout, stash, reset, commit, branch, or file edits. Its working tree has uncommitted changes on fix/automation-release-review. Read from it only via `git -C ... show/ls-tree/archive <sha>`. Capture `git -C /Users/dellcbyerllc/projects/online-crm-ai status --porcelain | shasum` before and after the run and prove they are identical.
- Licenses: copying is allowed only from online-crm-ai (owner's code), g-baskin/Legend-Copy-AI (MIT), omkarcloud/google-maps-scraper (MIT, docs only), hitb1099/outreach-os, quionie/outreach-ai, AbdelftahZowail/Quickly (MIT). pypesdev/coldflow is GPL-3.0: never copy or closely paraphrase it. Do not touch LegendCopy or voice-agent-template (AGPL).
- Ask before: any NEW npm dependency (other than the playwright move above), any new external/paid service, any Dockerfile/deploy change, deleting existing features, force-pushing, or making anything public.
- Never commit secrets. Follow the existing .env.example pattern. Never send email of any kind to prospects in this milestone.
- Match existing code style, Drizzle schema patterns, NextAuth v5, shadcn/ui, Biome. Do not add a second ORM, auth system, UI kit, or queue.
- Small commits; each one must pass lint and typecheck.
- No fake functionality: if something cannot be verified (for example, the omkar local API contract), leave it disabled with an explicit error and mark it UNVERIFIED. Never fabricate results.

VERIFIED FACTS ABOUT THE BASE (origin/dev @ eabca74; re-verify, do not trust blindly)
- Tenancy: `tenants` + `tenant_memberships` (role is text, default "agent"); helpers in lib/tenancy/resolve-active-tenant.ts and lib/conversations/domain.ts (requireTenantContext).
- Tenant-scoped already: contacts, deals, pipelines, stages, contact_timeline, omnichannel/automation tables.
- NOT tenant-scoped: legacy outreach_* tables (campaigns, contacts, sender_accounts, blocklist, replies, events), site_settings, admin_settings, integration_credentials. Do not use site_settings for tenant branding, and do not use outreach_* in this milestone.
- pg-boss ^12 with worker at scripts/worker.ts (`bun run worker`); S3-compatible storage in lib/storage (MinIO in docker-compose); API-key helper at lib/auth/compare-api-keys.ts (Milestone 2); no Stripe dependency; Playwright is present but unused in app/ and lib/.
- Sidebar navigation: components/shadcn/app-sidebar.tsx.
- online-crm-ai dev uses port 3500. On this machine, ports 5432 and 9000 are already taken, and the compose containers are named app-postgres/app-minio (collision risk).
- omkar desktop app: Google Maps Extractor v4.263.0 is installed at /Applications (notarized; bundle cloud.omkar.googlemapsextractor). Its API binds *:8000, but a Docker uvicorn service ("fastapi-click-api") already holds 127.0.0.1:8000, so http://localhost:8000 reaches the WRONG service. Never hardcode 8000; read OMKAR_DESKTOP_API_URL, and in the adapter health check verify the response is actually omkar's API (not fastapi-click-api) before treating the source as available.
- omkar data fields (fields.md): KGMID is guaranteed unique and non-null (PLACE_ID can be missing), plus CID, LINK, NAME, DESCRIPTION, MAIN_CATEGORY, WEBSITE, PHONE, ADDRESS, RATING, REVIEWS, OWNER, OWNER_POSTS, CAN_CLAIM, IS_SPENDING_ON_ADS, IS_PERMANENTLY_CLOSED, IS_TEMPORARILY_CLOSED, IMAGE_COUNT, HOURS. Email only comes via their paid/credit enrichment. Free tier is 200 searches/month; the desktop app exposes a local API (npm package botasaurus-desktop-api; do NOT add it, use fetch).

========================================
PHASE 0: BOOTSTRAP + RECON
========================================
1. Verify eabca74 exists locally (`git -C .../online-crm-ai cat-file -t eabca74`). If not, clone g-baskin/online-crm-ai fresh into a /tmp directory and use that instead. Export with `git archive eabca74 | tar -x -C /Users/dellcbyerllc/projects/gap-goblins`. Tracked files only; confirm no .env* secrets came across (grep for keys and tokens).
2. `git init -b main`. Add PROVENANCE.md (source repo, commit eabca74, date, license notes, list of reference repos and their licenses).
3. Identity and isolation changes (separate commit after the bootstrap commit):
   - package.json name → "gap-goblins"; dev port → 3510.
   - docker-compose: containers gap-goblins-postgres / gap-goblins-minio; host ports postgres 5442, minio 9010/9011 (verify they are free); database gap_goblins. Update .env.example to match.
   - README, CLAUDE.md, HANDOFF.md: Gap Goblins identity, local setup, and how it relates to online-crm-ai.
   - CI: the owner does not pay for hosted CI. Move .github/workflows/* and .github/dependabot.yml into docs/reference/disabled-github-config/ (do not delete). Document the local gate: `bun run lint && bun run typecheck && bun run typecheck:worker && bun run test:run && bun run build`.
4. Baseline: `bun install`, start compose, run migrations, then run the local gate. Record pre-existing failures BEFORE your changes so they are not blamed on Milestone 1.
5. Create the private repo: `gh repo create g-baskin/gap-goblins --private --source . --remote origin`, push main, create branch `dev` from main, then work Milestone 1 on `feat/m1-scan-score-report`. Push the feature branch. Do not merge to main.
6. Write _planning/phase-0-recon.md with file:line evidence for: tenancy/role model and how new tables should resolve tenant; contacts/deals/pipelines/stages columns and the mapping of a business into a contact + deal; pg-boss job registration pattern; storage client usage; CSV parsing capability already in deps (if none, write a small tested parser or ask before adding one); the omkar local API contract from official docs (cite URLs; UNVERIFIED if unclear); and any omkar terms affecting use behind a multi-tenant SaaS (report it; do not decide).
7. Continue into Milestone 1 automatically, UNLESS the baseline build is broken in a way you cannot isolate, or tenancy cannot support tenant-scoped new tables. In that case stop and report.

========================================
MILESTONE 1: SCAN → SCORE → CRM → GAP REPORT
========================================
Data model (Drizzle, additive migrations only; every table has tenant_id NOT NULL with FK and tenant-leading indexes):
- lead_scans: niche, location, max_results (default 50, cap from config), source, status (queued|running|completed|failed|cancelled), counters (found, processed, created, updated, skipped_closed, errors), error_message, created_by, started_at, completed_at, timestamps.
- lead_businesses: kgmid, place_id, cid, name, main_category, address, phone_raw, phone_e164, website, gbp_url, rating, review_count, image_count, can_claim (nullable boolean), has_description, has_hours, owner_posts_count, is_permanently_closed, is_temporarily_closed, email (nullable, only if the source provides it), raw_payload jsonb (size-capped), contact_id, deal_id, first_seen_scan_id, last_seen_scan_id, timestamps. Unique (tenant_id, kgmid) where kgmid is not null; indexes on (tenant_id, place_id), (tenant_id, cid), (tenant_id, phone_e164).
- lead_scan_results: scan_id, business_id, score, flags jsonb, rubric_version, created_at; unique (scan_id, business_id).
- tenant_branding: one row per tenant: company_name, logo_storage_key, primary_color, accent_color, cta_headline, cta_body, cta_url, contact_email, contact_phone, website, physical_address.
- lead_reports: business_id, scan_result_id, storage_key, rubric_version, generated_by, generated_at.

Features (in order, each one tested):
1. LeadSource adapters behind one interface returning a normalized business record. fixture: deterministic sample data. csv-import: upload with column mapping preset for omkar exports; 5 MB / 5,000 row limits; reject formula-injection cells when re-exporting. omkar-desktop: env OMKAR_DESKTOP_API_URL plus timeout; fetch only; clear "source unavailable" error if unreachable; no fake results.
2. Lead Finder section in the sidebar: scan form (niche, location, max results, source) and scan history. CSV scans use the uploaded file; niche/location become labels.
3. Scan job on the existing pg-boss queue (`lead-scan.run`): fetch → normalize → dedupe → score → upsert CRM. Progress is written to lead_scans, and the scan page polls every 2s (no websockets). Exclude permanently closed businesses by default and count them as skipped.
4. Scoring in lib/lead-finder/scoring.ts. Constants and RUBRIC_VERSION live in lib/lead-finder/scoring-config.ts. Max 100. Each flag is true, false, or "unknown" (source lacked the field; scores 0 and shows "Not checked"):
   - gbp_unclaimed: CAN_CLAIM is true → +40
   - gbp_thin: claimed, but no description AND no hours AND no owner posts → +40 (mutually exclusive with gbp_unclaimed; the +40 is awarded at most once)
   - no_website → +25
   - few_reviews: fewer than 20 → +15
   - low_rating: rating below 4.0 AND at least 1 review → +10
   - few_photos: IMAGE_COUNT below 10 → +10
   Results list sorts weakest first (highest score), with gap badges.
5. CRM upsert: idempotently seed a per-tenant "Gap Goblins Prospects" pipeline (stages: New Lead, Report Ready, Contacted, Replied, Meeting Booked, Won, Lost) using the existing pipeline/stage schema. Each business maps to one tenant-scoped contact + one deal. Dedupe per tenant in this order: kgmid → place_id → cid → phone_e164 → gbp_url. Re-scans update business fields, add a new scan_result, add a contact_timeline entry ("Rescanned: score X → Y"), never duplicate contacts/deals, and never move a deal's stage backward. Normalize US phones to E.164 without new dependencies.
6. Report branding settings page (tenant-scoped): fields from tenant_branding; logo upload to lib/storage, PNG/JPEG/WebP only (no SVG), ≤1 MB, type checked by magic bytes.
7. Gap report:
   - HTML report route/component (also used as the in-app preview) and PDF via Playwright in the worker.
   - Content: tenant branding header; business name; score with a visual gauge; one section per TRUE flag only, in plain language with a practical fix; a "Not checked" list for unknown flags; tenant CTA; "Based on the public Google Maps listing as of <capture date>"; short disclaimer.
   - Copy comes from deterministic templates in lib/lead-finder/report-copy.ts (no LLM in this milestone). No guarantees, no invented statistics, no named competitors. "Competitors may appear ahead of you" is OK; "competitors show up first" stated as fact is not.
   - Security: escape all scraped text. Render with JavaScript disabled and all network requests blocked (embed the logo as a data URI). Store PDFs under tenant-prefixed storage keys and serve them only through tenant-checked routes.
   - Make it look sharp: this is the product's main sales asset. Test at Letter size, 1–2 pages, and with long business names.
8. Prospect detail page: business data, score breakdown, flags, link to the CRM contact/deal, report preview, Generate/Download PDF.

Tests (vitest): scoring table tests including unknown/null edges; dedupe order and re-scan idempotency; CSV mapping and limits; cross-tenant isolation for every new query and route (tenant A cannot read or generate tenant B's scans, businesses, reports, or branding); report escaping (a business name containing <script> renders inert); pipeline seed idempotency.

OUT OF SCOPE (ask before touching): any email sending, Gmail/M365 OAuth or mailbox rotation, email discovery/enrichment, /api/v1 and API keys, Stripe/billing, dashboard stats beyond scan history and lead lists, LLM copy generation, direct Google scraping, Docker/deploy changes, SMS/voice.

ACCEPTANCE CRITERIA
- [ ] gap-goblins exists as a private GitHub repo with fresh history; main = bootstrap; feat/m1-scan-score-report pushed; online-crm-ai porcelain hash is identical before and after
- [ ] Local gate passes, or any remaining failures are pre-existing and proven by the baseline
- [ ] With the fixture and csv-import sources: "plumbers in Fredericksburg VA" style scan → up to 50 scored prospects, weakest first, with correct flags; re-running the same scan creates zero new contacts/deals
- [ ] omkar-desktop adapter either works against the running local app (with evidence) or is clearly disabled with an UNVERIFIED note; never returns fake data
- [ ] Each prospect is a tenant-scoped contact + deal in the Gap Goblins Prospects pipeline, linked to its scan, score, and flags
- [ ] Gap report HTML preview and Playwright PDF render with tenant branding, show only verified gaps, and pass the escaping test
- [ ] Cross-tenant isolation tests pass for all new surfaces
- [ ] Existing CRM, outreach, and inbox features still build and their existing tests still pass

FINAL REPORT
Write _planning/m1-report.md and reply with: commits (hash + message); migrations added; files touched; gate results with exact commands and output summaries; acceptance checklist with evidence; screenshots or paths of a sample PDF generated from fixture data; UNVERIFIED items; omkar terms findings; production notes (Chromium in Dockerfile.worker, storage, env vars); top risks; and a proposed Milestone 2 plan (connected-mailbox sending, sequences, suppression/unsubscribe, the tenant-scoping gap in legacy outreach_* tables, /api/v1 + API keys, Stripe). Finish with a completion percentage for Milestone 1 scope only, counting acceptance criteria met out of the total. Then stop.
