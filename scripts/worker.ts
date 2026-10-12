/**
 * pg-boss worker process
 *
 * Start with: bun scripts/worker.ts
 *
 * Registers handlers for all queues and keeps the process alive.
 * Needs: DATABASE_URL, RESEND_API_KEY, ANTHROPIC_API_KEY,
 *        NEXT_PUBLIC_SITE_URL, UNSUBSCRIBE_SECRET,
 *        DEFAULT_FROM_EMAIL, NEWSLETTER_FROM_EMAIL
 */

import "../lib/env-worker"; // loads .env.local if present (no-op in production)
import type { Job, JobWithMetadata } from "pg-boss";
import { PgBoss } from "pg-boss";
import { Resend } from "resend";
import { createEmailExternalHandler } from "../lib/automation/email/service";
import {
  type AutomationExecuteNodePayload,
  executeGraphNode,
} from "../lib/automation/graph/executor";
import { publishAutomationOutbox } from "../lib/automation/graph/outbox";
import { markNodeDeadLetter } from "../lib/automation/graph/recovery";
import { sendAutomationStep } from "../lib/automation/sender";
import { resolveConfiguredSmsProvider } from "../lib/automation/sms/provider-resolver";
import { createSmsExternalHandler } from "../lib/automation/sms/service";
import type { AutomationSendStepPayload } from "../lib/automation/types";
import { createOutboundWebhookHandler } from "../lib/automation/webhooks/outbound";
import {
  OUTREACH_BATCH_SIZE,
  OUTREACH_DEFAULT_TIMEZONE,
  OUTREACH_DOMAIN_THROTTLE_DELAY_MINUTES,
  OUTREACH_MAX_EMAILS_PER_DOMAIN_PER_HOUR,
} from "../lib/constants";
import { processCleanupJob } from "../lib/newsletter/lib/queue/jobs/cleanup-job";
// Job processors
import { processCurateJob } from "../lib/newsletter/lib/queue/jobs/curate-job";
import { processGenerateJob } from "../lib/newsletter/lib/queue/jobs/generate-job";
import { processPublishJob } from "../lib/newsletter/lib/queue/jobs/publish-job";
import type {
  CleanupWorkflowPayload,
  CurateWorkflowPayload,
  PublishWorkflowPayload,
  SendWorkflowPayload,
} from "../lib/newsletter/lib/queue/types";
import { getCampaign, getCampaignSchedule } from "../lib/outreach/campaigns/queries";
import {
  getContact,
  getDomainSentLastHour,
  rescheduleContact,
} from "../lib/outreach/contacts/queries";
import { isBusinessHour, scheduleToBusinessHours } from "../lib/outreach/scheduling/business-hours";
import { getDeliverabilityStrategy } from "../lib/outreach/sending/deliverability";
import { processDueEmails } from "../lib/outreach/sending/processor";
import { sendEmail } from "../lib/outreach/sending/sender";
import { type OutreachSendEmailPayload, QUEUE } from "../lib/queue/index";
import { retryableWorker } from "../lib/queue/retryable-worker";

const OUTREACH_PROCESS_QUEUE = "outreach-process";
const OUTREACH_PROCESS_CRON = "*/5 * * * *";
const AUTOMATION_RECONCILE_CRON = "* * * * *";
const smsHandler = createSmsExternalHandler(
  resolveConfiguredSmsProvider,
  process.env.NEXT_PUBLIC_SITE_URL,
);
const outboundWebhookHandler = createOutboundWebhookHandler();
const emailHandler = createEmailExternalHandler(getResend);

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("[worker] DATABASE_URL is not set — exiting");
  process.exit(1);
}

const boss = new PgBoss({
  connectionString: databaseUrl,
  schedule: true,
  supervise: true,
});

