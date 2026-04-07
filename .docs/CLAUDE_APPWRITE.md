# CLAUDE_APPWRITE.md — Appwrite Schema & Configuration

## Setup

```ts
// app/lib/appwrite.ts

import { Client, Account, Databases, Storage, Functions } from "appwrite";

// Client-side instance (browser)
export const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);

// Server-side instance (TanStack Start server functions)
import { Client as ServerClient, Databases as ServerDatabases } from "node-appwrite";

export const serverClient = new ServerClient()
  .setEndpoint(process.env.APPWRITE_ENDPOINT!)
  .setProject(process.env.APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

export const serverDatabases = new ServerDatabases(serverClient);
```

## Constants

```ts
// app/lib/constants.ts
export const DB_ID = "main";

export const COLLECTIONS = {
  INVOICES: "invoices",
  CLIENTS: "clients",
  LINE_ITEMS: "line_items",
  EXPENSES: "expenses",
  RECURRING_TEMPLATES: "recurring_templates",
  SETTINGS: "settings",
} as const;

export const BUCKETS = {
  LOGOS: "logos",
  ATTACHMENTS: "attachments",
} as const;

export const FUNCTIONS = {
  SEND_INVOICE_EMAIL: "send-invoice-email",
  PROCESS_RECURRING: "process-recurring",
} as const;
```

---

## Collection Schemas

### `clients`

| Attribute | Type | Required | Notes |
|---|---|---|---|
| user_id | string | ✅ | Appwrite user $id |
| name | string | ✅ | Full name or company name |
| email | string | ✅ | |
| phone | string | ❌ | |
| company | string | ❌ | |
| address_line1 | string | ❌ | |
| address_line2 | string | ❌ | |
| city | string | ❌ | |
| state | string | ❌ | |
| postal_code | string | ❌ | |
| country | string | ❌ | ISO 3166-1 alpha-2 (e.g. "ID", "US") |
| tax_id | string | ❌ | NPWP or VAT number |
| notes | string | ❌ | |
| created_at | datetime | ✅ | |

**Indexes**: `user_id`, `email`

**Permissions**: Document-level — read/write only by owner (`user:{userId}`)

---

### `invoices`

| Attribute | Type | Required | Notes |
|---|---|---|---|
| user_id | string | ✅ | |
| invoice_number | string | ✅ | e.g. `INV-2024-0001` |
| client_id | string | ✅ | Ref to `clients.$id` |
| status | enum | ✅ | `draft`, `sent`, `paid`, `overdue`, `cancelled` |
| currency | string | ✅ | ISO 4217 (e.g. `IDR`, `USD`, `EUR`) |
| issue_date | datetime | ✅ | |
| due_date | datetime | ✅ | |
| subtotal | integer | ✅ | Smallest unit (cents/sen) |
| tax_rate | float | ❌ | e.g. `11` for 11% |
| tax_amount | integer | ✅ | Computed and stored on save |
| discount_amount | integer | ❌ | Smallest unit |
| total | integer | ✅ | subtotal + tax - discount |
| notes | string | ❌ | Shown on invoice |
| terms | string | ❌ | Payment terms text |
| recurring_template_id | string | ❌ | If generated from recurring |
| sent_at | datetime | ❌ | When email was sent |
| paid_at | datetime | ❌ | |
| created_at | datetime | ✅ | |
| updated_at | datetime | ✅ | |

**Indexes**: `user_id`, `status`, `client_id`, `due_date`, `invoice_number`

---

### `line_items`

| Attribute | Type | Required | Notes |
|---|---|---|---|
| invoice_id | string | ✅ | Ref to `invoices.$id` |
| user_id | string | ✅ | Denormalized for permission queries |
| description | string | ✅ | |
| quantity | float | ✅ | |
| unit_price | integer | ✅ | Smallest unit |
| amount | integer | ✅ | quantity × unit_price |
| sort_order | integer | ✅ | Display ordering |

**Indexes**: `invoice_id`, `user_id`

---

### `expenses`

| Attribute | Type | Required | Notes |
|---|---|---|---|
| user_id | string | ✅ | |
| client_id | string | ❌ | Optional client association |
| category | string | ✅ | e.g. `software`, `travel`, `equipment` |
| description | string | ✅ | |
| amount | integer | ✅ | Smallest unit |
| currency | string | ✅ | ISO 4217 |
| date | datetime | ✅ | Expense date |
| receipt_file_id | string | ❌ | Appwrite Storage file ID |
| notes | string | ❌ | |
| created_at | datetime | ✅ | |

**Indexes**: `user_id`, `client_id`, `date`, `category`

---

### `recurring_templates`

| Attribute | Type | Required | Notes |
|---|---|---|---|
| user_id | string | ✅ | |
| client_id | string | ✅ | |
| name | string | ✅ | Template label (internal) |
| frequency | enum | ✅ | `weekly`, `monthly`, `quarterly`, `yearly` |
| next_run_date | datetime | ✅ | When next invoice is generated |
| currency | string | ✅ | |
| tax_rate | float | ❌ | |
| notes | string | ❌ | |
| terms | string | ❌ | |
| is_active | boolean | ✅ | Default: `true` |
| last_run_date | datetime | ❌ | |
| created_at | datetime | ✅ | |

**Indexes**: `user_id`, `next_run_date`, `is_active`

---

### `settings`

One document per user. Use `upsert` pattern (query by `user_id`, create if not found).

| Attribute | Type | Required | Notes |
|---|---|---|---|
| user_id | string | ✅ | |
| business_name | string | ✅ | |
| business_email | string | ❌ | |
| business_phone | string | ❌ | |
| business_address | string | ❌ | |
| logo_file_id | string | ❌ | Appwrite Storage file ID |
| default_currency | string | ✅ | Default: `IDR` |
| default_tax_rate | float | ❌ | Default: `11` |
| default_payment_terms | string | ❌ | e.g. "Payment due within 14 days" |
| invoice_prefix | string | ✅ | Default: `INV` |
| invoice_counter | integer | ✅ | Auto-incremented on creation |
| bank_name | string | ❌ | |
| bank_account_name | string | ❌ | |
| bank_account_number | string | ❌ | |

**Indexes**: `user_id`

---

## Storage Buckets

### `logos`
- Max file size: 2MB
- Allowed MIME: `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`
- Permissions: read by `any` (public for PDF rendering), write by owner

### `attachments`
- Max file size: 10MB
- Allowed MIME: `application/pdf`, `image/*`
- Permissions: read/write by owner only

---

## Permissions Pattern

All collections use document-level security:

```ts
import { Permission, Role } from "appwrite";

const permissions = [
  Permission.read(Role.user(userId)),
  Permission.update(Role.user(userId)),
  Permission.delete(Role.user(userId)),
];

await databases.createDocument(DB_ID, COLLECTIONS.INVOICES, ID.unique(), data, permissions);
```

Server-side functions use the API key and bypass permissions — always validate `user_id` manually in function logic.

---

## Query Helpers

```ts
import { Query } from "appwrite";

// Get all invoices for current user, newest first
Query.equal("user_id", userId),
Query.orderDesc("$createdAt"),
Query.limit(25)

// Get overdue invoices
Query.equal("user_id", userId),
Query.equal("status", "sent"),
Query.lessThan("due_date", new Date().toISOString())

// Get recurring templates due today
Query.equal("is_active", true),
Query.lessThanEqual("next_run_date", new Date().toISOString())
```
