# CLAUDE_EMAIL_RECURRING.md — Email & Recurring Invoices

## Email Architecture

Emails are sent via an **Appwrite Function** that calls the **Resend API**. The function is triggered via HTTP from a TanStack Start server function — never called directly from the client.

```
Client → TanStack Server Fn → Appwrite Function (HTTP trigger) → Resend API → Client's Email
```

---

## Appwrite Function: `send-invoice-email`

### Runtime: Node.js 21

### Environment Variables (set in Appwrite Console)
```
APPWRITE_ENDPOINT
APPWRITE_PROJECT_ID
APPWRITE_API_KEY
RESEND_API_KEY
EMAIL_FROM
APP_URL
```

### Function Entry Point (`src/main.js`)
```javascript
import { Client, Databases } from 'node-appwrite';
import { Resend } from 'resend';

export default async ({ req, res, log, error }) => {
  const { invoiceId, userId } = JSON.parse(req.body);

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const db = new Databases(client);
  const resend = new Resend(process.env.RESEND_API_KEY);

  // 1. Fetch invoice
  const invoice = await db.getDocument('invoice_db', 'invoices', invoiceId);
  
  // 2. Fetch client
  const clientDoc = await db.getDocument('invoice_db', 'clients', invoice.client_id);
  
  // 3. Fetch sender settings
  const settings = await db.listDocuments('invoice_db', 'settings', [
    // Query.equal('user_id', userId)  ← use appropriate query
  ]);
  const userSettings = settings.documents[0];

  // 4. Build HTML email
  const html = buildInvoiceEmailHtml({ invoice, client: clientDoc, settings: userSettings });

  // 5. Send via Resend
  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: clientDoc.email,
    subject: `Invoice ${invoice.invoice_number} from ${userSettings.business_name}`,
    html,
  });

  // 6. Update invoice status to 'sent'
  await db.updateDocument('invoice_db', 'invoices', invoiceId, {
    status: 'sent',
  });

  return res.json({ success: true, emailId: result.data?.id });
};
```

---

## Email HTML Template

```typescript
// buildInvoiceEmailHtml function
function buildInvoiceEmailHtml({ invoice, client, settings }) {
  const lineItemsHtml = JSON.parse(invoice.line_items)
    .map(item => `
      <tr>
        <td>${item.description}</td>
        <td style="text-align:right">${item.quantity}</td>
        <td style="text-align:right">${formatCurrency(item.unit_price, invoice.currency)}</td>
        <td style="text-align:right">${formatCurrency(item.amount, invoice.currency)}</td>
      </tr>
    `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 24px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f5f5f5; padding: 8px; text-align: left; }
        td { padding: 8px; border-bottom: 1px solid #eee; }
        .total-row { font-weight: bold; font-size: 16px; }
        .btn { display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Invoice ${invoice.invoice_number}</h2>
        <p>Hi ${client.name},</p>
        <p>Please find your invoice from <strong>${settings.business_name}</strong> below.</p>
        
        <table>
          <tr>
            <th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th>
          </tr>
          ${lineItemsHtml}
          <tr class="total-row">
            <td colspan="3">Total</td>
            <td style="text-align:right">${formatCurrency(invoice.total, invoice.currency)}</td>
          </tr>
        </table>

        <p><strong>Due Date:</strong> ${formatDate(invoice.due_date)}</p>

        ${settings.bank_accounts ? `
        <h3>Payment Details</h3>
        ${JSON.parse(settings.bank_accounts).map(acc => `
          <p>${acc.bank_name}<br>${acc.account_name}<br>${acc.account_number}</p>
        `).join('')}
        ` : ''}

        <p>
          <a href="${process.env.APP_URL}/invoices/${invoice.$id}/preview" class="btn">
            View Invoice
          </a>
        </p>

        ${invoice.notes ? `<p style="color:#666">${invoice.notes}</p>` : ''}

        <p>Thank you for your business!</p>
        <p>${settings.business_name}</p>
      </div>
    </body>
    </html>
  `;
}
```

---

## Triggering Email from Server Function

```typescript
// src/lib/send-invoice.ts (TanStack Start server function)
import { createServerFn } from '@tanstack/start';

export const sendInvoiceEmail = createServerFn()
  .validator(z.object({ invoiceId: z.string(), userId: z.string() }))
  .handler(async ({ data }) => {
    const fnUrl = `${process.env.APPWRITE_ENDPOINT}/functions/send-invoice-email/executions`;

    const response = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': process.env.APPWRITE_PROJECT_ID!,
        'X-Appwrite-Key': process.env.APPWRITE_API_KEY!,
      },
      body: JSON.stringify({
        body: JSON.stringify({ invoiceId: data.invoiceId, userId: data.userId }),
        async: false,
      }),
    });

    if (!response.ok) throw new Error('Failed to send invoice email');
    return { success: true };
  });
