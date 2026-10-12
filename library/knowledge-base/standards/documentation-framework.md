# Documentation Framework

> Category: Standards | Version: 1.0 | Date: May 2026 | Status: Canonical

The single source of truth for how documentation is written in **template-crm** (`admin-platform`). Every document under `library/` must conform to these standards.

**Related:**
- [`library/README.md`](../../README.md)
- [`.cursor/skills/library-weapon/guides/01-knowledge-base.md`](../../../.cursor/skills/library-weapon/guides/01-knowledge-base.md)

---

## 1. Document Types

| Type | Purpose | Location | Primary audience |
|---|---|---|---|
| **Issue IRD** | Implementation plan for a GitHub issue | `library/requirements/issues/issue-<###>-<title>/ird-issue-<###>-<title>.md` | Implementation engineer |
| **Feature PRD** | Planned or retroactive feature spec | `library/requirements/features/feature-<###>-<title>/prd-feature-<###>-<title>.md` | Implementation engineer |
| **QA Report (tied)** | Audit against a plan | `<plan-folder>/reports/<date>-qa-report.md` | Team lead (authored by `quality-guardian`) |
| **QA Report (standalone)** | Broad audit | `library/qa/<domain>/<date>-qa-report.md` | Team lead |
| **Architecture Doc** | System design, data flows | `library/knowledge-base/architecture/` | Senior engineers |
| **API Reference** | Endpoint documentation | `library/knowledge-base/api/` | Full-stack devs |
| **How-to / Guide** | Runbooks | `library/knowledge-base/guides/` | New engineers, DevOps |
| **Standards Doc** | Rules for writing docs | `library/knowledge-base/standards/` | All contributors |
| **Wiki entity page** | Code entity extraction | `library/knowledge-base/wiki/` | Any engineer (`wiki-guardian` owns writes) |

### template-crm categories in use

| Folder | Topics |
|---|---|
| `architecture/` | Railway services, Drizzle schema, auth, queues, outreach/CRM/newsletter pipelines, storage, Cloudflare, deployment |
| `api/` | Admin, CRM, outreach, newsletter, webhooks, cron |
| `guides/` | Local dev, fork/customize, background jobs, locked business rules |

Do not create docs under `library/notes/` — that tree is human-only.

---

## 2. Universal Document Header (knowledge-base)

```markdown
# <Document Title>

> Category: <Type> | Version: <X.Y> | Date: <Month YYYY> | Status: <Active | Draft | Archived>

<One-sentence description.>

**Related:**
- [Link to related doc]
- [`path/to/source.ts`](../../../path/to/source.ts)
```

Requirements docs (PRDs, IRDs) use the PRD header format in [`05-backwards-prd.md`](../../../.cursor/skills/library-weapon/guides/05-backwards-prd.md).

---

## 3. Filename Conventions

| Document type | Pattern | Example |
|---|---|---|
| Issue IRD | `issue-<###>-<title>/ird-issue-<###>-<title>.md` | `issue-042-cal-webhook/ird-issue-042-cal-webhook.md` |
| Feature PRD | `feature-<###>-<title>/prd-feature-<###>-<title>.md` | `feature-001-crm-pipeline/prd-feature-001-crm-pipeline.md` |
| Knowledge-base | `<domain>/<kebab-slug>.md` | `architecture/system-overview.md` |
| QA report | `<date>-qa-report.md` | `2026-05-27-qa-report.md` |

- `<###>` is 3-digit zero-padded for features; issue numbers match GitHub.
- Titles: lowercase kebab-case, ≤60 chars.
- No numeric prefix on knowledge-base filenames.

---

## 4. Folder Lifecycle

| Location | Meaning |
|---|---|
| `requirements/features/feature-<###>-<title>/` | Feature in progress or documented retroactively while still “open” in docs |
| `requirements/features/completed/feature-<###>-<title>/` | Shipped and archived |
| `requirements/issues/issue-<###>-<title>/` | Open GitHub issue |
| `requirements/issues/completed/issue-<###>-<title>/` | Resolved issue |

Move entire folders when lifecycle changes — do not rely on frontmatter alone.

---

## 5. Writing Rules

1. **Ground claims in code** — cite repo-relative paths; use line ranges when helpful.
2. **One topic per document** — split around ~500 lines.
3. **Link, don't duplicate** — cross-link architecture ↔ API ↔ PRDs.
4. **Diagrams** — ASCII for simple flows in this repo's architecture docs; mermaid allowed per guide 01.
5. **Locked rules** — document in [`guides/locked-business-rules.md`](../guides/locked-business-rules.md) and reference from PRDs; never silently change without updating tests.

---

## 6. Cross-Linking

- Relative markdown links between `library/` docs.
- Code references: `` `lib/db/schema.ts` ``, `` `app/api/crm/contacts/route.ts` ``.
- Backwards-PRDs link to the knowledge-base docs they summarize.

---

## 7. Ownership

| Area | Owner |
|---|---|
| `library/knowledge-base/` (except wiki entity pages) | Team via PR; scaffolded by `library-guardian` |
| `library/knowledge-base/wiki/` entity pages | `wiki-guardian` |
| `library/requirements/` PRDs / IRDs | Implementation author + `library-guardian` |
| QA report content | `quality-guardian` |
| `library/notes/` | Human only — agents never write |

---

## Changelog

- v1.0 (2026-05) — Initialized for template-crm / admin-platform.
