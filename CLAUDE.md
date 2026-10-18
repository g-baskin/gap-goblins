<!-- gg:init:start -->
# Gap Goblins

Agency prospecting: niche/location or CSV → scored local businesses → CRM prospects → branded gap-report PDFs; territories constrain scans and a tenant-owned Twilio inbox supports SMS.

`CONTEXT.md` owns domain names; `docs/adr/` records decisions. `_planning/01-m0-m1-build-prompt.md` supersedes `00-original-brief.md`. Inherited notes below describe the forked CRM, not permission to use its legacy outreach paths. Corrections here take precedence over those notes.

## Owner constraints

- Never modify `online-crm-ai` (including checkout/stash). Read source only through `git -C … show/ls-tree/archive <sha>`; compare its `git status --porcelain | shasum` before/after access to prove it is untouched.
- Copying allowed: online-crm-ai, g-baskin/Legend-Copy-AI, hitb1099/outreach-os, quionie/outreach-ai, AbdelftahZowail/Quickly (MIT); omkarcloud/google-maps-scraper **docs only**; proprietary g-baskin/PawOs2 and g-baskin/proximity-scheduling (owner-approved). Record reuse in `PROVENANCE.md`. Never copy/closely paraphrase GPL pypesdev/coldflow; never touch AGPL LegendCopy or voice-agent-template.
- Resend is transactional/system-only: its AUP forbids cold email/scraped data. Milestone 1 sends no prospect email; planned outreach uses tenants' Gmail/M365 mailboxes on separate domains. Legacy Resend outreach code still exists; its presence is not authorization.
- No direct Maps scraping: acquisition goes through `LeadSource` adapters. Call omkar's local API with `fetch`, not `botasaurus-desktop-api`. Unverified contracts must stay disabled with an explicit UNVERIFIED error, never invented results.
- Owner approval required for new npm dependencies (except the already-approved Playwright move to production dependencies), external services, Dockerfile/deploy changes, feature deletion, force-pushes and public exposure.
- New tables require `tenant_id NOT NULL`, an FK and tenant-leading indexes; migrations are additive. Legacy `outreach_*`, `site_settings`, `admin_settings`, `integration_credentials` are not tenant-safe storage; use tenant-owned tables such as `tenant_branding` instead.
- Hosted CI remains disabled because it is unpaid; archived GitHub configuration belongs in `docs/reference/disabled-github-config/`, not active workflows.

## Behavioral traps

- Admin authentication does not imply tenant membership. Lead Finder and Conversations resolve active membership; multiple memberships require explicit tenant selection. Keep row ownership checks even after tenant resolution.
- Unknown gap flags score zero and display "Not checked". In `scoring.ts`, `website=null` is unknown but `""` means missing; zero reviews cannot earn low-rating points. Unclaimed/thin profile bonuses are mutually exclusive. Persist the `scoring-config.ts` rubric version with results.
- Dedupe priority is kgmid → place_id → cid → phone_e164 → gbp_url. Phone/maps links may be shared: reject those weak matches when both KGMIDs exist and differ. Preserve tenant-scoped transactional upserts/locks; rescans must reuse contacts/deals and never move stages backward.
- Gap-report copy is deterministic, not LLM-generated: no guarantees, invented stats or named competitors. PDFs run in the worker with JS disabled and all network blocked; use escaped text, inline assets/data-URI logos and tenant-prefixed storage keys. Preview uses sandboxed `srcDoc`: a route-backed iframe conflicts with frame protection.
- Territory membership is a union of ZIPs and drawn areas. Outside businesses are skipped; unknown location is retained as "Not checked", not treated as outside.
- Inbox and automation share SMS consent/DND/quiet-hour checks. Ordinary inbound texts do not grant consent; STOP revokes it. Twilio callback signature verification uses `NEXT_PUBLIC_SITE_URL`, which must match the public callback URL.
- Omkar reachability is not contract verification. Use `OMKAR_DESKTOP_API_URL` and API-shape health checks: localhost:8000 has historically reached an unrelated service. Current live-search work is gated by `OMKAR_LIVE_SCANS=on` but still reports UNVERIFIED; the switch is not evidence of a verified contract.

## Local workflow exceptions

- Keep isolated ports: web 3510, Postgres 5442, S3 9010/filer UI 9011; sibling CRM uses the default ports. Compose's `minio` service is **SeaweedFS**, not MinIO. Include `minio-setup` when bringing up storage: starting only `postgres minio` omits creation of the `media` bucket.
- Admin creation is not tenant onboarding: `scripts/create-tenant.ts` needs `--slug`, `--name`, `--admin-user-id` for an existing active admin. Legacy `db:seed` creates the old sales pipeline; Lead Finder creates its own tenant-scoped prospect pipeline.
- Worker startup also registers/schedules legacy outreach and automation; it is not a scan-only process. Preserve its `react-server` condition and worker DB imports rather than importing the web's `server-only` DB client.
- `Dockerfile.worker` does not provision Chromium or its OS dependencies; a Playwright dependency alone cannot make production PDFs work. Provisioning needs owner approval.
- `build:verify` isolates output in `.next-verify` and restores Next-mutated type/config files to avoid disrupting the dev build. Docker deployment still expects `.next`.
- The pre-push hook blocks remote `main`; intentional releases use `ALLOW_MAIN_PUSH=1`. This is a local hook, not server-side protection.
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
