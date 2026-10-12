import { and, eq } from "drizzle-orm";
import { contacts, contactTimeline, deals, pipelines, stages } from "@/lib/db/schema";
import type { ActionDatabase, ActionExecutionContext, ActionExecutionResult } from "./types";

export async function createPipelineDeal(
  database: ActionDatabase,
  context: ActionExecutionContext,
  values: { pipelineId: string; stageId: string; name: string; amount?: number },
): Promise<ActionExecutionResult> {
  const [[contact], [stage]] = await Promise.all([
    database
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.id, context.contactId), eq(contacts.tenantId, context.tenantId)))
      .limit(1),
    database
      .select({ id: stages.id, pipelineId: stages.pipelineId })
      .from(stages)
      .innerJoin(
        pipelines,
        and(eq(pipelines.id, stages.pipelineId), eq(pipelines.tenantId, context.tenantId)),
      )
      .where(
        and(
          eq(stages.id, values.stageId),
          eq(stages.pipelineId, values.pipelineId),
          eq(stages.tenantId, context.tenantId),
        ),
      )
      .limit(1),
  ]);
  if (!contact || !stage) throw new Error("Contact, pipeline, or stage not found in tenant");

  const now = (context.now ?? new Date()).toISOString();
  const [deal] = await database
    .insert(deals)
    .values({
      tenantId: context.tenantId,
      contactId: contact.id,
      stageId: stage.id,
      name: values.name,
      amount: values.amount,
      source: "automation",
      status: "open",
      stageEnteredAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: deals.id });
  if (!deal) throw new Error("Deal was not created");
  await database.insert(contactTimeline).values({
    tenantId: context.tenantId,
    contactId: contact.id,
    pipelineId: stage.pipelineId,
    stageId: stage.id,
    eventType: "deal_created",
    title: "Deal created by automation",
    metadata: { dealId: deal.id, enrollmentId: context.enrollmentId, runId: context.runId },
    createdAt: now,
  });
  return { state: "succeeded", output: { dealId: deal.id, stageId: stage.id } };
}

export async function movePipelineDeal(
  database: ActionDatabase,
  context: ActionExecutionContext,
  values: { dealId?: string; stageId: string },
): Promise<ActionExecutionResult> {
  const dealId = values.dealId ?? context.dealId;
  if (!dealId) throw new Error("A deal is required");
  const [[deal], [stage]] = await Promise.all([
    database
      .select({ id: deals.id, contactId: deals.contactId, oldStageId: deals.stageId })
      .from(deals)
      .where(and(eq(deals.id, dealId), eq(deals.tenantId, context.tenantId)))
      .limit(1),
    database
      .select({ id: stages.id, pipelineId: stages.pipelineId })
      .from(stages)
      .innerJoin(
        pipelines,
        and(eq(pipelines.id, stages.pipelineId), eq(pipelines.tenantId, context.tenantId)),
      )
      .where(and(eq(stages.id, values.stageId), eq(stages.tenantId, context.tenantId)))
      .limit(1),
  ]);
  if (!deal || !stage || deal.contactId !== context.contactId) {
    throw new Error("Deal or stage not found for contact in tenant");
  }
  const now = (context.now ?? new Date()).toISOString();
  const [updated] = await database
    .update(deals)
    .set({ stageId: stage.id, stageEnteredAt: now, updatedAt: now })
    .where(and(eq(deals.id, deal.id), eq(deals.tenantId, context.tenantId)))
    .returning({ id: deals.id });
  if (!updated) throw new Error("Deal was not moved");
  await database.insert(contactTimeline).values({
    tenantId: context.tenantId,
    contactId: deal.contactId,
    pipelineId: stage.pipelineId,
    oldStageId: deal.oldStageId,
    stageId: stage.id,
    eventType: "deal_stage_changed",
    title: "Deal moved by automation",
    metadata: { dealId: deal.id, enrollmentId: context.enrollmentId, runId: context.runId },
    createdAt: now,
  });
  return { state: "succeeded", output: { dealId: deal.id, stageId: stage.id } };
}
