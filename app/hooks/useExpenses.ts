import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, ID, Query, Permission, Role } from "~/lib/appwrite";
import { DB_ID, COLLECTIONS } from "~/lib/constants";
import type { Expense } from "~/types";
import type { ExpenseFormValues } from "~/lib/validators/expense";

interface ExpenseFilters {
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useExpenses(userId: string, filters?: ExpenseFilters) {
  return useQuery({
    queryKey: ["expenses", userId, filters],
    queryFn: async () => {
      const queries = [
        Query.equal("user_id", userId),
        Query.orderDesc("date"),
        Query.limit(100),
      ];
      if (filters?.category) queries.push(Query.equal("category", filters.category));
      if (filters?.dateFrom) queries.push(Query.greaterThanEqual("date", filters.dateFrom));
      if (filters?.dateTo) queries.push(Query.lessThanEqual("date", filters.dateTo));

      const res = await databases.listDocuments(DB_ID, COLLECTIONS.EXPENSES, queries);
      return res.documents as unknown as Expense[];
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
