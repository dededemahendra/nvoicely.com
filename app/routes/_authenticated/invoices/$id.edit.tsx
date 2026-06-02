import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Send, ArrowLeft } from "lucide-react";
import { PageHeader } from "~/components/shared/PageHeader";
import { InvoiceForm } from "~/components/invoice/InvoiceForm";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { ConfirmDialog } from "~/components/shared/ConfirmDialog";
import { useInvoice, useUpdateInvoice, useSendInvoice } from "~/hooks/useInvoices";
import { useClients } from "~/hooks/useClients";
import { Skeleton } from "~/components/ui/skeleton";
import { toast } from "sonner";
import type { InvoiceFormValues } from "~/lib/validators/invoice";

export const Route = createFileRoute("/_authenticated/invoices/$id/edit")({
  component: EditInvoicePage,
});

function EditInvoicePage() {
  const { id } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const { data: invoice, isLoading: loadingInvoice } = useInvoice(id);
  const { data: clients, isLoading: loadingClients } = useClients(user.$id);
  const updateInvoice = useUpdateInvoice();
  const sendInvoice = useSendInvoice();
  const recipient = clients?.find((c) => c.$id === invoice?.client_id);

  function handleSubmit(values: InvoiceFormValues) {
    updateInvoice.mutate(
      { ...values, id },
      {
        onSuccess: () => {
          toast.success("Invoice updated");
          navigate({ to: "/invoices/$id", params: { id } });
        },
        onError: () => toast.error("Failed to update invoice"),
      }
    );
  }

  if (loadingInvoice || loadingClients) return <EditSkeleton />;
  if (!invoice) return <p className="text-sm text-muted-foreground">Invoice not found.</p>;

  return (
    <div className="space-y-6">
      <Link
        to="/invoices/$id"
        params={{ id }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to invoice
      </Link>

      <PageHeader
        title={`Edit ${invoice.invoice_number}`}
        description="Update the invoice details below."
        action={
          recipient?.email ? (
            <ConfirmDialog
              trigger={
                <Button disabled={sendInvoice.isPending}>
                  {sendInvoice.isPending ? <Spinner /> : <Send className="h-4 w-4" />}
                  {sendInvoice.isPending ? "Sending..." : "Send to client"}
                </Button>
              }
              title={`Send invoice ${invoice.invoice_number}?`}
              description={`Email it to ${recipient.email} and mark as sent.`}
              actionLabel="Send"
              onConfirm={() =>
                sendInvoice.mutate(
                  { invoiceId: invoice.$id, userId: user.$id },
                  {
                    onSuccess: () => toast.success(`Invoice sent to ${recipient.email}`),
                    onError: (err) => toast.error((err as Error).message || "Failed to send invoice"),
                  }
                )
              }
            />
          ) : null
        }
      />
      <InvoiceForm
        clients={clients ?? []}
        defaultValues={invoice}
        onSubmit={handleSubmit}
        isSubmitting={updateInvoice.isPending}
      />
    </div>
  );
}

function EditSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-9 w-64" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="shadow-none dark:ring-0">
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, f) => (
              <div key={f} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-11 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
