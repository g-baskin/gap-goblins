"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/shadcn/ui/chart";

export interface CampaignPerformancePoint {
  date: string;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
}

interface CampaignPerformanceChartProps {
  data: CampaignPerformancePoint[];
}

const chartConfig = {
  sent: {
    label: "Sent",
    color: "#3b82f6",
  },
  opened: {
    label: "Opened",
    color: "#8b5cf6",
  },
  clicked: {
    label: "Clicked",
    color: "#f59e0b",
  },
  replied: {
    label: "Replied",
    color: "#10b981",
  },
} satisfies ChartConfig;

export function CampaignPerformanceChart({ data }: CampaignPerformanceChartProps) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="fillSent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="fillOpened" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="fillClicked" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="fillReplied" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={(value) => {
            const date = new Date(value);
            return date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
          }}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(value) => {
                return new Date(value).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
              indicator="dot"
            />
          }
        />
        <Area
          dataKey="replied"
          type="natural"
          fill="url(#fillReplied)"
          stroke="#10b981"
          stackId="a"
        />
        <Area
          dataKey="clicked"
          type="natural"
          fill="url(#fillClicked)"
          stroke="#f59e0b"
          stackId="a"
        />
        <Area
          dataKey="opened"
          type="natural"
          fill="url(#fillOpened)"
          stroke="#8b5cf6"
          stackId="a"
        />
        <Area dataKey="sent" type="natural" fill="url(#fillSent)" stroke="#3b82f6" stackId="a" />
      </AreaChart>
    </ChartContainer>
  );
}
