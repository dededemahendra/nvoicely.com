import { z } from "zod";

export const lineItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, "Description required"),
  quantity: z.number().min(0.01, "Must be > 0"),
  unit_price: z.number().min(0, "Must be >= 0"),
  tax_rate: z.number().min(0).max(100),
  amount: z.number(),
});

export const invoiceSchema = z.object({
  client_id: z.string().min(1, "Select a client"),
  currency: z.enum(["IDR", "USD", "EUR", "SGD", "AUD"]),
  issue_date: z.string().min(1, "Issue date required"),
  due_date: z.string().min(1, "Due date required"),
  line_items: z.array(lineItemSchema).min(1, "Add at least one item"),
  discount_amount: z.number().min(0).optional(),
  notes: z.string().optional(),
  payment_terms: z.string().optional(),
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;
