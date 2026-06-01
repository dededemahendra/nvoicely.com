import { useMemo } from "react";
import { startOfMonth, subMonths, subDays, format } from "date-fns";
import { useInvoices } from "~/hooks/useInvoices";
import { useExpenses } from "~/hooks/useExpenses";
import { useClients } from "~/hooks/useClients";
import { CURRENCIES } from "~/lib/currency";
import type { Invoice, CurrencyCode, InvoiceStatus } from "~/types";

/** Normalize any invoice/expense amount to IDR major units for cross-currency totals. */
export function toIdr(
  amount: number,
  currency: CurrencyCode,
  rateToIdr: number | undefined
) {
  if (currency === "IDR") return amount;
  const cfg = CURRENCIES[currency];
  return Math.round((amount / cfg.divisor) * (rateToIdr ?? 1));
}

/** A sent invoice past its due date is shown as overdue. */
export function effectiveStatus(inv: Invoice, now: Date): InvoiceStatus {
  if (inv.status === "sent" && new Date(inv.due_date) < now) return "overdue";
  return inv.status;
}

export interface RevenuePoint {
  date: string; // yyyy-MM-dd
  revenue: number; // IDR major units
}

export interface StatusSlice {
  status: "draft" | "sent" | "overdue" | "paid";
  count: number;
  fill: string;
}

export interface RecentInvoiceRow {
  id: string;
  invoiceNumber: string;
  clientName: string;
  status: InvoiceStatus;
  total: number;
  currency: CurrencyCode;
  issueDate: string;
}

const REVENUE_WINDOW_DAYS = 60;

export function useDashboardMetrics(userId: string) {
  const { data: invoices, isLoading } = useInvoices(userId);
  const { data: expenses } = useExpenses(userId);
  const { data: clients } = useClients(userId);

  return useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const list = invoices ?? [];

    const clientName = new Map((clients ?? []).map((c) => [c.$id, c.name]));

    // ----- Revenue: this month vs last month (by paid_at) -----
    let thisMonth = 0;
    let lastMonth = 0;
    list
      .filter((i) => i.status === "paid")
      .forEach((i) => {
        if (!i.paid_at) return;
        const v = toIdr(i.total, i.currency, i.exchange_rate_to_idr);
        const paid = new Date(i.paid_at);
        if (paid >= thisMonthStart) thisMonth += v;
        else if (paid >= lastMonthStart && paid < thisMonthStart) lastMonth += v;
      });
    // null = no prior-month revenue to compare against (avoids a misleading
    // flat "+100%" for the first month with any income).
    const deltaPct =
      lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;

    // ----- Outstanding / overdue -----
    const sent = list.filter((i) => i.status === "sent");
    const overdue = sent.filter((i) => new Date(i.due_date) < now);
    const outstanding = sent.reduce(
      (s, i) => s + toIdr(i.total, i.currency, i.exchange_rate_to_idr),
      0
    );
    const overdueAmount = overdue.reduce(
      (s, i) => s + toIdr(i.total, i.currency, i.exchange_rate_to_idr),
      0
    );

    // ----- This-month expenses + profit -----
    const monthExpenses = (expenses ?? [])
      .filter((e) => new Date(e.date) >= thisMonthStart)
      .reduce((s, e) => s + toIdr(e.amount, e.currency, e.exchange_rate_to_idr), 0);
    const monthProfit = thisMonth - monthExpenses;

    // ----- Daily revenue series (last 60 days, by paid_at) -----
    const dayIndex = new Map<string, number>();
    const revenueDaily: RevenuePoint[] = [];
    for (let i = REVENUE_WINDOW_DAYS - 1; i >= 0; i--) {
      const key = format(subDays(now, i), "yyyy-MM-dd");
      dayIndex.set(key, revenueDaily.length);
      revenueDaily.push({ date: key, revenue: 0 });
    }
    list
      .filter((i) => i.status === "paid" && i.paid_at)
      .forEach((i) => {
        const key = format(new Date(i.paid_at!), "yyyy-MM-dd");
        const idx = dayIndex.get(key);
        if (idx !== undefined)
          revenueDaily[idx].revenue += toIdr(
            i.total,
            i.currency,
            i.exchange_rate_to_idr
          );
      });

    // ----- Status breakdown (effective status) -----
    const counts = { draft: 0, sent: 0, overdue: 0, paid: 0 };
    list.forEach((i) => {
      const s = effectiveStatus(i, now);
      if (s in counts) counts[s as keyof typeof counts] += 1;
    });
    const allSlices: StatusSlice[] = [
      { status: "paid", count: counts.paid, fill: "var(--color-paid)" },
      { status: "sent", count: counts.sent, fill: "var(--color-sent)" },
      { status: "overdue", count: counts.overdue, fill: "var(--color-overdue)" },
      { status: "draft", count: counts.draft, fill: "var(--color-draft)" },
    ];
    const statusBreakdown = allSlices.filter((s) => s.count > 0);

    // ----- Recent invoices -----
    const recentInvoices: RecentInvoiceRow[] = list.slice(0, 5).map((i) => ({
      id: i.$id,
      invoiceNumber: i.invoice_number,
      clientName: clientName.get(i.client_id) ?? "Unknown",
      status: effectiveStatus(i, now),
      total: i.total,
      currency: i.currency,
      issueDate: i.issue_date,
    }));

    return {
      isLoading,
      hasInvoices: list.length > 0,
      thisMonth,
      lastMonth,
      deltaPct,
      outstanding,
      overdueAmount,
      overdueCount: overdue.length,
      monthExpenses,
      monthProfit,
      revenueDaily,
      statusBreakdown,
      recentInvoices,
    };
  }, [invoices, expenses, clients, isLoading]);
}

export type DashboardMetrics = ReturnType<typeof useDashboardMetrics>;
