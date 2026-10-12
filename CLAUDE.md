<!-- gg:init:start -->
# Gap Goblins

Local-business lead finder: niche + location → businesses → weakest-online-presence score → CRM prospect → branded "gap report" PDF. Product #4 of the owner's four-product ecosystem.

## Current state

- Bootstrapped from online-crm-ai@eabca74 with fresh history (`PROVENANCE.md`); its own git repo, remote `g-baskin/gap-goblins` (private). `main` = bootstrap, `dev` from main, Milestone 1 on `feat/m1-scan-score-report`.
- Active spec: `_planning/01-m0-m1-build-prompt.md` (wins over `_planning/00-original-brief.md`). Recon: `_planning/phase-0-recon.md`.
- The inherited notes below the fenced block describe the online-crm-ai base; Gap Goblins ports are 3510 / 5442 / 9010-9011.

Read CONTEXT.md before naming anything. Hard-to-reverse decisions are recorded in `docs/adr/`.

## Hard rules (owner decisions, final)

- **Never modify `online-crm-ai`** (no checkout, stash, commit or edits). It has uncommitted work on `fix/automation-release-review`. Read it only with `git -C … show/ls-tree/archive <sha>`. Prove it is untouched by comparing `git status --porcelain | shasum` before and after.
- **Licenses:** you may copy from online-crm-ai, g-baskin/Legend-Copy-AI, omkarcloud/google-maps-scraper (docs only), hitb1099/outreach-os, quionie/outreach-ai and AbdelftahZowail/Quickly (all MIT). pypesdev/coldflow is GPL-3.0: never copy it or closely paraphrase it. Never touch LegendCopy or voice-agent-template (AGPL).
- **Resend is for system/transactional email only.** Never use it for prospect outreach, because its Acceptable Use Policy bans cold email and scraped data. Outreach in Milestone 2 goes through tenants' connected Gmail/M365 mailboxes on separate domains. Milestone 1 sends no email to prospects at all.
- **No direct Google Maps scraping.** Leads come only through `LeadSource` adapters: `fixture`, `csv-import` (omkar exports + generic CSV) and `omkar-desktop` (local API via `fetch`; do not add the `botasaurus-desktop-api` package).
- No fake results. If a contract can't be verified, disable the feature with an explicit error and mark it UNVERIFIED.
- Ask the owner before: any new npm dependency (the one exception is moving `playwright` to dependencies), a new external service, Dockerfile/deploy changes, deleting features, force-pushing, or making anything public.
- New tables need `tenant_id NOT NULL` with an FK and tenant-leading indexes. Use additive migrations only.
- The legacy `outreach_*` tables, `site_settings`, `admin_settings` and `integration_credentials` in the base repo are **not tenant-scoped**. Don't use them for tenant data (for example, branding goes in `tenant_branding`).

## Local environment gotchas

