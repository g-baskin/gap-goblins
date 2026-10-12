# Fork and Customize

> Category: How-to Guide | Version: 1.0 | Date: May 2026 | Status: Active

Rebrand template-crm for your product: placeholder tokens, assets, Railway deploy, and Cloudflare DNS.

**Related:**
- [`HANDOFF.md`](../../../HANDOFF.md)
- [`architecture/deployment.md`](../architecture/deployment.md)
- [`guides/locked-business-rules.md`](locked-business-rules.md)

---

## Overview

The repo ships with intentional placeholder tokens. Replace them **before production** so emails, webhooks, and UI copy reference your brand.

---

## Step 1 — Fork / clone

Use your own GitHub repo. Keep `main` as deploy branch (project convention — no feature branches required).

---

## Step 2 — Replace placeholder tokens

Project-wide find-and-replace:

| Token | Replace with |
|---|---|
| `__YOUR_BRAND__` | Product name |
| `__YOUR_DOMAIN__` | Bare domain (`acme.com`) |
| `__YOUR_CAL_LINK__` | Full Cal.com URL |
| `__YOUR_SUPPORT_EMAIL__` | Support mailbox |
| `__YOUR_SECURITY_EMAIL__` | Security contact |
| `__YOUR_FROM_EMAIL__` | Default From address |
| `__SENDER_NAME__` | Outreach sender name (eval fixtures) |
| `__SENDER_FIRST_NAME__` | Sender first name |
| `__SENDER_EMAIL__` | Sender mailbox |
| `__SENDER_PHONE__` | Sender phone |

Verify nothing remains:

```bash
grep -rn "__YOUR_\|__SENDER_" --include="*.ts" --include="*.tsx" --include="*.md" .
```

---

## Step 3 — Branding assets

| File | Purpose |
|---|---|
| `public/logos/logo.svg` | Sidebar + login |
| `public/logos/logo.png` | Email templates |
| `public/favicon.png` | Browser favicon |
| `public/android-chrome-512x512.png` | PWA icon |

---

## Step 4 — Customize AI voice (optional)

Edit `lib/outreach/ai/reply-analyzer.ts` `SYSTEM_PROMPT` for your brand tone. Keep locked test invariants or update tests together:

```bash
bun scripts/eval-replies.ts
bun run test:run lib/outreach/ai/__tests__/reply-analyzer.test.ts
```

See [`locked-business-rules.md`](locked-business-rules.md).

---

## Step 5 — Railway production

1. Create Railway project + Postgres + Bucket + **website** + **worker** services.
2. Set config paths: `railway.json` (website), `railway.worker.json` (worker).
3. Wire env vars with `${{Postgres.DATABASE_URL}}` and `${{Bucket.*}}` references.
4. Push schema: `DATABASE_URL=<public-url> bun run db:push`
5. Seed: `bun run db:seed`
6. Create admin on production DB or run create-admin via shell.

Full step-by-step: [`HANDOFF.md`](../../../HANDOFF.md) §7.

---

## Step 6 — Cloudflare DNS

- Apex/www → Railway (orange cloud OK for admin traffic).
- **`hooks.yourdomain.com`** → Railway **grey cloud only** for Cal.com.
- Configure Resend domain + webhook URLs for production.

---

## Step 7 — External services

| Service | Setup |
|---|---|
| Resend | Domain verification, API key, webhook to `/api/outreach/webhooks/resend` |
| Anthropic | API key for reply analyzer + newsletter generation |
| Cal.com | Webhook to `https://hooks.yourdomain.com/api/webhooks/cal` |

---

## What stays locked

Do not change without reading docs + running tests:

- Cal.com webhook hostname pattern
- Outreach Reply-To = plain sender mailbox
- CRM stage promotion rules (Cal.com only → Meeting Booked)

---

## Changelog

- v1.0 (2026-05) — Initial fork guide.
