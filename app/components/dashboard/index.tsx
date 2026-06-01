import { Skeleton } from "~/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { useDashboardMetrics } from "./metrics";
import { KpiStats } from "./kpi-stats";
import { RevenueTrendChart } from "./revenue-trend-chart";
import { StatusBreakdownChart } from "./status-breakdown-chart";
import { RecentInvoices } from "./recent-invoices";

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* KPI cards */}
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="shadow-none dark:ring-0">
          <CardHeader>
            <Skeleton className="h-3 w-20" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}

      {/* Revenue chart */}
      <Card className="shadow-none lg:col-span-3 dark:ring-0">
        <CardHeader className="flex flex-row items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-44" />
          </div>
          <Skeleton className="h-8 w-32 rounded-md" />
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-end gap-2">
            {Array.from({ length: 14 }).map((_, i) => (
              <Skeleton
                key={i}
                className="flex-1"
                style={{ height: `${25 + ((i * 53) % 70)}%` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status pie */}
      <Card className="shadow-none dark:ring-0">
        <CardHeader className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-20" />
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6">
          <Skeleton className="size-40 rounded-full" />
        </CardContent>
      </Card>

      {/* Recent invoices */}
      <Card className="gap-0 shadow-none lg:col-span-4 dark:ring-0">
        <CardHeader className="border-b pb-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-3 w-40" />
        </CardHeader>
        <CardContent className="p-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b px-6 py-4 last:border-0"
            >
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="ml-auto h-4 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function Dashboard({ userId }: { userId: string }) {
  const metrics = useDashboardMetrics(userId);

  if (metrics.isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiStats metrics={metrics} />
      <RevenueTrendChart data={metrics.revenueDaily} />
      <StatusBreakdownChart data={metrics.statusBreakdown} />
      <RecentInvoices data={metrics.recentInvoices} className="lg:col-span-4" />
    </div>
  );
}