- Ports 5432, 9000 and 3500 (online-crm-ai) are already taken on this machine, as are the containers named `app-postgres`/`app-minio`. Gap Goblins uses dev port 3510, Postgres 5442, MinIO 9010/9011, containers `gap-goblins-postgres`/`gap-goblins-minio` and database `gap_goblins`.
- omkar Google Maps Extractor (desktop app in /Applications) binds `*:8000`, but a Docker uvicorn service, `fastapi-click-api`, holds `127.0.0.1:8000`. So `localhost:8000` reaches the wrong service. Read `OMKAR_DESKTOP_API_URL`, never hardcode the port, and have the health check confirm the response really comes from omkar.
- omkar data: `KGMID` is the only field that is always unique and non-null (`PLACE_ID` can be missing). Dedupe order: kgmid → place_id → cid → phone_e164 → gbp_url. Emails come only from omkar's paid enrichment.
- Hosted CI is unpaid. Move `.github/workflows/*` and `dependabot.yml` to `docs/reference/disabled-github-config/` (move them, don't delete them). The local gate, in order: `bun run lint && bun run typecheck && bun run typecheck:worker && bun run test:run && bun run build`. Record baseline failures before making changes.

## Domain invariants (Milestone 1)

- The scoring rubric lives in `lib/lead-finder/scoring-config.ts` with `RUBRIC_VERSION`. Each flag is true, false or `"unknown"`. Unknown scores 0 and displays as "Not checked". `gbp_unclaimed` and `gbp_thin` are mutually exclusive, so the +40 counts once.
- Re-scans never duplicate contacts or deals and never move a deal's stage backward.
- Report copy comes from deterministic templates (no LLM): no guarantees, no invented stats, no named competitors. Render the PDF with Playwright in the worker, with JavaScript disabled and the network blocked (the logo is a data URI). Escape all scraped text. PDFs live under tenant-prefixed keys and are served only through tenant-checked routes.
<!-- gg:init:end -->

# Inherited base notes (online-crm-ai@eabca74)

Bun/Next.js admin console for CRM pipeline management, outreach campaigns and replies, newsletters, automation flows, media/settings, and admin user management. Public `/` redirects to `/admin`; admin pages are protected by `proxy.ts` and NextAuth credentials auth.

## Stack

- Bun `1.3.14` package manager/runtime; package engines require Node `>=22` and Bun `>=1.3.0`.
- Next.js `16.2.6` App Router, React `19.2.6`, Tailwind CSS v4, Biome, TypeScript, Vitest.
- Drizzle ORM with PostgreSQL; Drizzle config uses `lib/db/schema.ts` and outputs migrations to `lib/db/drizzle`.
- NextAuth v5 credentials provider; `lib/auth.ts` supports password login plus optional TOTP via `totpCode`.
- Resend sends email; Anthropic/AI SDK power AI features; pg-boss runs queued jobs from the same Postgres database.
- Server-only media storage uses `@aws-sdk/client-s3` with bucket env vars; local compose provides MinIO.

## Key Structure

- `app/page.tsx` redirects to `/admin`; `app/layout.tsx` sets admin metadata, fonts, providers, and dynamic rendering.
- `app/admin/(auth)/` contains login, invite, and reset-password flows.
- `app/admin/(dashboard)/` contains dashboard, CRM, outreach, inbox, newsletter, automation, blog, and settings pages.
- `app/api/` contains route handlers for admin, auth, automation, CRM, cron, health, media, newsletter, notifications, outreach, and webhooks.
- `components/admin/` and `components/shadcn/` hold feature UI and shared primitives/sidebar/theme providers.
- `lib/db/` contains Drizzle schema, relations, migrations, and database clients; `lib/db/worker.ts` is the non-`server-only` DB client for workers/scripts.
- `lib/crm/`, `lib/outreach/`, `lib/newsletter/`, `lib/automation/`, `lib/queue/`, and `lib/storage/` hold domain logic used by API routes and the worker.
- `scripts/worker.ts` registers pg-boss handlers for newsletter, outreach, and automation jobs.
- `proxy.ts` handles admin auth redirects, CSRF checks for state-changing API routes, webhook-host lockdown, and CSP nonce headers.

## Local Commands

- `bun install` — install dependencies from `bun.lock`.
- `docker compose up -d postgres minio` — start local Postgres and MinIO; `minio-setup` creates the `media` bucket.
- `bun run dev` — Next dev server on port `3510`.
- `bun run worker` — run `scripts/worker.ts` with Bun and `react-server` conditions.
- `bun run db:migrate` / `bun run db:generate` / `bun run db:push` / `bun run db:studio` — Drizzle Kit commands.
- `bun run db:seed` — run `scripts/seed-crm-pipeline.ts` against `.env.local`.
- `bun scripts/create-admin.ts` — create an initial admin user.
- `bun run lint`, `bun run format:check`, `bun run typecheck`, `bun run typecheck:worker`, `bun run test:run` — CI-style checks.
- `bun run build:verify` — verify a production build with `scripts/verify-production-build.ts`.

## Database, Jobs, and Storage

- App code imports `db` from `@/lib/db`; worker/scripts use `lib/db/worker.ts` when `server-only` imports would fail.
- `DATABASE_URL` is required when the DB proxy is first used; Postgres connections are lazy-created.
- Committed Drizzle migration state lives under `lib/db/drizzle`: SQL files plus `meta/_journal.json` and snapshot JSON files.
- The default seeded CRM pipeline slug is `sales-pipeline` with stages `Lead`, `Contacted`, `Meeting Booked`, `Proposal Sent`, `Won`, and `Lost`.
- Contact status rank is `subscriber < lead < qualified < customer` in `lib/crm/constants.ts`.
- `app/api/webhooks/cal` dispatches `BOOKING_CREATED` to move matching CRM deals to `meeting-booked` and trigger qualified-status automation.
- `lib/storage/index.ts` uploads, downloads, and deletes objects in `BUCKET_MEDIA_NAME` or the default `media` bucket.

## Outreach and Auth Notes

- Campaign and admin reply sends set `Reply-To` to the selected sender mailbox in `lib/outreach/sending/sender.ts` and `app/api/outreach/replies/[replyId]/send/route.ts`.
- `lib/outreach/ai/reply-analyzer.ts` owns the reply-classification schema and suggested-reply prompt voice; the prompt keeps `__YOUR_CAL_LINK__` literal and pricing/timeline as `$5,000 AUD` and `4 to 8 weeks`.
- Credentials auth defines `totpCode`, but the current login page posts only `email` and `password`; add UI/request support before enabling TOTP-only logins.
- Placeholder branding tokens still appear in UI/auth copy and prompts, including `__YOUR_BRAND__`, `__YOUR_SUPPORT_EMAIL__`, and `__YOUR_CAL_LINK__`.

## Deployment and Branch Workflow

- `Dockerfile` builds with Bun and runs the standalone Next server on Node via `node .next/standalone/server.js`.
- `Dockerfile.worker` installs production deps and runs `bun --conditions react-server scripts/worker.ts`.
- `railway.json` uses `Dockerfile`, starts the website with `node .next/standalone/server.js`, and healthchecks `/api/health`.
- `railway.worker.json` uses `Dockerfile.worker`, starts the worker command, and restarts on failure.
- Hosted CI is disabled; the old workflows and dependabot config are kept in `docs/reference/disabled-github-config/`. Local gate: `bun run lint && bun run typecheck && bun run typecheck:worker && bun run test:run && bun run build`.
