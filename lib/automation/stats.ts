import { and, eq, sql } from "drizzle-orm";
import {
  automationEnrollments,
  automationFlows,
  automationSends,
  automationSteps,
} from "@/lib/db/schema";
import { db } from "@/lib/db/worker";

export interface AutomationDashboardStats {
  activeFlows: number;
  activeEnrollments: number;
  emailsSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bouncedOrComplained: number;
  conversions: number;
  clickThroughRate: number;
  hotContacts: number;
}

export interface AutomationFlowStats extends AutomationDashboardStats {
  flowId: string;
  steps: number;
  totalEnrollments: number;
}

export async function getAutomationDashboardStats(
  tenantId: string,
): Promise<AutomationDashboardStats> {
  const [
    [activeFlows],
    [activeEnrollments],
    [emailsSent],
    [delivered],
    [opened],
    [clicked],
    [bounced],
    [complained],
    [conversions],
    [hotContacts],
  ] = await Promise.all([
    countRows(
      automationFlows,
      and(eq(automationFlows.tenantId, tenantId), eq(automationFlows.status, "active")),
    ),
    countRows(
      automationEnrollments,
      and(eq(automationEnrollments.tenantId, tenantId), eq(automationEnrollments.status, "active")),
    ),
    countRows(
      automationSends,
      and(eq(automationSends.tenantId, tenantId), sql`${automationSends.sentAt} IS NOT NULL`),
    ),
    countRows(
      automationSends,
      and(eq(automationSends.tenantId, tenantId), sql`${automationSends.deliveredAt} IS NOT NULL`),
    ),
    countRows(
      automationSends,
      and(eq(automationSends.tenantId, tenantId), sql`${automationSends.openedAt} IS NOT NULL`),
    ),
    countRows(
      automationSends,
      and(eq(automationSends.tenantId, tenantId), sql`${automationSends.firstClickAt} IS NOT NULL`),
    ),
    countRows(
      automationSends,
      and(eq(automationSends.tenantId, tenantId), eq(automationSends.status, "bounced")),
    ),
    countRows(
      automationSends,
      and(eq(automationSends.tenantId, tenantId), eq(automationSends.status, "complained")),
    ),
    countRows(
      automationEnrollments,
      and(
        eq(automationEnrollments.tenantId, tenantId),
        eq(automationEnrollments.status, "converted"),
      ),
    ),
    countRows(
      automationEnrollments,
      and(
        eq(automationEnrollments.tenantId, tenantId),
        eq(automationEnrollments.engagementStage, "hot"),
      ),
    ),
  ]);

  const sent = activeNumber(emailsSent?.value);
  const clickCount = activeNumber(clicked?.value);

  return {
    activeFlows: activeNumber(activeFlows?.value),
    activeEnrollments: activeNumber(activeEnrollments?.value),
    emailsSent: sent,
    delivered: activeNumber(delivered?.value),
    opened: activeNumber(opened?.value),
    clicked: clickCount,
    bouncedOrComplained: activeNumber(bounced?.value) + activeNumber(complained?.value),
    conversions: activeNumber(conversions?.value),
    clickThroughRate: sent > 0 ? clickCount / sent : 0,
    hotContacts: activeNumber(hotContacts?.value),
  };
}

export async function getAutomationFlowStats(flowId: string): Promise<AutomationFlowStats> {
  const [
    [steps],
    [totalEnrollments],
    [activeEnrollments],
    [emailsSent],
    [delivered],
    [opened],
    [clicked],
    [bounced],
    [complained],
    [conversions],
    [hotContacts],
  ] = await Promise.all([
    countRows(automationSteps, eq(automationSteps.flowId, flowId)),
    countRows(automationEnrollments, eq(automationEnrollments.flowId, flowId)),
    countRows(
      automationEnrollments,
      and(eq(automationEnrollments.flowId, flowId), eq(automationEnrollments.status, "active")),
    ),
    countRows(
      automationSends,
      and(eq(automationSends.flowId, flowId), sql`${automationSends.sentAt} IS NOT NULL`),
    ),
    countRows(
      automationSends,
      and(eq(automationSends.flowId, flowId), sql`${automationSends.deliveredAt} IS NOT NULL`),
    ),
    countRows(
      automationSends,
      and(eq(automationSends.flowId, flowId), sql`${automationSends.openedAt} IS NOT NULL`),
    ),
    countRows(
      automationSends,
      and(eq(automationSends.flowId, flowId), sql`${automationSends.firstClickAt} IS NOT NULL`),
    ),
    countRows(
      automationSends,
      and(eq(automationSends.flowId, flowId), eq(automationSends.status, "bounced")),
    ),
    countRows(
      automationSends,
      and(eq(automationSends.flowId, flowId), eq(automationSends.status, "complained")),
    ),
    countRows(
      automationEnrollments,
      and(eq(automationEnrollments.flowId, flowId), eq(automationEnrollments.status, "converted")),
    ),
    countRows(
      automationEnrollments,
      and(
        eq(automationEnrollments.flowId, flowId),
        eq(automationEnrollments.engagementStage, "hot"),
      ),
    ),
  ]);

  const sent = activeNumber(emailsSent?.value);
  const clickCount = activeNumber(clicked?.value);

  return {
    flowId,
    steps: activeNumber(steps?.value),
    totalEnrollments: activeNumber(totalEnrollments?.value),
    activeFlows: 0,
    activeEnrollments: activeNumber(activeEnrollments?.value),
    emailsSent: sent,
    delivered: activeNumber(delivered?.value),
    opened: activeNumber(opened?.value),
    clicked: clickCount,
    bouncedOrComplained: activeNumber(bounced?.value) + activeNumber(complained?.value),
    conversions: activeNumber(conversions?.value),
    clickThroughRate: sent > 0 ? clickCount / sent : 0,
    hotContacts: activeNumber(hotContacts?.value),
  };
}

function countRows<TTable>(table: TTable, where: unknown): Promise<Array<{ value: number }>> {
  return db
    .select({ value: sql<number>`count(*)::int` })
    .from(table as never)
    .where(where as never);
}

function activeNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}
