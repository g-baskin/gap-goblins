# library/knowledge-base/

Durable reference documentation for **Online CRM AI**. Most documents currently describe the inherited Template CRM / `admin-platform` implementation and should be read as a starting-state inventory, not as the target product architecture. Requirements in flight live in `library/requirements/`; the first Online CRM AI plan is [`Feature #010 — Omnichannel Conversations Foundation`](../requirements/features/feature-010-omnichannel-conversations-foundation/prd-feature-010-omnichannel-conversations-foundation.md).

**Wiki entity pages** under `wiki/` are owned by `wiki-worker-bee` — do not edit them through routine library maintenance.

## Categories (populated)

| Folder | Purpose | Key docs |
|---|---|---|
| `architecture/` | System design, pipelines, deployment, accepted decisions | `system-overview.md`, `database-schema.md`, `crm-pipeline.md`, `decisions/README.md` |
| `database/` | Migrations policy, drift guard | `schema-and-migrations.md` |
| `api/` | HTTP API surface | `api-overview.md`, `routes-overview.md`, `crm-api.md`, `outreach-api.md` |
| `auth/` | Admin authentication | `admin-auth.md` |
| `outreach/` | Locked outreach/CRM reply rules | `pipeline-and-reply-flow.md` |
| `guides/` | Runbooks | `local-development.md`, `fork-and-customize.md`, `locked-business-rules.md` |
| `standards/` | Doc rules | `documentation-framework.md` |
| `wiki/` | Code entity wiki | `wiki-guardian` only |

Additional folders may be added per [`standards/documentation-framework.md`](standards/documentation-framework.md):

| Folder | Purpose | Audience |
|---|---|---|
| `how-to-guides/` | (alias — this repo uses `guides/`) | New engineers, DevOps |
| `integrations/` | Third-party service wiring (auth, errors, retry) | DevOps, integrators |
| `design/` | Visual language: tokens, components, patterns | Designers, frontend devs |
| `features/` | Completed feature reference (post-ship) | Any engineer joining the project |
| `specs/` | Handoff specs for UI flows | Frontend engineers |
| `product/` | Product vision, roadmap, scope | Team, stakeholders |
| `standards/` | Rules for how we write docs | All contributors |
| `releases/` | What changed in each release | All team members |

## Standards

All files here follow [`standards/documentation-framework.md`](standards/documentation-framework.md). Read it before adding or editing docs.

### TL;DR

- Filename: kebab-case, no numeric prefix (those are for `requirements/`).
- Every doc starts with the universal header (Title, Category, Version, Date, Status, one-line description, Related section).
- Ground every claim in code — quote source with file path + line range.
- One topic per document; split if over ~500 lines.
- Mermaid for diagrams; no explicit colors.
- Link out, don't duplicate.

## How to add a doc

Ask the agent:

```
document how authentication works
```

Or, for a specific category:

```
write an API reference for POST /api/users/me/export
```

The agent will consult the documentation framework, pick the right category, and write a doc that conforms to the standard.
