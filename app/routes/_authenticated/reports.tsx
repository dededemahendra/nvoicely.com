import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { format, subMonths, startOfMonth, isAfter } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { PageHeader } from "~/components/shared/PageHeader";
import { useInvoices } from "~/hooks/useInvoices";
import { useClients } from "~/hooks/useClients";
import { useExpenses } from "~/hooks/useExpenses";
import { formatCurrency, CURRENCIES } from "~/lib/currency";
import type { CurrencyCode } from "~/types";

// Normalize a stored amount (in its currency's smallest units) to IDR sen
// using the per-document exchange_rate_to_idr that was captured at create
// time. Returns IDR sen as an integer (IDR has divisor=1, so it's just IDR).
function toIdr(
  amount: number,
  currency: CurrencyCode,
  rateToIdr: number | undefined
): number {
  if (currency === "IDR") return amount;
  const cfg = CURRENCIES[currency];
  const major = amount / cfg.divisor;
  const idrMajor = major * (rateToIdr ?? 1);
  return Math.round(idrMajor);
}

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { user } = Route.useRouteContext();
  const { data: invoices, isLoading: loadingInv } = useInvoices(user.$id);
  const { data: clients } = useClients(user.$id);
  const { data: expenses } = useExpenses(user.$id);

  // Last 6 months revenue (paid invoices)
  const revenueByMonth = useMemo(() => {
    const buckets: { month: string; key: string; revenue: number; expenses: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = startOfMonth(subMonths(new Date(), i));
      buckets.push({
        month: format(d, "MMM"),
        key: format(d, "yyyy-MM"),
        revenue: 0,
        expenses: 0,
      });
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));

    (invoices ?? [])
      .filter((i) => i.status === "paid" && i.paid_at)
      .forEach((i) => {
        const k = format(new Date(i.paid_at!), "yyyy-MM");
        const bi = idx.get(k);
        if (bi !== undefined) buckets[bi].revenue += toIdr(i.total, i.currency, i.exchange_rate_to_idr);
      });

    (expenses ?? []).forEach((e) => {
      const k = format(new Date(e.date), "yyyy-MM");
      const bi = idx.get(k);
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
        const b =
          buckets.find((bk) => daysPast >= bk.min && daysPast <= bk.max) ?? buckets[0];
        b.total += toIdr(i.total, i.currency, i.exchange_rate_to_idr);
        b.count += 1;
      });
    return buckets;
  }, [invoices]);

  const totalOutstanding = aging.reduce((s, b) => s + b.total, 0);
  const ytdRevenue = useMemo(() => {
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    return (invoices ?? [])
      .filter((i) => i.status === "paid" && i.paid_at && isAfter(new Date(i.paid_at), yearStart))
      .reduce((s, i) => s + toIdr(i.total, i.currency, i.exchange_rate_to_idr), 0);
  }, [invoices]);

  if (loadingInv) return <Skeleton className="h-96 w-full" />;

  const agingColors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader title="Reports" description="Revenue, expenses, and accounts receivable" />

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="YTD Revenue" value={formatCurrency(ytdRevenue, "IDR")} />
        <StatCard label="Outstanding" value={formatCurrency(totalOutstanding, "IDR")} />
        <StatCard
          label="Top Client"
          value={topClients[0]?.name ?? "None"}
          sub={topClients[0] ? formatCurrency(topClients[0].total, "IDR") : ""}
        />
        <StatCard label="Open Invoices" value={String(aging.reduce((s, b) => s + b.count, 0))} />
      </div>

      {/* Revenue vs Expenses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue vs Expenses · Last 6 months</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis
                  fontSize={12}
                  tickFormatter={(v) => new Intl.NumberFormat("en", { notation: "compact" }).format(v)}
                />
                <Tooltip
                  formatter={(v) => formatCurrency(Number(v), "IDR")}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        {/* A/R Aging */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Accounts Receivable Aging</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <BarChart data={aging} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis
                    type="number"
                    fontSize={12}
                    tickFormatter={(v) =>
                      new Intl.NumberFormat("en", { notation: "compact" }).format(v)
                    }
                  />
                  <YAxis dataKey="label" type="category" width={90} fontSize={12} />
                  <Tooltip
                    formatter={(v) => formatCurrency(Number(v), "IDR")}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {aging.map((_, i) => (
                      <Cell key={i} fill={agingColors[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              {aging.map((b, i) => (
                <div key={b.label} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: agingColors[i] }}
                  />
                  <span>
                    {b.label}: {b.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Clients</CardTitle>
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
                        <span className="font-medium">
                          {i + 1}. {c.name}
                        </span>
                        <span className="tabular-nums">{formatCurrency(c.total, "IDR")}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-500"
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
    <Card className="p-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 truncate text-lg font-semibold tabular-nums md:text-2xl">{value}</div>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </Card>
  );
}