```

---

## Recurring Invoices

### Data Flow

```
User creates RecurringInvoice template
         ↓
Appwrite CRON Function runs daily @ 06:00 UTC
         ↓
Queries: status = 'active' AND next_run_date <= today
         ↓
For each: create Invoice from template
         ↓
If auto_send = true: trigger send-invoice-email function
         ↓
Update next_run_date + last_run_date + invoice_count
```

### Frequency → Next Run Date Calculation

```typescript
// In the Appwrite Function
function calculateNextRunDate(currentDate: Date, frequency: string): Date {
  const next = new Date(currentDate);
  switch (frequency) {
    case 'weekly':    next.setDate(next.getDate() + 7); break;
    case 'monthly':   next.setMonth(next.getMonth() + 1); break;
    case 'quarterly': next.setMonth(next.getMonth() + 3); break;
    case 'yearly':    next.setFullYear(next.getFullYear() + 1); break;
  }
  return next;
}
```

### Appwrite Function: `generate-recurring-invoices`

**CRON trigger**: `0 6 * * *`

```javascript
export default async ({ req, res, log }) => {
  const today = new Date().toISOString().split('T')[0];

  // 1. Find all due recurring schedules
  const schedules = await db.listDocuments('invoice_db', 'recurring_invoices', [
    Query.equal('status', 'active'),
    Query.lessThanEqual('next_run_date', today),
  ]);

  log(`Processing ${schedules.documents.length} recurring invoices`);

  for (const schedule of schedules.documents) {
    try {
      // 2. Get user settings for invoice number
      const settingsList = await db.listDocuments('invoice_db', 'settings', [
        Query.equal('user_id', schedule.user_id),
      ]);
      const settings = settingsList.documents[0];

      // 3. Increment counter and generate invoice number
      const newCounter = settings.invoice_counter + 1;
      const invoiceNumber = `${settings.invoice_prefix}-${new Date().getFullYear()}-${String(newCounter).padStart(4, '0')}`;

      // 4. Calculate totals from template line items
      const lineItems = JSON.parse(schedule.template_line_items);
      const { subtotal, taxAmount, total } = calculateTotals(lineItems);

      // 5. Create invoice
      const invoice = await db.createDocument('invoice_db', 'invoices', ID.unique(), {
        user_id: schedule.user_id,
        client_id: schedule.client_id,
        invoice_number: invoiceNumber,
        status: 'draft',
        issue_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        currency: schedule.template_currency,
        exchange_rate_to_idr: 1, // fetch real rate in production
        line_items: schedule.template_line_items,
        subtotal,
        tax_amount: taxAmount,
        total,
        notes: schedule.template_notes || '',
        payment_terms: schedule.template_payment_terms || '',
        recurring_id: schedule.$id,
      });

      // 6. Update settings counter
      await db.updateDocument('invoice_db', 'settings', settings.$id, {
        invoice_counter: newCounter,
      });

      // 7. Send email if auto_send
      if (schedule.auto_send) {
        // Trigger send-invoice-email function
        await triggerSendEmail(invoice.$id, schedule.user_id);
        await db.updateDocument('invoice_db', 'invoices', invoice.$id, { status: 'sent' });
      }

      // 8. Update recurring schedule
      const nextRunDate = calculateNextRunDate(new Date(schedule.next_run_date), schedule.frequency);
      const isEnded = schedule.end_date && nextRunDate > new Date(schedule.end_date);

      await db.updateDocument('invoice_db', 'recurring_invoices', schedule.$id, {
        last_run_date: new Date().toISOString(),
        next_run_date: nextRunDate.toISOString(),
        invoice_count: schedule.invoice_count + 1,
        status: isEnded ? 'ended' : 'active',
      });

      log(`Created invoice ${invoiceNumber} for schedule ${schedule.$id}`);
    } catch (err) {
      log(`Error processing schedule ${schedule.$id}: ${err.message}`);
      // Continue processing other schedules
    }
  }

  return res.json({ processed: schedules.documents.length });
};
```

---

## Recurring Invoice UI

### Create Recurring Invoice Page (`/invoices/recurring/new`)

```
RecurringInvoiceForm
├── ClientSelector
├── FrequencySelect        (weekly / monthly / quarterly / yearly)
├── StartDatePicker
├── EndDatePicker          (optional — leave empty for indefinite)
├── AutoSendToggle         ("Automatically email invoice on generation")
├── LineItemsTable         (same component as invoice form)
├── NotesField
└── SubmitButton
```

### Recurring Invoice List (`/invoices/recurring`)

Show a table: Client | Frequency | Next Invoice | Status (Active/Paused/Ended) | Actions (Pause / Edit / Delete)

Allow user to **pause** a recurring invoice (set `status = 'paused'`) without deleting it.
