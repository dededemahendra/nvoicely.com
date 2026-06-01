import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, ID, Query, Permission, Role } from "~/lib/appwrite";
import { DB_ID, COLLECTIONS } from "~/lib/constants";
import type { Client } from "~/types";
import type { ClientFormValues } from "~/lib/validators/client";

const PAGE_FETCH = 100;

export function useClients(userId: string) {
  return useQuery({
    queryKey: ["clients", userId],
    queryFn: async () => {
      // Fetch the full set (search + pagination are client-side); page past
      // Appwrite's per-request cap with a cursor. $id tiebreaks the cursor.
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
        const res = await databases.listDocuments(DB_ID, COLLECTIONS.CLIENTS, queries);
        docs.push(...res.documents);
        if (res.documents.length < PAGE_FETCH) break;
        cursor = res.documents[res.documents.length - 1].$id;
      }
      return docs as unknown as Client[];
    },
    enabled: !!userId,
  });
}

export function useClient(clientId: string) {
  return useQuery({
    queryKey: ["clients", "detail", clientId],
    queryFn: async () => {
      const doc = await databases.getDocument(DB_ID, COLLECTIONS.CLIENTS, clientId);
      return doc as unknown as Client;
    },
    enabled: !!clientId,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: ClientFormValues & { user_id: string }) => {
      return databases.createDocument(
        DB_ID,
        COLLECTIONS.CLIENTS,
        ID.unique(),
        { ...data, created_at: new Date().toISOString() },
        [
          Permission.read(Role.user(data.user_id)),
          Permission.update(Role.user(data.user_id)),
          Permission.delete(Role.user(data.user_id)),
        ]
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: ClientFormValues & { id: string }) => {
      return databases.updateDocument(DB_ID, COLLECTIONS.CLIENTS, id, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => databases.deleteDocument(DB_ID, COLLECTIONS.CLIENTS, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}
