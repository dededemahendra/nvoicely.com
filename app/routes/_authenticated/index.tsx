import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Plus,
  Send,
  AlertCircle,
  FileText,
  Repeat,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, subMonths, startOfMonth, differenceInDays } from "date-fns";
import { Button } from "~/components/ui/button";
import { PageHeader } from "~/components/shared/PageHeader";
import { StatusBadge } from "~/components/shared/StatusBadge";
import { Skeleton } from "~/components/ui/skeleton";
import { useInvoices } from "~/hooks/useInvoices";
import { useExpenses } from "~/hooks/useExpenses";
import { formatCurrency, CURRENCIES } from "~/lib/currency";
import type { CurrencyCode } from "~/types";

function toIdr(amount: number, currency: CurrencyCode, rateToIdr: number | undefined) {
  if (currency === "IDR") return amount;
  const cfg = CURRENCIES[currency];
  return Math.round((amount / cfg.divisor) * (rateToIdr ?? 1));
}

function greeting(name: string) {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return `${part}, ${name.split(" ")[0]}`;
}

export const Route = createFileRoute("/_authenticated/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = Route.useRouteContext();
  const { data: invoices, isLoading: loadingInvoices } = useInvoices(user.$id);
  const { data: expenses } = useExpenses(user.$id);

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));

  // ----- Hero: this month vs last month -----
  const { thisMonth, lastMonth, deltaPct } = useMemo(() => {
    let tm = 0;
    let lm = 0;
    (invoices ?? [])
      .filter((i) => i.status === "paid" && i.paid_at)
      .forEach((i) => {
        const paid = new Date(i.paid_at!);
        const v = toIdr(i.total, i.currency, i.exchange_rate_to_idr);
        if (paid >= thisMonthStart) tm += v;
        else if (paid >= lastMonthStart && paid < thisMonthStart) lm += v;
      });
    const delta = lm > 0 ? ((tm - lm) / lm) * 100 : tm > 0 ? 100 : 0;
    return { thisMonth: tm, lastMonth: lm, deltaPct: delta };
  }, [invoices, thisMonthStart, lastMonthStart]);

  // ----- Stat aggregates (existing) -----
  const sentInvoices = invoices?.filter((i) => i.status === "sent") ?? [];
  const overdueInvoices = invoices?.filter(
    (i) => i.status === "sent" && new Date(i.due_date) < now
  ) ?? [];
  const draftInvoices = invoices?.filter((i) => i.status === "draft") ?? [];
  const staleDrafts = draftInvoices.filter(
    (i) => differenceInDays(now, new Date(i.created_at)) >= 3
  );

  const totalRevenue = (invoices ?? [])
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + toIdr(i.total, i.currency, i.exchange_rate_to_idr), 0);
  const outstanding = sentInvoices.reduce(
    (s, i) => s + toIdr(i.total, i.currency, i.exchange_rate_to_idr),
    0
  );
  const overdueAmount = overdueInvoices.reduce(
    (s, i) => s + toIdr(i.total, i.currency, i.exchange_rate_to_idr),
    0
  );

  // ----- This month expenses + profit -----
  const monthExpenses = (expenses ?? [])
    .filter((e) => new Date(e.date) >= thisMonthStart)
    .reduce((s, e) => s + toIdr(e.amount, e.currency, e.exchange_rate_to_idr), 0);
  const monthProfit = thisMonth - monthExpenses;

  // ----- Revenue chart: last 6 months -----
  const revenueByMonth = useMemo(() => {
    const buckets: { month: string; key: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = startOfMonth(subMonths(now, i));
      buckets.push({ month: format(d, "MMM"), key: format(d, "yyyy-MM"), revenue: 0 });
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    (invoices ?? [])
      .filter((i) => i.status === "paid" && i.paid_at)
      .forEach((i) => {
        const k = format(new Date(i.paid_at!), "yyyy-MM");
        const bi = idx.get(k);
        if (bi !== undefined)
          buckets[bi].revenue += toIdr(i.total, i.currency, i.exchange_rate_to_idr);
      });
    return buckets;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices]);

  const recentInvoices = (invoices ?? []).slice(0, 5);

  // ----- Action queue items -----
  const actionItems: {
    icon: typeof AlertCircle;
    label: string;
    detail: string;
    to: string;
    tone: "danger" | "warn" | "info";
  }[] = [];
  if (overdueInvoices.length > 0) {
    actionItems.push({
      icon: AlertCircle,
      label: `${overdueInvoices.length} overdue invoice${overdueInvoices.length > 1 ? "s" : ""}`,
      detail: `${formatCurrency(overdueAmount, "IDR")} past due — send reminders`,
      to: "/invoices",
      tone: "danger",
    });
  }
  if (staleDrafts.length > 0) {
    actionItems.push({
      icon: FileText,
      label: `${staleDrafts.length} stale draft${staleDrafts.length > 1 ? "s" : ""}`,
      detail: "Sitting unsent for 3+ days",
      to: "/invoices",
      tone: "warn",
    });
  }
  if (sentInvoices.length > 0 && overdueInvoices.length === 0) {
    actionItems.push({
      icon: Send,
      label: `${sentInvoices.length} awaiting payment`,
      detail: `${formatCurrency(outstanding, "IDR")} expected`,
      to: "/invoices",
      tone: "info",
    });
  }

  return (
    <div className="space-y-12 md:space-y-16">
      {/* ───────── Hero ───────── */}
      <section className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {format(now, "EEEE, dd MMMM yyyy")}
          </p>
          <h1 className="mt-3 font-display text-4xl leading-[0.95] tracking-tight md:text-6xl">
            {greeting(user.name)}.
          </h1>
          {loadingInvoices ? (
            <Skeleton className="mt-6 h-8 w-80" />
          ) : (
            <p className="mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
              You've earned{" "}
              <span className="font-display text-foreground tabular-nums">
                {formatCurrency(thisMonth, "IDR")}
              </span>{" "}
              this month
              {lastMonth > 0 && (
                <>
                  {" "}
                  ·{" "}
                  <span
                    className={`inline-flex items-center gap-1 font-mono text-xs ${
                      deltaPct >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {deltaPct >= 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {Math.abs(deltaPct).toFixed(1)}% vs last month
                  </span>
                </>
              )}
            </p>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/invoices/new">
              <Plus className="mr-1 h-4 w-4" />
              New invoice
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/clients/new">
              <Plus className="mr-1 h-4 w-4" />
              Client
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/expenses/new">
              <Plus className="mr-1 h-4 w-4" />
              Expense
            </Link>
          </Button>
        </div>
      </section>

      {/* ───────── Action Queue ───────── */}
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Needs attention
          </h2>
          <Link
            to="/invoices"
            className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground"
          >
            view all →
          </Link>
        </div>
        {loadingInvoices ? (
          <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card p-5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-3 h-3 w-48" />
              </div>
            ))}
          </div>
        ) : actionItems.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-card p-8 text-center">
            <Sparkles className="mx-auto h-5 w-5 text-success" />
            <p className="mt-3 font-display text-2xl">All caught up.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              No overdue invoices, no stale drafts. Nice work.
            </p>
          </div>
        ) : (
          <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
            {actionItems.map((item) => {
              const dotColor =
                item.tone === "danger"
                  ? "bg-destructive"
                  : item.tone === "warn"
                  ? "bg-amber-500"
                  : "bg-success";
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className="group relative flex items-start gap-4 bg-card p-5 transition-colors hover:bg-accent/30"
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm">{item.label}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                  <item.icon
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    strokeWidth={1.75}
                  />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ───────── KPI strip ───────── */}
      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4">
        {[
          { label: "Total revenue", value: formatCurrency(totalRevenue, "IDR"), sub: "lifetime, paid" },
          { label: "Outstanding", value: formatCurrency(outstanding, "IDR"), sub: "awaiting payment" },
          { label: "This month profit", value: formatCurrency(monthProfit, "IDR"), sub: `revenue − ${formatCurrency(monthExpenses, "IDR")} expenses` },
          { label: "Drafts", value: String(draftInvoices.length), sub: "not yet sent" },
        ].map((card) =>
          loadingInvoices ? (
            <div key={card.label} className="bg-card p-5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-4 h-7 w-28" />
            </div>
          ) : (
            <div key={card.label} className="bg-card p-5">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                {card.label}
              </span>
              <div className="mt-4 font-display text-3xl tabular-nums leading-none md:text-4xl">
                {card.value}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">{card.sub}</p>
            </div>
          )
        )}
      </section>

      {/* ───────── Chart + Recent ───────── */}
      <section className="grid gap-6 lg:grid-cols-5">
        {/* Revenue chart */}
        <div className="rounded-xl border border-border/60 bg-card p-6 lg:col-span-3">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Revenue
              </p>
              <h3 className="mt-1 font-display text-2xl">Last 6 months</h3>
            </div>
            <Link
              to="/reports"
              className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground"
            >
              full report →
            </Link>
          </div>
          <div className="mt-6 h-56 w-full">
            {loadingInvoices ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer>
                <BarChart data={revenueByMonth} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                  <XAxis
                    dataKey="month"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    stroke="#6b6a62"
                  />
                  <YAxis
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    stroke="#6b6a62"
                    tickFormatter={(v) =>
                      new Intl.NumberFormat("en", { notation: "compact" }).format(v)
                    }
                  />
                  <Tooltip
                    cursor={{ fill: "#e6ede8" }}
                    formatter={(v) => formatCurrency(Number(v), "IDR")}
                    contentStyle={{
                      fontSize: 12,
                      border: "1px solid #e2ddd1",
                      borderRadius: 8,
                      background: "#fff",
                    }}
                  />
                  <Bar dataKey="revenue" fill="#1c3d2f" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent invoices */}
        <div className="rounded-xl border border-border/60 bg-card p-6 lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Activity
              </p>
              <h3 className="mt-1 font-display text-2xl">Recent</h3>
            </div>
            <Link
              to="/invoices"
              className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground"
            >
              all →
            </Link>
          </div>

          <div className="mt-6">
            {loadingInvoices ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No invoices yet.{" "}
                <Link to="/invoices/new" className="underline underline-offset-4">
                  Create your first
                </Link>
              </p>
            ) : (
              <ul className="-mx-2 divide-y divide-border/60">
                {recentInvoices.map((inv) => (
                  <li key={inv.$id}>
                    <Link
                      to="/invoices/$id"
                      params={{ id: inv.$id }}
                      className="flex items-center justify-between gap-3 rounded-md px-2 py-3 transition-colors hover:bg-accent/30"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{inv.invoice_number}</span>
                          <StatusBadge
                            status={
                              inv.status === "sent" && new Date(inv.due_date) < now
                                ? "overdue"
                                : inv.status
                            }
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {format(new Date(inv.issue_date), "dd MMM yyyy")}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-sm tabular-nums">
                        {formatCurrency(inv.total, inv.currency)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
