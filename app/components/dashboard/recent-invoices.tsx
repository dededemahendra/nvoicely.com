import { cn } from "~/lib/utils";
import type { ComponentProps } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { StatusBadge } from "~/components/shared/StatusBadge";
import { formatCurrency } from "~/lib/currency";
import { parseIsoCalendarDate } from "~/components/formater";
import type { RecentInvoiceRow } from "./metrics";

export function RecentInvoices({
  data,
  className,
  ...props
}: ComponentProps<typeof Card> & { data: RecentInvoiceRow[] }) {
  return (
    <Card className={cn("gap-0 shadow-none md:col-span-2 dark:ring-0", className)} {...props}>
      <CardHeader className="border-b">
        <CardTitle>Recent invoices</CardTitle>
        <CardDescription>Your latest 5 invoices</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            No invoices yet.{" "}
            <Link to="/invoices/new" className="underline underline-offset-4">
              Create your first
            </Link>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Invoice</TableHead>
                <TableHead className="hidden sm:table-cell">Client</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="pr-6 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r) => (
                <TableRow className="h-14 hover:bg-accent/30" key={r.id}>
                  <TableCell className="pl-6 font-mono text-xs">
                    <Link to="/invoices/$id" params={{ id: r.id }} className="hover:underline">
                      {r.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden max-w-36 truncate sm:table-cell">
                    {r.clientName}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(parseIsoCalendarDate(r.issueDate.slice(0, 10)), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {formatCurrency(r.total, r.currency)}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <StatusBadge status={r.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="flex justify-center border-t py-3">
          <Button asChild size="sm" variant="ghost">
            <Link to="/invoices">
              View all invoices
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
