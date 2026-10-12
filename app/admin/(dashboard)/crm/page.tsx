import { IconLoader2 } from "@tabler/icons-react";
import { Suspense } from "react";
import { getActivityFeed } from "@/lib/crm/activity-feed";
import { getCrmMetrics } from "@/lib/crm/metrics";
import { CRMDashboardChartsLoader } from "./crm-dashboard-charts-loader";

function CRMDashboardSkeleton() {
  return (
    <div className="flex items-center justify-center py-20">
      <IconLoader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

async function CRMDashboardData() {
  const [metrics, activityFeed] = await Promise.all([getCrmMetrics(), getActivityFeed()]);

  const charts = {
    dealsByStage: metrics.dealsByStage,
    dealsBySource: metrics.dealsBySource,
    leadsOverTime: metrics.leadsOverTime,
    recentActivity: metrics.recentActivity,
  };

  return <CRMDashboardChartsLoader charts={charts} activityFeed={activityFeed} />;
}

export default function CRMDashboardPage() {
  return (
    <Suspense fallback={<CRMDashboardSkeleton />}>
      <CRMDashboardData />
    </Suspense>
  );
}
