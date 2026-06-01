import { Skeleton } from "~/components/ui/skeleton";
import { useDashboardMetrics } from "./metrics";
import { KpiStats } from "./kpi-stats";
import { RevenueTrendChart } from "./revenue-trend-chart";
import { StatusBreakdownChart } from "./status-breakdown-chart";
import { RecentInvoices } from "./recent-invoices";

export function Dashboard({ userId }: { userId: string }) {
  const metrics = useDashboardMetrics(userId);

  if (metrics.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
        <Skeleton className="h-72 lg:col-span-3" />
        <Skeleton className="h-72" />
        <Skeleton className="h-80 lg:col-span-4" />
      </div>
    );
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
