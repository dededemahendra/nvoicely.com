# CLAUDE.md — Invoice Generator

## Project Overview

A full-stack invoice generator web application built for freelancers and small businesses. Users can create and manage invoices, track clients, handle expenses, send invoices via email, set up recurring invoices, and export to PDF. Supports multi-currency (IDR, USD, EUR, and more).

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | TanStack Start (SSR, file-based routing) |
| UI Components | shadcn/ui |
| Styling | Tailwind CSS v4 |
| Backend / Database | Appwrite (Auth, Databases, Storage, Functions) |
| PDF Generation | @react-pdf/renderer |
| Email | Appwrite Functions + Resend API |
| State Management | TanStack Query (server state) + Zustand (UI state) |
| Form Handling | React Hook Form + Zod |
| Date Handling | date-fns |
| Currency Formatting | Intl.NumberFormat (native) |

## Project Structure

```
invoice-generator/
├── app/
│   ├── routes/
│   │   ├── __root.tsx               # Root layout, auth guard
│   │   ├── index.tsx                # Dashboard
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── invoices/
│   │   │   ├── index.tsx            # Invoice list
│   │   │   ├── new.tsx              # Create invoice
│   │   │   ├── $id.tsx              # Edit invoice
│   │   │   └── $id.preview.tsx      # PDF preview
│   │   ├── clients/
│   │   │   ├── index.tsx
│   │   │   ├── new.tsx
│   │   │   └── $id.tsx
│   │   ├── expenses/
│   │   │   ├── index.tsx
│   │   │   └── new.tsx
│   │   ├── recurring/
│   │   │   ├── index.tsx
│   │   │   └── new.tsx
│   │   └── settings.tsx
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components
│   │   ├── invoice/
│   │   │   ├── InvoiceForm.tsx
│   │   │   ├── LineItemsTable.tsx
│   │   │   ├── InvoicePreview.tsx
│   │   │   └── InvoicePDF.tsx
│   │   ├── clients/
│   │   ├── expenses/
│   │   ├── dashboard/
│   │   └── shared/
│   │       ├── CurrencySelect.tsx
│   │       ├── StatusBadge.tsx
│   │       └── AppLayout.tsx
│   ├── lib/
│   │   ├── appwrite.ts              # Appwrite client + server instances
│   │   ├── auth.ts                  # Auth helpers
│   │   ├── currency.ts              # Currency formatting utils
│   │   ├── invoice-number.ts        # Invoice number generation
│   │   └── validators/              # Zod schemas
│   ├── hooks/
│   │   ├── useInvoices.ts
│   │   ├── useClients.ts
│   │   └── useExpenses.ts
│   └── stores/
│       └── uiStore.ts               # Zustand UI state
├── appwrite/
│   └── functions/
│       ├── send-invoice-email/
│       └── process-recurring/
├── CLAUDE.md
├── CLAUDE_APPWRITE.md
├── CLAUDE_AUTH.md
├── CLAUDE_INVOICES.md
├── CLAUDE_EXPENSES.md
├── CLAUDE_RECURRING.md
├── CLAUDE_PDF_EMAIL.md
└── CLAUDE_UI.md
```

## Environment Variables

```env
# Appwrite
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_server_api_key           # Server-side only
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id

# Email (used inside Appwrite Function)
RESEND_API_KEY=your_resend_api_key
```

## Coding Conventions

- **Language**: TypeScript strict mode throughout
- **Imports**: Use `~/` path alias for `app/`
- **Components**: Functional components only, no class components
- **Data fetching**: Use TanStack Query (`useQuery`, `useMutation`) for all Appwrite calls
- **Forms**: React Hook Form + Zod for all forms — never uncontrolled inputs
- **Error handling**: All Appwrite calls wrapped in try/catch; surface errors via shadcn `toast`
- **Naming**: `camelCase` for variables/functions, `PascalCase` for components, `SCREAMING_SNAKE` for constants
- **File naming**: `kebab-case` for files, `PascalCase` for component files

## Key Business Rules

1. Invoice numbers are auto-generated as `INV-YYYY-XXXX` (sequential per user)
2. All monetary values are stored as **integers in the smallest currency unit** (e.g., cents for USD, sen for IDR) to avoid float precision issues
3. Currency is stored per-invoice; display formatting uses `Intl.NumberFormat`
4. Tax is stored as a percentage (e.g., `11` for 11% PPN) and calculated at render time, not stored as a computed value
5. Recurring invoices generate new invoice documents via an Appwrite scheduled Function
6. Expenses are separate from invoices but can be attached to a client for reporting

## Development Commands

```bash
npm install
npm run dev
npm run build
npm run typecheck
```

## Appwrite Resource Summary

See `CLAUDE_APPWRITE.md` for full schema.

Collections: `invoices`, `clients`, `line_items`, `expenses`, `recurring_templates`, `settings`

Storage Buckets: `logos` (business logo), `attachments` (invoice file attachments)

Functions: `send-invoice-email`, `process-recurring` (scheduled CRON)
