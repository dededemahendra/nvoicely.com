import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "~/components/shared/PageHeader";
import { ClientForm } from "~/components/clients/ClientForm";
import { useClient, useUpdateClient } from "~/hooks/useClients";
import { Skeleton } from "~/components/ui/skeleton";
import { toast } from "sonner";
import type { ClientFormValues } from "~/lib/validators/client";

export const Route = createFileRoute("/_authenticated/clients/$id")({
  component: EditClientPage,
});

function EditClientPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: client, isLoading } = useClient(id);
  const updateClient = useUpdateClient();

  function handleSubmit(values: ClientFormValues) {
    updateClient.mutate(
      { ...values, id },
      {
        onSuccess: () => {
          toast.success("Client updated");
          navigate({ to: "/clients" });
        },
        onError: () => toast.error("Failed to update client"),
      }
    );
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!client) return <p>Client not found</p>;

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Client" description={client.name} />
      <ClientForm defaultValues={client} onSubmit={handleSubmit} isSubmitting={updateClient.isPending} />
    </div>
  );
}
