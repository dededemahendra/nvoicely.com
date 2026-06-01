import { cn } from "~/lib/utils";
import { type ComponentProps, useId, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  formatChartAxisTick,
  formatChartTooltipDate,
} from "~/components/formater";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Delta, DeltaIcon, DeltaValue } from "~/components/delta";
import { formatCurrency } from "~/lib/currency";
import type { RevenuePoint } from "./metrics";

type PeriodDays = 7 | 30 | 60;

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function RevenueTrendChart({
  data,
  className,
  ...props
}: ComponentProps<typeof Card> & { data: RevenuePoint[] }) {
  const chartUid = useId().replace(/:/g, "");
  const gradientId = `revenue-area-grad-${chartUid}`;
  const [periodDays, setPeriodDays] = useState<PeriodDays>(30);

  const rows = useMemo(
    () => data.slice(Math.max(0, data.length - periodDays)),
    [data, periodDays]
  );

  // Compare total revenue in the first half of the window vs the second half,
  // so a single zero day (e.g. nothing paid today) doesn't read as -100%.
  // null = no baseline revenue in the first half → hide the badge.
  const growthPct = useMemo(() => {
    if (rows.length < 2) return null;
    const mid = Math.floor(rows.length / 2);
    const firstHalf = rows.slice(0, mid).reduce((s, r) => s + r.revenue, 0);
    const secondHalf = rows.slice(mid).reduce((s, r) => s + r.revenue, 0);
    if (firstHalf === 0) return null;
    return ((secondHalf - firstHalf) / firstHalf) * 100;
  }, [rows]);

  return (
    <Card
      className={cn("shadow-none md:col-span-2 lg:col-span-3 dark:ring-0", className)}
      {...props}
    >
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Revenue</CardTitle>
            {growthPct !== null && (
              <Delta value={growthPct} variant="badge">
                <DeltaIcon variant="trend" />
                <DeltaValue />
              </Delta>
            )}
          </div>
          <CardDescription>Paid revenue per day (IDR equivalent).</CardDescription>
        </div>
        <Select
          onValueChange={(v) => setPeriodDays(Number(v) as PeriodDays)}
          value={String(periodDays)}
        >
          <SelectTrigger
            aria-label="Revenue time range"
            className="w-full min-w-36 sm:w-fit"
            size="sm"
          >
            <SelectValue placeholder="Range" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ChartContainer className="aspect-22/8 w-full" config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={rows}
            margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-revenue)" stopOpacity={0.45} />
                <stop offset="55%" stopColor="var(--color-revenue)" stopOpacity={0.12} />
                <stop offset="100%" stopColor="var(--color-revenue)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid className="stroke-border" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="date"
              interval={periodDays <= 7 ? 0 : "preserveStartEnd"}
              minTickGap={periodDays >= 60 ? 20 : 28}
              tickFormatter={(value) => formatChartAxisTick(String(value), periodDays)}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              axisLine={false}
              tick={{ className: "tabular-nums" }}
              tickFormatter={(v) =>
                new Intl.NumberFormat("en", { notation: "compact" }).format(Number(v))
              }
              tickLine={false}
              tickMargin={8}
              width={44}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  className="min-w-40"
                  indicator="line"
                  formatter={(value) => formatCurrency(Number(value), "IDR")}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as RevenuePoint | undefined;
                    return row?.date ? formatChartTooltipDate(row.date, "long") : "";
                  }}
                />
              }
            />
            <Area
              dataKey="revenue"
              dot={false}
              fill={`url(#${gradientId})`}
              stroke="var(--color-revenue)"
              strokeWidth={2}
              type="natural"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
