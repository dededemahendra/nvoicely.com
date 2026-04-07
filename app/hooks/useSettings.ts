import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, ID, Query, Permission, Role } from "~/lib/appwrite";
import { DB_ID, COLLECTIONS } from "~/lib/constants";
import type { UserSettings } from "~/types";
import type { SettingsFormValues } from "~/lib/validators/settings";

export function useSettings(userId: string) {
  return useQuery({
    queryKey: ["settings", userId],
    queryFn: async () => {
      const res = await databases.listDocuments(DB_ID, COLLECTIONS.SETTINGS, [
        Query.equal("user_id", userId),
        Query.limit(1),
      ]);
      if (res.documents.length === 0) return null;
      const doc = res.documents[0];
      return {
        ...doc,
        bank_accounts: doc.bank_accounts
          ? typeof doc.bank_accounts === "string"
            ? JSON.parse(doc.bank_accounts)
            : doc.bank_accounts
          : [],
      } as unknown as UserSettings;
    },
    enabled: !!userId,
  });
}

export function useUpsertSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: SettingsFormValues & { user_id: string; existing_id?: string }) => {
      const payload = {
        ...data,
        bank_accounts: data.bank_accounts ? JSON.stringify(data.bank_accounts) : undefined,
      };

      if (data.existing_id) {
        const { user_id, existing_id, ...updateData } = payload;
        return databases.updateDocument(DB_ID, COLLECTIONS.SETTINGS, data.existing_id, updateData);
      }

      return databases.createDocument(
        DB_ID,
        COLLECTIONS.SETTINGS,
        ID.unique(),
        { ...payload, invoice_counter: 0 },
        [
          Permission.read(Role.user(data.user_id)),
          Permission.update(Role.user(data.user_id)),
          Permission.delete(Role.user(data.user_id)),
        ]
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}
