import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Download,
  Search,
  Receipt,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { ConfirmDialog } from "~/components/shared/ConfirmDialog";
import { useExpenses, useDeleteExpense } from "~/hooks/useExpenses";
import { EXPENSE_CATEGORIES } from "~/lib/expense-categories";
import { formatCurrency } from "~/lib/currency";
import { toCsv, downloadCsv } from "~/lib/csv";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/expenses/")({
  component: ExpensesPage,
});

const PAGE_SIZE = 20;

function ExpensesPage() {
  const { user } = Route.useRouteContext();
  const { data: expenses, isLoading } = useExpenses(user.$id);
  const deleteExpense = useDeleteExpense();
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");

  function getCategoryLabel(value: string) {
    return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (expenses ?? []).filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (!q) return true;
      return [e.description, e.vendor]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q));
    });
  }, [expenses, category, query]);

  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [category, query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function exportCsv() {
    const rows = (expenses ?? []).map((e) => ({
      date: e.date.slice(0, 10),
      category: getCategoryLabel(e.category),
      description: e.description,
      vendor: e.vendor ?? "",
      amount: e.amount,
      currency: e.currency,
    }));
    const csv = toCsv(rows, [
      { key: "date", header: "Date" },
      { key: "category", header: "Category" },
      { key: "description", header: "Description" },
      { key: "vendor", header: "Vendor" },
      { key: "amount", header: "Amount" },
      { key: "currency", header: "Currency" },
    ]);
    downloadCsv(`expenses-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  const deleteAction = (id: string) => (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label="Delete">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      }
      title="Delete expense?"
      description="This action cannot be undone."
      onConfirm={() =>
        deleteExpense.mutate(id, {
          onSuccess: () => toast.success("Expense deleted"),
        })
      }
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Track your business expenses."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!expenses?.length} onClick={exportCsv}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </Button>
            <Button asChild size="sm">
              <Link to="/expenses/new">
                <Plus className="h-4 w-4" />
                Add expense
              </Link>
            </Button>
          </div>
        }
      />

      {/* Search + category */}
      <div className="flex gap-2">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search description or vendor"
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[130px] shrink-0 sm:w-[200px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {EXPENSE_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <>
          <div className="space-y-2 lg:hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border bg-card p-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
          <Card className="hidden shadow-none lg:block dark:ring-0">
            <CardContent className="p-0">
              <div className="grid grid-cols-[120px_140px_1fr_140px_120px_80px] gap-4 border-b px-6 py-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-3 w-16" />
                ))}
              </div>
              {Array.from({ length: 6 }).map((_, r) => (
                <div
                  key={r}
                  className="grid grid-cols-[120px_140px_1fr_140px_120px_80px] items-center gap-4 border-b px-6 py-4 last:border-0"
                >
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20 justify-self-end" />
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
              <Receipt />
            </EmptyMedia>
            <EmptyTitle>
              {expenses?.length ? "No expenses found" : "No expenses yet"}
            </EmptyTitle>
            <EmptyDescription>
              {expenses?.length
                ? "No expenses match your search or filter."
                : "Add your first expense to start tracking."}
            </EmptyDescription>
          </EmptyHeader>
          {!expenses?.length && (
            <EmptyContent>
              <Button asChild>
                <Link to="/expenses/new">
                  <Plus className="h-4 w-4" />
                  Add expense
                </Link>
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 lg:hidden">
            {pageItems.map((exp) => (
              <ListCard
                key={exp.$id}
                title={exp.description}
                subtitle={`${getCategoryLabel(exp.category)}${exp.vendor ? ` · ${exp.vendor}` : ""}`}
                meta={format(new Date(exp.date), "dd MMM yyyy")}
                trailing={formatCurrency(exp.amount, exp.currency)}
                actions={deleteAction(exp.$id)}
              />
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden shadow-none lg:block dark:ring-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="pr-6" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((exp) => (
                    <TableRow key={exp.$id} className="h-14">
                      <TableCell className="pl-6 text-sm text-muted-foreground">
                        {format(new Date(exp.date), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>{getCategoryLabel(exp.category)}</TableCell>
                      <TableCell className="max-w-64 truncate">{exp.description}</TableCell>
                      <TableCell className="text-muted-foreground">{exp.vendor}</TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {formatCurrency(exp.amount, exp.currency)}
                      </TableCell>
                      <TableCell className="pr-6">
                        <div className="flex items-center justify-end">
                          {deleteAction(exp.$id)}
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
