/**
 * Typed enqueue functions for all pg-boss queues.
 *
 * server-only — never import in Client Components or edge runtime.
 */

import "server-only";
import type { AutomationExecuteNodePayload } from "@/lib/automation/graph/executor";
import type { AutomationSendStepPayload } from "@/lib/automation/types";
import type { LeadReportJobPayload } from "@/lib/lead-finder/report-service";
import type { LeadScanJobPayload } from "@/lib/lead-finder/scan-runner";
import type {
  CleanupWorkflowPayload,
  CurateWorkflowPayload,
  PublishWorkflowPayload,
  SendWorkflowPayload,
} from "@/lib/newsletter/lib/queue/types";
import { getBoss } from "./client";

// ---------------------------------------------------------------------------
// Queue names (single source of truth)
// ---------------------------------------------------------------------------

export const QUEUE = {
  NEWSLETTER_SEND: "newsletter-send",
  NEWSLETTER_CURATE: "newsletter-curate",
  NEWSLETTER_PUBLISH: "newsletter-publish",
  NEWSLETTER_CLEANUP: "newsletter-cleanup",
  OUTREACH_SEND_EMAIL: "outreach-send-email",
  AUTOMATION_SEND_STEP: "automation-send-step",
  AUTOMATION_EXECUTE_NODE: "automation-execute-node",
  AUTOMATION_RECONCILE: "automation-reconcile",
  LEAD_SCAN_RUN: "lead-scan.run",
  LEAD_REPORT_GENERATE: "lead-report.generate",
} as const;

// ---------------------------------------------------------------------------
// Outreach payload
// ---------------------------------------------------------------------------

export interface OutreachSendEmailPayload {
  contactId: string;
  campaignId: string;
  emailNumber: 1 | 2 | 3;
  unsubscribeUrl: string;
  forceTextOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Enqueue functions
// ---------------------------------------------------------------------------

export async function enqueueNewsletterSend(payload: SendWorkflowPayload): Promise<string | null> {
  const boss = await getBoss();
  return boss.send(QUEUE.NEWSLETTER_SEND, payload, {
    retryLimit: 2,
    retryDelay: 60,
    expireInSeconds: 900,
  });
}

export async function enqueueNewsletterCurate(
  payload: CurateWorkflowPayload,
): Promise<string | null> {
  const boss = await getBoss();
  return boss.send(QUEUE.NEWSLETTER_CURATE, payload, {
    retryLimit: 2,
    retryDelay: 60,
    expireInSeconds: 900,
  });
}

export async function enqueueNewsletterPublish(
  payload: PublishWorkflowPayload,
): Promise<string | null> {
  const boss = await getBoss();
  return boss.send(QUEUE.NEWSLETTER_PUBLISH, payload, {
    retryLimit: 2,
    retryDelay: 60,
    expireInSeconds: 1800,
  });
}

export async function enqueueNewsletterCleanup(
  payload: CleanupWorkflowPayload,
): Promise<string | null> {
  const boss = await getBoss();
  return boss.send(QUEUE.NEWSLETTER_CLEANUP, payload, {
    retryLimit: 1,
    retryDelay: 120,
    expireInSeconds: 3600,
  });
}

export async function enqueueOutreachSendEmail(
  payload: OutreachSendEmailPayload,
  options?: { startAfter?: number },
): Promise<string | null> {
  const boss = await getBoss();
  return boss.send(QUEUE.OUTREACH_SEND_EMAIL, payload, {
    retryLimit: 2,
    retryDelay: 60,
    expireInSeconds: 600,
    ...(options?.startAfter != null && { startAfter: options.startAfter }),
  });
}

export async function enqueueAutomationExecuteNode(
  payload: AutomationExecuteNodePayload,
  options?: { startAfter?: number },
): Promise<string | null> {
  const boss = await getBoss();
  return boss.send(QUEUE.AUTOMATION_EXECUTE_NODE, payload, {
    retryLimit: 2,
    retryDelay: 30,
    retryBackoff: true,
    expireInSeconds: 900,
    singletonKey: payload.operationKey,
    ...(options?.startAfter != null && { startAfter: options.startAfter }),
  });
}

export async function enqueueAutomationSendStep(
  payload: AutomationSendStepPayload,
  options?: { startAfter?: number },
): Promise<string | null> {
  const boss = await getBoss();
  return boss.send(QUEUE.AUTOMATION_SEND_STEP, payload, {
    retryLimit: 2,
    retryDelay: 60,
    expireInSeconds: 900,
    singletonKey: payload.enrollmentId,
    ...(options?.startAfter != null && { startAfter: options.startAfter }),
  });
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export async function getQueueHealth(): Promise<{
  healthy: boolean;
  issues: string[];
}> {
  try {
    const boss = await getBoss();
    // pg-boss exposes getQueueSize; if it returns without error the DB connection is alive
    await boss.getQueueStats(QUEUE.NEWSLETTER_SEND);
    return { healthy: true, issues: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { healthy: false, issues: [`pg-boss health check failed: ${message}`] };
  }
}

// ---------------------------------------------------------------------------
// Gap Goblins: Lead Finder
// ---------------------------------------------------------------------------

export async function enqueueLeadScan(payload: LeadScanJobPayload): Promise<string | null> {
  const boss = await getBoss();
  await boss.createQueue(QUEUE.LEAD_SCAN_RUN);
  return boss.send(QUEUE.LEAD_SCAN_RUN, payload, {
    retryLimit: 1,
    retryDelay: 30,
    expireInSeconds: 1800,
    singletonKey: `lead-scan:${payload.scanId}`,
  });
}

export async function enqueueLeadReport(payload: LeadReportJobPayload): Promise<string | null> {
  const boss = await getBoss();
  await boss.createQueue(QUEUE.LEAD_REPORT_GENERATE);
  return boss.send(QUEUE.LEAD_REPORT_GENERATE, payload, {
    retryLimit: 2,
    retryDelay: 30,
    expireInSeconds: 600,
  });
}
