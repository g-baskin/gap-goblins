# Handoff Guide

> **Gap Goblins note.** This guide was inherited from online-crm-ai@eabca74 (see `PROVENANCE.md`). Gap Goblins runs on dev port **3510**, Postgres **5442** (database `gap_goblins`, container `gap-goblins-postgres`) and S3 storage **9010/9011** (container `gap-goblins-minio`, SeaweedFS because MinIO's free images were withdrawn in Sept 2026), so it can run beside online-crm-ai (3500 / 5432 / 9000). Hosted CI is off; the local gate is `bun run lint && bun run typecheck && bun run typecheck:worker && bun run test:run && bun run build`. Lead Finder settings: `OMKAR_DESKTOP_API_URL`, `OMKAR_DESKTOP_TIMEOUT_MS`, `LEAD_SCAN_MAX_RESULTS_CAP` (see `.env.example`). Resend is for system email only; it never sends prospect outreach.

Gap Goblins is a tenant-scoped local-business prospecting application with CRM,
territories, branded gap reports and a Twilio SMS inbox. Legacy outreach/newsletter
code remains from the fork; its presence does not authorize prospect email.
Use README Quick Start for local setup and the manual release checklist below for
production preparation. Neither guide certifies a successful deployment.

---

## 1. Prerequisites

Install these once on your machine:

- **Bun** 1.3.14 (matches `packageManager` and Docker builds)
- **Docker Desktop** (for local Postgres + SeaweedFS, whose service is named `minio`)
- **Node** ≥ 22 (Bun uses Node-compatible APIs; some tools still want it)
- A code editor (VS Code, Cursor, etc.)

Optional but useful:
- **Railway CLI** — `bun add -g @railway/cli` (for deployment)
- **mailpit** — local SMTP sink for inspecting emails in dev

---

## 2. Local setup

Follow [README Quick Start](README.md#quick-start), the canonical fresh-checkout
sequence. It uses Bun 1.3.14, a frozen lockfile, explicit `.env.local` loading,
`minio-setup` for the SeaweedFS bucket, committed database migrations, an admin
with tenant membership, and a local Playwright Chromium installation.

Do not substitute `db:push` for migration history. Installing Chromium on a laptop
does not provision the production worker image; that release blocker remains open.

---

## 3. Environment variables

`.env.local` is the local dev config. **`.env.example` is the full reference** —
copy it, then fill in real values for the ones you need.

### Minimum to boot locally

| Var | What to put | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5442/gap_goblins` | Matches `docker-compose.yml` defaults |
| `AUTH_SECRET` | `openssl rand -base64 32` | Required by NextAuth |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3510` | Used in email templates & previews |
| `BUCKET_*` | Local S3 values from `.env.example`, matched to compose | SeaweedFS; `media` is created by `minio-setup`, not the storage process itself |
| `NEXTAUTH_URL` | `http://localhost:3510` | Local auth URL |
| `INTEGRATION_ENCRYPTION_KEY` | Generate as directed in `.env.example` | Protects stored integration credentials; keep stable and private |

### System email only (optional in dev)

Resend must not send prospect outreach or scraped-contact campaigns. Leave sending
unconfigured unless testing an approved system-email flow with controlled recipients.

| Var | Where to get it |
|---|---|
| `RESEND_API_KEY` | https://resend.com → API Keys |
| `DEFAULT_FROM_EMAIL` | A verified Resend sender (`hello@email.yourdomain.com`) |
| `NEWSLETTER_FROM_EMAIL` | Same — for newsletter sends |

### To use the AI reply analyzer (outreach)

| Var | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com |

### Webhook secrets (generate fresh ones)

For provider webhooks, use the signing secret assigned/configured for that exact
endpoint; generating an unrelated local value will break signature verification.
Generate application-owned shared secrets with `openssl rand -hex 32` and configure
both ends consistently.

- `CAL_WEBHOOK_SECRET` — must match the Cal.com booking webhook signing configuration
- `RESEND_WEBHOOK_SECRET` — copy from the Resend webhook configuration
- `CRON_SECRET` / `OUTREACH_CRON_SECRET` — gates cron endpoints
- `UNSUBSCRIBE_SECRET` — signs unsubscribe links
- `NEWSLETTER_API_KEY` / `OUTREACH_API_KEY` — gate internal API routes

### Optional

- `AUTH_COOKIE_DOMAIN` — set to `.yourdomain.com` in production if you need the
  session cookie to span subdomains. Leave unset locally (host-only cookie).
- `GOOGLE_API_KEY` — only if you use Google services in your stack.

---

## 4. Replace the placeholder tokens

Inherited UI copy and templates contain placeholder strings. Review their callers
before replacing them; do not bulk-replace test fixtures, historical notes or prompt
contracts. Tenant report branding belongs in `tenant_branding`, not global settings.
The table below is a reference, not a required project-wide replacement operation.

| Token | Replace with | Example |
|---|---|---|
| `__YOUR_BRAND__` | Your brand / product name | `Acme Co` |
| `__YOUR_DOMAIN__` | Bare domain (no scheme) | `acme.com` |
| `__YOUR_CAL_LINK__` | Full Cal.com booking URL | `https://cal.com/acme/intro` |
| `__YOUR_SUPPORT_EMAIL__` | Admin / support contact email | `support@acme.com` |
| `__YOUR_SECURITY_EMAIL__` | Security disclosure email | `security@acme.com` |
| `__YOUR_FROM_EMAIL__` | Default transactional `From:` mailbox | `hello@email.acme.com` |
| `__SENDER_NAME__` | Outreach sender's full name (eval fixtures only) | `Jane Doe` |
| `__SENDER_FIRST_NAME__` | Sender's first name (eval fixtures only) | `Jane` |
| `__SENDER_EMAIL__` | Sender's mailbox (eval fixtures only) | `jane@email.acme.com` |
| `__SENDER_PHONE__` | Sender's phone (eval fixtures only) | `0400 000 000` |

### Quick check

List tracked placeholder uses for review (some are intentional and should remain):

```bash
git grep -n -E '__YOUR_|__SENDER_' -- '*.ts' '*.tsx' '*.md'
```

### Branding assets

Drop your own files at:

- `public/logos/logo.svg` — sidebar + login page logo
- `public/logos/logo.png` — raster fallback for email templates
- `public/favicon.png` + `public/android-chrome-512x512.png` — favicons (regenerate from realfavicongenerator.net)

---

## 5. Creating the first admin user

Use `bun --env-file=.env.local scripts/create-admin.ts` against the local migrated
database. It validates the password and writes the actual `admin_users` schema.
Do not use inherited SQL targeting a `user` table.

Then obtain that admin's ID and run `scripts/create-tenant.ts` with `--slug`,
`--name` and `--admin-user-id`, as shown in README Quick Start. Login alone does
not establish tenant membership. Further admin invitations are available in
**Settings → Users**; tenant access must still be assigned explicitly.

---

## 6. Verifying everything works

```bash
bun run lint && bun run typecheck && bun run typecheck:worker && bun run test:run && bun run build
```

Record results and skipped tests. Passing checks does not prove deployment
readiness: the manual release checklist also requires migration and worker-PDF
validation. No clean-clone or production-image build is certified by this guide.

---

## 7. Deploying to Railway

The deployment shape is a website, a worker and managed Postgres, plus S3 storage.
The following service names are examples, not proof of a live Railway setup.
Confirm project/environment/service IDs, source branches and auto-deploy settings
before any release. Do not assume `qa` exists. The worker is required for scans,
PDFs and queued jobs; it also retains legacy outreach handlers, which are not
authorization to send prospect email through Resend. New services and deployment
changes require owner approval.

| Service | Type | Builder | Start command | Purpose |
|---|---|---|---|---|
| `Postgres` | Managed DB | — | — | App data + pg-boss queue (`pgboss` schema) |
| `website` | App | Dockerfile (`./Dockerfile`) | `node .next/standalone/server.js` | Next.js web app |
| `worker` | App | Dockerfile (`./Dockerfile.worker`) | `bun --conditions react-server scripts/worker.ts` | pg-boss job processor |

The build configs are committed: `railway.json` (website) and
`railway.worker.json` (worker). Railway picks them up automatically if you
set the config path per service (sections c and d below).

### Step-by-step

#### a) Create the project

```bash
bun add -g @railway/cli
railway login
railway init       # creates a new project, prompts for name
```

Or just create it in the Railway dashboard. Either way, you should end up
with an empty project.

#### b) Add Postgres

Dashboard → **+ New** → **Database** → **Add PostgreSQL**.

Railway provisions it and gives you two env vars on the Postgres service:

- `DATABASE_URL` — internal URL (use this for `website` and `worker`)
- `DATABASE_PUBLIC_URL` — public TCP proxy URL (use this from your laptop)

No manual setup needed. pg-boss creates its own `pgboss` schema on first run.

#### c) Add the `website` service

Dashboard → **+ New** → **GitHub Repo** → pick your repo.

Then on the service:

1. **Settings → Source** → use the owner-approved production branch. Confirm the configured source before release; provision a validation environment only with approval.
2. **Settings → Build** → set **Config Path** to `railway.json`.
   This tells Railway to use `Dockerfile` as the builder.
3. **Settings → Networking** → click **Generate Domain** to get a
   `*.up.railway.app` URL, or **Custom Domain** to add yours.
4. **Variables** → see env-var list below.

#### d) Add the `worker` service

Dashboard → **+ New** → **GitHub Repo** → pick the **same repo**.

Then on the service:

1. Rename it to `worker` (Settings → Service Name).
2. **Settings → Source** → use the same approved release revision as the website. Do not assume a QA branch or environment already exists.
3. **Settings → Build** → set **Config Path** to `railway.worker.json`.
   This makes Railway use `Dockerfile.worker` and start with
   `bun --conditions react-server scripts/worker.ts`.
4. **Settings → Networking** → **do NOT generate a domain**. The worker is
   internal-only, no HTTP server.
5. **Settings → Deploy** → confirm restart policy is `ON_FAILURE` with
   max 10 retries (already set in `railway.worker.json`).
6. **Variables** → see env-var list below.

#### e) Add object storage (Railway Bucket / Tigris)

Dashboard → **+ New** → **Database** → **Add Bucket**.

Railway provisions a Tigris-backed S3-compatible bucket and exposes:

- `BUCKET_ENDPOINT`
- `BUCKET_REGION`
- `BUCKET_NAME` (rename to `BUCKET_MEDIA_NAME` via variable reference)
- `BUCKET_ACCESS_KEY_ID` (rename to `BUCKET_MEDIA_ACCESS_KEY_ID`)
- `BUCKET_SECRET_ACCESS_KEY` (rename to `BUCKET_MEDIA_SECRET_ACCESS_KEY`)
- `BUCKET_FORCE_PATH_STYLE=false` (set manually — Tigris uses virtual-host)

Reference these from `website` and `worker` using Railway's `${{Bucket.VAR}}`
syntax (see env-var section below).

### Env vars per service

Railway lets you **reference variables across services** with
`${{ServiceName.VAR_NAME}}` — use this for `DATABASE_URL` and bucket creds so
you don't have to copy/paste secrets.

#### `website` service variables

| Var | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.com` (or the Railway-generated URL) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_COOKIE_DOMAIN` | `.yourdomain.com` (only if you have subdomains; otherwise leave unset) |
| `RESEND_API_KEY` | From resend.com |
| `RESEND_WEBHOOK_SECRET` | From Resend webhook config |
| `ANTHROPIC_API_KEY` | From console.anthropic.com |
| `DEFAULT_FROM_EMAIL` | `hello@email.yourdomain.com` (verified in Resend) |
| `NEWSLETTER_FROM_EMAIL` | `newsletter@email.yourdomain.com` |
| `CAL_WEBHOOK_SECRET` | From Cal.com webhook config (if used) |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `OUTREACH_CRON_SECRET` | `openssl rand -hex 32` |
| `UNSUBSCRIBE_SECRET` | `openssl rand -hex 32` |
| `NEWSLETTER_API_KEY` | `openssl rand -hex 32` |
| `OUTREACH_API_KEY` | `openssl rand -hex 32` |
| `BUCKET_ENDPOINT` | `${{Bucket.BUCKET_ENDPOINT}}` |
| `BUCKET_REGION` | `${{Bucket.BUCKET_REGION}}` |
| `BUCKET_MEDIA_NAME` | `${{Bucket.BUCKET_NAME}}` |
| `BUCKET_MEDIA_ACCESS_KEY_ID` | `${{Bucket.BUCKET_ACCESS_KEY_ID}}` |
| `BUCKET_MEDIA_SECRET_ACCESS_KEY` | `${{Bucket.BUCKET_SECRET_ACCESS_KEY}}` |
| `BUCKET_FORCE_PATH_STYLE` | `false` |
| `NODE_ENV` | `production` (Railway sets this automatically) |

#### `worker` service variables

The worker needs a **subset** of the website's vars — anything it touches when
running jobs. Minimum set:

| Var | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `NEXT_PUBLIC_SITE_URL` | Same as website (used in email templates) |
| `RESEND_API_KEY` | Same |
| `ANTHROPIC_API_KEY` | Same |
| `DEFAULT_FROM_EMAIL` | Same |
| `NEWSLETTER_FROM_EMAIL` | Same |
| `UNSUBSCRIBE_SECRET` | Same |
| `OUTREACH_CRON_SECRET` | Same (the worker self-triggers via the cron endpoint) |
| `BUCKET_*` | Endpoint, region, media name, access key, secret key and path-style setting |
| `INTEGRATION_ENCRYPTION_KEY` | Same stable key as website when decrypting shared integration credentials |
| `NODE_ENV` | `production` |

These inherited integration variables are feature-dependent, not a requirement to
enable email or AI services. Give each service only the credentials its enabled
paths require. Check `.env.example` and the relevant handler before enabling a
feature; do not copy every secret indiscriminately.

### Manual release checklist

This is a manual procedure, not an automated release or evidence of a deployment.
`/commit` only makes a local commit. Obtain explicit owner approval before pushing,
tagging/publishing, changing deployment configuration or touching production data.
Hosted CI stays disabled; do not enable it to implement this procedure.

1. **Choose the candidate.** Record its commit, installed Bun/Node versions, target
   Railway project/environment/services and currently deployed web/worker revisions.
   Confirm the actual source branch and automatic deployment behavior. Prevent an
   automatic rollout from racing migrations; if ordering cannot be controlled, stop.
2. **Prepare version and notes.** `package.json` owns the application version. Choose
   a SemVer bump with the owner (including breaking changes while pre-1.0). Update
   the version and relevant lockfile metadata using Bun, inspect the diff, and move
   the applicable `CHANGELOG.md` Unreleased bullets into `## [X.Y.Z] - YYYY-MM-DD`.
   Keep an Unreleased section for subsequent changes. Do not invent a release date,
   tag or past deployment. Include migration requirements and known limitations.
3. **Verify a clean candidate.** In a fresh checkout, follow README setup with
   `bun install --frozen-lockfile` and run the full local gate. Record actual results
   and skipped coverage. Build both Docker images and test the production web server
   and worker in an isolated environment with non-production data. PDF creation and
   tenant-checked download must succeed. **The current worker image lacks Chromium
   and its OS dependencies: resolve that separately with owner approval before a
   PDF-capable release.** A successful image build alone does not prove PDFs work.
4. **Prepare data recovery.** Review every pending SQL migration and `meta/` change
   in `lib/db/drizzle/`. Preserve tenant constraints and additive, old/new-app-compatible
   schema changes. Capture a database backup/snapshot and verify restore in isolation;
   record its reference and the previous application revisions, never credentials.
   Rehearse migrations against a representative disposable database first.
5. **Apply migrations once, before dependent code.** In an approved operator checkout
   of the candidate with development dependencies installed, securely inject the
   target `DATABASE_URL` and run `bun run db:migrate`. Verify the target beforehand;
   do not paste its credentials into commands, logs or release notes. Drizzle Kit
   reads `drizzle.config.ts` and committed `lib/db/drizzle` migrations. Do not use
   `db:push`, edit applied SQL, or assume a schema sync is harmless. The standalone
   web image is not a migration shell and does not provide Bun/Drizzle tooling.
   If a migration fails, stop deployment and inspect database state; do not blindly retry.
6. **Deploy the approved revision.** Release web and worker to the verified targets
   only after compatible migrations succeed. Verify web `/api/health`, admin login,
   tenant access, a fixture/CSV scan, PDF creation/download and worker queue processing
   in the approved validation environment. Do not send real prospect emails/SMS as a
   smoke test. Record service revision IDs, observed results and remaining limitations.
7. **Tag and communicate.** After successful verification, and only with publishing
   approval, create an annotated `vX.Y.Z` tag pointing at the exact release commit.
   Keep the existing repository visibility; share the corresponding changelog section
   with the owner/operators through their approved private channel. Package version,
   tag and release notes must agree. Do not repoint an existing release tag.

### Recovery if a release fails

Stop promotion and prevent affected jobs from processing further with owner-approved
operational controls. Redeploy the recorded previous web and worker revisions only
if they remain compatible with the additive schema. Do not reverse migrations or
restore a database automatically: restoration can lose writes since the backup.
If compatibility is uncertain, stop and agree a recovery plan with the owner; prefer
a reviewed forward repair, or an explicitly approved restore after reconciling new
writes and queued jobs. Record the failed revision, recovery action and validation
results in the release notes. Never rewrite published tags or claim an unsuccessful
rollout as a successful release.

pg-boss manages its own queue schema at worker startup; that does not replace
application migrations.

### Verifying the worker is alive

`scripts/worker.ts` logs these startup milestones:

```text
[worker] pg-boss started
[worker] all handlers registered — waiting for jobs
```

Startup logs establish handler registration, not successful job processing. In an
approved validation environment, run a fixture/CSV scan and confirm its completion,
then request a report and verify PDF creation and tenant-checked download. Do not
use an outreach email or real SMS send as a smoke test. The current Docker worker
cannot be considered PDF-ready until Chromium provisioning is fixed and tested.

For startup failures, inspect the actual error and service configuration; do not
assume all failures are missing environment variables.

### Scaling the worker

Inspect the registered handlers and queue options in `scripts/worker.ts` before
changing concurrency or replica counts. Queue coordination does not eliminate
retries or duplicate external side effects; preserve handler idempotency. Replica
changes require owner approval and validation against the workload, especially
browser-backed PDF jobs.

### Auto-deploy on push

Auto-deploy behavior is configured in Railway, not established by these files.
Verify it before a release and follow the manual checklist above so pending
migrations cannot race a web/worker rollout. Adding a staging environment or
changing source branches requires owner approval.

### Cal.com webhook subdomain (only if you use Cal.com)

If your domain runs through Cloudflare with Bot Fight Mode enabled, Cal.com's
webhook POSTs will get 403'd at the Cloudflare edge before reaching your app.

The fix: a dedicated `hooks.yourdomain.com` subdomain configured as **DNS-only
(grey cloud)** in Cloudflare, pointing at the Railway `website` service. Then
point Cal's webhook subscriber URL at
`https://hooks.yourdomain.com/api/webhooks/cal`.

Full details + DNS records: `app/api/webhooks/cal/README.md`.

---

## 8. Architecture cheatsheet

| Concern | Where it lives |
|---|---|
| Routes | `app/` (App Router) |
| Admin UI | `app/admin/(dashboard)/` |
| Auth | `lib/auth.ts`, `lib/auth.config.ts` (NextAuth Credentials) |
| Database client | `lib/db/index.ts` (Drizzle) |
| DB schema | `lib/db/schema.ts` |
| Background jobs | `scripts/worker.ts` (pg-boss handlers) |
| Job enqueue functions | `lib/queue/index.ts` |
| Object storage | `lib/storage/index.ts` (S3-compatible) |
| Outreach | `lib/outreach/` |
| Newsletter | `lib/newsletter/` |
| Email templates | `lib/newsletter/emails/`, `lib/email/` |
| Perception probes (eyes) | `.gg/eyes/` |

Read `CLAUDE.md` for the full conventions doc — naming, anti-patterns, and the
locked-behaviour sections (Cal webhook, Reply-To, AI voice).

---

## 9. Locked behaviour (read before touching outreach)

These rules are pinned by regression tests and live in `CLAUDE.md`. Breaking
them means broken bookings or broken deliverability.

- **Cal.com webhook host** — must be DNS-only in Cloudflare. See above.
- **Outreach Reply-To** — outgoing outreach emails set `Reply-To` to the
  sender's plain mailbox, never `reply+<uuid>@...`. Replies match back to
  contacts via `In-Reply-To`/`References` headers. Tests in
  `app/api/outreach/replies/[replyId]/send/__tests__/route.test.ts` will fail
  if this regresses.
- **AI reply-analyzer voice** — the system prompt in
  `lib/outreach/ai/reply-analyzer.ts` bakes in tone rules, banned phrases,
  and a verbatim calendar URL. Edit the voice rules to suit your brand, but
  keep `lib/outreach/ai/__tests__/reply-analyzer.test.ts` in sync.

To eval the AI prompt after editing it:

```bash
bun scripts/eval-replies.ts
```

This runs 8 hardcoded cases through the live Anthropic API and prints
pass/fail per case.

---

## 10. Known release limitations

- **Worker PDFs:** `Dockerfile.worker` lacks Chromium/OS dependency provisioning.
  Local browser installation does not resolve the production-image blocker.
- **Clean-clone verification:** documented steps are not a recorded successful build;
  capture fresh install, gate and image validation results before releasing.
- **Omkar:** live scanning remains UNVERIFIED; validate with fixture/CSV data instead.
- **Twilio:** real delivery requires account/registration setup, a public callback
  URL and live validation; an implemented inbox is not delivery evidence.
- **Tenant onboarding:** the admin CLI exists, but creating a login alone does not
  create tenant membership. Follow section 5.

For local failures, inspect the actual error and `docker compose ps`, including
whether `minio-setup` completed successfully. Do not treat healthy services alone
as evidence that migrations, tenant onboarding or report generation succeeded.
