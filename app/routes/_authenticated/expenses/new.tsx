import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "~/components/shared/PageHeader";
import { ExpenseForm } from "~/components/expenses/ExpenseForm";
import { useCreateExpense } from "~/hooks/useExpenses";
import { toast } from "sonner";
import type { ExpenseFormValues } from "~/lib/validators/expense";

export const Route = createFileRoute("/_authenticated/expenses/new")({
  component: NewExpensePage,
});

function NewExpensePage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const createExpense = useCreateExpense();

  function handleSubmit(values: ExpenseFormValues) {
    createExpense.mutate(
      { ...values, user_id: user.$id },
      {
        onSuccess: () => {
          toast.success("Expense added");
          navigate({ to: "/expenses" });
        },
        onError: () => toast.error("Failed to add expense"),
      }
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New Expense" />
      <ExpenseForm onSubmit={handleSubmit} isSubmitting={createExpense.isPending} />
    </div>
  );
}
