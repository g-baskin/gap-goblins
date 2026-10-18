---
name: commit
description: Run Gap Goblins checks and review the staged changes before a local commit
---

# Gap Goblins commit gate

This command authorizes a local commit only. Do not push, merge, switch branches,
promote releases, deploy, or alter Railway configuration. Those actions require
separate explicit owner authorization and verified project targets.

## 1. Establish the intended change

- Read `git status --short --branch`, `git diff --stat`, `git diff --cached --stat`,
  and the relevant staged and unstaged diffs. Inspect intended untracked files too.
- Identify exactly which files/hunks belong to the requested commit. Leave unrelated
  work alone; if the staged set is ambiguous, ask before changing it.
- Stay on the current branch. Never stash, discard, amend, or rewrite history as a
  shortcut. If there is nothing to commit, stop.

## 2. Prepare migrations before checks

When database schema changes require a migration, use the existing `bun run db:generate`
script. Drizzle output belongs in `lib/db/drizzle/`, including SQL and `meta/` changes,
not a root `drizzle/` directory. Inspect all generated changes before including them.
Preserve additive migrations and tenant constraints. Do not run `db:push` or apply
migrations to production as part of committing.

## 3. Run the local gate

Run these checks in order, stopping at the first failure:

```bash
bun run lint && bun run typecheck && bun run typecheck:worker && bun run test:run && bun run build
```

All five must finish successfully before committing. Missing tools, failed commands,
or unavailable required test infrastructure block the commit; report the blocker.
Report skipped tests and their scope rather than treating them as executed coverage.
Do not install dependencies, suppress checks, weaken assertions, or make unrelated
fixes to obtain a pass. Obtain any needed owner authorization separately.
If a fix or generated change alters the candidate after checks, rerun the gate.

## 4. Stage and review the final candidate

Stage only the agreed files/hunks; do not use blanket `git add -A`. Inspect
`git diff --cached --stat`, `git diff --cached`, and `git diff --cached --check`.
The whitespace check must pass.

Perform a correctness review, not just a diff listing:

- Check intended behavior, error handling, regression coverage, and accidental changes.
- Check authentication, tenant isolation, input handling, report escaping/storage
  boundaries, and migration safety where affected.
- Check for credentials, private data, `.env` files and unintended generated output.
  Never print secret values in the review. Use clearly fake fixture credentials;
  do not bypass secret scanners or commit known credential-shaped values.
- Confirm no unrelated staged changes and that the reviewed candidate matches the
  code checked above. If unstaged code affects verification of the staged subset,
  stop and resolve the scope with the owner rather than claiming it was tested.

State the review outcome and check results before committing. Unresolved correctness
or security findings block the commit; fix within scope and repeat checks/review.

## 5. Commit locally, with hooks enabled

Use a concise conventional commit message describing what changed and why.
Run `git commit -m "message"` only after the gate and review pass.
Never use `--no-verify` or disable Husky. The hook runs lint-staged with Biome write
mode and a staged secret-pattern scan; it does not replace the full gate or review.
If the hook fails or changes the candidate, inspect the result and repeat the gate
and review before retrying. Do not automatically amend a successful commit.

After success, inspect `git show --stat --oneline HEAD` and `git status --short`.
Confirm the committed patch matches the reviewed candidate; if hooks altered it,
report the mismatch and re-check before declaring it verified. Report the local
commit and remaining working-tree changes. Stop here: no push or release actions.
