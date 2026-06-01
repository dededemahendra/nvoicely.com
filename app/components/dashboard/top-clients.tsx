import { cn } from "~/lib/utils";
import type { ComponentProps } from "react";
import { Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { formatCurrency } from "~/lib/currency";
import type { TopClient } from "./metrics";

export function TopClients({
  data,
  className,
  ...props
}: ComponentProps<typeof Card> & { data: TopClient[] }) {
  const max = data[0]?.revenue ?? 0;

  return (
    <Card className={cn("shadow-none dark:ring-0", className)} {...props}>
      <CardHeader className="space-y-1">
        <CardTitle>Top clients</CardTitle>
        <CardDescription>By paid revenue</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No paid invoices yet
          </p>
        ) : (
          <ul className="space-y-4">
            {data.map((c) => (
              <li key={c.id}>
                <Link
                  to="/clients/$id"
                  params={{ id: c.id }}
                  className="group block"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium group-hover:underline">
                      {c.name}
                    </span>
                    <span className="shrink-0 font-mono text-sm tabular-nums">
                      {formatCurrency(c.revenue, "IDR")}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[var(--chart-1)]"
                      style={{ width: `${max > 0 ? (c.revenue / max) * 100 : 0}%` }}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
