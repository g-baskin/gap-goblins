# library/requirements/issues/

One folder per GitHub issue. Inside each folder: the issue requirement doc (IRD) — the implementation plan — plus a `reports/` subfolder for QA reports and other adjacent artifacts. The GitHub issue itself is the canonical statement of the problem.

## Folder + filename

```
issue-<###>-<kebab-title>/
├── ird-issue-<###>-<kebab-title>.md
└── reports/
    └── <date>-qa-report.md      # written by quality-guardian after implementation
```

> **Note on the `ird-` prefix.** The folder is `issue-<###>-<title>/`; the document inside gains an `ird-` prefix (`ird-issue-<###>-<title>.md`) so the document type is unambiguous in indexes, drift reports, and grep output. This mirrors the `prd-` prefix on feature documents.

- `<###>` = the GitHub issue number, **zero-padded to 3 digits**.
  - `#6` → `issue-006-<title>/`
  - `#46` → `issue-046-<title>/`
  - `#100` → `issue-100-<title>/`
  - `#1234` → `issue-1234-<title>/` (natural width for 4+ digits)
- `<kebab-title>` = lowercase, hyphen-separated, ≤60 chars, derived from the issue title.

## Folder lifecycle

- **`issues/issue-<###>-<title>/`** = GitHub issue is OPEN (work in progress).
- **`issues/completed/issue-<###>-<title>/`** = GitHub issue is CLOSED + RESOLVED. Move the entire folder (IRD + `reports/` + adjacent artifacts) when work lands. This mirrors the feature lifecycle.

When the issue is resolved, `git mv` the folder and close the GitHub issue with a remark referencing the archived IRD path. Never split the IRD from its `reports/` history.

## Example

```markdown
# Issue #42: Password reset link expires too quickly

> **GitHub Issue #42** — Bug
>
> **Source:** https://app.example.com/login
> **Reporter:** Dana Kim (@danakim)
> **Reported via:** GitHub web

---

## Overview
<problem statement in 1 paragraph>

## Current state
<where the problem lives in the codebase, with file paths>

## Acceptance criteria
| ID | Criterion |
|---|---|
| AC-1 | Given X, when Y, then Z. |

## Proposed solution
<technical approach>

## Implementation plan
1. Step 1 — file
2. Step 2 — file
3. Tests

## Files touched
- `src/...`

## Out of scope
- ...

## Related
- [ird-issue-<###>-<title>.md](../issue-<###>-<title>/ird-issue-<###>-<title>.md)
```

See the bundled example at `.cursor/skills/library-weapon/examples/issue-042-example.md`.

## Workflow

The agent handles the full lifecycle:

1. **Ingest** — "ingest new issues" scans GitHub, creates the issue folder + main file + empty `reports/` subfolder for any open issue that lacks one.
2. **Resolve** — when the IRD is implemented, `git mv` the folder to `issues/completed/` and close the GitHub issue. QA reports travel with the folder inside its `reports/` subfolder.
3. **Audit** — "run a sync audit" detects drift between GH state and folder structure (missing folders, missing `reports/` subfolders, orphans, misplaced folders between open and `completed/`).

## Invariants

- Every issue IRD folder matches a real GitHub issue.
- Every issue folder has a `reports/` subfolder (even when empty).
- No duplicate numbers.
- Every GH issue carries the `logged` label (indicates it has been ingested into an IRD).
- Every GH issue has an assignee per repo convention.

See the issue ingestion guide at `.cursor/skills/library-weapon/guides/02-issue.md` for full workflow.
