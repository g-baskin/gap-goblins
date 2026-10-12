import type { JobWithMetadata, WorkHandler, WorkWithMetadataHandler } from "pg-boss";

type WorkerLogger = {
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
};

type RetryableWorkerOptions = {
  logger?: WorkerLogger;
};

const consoleLogger: WorkerLogger = {
  info: (message, context) => {
    if (context) {
      console.log(message, context);
      return;
    }

    console.log(message);
  },
  warn: (message, context) => {
    if (context) {
      console.warn(message, context);
      return;
    }

    console.warn(message);
  },
  error: (message, context) => {
    if (context) {
      console.error(message, context);
      return;
    }

    console.error(message);
  },
};

export function retryableWorker<TData extends object, TResult = unknown>(
  queueName: string,
  handler: WorkHandler<TData, TResult>,
  options: RetryableWorkerOptions = {},
): WorkWithMetadataHandler<TData, TResult> {
  const logger = options.logger ?? consoleLogger;

  return async (jobs: JobWithMetadata<TData>[]) => {
    const startedAt = Date.now();
    const jobIds = jobs.map((job) => job.id);
    const attempts = getJobAttempts(jobs);

    try {
      const result = await handler(jobs);
      logger.info(`[worker] ${queueName} job completed`, {
        jobIds,
        attempts,
        durationMs: Date.now() - startedAt,
      });
      return result;
    } catch (error) {
      const errorContext = getErrorContext(error);
      const retryPolicy = getRetryPolicy(jobs);
      const context = {
        jobIds,
        attempts,
        ...retryPolicy,
        durationMs: Date.now() - startedAt,
        ...errorContext,
      };

      if (retryPolicy.willRetry) {
        logger.warn(`[worker] ${queueName} job failed; pg-boss retry policy will retry`, context);
      } else {
        logger.error(`[worker] ${queueName} job failed; pg-boss retries exhausted`, context);
      }

      throw error;
    }
  };
}

function getJobAttempts<TData extends object>(jobs: JobWithMetadata<TData>[]) {
  return jobs.map((job) => ({
    jobId: job.id,
    retryCount: job.retryCount,
    retryLimit: job.retryLimit,
  }));
}

function getRetryPolicy<TData extends object>(jobs: JobWithMetadata<TData>[]) {
  const retryableJobIds: string[] = [];
  const exhaustedJobIds: string[] = [];

  for (const job of jobs) {
    if (job.retryCount < job.retryLimit) {
      retryableJobIds.push(job.id);
    } else {
      exhaustedJobIds.push(job.id);
    }
  }

  return {
    willRetry: retryableJobIds.length > 0,
    retryableJobIds,
    exhaustedJobIds,
  };
}

function getErrorContext(error: unknown) {
  if (error instanceof Error) {
    return {
      error: error.message,
      errorName: error.name,
    };
  }

  return {
    error: String(error),
    errorName: typeof error,
  };
}
