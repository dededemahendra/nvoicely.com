import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Send, CheckCircle, Pencil, FileDown, XCircle, ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
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
  const { data: invoice, isLoading } = useInvoice(id);
  const { data: client } = useClient(invoice?.client_id ?? "");
  const updateStatus = useUpdateInvoiceStatus();

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!invoice) return <p>Invoice not found</p>;

  const displayStatus =
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
    <div className="space-y-10">
      {/* Back link */}
      <Link
        to="/invoices"
        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Invoices
      </Link>

      {/* Header */}
      <header className="flex flex-col gap-6 border-b border-border/60 pb-10 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Invoice
            </p>
            <StatusBadge status={displayStatus as any} />
          </div>
          <h1 className="mt-3 font-display text-5xl leading-[0.95] tracking-tight md:text-6xl">
            {invoice.invoice_number}
          </h1>
          <p className="mt-4 font-mono text-xs text-muted-foreground">
            Issued {format(new Date(invoice.issue_date), "dd MMM yyyy")} · Due{" "}
            {format(new Date(invoice.due_date), "dd MMM yyyy")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
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
                Mark as sent
              </Button>
            </>
          )}
          {(invoice.status === "sent" || displayStatus === "overdue") && (
            <>
              <Button onClick={() => handleStatusChange("paid")} disabled={updateStatus.isPending}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as paid
              </Button>
              <ConfirmDialog
                trigger={
                  <Button variant="outline">
                    <XCircle className="h-4 w-4 mr-2" />
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
              <FileDown className="h-4 w-4 mr-2" />
              Preview PDF
            </Link>
          </Button>
        </div>
      </header>

      {/* Bill-to + meta */}
      <section className="grid gap-10 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Billed to
          </p>
          <p className="mt-3 font-display text-2xl">{client?.name ?? "—"}</p>
          {client?.company && (
            <p className="mt-1 text-sm text-muted-foreground">{client.company}</p>
          )}
          <div className="mt-3 space-y-0.5 text-sm text-muted-foreground">
            {client?.email && <p>{client.email}</p>}
            {client?.phone && <p>{client.phone}</p>}
            {client?.address_line1 && <p>{client.address_line1}</p>}
            {client?.city && (
              <p>
                {client.city}
                {client.country ? `, ${client.country}` : ""}
              </p>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-y-4 text-sm">
          <dt className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Currency
          </dt>
          <dd className="font-mono text-right">{invoice.currency}</dd>

          <dt className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Issue date
          </dt>
          <dd className="font-mono text-right">
            {format(new Date(invoice.issue_date), "dd MMM yyyy")}
          </dd>

          <dt className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Due date
          </dt>
          <dd className="font-mono text-right">
            {format(new Date(invoice.due_date), "dd MMM yyyy")}
          </dd>

          {invoice.paid_at && (
            <>
              <dt className="font-mono text-[10px] uppercase tracking-[0.15em] text-success">
                Paid on
              </dt>
              <dd className="font-mono text-right text-success">
                {format(new Date(invoice.paid_at), "dd MMM yyyy")}
              </dd>
            </>
          )}
        </dl>
      </section>

      {/* Line items — editorial table */}
      <section>
        <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Line items
        </p>
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <div className="grid grid-cols-[1fr_70px_140px_70px_140px] gap-4 border-b border-border/60 px-6 py-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Unit price</span>
            <span className="text-right">Tax</span>
            <span className="text-right">Amount</span>
          </div>
          <ul className="divide-y divide-border/60">
            {invoice.line_items.map((item) => (
              <li
                key={item.id}
                className="grid grid-cols-[1fr_70px_140px_70px_140px] items-center gap-4 px-6 py-4 text-sm"
              >
                <span>{item.description}</span>
                <span className="text-right font-mono tabular-nums">{item.quantity}</span>
                <span className="text-right font-mono tabular-nums">
                  {formatCurrency(item.unit_price, invoice.currency)}
                </span>
                <span className="text-right font-mono tabular-nums text-muted-foreground">
                  {item.tax_rate}%
                </span>
                <span className="text-right font-mono tabular-nums">
                  {formatCurrency(item.amount, invoice.currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Totals */}
        <div className="mt-6 flex justify-end">
          <dl className="w-full max-w-xs space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                Subtotal
              </dt>
              <dd className="font-mono tabular-nums">
                {formatCurrency(invoice.subtotal, invoice.currency)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                Tax
              </dt>
              <dd className="font-mono tabular-nums">
                {formatCurrency(invoice.tax_amount, invoice.currency)}
              </dd>
            </div>
            {(invoice.discount_amount ?? 0) > 0 && (
              <div className="flex justify-between text-success">
                <dt className="font-mono text-[10px] uppercase tracking-[0.15em]">Discount</dt>
                <dd className="font-mono tabular-nums">
                  −{formatCurrency(invoice.discount_amount!, invoice.currency)}
                </dd>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-border pt-4">
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Total
              </dt>
              <dd className="font-display text-3xl tabular-nums">
                {formatCurrency(invoice.total, invoice.currency)}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Notes & Terms */}
      {(invoice.notes || invoice.payment_terms) && (
        <section className="grid gap-10 border-t border-border/60 pt-10 md:grid-cols-2">
          {invoice.payment_terms && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Payment terms
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/80">
                {invoice.payment_terms}
              </p>
            </div>
          )}
          {invoice.notes && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Notes
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/80">
                {invoice.notes}
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
