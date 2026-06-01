import { cn } from "~/lib/utils";
import type { ComponentProps } from "react";
import { LabelList, Pie, PieChart } from "recharts";
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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart";
import type { StatusSlice } from "./metrics";

const chartConfig = {
  count: { label: "Invoices" },
  paid: { label: "Paid", color: "var(--chart-1)" },
  sent: { label: "Sent", color: "var(--chart-3)" },
  overdue: { label: "Overdue", color: "var(--chart-5)" },
  draft: { label: "Draft", color: "var(--chart-4)" },
} satisfies ChartConfig;

export function StatusBreakdownChart({
  data,
  className,
  ...props
}: ComponentProps<typeof Card> & { data: StatusSlice[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <Card className={cn("flex flex-col shadow-none dark:ring-0", className)} {...props}>
      <CardHeader className="items-center space-y-1 pb-0 sm:items-start">
        <CardTitle>Invoices by status</CardTitle>
        <CardDescription>{total} invoices total</CardDescription>
      </CardHeader>
      <CardContent className="my-auto">
        {total === 0 ? (
          <div className="flex aspect-square max-h-72 items-center justify-center text-sm text-muted-foreground">
            No invoices yet
          </div>
        ) : (
          <ChartContainer
            className="mx-auto aspect-square max-h-72 w-full"
            config={chartConfig}
          >
            <PieChart accessibilityLayer>
              <ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} />
              <Pie
                cornerRadius={8}
                data={data}
                dataKey="count"
                innerRadius={36}
                nameKey="status"
                outerRadius="88%"
                stroke="var(--card)"
                strokeWidth={4}
              >
                <LabelList
                  className="fill-background font-medium"
                  dataKey="count"
                  fill="currentColor"
                  fontWeight={500}
                  position="inside"
                  stroke="none"
                />
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="status" />} />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
