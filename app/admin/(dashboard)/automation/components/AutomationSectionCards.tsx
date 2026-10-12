"use client";

import { IconBolt, IconClick, IconFlame, IconRoute } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import { Skeleton } from "@/components/shadcn/ui/skeleton";
import { skeletonKeys } from "@/lib/skeleton-keys";

interface AutomationStats {
  activeFlows: number;
  activeEnrollments: number;
  clickThroughRate: number;
  hotContacts: number;
  conversions: number;
}

export function AutomationSectionCards({ tenantId }: { tenantId: string }) {
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/automation/stats", {
        headers: { "x-tenant-id": tenantId },
      });
      if (!response.ok) {
        setError(true);
        return;
      }
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error("Failed to fetch automation stats:", error);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 px-4 lg:px-6 @5xl/main:grid-cols-4">
        {skeletonKeys(4, "automation-stat").map((key) => (
          <Card key={key} className="@container/card">
            <CardHeader>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-2 h-8 w-20" />
              <Skeleton className="mt-2 h-4 w-full" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardDescription className="text-red-500">
              Failed to load automation statistics
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const cards = [
    {
      label: "Active flows",
      value: stats.activeFlows.toLocaleString(),
      footer: "Live autoresponders ready to enrol subscribers",
      icon: IconRoute,
    },
    {
      label: "Active enrollments",
      value: stats.activeEnrollments.toLocaleString(),
      footer: "People currently moving through journeys",
      icon: IconBolt,
    },
    {
      label: "Click rate",
      value: `${(stats.clickThroughRate * 100).toFixed(1)}%`,
      footer: "Clicks are tracked as engagement, not deal stages",
      icon: IconClick,
    },
    {
      label: "Hot / converted",
      value: `${stats.hotContacts.toLocaleString()} / ${stats.conversions.toLocaleString()}`,
      footer: "High-intent signals without moving CRM pipeline stages",
      icon: IconFlame,
    },
  ];

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-2 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @5xl/main:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="@container/card">
            <CardHeader>
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {card.value}
              </CardTitle>
              <CardAction>
                <Icon className="size-5 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardFooter className="text-muted-foreground text-sm">{card.footer}</CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
