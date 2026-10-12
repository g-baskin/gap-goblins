# Gap Goblins

> They find the gaps. You get the bag.

Gap Goblins is a local-business lead finder. Pick a niche and a location (or upload a Google Maps Extractor export), and it finds businesses with the weakest online presence, scores each one, files it as a prospect in the CRM, and produces a branded "gap report" PDF that explains what the business is missing. It is product #4 of the owner's four-product ecosystem.

## Relationship to online-crm-ai

Gap Goblins was bootstrapped from `g-baskin/online-crm-ai` at commit `eabca74` with **fresh git history** (see [`PROVENANCE.md`](PROVENANCE.md)). It reuses that codebase's tenancy, CRM (contacts, deals, pipelines), pg-boss worker, storage and admin shell. The two repositories evolve independently: nothing here is merged back into online-crm-ai, and online-crm-ai is never modified from this project.

Both apps can run side by side on one machine. Gap Goblins uses its own ports and containers:

| Service | online-crm-ai | Gap Goblins |
| --- | --- | --- |
| Next dev server | 3500 | **3510** |
| Postgres | 5432 (`app-postgres`) | **5442** (`gap-goblins-postgres`, db `gap_goblins`) |
| S3 storage API / UI | 9000 / 9001 (`app-minio`, MinIO) | **9010 / 9011** (`gap-goblins-minio`, SeaweedFS) |

Local S3 storage runs SeaweedFS (Apache-2.0) under the compose service name `minio`, because MinIO's free Docker images were withdrawn in September 2026. Keys, bucket (`media`) and env vars are unchanged; `docker compose up -d postgres minio minio-setup` starts everything.

## Local quality gate

Hosted CI is switched off (the old GitHub Actions config lives in `docs/reference/disabled-github-config/`). Run this before every commit:

```bash
bun run lint && bun run typecheck && bun run typecheck:worker && bun run test:run && bun run build
```

Planning docs: [`_planning/`](_planning/). Glossary: [`CONTEXT.md`](CONTEXT.md). Decisions: [`docs/adr/`](docs/adr/).

---

## Inherited Platform Capabilities

These are inherited starting points, not claims of completed omnichannel architecture or GoHighLevel parity.

| System | Description |
|--------|-------------|
| **CRM** | Contacts, deals, pipeline kanban, stage history, Cal.com booking sync |
| **Outreach** | Campaign sequences, AI reply analysis, Resend webhooks, pg-boss sends |
| **Inbox** | Email-focused threaded replies, suggested responses, intent/sentiment badges |
| **Newsletter** | AI-assisted generation, queue pipeline, subscriber management |
| **Admin** | NextAuth credentials + TOTP foundations, users, appearance (theme + colour schemes) |
| **Storage** | S3-compatible uploads (MinIO local / Tigris on Railway) |

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Bun 1.3.14 |
| Framework | Next.js 16 (App Router) + React 19 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| ORM / DB | Drizzle + PostgreSQL |
| Auth | NextAuth v5 (credentials + TOTP) |
| Email | Resend |
| Queue | pg-boss (same Postgres) |
| Lint / format | Biome |
| Deploy | Railway (`website` + `worker` + Postgres) |

---

## Quick Start

**Prerequisites:** Bun ≥ 1.3, Docker Desktop

```bash
git clone git@github.com:g-baskin/gap-goblins.git
cd gap-goblins
bun install

cp .env.example .env.local
# Fill minimum local vars (see HANDOFF.md):
#   DATABASE_URL, AUTH_SECRET, NEXTAUTH_URL, NEXT_PUBLIC_SITE_URL, INTEGRATION_ENCRYPTION_KEY

docker compose up -d postgres minio
bun run db:migrate
bun run db:seed          # sales pipeline + stages
bun scripts/create-admin.ts   # first super_admin user

bun run dev              # http://localhost:3510 → /admin
bun run worker           # separate terminal — outreach + newsletter jobs
```

See [`HANDOFF.md`](HANDOFF.md) for full env reference, placeholder token replacement, and production deploy.

---

## Scripts

```bash
bun run dev              # Dev server (:3510)
bun run build            # Production build
bun run start            # Production server
bun run lint             # Biome check
bun run lint:fix         # Biome check --write
bun run typecheck        # tsc --noEmit
bun run test:run         # Vitest
bun run worker           # pg-boss worker
bun run db:migrate       # Apply Drizzle migrations
bun run db:seed          # Seed default CRM pipeline
bun run db:studio        # Drizzle Studio
```

