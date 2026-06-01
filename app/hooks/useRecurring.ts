import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, ID, Query, Permission, Role } from "~/lib/appwrite";
import { DB_ID, COLLECTIONS } from "~/lib/constants";
import type { RecurringTemplate } from "~/types";
import type { RecurringFormValues } from "~/lib/validators/recurring";

const PAGE_FETCH = 100;

export function useRecurringTemplates(userId: string) {
  return useQuery({
    queryKey: ["recurring", userId],
    queryFn: async () => {
      // Filtering, counts, and pagination are client-side, so fetch the full
      // set; page past Appwrite's cap with a cursor (+$id tiebreaker).
      const docs: Record<string, unknown>[] = [];
      let cursor: string | undefined;
      for (;;) {
        const queries = [
          Query.equal("user_id", userId),
          Query.orderDesc("$createdAt"),
          Query.orderDesc("$id"),
          Query.limit(PAGE_FETCH),
        ];
        if (cursor) queries.push(Query.cursorAfter(cursor));
        const res = await databases.listDocuments(
          DB_ID,
          COLLECTIONS.RECURRING_TEMPLATES,
          queries
        );
        docs.push(...res.documents);
        if (res.documents.length < PAGE_FETCH) break;
        cursor = res.documents[res.documents.length - 1].$id;
      }
      return docs.map((doc) => ({
        ...doc,
        line_items:
          typeof doc.line_items === "string" ? JSON.parse(doc.line_items) : doc.line_items,
      })) as unknown as RecurringTemplate[];
    },
    enabled: !!userId,
  });
}

export function useCreateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: RecurringFormValues & { user_id: string }) => {
      return databases.createDocument(
        DB_ID,
        COLLECTIONS.RECURRING_TEMPLATES,
        ID.unique(),
        {
          user_id: data.user_id,
          client_id: data.client_id,
          name: data.name,
          frequency: data.frequency,
          next_run_date: data.start_date,
          end_date: data.end_date ?? null,
          currency: data.currency,
          tax_rate: data.tax_rate ?? 11,
          line_items: JSON.stringify(data.line_items),
          notes: data.notes ?? "",
          terms: data.terms ?? "",
          auto_send: data.auto_send,
          is_active: true,
          invoice_count: 0,
          created_at: new Date().toISOString(),
        },
        [
          Permission.read(Role.user(data.user_id)),
          Permission.update(Role.user(data.user_id)),
          Permission.delete(Role.user(data.user_id)),
        ]
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring"] }),
  });
}

export function useToggleRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      databases.updateDocument(DB_ID, COLLECTIONS.RECURRING_TEMPLATES, id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring"] }),
  });
}

export function useDeleteRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => databases.deleteDocument(DB_ID, COLLECTIONS.RECURRING_TEMPLATES, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring"] }),
  });
}
