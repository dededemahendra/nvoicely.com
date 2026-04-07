# CLAUDE_EXPENSES.md — Expense Tracking

## Overview

The expense tracker allows users to log business expenses, categorize them, attach receipts, and optionally link them to invoices as billable costs. Expenses are stored in the `expenses` Appwrite collection.

---

## Expense Categories

Define as a constant — not stored in DB, just used for display and filtering:

```typescript
// src/lib/expense-categories.ts
export const EXPENSE_CATEGORIES = [
  { value: 'software',    label: 'Software & Tools',    icon: '💻' },
  { value: 'travel',      label: 'Travel',               icon: '✈️' },
  { value: 'office',      label: 'Office & Supplies',    icon: '🏢' },
  { value: 'marketing',   label: 'Marketing & Ads',      icon: '📣' },
  { value: 'meals',       label: 'Meals & Entertainment',icon: '🍽️' },
  { value: 'utilities',   label: 'Utilities',             icon: '⚡' },
  { value: 'freelancer',  label: 'Subcontractors',        icon: '👤' },
  { value: 'banking',     label: 'Banking & Fees',        icon: '🏦' },
  { value: 'other',       label: 'Other',                 icon: '📦' },
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]['value'];
```

---

## Expense Form (Zod Schema)

```typescript
// In src/lib/validators.ts
export const expenseSchema = z.object({
  date: z.string().min(1, 'Date required'),
  category: z.string().min(1, 'Category required'),
  description: z.string().min(1, 'Description required'),
  amount: z.number().min(1, 'Amount must be > 0'),
  currency: z.enum(['IDR', 'USD', 'EUR', 'SGD', 'AUD']),
  vendor: z.string().optional(),
  is_tax_deductible: z.boolean().default(false),
  invoice_id: z.string().optional(),
  receipt_file_id: z.string().optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;
```

---

## ExpenseForm Component Structure

```
ExpenseForm
├── DatePicker
├── CategorySelect         (dropdown with icons)
├── DescriptionInput
├── AmountInput            (with CurrencySelect)
├── VendorInput            (optional)
├── TaxDeductibleCheckbox
├── InvoiceLinker          (optional: link to existing invoice)
├── ReceiptUploader        (upload to Appwrite Storage receipts bucket)
└── SubmitButton
```

---

## Receipt Upload Flow

```typescript
// Upload receipt file to Appwrite Storage
async function uploadReceipt(file: File, userId: string): Promise<string> {
  const response = await storage.createFile(
    RECEIPTS_BUCKET_ID,
    ID.unique(),
    file,
    [`user:${userId}`] // permissions
  );
  return response.$id;
}

// Get receipt preview URL
function getReceiptUrl(fileId: string): string {
  return storage.getFilePreview(RECEIPTS_BUCKET_ID, fileId).href;
}
```

---

## Data Hooks

```typescript
// src/hooks/useExpenses.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useExpenses(userId: string, filters?: ExpenseFilters) {
  const queries = [
    Query.equal('user_id', userId),
    Query.orderDesc('date'),
  ];

  if (filters?.category) queries.push(Query.equal('category', filters.category));
  if (filters?.dateFrom) queries.push(Query.greaterThanEqual('date', filters.dateFrom));
  if (filters?.dateTo) queries.push(Query.lessThanEqual('date', filters.dateTo));

  return useQuery({
    queryKey: ['expenses', userId, filters],
    queryFn: () => databases.listDocuments(DB_ID, EXPENSES_COL, queries),
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: ExpenseFormValues & { user_id: string }) => {
      // Fetch exchange rate if currency !== IDR
      const rate = data.currency === 'IDR'
        ? 1
        : await fetchExchangeRate(data.currency, 'IDR');

      return databases.createDocument(DB_ID, EXPENSES_COL, ID.unique(), {
        ...data,
        exchange_rate_to_idr: rate,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      databases.deleteDocument(DB_ID, EXPENSES_COL, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}
```

---

## Expense List Page (`/expenses`)

### Layout
```
Header: "Expenses" title + "Add Expense" button
Filters Bar:
  - Date range picker
  - Category filter (multi-select)
  - Currency filter
Summary row: Total this month (in IDR equivalent)
ExpenseTable:
  - Date | Category | Description | Vendor | Amount | Actions
  - Click row → side sheet with full detail + receipt preview
Pagination (25 per page)
```

### ExpenseTable columns
| Column | Notes |
|---|---|
| Date | Formatted `DD MMM YYYY` |
| Category | Icon + label |
| Description | Truncated at 40 chars |
| Vendor | Optional, greyed out if empty |
| Amount | Formatted with currency symbol |
| Tax Deductible | Checkmark icon |
| Actions | Edit icon + Delete icon |

---

## Expense Summary on Dashboard

Show a monthly breakdown card:

```typescript
// Group expenses by category for current month
const monthlySummary = expenses
  .filter(e => isSameMonth(new Date(e.date), new Date()))
  .reduce((acc, e) => {
    const idrAmount = e.amount * e.exchange_rate_to_idr;
    acc[e.category] = (acc[e.category] || 0) + idrAmount;
    return acc;
  }, {} as Record<string, number>);
```

Display as a donut chart (use Recharts) or a simple category breakdown list.

---

## Billable Expenses

When `invoice_id` is set on an expense, it means the cost is being passed through to the client. In the invoice view, show a "Billable Expenses" section that lists linked expenses. These are for reference only — line items are still manually added to the invoice by the user.

---

## Profit & Loss View (Optional Enhancement)

A simple P&L summary tab on the expenses page:

```
Revenue (paid invoices)      Rp 45.000.000
Expenses (all expenses)      Rp 12.500.000
                             ─────────────
Net Profit                   Rp 32.500.000
Profit Margin                      72.2%
```

Filter by: This Month / This Quarter / This Year / Custom Range
