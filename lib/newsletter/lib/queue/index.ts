/**
 * Queue Library
 *
 * QStash Workflow-based job queue for reliable newsletter processing.
 *
 * Features:
 * - Durable workflow execution via QStash
 * - Automatic retries with step-level durability
 * - No separate worker process needed
 * - Serverless-compatible (runs on Vercel)
 *
 * Architecture:
 * - Workflow endpoints: Handle job execution via `serve()`
 * - QStash Client: Triggers workflows and manages runs
 * - Jobs: Type-safe job processors for each operation
 * - Monitor: Workflow status and health checks
 */

export { processCleanupJob } from "./jobs/cleanup-job";
// Job Processors
export { processCurateJob } from "./jobs/curate-job";
export { processGenerateJob } from "./jobs/generate-job";
export { processPublishJob } from "./jobs/publish-job";
// Monitoring
export {
  cancelWorkflow,
  getQueueHealth,
  getRecentWorkflowRuns,
  getWorkflowRunStatus,
  type QueueStats,
  type WorkflowRunStatus,
} from "./monitor";
// Queue Client
export {
  cancelWorkflowRun,
  triggerCleanupWorkflow,
  triggerCurateWorkflow,
  triggerPublishWorkflow,
  triggerSendWorkflow,
} from "./qstash-client";
// Types
export type {
  CleanupJobData,
  CleanupJobResult,
  CleanupWorkflowPayload,
  CurateJobData,
  CurateJobResult,
  CurateWorkflowPayload,
  GenerateJobData,
  GenerateJobResult,
  PublishJobData,
  PublishJobResult,
  PublishWorkflowPayload,
  SendWorkflowPayload,
} from "./types";
