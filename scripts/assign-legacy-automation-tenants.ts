import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  adminUsers,
  automationEnrollments,
  automationEvents,
  automationFlows,
  automationSends,
  automationTenantAssignmentAudits,
  contacts,
  contactTimeline,
  deals,
  newsletterSubscribers,
  pipelines,
  stages,
  tenants,
} from "../lib/db/schema";
import { closeWorkerDb, db } from "../lib/db/worker";

const assignmentSchema = z.object({
  tenantId: z.string().uuid(),
  flowIds: z.array(z.string().uuid()).default([]),
  contactIds: z.array(z.string().uuid()).default([]),
  subscriberIds: z.array(z.string().uuid()).default([]),
  pipelineIds: z.array(z.string().uuid()).default([]),
  dealIds: z.array(z.string().uuid()).default([]),
});
const manifestSchema = z.object({ assignments: z.array(assignmentSchema).min(1) });
type Assignment = z.infer<typeof assignmentSchema>;

type ResourceKind = Exclude<keyof Assignment, "tenantId">;
const resourceKinds: ResourceKind[] = [
  "flowIds",
  "contactIds",
  "subscriberIds",
  "pipelineIds",
  "dealIds",
];

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return value && !value.startsWith("--") ? value : undefined;
}

function assertNoDuplicateAssignments(assignments: Assignment[]) {
  for (const kind of resourceKinds) {
    const owners = new Map<string, string>();
    for (const assignment of assignments) {
      for (const id of assignment[kind]) {
        const owner = owners.get(id);
        if (owner && owner !== assignment.tenantId) {
          throw new Error(`${kind} resource ${id} is assigned to multiple tenants`);
        }
        owners.set(id, assignment.tenantId);
      }
    }
  }
}

function expectedTenant(
  assignments: Assignment[],
  kind: ResourceKind,
  id: string,
): string | undefined {
  return assignments.find((assignment) => assignment[kind].includes(id))?.tenantId;
}

function assertRowsExist(
  kind: string,
  requestedIds: string[],
  rows: Array<{ id: string; tenantId: string | null }>,
  tenantId: string,
) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const id of requestedIds) {
    const row = byId.get(id);
    if (!row) throw new Error(`${kind} ${id} does not exist`);
    if (row.tenantId && row.tenantId !== tenantId) {
      throw new Error(`${kind} ${id} already belongs to another tenant`);
    }
  }
}

