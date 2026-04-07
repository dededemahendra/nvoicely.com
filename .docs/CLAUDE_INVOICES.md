# CLAUDE_INVOICES.md — Invoice Business Logic

## Invoice Lifecycle

```
DRAFT → SENT → PAID
              ↓
           OVERDUE  (auto-set when due_date passes and status is still SENT)
              ↓
           CANCELLED (manual)
```

- **Draft**: Created but not yet sent to client. Can be freely edited.
- **Sent**: Emailed to client. Still editable but warn the user.
- **Paid**: Payment received. `paid_at` timestamp set. Read-only.
- **Overdue**: Past due date with no payment. Set by cron or on-read detection.
- **Cancelled**: Voided invoice. Not counted in revenue metrics.

---

## Invoice Numbering

Auto-incremented per user. Format: `{prefix}-{year}-{padded_counter}` → `INV-2025-0042`

```typescript
// src/lib/invoice-number.ts
export function generateInvoiceNumber(
  prefix: string,
  counter: number,
  year?: number
): string {
  const y = year ?? new Date().getFullYear();
  const padded = String(counter).padStart(4, '0');
  return `${prefix}-${y}-${padded}`;
}
```

**On invoice creation:**
1. Read `settings.invoice_counter` for the user
2. Increment counter: `newCounter = currentCounter + 1`
3. Generate number: `INV-2025-0042`
4. Save invoice with the number
5. Update `settings.invoice_counter = newCounter`

Use Appwrite transaction-safe pattern: update settings first, then create invoice. If invoice creation fails, decrement counter back.

---

## Line Items & Calculations

```typescript
// src/lib/invoice-calc.ts
import type { LineItem } from '~/types';

export function calculateLineItem(item: Omit<LineItem, 'amount'>): LineItem {
  return {
    ...item,
    amount: Math.round(item.quantity * item.unit_price),
  };
}

export function calculateTotals(
  lineItems: LineItem[],
  discountAmount = 0
) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  
  const taxAmount = lineItems.reduce((sum, item) => {
    return sum + Math.round(item.amount * (item.tax_rate / 100));
  }, 0);

  const total = subtotal + taxAmount - discountAmount;

  return { subtotal, taxAmount, discountAmount, total };
}
```

- All amounts are integers in the **smallest currency unit** (sen for IDR, cents for USD/EUR)
- Display layer divides by 100 for USD/EUR, keeps as-is for IDR (IDR has no decimal subunit)
- Store `unit_price` and `amount` in smallest unit

---

## Currency Handling

```typescript
// src/lib/currency.ts

export const CURRENCIES = {
  IDR: { code: 'IDR', symbol: 'Rp', locale: 'id-ID', divisor: 1 },
  USD: { code: 'USD', symbol: '$',  locale: 'en-US', divisor: 100 },
  EUR: { code: 'EUR', symbol: '€',  locale: 'de-DE', divisor: 100 },
  SGD: { code: 'SGD', symbol: 'S$', locale: 'en-SG', divisor: 100 },
  AUD: { code: 'AUD', symbol: 'A$', locale: 'en-AU', divisor: 100 },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

/**
 * Format integer (smallest unit) to display string
 * e.g. formatCurrency(150000, 'IDR') → "Rp 150.000"
 * e.g. formatCurrency(1500, 'USD')  → "$15.00"
 */
export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const config = CURRENCIES[currency];
  const value = amount / config.divisor;
  
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: config.divisor === 1 ? 0 : 2,
  }).format(value);
}

/**
 * Parse display value back to integer (smallest unit)
 * e.g. parseCurrency("150000", 'IDR') → 150000
 * e.g. parseCurrency("15.00", 'USD')  → 1500
 */
export function parseCurrency(value: string, currency: CurrencyCode): number {
  const config = CURRENCIES[currency];
  const num = parseFloat(value.replace(/[^0-9.]/g, ''));
  return Math.round(num * config.divisor);
}
```

