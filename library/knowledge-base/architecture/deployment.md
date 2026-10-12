# Deployment

> Category: Architecture | Version: 1.0 | Date: May 2026 | Status: Active

Production deployment on **Railway** (website + worker + Postgres + Bucket), Docker builds, and Cloudflare DNS for apex + hooks subdomain.

**Related:**
- [`HANDOFF.md`](../../../HANDOFF.md)
- [`system-overview.md`](system-overview.md)
- [`cloudflare-integration.md`](cloudflare-integration.md)

---

## Railway services

| Service | Config file | Dockerfile | Start command |
|---|---|---|---|
| **website** | `railway.json` | `Dockerfile` | `node .next/standalone/server.js` |
| **worker** | `railway.worker.json` | `Dockerfile.worker` | `bun scripts/worker.ts` |
| **Postgres** | (managed) | — | — |
| **Bucket** | (managed Tigris) | — | — |

Push to **`main`** deploys website and worker in parallel. Fix red `main` immediately — broken production.

---

## Build pipeline

1. Next.js `output: 'standalone'` produces `.next/standalone/` for the website image.
2. Worker image includes Bun + full repo for job handlers.
3. Pre-commit: Biome via lint-staged (never `--no-verify`).

Verify locally before push:

```bash
bun run lint && bun run typecheck && bun run test:run && bun run build
```

---

## Database schema on Railway

Schema is **not** auto-applied on deploy. One-time after Postgres provision:

```bash
DATABASE_URL="<Postgres DATABASE_PUBLIC_URL>" bun run db:push
# or: bun run db:migrate
bun run db:seed   # sales pipeline + stages
```

pg-boss creates `pgboss.*` tables on first worker boot.

---

## Environment variables

Use Railway `${{Service.VAR}}` references:

- `DATABASE_URL` → `${{Postgres.DATABASE_URL}}`
- Bucket vars → `${{Bucket.*}}` mapped to `BUCKET_MEDIA_*`

**Website** needs full env set (auth, Resend, Anthropic, cron secrets, bucket, public URLs).  
**Worker** needs at minimum: DB, Resend, Anthropic, site URL, email from addresses, unsubscribe secret, bucket creds, outreach cron secret.

Simplest ops: duplicate all website vars onto worker.

Full tables: [`HANDOFF.md`](../../../HANDOFF.md) §7.

---

## Domains

1. Generate Railway domain or add custom domain on **website** service.
2. Cloudflare apex CNAME → Railway (typically orange cloud).
3. Add **hooks** subdomain grey-cloud → same Railway service for webhooks only.
4. Set `NEXT_PUBLIC_SITE_URL`, `NEXTAUTH_URL` to production HTTPS URL.
5. Optional: `AUTH_COOKIE_DOMAIN=.yourdomain.com` for subdomain cookies.

---

## Worker verification

Deploy logs should show:

```
[worker] pg-boss started
[worker] queues ensured: newsletter-send, ...
[worker] scheduled outreach-process every 5 min
[worker] all handlers registered — waiting for jobs
```

Missing env vars cause loud boot failures — check worker logs first.

---

## Scaling

- Default: **1 worker replica** (pg-boss coordinates via Postgres).
- Horizontal scale: increase worker replicas in Railway; pg-boss prevents double-processing.
- Concurrency tuned in `scripts/worker.ts` via pg-boss `teamSize` / polling interval.

---

## Cloudflare + Cal.com checklist

- [ ] `hooks.__YOUR_DOMAIN__` CNAME → Railway (DNS only / grey cloud)
- [ ] Cal.com subscriber URL → `https://hooks.__YOUR_DOMAIN__/api/webhooks/cal`
- [ ] `CAL_WEBHOOK_SECRET` matches Cal.com webhook config
- [ ] Test booking moves deal to Meeting Booked

---

## Related docs

- [`guides/fork-and-customize.md`](../guides/fork-and-customize.md)
- [`guides/local-development.md`](../guides/local-development.md)

---

## Changelog

- v1.0 (2026-05) — Initial deployment guide.
