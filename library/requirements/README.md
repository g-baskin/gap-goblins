# library/requirements/

Lifecycle documentation — work that is planned, in progress, or recently completed. Organized by document type.

## Current Online CRM AI requirement

- [`Feature #010 — Omnichannel Conversations Foundation`](features/feature-010-omnichannel-conversations-foundation/prd-feature-010-omnichannel-conversations-foundation.md) — P0 plan for canonical tenant/contact/conversation ownership and the Phase 0 web chat, SMS, email, and voice timeline.

Features #001–#009 are retroactive records of inherited Template CRM capabilities. They remain useful implementation evidence but are not claims of Online CRM AI omnichannel completion.

## Structure

```
requirements/
├── README.md                                          # this file
├── issues/                                            # issue IRDs — tied to GitHub issues
│   ├── issue-<###>-<title>/
│   │   ├── ird-issue-<###>-<title>.md
│   │   └── reports/                                   # QA reports + adjacent artifacts
│   └── completed/                                     # resolved issue folders move here
└── features/                                          # feature PRDs — planned work, no GH issue required
    ├── feature-<###>-<title>/
    │   ├── prd-feature-<###>-<title>.md                   # or prd-feature-<###>-<title>-ck-<clickupId>.md if from ClickUp
    │   └── reports/                                   # QA reports + adjacent artifacts
    └── completed/                                     # shipped feature folders move here
```

QA reports tied to a feature or issue land in that doc's `reports/` subfolder. Standalone QA reports live in `library/qa/<domain>/<date>-qa-report.md` (one level up from `requirements/`). Authorship of all QA reports is owned by the `quality-guardian` agent.

## Document types

| Type | Folder | Main filename | Trigger |
|---|---|---|---|
| Issue IRD | `issues/issue-<###>-<title>/` | `ird-issue-<###>-<title>.md` | A GitHub issue exists; the team needs a plan to resolve it. |
| Feature PRD | `features/feature-<###>-<title>/` | `prd-feature-<###>-<title>.md` (or `prd-feature-<###>-<title>-ck-<clickupId>.md` if sourced from ClickUp) | Proactive planning; no GH issue required. |
| QA Report | `<feature-or-issue-folder>/reports/` or `library/qa/<domain>/` | `<date>-qa-report.md` | After any significant implementation; audits the plan. Authored by `quality-guardian`. |

See each subfolder's README for specifics.

## Numbering

- **3-digit zero-padded** (`006`, `046`, `100`). 4+ digit natural width.
- **Issue numbers follow GitHub.** Don't invent — the issue exists first, then the IRD folder.
- **Feature numbers are local sequential.** List existing folders (open + `completed/`), take `max + 1`.
- **No duplicate numbers** within a type.

## Lifecycle: open vs completed

Symmetric for both types: open work lives one level deeper, completed work lives under a sibling `completed/` tier.

- **`features/feature-<###>-<title>/`** = work in progress. The PRD has not yet shipped.
- **`features/completed/feature-<###>-<title>/`** = shipped. Move the entire folder (PRD + `reports/`) when work lands.
- **`issues/issue-<###>-<title>/`** = GitHub issue is OPEN. The IRD work is in progress.
- **`issues/completed/issue-<###>-<title>/`** = GitHub issue is CLOSED + RESOLVED. Move the entire folder (IRD + `reports/`) when the fix lands; close the GitHub issue with a remark referencing the archived path.

Move folders when state changes. The `library-worker-bee` enforces this invariant during its periodic audits.

## The agent

- "ingest new issues" — scans GitHub for open issues without IRDs; creates folder + main file + `reports/` in `issues/`.
- "write a PRD for <feature>" — adds folder + main file + `reports/` in `features/`.
- "write a QA report for <plan>" — handed off to `quality-worker-bee`, which writes into the matching `reports/` subfolder.
- "backwards-PRD <module>" — adds a retroactive `features/feature-<###>-<title>/`.
- "run a sync audit" — checks GitHub state vs folder state; reports drift.

## Related

- [`../README.md`](../README.md) — library overview
- [`../knowledge-base/standards/documentation-framework.md`](../knowledge-base/standards/documentation-framework.md) — writing rules
