# Automation failure and rollback runbook

## First response

1. Stop changing the affected workflow.
2. Record its tenant, flow, enrollment, revision, node, run, and operation identifiers.
3. Check the run timeline before retrying any external action.
4. Never retry an `unknown` provider outcome until the provider result is reconciled.

## Draft conflict

A `409` means another save won. Keep local edits visible. Reload only after copying needed local values; never overwrite the newer draft silently.

## Bad publication

Use **Roll back** in the workflow builder and choose a prior published revision. Rollback changes the pointer only for new enrollments. Existing enrollments remain pinned to their original revision.

If publication validation or its transaction fails, no pointer changes. Fix the draft and publish again.

## Worker or queue outage

Do not recreate enrollments. Successor work remains in `automation_dispatch_outbox`. Restore the worker, then run reconciliation. The publisher marks an outbox row only after pg-boss accepts its deduplicated job.

Confirm:

- unpublished outbox rows decrease;
- settled runs have a successor decision;
- operation keys do not execute twice;
- delayed wait nodes retain their intended availability time.

## Failed or dead-letter node

Use the run panel:

- **Retry** creates a new attempt while preserving the external idempotency key.
- **Skip** is allowed only for non-trigger, non-condition nodes and records the reason.
- **Cancel** ends the enrollment and cancels unpublished dispatches.

Never skip a condition or trigger. Never claim completed external effects were rolled back.

## Unknown external outcome

An unknown state means the request may have reached the provider. Automatic retries are disabled. Search the provider using the stored provider reference or idempotency key. Then make an explicit, audited admin decision. Keep provider secrets and full response bodies out of notes and logs.

## SMS incident

Disable the SMS channel account to fail closed. Confirm consent, DND, sender number, contact timezone, and quiet-hours configuration before restoring it. STOP remains effective until a verified START event is processed.

## Webhook incident

Disable the affected endpoint or secret reference. Preserve event IDs, body hashes, signature status, timestamps, and bounded response metadata. Rotate the referenced secret outside the database; never paste its value into an audit event.

## Application rollback

Deploy the previous application version. The migration is additive, so old code ignores graph tables and continues linear enrollments. Do not drop graph tables or columns. New graph enrollments pause until compatible workers return.

## Migration or assignment failure

Do not hand-edit partially assigned rows. Each assignment or graph conversion uses a bounded transaction. Correct the manifest, rerun dry-run, compare the manifest hash and counts, then rerun. Restore from backup only when database evidence contradicts the transactional result.
