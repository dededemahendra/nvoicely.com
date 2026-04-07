import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { PageHeader } from "~/components/shared/PageHeader";
import { InvoiceForm } from "~/components/invoice/InvoiceForm";
import { Button } from "~/components/ui/button";
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

  if (loadingInvoice || loadingClients) return <Skeleton className="h-96 w-full" />;
  if (!invoice) return <p>Invoice not found</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${invoice.invoice_number}`}
        action={
          recipient?.email ? (
            <ConfirmDialog
              trigger={
                <Button disabled={sendInvoice.isPending}>
                  <Send className="h-4 w-4 mr-2" />
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
