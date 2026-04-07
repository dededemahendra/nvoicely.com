import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { PageHeader } from "~/components/shared/PageHeader";
import { ListCard } from "~/components/shared/ListCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Skeleton } from "~/components/ui/skeleton";
import { ConfirmDialog } from "~/components/shared/ConfirmDialog";
import { useClients, useDeleteClient } from "~/hooks/useClients";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clients/")({
  component: ClientsPage,
});

function ClientsPage() {
  const { user } = Route.useRouteContext();
  const { data: clients, isLoading } = useClients(user.$id);
  const deleteClient = useDeleteClient();

  function handleDelete(id: string) {
    deleteClient.mutate(id, {
      onSuccess: () => toast.success("Client deleted"),
      onError: () => toast.error("Failed to delete client"),
    });
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Clients"
        description="Manage your client contacts"
        action={
          <Button asChild>
            <Link to="/clients/new">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Client</span>
              <span className="sm:hidden">Add</span>
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
      ) : !clients?.length ? (
        <p className="text-sm text-muted-foreground">No clients yet. Add your first client to get started.</p>
      ) : (
        <>
          <div className="space-y-2 lg:hidden">
            {clients.map((client) => (
              <ListCard
                key={client.$id}
                to="/clients/$id"
                params={{ id: client.$id }}
                title={client.name}
                subtitle={client.email}
                meta={client.company ?? client.phone ?? undefined}
                actions={
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    }
                    title="Delete client?"
                    description="This action cannot be undone. Invoices linked to this client will not be deleted."
                    onConfirm={() => handleDelete(client.$id)}
                  />
                }
              />
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-xl border lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.$id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell className="text-muted-foreground">{client.company ?? "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{client.phone ?? "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to="/clients/$id" params={{ id: client.$id }}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <ConfirmDialog
                          trigger={
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          }
                          title="Delete client?"
                          description="This action cannot be undone. Invoices linked to this client will not be deleted."
                          onConfirm={() => handleDelete(client.$id)}
                        />
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
