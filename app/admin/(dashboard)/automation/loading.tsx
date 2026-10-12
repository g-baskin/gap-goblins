import { Card, CardContent, CardHeader } from "@/components/shadcn/ui/card";
import { Skeleton } from "@/components/shadcn/ui/skeleton";
import { skeletonKeys } from "@/lib/skeleton-keys";

export default function AutomationLoading() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="mt-2 h-4 w-96" />
        </div>
        <div className="grid grid-cols-2 gap-4 px-4 lg:px-6 @5xl/main:grid-cols-4">
          {skeletonKeys(4, "automation-loading-card").map((key) => (
            <Card key={key}>
              <CardHeader>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-2 h-8 w-20" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="px-4 lg:px-6">
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
