import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { expenseSchema, type ExpenseFormValues } from "~/lib/validators/expense";
import { EXPENSE_CATEGORIES } from "~/lib/expense-categories";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { DatePicker } from "~/components/shared/DatePicker";
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Card className="shadow-none dark:ring-0">
        <CardHeader>
          <CardTitle className="text-base">Expense</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <DatePicker
              id="date"
              value={watch("date")}
              onChange={(v) => setValue("date", v, { shouldValidate: true, shouldDirty: true })}
              placeholder="Select date"
            />
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
            <Input id="amount" type="number" min="0" className="tabular-nums" {...register("amount", { valueAsNumber: true })} />
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
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor</Label>
            <Input id="vendor" {...register("vendor")} />
          </div>

          <div className="flex items-center gap-2 md:col-span-2">
            <Checkbox
              id="is_tax_deductible"
              checked={watch("is_tax_deductible")}
              onCheckedChange={(checked) => setValue("is_tax_deductible", !!checked)}
            />
            <Label htmlFor="is_tax_deductible" className="font-normal">
              Tax deductible
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? "Saving..." : "Add expense"}
        </Button>
      </div>
    </form>
  );
}
