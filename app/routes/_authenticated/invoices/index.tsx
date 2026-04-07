import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { Button } from "~/components/ui/button";
import { PageHeader } from "~/components/shared/PageHeader";
import { StatusBadge } from "~/components/shared/StatusBadge";
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
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Create and manage your invoices"
        action={
          <Button asChild>
            <Link to="/invoices/new">
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !invoices?.length ? (
        <p className="text-sm text-muted-foreground">No invoices yet. Create your first one.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
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
                <TableCell className="text-right font-medium">
                  {formatCurrency(inv.total, inv.currency)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
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
      )}
    </div>
  );
}
