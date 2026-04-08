import { Client, Databases, Functions, Query, ExecutionMethod } from "node-appwrite";

// Daily CRON: scans sent invoices that are past due_date and sends a reminder
// email by re-invoking the send-invoice-email function. Tracks
// last_reminder_sent_at to avoid spamming (default: max 1 reminder per 7 days).

const REMINDER_INTERVAL_DAYS = 7;

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const db = new Databases(client);
  const fns = new Functions(client);

  const todayIso = new Date().toISOString();
  const cutoff = new Date(Date.now() - REMINDER_INTERVAL_DAYS * 86_400_000).toISOString();

  try {
    const overdue = await db.listDocuments("main", "invoices", [
      Query.equal("status", "sent"),
      Query.lessThan("due_date", todayIso),
      Query.limit(200),
    ]);

    let sent = 0;
    let skipped = 0;

    for (const invoice of overdue.documents) {
      if (invoice.last_reminder_sent_at && invoice.last_reminder_sent_at > cutoff) {
        skipped += 1;
        continue;
      }

      try {
        await fns.createExecution(
          "send-invoice-email",
          JSON.stringify({ invoiceId: invoice.$id, userId: invoice.user_id }),
          false,
          "/",
          ExecutionMethod.POST,
          { "content-type": "application/json" }
        );

        await db.updateDocument("main", "invoices", invoice.$id, {
          last_reminder_sent_at: todayIso,
          reminder_count: (invoice.reminder_count ?? 0) + 1,
        });

        sent += 1;
        log(`Reminder sent for ${invoice.invoice_number}`);
      } catch (err) {
        error(`Failed to remind ${invoice.invoice_number}: ${err.message}`);
      }
    }

    log(`Reminders: ${sent} sent, ${skipped} skipped, ${overdue.documents.length} total overdue`);
    return res.json({ sent, skipped, total: overdue.documents.length });
  } catch (err) {
    error(`Fatal: ${err.message}`);
    return res.json({ error: err.message }, 500);
  }
};
