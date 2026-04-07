import { z } from "zod";

export const expenseSchema = z.object({
  date: z.string().min(1, "Date required"),
  category: z.string().min(1, "Category required"),
  description: z.string().min(1, "Description required"),
  amount: z.number().min(1, "Amount must be > 0"),
  currency: z.enum(["IDR", "USD", "EUR", "SGD", "AUD"]),
  vendor: z.string().optional(),
  is_tax_deductible: z.boolean(),
  invoice_id: z.string().optional(),
  receipt_file_id: z.string().optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;
