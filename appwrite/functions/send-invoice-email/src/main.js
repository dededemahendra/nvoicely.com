import { Client, Databases, Query } from "node-appwrite";
import { Resend } from "resend";

const CURRENCIES = {
  IDR: { locale: "id-ID", divisor: 1, fractionDigits: 0 },
  USD: { locale: "en-US", divisor: 100, fractionDigits: 2 },
  EUR: { locale: "de-DE", divisor: 100, fractionDigits: 2 },
  SGD: { locale: "en-SG", divisor: 100, fractionDigits: 2 },
  AUD: { locale: "en-AU", divisor: 100, fractionDigits: 2 },
};

function formatCurrency(amount, currency) {
  const cfg = CURRENCIES[currency] ?? CURRENCIES.USD;
  return new Intl.NumberFormat(cfg.locale, {
    style: "currency",
    currency,
    minimumFractionDigits: cfg.fractionDigits,
  }).format(amount / cfg.divisor);
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml({ invoice, client, settings, lineItems, appUrl, endpoint, projectId }) {
  const cur = invoice.currency;
  const businessName = settings?.business_name ?? "Our Business";
  const logoUrl = settings?.logo_file_id && endpoint && projectId
    ? `${endpoint}/storage/buckets/logos/files/${settings.logo_file_id}/view?project=${projectId}`
    : null;

  const itemsHtml = lineItems
    .map(
      (item) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(item.description)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${formatCurrency(item.unit_price, cur)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${formatCurrency(item.amount, cur)}</td>
      </tr>`
    )
    .join("");

  const banksHtml = Array.isArray(settings?.bank_accounts)
    ? settings.bank_accounts
        .map(
          (acc) => `
          <p style="margin:4px 0;color:#555">
            <strong>${escapeHtml(acc.bank_name)}</strong><br/>
            ${escapeHtml(acc.account_name)}<br/>
            ${escapeHtml(acc.account_number)}
          </p>`
        )
        .join("")
    : "";

  const viewUrl = appUrl ? `${appUrl}/invoices/${invoice.$id}/preview` : null;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Invoice ${escapeHtml(invoice.invoice_number)}</title></head>
<body style="font-family:Arial,sans-serif;color:#333;background:#fafafa;margin:0;padding:24px">
  <div style="max-width:600px;margin:0 auto;background:#fff;padding:32px;border-radius:8px">
    ${logoUrl ? `<img src="${logoUrl}" alt="${escapeHtml(businessName)}" style="max-height:60px;max-width:200px;margin-bottom:16px"/>` : ""}
    <h2 style="margin:0 0 4px">Invoice ${escapeHtml(invoice.invoice_number)}</h2>
    <p style="color:#666;margin:0 0 24px">From <strong>${escapeHtml(businessName)}</strong></p>

    <p>Hi ${escapeHtml(client.name)},</p>
    <p>Please find your invoice details below. The total due is <strong>${formatCurrency(invoice.total, cur)}</strong>, payable by <strong>${new Date(invoice.due_date).toLocaleDateString()}</strong>.</p>

    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <thead>
        <tr style="background:#f5f5f5">
          <th style="padding:8px;text-align:left">Description</th>
          <th style="padding:8px;text-align:right">Qty</th>
          <th style="padding:8px;text-align:right">Unit Price</th>
          <th style="padding:8px;text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
      <tfoot>
        <tr><td colspan="3" style="padding:8px;text-align:right;color:#666">Subtotal</td><td style="padding:8px;text-align:right">${formatCurrency(invoice.subtotal, cur)}</td></tr>
        <tr><td colspan="3" style="padding:8px;text-align:right;color:#666">Tax</td><td style="padding:8px;text-align:right">${formatCurrency(invoice.tax_amount, cur)}</td></tr>
        <tr style="font-weight:bold;font-size:15px"><td colspan="3" style="padding:8px;text-align:right;border-top:2px solid #333">Total</td><td style="padding:8px;text-align:right;border-top:2px solid #333">${formatCurrency(invoice.total, cur)}</td></tr>
      </tfoot>
    </table>

    ${
      viewUrl
        ? `<p style="text-align:center;margin:24px 0">
        <a href="${viewUrl}" style="display:inline-block;background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">View Invoice</a>
      </p>`
        : ""
    }

    ${banksHtml ? `<h3 style="margin-top:24px">Payment Details</h3>${banksHtml}` : ""}
    ${invoice.notes ? `<p style="color:#666;margin-top:16px"><strong>Notes:</strong> ${escapeHtml(invoice.notes)}</p>` : ""}

    <p style="margin-top:24px">Thank you for your business!</p>
    <p style="color:#666;margin:0">${escapeHtml(businessName)}</p>
  </div>
</body>
</html>`;
}

export default async ({ req, res, log, error }) => {
  let payload;
  try {
    payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const { invoiceId, userId } = payload ?? {};
  if (!invoiceId || !userId) {
    return res.json({ success: false, error: "invoiceId and userId required" }, 400);
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const db = new Databases(client);
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const invoice = await db.getDocument("main", "invoices", invoiceId);

    if (invoice.user_id !== userId) {
      return res.json({ success: false, error: "Forbidden" }, 403);
    }

    const clientDoc = await db.getDocument("main", "clients", invoice.client_id);
    if (!clientDoc.email) {
      return res.json({ success: false, error: "Client has no email address" }, 400);
    }

    const settingsList = await db.listDocuments("main", "settings", [
      Query.equal("user_id", userId),
      Query.limit(1),
    ]);
    const settings = settingsList.documents[0];

    const lineItems =
      typeof invoice.line_items === "string"
        ? JSON.parse(invoice.line_items)
        : invoice.line_items;

    const html = buildHtml({
      invoice,
      client: clientDoc,
      settings,
      lineItems,
      appUrl: process.env.APP_URL,
      endpoint: process.env.APPWRITE_ENDPOINT,
      projectId: process.env.APPWRITE_PROJECT_ID,
    });

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: clientDoc.email,
      subject: `Invoice ${invoice.invoice_number} from ${settings?.business_name ?? "Us"}`,
      html,
    });

    if (result.error) {
      throw new Error(result.error.message ?? "Resend error");
    }

    await db.updateDocument("main", "invoices", invoiceId, {
      status: "sent",
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    log(`Sent invoice ${invoice.invoice_number} to ${clientDoc.email}`);
    return res.json({ success: true, emailId: result.data?.id });
  } catch (err) {
    error(`send-invoice-email failed: ${err.message}`);
    return res.json({ success: false, error: err.message }, 500);
  }
};
