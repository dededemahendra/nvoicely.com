/**
 * Loaded lazily — keeps all @react-pdf/renderer code out of the initial bundle
 * and prevents Vite from pre-bundling the WASM-based library.
 */
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import { Button } from "~/components/ui/button";
import { InvoicePDF } from "./InvoicePDF";
import type { Invoice, Client, UserSettings } from "~/types";

interface PDFPreviewPaneProps {
  invoice: Invoice;
  client: Client;
  settings?: UserSettings | null;
}

export function PDFDownloadButton({ invoice, client, settings }: PDFPreviewPaneProps) {
  return (
    <PDFDownloadLink
      document={<InvoicePDF invoice={invoice} client={client} settings={settings} />}
      fileName={`${invoice.invoice_number}.pdf`}
    >
      {({ loading }) => (
        <Button disabled={loading} variant="outline">
          {loading ? "Generating..." : "Download PDF"}
        </Button>
      )}
    </PDFDownloadLink>
  );
}

export function PDFPreviewPane({ invoice, client, settings }: PDFPreviewPaneProps) {
  return (
    <PDFViewer className="w-full rounded-md border" style={{ height: "80vh" }}>
      <InvoicePDF invoice={invoice} client={client} settings={settings} />
    </PDFViewer>
  );
}
