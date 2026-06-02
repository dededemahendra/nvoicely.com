/**
 * Loaded lazily — keeps all @react-pdf/renderer code out of the initial bundle
 * and prevents Vite from pre-bundling the WASM-based library.
 */
import { BlobProvider, PDFDownloadLink } from "@react-pdf/renderer";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
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
    <BlobProvider
      document={<InvoicePDF invoice={invoice} client={client} settings={settings} />}
    >
      {({ url, loading, error }) => {
        if (loading || (!url && !error)) {
          return <Skeleton className="h-[80vh] w-full" />;
        }
        if (error || !url) {
          return (
            <div className="flex h-[80vh] w-full items-center justify-center rounded-md border text-sm text-muted-foreground">
              Could not render the PDF preview. Try downloading it instead.
            </div>
          );
        }
        return (
          <iframe
            src={url}
            title={`Invoice ${invoice.invoice_number}`}
            className="w-full rounded-md border bg-white"
            style={{ height: "80vh" }}
          />
        );
      }}
    </BlobProvider>
  );
}
