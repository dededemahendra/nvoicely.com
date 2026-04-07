import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "~/components/shared/PageHeader";
import { InvoiceForm } from "~/components/invoice/InvoiceForm";
import { useCreateInvoice } from "~/hooks/useInvoices";
import { useClients } from "~/hooks/useClients";
import { Skeleton } from "~/components/ui/skeleton";
import { toast } from "sonner";
import type { InvoiceFormValues } from "~/lib/validators/invoice";

export const Route = createFileRoute("/_authenticated/invoices/new")({
  component: NewInvoicePage,
});

function NewInvoicePage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const { data: clients, isLoading: loadingClients } = useClients(user.$id);
  const createInvoice = useCreateInvoice();

  function handleSubmit(values: InvoiceFormValues) {
    createInvoice.mutate(
      { ...values, user_id: user.$id },
      {
        onSuccess: (inv) => {
          toast.success("Invoice created");
          navigate({ to: "/invoices/$id", params: { id: (inv as any).$id } });
        },
        onError: () => toast.error("Failed to create invoice"),
      }
    );
  }

  if (loadingClients) return <Skeleton className="h-96 w-full" />;

  if (!clients?.length) {
    return (
      <div className="space-y-6">
        <PageHeader title="New Invoice" />
        <p className="text-sm text-muted-foreground">
          You need to add a client first before creating an invoice.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New Invoice" />
      <InvoiceForm clients={clients} onSubmit={handleSubmit} isSubmitting={createInvoice.isPending} />
    </div>
  );
}