boss.on("error", (err) => {
  console.error("[worker] pg-boss error:", err);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  return new Resend(apiKey);
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleNewsletterSend([job]: Job<SendWorkflowPayload>[]): Promise<void> {
  console.log(`[worker] newsletter-send job ${job.id}`);
  const data = job.data;

  // Step 1: curate
  const curateResult = await processCurateJob({
    campaignId: data.campaignId,
    sources: data.sources,
    maxArticles: data.maxArticles,
    userId: data.userId,
  });

  if (!curateResult.success || curateResult.articles.length === 0) {
    throw new Error(`Curate step failed: ${curateResult.error ?? "no articles"}`);
  }

  // Step 2: generate
  const generateResult = await processGenerateJob({
    campaignId: data.campaignId,
    articles: curateResult.articles.map((article) => ({
      id: article.id,
      title: article.title,
      url: article.url,
      summary: article.summary ?? "",
      source: article.source,
    })),
    userId: data.userId,
  });

  if (!generateResult.success) {
    throw new Error(`Generate step failed: ${generateResult.error ?? "unknown"}`);
  }

  // Step 3: publish
  const resend = getResend();
  const publishResult = await processPublishJob(
    {
      campaignId: data.campaignId,
      newsletterId: generateResult.newsletterId,
      subscriberIds: data.subscriberIds,
      batchSize: data.batchSize,
      userId: data.userId,
    },
    resend,
  );

  if (!publishResult.success) {
    throw new Error(
      `Publish step failed — sent: ${publishResult.sent}, failed: ${publishResult.failed}`,
    );
  }

  console.log(`[worker] newsletter-send job ${job.id} done — sent: ${publishResult.sent}`);
}

async function handleNewsletterCurate([job]: Job<CurateWorkflowPayload>[]): Promise<void> {
  console.log(`[worker] newsletter-curate job ${job.id}`);
  const result = await processCurateJob(job.data);
  if (!result.success) throw new Error(result.error ?? "Curate failed");
  console.log(
    `[worker] newsletter-curate job ${job.id} done — articles: ${result.articles.length}`,
  );
}

async function handleNewsletterPublish([job]: Job<PublishWorkflowPayload>[]): Promise<void> {
  console.log(`[worker] newsletter-publish job ${job.id}`);
  const resend = getResend();
  const result = await processPublishJob(job.data, resend);
  if (!result.success)
    throw new Error(`Publish failed — sent: ${result.sent}, failed: ${result.failed}`);
  console.log(`[worker] newsletter-publish job ${job.id} done — sent: ${result.sent}`);
}

async function handleNewsletterCleanup([job]: Job<CleanupWorkflowPayload>[]): Promise<void> {
  console.log(`[worker] newsletter-cleanup job ${job.id}`);
  const result = await processCleanupJob({
    olderThan: new Date(job.data.olderThan),
    types: job.data.types,
  });
  if (!result.success) throw new Error("Cleanup failed");
  console.log(`[worker] newsletter-cleanup job ${job.id} done`);
}

async function handleOutreachSendEmail([job]: Job<OutreachSendEmailPayload>[]): Promise<void> {
  console.log(`[worker] outreach-send-email job ${job.id}`);
  const { contactId, campaignId, emailNumber, unsubscribeUrl, forceTextOnly } = job.data;

  const resend = getResend();

  // Fetch contact
  const contact = await getContact(contactId);
  if (!contact) {
    console.warn(`[worker] contact ${contactId} not found — skipping`);
    return;
  }

  if (contact.status !== "active") {
    console.debug(`[worker] contact ${contactId} status=${contact.status} — skipping`);
    return;
  }
  if (contact.opt_out === true) {
    console.debug(`[worker] contact ${contactId} opted out — skipping`);
    return;
  }

  // Idempotency: skip if already sent
  if ((contact.current_step ?? 0) >= emailNumber) {
    console.debug(
      `[worker] contact ${contactId} already at step ${contact.current_step} — skipping`,
    );
    return;
  }

  // Fetch campaign
  const campaign = await getCampaign(campaignId);
  if (!campaign) {
    console.warn(`[worker] campaign ${campaignId} not found — skipping`);
    return;
  }
  if (campaign.status !== "active") {
    console.debug(`[worker] campaign ${campaignId} is ${campaign.status} — skipping`);
    return;
  }
  if (campaign.test_mode === true) {
    console.debug(`[worker] test_mode — would send email ${emailNumber} to ${contact.email}`);
    return;
  }

  // Business hours check
  const schedule = await getCampaignSchedule(campaignId);
  const businessHours = schedule ? scheduleToBusinessHours(schedule) : undefined;
  if (businessHours) {
    const timezone = contact.timezone || schedule?.timezone || OUTREACH_DEFAULT_TIMEZONE;
    if (!isBusinessHour(new Date(), timezone, businessHours)) {
      console.debug(`[worker] outside business hours (${timezone}) — rescheduling`);
      await rescheduleContact(contactId, 60);
      return;
    }
  }

  // Deliverability strategy
  const strategy = getDeliverabilityStrategy(contact, campaign, emailNumber);

  // Domain throttling
  const domain = contact.email.split("@")[1]?.toLowerCase() ?? "";
  if (domain) {
    const domainSentCount = await getDomainSentLastHour(domain);
    if (domainSentCount >= OUTREACH_MAX_EMAILS_PER_DOMAIN_PER_HOUR) {
      console.debug(`[worker] domain throttle ${domain} — rescheduling`);
      await rescheduleContact(contactId, OUTREACH_DOMAIN_THROTTLE_DELAY_MINUTES);
      return;
    }
  }

  const result = await sendEmail(
    resend,
    contact,
    campaign,
    emailNumber as 1 | 2 | 3,
    unsubscribeUrl,
    { forceTextOnly: forceTextOnly ?? strategy.forceTextOnly, businessHours },
  );

  if (!result.success) {
    throw new Error(`sendEmail failed: ${result.error}`);
  }

  console.log(`[worker] outreach-send-email job ${job.id} done — sent to ${contact.email}`);
}

async function handleAutomationExecuteNode([
  job,
]: Job<AutomationExecuteNodePayload>[]): Promise<void> {
  const metadata = job as JobWithMetadata<AutomationExecuteNodePayload>;
  console.log(`[worker] automation-execute-node job ${job.id}`);
  try {
    await executeGraphNode(job.data, {
      email: emailHandler,
      sms: smsHandler,
      outboundWebhook: outboundWebhookHandler,
    });
  } catch (error) {
    if (metadata.retryCount >= metadata.retryLimit) {
      await markNodeDeadLetter({
        tenantId: job.data.tenantId,
        enrollmentId: job.data.enrollmentId,
        operationKey: job.data.operationKey,
        reason: error instanceof Error ? error.message : "Node attempts exhausted",
      });
    }
    throw error;
  }
}

async function handleAutomationReconcile(): Promise<void> {
  const result = await publishAutomationOutbox((payload, options) =>
    boss.send(QUEUE.AUTOMATION_EXECUTE_NODE, payload, {
      retryLimit: 2,
      retryDelay: 30,
      retryBackoff: true,
      expireInSeconds: 900,
      singletonKey: payload.operationKey,
      ...(options.startAfter != null && { startAfter: options.startAfter }),
    }),
  );
  if (result.published > 0) {
    console.log(`[worker] automation-reconcile published ${result.published} jobs`);
  }
}

async function handleAutomationSendStep([job]: Job<AutomationSendStepPayload>[]): Promise<void> {
  console.log(`[worker] automation-send-step job ${job.id}`);
  const result = await sendAutomationStep(getResend(), job.data);

  if (!result.success) {
    throw new Error(`sendAutomationStep failed: ${result.error}`);
  }

  console.log(
    `[worker] automation-send-step job ${job.id} done${result.skipped ? " — skipped" : ""}`,
  );
}

async function handleOutreachProcess(): Promise<void> {
  try {
    const result = await processDueEmails(getResend(), {
      batchSize: OUTREACH_BATCH_SIZE,
      unsubscribeBaseUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/unsubscribe`,
    });
    console.log(
      `[worker] outreach-process tick — sent: ${result.sent}, failed: ${result.failed}, skipped: ${result.skipped}`,
    );
  } catch (err) {
    // Swallow errors so a failed tick can't poison the schedule — next tick retries.
    console.error("[worker] outreach-process tick failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  await boss.start();
  console.log("[worker] pg-boss started");

  // pg-boss v10+ requires queues to exist before work() / send().
  // createQueue is idempotent — safe to call on every boot.
  const allQueues = [...Object.values(QUEUE), OUTREACH_PROCESS_QUEUE];
  for (const name of allQueues) {
    await boss.createQueue(name);
  }
  console.log("[worker] queues ensured:", allQueues.join(", "));

  const opts = { pollingIntervalSeconds: 5, includeMetadata: true } as const;

  await boss.work(
    QUEUE.NEWSLETTER_SEND,
    opts,
    retryableWorker(QUEUE.NEWSLETTER_SEND, handleNewsletterSend),
  );
  await boss.work(
    QUEUE.NEWSLETTER_CURATE,
    opts,
    retryableWorker(QUEUE.NEWSLETTER_CURATE, handleNewsletterCurate),
  );
  await boss.work(
    QUEUE.NEWSLETTER_PUBLISH,
    opts,
    retryableWorker(QUEUE.NEWSLETTER_PUBLISH, handleNewsletterPublish),
  );
  await boss.work(
    QUEUE.NEWSLETTER_CLEANUP,
    opts,
    retryableWorker(QUEUE.NEWSLETTER_CLEANUP, handleNewsletterCleanup),
  );
  await boss.work(
    QUEUE.OUTREACH_SEND_EMAIL,
    opts,
    retryableWorker(QUEUE.OUTREACH_SEND_EMAIL, handleOutreachSendEmail),
  );
  await boss.work(
    QUEUE.AUTOMATION_SEND_STEP,
    opts,
    retryableWorker(QUEUE.AUTOMATION_SEND_STEP, handleAutomationSendStep),
  );
  await boss.work(
    QUEUE.AUTOMATION_EXECUTE_NODE,
    opts,
    retryableWorker(QUEUE.AUTOMATION_EXECUTE_NODE, handleAutomationExecuteNode),
  );

  // Recurring outreach processor — fires every 5 min in-process via pg-boss schedule.
  await boss.schedule(OUTREACH_PROCESS_QUEUE, OUTREACH_PROCESS_CRON);
  await boss.work(OUTREACH_PROCESS_QUEUE, handleOutreachProcess);
  console.log(`[worker] scheduled outreach-process every 5 min`);

  await boss.schedule(QUEUE.AUTOMATION_RECONCILE, AUTOMATION_RECONCILE_CRON);
  await boss.work(QUEUE.AUTOMATION_RECONCILE, handleAutomationReconcile);
  console.log(`[worker] scheduled automation reconciliation every minute`);

  console.log("[worker] all handlers registered — waiting for jobs");

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("[worker] SIGTERM received — stopping pg-boss");
    await boss.stop();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("[worker] SIGINT received — stopping pg-boss");
    await boss.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[worker] fatal error:", err);
  process.exit(1);
});
