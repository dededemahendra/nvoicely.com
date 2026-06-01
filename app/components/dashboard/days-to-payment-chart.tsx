import { cn } from "~/lib/utils";
import type { ComponentProps } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
import type { PaymentBucket } from "./metrics";

const chartConfig = {
  count: { label: "Invoices", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function DaysToPaymentChart({
  data,
  avgDays,
  className,
  ...props
}: ComponentProps<typeof Card> & { data: PaymentBucket[]; avgDays: number }) {
  const hasData = data.some((d) => d.count > 0);

  return (
    <Card className={cn("flex flex-col shadow-none dark:ring-0", className)} {...props}>
      <CardHeader className="space-y-1">
        <CardTitle>Time to payment</CardTitle>
        <CardDescription>
          {hasData ? `Avg ${avgDays} day${avgDays === 1 ? "" : "s"} from issue to paid` : "No paid invoices yet"}
        </CardDescription>
      </CardHeader>
      <CardContent className="my-auto">
        {hasData ? (
          <ChartContainer className="aspect-video w-full" config={chartConfig}>
            <BarChart accessibilityLayer data={data} margin={{ left: -8, right: 8, top: 8 }}>
              <CartesianGrid className="stroke-border" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="bucket"
                tickLine={false}
                tickMargin={8}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tick={{ className: "tabular-nums" }}
                tickLine={false}
                tickMargin={8}
                width={28}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 0, 0]} maxBarSize={56} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex aspect-video items-center justify-center text-sm text-muted-foreground">
            Nothing to show
          </div>
        )}
      </CardContent>
    </Card>
  );
}
