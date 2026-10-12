# Contributing

Online CRM AI uses Bun, Next.js, TypeScript, and PostgreSQL. Keep changes focused and preserve the documented `dev` → `qa` → `main` promotion flow.

## Local setup

1. Install Bun 1.3.14, Node.js 22, and Docker Desktop.
2. Run `bun install --frozen-lockfile`.
3. Copy `.env.example` to `.env.local` and provide local-only values.
4. Run `docker compose up -d postgres minio`.
5. Run `bun run db:migrate` and `bun run db:seed`.
6. Start the app with `bun run dev`.

See [HANDOFF.md](HANDOFF.md) for full environment and deployment guidance.

## Branches and pull requests

- Branch from `dev` once that branch exists remotely.
- Open feature and fix pull requests into `dev`.
- Promote releases through `dev` → `qa` → `main`.
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
