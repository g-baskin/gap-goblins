# Admin Platform

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
- `bun run dev` — Next dev server on port `3500`.
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
- CI runs on push/PR to `dev`, `qa`, and `main`: Bun install, Biome lint, format check, TypeScript, and Vitest.
- `.github/workflows/branch-flow.yml` enforces PR promotion order: `dev -> qa`, then `qa -> main`.
- Dependabot targets `dev` for Bun, GitHub Actions, and Docker updates.
