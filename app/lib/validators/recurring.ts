import { z } from "zod";
import { lineItemSchema } from "./invoice";

export const recurringSchema = z.object({
  client_id: z.string().min(1, "Select a client"),
  name: z.string().min(1, "Template name required"),
  frequency: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
  start_date: z.string().min(1, "Start date required"),
  end_date: z.string().optional(),
  currency: z.enum(["IDR", "USD", "EUR", "SGD", "AUD"]),
  tax_rate: z.number().min(0).max(100).optional(),
  line_items: z.array(lineItemSchema).min(1, "Add at least one item"),
  notes: z.string().optional(),
  terms: z.string().optional(),
  auto_send: z.boolean(),
});

export type RecurringFormValues = z.infer<typeof recurringSchema>;