**Exchange rate**: Fetch from a free API (e.g., `open.er-api.com`) at invoice creation time and store `exchange_rate_to_idr` on the invoice. This preserves historical accuracy — the rate is never recalculated after the invoice is saved.

---

## Invoice Form (Zod Schema)

```typescript
// src/lib/validators.ts
import { z } from 'zod';

export const lineItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, 'Description required'),
  quantity: z.number().min(0.01, 'Must be > 0'),
  unit_price: z.number().min(0, 'Must be >= 0'),
  tax_rate: z.number().min(0).max(100),
  amount: z.number(),
});

export const invoiceSchema = z.object({
  client_id: z.string().min(1, 'Select a client'),
  currency: z.enum(['IDR', 'USD', 'EUR', 'SGD', 'AUD']),
  issue_date: z.string(),
  due_date: z.string(),
  line_items: z.array(lineItemSchema).min(1, 'Add at least one item'),
  discount_amount: z.number().min(0).optional(),
  notes: z.string().optional(),
  payment_terms: z.string().optional(),
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;
```

---

## InvoiceForm Component Structure

```
InvoiceForm
├── ClientSelector         (searchable dropdown from clients collection)
├── InvoiceMetaFields      (invoice number, dates, currency, terms)
├── LineItemsTable
│   ├── LineItemRow[]      (description, qty, unit price, tax %, amount)
│   ├── AddLineItemButton
│   └── TotalsSection      (subtotal, tax, discount, total)
├── NotesField
└── ActionButtons          (Save Draft / Save & Send)
```

---

## Data Hooks

```typescript
// src/hooks/useInvoices.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, ID, Query } from '~/lib/appwrite';

export function useInvoices(userId: string) {
  return useQuery({
    queryKey: ['invoices', userId],
    queryFn: () => databases.listDocuments(
      DB_ID, INVOICES_COL,
      [Query.equal('user_id', userId), Query.orderDesc('issue_date')]
    ),
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateInvoicePayload) => {
      // 1. Get and increment settings counter
      // 2. Generate invoice number
      // 3. Create invoice document
      // 4. Return new invoice
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      databases.updateDocument(DB_ID, INVOICES_COL, id, {
        status,
        ...(status === 'paid' ? { paid_at: new Date().toISOString() } : {}),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
}
```

---

## PDF Generation

Use `@react-pdf/renderer` for client-side PDF:

```typescript
// src/components/invoice/InvoicePDF.tsx
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';

export function InvoicePDF({ invoice, client, settings }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header: logo + business info */}
        {/* Client info */}
        {/* Invoice meta (number, dates) */}
        {/* Line items table */}
        {/* Totals */}
        {/* Notes + payment info */}
        {/* Footer */}
      </Page>
    </Document>
  );
}
```

In the preview route, use `<PDFViewer>` for the iframe preview and `<PDFDownloadLink>` for the download button.

---

## Dashboard Metrics

Compute from invoices collection:

```typescript
// All amounts converted to IDR using stored exchange_rate_to_idr
const metrics = {
  totalRevenue: paidInvoices.reduce((sum, inv) => 
    sum + (inv.total * inv.exchange_rate_to_idr), 0),
  outstanding: sentInvoices.reduce(...),
  overdue: overdueInvoices.reduce(...),
  draftCount: draftInvoices.length,
};
```

Display currency toggle: show in IDR equivalent OR in each invoice's own currency (grouped).

---

## Overdue Detection

Two-pronged approach:
1. **On-read**: When fetching invoices, check if `status === 'sent'` and `due_date < now()`. Update status to `overdue` lazily.
2. **Cron**: Appwrite Function runs daily to bulk-update overdue invoices.

```typescript
// Lazy overdue check in useInvoices hook
const invoicesWithOverdue = invoices.map(inv => ({
  ...inv,
  status: (inv.status === 'sent' && new Date(inv.due_date) < new Date())
    ? 'overdue'
    : inv.status,
}));
```
