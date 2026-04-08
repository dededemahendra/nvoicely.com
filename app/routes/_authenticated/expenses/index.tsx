import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Download } from "lucide-react";
import { format } from "date-fns";
import { Button } from "~/components/ui/button";
import { PageHeader } from "~/components/shared/PageHeader";
import { ListCard } from "~/components/shared/ListCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
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

function ExpensesPage() {
  const { user } = Route.useRouteContext();
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const { data: expenses, isLoading } = useExpenses(user.$id, {
    category: categoryFilter || undefined,
  });
  const deleteExpense = useDeleteExpense();

  function getCategoryLabel(value: string) {
    return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Expenses"
        description="Track your business expenses"
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!expenses?.length}
              onClick={() => {
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
              }}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
            <Button asChild>
              <Link to="/expenses/new">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Expense</span>
                <span className="sm:hidden">Add</span>
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex gap-2">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {EXPENSE_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : !expenses?.length ? (
        <p className="text-sm text-muted-foreground">No expenses found.</p>
      ) : (
        <>
          <div className="space-y-2 lg:hidden">
            {expenses.map((exp) => (
              <ListCard
                key={exp.$id}
                title={exp.description}
                subtitle={`${getCategoryLabel(exp.category)}${exp.vendor ? ` · ${exp.vendor}` : ""}`}
                meta={format(new Date(exp.date), "dd MMM yyyy")}
                trailing={formatCurrency(exp.amount, exp.currency)}
                actions={
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    }
                    title="Delete expense?"
                    description="This action cannot be undone."
                    onConfirm={() =>
                      deleteExpense.mutate(exp.$id, {
                        onSuccess: () => toast.success("Expense deleted"),
                      })
                    }
                  />
                }
              />
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-xl border lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((exp) => (
                  <TableRow key={exp.$id}>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(exp.date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>{getCategoryLabel(exp.category)}</TableCell>
                    <TableCell className="max-w-[260px] truncate">{exp.description}</TableCell>
                    <TableCell className="text-muted-foreground">{exp.vendor ?? "-"}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(exp.amount, exp.currency)}
                    </TableCell>
                    <TableCell>
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        }
                        title="Delete expense?"
                        description="This action cannot be undone."
                        onConfirm={() =>
                          deleteExpense.mutate(exp.$id, {
                            onSuccess: () => toast.success("Expense deleted"),
                          })
                        }
                      />
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
