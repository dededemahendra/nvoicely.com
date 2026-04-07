export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";
export type CurrencyCode = "IDR" | "USD" | "EUR" | "SGD" | "AUD";
export type ExpenseCategory =
  | "software"
  | "travel"
  | "office"
  | "marketing"
  | "meals"
  | "utilities"
  | "freelancer"
  | "banking"
  | "other";
export type RecurringFrequency = "weekly" | "monthly" | "quarterly" | "yearly";

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
}

export interface Invoice {
  $id: string;
  user_id: string;
  client_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  currency: CurrencyCode;
  exchange_rate_to_idr: number;
  line_items: LineItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount?: number;
  total: number;
  notes?: string;
  payment_terms?: string;
  paid_at?: string;
  sent_at?: string;
  recurring_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  $id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  tax_id?: string;
  notes?: string;
  created_at: string;
}

export interface Expense {
  $id: string;
  user_id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: CurrencyCode;
  exchange_rate_to_idr: number;
  vendor?: string;
  is_tax_deductible?: boolean;
  receipt_file_id?: string;
  invoice_id?: string;
  notes?: string;
  created_at: string;
}

export interface RecurringTemplate {
  $id: string;
  user_id: string;
  client_id: string;
  name: string;
  frequency: RecurringFrequency;
  next_run_date: string;
  end_date?: string;
  currency: CurrencyCode;
  tax_rate?: number;
  line_items: LineItem[];
  notes?: string;
  terms?: string;
  auto_send: boolean;
  is_active: boolean;
  last_run_date?: string;
  invoice_count: number;
  created_at: string;
}

export interface UserSettings {
  $id: string;
  user_id: string;
  business_name: string;
  business_email?: string;
  business_phone?: string;
  business_address?: string;
  tax_id?: string;
  logo_file_id?: string;
  default_currency: CurrencyCode;
  default_tax_rate: number;
  default_payment_terms?: string;
  invoice_prefix: string;
  invoice_counter: number;
  bank_accounts?: BankAccount[];
  invoice_footer_notes?: string;
}

export interface BankAccount {
  bank_name: string;
  account_name: string;
  account_number: string;
  currency: CurrencyCode;
}
