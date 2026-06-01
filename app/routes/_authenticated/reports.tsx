import { createFileRoute } from "@tanstack/react-router";
import { useId, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { format, subMonths, startOfMonth, isAfter } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart";
import { Skeleton } from "~/components/ui/skeleton";
import { PageHeader } from "~/components/shared/PageHeader";
import { useInvoices } from "~/hooks/useInvoices";
import { useClients } from "~/hooks/useClients";
import { useExpenses } from "~/hooks/useExpenses";
import { formatCurrency, CURRENCIES } from "~/lib/currency";
import type { CurrencyCode } from "~/types";

// Normalize a stored amount (in its currency's smallest units) to IDR using the
// per-document exchange_rate_to_idr captured at create time.
function toIdr(
  amount: number,
  currency: CurrencyCode,
  rateToIdr: number | undefined
): number {
  if (currency === "IDR") return amount;
  const cfg = CURRENCIES[currency];
  return Math.round((amount / cfg.divisor) * (rateToIdr ?? 1));
}

const compact = (v: number) =>
  new Intl.NumberFormat("en", { notation: "compact" }).format(v);

const revenueConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
  expenses: { label: "Expenses", color: "var(--chart-5)" },
} satisfies ChartConfig;

const agingColors = ["var(--chart-1)", "var(--chart-4)", "var(--chart-3)", "var(--chart-5)"];

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { user } = Route.useRouteContext();
  const { data: invoices, isLoading: loadingInv } = useInvoices(user.$id);
  const { data: clients } = useClients(user.$id);
  const { data: expenses } = useExpenses(user.$id);
  const gradId = useId().replace(/:/g, "");

  // Last 6 months revenue (paid invoices) vs expenses
  const revenueByMonth = useMemo(() => {
    const buckets: { month: string; key: string; revenue: number; expenses: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = startOfMonth(subMonths(new Date(), i));
      buckets.push({ month: format(d, "MMM"), key: format(d, "yyyy-MM"), revenue: 0, expenses: 0 });
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));

    (invoices ?? [])
      .filter((i) => i.status === "paid" && i.paid_at)
      .forEach((i) => {
        const bi = idx.get(format(new Date(i.paid_at!), "yyyy-MM"));
        if (bi !== undefined) buckets[bi].revenue += toIdr(i.total, i.currency, i.exchange_rate_to_idr);
      });

    (expenses ?? []).forEach((e) => {
      const bi = idx.get(format(new Date(e.date), "yyyy-MM"));
      if (bi !== undefined) buckets[bi].expenses += toIdr(e.amount, e.currency, e.exchange_rate_to_idr);
    });

    return buckets;
  }, [invoices, expenses]);

  // Top clients by revenue (paid only)
  const topClients = useMemo(() => {
    const totals = new Map<string, number>();
    (invoices ?? [])
      .filter((i) => i.status === "paid")
      .forEach((i) =>
        totals.set(
          i.client_id,
          (totals.get(i.client_id) ?? 0) + toIdr(i.total, i.currency, i.exchange_rate_to_idr)
        )
      );
    return [...totals.entries()]
      .map(([id, total]) => ({
        id,
        name: clients?.find((c) => c.$id === id)?.name ?? "Unknown",
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [invoices, clients]);

  // A/R aging: outstanding (sent) invoices bucketed by days past due
  const aging = useMemo(() => {
    const buckets = [
      { label: "Not yet due", min: -Infinity, max: 0, total: 0, count: 0 },
      { label: "1 to 30 days", min: 1, max: 30, total: 0, count: 0 },
      { label: "31 to 60 days", min: 31, max: 60, total: 0, count: 0 },
      { label: "60+ days", min: 61, max: Infinity, total: 0, count: 0 },
    ];
    const today = new Date();
    (invoices ?? [])
      .filter((i) => i.status === "sent")
      .forEach((i) => {
        const due = new Date(i.due_date);
        const daysPast = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
        const b = buckets.find((bk) => daysPast >= bk.min && daysPast <= bk.max) ?? buckets[0];
        b.total += toIdr(i.total, i.currency, i.exchange_rate_to_idr);
        b.count += 1;
      });
    return buckets;
  }, [invoices]);

  const totalOutstanding = aging.reduce((s, b) => s + b.total, 0);
  const agingMax = Math.max(...aging.map((b) => b.total), 1);
  const ytdRevenue = useMemo(() => {
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    return (invoices ?? [])
      .filter((i) => i.status === "paid" && i.paid_at && isAfter(new Date(i.paid_at), yearStart))
      .reduce((s, i) => s + toIdr(i.total, i.currency, i.exchange_rate_to_idr), 0);
  }, [invoices]);

  if (loadingInv) return <ReportsSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Revenue, expenses, and accounts receivable." />

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="YTD revenue" value={formatCurrency(ytdRevenue, "IDR")} />
        <StatCard label="Outstanding" value={formatCurrency(totalOutstanding, "IDR")} />
        <StatCard
          label="Top client"
          value={topClients[0]?.name ?? "None"}
          sub={topClients[0] ? formatCurrency(topClients[0].total, "IDR") : undefined}
        />
        <StatCard label="Open invoices" value={String(aging.reduce((s, b) => s + b.count, 0))} />
      </div>

      {/* Revenue vs Expenses */}
      <Card className="shadow-none dark:ring-0">
        <CardHeader>
          <CardTitle className="text-base">Revenue vs expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={revenueConfig} className="aspect-[16/7] w-full">
            <AreaChart accessibilityLayer data={revenueByMonth} margin={{ left: 4, right: 8, top: 8 }}>
              <defs>
                <linearGradient id={`rev-${gradId}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-revenue)" stopOpacity={0.45} />
                  <stop offset="55%" stopColor="var(--color-revenue)" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="var(--color-revenue)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id={`exp-${gradId}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-expenses)" stopOpacity={0.4} />
                  <stop offset="55%" stopColor="var(--color-expenses)" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="var(--color-expenses)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid className="stroke-border" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={8} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                width={44}
                tick={{ className: "tabular-nums" }}
                tickFormatter={compact}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent indicator="line" formatter={(v) => formatCurrency(Number(v), "IDR")} />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                dataKey="revenue"
                type="monotone"
                stroke="var(--color-revenue)"
                strokeWidth={2}
                fill={`url(#rev-${gradId})`}
                dot={false}
              />
              <Area
                dataKey="expenses"
                type="monotone"
                stroke="var(--color-expenses)"
                strokeWidth={2}
                fill={`url(#exp-${gradId})`}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* A/R Aging */}
        <Card className="shadow-none dark:ring-0">
          <CardHeader>
            <CardTitle className="text-base">Accounts receivable aging</CardTitle>
          </CardHeader>
          <CardContent>
            {totalOutstanding === 0 ? (
              <p className="text-sm text-muted-foreground">No outstanding invoices.</p>
            ) : (
              <div className="space-y-4">
                {aging.map((b, i) => (
                  <div key={b.label} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: agingColors[i] }}
                        />
                        <span className="font-medium">{b.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {b.count} invoice{b.count === 1 ? "" : "s"}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {formatCurrency(b.total, "IDR")}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(b.total / agingMax) * 100}%`, background: agingColors[i] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card className="shadow-none dark:ring-0">
          <CardHeader>
            <CardTitle className="text-base">Top clients</CardTitle>
          </CardHeader>
          <CardContent>
            {topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No paid invoices yet.</p>
            ) : (
              <div className="space-y-3">
                {topClients.map((c, i) => {
                  const max = topClients[0].total || 1;
                  return (
                    <div key={c.id} className="space-y-1">
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="truncate font-medium">
                          {i + 1}. {c.name}
                        </span>
                        <span className="shrink-0 pl-3 tabular-nums">
                          {formatCurrency(c.total, "IDR")}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-[var(--chart-1)]"
                          style={{ width: `${(c.total / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="gap-0 p-4 shadow-none dark:ring-0">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 truncate font-display text-2xl tabular-nums">{value}</div>
      {sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}
    </Card>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="gap-2 p-4 shadow-none dark:ring-0">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-28" />
          </Card>
        ))}
      </div>
      <Card className="shadow-none dark:ring-0">
        <CardHeader>
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="aspect-[16/7] w-full" />
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="shadow-none dark:ring-0">
            <CardHeader>
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 4 }).map((_, r) => (
                <div key={r} className="space-y-1.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
