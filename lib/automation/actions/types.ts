import type { DB } from "@/lib/db/worker";

export type ActionDatabase = Pick<DB, "select" | "insert" | "update">;

export type ActionExecutionContext = {
  tenantId: string;
  enrollmentId: string;
  runId: string;
  contactId: string;
  dealId?: string | null;
  now?: Date;
};

export type ActionExecutionResult = {
  state: "succeeded" | "waiting";
  output: Record<string, unknown>;
};
