import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "~/components/shared/PageHeader";
import { InvoiceForm } from "~/components/invoice/InvoiceForm";
import { useInvoice, useUpdateInvoice } from "~/hooks/useInvoices";
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
      <PageHeader title={`Edit ${invoice.invoice_number}`} />
      <InvoiceForm
        clients={clients ?? []}
        defaultValues={invoice}
        onSubmit={handleSubmit}
        isSubmitting={updateInvoice.isPending}
      />
    </div>
  );
}
