import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { expenseSchema, type ExpenseFormValues } from "~/lib/validators/expense";
import { EXPENSE_CATEGORIES } from "~/lib/expense-categories";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import type { CurrencyCode } from "~/types";

interface ExpenseFormProps {
  onSubmit: (values: ExpenseFormValues) => void;
  isSubmitting: boolean;
}

export function ExpenseForm({ onSubmit, isSubmitting }: ExpenseFormProps) {
  const today = new Date().toISOString().split("T")[0];
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: today,
      category: "",
      description: "",
      amount: 0,
      currency: "IDR" as CurrencyCode,
      vendor: "",
      is_tax_deductible: false,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date">Date *</Label>
          <Input id="date" type="date" {...register("date")} />
          {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Category *</Label>
          <Select value={watch("category")} onValueChange={(v) => setValue("category", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Description *</Label>
          <Input id="description" {...register("description")} />
          {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount *</Label>
          <Input id="amount" type="number" min="0" {...register("amount", { valueAsNumber: true })} />
          {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Currency</Label>
          <Select value={watch("currency")} onValueChange={(v) => setValue("currency", v as CurrencyCode)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["IDR", "USD", "EUR", "SGD", "AUD"].map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vendor">Vendor</Label>
          <Input id="vendor" {...register("vendor")} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="is_tax_deductible"
          checked={watch("is_tax_deductible")}
          onCheckedChange={(checked) => setValue("is_tax_deductible", !!checked)}
        />
        <Label htmlFor="is_tax_deductible" className="font-normal">Tax deductible</Label>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Add Expense"}
      </Button>
    </form>
  );
}
