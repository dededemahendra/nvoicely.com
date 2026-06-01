import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent } from "~/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { PageHeader } from "~/components/shared/PageHeader";
import { ListCard } from "~/components/shared/ListCard";
import { Skeleton } from "~/components/ui/skeleton";
import { ConfirmDialog } from "~/components/shared/ConfirmDialog";
import { useClients, useDeleteClient } from "~/hooks/useClients";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clients/")({
  component: ClientsPage,
});

const PAGE_SIZE = 20;
const DELETE_DESCRIPTION =
  "This action cannot be undone. Invoices linked to this client will not be deleted.";

function ClientsPage() {
  const { user } = Route.useRouteContext();
  const { data: clients, isLoading } = useClients(user.$id);
  const deleteClient = useDeleteClient();
  const [query, setQuery] = useState("");

  function handleDelete(id: string) {
    deleteClient.mutate(id, {
      onSuccess: () => toast.success("Client deleted"),
      onError: () => toast.error("Failed to delete client"),
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients ?? [];
    return (clients ?? []).filter((c) =>
      [c.name, c.email, c.company, c.phone]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q))
    );
  }, [clients, query]);

  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const deleteAction = (id: string) => (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label="Delete">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      }
      title="Delete client?"
      description={DELETE_DESCRIPTION}
      onConfirm={() => handleDelete(id)}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Manage your client contacts."
        action={
          <Button asChild size="sm">
            <Link to="/clients/new">
              <Plus className="h-4 w-4" />
              Add client
            </Link>
          </Button>
        }
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, or company"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <>
          <div className="space-y-2 lg:hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border bg-card p-4"
              >
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            ))}
          </div>
          <Card className="hidden shadow-none lg:block dark:ring-0">
          <CardContent className="p-0">
            <div className="grid grid-cols-[1fr_1fr_160px_140px_80px] gap-4 border-b px-6 py-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-16" />
              ))}
            </div>
            {Array.from({ length: 6 }).map((_, r) => (
              <div
                key={r}
                className="grid grid-cols-[1fr_1fr_160px_140px_80px] items-center gap-4 border-b px-6 py-4 last:border-0"
              >
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-7 justify-self-end rounded-md" />
              </div>
            ))}
          </CardContent>
          </Card>
        </>
      ) : !filtered.length ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>{query ? "No clients found" : "No clients yet"}</EmptyTitle>
            <EmptyDescription>
              {query
                ? "No clients match your search."
                : "Add your first client to get started."}
            </EmptyDescription>
          </EmptyHeader>
          {!query && (
            <EmptyContent>
              <Button asChild>
                <Link to="/clients/new">
                  <Plus className="h-4 w-4" />
                  Add client
                </Link>
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 lg:hidden">
            {pageItems.map((client) => (
              <ListCard
                key={client.$id}
                to="/clients/$id"
                params={{ id: client.$id }}
                title={client.name}
                subtitle={client.email}
                meta={client.company ?? client.phone ?? undefined}
                actions={deleteAction(client.$id)}
              />
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden shadow-none lg:block dark:ring-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="pr-6" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((client) => (
                    <TableRow key={client.$id} className="h-14">
                      <TableCell className="pl-6 font-medium">
                        <Link
                          to="/clients/$id"
                          params={{ id: client.$id }}
                          className="hover:underline"
                        >
                          {client.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {client.email}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {client.company}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {client.phone}
                      </TableCell>
                      <TableCell className="pr-6">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button variant="ghost" size="icon-sm" asChild>
                            <Link
                              to="/clients/$id"
                              params={{ id: client.$id }}
                              aria-label="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          {deleteAction(client.$id)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {filtered.length > PAGE_SIZE && (
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(Math.max(1, currentPage - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm tabular-nums text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