async function validateAssignment(assignment: Assignment, assignments: Assignment[]) {
  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.id, assignment.tenantId))
    .limit(1);
  if (!tenant) throw new Error(`Tenant ${assignment.tenantId} does not exist`);

  const [flowRows, contactRows, subscriberRows, pipelineRows, dealRows, stageRows] =
    await Promise.all([
      assignment.flowIds.length
        ? db
            .select({ id: automationFlows.id, tenantId: automationFlows.tenantId })
            .from(automationFlows)
            .where(inArray(automationFlows.id, assignment.flowIds))
        : [],
      assignment.contactIds.length
        ? db
            .select({ id: contacts.id, tenantId: contacts.tenantId })
            .from(contacts)
            .where(inArray(contacts.id, assignment.contactIds))
        : [],
      assignment.subscriberIds.length
        ? db
            .select({ id: newsletterSubscribers.id, tenantId: newsletterSubscribers.tenantId })
            .from(newsletterSubscribers)
            .where(inArray(newsletterSubscribers.id, assignment.subscriberIds))
        : [],
      assignment.pipelineIds.length
        ? db
            .select({ id: pipelines.id, tenantId: pipelines.tenantId })
            .from(pipelines)
            .where(inArray(pipelines.id, assignment.pipelineIds))
        : [],
      assignment.dealIds.length
        ? db
            .select({
              id: deals.id,
              tenantId: deals.tenantId,
              contactId: deals.contactId,
              stageId: deals.stageId,
              pipelineId: stages.pipelineId,
              stageTenantId: stages.tenantId,
            })
            .from(deals)
            .innerJoin(stages, eq(stages.id, deals.stageId))
            .where(inArray(deals.id, assignment.dealIds))
        : [],
      assignment.pipelineIds.length
        ? db
            .select({ id: stages.id, tenantId: stages.tenantId, pipelineId: stages.pipelineId })
            .from(stages)
            .where(inArray(stages.pipelineId, assignment.pipelineIds))
        : [],
    ]);

  assertRowsExist("flow", assignment.flowIds, flowRows, assignment.tenantId);
  assertRowsExist("contact", assignment.contactIds, contactRows, assignment.tenantId);
  assertRowsExist("subscriber", assignment.subscriberIds, subscriberRows, assignment.tenantId);
  assertRowsExist("pipeline", assignment.pipelineIds, pipelineRows, assignment.tenantId);
  assertRowsExist("deal", assignment.dealIds, dealRows, assignment.tenantId);

  for (const deal of dealRows) {
    const contactOwner = expectedTenant(assignments, "contactIds", deal.contactId);
    const pipelineOwner = expectedTenant(assignments, "pipelineIds", deal.pipelineId);
    if (contactOwner !== assignment.tenantId || pipelineOwner !== assignment.tenantId) {
      throw new Error(`Deal ${deal.id} requires its contact and pipeline in the same assignment`);
    }
    if (deal.stageTenantId && deal.stageTenantId !== assignment.tenantId) {
      throw new Error(`Deal ${deal.id} stage belongs to another tenant`);
    }
  }

  const enrollments = assignment.flowIds.length
    ? await db
        .select({
          id: automationEnrollments.id,
          flowId: automationEnrollments.flowId,
          contactId: automationEnrollments.contactId,
          subscriberId: automationEnrollments.subscriberId,
          tenantId: automationEnrollments.tenantId,
        })
        .from(automationEnrollments)
        .where(inArray(automationEnrollments.flowId, assignment.flowIds))
    : [];
  for (const enrollment of enrollments) {
    if (enrollment.tenantId && enrollment.tenantId !== assignment.tenantId) {
      throw new Error(`Flow ${enrollment.flowId} has an enrollment owned elsewhere`);
    }
    if (
      enrollment.contactId &&
      expectedTenant(assignments, "contactIds", enrollment.contactId) !== assignment.tenantId
    ) {
      throw new Error(`Flow ${enrollment.flowId} references an unassigned contact`);
    }
    if (
      enrollment.subscriberId &&
      expectedTenant(assignments, "subscriberIds", enrollment.subscriberId) !== assignment.tenantId
    ) {
      throw new Error(`Flow ${enrollment.flowId} references an unassigned subscriber`);
    }
  }

  const [sendRows, eventRows, timelineRows] = await Promise.all([
    assignment.flowIds.length
      ? db
          .select({ id: automationSends.id, tenantId: automationSends.tenantId })
          .from(automationSends)
          .where(inArray(automationSends.flowId, assignment.flowIds))
      : [],
    assignment.flowIds.length
      ? db
          .select({ id: automationEvents.id, tenantId: automationEvents.tenantId })
          .from(automationEvents)
          .where(inArray(automationEvents.flowId, assignment.flowIds))
      : [],
    assignment.contactIds.length
      ? db
          .select({ id: contactTimeline.id, tenantId: contactTimeline.tenantId })
          .from(contactTimeline)
          .where(inArray(contactTimeline.contactId, assignment.contactIds))
      : [],
  ]);
  const derivedRows = [...enrollments, ...sendRows, ...eventRows, ...timelineRows];
  for (const row of derivedRows) {
    if (row.tenantId && row.tenantId !== assignment.tenantId) {
      throw new Error(`Derived resource ${row.id} already belongs to another tenant`);
    }
  }

  const allRows = [
    ...flowRows,
    ...contactRows,
    ...subscriberRows,
    ...pipelineRows,
    ...dealRows,
    ...stageRows,
    ...derivedRows,
  ];
  return {
    stageIds: stageRows.map((row) => row.id),
    enrollmentIds: enrollments.map((row) => row.id),
    sendIds: sendRows.map((row) => row.id),
    eventIds: eventRows.map((row) => row.id),
    timelineIds: timelineRows.map((row) => row.id),
    allAssigned: allRows.every((row) => row.tenantId === assignment.tenantId),
  };
}

