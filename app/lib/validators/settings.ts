import { z } from "zod";

const bankAccountSchema = z.object({
  bank_name: z.string().min(1, "Bank name required"),
  account_name: z.string().min(1, "Account name required"),
  account_number: z.string().min(1, "Account number required"),
  currency: z.enum(["IDR", "USD", "EUR", "SGD", "AUD"]),
});

export const settingsSchema = z.object({
  business_name: z.string().min(1, "Business name required"),
  business_email: z.string().email().optional().or(z.literal("")),
  business_phone: z.string().optional(),
  business_address: z.string().optional(),
  default_currency: z.enum(["IDR", "USD", "EUR", "SGD", "AUD"]),
  default_tax_rate: z.number().min(0).max(100).optional(),
  default_payment_terms: z.string().optional(),
  invoice_prefix: z.string().min(1, "Prefix required"),
  bank_accounts: z.array(bankAccountSchema).optional(),
  invoice_footer_notes: z.string().optional(),
});

export type SettingsFormValues = z.infer<typeof settingsSchema>;
