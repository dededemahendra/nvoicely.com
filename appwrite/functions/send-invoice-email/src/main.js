import { Client, Databases, Query } from "node-appwrite";
import { Resend } from "resend";

export default async ({ req, res, log, error }) => {
  const { invoiceId, userId } = JSON.parse(req.body);

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const db = new Databases(client);
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const invoice = await db.getDocument("main", "invoices", invoiceId);
    const clientDoc = await db.getDocument("main", "clients", invoice.client_id);

    const settingsList = await db.listDocuments("main", "settings", [
      Query.equal("user_id", userId),
      Query.limit(1),
    ]);
    const userSettings = settingsList.documents[0];

    const lineItems = typeof invoice.line_items === "string"
      ? JSON.parse(invoice.line_items)
      : invoice.line_items;

    const lineItemsHtml = lineItems
      .map(
        (item) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${item.description}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${item.amount}</td>
      </tr>`
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:24px">
        <h2>Invoice ${invoice.invoice_number}</h2>
        <p>Hi ${clientDoc.name},</p>
        <p>Please find your invoice from <strong>${userSettings?.business_name ?? "Our Business"}</strong> below.</p>
        <table style="width:100%;border-collapse:collapse">
          <tr style="background:#f5f5f5">
            <th style="padding:8px;text-align:left">Description</th>
            <th style="padding:8px;text-align:right">Qty</th>
            <th style="padding:8px;text-align:right">Amount</th>
          </tr>
          ${lineItemsHtml}
          <tr style="font-weight:bold;font-size:14px">
            <td style="padding:8px" colspan="2">Total</td>
            <td style="padding:8px;text-align:right">${invoice.currency} ${invoice.total}</td>
          </tr>
        </table>
        <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
        ${invoice.notes ? `<p style="color:#666">${invoice.notes}</p>` : ""}
        <p>Thank you for your business!</p>
        <p>${userSettings?.business_name ?? ""}</p>
      </body>
      </html>
    `;

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: clientDoc.email,
      subject: `Invoice ${invoice.invoice_number} from ${userSettings?.business_name ?? ""}`,
      html,
    });

    await db.updateDocument("main", "invoices", invoiceId, {
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    log(`Email sent for invoice ${invoice.invoice_number}`);
    return res.json({ success: true, emailId: result.data?.id });
  } catch (err) {
    error(`Failed to send email: ${err.message}`);
    return res.json({ success: false, error: err.message }, 500);
  }
};