async function applyAssignment(
  assignment: Assignment,
  derived: Awaited<ReturnType<typeof validateAssignment>>,
  actorId: string,
  manifestHash: string,
) {
  return db.transaction(async (tx) => {
    const counts: Record<string, number> = {};
    const update = async (kind: string, ids: string[], run: () => Promise<unknown[]>) => {
      counts[kind] = ids.length ? (await run()).length : 0;
    };
    await update("flows", assignment.flowIds, () =>
      tx
        .update(automationFlows)
        .set({ tenantId: assignment.tenantId })
        .where(
          and(inArray(automationFlows.id, assignment.flowIds), isNull(automationFlows.tenantId)),
        )
        .returning({ id: automationFlows.id }),
    );
    await update("contacts", assignment.contactIds, () =>
      tx
        .update(contacts)
        .set({ tenantId: assignment.tenantId })
        .where(and(inArray(contacts.id, assignment.contactIds), isNull(contacts.tenantId)))
        .returning({ id: contacts.id }),
    );
    await update("subscribers", assignment.subscriberIds, () =>
      tx
        .update(newsletterSubscribers)
        .set({ tenantId: assignment.tenantId })
        .where(
          and(
            inArray(newsletterSubscribers.id, assignment.subscriberIds),
            isNull(newsletterSubscribers.tenantId),
          ),
        )
        .returning({ id: newsletterSubscribers.id }),
    );
    await update("pipelines", assignment.pipelineIds, () =>
      tx
        .update(pipelines)
        .set({ tenantId: assignment.tenantId })
        .where(and(inArray(pipelines.id, assignment.pipelineIds), isNull(pipelines.tenantId)))
        .returning({ id: pipelines.id }),
    );
    await update("stages", derived.stageIds, () =>
      tx
        .update(stages)
        .set({ tenantId: assignment.tenantId })
        .where(and(inArray(stages.id, derived.stageIds), isNull(stages.tenantId)))
        .returning({ id: stages.id }),
    );
    await update("deals", assignment.dealIds, () =>
      tx
        .update(deals)
        .set({ tenantId: assignment.tenantId })
        .where(and(inArray(deals.id, assignment.dealIds), isNull(deals.tenantId)))
        .returning({ id: deals.id }),
    );
    await update("enrollments", derived.enrollmentIds, () =>
      tx
        .update(automationEnrollments)
        .set({ tenantId: assignment.tenantId })
        .where(
          and(
            inArray(automationEnrollments.id, derived.enrollmentIds),
            isNull(automationEnrollments.tenantId),
          ),
        )
        .returning({ id: automationEnrollments.id }),
    );
    await update("sends", derived.sendIds, () =>
      tx
        .update(automationSends)
        .set({ tenantId: assignment.tenantId })
        .where(and(inArray(automationSends.id, derived.sendIds), isNull(automationSends.tenantId)))
        .returning({ id: automationSends.id }),
    );
    await update("events", derived.eventIds, () =>
      tx
        .update(automationEvents)
        .set({ tenantId: assignment.tenantId })
        .where(
          and(inArray(automationEvents.id, derived.eventIds), isNull(automationEvents.tenantId)),
        )
        .returning({ id: automationEvents.id }),
    );
    await update("timeline", derived.timelineIds, () =>
      tx
        .update(contactTimeline)
        .set({ tenantId: assignment.tenantId })
        .where(
          and(inArray(contactTimeline.id, derived.timelineIds), isNull(contactTimeline.tenantId)),
        )
        .returning({ id: contactTimeline.id }),
    );

    await tx.insert(automationTenantAssignmentAudits).values({
      manifestHash,
      actorId,
      resourceCounts: { tenantId: assignment.tenantId, ...counts },
      outcome: `applied:${assignment.tenantId}`,
      completedAt: new Date().toISOString(),
    });
    return counts;
  });
}

async function main() {
  const manifestPath = flag("manifest");
  const actorId = flag("actor-user-id");
  const apply = process.argv.includes("--apply");
  const verifyOnly = process.argv.includes("--verify-only");
  if (!manifestPath) throw new Error("Missing required --manifest");
  if (apply === verifyOnly && apply) throw new Error("Choose either --apply or --verify-only");

  const raw = await readFile(manifestPath, "utf8");
  const manifest = manifestSchema.parse(JSON.parse(raw));
  const manifestHash = createHash("sha256").update(raw).digest("hex");
  assertNoDuplicateAssignments(manifest.assignments);

  const validated: Array<Awaited<ReturnType<typeof validateAssignment>>> = [];
  for (const assignment of manifest.assignments) {
    validated.push(await validateAssignment(assignment, manifest.assignments));
  }

  const preview = manifest.assignments.map((assignment, index) => ({
    ...assignment,
    derivedStageIds: validated[index]?.stageIds ?? [],
    derivedEnrollmentIds: validated[index]?.enrollmentIds ?? [],
    derivedSendIds: validated[index]?.sendIds ?? [],
    derivedEventIds: validated[index]?.eventIds ?? [],
    derivedTimelineIds: validated[index]?.timelineIds ?? [],
  }));
  if (!apply) {
    console.log(
      JSON.stringify({ mode: verifyOnly ? "verify" : "dry-run", manifestHash, preview }, null, 2),
    );
    return;
  }
  if (!actorId) throw new Error("Missing required --actor-user-id for --apply");
  const [actor] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(and(eq(adminUsers.id, actorId), eq(adminUsers.isActive, true)))
    .limit(1);
  if (!actor) throw new Error("Active assignment actor not found");

  const results = [];
  for (let index = 0; index < manifest.assignments.length; index += 1) {
    const assignment = manifest.assignments[index];
    const derived = validated[index];
    if (!assignment || !derived) continue;
    if (derived.allAssigned) {
      const [existingAudit] = await db
        .select({ id: automationTenantAssignmentAudits.id })
        .from(automationTenantAssignmentAudits)
        .where(
          and(
            eq(automationTenantAssignmentAudits.manifestHash, manifestHash),
            eq(automationTenantAssignmentAudits.outcome, `applied:${assignment.tenantId}`),
          ),
        )
        .limit(1);
      if (existingAudit) {
        results.push({ tenantId: assignment.tenantId, idempotent: true });
        continue;
      }
    }
    results.push(await applyAssignment(assignment, derived, actor.id, manifestHash));
  }
  console.log(JSON.stringify({ mode: "apply", manifestHash, results }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Tenant assignment failed");
    process.exitCode = 1;
  })
  .finally(closeWorkerDb);
