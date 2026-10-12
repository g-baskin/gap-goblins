"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/shadcn/ui/badge";
import { Button } from "@/components/shadcn/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shadcn/ui/dialog";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";
import { Textarea } from "@/components/shadcn/ui/textarea";

type CallTask = {
  id: string;
  script: string;
  dueAt: string;
  status: string;
  displayStatus: string;
  contactId: string;
  dealId: string | null;
};

export function AutomationCallTasks({ tenantId }: { tenantId: string }) {
  const [tasks, setTasks] = useState<CallTask[]>([]);
  const [selected, setSelected] = useState<CallTask | null>(null);
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/automation/call-tasks", {
      headers: { "x-tenant-id": tenantId },
    });
    if (response.ok) setTasks((await response.json()).tasks);
  }, [tenantId]);
  useEffect(() => {
    void load();
  }, [load]);

  async function complete() {
    if (!selected) return;
    const response = await fetch(`/api/automation/call-tasks/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
      body: JSON.stringify({ outcome, notes: notes || undefined }),
    });
    if (!response.ok) return toast.error("Could not complete the call task");
    toast.success("Call outcome recorded and workflow resumed");
    setSelected(null);
    setOutcome("");
    setNotes("");
    await load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Human call tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No call tasks yet.
          </div>
        ) : (
          <div className="divide-y rounded-lg border">
            {tasks.map((task) => (
              <div key={task.id} className="flex flex-wrap items-center gap-3 p-3">
                <Badge variant={task.displayStatus === "overdue" ? "destructive" : "outline"}>
                  {task.displayStatus}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{task.script}</p>
                  <p className="text-xs text-muted-foreground">
                    Due {new Date(task.dueAt).toLocaleString()}
                  </p>
                </div>
                {task.status === "open" && (
                  <Button size="sm" onClick={() => setSelected(task)}>
                    Record outcome
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete call task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Outcome</Label>
              <Input
                value={outcome}
                onChange={(event) => setOutcome(event.target.value)}
                placeholder="Connected, voicemail, no answer…"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={complete} disabled={!outcome.trim()}>
              Complete task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
