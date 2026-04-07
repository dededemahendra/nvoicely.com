import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { PageHeader } from "~/components/shared/PageHeader";
import { Skeleton } from "~/components/ui/skeleton";
import { useInvoice } from "~/hooks/useInvoices";
import { useClient } from "~/hooks/useClients";
import { useSettings } from "~/hooks/useSettings";

const PDFViewer = lazy(() =>
  import("@react-pdf/renderer").then((mod) => ({ default: mod.PDFViewer }))
);
const PDFDownloadLink = lazy(() =>
  import("@react-pdf/renderer").then((mod) => ({ default: mod.PDFDownloadLink }))
);

import { InvoicePDF } from "~/components/invoice/InvoicePDF";

export const Route = createFileRoute("/_authenticated/invoices/$id/preview")({
  component: InvoicePreviewPage,
});

function InvoicePreviewPage() {
  const { id } = Route.useParams();
  const { user } = Route.useRouteContext();
  const { data: invoice, isLoading: loadingInvoice } = useInvoice(id);
  const { data: client, isLoading: loadingClient } = useClient(invoice?.client_id ?? "");
  const { data: settings } = useSettings(user.$id);

  if (loadingInvoice || loadingClient) return <Skeleton className="h-[80vh] w-full" />;
  if (!invoice || !client) return <p>Invoice not found</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Preview ${invoice.invoice_number}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/invoices/$id" params={{ id }}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <Suspense fallback={<Button disabled>Loading...</Button>}>
              <PDFDownloadLink
                document={<InvoicePDF invoice={invoice} client={client} settings={settings} />}
                fileName={`${invoice.invoice_number}.pdf`}
              >
                {({ loading }) => (
                  <Button disabled={loading}>{loading ? "Generating..." : "Download PDF"}</Button>
                )}
              </PDFDownloadLink>
            </Suspense>
          </div>
        }
      />

      <Suspense fallback={<Skeleton className="h-[80vh] w-full" />}>
        <PDFViewer className="w-full h-[80vh] rounded-md border">
          <InvoicePDF invoice={invoice} client={client} settings={settings} />
        </PDFViewer>
      </Suspense>
    </div>
  );
}
