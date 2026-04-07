# CLAUDE_UI.md — Component Patterns & shadcn/ui Usage

## shadcn/ui Setup

```bash
pnpm dlx shadcn@latest init
```

**Config choices:**
- Style: `default`
- Base color: `zinc`
- CSS variables: `yes`
- TypeScript: `yes`

## Required shadcn Components

Install all at once:
```bash
pnpm dlx shadcn@latest add button input label select textarea checkbox switch badge
pnpm dlx shadcn@latest add dialog sheet popover dropdown-menu
pnpm dlx shadcn@latest add table card separator skeleton
pnpm dlx shadcn@latest add form toast sonner
pnpm dlx shadcn@latest add calendar date-picker
pnpm dlx shadcn@latest add command
```

## Additional Libraries

```bash
pnpm add react-hook-form zod @hookform/resolvers
pnpm add @tanstack/react-query
pnpm add @react-pdf/renderer
pnpm add recharts
pnpm add date-fns
pnpm add nanoid
pnpm add resend                 # used in Appwrite Function only
```

---

## Layout Structure

### App Shell (`_app` layout)
```
┌─────────────────────────────────────────────┐
│  Sidebar (240px)  │  Main Content           │
│  ─────────────    │  ──────────────────────  │
│  Logo             │  Page Header            │
│  Navigation       │  (title + actions)      │
│  ─────────────    │                         │
│  Dashboard        │  Page Content           │
│  Invoices       ↓ │                         │
│  Recurring Inv.   │                         │
│  Clients          │                         │
│  Expenses         │                         │
│  ─────────────    │                         │
│  Settings         │                         │
│  Logout           │                         │
└─────────────────────────────────────────────┘
```

On mobile: sidebar collapses to a bottom tab bar (5 items: Dashboard, Invoices, Clients, Expenses, More).

---

## Reusable Component Patterns

### PageHeader

```typescript
// src/components/ui/page-header.tsx
interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-6 border-b">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
```

### StatusBadge

```typescript
// src/components/invoice/StatusBadge.tsx
import { Badge } from '~/components/ui/badge';
import type { InvoiceStatus } from '~/types';

const statusConfig: Record<InvoiceStatus, { label: string; variant: string }> = {
  draft:     { label: 'Draft',     variant: 'secondary' },
  sent:      { label: 'Sent',      variant: 'default' },
  paid:      { label: 'Paid',      variant: 'success' },     // custom variant
  overdue:   { label: 'Overdue',   variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const config = statusConfig[status];
  return <Badge variant={config.variant as any}>{config.label}</Badge>;
}
```

Add a `success` variant to `badge.tsx`:
```typescript
// In badge variants
success: 'bg-emerald-100 text-emerald-800 border-transparent',
```

### CurrencyInput

```typescript
// src/components/ui/currency-input.tsx
// A number input that formats on blur and strips on focus
export function CurrencyInput({ currency, value, onChange, ...props }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const config = CURRENCIES[currency];

  const handleBlur = () => {
    const parsed = parseFloat(displayValue.replace(/[^0-9.]/g, ''));
    if (!isNaN(parsed)) {
      onChange(Math.round(parsed * config.divisor));
      setDisplayValue(formatCurrency(Math.round(parsed * config.divisor), currency));
    }
  };

  const handleFocus = () => {
    setDisplayValue(String(value / config.divisor));
  };

  return <Input value={displayValue} onBlur={handleBlur} onFocus={handleFocus} {...props} />;
}
```

### ConfirmDialog

```typescript
// src/components/ui/confirm-dialog.tsx
export function ConfirmDialog({ trigger, title, description, onConfirm }: Props) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## LineItemsTable

This is the most complex UI component. Use `useFieldArray` from React Hook Form.

```typescript
// src/components/invoice/LineItemsTable.tsx
import { useFieldArray, useFormContext } from 'react-hook-form';
import type { InvoiceFormValues } from '~/lib/validators';

