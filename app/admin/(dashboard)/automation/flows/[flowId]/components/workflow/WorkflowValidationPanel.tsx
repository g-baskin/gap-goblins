"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/shadcn/ui/button";

export type WorkflowValidationIssue = { message: string; nodeKey?: string };

export function WorkflowValidationPanel({
  issues,
  onFocus,
}: {
  issues: WorkflowValidationIssue[];
  onFocus: (nodeKey: string) => void;
}) {
  return (
    <section className="border-t bg-card p-3" aria-live="polite" aria-label="Workflow validation">
      {issues.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-emerald-600" />
          Ready to validate on publish.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <p className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertCircle className="size-4" />
            {issues.length} issue{issues.length === 1 ? "" : "s"}
          </p>
          {issues.slice(0, 4).map((issue) =>
            issue.nodeKey ? (
              <Button
                key={issue.nodeKey.concat(issue.message)}
                variant="outline"
                size="sm"
                onClick={() => onFocus(issue.nodeKey!)}
              >
                {issue.message}
              </Button>
            ) : (
              <span key={issue.message} className="text-xs text-muted-foreground">
                {issue.message}
              </span>
            ),
          )}
        </div>
      )}
    </section>
  );
}
