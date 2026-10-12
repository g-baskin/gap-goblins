import type { JobWithMetadata } from "pg-boss";
import { describe, expect, it, vi } from "vitest";
import { retryableWorker } from "./retryable-worker";

type Payload = { id: string };

function createJob({
  data = { id: "payload-1" },
  retryCount = 0,
  retryLimit = 2,
}: {
  data?: Payload;
  retryCount?: number;
  retryLimit?: number;
} = {}): JobWithMetadata<Payload> {
  const now = new Date();

  return {
    id: "job-1",
    name: "test-queue",
    data,
    expireInSeconds: 60,
    heartbeatSeconds: null,
    signal: new AbortController().signal,
    priority: 0,
    state: "active",
    retryLimit,
    retryCount,
    retryDelay: 60,
    retryBackoff: false,
    startAfter: now,
    startedOn: now,
    singletonKey: null,
    singletonOn: null,
    deleteAfterSeconds: 604_800,
    createdOn: now,
    completedOn: null,
    keepUntil: now,
    policy: "standard",
    heartbeatOn: null,
    deadLetter: "",
    output: {},
  };
}

describe("retryableWorker", () => {
  it("runs the handler and logs completion metadata", async () => {
    const handler = vi.fn(async () => undefined);
    const info = vi.fn();

    const wrapped = retryableWorker("test-queue", handler, {
      logger: { info, warn: vi.fn(), error: vi.fn() },
    });

    await wrapped([createJob()]);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith([expect.objectContaining({ id: "job-1" })]);
    expect(info).toHaveBeenCalledWith("[worker] test-queue job completed", {
      attempts: [{ jobId: "job-1", retryCount: 0, retryLimit: 2 }],
      durationMs: expect.any(Number),
      jobIds: ["job-1"],
    });
  });

  it("logs a retryable failure when pg-boss has attempts remaining", async () => {
    const warn = vi.fn();
    const wrapped = retryableWorker(
      "test-queue",
      async () => {
        throw "network down";
      },
      { logger: { info: vi.fn(), warn, error: vi.fn() } },
    );

    await expect(wrapped([createJob({ retryCount: 1, retryLimit: 2 })])).rejects.toThrow(
      "network down",
    );

    expect(warn).toHaveBeenCalledWith(
      "[worker] test-queue job failed; pg-boss retry policy will retry",
      {
        attempts: [{ jobId: "job-1", retryCount: 1, retryLimit: 2 }],
        durationMs: expect.any(Number),
        error: "network down",
        errorName: "string",
        exhaustedJobIds: [],
        jobIds: ["job-1"],
        retryableJobIds: ["job-1"],
        willRetry: true,
      },
    );
  });

  it("logs exhausted retry policy failures as errors", async () => {
    const error = vi.fn();
    const wrapped = retryableWorker(
      "test-queue",
      async () => {
        throw new Error("bad payload");
      },
      { logger: { info: vi.fn(), warn: vi.fn(), error } },
    );

    await expect(wrapped([createJob({ retryCount: 2, retryLimit: 2 })])).rejects.toThrow(
      "bad payload",
    );

    expect(error).toHaveBeenCalledWith(
      "[worker] test-queue job failed; pg-boss retries exhausted",
      {
        attempts: [{ jobId: "job-1", retryCount: 2, retryLimit: 2 }],
        durationMs: expect.any(Number),
        error: "bad payload",
        errorName: "Error",
        exhaustedJobIds: ["job-1"],
        jobIds: ["job-1"],
        retryableJobIds: [],
        willRetry: false,
      },
    );
  });
});
