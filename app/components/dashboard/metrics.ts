import { useMemo } from "react";
import {
  startOfMonth,
  subMonths,
  subDays,
  format,
  differenceInDays,
} from "date-fns";
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

/** A paid invoice counts as overdue-resolved; a sent invoice past its due date is overdue. */
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

export interface PaymentBucket {
  bucket: string;
  count: number;
}

export interface TopClient {
  id: string;
  name: string;
  revenue: number; // IDR major units
  count: number;
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
    let totalRevenue = 0;
    list
      .filter((i) => i.status === "paid")
      .forEach((i) => {
        const v = toIdr(i.total, i.currency, i.exchange_rate_to_idr);
        totalRevenue += v;
        if (!i.paid_at) return;
        const paid = new Date(i.paid_at);
        if (paid >= thisMonthStart) thisMonth += v;
        else if (paid >= lastMonthStart && paid < thisMonthStart) lastMonth += v;
      });
    const deltaPct =
      lastMonth > 0
        ? ((thisMonth - lastMonth) / lastMonth) * 100
        : thisMonth > 0
        ? 100
        : 0;

    // ----- Outstanding / overdue / drafts -----
    const sent = list.filter((i) => i.status === "sent");
    const overdue = sent.filter((i) => new Date(i.due_date) < now);
    const draftCount = list.filter((i) => i.status === "draft").length;
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

    // ----- Days-to-payment buckets -----
    const buckets = { "0–7": 0, "8–14": 0, "15–30": 0, "30+": 0 };
    let dtpSum = 0;
    let dtpCount = 0;
    list
      .filter((i) => i.status === "paid" && i.paid_at)
      .forEach((i) => {
        const days = Math.max(
          0,
          differenceInDays(new Date(i.paid_at!), new Date(i.issue_date))
        );
        dtpSum += days;
        dtpCount += 1;
        if (days <= 7) buckets["0–7"] += 1;
        else if (days <= 14) buckets["8–14"] += 1;
        else if (days <= 30) buckets["15–30"] += 1;
        else buckets["30+"] += 1;
      });
    const paymentBuckets: PaymentBucket[] = Object.entries(buckets).map(
      ([bucket, count]) => ({ bucket, count })
    );
    const avgDaysToPayment = dtpCount > 0 ? Math.round(dtpSum / dtpCount) : 0;

    // ----- Top clients by paid revenue -----
    const byClient = new Map<string, { revenue: number; count: number }>();
    list
      .filter((i) => i.status === "paid")
      .forEach((i) => {
        const cur = byClient.get(i.client_id) ?? { revenue: 0, count: 0 };
        cur.revenue += toIdr(i.total, i.currency, i.exchange_rate_to_idr);
        cur.count += 1;
        byClient.set(i.client_id, cur);
      });
    const topClients: TopClient[] = [...byClient.entries()]
      .map(([id, v]) => ({
        id,
        name: clientName.get(id) ?? "Unknown client",
        revenue: v.revenue,
        count: v.count,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // ----- Recent invoices -----
    const recentInvoices: RecentInvoiceRow[] = list.slice(0, 5).map((i) => ({
      id: i.$id,
      invoiceNumber: i.invoice_number,
      clientName: clientName.get(i.client_id) ?? "—",
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
      totalRevenue,
      outstanding,
      overdueAmount,
      overdueCount: overdue.length,
      draftCount,
      monthExpenses,
      monthProfit,
      revenueDaily,
      statusBreakdown,
      paymentBuckets,
      avgDaysToPayment,
      topClients,
      recentInvoices,
    };
  }, [invoices, expenses, clients, isLoading]);
}

export type DashboardMetrics = ReturnType<typeof useDashboardMetrics>;
