import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "~/components/shared/PageHeader";
import { ClientForm } from "~/components/clients/ClientForm";
import { useCreateClient } from "~/hooks/useClients";
import { toast } from "sonner";
import type { ClientFormValues } from "~/lib/validators/client";

export const Route = createFileRoute("/_authenticated/clients/new")({
  component: NewClientPage,
});

function NewClientPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const createClient = useCreateClient();

  function handleSubmit(values: ClientFormValues) {
    createClient.mutate(
      { ...values, user_id: user.$id },
      {
        onSuccess: () => {
          toast.success("Client created");
          navigate({ to: "/clients" });
        },
        onError: () => toast.error("Failed to create client"),
      }
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New Client" />
      <ClientForm onSubmit={handleSubmit} isSubmitting={createClient.isPending} />
    </div>
  );
}
