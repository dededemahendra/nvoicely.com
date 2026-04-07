import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatCurrency } from "~/lib/currency";
import type { Invoice, Client, UserSettings, CurrencyCode } from "~/types";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  title: { fontSize: 24, fontWeight: "bold" },
  metaBlock: { marginBottom: 20 },
  metaRow: { flexDirection: "row", marginBottom: 4 },
  metaLabel: { width: 80, color: "#666" },
  metaValue: { flex: 1 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: "bold", marginBottom: 8 },
  table: { width: "100%" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f5f5f5", padding: 6, fontWeight: "bold" },
  tableRow: { flexDirection: "row", padding: 6, borderBottomWidth: 1, borderBottomColor: "#eee" },
  col1: { width: "40%" },
  col2: { width: "10%", textAlign: "right" },
  col3: { width: "20%", textAlign: "right" },
  col4: { width: "10%", textAlign: "right" },
  col5: { width: "20%", textAlign: "right" },
  totalsContainer: { alignItems: "flex-end", marginTop: 10 },
  totalsRow: { flexDirection: "row", width: 200, justifyContent: "space-between", marginBottom: 4 },
  totalLabel: { color: "#666" },
  totalLine: { borderTopWidth: 1, borderTopColor: "#333", paddingTop: 4, marginTop: 4 },
  totalBold: { fontWeight: "bold", fontSize: 12 },
  footer: { marginTop: 30, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#eee" },
  notes: { color: "#666", marginTop: 6 },
});

interface InvoicePDFProps {
  invoice: Invoice;
  client: Client;
  settings?: UserSettings | null;
}

export function InvoicePDF({ invoice, client, settings }: InvoicePDFProps) {
  const cur = invoice.currency as CurrencyCode;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={{ color: "#666", marginTop: 4 }}>{invoice.invoice_number}</Text>
          </View>
          <View style={{ textAlign: "right" }}>
            <Text style={{ fontWeight: "bold" }}>{settings?.business_name ?? "Your Business"}</Text>
            {settings?.business_email && <Text style={{ color: "#666" }}>{settings.business_email}</Text>}
            {settings?.business_phone && <Text style={{ color: "#666" }}>{settings.business_phone}</Text>}
            {settings?.business_address && <Text style={{ color: "#666" }}>{settings.business_address}</Text>}
          </View>
        </View>

        {/* Client & Dates */}
        <View style={{ flexDirection: "row", marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text style={{ fontWeight: "bold" }}>{client.name}</Text>
            <Text style={{ color: "#666" }}>{client.email}</Text>
            {client.company && <Text style={{ color: "#666" }}>{client.company}</Text>}
            {client.address_line1 && <Text style={{ color: "#666" }}>{client.address_line1}</Text>}
            {client.city && <Text style={{ color: "#666" }}>{client.city}{client.country ? `, ${client.country}` : ""}</Text>}
          </View>
          <View style={{ width: 200 }}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Issue Date:</Text>
              <Text style={styles.metaValue}>{new Date(invoice.issue_date).toLocaleDateString()}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Due Date:</Text>
              <Text style={styles.metaValue}>{new Date(invoice.due_date).toLocaleDateString()}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Currency:</Text>
              <Text style={styles.metaValue}>{invoice.currency}</Text>
            </View>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Description</Text>
            <Text style={styles.col2}>Qty</Text>
            <Text style={styles.col3}>Unit Price</Text>
            <Text style={styles.col4}>Tax</Text>
            <Text style={styles.col5}>Amount</Text>
          </View>
          {invoice.line_items.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.col1}>{item.description}</Text>
              <Text style={styles.col2}>{item.quantity}</Text>
              <Text style={styles.col3}>{formatCurrency(item.unit_price, cur)}</Text>
              <Text style={styles.col4}>{item.tax_rate}%</Text>
              <Text style={styles.col5}>{formatCurrency(item.amount, cur)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text>{formatCurrency(invoice.subtotal, cur)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalLabel}>Tax</Text>
            <Text>{formatCurrency(invoice.tax_amount, cur)}</Text>
          </View>
          {(invoice.discount_amount ?? 0) > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text>-{formatCurrency(invoice.discount_amount!, cur)}</Text>
            </View>
          )}
          <View style={[styles.totalsRow, styles.totalLine]}>
            <Text style={styles.totalBold}>Total</Text>
            <Text style={styles.totalBold}>{formatCurrency(invoice.total, cur)}</Text>
          </View>
        </View>

        {/* Notes & Payment Terms */}
        {(invoice.notes || invoice.payment_terms) && (
          <View style={styles.footer}>
            {invoice.payment_terms && (
              <View>
                <Text style={{ fontWeight: "bold" }}>Payment Terms</Text>
                <Text style={styles.notes}>{invoice.payment_terms}</Text>
              </View>
            )}
            {invoice.notes && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontWeight: "bold" }}>Notes</Text>
                <Text style={styles.notes}>{invoice.notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* Bank Details */}
        {settings?.bank_accounts && settings.bank_accounts.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontWeight: "bold" }}>Payment Details</Text>
            {settings.bank_accounts.map((acc, i) => (
              <View key={i} style={{ marginTop: 4 }}>
                <Text style={{ color: "#666" }}>
                  {acc.bank_name} - {acc.account_name} - {acc.account_number}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
