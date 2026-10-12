# Local Development

> Category: How-to Guide | Version: 1.0 | Date: May 2026 | Status: Active

Run template-crm locally with Docker Postgres + MinIO, migrations, seed data, and first admin user.

**Related:**
- [`HANDOFF.md`](../../../HANDOFF.md)
- [`architecture/system-overview.md`](../architecture/system-overview.md)

---

## Prerequisites

- **Bun** ≥ 1.3 — `curl -fsSL https://bun.sh/install | bash`
- **Docker Desktop** — Postgres + MinIO
- **Node** ≥ 22 (tooling compatibility)

Optional: **mailpit** for local SMTP inspection (see `.gg/eyes/mail.sh` in CLAUDE.md).

---

## Step 1 — Install dependencies

```bash
git clone https://github.com/g-baskin/template-crm.git
cd template-crm
bun install
```

---

## Step 2 — Environment

```bash
cp .env.example .env.local
```

Minimum vars to boot:

| Variable | Local value |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/postgres` |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3500` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3500` |
| `INTEGRATION_ENCRYPTION_KEY` | 32-byte hex (see `.env.example`) |
| `BUCKET_*` | Defaults work with bundled MinIO |

Optional for full features: `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, webhook/cron secrets.

---

## Step 3 — Start infrastructure

```bash
docker compose up -d postgres minio
```

Verify: `docker compose ps` — Postgres on 5432, MinIO on 9000.

---

## Step 4 — Database

```bash
bun run db:migrate    # or: bun run db:push
bun run db:seed       # sales-pipeline + stages
```

Open Drizzle Studio: `bun run db:studio`

---

## Step 5 — First admin user

```bash
bun scripts/create-admin.ts
```

Prompts for email/password; creates `super_admin` in `admin_users`.

Alternative: SQL insert documented in [`HANDOFF.md`](../../../HANDOFF.md) §5.

---

## Step 6 — Run app + worker

Terminal 1:

```bash
bun run dev    # http://localhost:3500 → redirects to /admin
```

Terminal 2:

```bash
bun run worker    # pg-boss — required for outreach/newsletter sends
```

---

## Verification

```bash
bun run lint
bun run typecheck
bun run test:run
bun run build
```

All green = ready to deploy.

---

## Common issues

| Symptom | Fix |
|---|---|
| DB connection refused | `docker compose up -d postgres` |
| Upload fails | MinIO not running; check `BUCKET_*` vars |
| Outreach doesn't send | Worker not running; check terminal 2 |
| Stale Next module after prompt edit | Restart `bun run dev` |
| Blank admin page | CSP nonce issue — check `proxy.ts` + browser console |

Clear Next cache: `rm -rf .next && bun run dev`

---

## Perception probes

Headless verification scripts live in `.gg/eyes/` — HTTP, logs, visual screenshots, mailpit. See root `CLAUDE.md` Eyes section.

---

## Changelog

- v1.0 (2026-05) — Initial local dev guide.
