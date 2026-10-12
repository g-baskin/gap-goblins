# Disabled GitHub configuration

The owner does not pay for hosted CI, so the GitHub Actions workflows and the Dependabot config inherited from online-crm-ai were moved here (not deleted). GitHub ignores files outside `.github/`.

To re-enable: move `workflows/*.yml` back to `.github/workflows/` and `dependabot.yml` back to `.github/`.

Local gate (run before every commit):

```bash
bun run lint && bun run typecheck && bun run typecheck:worker && bun run test:run && bun run build
```