---

## Project Structure

```
app/
├── admin/                 # Admin dashboard (NextAuth-protected)
│   ├── (auth)/            # login, invite, reset-password
│   └── (dashboard)/       # CRM, outreach, inbox, newsletter, settings, blog
├── api/
│   ├── admin/             # Settings, users, uploads, dashboard, invitations, security
│   ├── auth/              # NextAuth
│   ├── crm/               # Contacts, deals, pipeline, metrics, activity
│   ├── outreach/          # Campaigns, replies, import, webhooks, sender accounts
│   ├── newsletter/        # Generate, curate, send, stats, queue jobs
│   ├── webhooks/          # Cal.com + Resend
│   ├── cron/              # Scheduled tasks (newsletter, CRM queue)
│   ├── media/             # Authenticated avatar/logo proxy
│   ├── notifications/     # In-app notification API
│   └── health/            # Health check
├── page.tsx               # redirects to /admin
└── layout.tsx             # root layout (CSP nonce, theme providers)

components/
├── admin/                 # inbox, session timeout, skin applier, reply composer
├── crm/                   # pipeline kanban, deals table, contact/deal sheets
├── outreach/              # campaign dialogs, tags, owner select
├── notifications/         # bell, sheet, context
├── settings/              # skin picker, settings sidebar
├── shadcn/                # app shell, sidebar, theme provider, UI primitives
└── icons/                 # brand icons (Gmail, Outlook, etc.)

lib/
├── db/                    # Drizzle schema, migrations, client
├── storage/               # S3 helpers (server-only)
├── queue/                 # pg-boss enqueue helpers
├── newsletter/            # generation, queue jobs, email templates, sources
├── outreach/              # sending, webhooks, AI analyzer, CRM push, scheduling
├── crm/                   # contacts, deals, metrics, timeline
├── admin/                 # dashboard data queries
├── auth/                  # API key comparison helpers
├── security/              # CSP nonce, input validation
├── api/                   # shared API helpers (parse-request-json)
├── apply-skin.ts          # colour scheme CSS injection
├── theme-user-override.ts # prevents server theme clobbering user choice
└── auth.ts  auth.config.ts

scripts/
├── worker.ts              # pg-boss job processor (Railway worker service)
├── create-admin.ts        # bootstrap first super_admin
├── seed-crm-pipeline.ts   # default sales pipeline + stages
└── eval-replies.ts        # outreach AI voice regression harness

proxy.ts                   # Next.js 16 proxy (auth + CSRF + CSP; replaces middleware.ts)
```

### Architecture notes

- **Database**: All queries go through `db` from `@/lib/db` (Drizzle, server-only). Schema uses camelCase columns.
- **Storage**: File access via `lib/storage/index.ts`. Served through authenticated proxy routes — never public S3 URLs.
- **Security**: Nonce-based CSP per request, CSRF origin check on state-changing API routes, NextAuth session required for `/admin/*`.
- **Worker**: The `website` service enqueues jobs; the `worker` service polls pg-boss and runs handlers.
- **Components**: Named exports only. Animations live in `app/globals.css` as `@keyframes`.

See [`CLAUDE.md`](CLAUDE.md) for locked patterns (Cal.com webhook URL, outreach Reply-To, AI voice rules).

---

## Deployment (Railway)

| Service | Start command |
|---------|---------------|
| `website` | `node .next/standalone/server.js` |
| `worker` | `bun scripts/worker.ts` |
| `Postgres` | managed (also hosts `pgboss` schema) |

Branch flow is `dev → qa → main`: work lands on `dev`, release candidates promote to `qa`, and `main` is production only. Pushes to `main` deploy the Railway `website` and `worker`; configure env vars from `.env.example`.

**Locked patterns** (do not change without reading docs): Cal.com webhook on `hooks.__YOUR_DOMAIN__`, outreach Reply-To = sender plain mailbox, AI voice rules in `lib/outreach/ai/reply-analyzer.ts`. See [`CLAUDE.md`](CLAUDE.md).

---

## License

Proprietary product. All rights reserved. Third-party components remain subject to their respective licenses; see the project documentation and future third-party notices.
