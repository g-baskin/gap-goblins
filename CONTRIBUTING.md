# Contributing

Gap Goblins uses Bun, Next.js, TypeScript, and PostgreSQL. Commits and releases are separate actions; do not assume inherited QA or production environments exist.

## Local setup

Follow [README Quick Start](README.md#quick-start) for the canonical sequence: pinned
runtime, frozen install, local env, bucket initialization, versioned migrations,
admin plus tenant membership, and local Chromium. Then run the clean-build gate.
The worker image's missing Chromium provisioning remains a production blocker.
See [HANDOFF.md](HANDOFF.md#manual-release-checklist) for deployment and recovery.

## Branches and pull requests

- Branch from `dev` once that branch exists remotely.
- Open feature and fix pull requests into `dev`.
- Release only with owner approval using the manual checklist; verify destination branches/environments rather than assuming a `qa` promotion path.
- Use Conventional Commit prefixes such as `feat:`, `fix:`, `docs:`, and `chore:`.
- Explain the problem, approach, verification, risk, and rollback in each pull request.
- Complete the repository security checklist when the change handles data or external input.

## Required checks

Run the checks relevant to your change before requesting review:

```bash
bun run lint
bun run format:check
bun run typecheck
bun run typecheck:worker
bun run test:run
```

Database changes must include the generated Drizzle migration and metadata. Never edit an applied migration.

## Security

Never commit credentials or real customer data. Report vulnerabilities privately using [SECURITY.md](SECURITY.md), not a public issue.
