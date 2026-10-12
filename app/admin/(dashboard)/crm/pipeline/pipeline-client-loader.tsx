"use client";

import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/shadcn/ui/card";

const PipelineClient = dynamic(
  () => import("./pipeline-client").then((module) => module.PipelineClient),
  {
    ssr: false,
    loading: () => <PipelineLoadingFallback />,
  },
);

function PipelineLoadingFallback() {
  return (
    <Card>
      <CardContent className="p-8">
        <div className="text-center text-muted-foreground">Loading pipeline...</div>
      </CardContent>
    </Card>
  );
}

export function PipelineClientLoader() {
  return <PipelineClient />;
}