export function LineItemsTable() {
  const { control, watch, setValue } = useFormContext<InvoiceFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'line_items' });
  const currency = watch('currency');

  const addItem = () => append({
    id: nanoid(),
    description: '',
    quantity: 1,
    unit_price: 0,
    tax_rate: 11, // default to PPN 11%
    amount: 0,
  });

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Description</TableHead>
            <TableHead className="w-[10%]">Qty</TableHead>
            <TableHead className="w-[15%]">Unit Price</TableHead>
            <TableHead className="w-[10%]">Tax %</TableHead>
            <TableHead className="w-[15%] text-right">Amount</TableHead>
            <TableHead className="w-[10%]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field, index) => (
            <LineItemRow
              key={field.id}
              index={index}
              currency={currency}
              onRemove={() => remove(index)}
            />
          ))}
        </TableBody>
      </Table>

      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        + Add Item
      </Button>

      <TotalsSection currency={currency} />
    </div>
  );
}
```

---

## TotalsSection

```typescript
export function TotalsSection({ currency }: { currency: CurrencyCode }) {
  const { watch } = useFormContext<InvoiceFormValues>();
  const lineItems = watch('line_items');
  const discountAmount = watch('discount_amount') ?? 0;
  const { subtotal, taxAmount, total } = calculateTotals(lineItems, discountAmount);

  return (
    <div className="flex justify-end">
      <div className="w-64 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(subtotal, currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax</span>
          <span>{formatCurrency(taxAmount, currency)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-emerald-600">
            <span>Discount</span>
            <span>-{formatCurrency(discountAmount, currency)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-semibold text-base">
          <span>Total</span>
          <span>{formatCurrency(total, currency)}</span>
        </div>
      </div>
    </div>
  );
}
```

---

## Dashboard Cards

```typescript
// src/components/dashboard/SummaryCards.tsx
const cards = [
  {
    label: 'Total Revenue',
    value: formatCurrency(metrics.totalRevenue, 'IDR'),
    description: 'All paid invoices',
    icon: TrendingUp,
    color: 'text-emerald-600',
  },
  {
    label: 'Outstanding',
    value: formatCurrency(metrics.outstanding, 'IDR'),
    description: 'Sent, awaiting payment',
    icon: Clock,
    color: 'text-blue-600',
  },
  {
    label: 'Overdue',
    value: formatCurrency(metrics.overdue, 'IDR'),
    description: 'Past due date',
    icon: AlertCircle,
    color: 'text-red-600',
  },
  {
    label: 'Drafts',
    value: String(metrics.draftCount),
    description: 'Not yet sent',
    icon: FileText,
    color: 'text-zinc-500',
  },
];
```

---

## Toast Notifications

Use `sonner` (ships with shadcn):

```typescript
import { toast } from 'sonner';

// Success
toast.success('Invoice sent successfully');

// Error
toast.error('Failed to send invoice. Please try again.');

// Loading → resolve
const id = toast.loading('Sending invoice...');
// ...after async op:
toast.success('Invoice sent!', { id });
```

---

## Loading States

Use `Skeleton` for list/table loading:

```typescript
// LoadingInvoiceTable
Array.from({ length: 5 }).map((_, i) => (
  <TableRow key={i}>
    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
    <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
  </TableRow>
))
```

---

## TypeScript Types

```typescript
// src/types/index.ts

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type CurrencyCode = 'IDR' | 'USD' | 'EUR' | 'SGD' | 'AUD';
export type ExpenseCategory = 'software' | 'travel' | 'office' | 'marketing' | 'meals' | 'utilities' | 'freelancer' | 'banking' | 'other';
export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

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
  line_items: LineItem[];  // parsed from JSON string
  subtotal: number;
  tax_amount: number;
  discount_amount?: number;
  total: number;
  notes?: string;
  payment_terms?: string;
  paid_at?: string;
  recurring_id?: string;
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
  country?: string;
  tax_id?: string;
  currency?: CurrencyCode;
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
}

export interface UserSettings {
  $id: string;
  user_id: string;
  business_name: string;
  business_email: string;
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
```
