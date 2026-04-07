import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "~/components/ui/button";
import { PageHeader } from "~/components/shared/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { ConfirmDialog } from "~/components/shared/ConfirmDialog";
import { useExpenses, useDeleteExpense } from "~/hooks/useExpenses";
import { EXPENSE_CATEGORIES } from "~/lib/expense-categories";
import { formatCurrency } from "~/lib/currency";
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
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Track your business expenses"
        action={
          <Button asChild>
            <Link to="/expenses/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Link>
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
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
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !expenses?.length ? (
        <p className="text-sm text-muted-foreground">No expenses found.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[60px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((exp) => (
              <TableRow key={exp.$id}>
                <TableCell className="text-muted-foreground">
                  {format(new Date(exp.date), "dd MMM yyyy")}
                </TableCell>
                <TableCell>{getCategoryLabel(exp.category)}</TableCell>
                <TableCell className="max-w-[200px] truncate">{exp.description}</TableCell>
                <TableCell className="text-muted-foreground">{exp.vendor ?? "-"}</TableCell>
                <TableCell className="text-right font-medium">
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
      )}
    </div>
  );
}
