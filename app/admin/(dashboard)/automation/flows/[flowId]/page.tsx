"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/shadcn/ui/button";
import { Skeleton } from "@/components/shadcn/ui/skeleton";
import { AutomationFlowEditor } from "./components/AutomationFlowEditor";
import { AutomationFlowStats } from "./components/AutomationFlowStats";
import { AutomationStepsEditor } from "./components/AutomationStepsEditor";
import { WorkflowCanvasBoundary } from "./components/workflow/WorkflowCanvasBoundary";

interface AutomationFlowPageProps {
  params: Promise<{ flowId: string }>;
}

export default function AutomationFlowPage({ params }: AutomationFlowPageProps) {
  const { flowId } = use(params);
  const tenantId = useSearchParams().get("tenantId");
  const [data, setData] = useState<AutomationFlowDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFlow = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`/api/automation/flows/${flowId}`, {
        headers: { "x-tenant-id": tenantId },
      });
      if (response.ok) {
        setData(await response.json());
      }
    } finally {
      setLoading(false);
    }
  }, [flowId, tenantId]);

  useEffect(() => {
    fetchFlow();
  }, [fetchFlow]);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <h1 className="text-3xl font-bold tracking-tight">Select a tenant first</h1>
        <p className="text-muted-foreground">Open this flow from the Automation page.</p>
        <Button asChild variant="outline">
          <Link href="/admin/automation">Back to Automation</Link>
        </Button>
      </div>
    );
  }

  if (!data?.flow) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <h1 className="text-3xl font-bold tracking-tight">Automation flow not found</h1>
        <Button asChild variant="outline">
          <Link href="/admin/automation">Back to Automation</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-start justify-between gap-4 px-4 lg:px-6">
          <div>
            <Button asChild variant="ghost" size="sm" className="mb-2 px-0">
              <Link href="/admin/automation">← Back to Automation</Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">{data.flow.name}</h1>
            <p className="text-muted-foreground mt-1">
              {data.flow.draftRevisionId
                ? "Visual workflow builder"
                : "Linear autoresponder editor"}
            </p>
          </div>
        </div>

        <div className="px-4 lg:px-6">
          <AutomationFlowStats stats={data.stats} />
        </div>

        {data.flow.tenantId && data.flow.draftRevisionId ? (
          <div className="min-w-0 space-y-4 px-4 lg:px-6">
            <WorkflowCanvasBoundary flowId={flowId} tenantId={data.flow.tenantId} />
            <div className="max-w-xl">
              <AutomationFlowEditor flow={data.flow} tenantId={tenantId} onSaved={fetchFlow} />
            </div>
          </div>
        ) : (
          <>
            <div className="mx-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm lg:mx-6">
              <p className="font-medium">
                {data.flow.tenantId
                  ? "This tenant-owned linear flow has not been converted."
                  : "This legacy flow has no verified tenant owner."}
              </p>
              <p className="mt-1 text-muted-foreground">
                {data.flow.tenantId
                  ? "Run the graph backfill in dry-run mode, review it, then apply the conversion."
                  : "Run tenant assignment in dry-run mode, review its manifest, then convert the flow."}
              </p>
            </div>
            <div className="grid gap-4 px-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-6">
              <AutomationStepsEditor
                flowId={flowId}
                tenantId={tenantId}
                initialSteps={data.steps || []}
                onSaved={fetchFlow}
              />
              <AutomationFlowEditor flow={data.flow} tenantId={tenantId} onSaved={fetchFlow} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export interface AutomationFlowDetailResponse {
  flow: AutomationFlow;
  steps: AutomationStep[];
  stats: FlowStats;
}

export interface AutomationFlow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  triggerType: string;
  audienceFilter: unknown;
  fromName: string | null;
  fromEmail: string | null;
  replyTo: string | null;
  trackOpens: boolean;
  trackClicks: boolean;
  stopOnUnsubscribe: boolean;
  stopOnBounce: boolean;
  stopOnComplaint: boolean;
  tenantId: string | null;
  executionMode: "linear" | "graph";
  draftRevisionId: string | null;
  publishedRevisionId: string | null;
}

export interface AutomationStep {
  id: string;
  stepOrder: number;
  stepType: "send_email" | "wait" | "add_tag" | "update_contact_status";
  name: string;
  subject: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
  delayAmount: number;
  delayUnit: "minutes" | "hours" | "days";
  settings: unknown;
}

export interface FlowStats {
  steps: number;
  totalEnrollments: number;
  activeEnrollments: number;
  emailsSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  conversions: number;
  clickThroughRate: number;
}
