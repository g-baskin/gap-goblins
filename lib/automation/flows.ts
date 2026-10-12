import { and, count, desc, eq, isNull, or, sql } from "drizzle-orm";
import {
  automationEnrollments,
  automationFlows,
  automationSends,
  automationSteps,
} from "@/lib/db/schema";
import { db } from "@/lib/db/worker";
import type { AutomationFlowStatus, AutomationTriggerType } from "./types";

export interface AutomationFlowInput {
  name: string;
  description?: string | null;
  status?: AutomationFlowStatus;
  triggerType: AutomationTriggerType;
  audienceFilter?: unknown;
  fromName?: string | null;
  fromEmail?: string | null;
  replyTo?: string | null;
  trackOpens?: boolean;
  trackClicks?: boolean;
  stopOnUnsubscribe?: boolean;
  stopOnBounce?: boolean;
  stopOnComplaint?: boolean;
  conversionRules?: unknown;
}

export interface AutomationFlowListItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  triggerType: string;
  stepCount: number;
  activeEnrollments: number;
  emailsSent: number;
  opened: number;
  clicked: number;
  updatedAt: string;
}

export type AutomationFlow = typeof automationFlows.$inferSelect;

export async function listAutomationFlows(tenantId: string): Promise<AutomationFlowListItem[]> {
  const flows = await db
    .select()
    .from(automationFlows)
    .where(or(eq(automationFlows.tenantId, tenantId), isNull(automationFlows.tenantId)))
    .orderBy(desc(automationFlows.updatedAt));

  const rows = await Promise.all(
    flows.map(async (flow) => {
      const [[stepCount], [activeEnrollments], [emailsSent], [opened], [clicked]] =
        await Promise.all([
          db
            .select({ value: count() })
            .from(automationSteps)
            .where(eq(automationSteps.flowId, flow.id)),
          db
            .select({ value: count() })
            .from(automationEnrollments)
            .where(
              and(
                eq(automationEnrollments.flowId, flow.id),
                eq(automationEnrollments.status, "active"),
              ),
            ),
          db
            .select({ value: count() })
            .from(automationSends)
            .where(
              and(eq(automationSends.flowId, flow.id), sql`${automationSends.sentAt} IS NOT NULL`),
            ),
          db
            .select({ value: count() })
            .from(automationSends)
            .where(
              and(
                eq(automationSends.flowId, flow.id),
                sql`${automationSends.openedAt} IS NOT NULL`,
              ),
            ),
          db
            .select({ value: count() })
            .from(automationSends)
            .where(
              and(
                eq(automationSends.flowId, flow.id),
                sql`${automationSends.firstClickAt} IS NOT NULL`,
              ),
            ),
        ]);

      return {
        id: flow.id,
        name: flow.name,
        description: flow.description,
        status: flow.status,
        triggerType: flow.triggerType,
        stepCount: stepCount?.value ?? 0,
        activeEnrollments: activeEnrollments?.value ?? 0,
        emailsSent: emailsSent?.value ?? 0,
        opened: opened?.value ?? 0,
        clicked: clicked?.value ?? 0,
        updatedAt: flow.updatedAt,
      };
    }),
  );

  return rows;
}

export async function getAutomationFlow(
  flowId: string,
  tenantId: string,
  includeUnassignedLegacy = true,
): Promise<AutomationFlow | null> {
  const tenantScope = includeUnassignedLegacy
    ? or(eq(automationFlows.tenantId, tenantId), isNull(automationFlows.tenantId))
    : eq(automationFlows.tenantId, tenantId);
  const [flow] = await db
    .select()
    .from(automationFlows)
    .where(and(eq(automationFlows.id, flowId), tenantScope))
    .limit(1);
  return flow ?? null;
}

