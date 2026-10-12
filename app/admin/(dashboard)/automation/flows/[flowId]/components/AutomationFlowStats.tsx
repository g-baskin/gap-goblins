"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/ui/card";
import type { FlowStats } from "../page";

export function AutomationFlowStats({ stats }: { stats: FlowStats }) {
  const cards = [
    { label: "Steps", value: stats.steps.toLocaleString() },
    { label: "Total enrollments", value: stats.totalEnrollments.toLocaleString() },
    { label: "Active enrollments", value: stats.activeEnrollments.toLocaleString() },
    { label: "Click rate", value: `${(stats.clickThroughRate * 100).toFixed(1)}%` },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 @5xl/main:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader>
            <CardDescription>{card.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{card.value}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
