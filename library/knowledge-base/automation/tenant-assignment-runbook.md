# Legacy automation tenant assignment

This procedure assigns ownership only from an operator-reviewed manifest. Never infer tenants from domains, names, or existing relationships.

## Preconditions

- Back up the database and record the restore point.
- Identify an active admin user who will own the audit record.
- Create missing tenants explicitly with `scripts/create-tenant.ts`.
- Keep application code on the linear engine during assignment.

## 1. Create a tenant

```bash
bun scripts/create-tenant.ts \
  --slug example-company \
  --name "Example Company" \
  --admin-user-id 00000000-0000-0000-0000-000000000000
```

## 2. Prepare the manifest

```json
{
  "assignments": [
    {
      "tenantId": "00000000-0000-0000-0000-000000000000",
      "flowIds": [],
      "contactIds": [],
      "subscriberIds": [],
      "pipelineIds": [],
      "dealIds": []
    }
  ]
}
```

List every referenced contact, subscriber, pipeline, and deal. Pipeline stages are derived and printed. A deal is rejected unless its contact, pipeline, and stage close within one tenant.

## 3. Dry-run and review

```bash
bun scripts/assign-legacy-automation-tenants.ts --manifest ./tenant-assignments.json
```

Save the output. Confirm every resource identifier, derived stage, tenant, and manifest hash. Any missing, conflicting, duplicated, or cross-tenant resource stops the run.

## 4. Apply

```bash
bun scripts/assign-legacy-automation-tenants.ts \
  --manifest ./tenant-assignments.json \
  --actor-user-id 00000000-0000-0000-0000-000000000000 \
  --apply
```

Each tenant assignment commits transactionally. Updates only claim rows whose tenant is null. Existing matching ownership is idempotent; conflicting ownership is fatal. The command writes an assignment audit containing the manifest hash and counts.

## 5. Verify

```bash
bun scripts/assign-legacy-automation-tenants.ts \
  --manifest ./tenant-assignments.json \
  --verify-only
```

The verification output must match the approved manifest and every derived row. Re-running `--apply` must return `idempotent: true` without changing ownership.

## 6. Create draft graphs

```bash
bun scripts/backfill-automation-graphs.ts \
  --tenant-id 00000000-0000-0000-0000-000000000000 \
  --flow-ids 00000000-0000-0000-0000-000000000001
```

Review the default dry-run. Then append `--apply`. Conversion creates only a draft graph, keeps the workflow linear, preserves source step IDs, and never moves active enrollments. Publish later through the workflow builder after validation.
