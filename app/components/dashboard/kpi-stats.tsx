import { cn } from "~/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Delta, DeltaIcon, DeltaValue } from "~/components/delta";
import { formatCurrency } from "~/lib/currency";
import type { DashboardMetrics } from "./metrics";

type Card = {
  label: string;
  value: string;
  footnote: string;
  delta?: number | null;
};

export function KpiStats({ metrics }: { metrics: DashboardMetrics }) {
  const cards: Card[] = [
    {
      label: "This month",
      value: formatCurrency(metrics.thisMonth, "IDR"),
      delta: metrics.deltaPct,
      footnote:
        metrics.deltaPct === null ? "no prior-month revenue" : "vs last month",
    },
    {
      label: "Outstanding",
      value: formatCurrency(metrics.outstanding, "IDR"),
      footnote: "awaiting payment",
    },
    {
      label: "Overdue",
      value: formatCurrency(metrics.overdueAmount, "IDR"),
      footnote: `${metrics.overdueCount} invoice${metrics.overdueCount === 1 ? "" : "s"} past due`,
    },
    {
      label: "Profit this month",
      value: formatCurrency(metrics.monthProfit, "IDR"),
      footnote: `after ${formatCurrency(metrics.monthExpenses, "IDR")} expenses`,
    },
  ];

  return (
    <>
      {cards.map((c) => (
        <Card className={cn("shadow-none dark:ring-0")} key={c.label}>
          <CardHeader>
            <CardTitle className="font-normal text-muted-foreground text-xs">
              {c.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="font-display text-2xl tabular-nums">{c.value}</p>
            <div className="flex items-center gap-1 text-xs">
              {c.delta != null && (
                <Delta value={c.delta}>
                  <DeltaIcon />
                  <DeltaValue />
                </Delta>
              )}
              <span className="text-muted-foreground">{c.footnote}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
