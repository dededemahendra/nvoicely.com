import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pause,
  Play,
  Trash2,
  Repeat,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { PageHeader } from "~/components/shared/PageHeader";
import { ListCard } from "~/components/shared/ListCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Skeleton } from "~/components/ui/skeleton";
import { ConfirmDialog } from "~/components/shared/ConfirmDialog";
import {
  useRecurringTemplates,
  useToggleRecurring,
  useDeleteRecurring,
} from "~/hooks/useRecurring";
import { useClients } from "~/hooks/useClients";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/recurring/")({
  component: RecurringPage,
});

const FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

const PAGE_SIZE = 20;

function RecurringPage() {
  const { user } = Route.useRouteContext();
  const { data: templates, isLoading } = useRecurringTemplates(user.$id);
  const { data: clients } = useClients(user.$id);
  const toggleRecurring = useToggleRecurring();
  const deleteRecurring = useDeleteRecurring();
  const [filter, setFilter] = useState<Filter>("all");

  function clientName(clientId: string) {
    return clients?.find((c) => c.$id === clientId)?.name ?? "Unknown";
  }

  const counts = useMemo(() => {
    const c = { all: 0, active: 0, paused: 0 };
    (templates ?? []).forEach((t) => {
      c.all++;
      if (t.is_active) c.active++;
      else c.paused++;
    });
    return c;
  }, [templates]);

  const filtered = useMemo(() => {
    if (filter === "all") return templates ?? [];
    return (templates ?? []).filter((t) =>
      filter === "active" ? t.is_active : !t.is_active
    );
  }, [templates, filter]);

  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [filter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function toggle(id: string, isActive: boolean) {
    toggleRecurring.mutate(
      { id, is_active: !isActive },
      {
        onSuccess: () =>
          toast.success(isActive ? "Template paused" : "Template activated"),
      }
    );
  }

  const rowActions = (id: string, isActive: boolean) => (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={isActive ? "Pause" : "Activate"}
        onClick={() => toggle(id, isActive)}
      >
        {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <ConfirmDialog
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label="Delete">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        }
        title="Delete recurring template?"
        description="Previously generated invoices will not be affected."
        onConfirm={() =>
          deleteRecurring.mutate(id, {
            onSuccess: () => toast.success("Template deleted"),
          })
        }
      />
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recurring invoices"
        description="Automate invoice generation on a schedule."
        action={
          <Button asChild size="sm">
            <Link to="/recurring/new">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New template</span>
              <span className="sm:hidden">New</span>
            </Link>
          </Button>
        }
      />

      {/* Segmented filter */}
      <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
              <span className="text-xs tabular-nums text-muted-foreground">
                {counts[f.value]}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <>
          <div className="space-y-2 lg:hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border bg-card p-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-44" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
          <Card className="hidden shadow-none lg:block dark:ring-0">
            <CardContent className="p-0">
              <div className="grid grid-cols-[1fr_1fr_120px_140px_100px_90px] gap-4 border-b px-6 py-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-3 w-16" />
                ))}
              </div>
              {Array.from({ length: 4 }).map((_, r) => (
                <div
                  key={r}
                  className="grid grid-cols-[1fr_1fr_120px_140px_100px_90px] items-center gap-4 border-b px-6 py-4 last:border-0"
                >
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-16 rounded-full" />
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
              <Repeat />
            </EmptyMedia>
            <EmptyTitle>
              {templates?.length ? "No templates found" : "No recurring templates yet"}
            </EmptyTitle>
            <EmptyDescription>
              {templates?.length
                ? "No templates match this filter."
                : "Create a template to generate invoices on a schedule."}
            </EmptyDescription>
          </EmptyHeader>
          {!templates?.length && (
            <EmptyContent>
              <Button asChild>
                <Link to="/recurring/new">
                  <Plus className="h-4 w-4" />
                  New template
                </Link>
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 lg:hidden">
            {pageItems.map((t) => (
              <ListCard
                key={t.$id}
                title={t.name}
                subtitle={`${clientName(t.client_id)} · ${t.frequency}`}
                meta={`Next: ${format(new Date(t.next_run_date), "dd MMM yyyy")}`}
                badge={
                  <Badge variant={t.is_active ? "success" : "secondary"}>
                    {t.is_active ? "Active" : "Paused"}
                  </Badge>
                }
                actions={rowActions(t.$id, t.is_active)}
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
                    <TableHead>Client</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Next invoice</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-6" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((t) => (
                    <TableRow key={t.$id} className="h-14">
                      <TableCell className="pl-6 font-medium">{t.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {clientName(t.client_id)}
                      </TableCell>
                      <TableCell className="capitalize">{t.frequency}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(t.next_run_date), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.is_active ? "success" : "secondary"}>
                          {t.is_active ? "Active" : "Paused"}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6">
                        <div className="flex items-center justify-end gap-0.5">
                          {rowActions(t.$id, t.is_active)}
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
