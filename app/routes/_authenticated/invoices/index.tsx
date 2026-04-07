import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { Button } from "~/components/ui/button";
import { PageHeader } from "~/components/shared/PageHeader";
import { StatusBadge } from "~/components/shared/StatusBadge";
import { ListCard } from "~/components/shared/ListCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Skeleton } from "~/components/ui/skeleton";
import { ConfirmDialog } from "~/components/shared/ConfirmDialog";
import { useInvoices, useDeleteInvoice } from "~/hooks/useInvoices";
import { useClients } from "~/hooks/useClients";
import { formatCurrency } from "~/lib/currency";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/invoices/")({
  component: InvoicesPage,
});

function InvoicesPage() {
  const { user } = Route.useRouteContext();
  const { data: invoices, isLoading } = useInvoices(user.$id);
  const { data: clients } = useClients(user.$id);
  const deleteInvoice = useDeleteInvoice();

  function clientName(clientId: string) {
    return clients?.find((c) => c.$id === clientId)?.name ?? "Unknown";
  }

  function getDisplayStatus(inv: { status: string; due_date: string }) {
    if (inv.status === "sent" && new Date(inv.due_date) < new Date()) return "overdue";
    return inv.status as any;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Invoices"
        description="Create and manage your invoices"
        action={
          <Button asChild>
            <Link to="/invoices/new">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Invoice</span>
              <span className="sm:hidden">New</span>
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : !invoices?.length ? (
        <p className="text-sm text-muted-foreground">No invoices yet. Create your first one.</p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 lg:hidden">
            {invoices.map((inv) => (
              <ListCard
                key={inv.$id}
                to="/invoices/$id"
                params={{ id: inv.$id }}
                title={<span className="font-mono">{inv.invoice_number}</span>}
                subtitle={clientName(inv.client_id)}
                meta={`Due ${format(new Date(inv.due_date), "dd MMM yyyy")}`}
                badge={<StatusBadge status={getDisplayStatus(inv)} />}
                trailing={formatCurrency(inv.total, inv.currency)}
                actions={
                  inv.status === "draft" ? (
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
                  ) : null
                }
              />
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[88px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.$id}>
                    <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                    <TableCell>{clientName(inv.client_id)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(inv.issue_date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(inv.due_date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={getDisplayStatus(inv)} />
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(inv.total, inv.currency)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to="/invoices/$id" params={{ id: inv.$id }}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
