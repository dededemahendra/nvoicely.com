import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Eye,
  Send,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
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
import type { InvoiceStatus } from "~/types";

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

const PAGE_SIZE = 20;

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
  function getDisplayStatus(inv: { status: string; due_date: string }): InvoiceStatus {
    if (inv.status === "sent" && new Date(inv.due_date) < new Date()) return "overdue";
    return inv.status as InvoiceStatus;
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

  // Client-side pagination of the filtered view.
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [filter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function exportCsv() {
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
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Create, send, and track every invoice."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!invoices?.length} onClick={exportCsv}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
            <Button asChild size="sm">
              <Link to="/invoices/new">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New invoice</span>
                <span className="sm:hidden">New</span>
              </Link>
            </Button>
          </div>
        }
      />

      {/* Segmented filter */}
      <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
              <span className="text-xs tabular-nums text-muted-foreground">
                {counts[f.value]}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <>
          {/* Mobile skeleton */}
          <div className="space-y-2 lg:hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border bg-card p-4"
              >
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>

          {/* Desktop table skeleton */}
          <Card className="hidden shadow-none lg:block dark:ring-0">
            <CardContent className="p-0">
              <div className="grid grid-cols-[140px_1fr_120px_120px_110px_140px_90px] gap-4 border-b px-6 py-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-3 w-14" />
                ))}
              </div>
              {Array.from({ length: 6 }).map((_, r) => (
                <div
                  key={r}
                  className="grid grid-cols-[140px_1fr_120px_120px_110px_140px_90px] items-center gap-4 border-b px-6 py-4 last:border-0"
                >
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-20 justify-self-end" />
                  <Skeleton className="h-7 w-7 justify-self-end rounded-md" />
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : !filtered.length ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>
              {filter === "all" ? "No invoices yet" : `No ${filter} invoices`}
            </EmptyTitle>
            <EmptyDescription>
              {filter === "all"
                ? "Create your first invoice to get started."
                : "No invoices match this filter."}
            </EmptyDescription>
          </EmptyHeader>
          {filter === "all" && (
            <EmptyContent>
              <Button asChild>
                <Link to="/invoices/new">
                  <Plus className="h-4 w-4" />
                  New invoice
                </Link>
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 lg:hidden">
            {pageItems.map((inv) => (
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

          {/* Desktop table */}
          <Card className="hidden shadow-none lg:block dark:ring-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Invoice</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="pr-6" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((inv) => (
                    <TableRow key={inv.$id} className="h-14">
                      <TableCell className="pl-6">
                        <Link
                          to="/invoices/$id"
                          params={{ id: inv.$id }}
                          className="font-mono text-sm hover:underline"
                        >
                          {inv.invoice_number}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-44 truncate">
                        {clientName(inv.client_id)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(inv.issue_date), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(inv.due_date), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={getDisplayStatus(inv)} />
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {formatCurrency(inv.total, inv.currency)}
                      </TableCell>
                      <TableCell className="pr-6">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button variant="ghost" size="icon-sm" asChild>
                            <Link to="/invoices/$id" params={{ id: inv.$id }} aria-label="View">
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          {inv.status === "draft" && clientEmail(inv.client_id) && (
                            <ConfirmDialog
                              trigger={
                                <Button variant="ghost" size="icon-sm" disabled={sendInvoice.isPending} aria-label="Send">
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
                                <Button variant="ghost" size="icon-sm" aria-label="Delete">
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {filtered.length > PAGE_SIZE && (
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(Math.max(1, currentPage - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm tabular-nums text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
