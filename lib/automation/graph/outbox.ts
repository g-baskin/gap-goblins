import { and, asc, eq, isNull, lte } from "drizzle-orm";
import { automationDispatchOutbox, automationNodeRuns } from "@/lib/db/schema";
import { db } from "@/lib/db/worker";
import type { AutomationExecuteNodePayload } from "./executor";

export type GraphJobPublisher = (
  payload: AutomationExecuteNodePayload,
  options: { startAfter?: number },
) => Promise<string | null>;

export async function publishAutomationOutbox(
  publish: GraphJobPublisher,
  now = new Date(),
  limit = 100,
) {
  const rows = await db
    .select()
    .from(automationDispatchOutbox)
    .where(
      and(
        isNull(automationDispatchOutbox.publishedAt),
        isNull(automationDispatchOutbox.cancelledAt),
        lte(automationDispatchOutbox.availableAt, now.toISOString()),
      ),
    )
    .orderBy(asc(automationDispatchOutbox.availableAt))
    .limit(limit);
  let published = 0;
  for (const row of rows) {
    const startAfter = Math.max(0, new Date(row.availableAt).getTime() - Date.now());
    const jobId = await publish(
      {
        tenantId: row.tenantId,
        enrollmentId: row.enrollmentId,
        revisionId: row.revisionId,
        nodeKey: row.successorNodeKey,
        operationKey: row.operationKey,
      },
      startAfter > 0 ? { startAfter } : {},
    );
    if (!jobId) continue;
    const [marked] = await db
      .update(automationDispatchOutbox)
      .set({
        publishedAt: new Date().toISOString(),
        attempts: row.attempts + 1,
        terminalError: null,
      })
      .where(
        and(
          eq(automationDispatchOutbox.id, row.id),
          eq(automationDispatchOutbox.tenantId, row.tenantId),
          isNull(automationDispatchOutbox.publishedAt),
        ),
      )
      .returning({ id: automationDispatchOutbox.id });
    if (marked) published += 1;
  }
  return { found: rows.length, published };
}

export async function markOutboxPublishFailure(rowId: string, tenantId: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Queue publish failed";
  await db
    .update(automationDispatchOutbox)
    .set({ terminalError: message.slice(0, 2000) })
    .where(
      and(eq(automationDispatchOutbox.id, rowId), eq(automationDispatchOutbox.tenantId, tenantId)),
    );
}

export async function findUnsettledSuccessorDecisions(limit = 100) {
  return db
    .select({
      id: automationNodeRuns.id,
      tenantId: automationNodeRuns.tenantId,
      enrollmentId: automationNodeRuns.enrollmentId,
      nodeKey: automationNodeRuns.nodeKey,
    })
    .from(automationNodeRuns)
    .where(
      and(eq(automationNodeRuns.status, "succeeded"), isNull(automationNodeRuns.selectedOutput)),
    )
    .limit(limit);
}
