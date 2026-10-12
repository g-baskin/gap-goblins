"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/shadcn/ui/skeleton";

export const WorkflowCanvasBoundary = dynamic<{
  flowId: string;
  tenantId: string;
}>(() => import("./AutomationWorkflowBuilder").then((module) => module.AutomationWorkflowBuilder), {
  ssr: false,
  loading: () => <Skeleton className="h-[36rem] w-full rounded-xl" />,
});
