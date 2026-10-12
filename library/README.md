# library/

Canonical documentation home for **Online CRM AI**. The package identifier remains the inherited `admin-platform` value until a separate implementation task changes application metadata.

## Project

Online CRM AI is a commercial, US-first CRM in development, beginning with a contact-centered omnichannel Conversations workspace. The repository inherits a functional Template CRM foundation—CRM pipeline, cold outreach, email inbox, newsletter engine, queues, auth, storage, and admin settings—but those inherited capabilities are not yet evidence of omnichannel completion or GoHighLevel parity.

The product architecture is provider-independent: Online CRM AI owns canonical tenant/contact/identity/thread/event/CRM/workflow data; Chatwoot Community Edition (MIT) is initially a headless messaging gateway behind adapters; voice is independently abstracted with Twilio first; Chatwoot Enterprise code is prohibited.

**Current product plan:** [`requirements/features/feature-010-omnichannel-conversations-foundation/`](requirements/features/feature-010-omnichannel-conversations-foundation/)

**Inherited stack:** Next.js 16 · React 19 · Bun · Drizzle ORM · PostgreSQL · pg-boss · NextAuth v5 · Resend · Railway · Cloudflare

## Structure

```
library/
├── README.md                          # this file
├── notes/                             # HUMAN ONLY — agents never write here
├── knowledge-base/                    # durable reference docs
│   ├── architecture/                  # system design, pipelines, deployment
│   ├── api/                           # HTTP API surface
│   ├── guides/                        # runbooks (local dev, fork, jobs, locked rules)
│   ├── standards/                     # documentation framework
│   └── wiki/                          # code entity pages (wiki-guardian owns content)
├── requirements/
│   └── features/                      # backwards-PRDs for shipped domains
└── qa/                                # standalone QA reports (quality-guardian authors)
```

## Start here

| If you need… | Read |
|---|---|
| System layout and data flow | [`knowledge-base/architecture/system-overview.md`](knowledge-base/architecture/system-overview.md) |
| Database tables and RPCs | [`knowledge-base/architecture/database-schema.md`](knowledge-base/architecture/database-schema.md) |
| Local setup | [`knowledge-base/guides/local-development.md`](knowledge-base/guides/local-development.md) |
| Fork and deploy | [`knowledge-base/guides/fork-and-customize.md`](knowledge-base/guides/fork-and-customize.md) |
| Locked business rules | [`knowledge-base/guides/locked-business-rules.md`](knowledge-base/guides/locked-business-rules.md) |
| Newsletter subscribe form | [`knowledge-base/guides/newsletter-subscribe-form.md`](knowledge-base/guides/newsletter-subscribe-form.md) |
| Cloudflare settings UI | [`knowledge-base/guides/cloudflare-settings-ui.md`](knowledge-base/guides/cloudflare-settings-ui.md) |
| API index | [`knowledge-base/api/api-overview.md`](knowledge-base/api/api-overview.md) |
| Current product foundation plan | [`requirements/features/feature-010-omnichannel-conversations-foundation/`](requirements/features/feature-010-omnichannel-conversations-foundation/) |
| Feature specs, including inherited capabilities | [`requirements/features/`](requirements/features/) |

## Repo source docs

- [`CLAUDE.md`](../CLAUDE.md) — agent conventions, locked patterns, anti-patterns
- [`HANDOFF.md`](../HANDOFF.md) — env vars, Railway deploy, placeholder tokens
- [`README.md`](../README.md) — quick start and project structure

## Standards

All knowledge-base docs follow [`knowledge-base/standards/documentation-framework.md`](knowledge-base/standards/documentation-framework.md).

Requirements docs follow naming in [`requirements/features/README.md`](requirements/features/README.md).

## The agent

Invoke `library-worker-bee` for: initialize library · ingest GitHub issues · write PRD · backwards-PRD · document topic · sync audit.

QA report authorship belongs to `quality-worker-bee`, not library-worker-bee.