export async function createAutomationFlow(
  input: AutomationFlowInput,
  userId: string,
  tenantId: string,
): Promise<AutomationFlow> {
  const now = new Date().toISOString();
  const [flow] = await db
    .insert(automationFlows)
    .values({
      tenantId,
      name: input.name,
      description: input.description ?? null,
      status: input.status ?? "draft",
      triggerType: input.triggerType,
      audienceFilter: input.audienceFilter ?? {},
      fromName: input.fromName ?? null,
      fromEmail: input.fromEmail ?? null,
      replyTo: input.replyTo ?? null,
      trackOpens: input.trackOpens ?? true,
      trackClicks: input.trackClicks ?? true,
      stopOnUnsubscribe: input.stopOnUnsubscribe ?? true,
      stopOnBounce: input.stopOnBounce ?? true,
      stopOnComplaint: input.stopOnComplaint ?? true,
      conversionRules: input.conversionRules ?? [],
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!flow) {
    throw new Error("Failed to create automation flow");
  }

  return flow;
}

export async function updateAutomationFlow(
  flowId: string,
  tenantId: string,
  input: Partial<AutomationFlowInput>,
): Promise<AutomationFlow | null> {
  const [flow] = await db
    .update(automationFlows)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.triggerType !== undefined ? { triggerType: input.triggerType } : {}),
      ...(input.audienceFilter !== undefined ? { audienceFilter: input.audienceFilter } : {}),
      ...(input.fromName !== undefined ? { fromName: input.fromName } : {}),
      ...(input.fromEmail !== undefined ? { fromEmail: input.fromEmail } : {}),
      ...(input.replyTo !== undefined ? { replyTo: input.replyTo } : {}),
      ...(input.trackOpens !== undefined ? { trackOpens: input.trackOpens } : {}),
      ...(input.trackClicks !== undefined ? { trackClicks: input.trackClicks } : {}),
      ...(input.stopOnUnsubscribe !== undefined
        ? { stopOnUnsubscribe: input.stopOnUnsubscribe }
        : {}),
      ...(input.stopOnBounce !== undefined ? { stopOnBounce: input.stopOnBounce } : {}),
      ...(input.stopOnComplaint !== undefined ? { stopOnComplaint: input.stopOnComplaint } : {}),
      ...(input.conversionRules !== undefined ? { conversionRules: input.conversionRules } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(automationFlows.id, flowId),
        or(eq(automationFlows.tenantId, tenantId), isNull(automationFlows.tenantId)),
      ),
    )
    .returning();

  return flow ?? null;
}

export async function archiveAutomationFlow(
  flowId: string,
  tenantId: string,
): Promise<AutomationFlow | null> {
  return setAutomationFlowStatus(flowId, "archived", tenantId, true);
}

export async function pauseAutomationFlow(
  flowId: string,
  tenantId: string,
): Promise<AutomationFlow | null> {
  return setAutomationFlowStatus(flowId, "paused", tenantId, true);
}

export async function activateAutomationFlow(
  flowId: string,
  tenantId: string,
): Promise<AutomationFlow | null> {
  const [flow] = await db
    .select()
    .from(automationFlows)
    .where(and(eq(automationFlows.id, flowId), eq(automationFlows.tenantId, tenantId)))
    .limit(1);
  if (!flow) return null;
  if (flow.executionMode === "graph") {
    if (!flow.publishedRevisionId) {
      throw new Error("Graph workflow requires a published revision and explicit tenant");
    }
    return setAutomationFlowStatus(flowId, "active", tenantId);
  }
  const [stepCount] = await db
    .select({ value: count() })
    .from(automationSteps)
    .where(eq(automationSteps.flowId, flowId));

  if ((stepCount?.value ?? 0) < 1) {
    throw new Error("Automation flow must have at least one step before activation");
  }

  return setAutomationFlowStatus(flowId, "active", tenantId);
}

async function setAutomationFlowStatus(
  flowId: string,
  status: AutomationFlowStatus,
  tenantId: string,
  includeUnassignedLegacy = false,
): Promise<AutomationFlow | null> {
  const tenantScope = includeUnassignedLegacy
    ? or(eq(automationFlows.tenantId, tenantId), isNull(automationFlows.tenantId))
    : eq(automationFlows.tenantId, tenantId);
  const [flow] = await db
    .update(automationFlows)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(and(eq(automationFlows.id, flowId), tenantScope))
    .returning();

  return flow ?? null;
}
