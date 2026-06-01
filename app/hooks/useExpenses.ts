import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, ID, Query, Permission, Role } from "~/lib/appwrite";
import { DB_ID, COLLECTIONS } from "~/lib/constants";
import type { Expense } from "~/types";
import type { ExpenseFormValues } from "~/lib/validators/expense";

const PAGE_FETCH = 100;

export function useExpenses(userId: string) {
  return useQuery({
    queryKey: ["expenses", userId],
    queryFn: async () => {
      // Fetch the full set (category filter, search, and pagination are all
      // client-side); page past Appwrite's cap with a cursor (+$id tiebreaker).
      const docs: Record<string, unknown>[] = [];
      let cursor: string | undefined;
      for (;;) {
        const queries = [
          Query.equal("user_id", userId),
          Query.orderDesc("date"),
          Query.orderDesc("$id"),
          Query.limit(PAGE_FETCH),
        ];
        if (cursor) queries.push(Query.cursorAfter(cursor));
        const res = await databases.listDocuments(DB_ID, COLLECTIONS.EXPENSES, queries);
        docs.push(...res.documents);
        if (res.documents.length < PAGE_FETCH) break;
        cursor = res.documents[res.documents.length - 1].$id;
      }
      return docs as unknown as Expense[];
    },
    enabled: !!userId,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: ExpenseFormValues & { user_id: string }) => {
      return databases.createDocument(
        DB_ID,
        COLLECTIONS.EXPENSES,
        ID.unique(),
        {
          ...data,
          exchange_rate_to_idr: 1,
          created_at: new Date().toISOString(),
        },
        [
          Permission.read(Role.user(data.user_id)),
          Permission.update(Role.user(data.user_id)),
          Permission.delete(Role.user(data.user_id)),
        ]
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => databases.deleteDocument(DB_ID, COLLECTIONS.EXPENSES, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}
