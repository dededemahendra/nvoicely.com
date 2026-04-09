import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { PageHeader } from "~/components/shared/PageHeader";
import { ConfirmDialog } from "~/components/shared/ConfirmDialog";
import { Skeleton } from "~/components/ui/skeleton";
import { useInvoice, useSendInvoice } from "~/hooks/useInvoices";
import { useClient } from "~/hooks/useClients";
import { useSettings } from "~/hooks/useSettings";

// Single lazy chunk for all @react-pdf/renderer code — avoids Vite pre-bundling
// the WASM-based library and prevents any SSR import issues.
const PDFDownloadButton = lazy(() =>
  import("~/components/invoice/PDFPreviewPane").then((m) => ({ default: m.PDFDownloadButton }))
);
const PDFPreviewPane = lazy(() =>
  import("~/components/invoice/PDFPreviewPane").then((m) => ({ default: m.PDFPreviewPane }))
);

export const Route = createFileRoute("/_authenticated/invoices/$id/preview")({
  component: InvoicePreviewPage,
});

function InvoicePreviewPage() {
  const { id } = Route.useParams();
  const { user } = Route.useRouteContext();
  const { data: invoice, isLoading: loadingInvoice } = useInvoice(id);
  const { data: client, isLoading: loadingClient } = useClient(invoice?.client_id ?? "");
  const { data: settings } = useSettings(user.$id);
  const sendInvoice = useSendInvoice();

  if (loadingInvoice || loadingClient) return <Skeleton className="h-[80vh] w-full" />;
  if (!invoice || !client) return <p>Invoice not found</p>;

  const canSend = !!client.email;

  function handleSend() {
    if (!invoice || !canSend) return;
    sendInvoice.mutate(
      { invoiceId: invoice.$id, userId: user.$id },
      {
        onSuccess: () => toast.success(`Invoice sent to ${client!.email}`),
        onError: (err) => toast.error((err as Error).message || "Failed to send invoice"),
      }
    );
  }

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
            <ConfirmDialog
              trigger={
                <Button disabled={!canSend || sendInvoice.isPending}>
                  <Send className="h-4 w-4 mr-2" />
                  {sendInvoice.isPending ? "Sending..." : "Send to client"}
                </Button>
              }
              title={`Send invoice ${invoice.invoice_number}?`}
              description={
                canSend
                  ? `This will email the invoice to ${client.email} and mark it as sent.`
                  : "This client has no email address."
              }
              actionLabel="Send"
              onConfirm={handleSend}
            />
            <Suspense fallback={<Button disabled variant="outline">Loading...</Button>}>
              <PDFDownloadButton invoice={invoice} client={client} settings={settings} />
            </Suspense>
          </div>
        }
      />

      <Suspense fallback={<Skeleton className="h-[80vh] w-full" />}>
        <PDFPreviewPane invoice={invoice} client={client} settings={settings} />
      </Suspense>
    </div>
  );
}
