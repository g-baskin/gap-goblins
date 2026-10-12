import { asc, eq } from "drizzle-orm";
import { automationSteps } from "@/lib/db/schema";
import { db } from "@/lib/db/worker";
import type { AutomationDelayUnit, AutomationStepType } from "./types";

export interface AutomationStepInput {
  stepOrder?: number;
  stepType: AutomationStepType;
  name: string;
  subject?: string | null;
  bodyHtml?: string | null;
  bodyText?: string | null;
  delayAmount?: number;
  delayUnit?: AutomationDelayUnit;
  settings?: unknown;
}

export type AutomationStep = typeof automationSteps.$inferSelect;

export async function listAutomationSteps(flowId: string): Promise<AutomationStep[]> {
  return db
    .select()
    .from(automationSteps)
    .where(eq(automationSteps.flowId, flowId))
    .orderBy(asc(automationSteps.stepOrder));
}

export async function replaceAutomationSteps(
  flowId: string,
  steps: AutomationStepInput[],
): Promise<AutomationStep[]> {
  const now = new Date().toISOString();

  await db.delete(automationSteps).where(eq(automationSteps.flowId, flowId));

  if (steps.length === 0) {
    return [];
  }

  const inserted = await db
    .insert(automationSteps)
    .values(
      steps.map((step, index) => ({
        flowId,
        stepOrder: index + 1,
        stepType: step.stepType,
        name: step.name,
        subject: step.subject ?? null,
        bodyHtml: step.bodyHtml ?? null,
        bodyText: step.bodyText ?? null,
        delayAmount: step.delayAmount ?? 0,
        delayUnit: step.delayUnit ?? "minutes",
        settings: step.settings ?? {},
        createdAt: now,
        updatedAt: now,
      })),
    )
    .returning();

  return inserted.sort((a, b) => a.stepOrder - b.stepOrder);
}

export async function getNextAutomationStep(
  flowId: string,
  currentStepOrder: number,
): Promise<AutomationStep | null> {
  const steps = await listAutomationSteps(flowId);

  if (currentStepOrder <= 0) {
    return steps[0] ?? null;
  }

  return steps.find((candidate) => candidate.stepOrder > currentStepOrder) ?? null;
}

export function calculateStepRunAt(
  step: Pick<AutomationStep, "delayAmount" | "delayUnit">,
  baseDate: Date,
): Date {
  const delayAmount = Math.max(0, step.delayAmount ?? 0);
  const multiplier = getDelayUnitMs(step.delayUnit as AutomationDelayUnit);
  return new Date(baseDate.getTime() + delayAmount * multiplier);
}

function getDelayUnitMs(delayUnit: AutomationDelayUnit | string): number {
  switch (delayUnit) {
    case "days":
      return 24 * 60 * 60 * 1000;
    case "hours":
      return 60 * 60 * 1000;
    default:
      return 60 * 1000;
  }
}
