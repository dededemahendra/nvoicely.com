import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2, Eye, Send, Download } from "lucide-react";
import { format } from "date-fns";
import { Button } from "~/components/ui/button";
import { PageHeader } from "~/components/shared/PageHeader";
import { StatusBadge } from "~/components/shared/StatusBadge";
import { ListCard } from "~/components/shared/ListCard";
import { Skeleton } from "~/components/ui/skeleton";
import { ConfirmDialog } from "~/components/shared/ConfirmDialog";
import { useInvoices, useDeleteInvoice, useSendInvoice } from "~/hooks/useInvoices";
import { useClients } from "~/hooks/useClients";
import { formatCurrency } from "~/lib/currency";
import { toCsv, downloadCsv } from "~/lib/csv";
import { toast } from "sonner";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/_authenticated/invoices/")({
  component: InvoicesPage,
});

const FILTERS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "sent", label: "Sent" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

function InvoicesPage() {
  const { user } = Route.useRouteContext();
  const { data: invoices, isLoading } = useInvoices(user.$id);
  const { data: clients } = useClients(user.$id);
  const deleteInvoice = useDeleteInvoice();
  const sendInvoice = useSendInvoice();
  const [filter, setFilter] = useState<Filter>("all");

  function clientName(clientId: string) {
    return clients?.find((c) => c.$id === clientId)?.name ?? "Unknown";
  }
  function clientEmail(clientId: string) {
    return clients?.find((c) => c.$id === clientId)?.email ?? "";
  }
  function handleSend(invoiceId: string) {
    sendInvoice.mutate(
      { invoiceId, userId: user.$id },
      {
        onSuccess: () => toast.success("Invoice sent"),
        onError: (err) => toast.error((err as Error).message || "Failed to send invoice"),
      }
    );
  }
  function getDisplayStatus(inv: { status: string; due_date: string }) {
    if (inv.status === "sent" && new Date(inv.due_date) < new Date()) return "overdue";
    return inv.status as any;
  }

  const counts = useMemo(() => {
    const c = { all: 0, draft: 0, sent: 0, overdue: 0, paid: 0 };
    (invoices ?? []).forEach((inv) => {
      c.all++;
      const ds = getDisplayStatus(inv);
      if (ds === "draft") c.draft++;
      else if (ds === "sent") c.sent++;
      else if (ds === "overdue") c.overdue++;
      else if (ds === "paid") c.paid++;
    });
    return c;
  }, [invoices]);

  const filtered = useMemo(() => {
    if (filter === "all") return invoices ?? [];
    return (invoices ?? []).filter((inv) => getDisplayStatus(inv) === filter);
  }, [invoices, filter]);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Workspace"
        title="Invoices"
        description="Create, send, and track every invoice."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!invoices?.length}
              onClick={() => {
                const rows = (invoices ?? []).map((inv) => ({
                  invoice_number: inv.invoice_number,
                  client: clientName(inv.client_id),
                  status: inv.status,
                  issue_date: inv.issue_date.slice(0, 10),
                  due_date: inv.due_date.slice(0, 10),
                  currency: inv.currency,
                  subtotal: inv.subtotal,
                  tax_amount: inv.tax_amount,
                  total: inv.total,
                }));
                const csv = toCsv(rows, [
                  { key: "invoice_number", header: "Invoice #" },
                  { key: "client", header: "Client" },
                  { key: "status", header: "Status" },
                  { key: "issue_date", header: "Issue Date" },
                  { key: "due_date", header: "Due Date" },
                  { key: "currency", header: "Currency" },
                  { key: "subtotal", header: "Subtotal" },
                  { key: "tax_amount", header: "Tax" },
                  { key: "total", header: "Total" },
                ]);
                downloadCsv(`invoices-${new Date().toISOString().slice(0, 10)}.csv`, csv);
              }}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
            <Button asChild>
              <Link to="/invoices/new">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New invoice</span>
                <span className="sm:hidden">New</span>
              </Link>
            </Button>
          </div>
        }
      />

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "group flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] transition-all",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 bg-card text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0 text-[9px] tabular-nums",
                  active ? "bg-primary-foreground/15 text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                {counts[f.value]}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : !filtered.length ? (
        <div className="rounded-xl border border-border/60 bg-card p-12 text-center">
          <p className="font-display text-2xl">Nothing here yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {filter === "all" ? "Create your first invoice to get started." : `No ${filter} invoices.`}
          </p>
          {filter === "all" && (
            <Button asChild className="mt-6">
              <Link to="/invoices/new">
                <Plus className="mr-1 h-4 w-4" />
                New invoice
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 lg:hidden">
            {filtered.map((inv) => (
              <ListCard
                key={inv.$id}
                to="/invoices/$id"
                params={{ id: inv.$id }}
                title={<span className="font-mono">{inv.invoice_number}</span>}
                subtitle={clientName(inv.client_id)}
                meta={`Due ${format(new Date(inv.due_date), "dd MMM yyyy")}`}
                badge={<StatusBadge status={getDisplayStatus(inv)} />}
                trailing={<span className="font-mono">{formatCurrency(inv.total, inv.currency)}</span>}
                actions={
                  inv.status === "draft" ? (
                    <>
                      {clientEmail(inv.client_id) && (
                        <ConfirmDialog
                          trigger={
                            <Button variant="ghost" size="icon" disabled={sendInvoice.isPending}>
                              <Send className="h-4 w-4" />
                            </Button>
                          }
                          title={`Send invoice ${inv.invoice_number}?`}
                          description={`Email it to ${clientEmail(inv.client_id)} and mark as sent.`}
                          actionLabel="Send"
                          onConfirm={() => handleSend(inv.$id)}
                        />
                      )}
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        }
                        title="Delete invoice?"
                        description={`Delete ${inv.invoice_number}? This cannot be undone.`}
                        onConfirm={() =>
                          deleteInvoice.mutate(inv.$id, {
                            onSuccess: () => toast.success("Invoice deleted"),
                          })
                        }
                      />
                    </>
                  ) : null
                }
              />
            ))}
          </div>

          {/* Desktop editorial table */}
          <div className="hidden overflow-hidden rounded-xl border border-border/60 bg-card lg:block">
            {/* Header row */}
            <div className="grid grid-cols-[140px_1fr_120px_120px_110px_140px_110px] gap-4 border-b border-border/60 px-6 py-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              <span>Invoice</span>
              <span>Client</span>
              <span>Issued</span>
              <span>Due</span>
              <span>Status</span>
              <span className="text-right">Amount</span>
              <span />
            </div>
            <ul className="divide-y divide-border/60">
              {filtered.map((inv) => (
                <li
                  key={inv.$id}
                  className="group relative grid grid-cols-[140px_1fr_120px_120px_110px_140px_110px] items-center gap-4 px-6 py-4 transition-colors hover:bg-accent/30"
                >
                  <Link
                    to="/invoices/$id"
                    params={{ id: inv.$id }}
                    className="absolute inset-0"
                    aria-label={`View ${inv.invoice_number}`}
                  />
                  <span className="font-mono text-sm">{inv.invoice_number}</span>
                  <span className="truncate text-sm">{clientName(inv.client_id)}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {format(new Date(inv.issue_date), "dd MMM yyyy")}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {format(new Date(inv.due_date), "dd MMM yyyy")}
                  </span>
                  <span>
                    <StatusBadge status={getDisplayStatus(inv)} />
                  </span>
                  <span className="text-right font-mono text-sm tabular-nums">
                    {formatCurrency(inv.total, inv.currency)}
                  </span>
                  <div
                    className="relative z-10 flex items-center justify-end gap-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="ghost" size="icon" asChild>
                      <Link to="/invoices/$id" params={{ id: inv.$id }}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    {inv.status === "draft" && clientEmail(inv.client_id) && (
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon" disabled={sendInvoice.isPending}>
                            <Send className="h-4 w-4" />
                          </Button>
                        }
                        title={`Send invoice ${inv.invoice_number}?`}
                        description={`Email it to ${clientEmail(inv.client_id)} and mark as sent.`}
                        actionLabel="Send"
                        onConfirm={() => handleSend(inv.$id)}
                      />
                    )}
                    {inv.status === "draft" && (
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        }
                        title="Delete invoice?"
                        description={`Delete ${inv.invoice_number}? This cannot be undone.`}
                        onConfirm={() =>
                          deleteInvoice.mutate(inv.$id, {
                            onSuccess: () => toast.success("Invoice deleted"),
                          })
                        }
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
