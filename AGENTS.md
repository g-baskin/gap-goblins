# Coding agents

Read `CLAUDE.md` for project constraints and detailed agent behavior.

- Install: `bun install --frozen-lockfile` (Bun 1.3.14, Node 22).
- Build: `bun run build:verify` (isolated output; deployment uses `bun run build`).
- Test: `bun run test:run`.
- Lint and formatting: `bun run lint` and `bun run format:check`.
- Types: `bun run typecheck` and `bun run typecheck:worker`.

CI lives in `.github/workflows/ci.yml` and must stay green.
Never commit with `--no-verify`; fix hook failures instead.
