import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Send, CheckCircle, Pencil, FileDown, XCircle, ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { StatusBadge } from "~/components/shared/StatusBadge";
import { ConfirmDialog } from "~/components/shared/ConfirmDialog";
import { Skeleton } from "~/components/ui/skeleton";
import { useInvoice, useUpdateInvoiceStatus } from "~/hooks/useInvoices";
import { useClient } from "~/hooks/useClients";
import { formatCurrency } from "~/lib/currency";
import { toast } from "sonner";
import type { InvoiceStatus } from "~/types";

export const Route = createFileRoute("/_authenticated/invoices/$id")({
  component: InvoiceDetailPage,
});

function InvoiceDetailPage() {
  const { id } = Route.useParams();
  const { data: invoice, isLoading } = useInvoice(id);
  const { data: client } = useClient(invoice?.client_id ?? "");
  const updateStatus = useUpdateInvoiceStatus();

  if (isLoading) return <DetailSkeleton />;
  if (!invoice) return <p className="text-sm text-muted-foreground">Invoice not found.</p>;

  const displayStatus: InvoiceStatus =
    invoice.status === "sent" && new Date(invoice.due_date) < new Date()
      ? "overdue"
      : invoice.status;

  function handleStatusChange(status: "sent" | "paid" | "cancelled") {
    updateStatus.mutate(
      { id: invoice!.$id, status },
      {
        onSuccess: () => toast.success(`Invoice marked as ${status}`),
        onError: () => toast.error("Failed to update status"),
      }
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/invoices"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to invoices
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl tracking-tight md:text-4xl">
              {invoice.invoice_number}
            </h1>
            <StatusBadge status={displayStatus} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Issued {format(new Date(invoice.issue_date), "dd MMM yyyy")} · Due{" "}
            {format(new Date(invoice.due_date), "dd MMM yyyy")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {invoice.status === "draft" && (
            <>
              <Button variant="outline" asChild>
                <Link to="/invoices/$id/edit" params={{ id }}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <Button onClick={() => handleStatusChange("sent")} disabled={updateStatus.isPending}>
                <Send className="h-4 w-4" />
                Mark as sent
              </Button>
            </>
          )}
          {(invoice.status === "sent" || displayStatus === "overdue") && (
            <>
              <Button onClick={() => handleStatusChange("paid")} disabled={updateStatus.isPending}>
                <CheckCircle className="h-4 w-4" />
                Mark as paid
              </Button>
              <ConfirmDialog
                trigger={
                  <Button variant="outline">
                    <XCircle className="h-4 w-4" />
                    Cancel
                  </Button>
                }
                title="Cancel this invoice?"
                description="Cancelled invoices are not counted in revenue metrics."
                onConfirm={() => handleStatusChange("cancelled")}
              />
            </>
          )}
          <Button variant="outline" asChild>
            <Link to="/invoices/$id/preview" params={{ id }}>
              <FileDown className="h-4 w-4" />
              Preview PDF
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main: line items + totals */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="shadow-none dark:ring-0">
            <CardHeader>
              <CardTitle className="text-base">Line items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit price</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="pr-6 text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.line_items.map((item) => (
                    <TableRow key={item.id} className="hover:bg-transparent">
                      <TableCell className="pl-6">{item.description}</TableCell>
                      <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {formatCurrency(item.unit_price, invoice.currency)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {item.tax_rate}%
                      </TableCell>
                      <TableCell className="pr-6 text-right font-mono text-sm tabular-nums">
                        {formatCurrency(item.amount, invoice.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Totals */}
          <div className="flex justify-end">
            <Card className="w-full shadow-none sm:max-w-xs dark:ring-0">
              <CardContent className="space-y-3 p-5 text-sm">
                <Row label="Subtotal" value={formatCurrency(invoice.subtotal, invoice.currency)} />
                <Row label="Tax" value={formatCurrency(invoice.tax_amount, invoice.currency)} />
                {(invoice.discount_amount ?? 0) > 0 && (
                  <Row
                    label="Discount"
                    value={`−${formatCurrency(invoice.discount_amount!, invoice.currency)}`}
                    className="text-success"
                  />
                )}
                <div className="flex items-baseline justify-between border-t pt-3">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-display text-2xl tabular-nums">
                    {formatCurrency(invoice.total, invoice.currency)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar: bill-to + details */}
        <div className="space-y-4">
          <Card className="shadow-none dark:ring-0">
            <CardHeader>
              <CardTitle className="text-base">Billed to</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium text-foreground">{client?.name ?? "Unknown"}</p>
              {client?.company && <p className="text-muted-foreground">{client.company}</p>}
              {client?.email && <p className="text-muted-foreground">{client.email}</p>}
              {client?.phone && <p className="text-muted-foreground">{client.phone}</p>}
              {client?.address_line1 && (
                <p className="text-muted-foreground">{client.address_line1}</p>
              )}
              {client?.city && (
                <p className="text-muted-foreground">
                  {client.city}
                  {client.country ? `, ${client.country}` : ""}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none dark:ring-0">
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Currency" value={invoice.currency} />
              <Row label="Issue date" value={format(new Date(invoice.issue_date), "dd MMM yyyy")} />
              <Row label="Due date" value={format(new Date(invoice.due_date), "dd MMM yyyy")} />
              {invoice.paid_at && (
                <Row
                  label="Paid on"
                  value={format(new Date(invoice.paid_at), "dd MMM yyyy")}
                  className="text-success"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Notes & terms */}
      {(invoice.notes || invoice.payment_terms) && (
        <div className="grid gap-4 md:grid-cols-2">
          {invoice.payment_terms && (
            <Card className="shadow-none dark:ring-0">
              <CardHeader>
                <CardTitle className="text-base">Payment terms</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {invoice.payment_terms}
                </p>
              </CardContent>
            </Card>
          )}
          {invoice.notes && (
            <Card className="shadow-none dark:ring-0">
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${className ?? ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-32" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 lg:col-span-2" />
        <div className="space-y-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      </div>
    </div>
  );
}
