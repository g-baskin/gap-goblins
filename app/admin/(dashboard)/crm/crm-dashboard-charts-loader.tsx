"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/shadcn/ui/skeleton";
import type { CRMActivityEvent, CRMChartData } from "./crm-dashboard-charts";

interface CRMDashboardChartsLoaderProps {
  charts: CRMChartData;
  activityFeed: CRMActivityEvent[];
}

const CRMDashboardCharts = dynamic(
  () => import("./crm-dashboard-charts").then((module) => module.CRMDashboardCharts),
  {
    ssr: false,
    loading: () => <CRMDashboardChartsFallback />,
  },
);

function CRMDashboardChartsFallback() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-[406px] w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[406px] w-full" />
        <Skeleton className="h-[406px] w-full" />
      </div>
      <Skeleton className="h-[406px] w-full" />
    </div>
  );
}

export function CRMDashboardChartsLoader({ charts, activityFeed }: CRMDashboardChartsLoaderProps) {
  return <CRMDashboardCharts charts={charts} activityFeed={activityFeed} />;
}
