"use client";

import { formatDistanceToNow } from "date-fns";
import { Edit, MoreVertical, Pause, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/shadcn/ui/badge";
import { Button } from "@/components/shadcn/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/ui/dropdown-menu";
import { Skeleton } from "@/components/shadcn/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/ui/table";
import { AUTOMATION_TRIGGER_OPTIONS } from "@/lib/automation/types";

interface AutomationFlow {
  id: string;
  name: string;
  status: "draft" | "active" | "paused" | "archived";
  triggerType: string;
  stepCount: number;
  activeEnrollments: number;
  opened: number;
  clicked: number;
  updatedAt: string;
}

export function AutomationFlowsTable({ tenantId }: { tenantId: string }) {
  const [flows, setFlows] = useState<AutomationFlow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFlows = useCallback(async () => {
    try {
      const response = await fetch("/api/automation/flows", {
        headers: { "x-tenant-id": tenantId },
      });
      if (response.ok) {
        const data = await response.json();
        setFlows(data.flows || []);
      }
    } catch (error) {
      console.error("Failed to fetch automation flows:", error);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchFlows();
  }, [fetchFlows]);

  async function postAction(flowId: string, action: "activate" | "pause") {
    try {
      const response = await fetch(`/api/automation/flows/${flowId}/${action}`, {
        method: "POST",
        headers: { "x-tenant-id": tenantId },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || `Failed to ${action} flow`);
        return;
      }
      toast.success(action === "activate" ? "Flow activated" : "Flow paused");
      fetchFlows();
    } catch {
      toast.error(`Failed to ${action} flow`);
    }
  }

  async function archiveFlow(flowId: string) {
    if (!confirm("Archive this automation flow?")) {
      return;
    }

    try {
      const response = await fetch(`/api/automation/flows/${flowId}`, {
        method: "DELETE",
        headers: { "x-tenant-id": tenantId },
      });
      if (!response.ok) {
        toast.error("Failed to archive flow");
        return;
      }
      toast.success("Flow archived");
      fetchFlows();
    } catch {
      toast.error("Failed to archive flow");
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Automation flows</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Automation flows</CardTitle>
      </CardHeader>
      <CardContent>
        {flows.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p>No automation flows yet</p>
            <p className="mt-2 text-sm">Create a welcome autoresponder to get started.</p>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Flow name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead className="text-right">Steps</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                  <TableHead className="text-right">Opens</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead>Last updated</TableHead>
                  <TableHead className="w-[70px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {flows.map((flow) => (
                  <TableRow key={flow.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/admin/automation/flows/${flow.id}?tenantId=${encodeURIComponent(tenantId)}`}
                        className="hover:underline"
                      >
                        {flow.name}
                      </Link>
                    </TableCell>
                    <TableCell>{getStatusBadge(flow.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTrigger(flow.triggerType)}
                    </TableCell>
                    <TableCell className="text-right">{flow.stepCount}</TableCell>
                    <TableCell className="text-right">{flow.activeEnrollments}</TableCell>
                    <TableCell className="text-right">{flow.opened}</TableCell>
                    <TableCell className="text-right">{flow.clicked}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(flow.updatedAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/admin/automation/flows/${flow.id}?tenantId=${encodeURIComponent(tenantId)}`}
                            >
                              <Edit className="mr-2 size-4" />
                              View/edit
                            </Link>
                          </DropdownMenuItem>
                          {flow.status === "active" ? (
                            <DropdownMenuItem onClick={() => postAction(flow.id, "pause")}>
                              <Pause className="mr-2 size-4" />
                              Pause
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => postAction(flow.id, "activate")}>
                              <Play className="mr-2 size-4" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => archiveFlow(flow.id)}
                          >
                            <Trash2 className="mr-2 size-4" />
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getStatusBadge(status: AutomationFlow["status"]) {
  const variants = {
    draft: "secondary",
    active: "default",
    paused: "outline",
    archived: "secondary",
  } as const;

  return (
    <Badge variant={variants[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
  );
}

function formatTrigger(triggerType: string): string {
  return (
    AUTOMATION_TRIGGER_OPTIONS.find((option) => option.value === triggerType)?.label ??
    triggerType.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
  );
}
