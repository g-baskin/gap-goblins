"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/shadcn/ui/badge";
import { Button } from "@/components/shadcn/ui/button";

export type WorkflowRunRow = {
  enrollment: { id: string; status: string; createdAt: string };
  run: {
    id: string;
    nodeKey: string;
    status: string;
    attempt: number;
    errorData?: unknown;
    createdAt: string;
  } | null;
};

export function WorkflowRunPanel({ flowId, tenantId }: { flowId: string; tenantId: string }) {
  const [rows, setRows] = useState<WorkflowRunRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/automation/flows/${flowId}/runs`, {
        headers: { "x-tenant-id": tenantId },
      });
      if (response.ok) setRows((await response.json()).runs);
    } finally {
      setLoading(false);
    }
  }, [flowId, tenantId]);

  useEffect(() => {
    void load();
  }, [load]);
  const latest = Array.from(new Map(rows.map((row) => [row.enrollment.id, row])).values()).slice(
    0,
    20,
  );

  return (
    <section className="space-y-3 p-4" aria-label="Workflow runs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Recent runs</h2>
          <p className="text-sm text-muted-foreground">Latest enrollment and node state.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
      {latest.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No graph runs yet.
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {latest.map(({ enrollment, run }) => (
            <div key={enrollment.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
              <Badge variant={enrollment.status === "failed" ? "destructive" : "outline"}>
                {enrollment.status}
              </Badge>
              <span className="font-medium">{run?.nodeKey ?? "Waiting to start"}</span>
              {run && <span className="text-muted-foreground">Attempt {run.attempt}</span>}
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(run?.createdAt ?? enrollment.createdAt).toLocaleString()}
              </span>
              {["failed", "dead_letter", "unknown"].includes(run?.status ?? "") && (
                <RecoveryControls
                  enrollmentId={enrollment.id}
                  tenantId={tenantId}
                  allowSkip={run?.status !== "unknown"}
                  onDone={load}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RecoveryControls({
  enrollmentId,
  tenantId,
  allowSkip,
  onDone,
}: {
  enrollmentId: string;
  tenantId: string;
  allowSkip: boolean;
  onDone: () => void;
}) {
  async function command(action: "retry" | "skip" | "cancel") {
    const response = await fetch(`/api/automation/enrollments/${enrollmentId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
      body: JSON.stringify({ reason: "Admin recovery from workflow builder" }),
    });
    if (response.ok) onDone();
  }
  return (
    <div className="flex basis-full gap-2 pt-2">
      <Button size="sm" variant="outline" onClick={() => command("retry")}>
        Retry
      </Button>
      {allowSkip && (
        <Button size="sm" variant="outline" onClick={() => command("skip")}>
          Skip
        </Button>
      )}
      <Button size="sm" variant="destructive" onClick={() => command("cancel")}>
        Cancel
      </Button>
    </div>
  );
}
