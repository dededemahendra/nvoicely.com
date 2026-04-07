import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Pause, Play, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { PageHeader } from "~/components/shared/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Skeleton } from "~/components/ui/skeleton";
import { ConfirmDialog } from "~/components/shared/ConfirmDialog";
import { useRecurringTemplates, useToggleRecurring, useDeleteRecurring } from "~/hooks/useRecurring";
import { useClients } from "~/hooks/useClients";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/recurring/")({
  component: RecurringPage,
});

function RecurringPage() {
  const { user } = Route.useRouteContext();
  const { data: templates, isLoading } = useRecurringTemplates(user.$id);
  const { data: clients } = useClients(user.$id);
  const toggleRecurring = useToggleRecurring();
  const deleteRecurring = useDeleteRecurring();

  function clientName(clientId: string) {
    return clients?.find((c) => c.$id === clientId)?.name ?? "Unknown";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recurring Invoices"
        description="Automate invoice generation on a schedule"
        action={
          <Button asChild>
            <Link to="/recurring/new">
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !templates?.length ? (
        <p className="text-sm text-muted-foreground">No recurring templates yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Next Invoice</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((t) => (
              <TableRow key={t.$id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>{clientName(t.client_id)}</TableCell>
                <TableCell className="capitalize">{t.frequency}</TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(t.next_run_date), "dd MMM yyyy")}
                </TableCell>
                <TableCell>
                  <Badge variant={t.is_active ? "success" : "secondary"}>
                    {t.is_active ? "Active" : "Paused"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        toggleRecurring.mutate(
                          { id: t.$id, is_active: !t.is_active },
                          {
                            onSuccess: () =>
                              toast.success(t.is_active ? "Template paused" : "Template activated"),
                          }
                        )
                      }
                    >
                      {t.is_active ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      }
                      title="Delete recurring template?"
                      description="Previously generated invoices will not be affected."
                      onConfirm={() =>
                        deleteRecurring.mutate(t.$id, {
                          onSuccess: () => toast.success("Template deleted"),
                        })
                      }
                    />
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
