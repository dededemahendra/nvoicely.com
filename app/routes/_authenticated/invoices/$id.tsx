import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { Send, CheckCircle, Pencil, FileDown, XCircle } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { PageHeader } from "~/components/shared/PageHeader";
import { StatusBadge } from "~/components/shared/StatusBadge";
import { ConfirmDialog } from "~/components/shared/ConfirmDialog";
import { Skeleton } from "~/components/ui/skeleton";
import { useInvoice, useUpdateInvoiceStatus } from "~/hooks/useInvoices";
import { useClient } from "~/hooks/useClients";
import { formatCurrency } from "~/lib/currency";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/invoices/$id")({
  component: InvoiceDetailPage,
});

function InvoiceDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: invoice, isLoading } = useInvoice(id);
  const { data: client } = useClient(invoice?.client_id ?? "");
  const updateStatus = useUpdateInvoiceStatus();

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!invoice) return <p>Invoice not found</p>;

  const displayStatus = invoice.status === "sent" && new Date(invoice.due_date) < new Date() ? "overdue" : invoice.status;

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
      <PageHeader
        title={invoice.invoice_number}
        action={
          <div className="flex gap-2">
            {invoice.status === "draft" && (
              <>
                <Button variant="outline" asChild>
                  <Link to="/invoices/$id/edit" params={{ id }}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                </Button>
                <Button onClick={() => handleStatusChange("sent")} disabled={updateStatus.isPending}>
                  <Send className="h-4 w-4 mr-2" />
                  Mark as Sent
                </Button>
              </>
            )}
            {(invoice.status === "sent" || displayStatus === "overdue") && (
              <>
                <Button
                  variant="default"
                  onClick={() => handleStatusChange("paid")}
                  disabled={updateStatus.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Paid
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button variant="outline">
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Invoice
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
                <FileDown className="h-4 w-4 mr-2" />
                PDF Preview
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Invoice Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={displayStatus as any} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Issue Date</span>
              <span>{format(new Date(invoice.issue_date), "dd MMM yyyy")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due Date</span>
              <span>{format(new Date(invoice.due_date), "dd MMM yyyy")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Currency</span>
              <span>{invoice.currency}</span>
            </div>
            {invoice.paid_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid On</span>
                <span>{format(new Date(invoice.paid_at), "dd MMM yyyy")}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{client?.name ?? "Loading..."}</p>
            <p className="text-muted-foreground">{client?.email}</p>
            {client?.company && <p className="text-muted-foreground">{client.company}</p>}
            {client?.phone && <p className="text-muted-foreground">{client.phone}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Tax %</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.line_items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unit_price, invoice.currency)}</TableCell>
                  <TableCell className="text-right">{item.tax_rate}%</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(item.amount, invoice.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex justify-end">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(invoice.tax_amount, invoice.currency)}</span>
              </div>
              {(invoice.discount_amount ?? 0) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(invoice.discount_amount!, invoice.currency)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>{formatCurrency(invoice.total, invoice.currency)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {(invoice.notes || invoice.payment_terms) && (
        <div className="grid gap-6 md:grid-cols-2">
          {invoice.notes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p></CardContent>
            </Card>
          )}
          {invoice.payment_terms && (
            <Card>
              <CardHeader><CardTitle className="text-base">Payment Terms</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.payment_terms}</p></CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
