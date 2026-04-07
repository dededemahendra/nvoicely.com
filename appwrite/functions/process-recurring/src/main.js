import { Client, Databases, ID, Query } from "node-appwrite";

function calculateNextRunDate(currentDate, frequency) {
  const next = new Date(currentDate);
  switch (frequency) {
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const db = new Databases(client);
  const today = new Date().toISOString().split("T")[0];

  try {
    const schedules = await db.listDocuments("main", "recurring_templates", [
      Query.equal("is_active", true),
      Query.lessThanEqual("next_run_date", today),
      Query.limit(100),
    ]);

    log(`Processing ${schedules.documents.length} recurring templates`);

    for (const schedule of schedules.documents) {
      try {
        // Get user settings for invoice counter
        const settingsList = await db.listDocuments("main", "settings", [
          Query.equal("user_id", schedule.user_id),
          Query.limit(1),
        ]);
        const settings = settingsList.documents[0];

        if (!settings) {
          log(`No settings found for user ${schedule.user_id}, skipping`);
          continue;
        }

        // Generate invoice number
        const newCounter = (settings.invoice_counter ?? 0) + 1;
        const invoiceNumber = `${settings.invoice_prefix ?? "INV"}-${new Date().getFullYear()}-${String(newCounter).padStart(4, "0")}`;

        // Parse line items and calculate totals
        const lineItems =
          typeof schedule.line_items === "string"
            ? JSON.parse(schedule.line_items)
            : schedule.line_items;

        const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
        const taxRate = schedule.tax_rate ?? 11;
        const taxAmount = Math.round(subtotal * (taxRate / 100));
        const total = subtotal + taxAmount;

        // Create invoice
        await db.createDocument("main", "invoices", ID.unique(), {
          user_id: schedule.user_id,
          client_id: schedule.client_id,
          invoice_number: invoiceNumber,
          status: "draft",
          issue_date: new Date().toISOString(),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          currency: schedule.currency,
          exchange_rate_to_idr: 1,
          line_items: typeof schedule.line_items === "string" ? schedule.line_items : JSON.stringify(schedule.line_items),
          subtotal,
          tax_amount: taxAmount,
          discount_amount: 0,
          total,
          notes: schedule.notes ?? "",
          payment_terms: schedule.terms ?? "",
          recurring_id: schedule.$id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        // Update settings counter
        await db.updateDocument("main", "settings", settings.$id, {
          invoice_counter: newCounter,
        });

        // Update recurring schedule
        const nextRunDate = calculateNextRunDate(
          new Date(schedule.next_run_date),
          schedule.frequency
        );
        const isEnded =
          schedule.end_date && nextRunDate > new Date(schedule.end_date);

        await db.updateDocument("main", "recurring_templates", schedule.$id, {
          last_run_date: new Date().toISOString(),
          next_run_date: nextRunDate.toISOString(),
          invoice_count: (schedule.invoice_count ?? 0) + 1,
          is_active: !isEnded,
        });

        log(`Created invoice ${invoiceNumber} for template ${schedule.name}`);
      } catch (err) {
        error(`Error processing template ${schedule.$id}: ${err.message}`);
      }
    }

    return res.json({ processed: schedules.documents.length });
  } catch (err) {
    error(`Fatal error: ${err.message}`);
    return res.json({ error: err.message }, 500);
  }
};
