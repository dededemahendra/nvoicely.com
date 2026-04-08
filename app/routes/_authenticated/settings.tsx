import { createFileRoute } from "@tanstack/react-router";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Database } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "~/components/shared/ConfirmDialog";
import { seedUserDataFn } from "~/lib/server/seed-fn";
import { settingsSchema, type SettingsFormValues } from "~/lib/validators/settings";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { PageHeader } from "~/components/shared/PageHeader";
import { useSettings, useUpsertSettings } from "~/hooks/useSettings";
import { toast } from "sonner";
import type { CurrencyCode } from "~/types";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = Route.useRouteContext();
  const { data: settings, isLoading } = useSettings(user.$id);
  const upsertSettings = useUpsertSettings();
  const qc = useQueryClient();
  const [seeding, setSeeding] = useState(false);

  async function handleSeed() {
    setSeeding(true);
    try {
      const result = await seedUserDataFn({ data: { userId: user.$id } });
      toast.success(
        `Seeded ${result.clients} clients · ${result.invoices} invoices · ${result.expenses} expenses · ${result.recurring} recurring`
      );
      qc.invalidateQueries();
    } catch (err) {
      toast.error((err as Error).message || "Seed failed");
    } finally {
      setSeeding(false);
    }
  }

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    values: settings
      ? {
          business_name: settings.business_name,
          business_email: settings.business_email ?? "",
          business_phone: settings.business_phone ?? "",
          business_address: settings.business_address ?? "",
          default_currency: settings.default_currency,
          default_tax_rate: settings.default_tax_rate ?? 11,
          default_payment_terms: settings.default_payment_terms ?? "",
          invoice_prefix: settings.invoice_prefix,
          bank_accounts: settings.bank_accounts ?? [],
          invoice_footer_notes: settings.invoice_footer_notes ?? "",
        }
      : {
          business_name: user.name,
          business_email: user.email,
          business_phone: "",
          business_address: "",
          default_currency: "IDR",
          default_tax_rate: 11,
          default_payment_terms: "Payment due within 14 days",
          invoice_prefix: "INV",
          bank_accounts: [],
          invoice_footer_notes: "",
        },
  });

  const { fields: bankFields, append: appendBank, remove: removeBank } = useFieldArray({
    control,
    name: "bank_accounts",
  });

  function onSubmit(values: SettingsFormValues) {
    upsertSettings.mutate(
      { ...values, user_id: user.$id, existing_id: settings?.$id },
      {
        onSuccess: () => toast.success("Settings saved"),
        onError: () => toast.error("Failed to save settings"),
      }
    );
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Configure your business details and invoice defaults" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
        {/* Business Info */}
        <div className="space-y-4">
          <h3 className="font-medium">Business Information</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business Name *</Label>
              <Input id="business_name" {...register("business_name")} />
              {errors.business_name && <p className="text-sm text-destructive">{errors.business_name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="business_email">Email</Label>
              <Input id="business_email" type="email" {...register("business_email")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business_phone">Phone</Label>
              <Input id="business_phone" {...register("business_phone")} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="business_address">Address</Label>
              <Textarea id="business_address" {...register("business_address")} />
            </div>
          </div>
        </div>

        <Separator />

        {/* Invoice Defaults */}
        <div className="space-y-4">
          <h3 className="font-medium">Invoice Defaults</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Select value={watch("default_currency")} onValueChange={(v) => setValue("default_currency", v as CurrencyCode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["IDR", "USD", "EUR", "SGD", "AUD"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="default_tax_rate">Default Tax Rate (%)</Label>
              <Input id="default_tax_rate" type="number" step="0.1" {...register("default_tax_rate", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice_prefix">Invoice Prefix *</Label>
              <Input id="invoice_prefix" {...register("invoice_prefix")} />
              {errors.invoice_prefix && <p className="text-sm text-destructive">{errors.invoice_prefix.message}</p>}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="default_payment_terms">Default Payment Terms</Label>
              <Textarea id="default_payment_terms" {...register("default_payment_terms")} />
            </div>
          </div>
        </div>

        <Separator />

        {/* Bank Accounts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Bank Accounts</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendBank({ bank_name: "", account_name: "", account_number: "", currency: "IDR" })}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Bank
            </Button>
          </div>
          {bankFields.map((field, index) => (
            <div key={field.id} className="grid gap-3 md:grid-cols-4 items-end rounded-md border p-3">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input {...register(`bank_accounts.${index}.bank_name`)} />
              </div>
              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input {...register(`bank_accounts.${index}.account_name`)} />
              </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input {...register(`bank_accounts.${index}.account_number`)} />
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeBank(index)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <Separator />

        {/* Footer Notes */}
        <div className="space-y-2">
          <Label htmlFor="invoice_footer_notes">Invoice Footer Notes</Label>
          <Textarea id="invoice_footer_notes" placeholder="Thank you for your business!" {...register("invoice_footer_notes")} />
        </div>

        <Button type="submit" disabled={upsertSettings.isPending}>
          {upsertSettings.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </form>

      <Separator className="max-w-2xl" />

      <div className="space-y-3 max-w-2xl">
        <h3 className="font-medium">Demo Data</h3>
        <p className="text-sm text-muted-foreground">
          Replace your data with a curated set of demo clients, invoices, expenses, and recurring
          templates. This wipes existing records for your account first.
        </p>
        <ConfirmDialog
          trigger={
            <Button type="button" variant="outline" disabled={seeding}>
              <Database className="h-4 w-4 mr-2" />
              {seeding ? "Seeding..." : "Load demo data"}
            </Button>
          }
          title="Replace all data with demo data?"
          description="This will delete your current clients, invoices, expenses, recurring templates, and settings, then create a fresh demo set. This cannot be undone."
          actionLabel="Replace"
          onConfirm={handleSeed}
        />
      </div>
    </div>
  );
}
