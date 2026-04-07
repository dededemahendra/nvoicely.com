import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, ID, Query, Permission, Role } from "~/lib/appwrite";
import { DB_ID, COLLECTIONS } from "~/lib/constants";
import { generateInvoiceNumber } from "~/lib/invoice-number";
import { calculateTotals } from "~/lib/invoice-calc";
import type { Invoice, InvoiceStatus, LineItem } from "~/types";
import type { InvoiceFormValues } from "~/lib/validators/invoice";

export function useInvoices(userId: string) {
  return useQuery({
    queryKey: ["invoices", userId],
    queryFn: async () => {
      const res = await databases.listDocuments(DB_ID, COLLECTIONS.INVOICES, [
        Query.equal("user_id", userId),
        Query.orderDesc("issue_date"),
        Query.limit(100),
      ]);
      return res.documents.map((doc) => ({
        ...doc,
        line_items: typeof doc.line_items === "string" ? JSON.parse(doc.line_items) : doc.line_items,
      })) as unknown as Invoice[];
    },
    enabled: !!userId,
  });
}

export function useInvoice(invoiceId: string) {
  return useQuery({
    queryKey: ["invoices", "detail", invoiceId],
    queryFn: async () => {
      const doc = await databases.getDocument(DB_ID, COLLECTIONS.INVOICES, invoiceId);
      return {
        ...doc,
        line_items: typeof doc.line_items === "string" ? JSON.parse(doc.line_items) : doc.line_items,
      } as unknown as Invoice;
    },
    enabled: !!invoiceId,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: InvoiceFormValues & { user_id: string }) => {
      // Get settings for invoice counter
      const settingsRes = await databases.listDocuments(DB_ID, COLLECTIONS.SETTINGS, [
        Query.equal("user_id", data.user_id),
        Query.limit(1),
      ]);
      const settings = settingsRes.documents[0];
      const newCounter = (settings?.invoice_counter ?? 0) + 1;
      const invoiceNumber = generateInvoiceNumber(
        settings?.invoice_prefix ?? "INV",
        newCounter
      );

      const { subtotal, taxAmount, total } = calculateTotals(
        data.line_items as LineItem[],
        data.discount_amount
      );

      const invoice = await databases.createDocument(
        DB_ID,
        COLLECTIONS.INVOICES,
        ID.unique(),
        {
          user_id: data.user_id,
          invoice_number: invoiceNumber,
          client_id: data.client_id,
          status: "draft",
          currency: data.currency,
          issue_date: data.issue_date,
          due_date: data.due_date,
          line_items: JSON.stringify(data.line_items),
          subtotal,
          tax_amount: taxAmount,
          discount_amount: data.discount_amount ?? 0,
          total,
          notes: data.notes ?? "",
          payment_terms: data.payment_terms ?? "",
          exchange_rate_to_idr: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        [
          Permission.read(Role.user(data.user_id)),
          Permission.update(Role.user(data.user_id)),
          Permission.delete(Role.user(data.user_id)),
        ]
      );

      // Update counter
      if (settings) {
        await databases.updateDocument(DB_ID, COLLECTIONS.SETTINGS, settings.$id, {
          invoice_counter: newCounter,
        });
      }

      return invoice;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: InvoiceFormValues & { id: string }) => {
      const { subtotal, taxAmount, total } = calculateTotals(
        data.line_items as LineItem[],
        data.discount_amount
      );
      return databases.updateDocument(DB_ID, COLLECTIONS.INVOICES, id, {
        client_id: data.client_id,
        currency: data.currency,
        issue_date: data.issue_date,
        due_date: data.due_date,
        line_items: JSON.stringify(data.line_items),
        subtotal,
        tax_amount: taxAmount,
        discount_amount: data.discount_amount ?? 0,
        total,
        notes: data.notes ?? "",
        payment_terms: data.payment_terms ?? "",
        updated_at: new Date().toISOString(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      databases.updateDocument(DB_ID, COLLECTIONS.INVOICES, id, {
        status,
        ...(status === "paid" ? { paid_at: new Date().toISOString() } : {}),
        ...(status === "sent" ? { sent_at: new Date().toISOString() } : {}),
        updated_at: new Date().toISOString(),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => databases.deleteDocument(DB_ID, COLLECTIONS.INVOICES, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}
