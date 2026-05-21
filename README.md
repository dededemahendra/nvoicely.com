# Invoice Generator

Full-stack invoice management web application for freelancers and small businesses.

## What it does

- Create, edit, and manage invoices with line items, taxes, and multi-currency support (IDR, USD, EUR, and more)
- Maintain a client database and link invoices to clients
- Track business expenses
- Schedule recurring invoices (weekly, monthly, etc.)
- Send invoices to clients via email
- Export invoices to PDF
- Dashboard with revenue and outstanding balance overview

## Tech stack

- **Frontend:** TanStack Start (SSR + file-based routing), React 19, Tailwind CSS v4, shadcn/ui, Radix primitives
- **Backend:** Appwrite (auth, databases, storage, functions)
- **PDF generation:** @react-pdf/renderer
- **Email:** Appwrite Functions + Resend
- **Forms:** React Hook Form + Zod
- **State:** TanStack Query

## Getting started

```bash
pnpm install
cp .env.example .env  # fill in Appwrite credentials
pnpm run setup        # provision Appwrite databases
pnpm run dev
```
