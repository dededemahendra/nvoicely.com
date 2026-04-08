import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, Clock, AlertCircle, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { PageHeader } from "~/components/shared/PageHeader";
import { StatusBadge } from "~/components/shared/StatusBadge";
import { useInvoices } from "~/hooks/useInvoices";
import { useExpenses } from "~/hooks/useExpenses";
import { formatCurrency, CURRENCIES } from "~/lib/currency";
import type { CurrencyCode } from "~/types";

function toIdr(amount: number, currency: CurrencyCode, rateToIdr: number | undefined) {
  if (currency === "IDR") return amount;
  const cfg = CURRENCIES[currency];
  return Math.round((amount / cfg.divisor) * (rateToIdr ?? 1));
}
import { format } from "date-fns";
import { Skeleton } from "~/components/ui/skeleton";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = Route.useRouteContext();
  const { data: invoices, isLoading: loadingInvoices } = useInvoices(user.$id);
  const { data: expenses, isLoading: loadingExpenses } = useExpenses(user.$id);

  const paidInvoices = invoices?.filter((i) => i.status === "paid") ?? [];
  const sentInvoices = invoices?.filter((i) => i.status === "sent") ?? [];
  const overdueInvoices = invoices?.filter(
    (i) => i.status === "sent" && new Date(i.due_date) < new Date()
  ) ?? [];
  const draftInvoices = invoices?.filter((i) => i.status === "draft") ?? [];

  const totalRevenue = paidInvoices.reduce(
    (sum, inv) => sum + toIdr(inv.total, inv.currency, inv.exchange_rate_to_idr),
    0
  );
  const outstanding = sentInvoices.reduce(
    (sum, inv) => sum + toIdr(inv.total, inv.currency, inv.exchange_rate_to_idr),
    0
  );
  const overdue = overdueInvoices.reduce(
    (sum, inv) => sum + toIdr(inv.total, inv.currency, inv.exchange_rate_to_idr),
    0
  );

  const recentInvoices = (invoices ?? []).slice(0, 5);

  const cards = [
    {
      label: "Total Revenue",
      value: formatCurrency(totalRevenue, "IDR"),
      description: "All paid invoices",
      icon: TrendingUp,
      color: "text-emerald-600",
    },
    {
      label: "Outstanding",
      value: formatCurrency(outstanding, "IDR"),
      description: "Sent, awaiting payment",
      icon: Clock,
      color: "text-blue-600",
    },
    {
      label: "Overdue",
      value: formatCurrency(overdue, "IDR"),
      description: "Past due date",
      icon: AlertCircle,
      color: "text-red-600",
    },
    {
      label: "Drafts",
      value: String(draftInvoices.length),
      description: "Not yet sent",
      icon: FileText,
      color: "text-zinc-500",
    },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader title="Dashboard" description={`Welcome back, ${user.name}`} />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) =>
          loadingInvoices ? (
            <Card key={card.label} className="p-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-3 h-6 w-28" />
            </Card>
          ) : (
            <Card key={card.label} className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <div className="mt-2 text-lg font-semibold tabular-nums md:text-2xl">{card.value}</div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{card.description}</p>
            </Card>
          )
        )}
      </div>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingInvoices ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recentInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No invoices yet.{" "}
              <Link to="/invoices/new" className="underline">
                Create your first invoice
              </Link>
            </p>
          ) : (
            <div className="space-y-2">
              {recentInvoices.map((inv) => (
                <Link
                  key={inv.$id}
                  to="/invoices/$id"
                  params={{ id: inv.$id }}
                  className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm">{inv.invoice_number}</span>
                    <StatusBadge status={inv.status === "sent" && new Date(inv.due_date) < new Date() ? "overdue" : inv.status} />
                  </div>
                  <div className="text-right">
                    <span className="font-medium tabular-nums">{formatCurrency(inv.total, inv.currency)}</span>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(inv.issue_date), "dd MMM yyyy")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
