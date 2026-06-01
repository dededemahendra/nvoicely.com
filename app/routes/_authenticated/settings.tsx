import { createFileRoute } from "@tanstack/react-router";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Database, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "~/components/shared/ConfirmDialog";
import { seedUserDataFn } from "~/lib/server/seed-fn";
import { storage, ID, Permission, Role } from "~/lib/appwrite";
import { BUCKETS } from "~/lib/constants";
import { settingsSchema, type SettingsFormValues } from "~/lib/validators/settings";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true);
    try {
      // Remove previous logo if any
      if (logoFileId) {
        try {
          await storage.deleteFile(BUCKETS.LOGOS, logoFileId);
        } catch {
          // ignore
        }
      }
      const created = await storage.createFile(BUCKETS.LOGOS, ID.unique(), file, [
        Permission.read(Role.any()),
        Permission.update(Role.user(user.$id)),
        Permission.delete(Role.user(user.$id)),
      ]);
      setValue("logo_file_id", created.$id, { shouldDirty: true });
      toast.success("Logo uploaded. Save settings to apply.");
    } catch (err) {
      toast.error((err as Error).message || "Logo upload failed");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleLogoRemove() {
    if (!logoFileId) return;
    try {
      await storage.deleteFile(BUCKETS.LOGOS, logoFileId);
    } catch {
      // ignore
    }
    setValue("logo_file_id", "", { shouldDirty: true });
  }

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
          logo_file_id: settings.logo_file_id ?? "",
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
          logo_file_id: "",
          bank_accounts: [],
          invoice_footer_notes: "",
        },
  });

  const { fields: bankFields, append: appendBank, remove: removeBank } = useFieldArray({
    control,
    name: "bank_accounts",
  });

  const logoFileId = watch("logo_file_id");
  const logoUrl = logoFileId
    ? storage.getFileView(BUCKETS.LOGOS, logoFileId).toString()
    : null;

  function onSubmit(values: SettingsFormValues) {
    upsertSettings.mutate(
      { ...values, user_id: user.$id, existing_id: settings?.$id },
      {
        onSuccess: () => toast.success("Settings saved"),
        onError: () => toast.error("Failed to save settings"),
      }
    );
  }

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Settings" description="Configure your business details and invoice defaults." />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Business info */}
        <Card className="shadow-none dark:ring-0">
          <CardHeader>
            <CardTitle className="text-base">Business information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business name *</Label>
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
            <div className="space-y-2 md:col-span-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <div className="relative h-20 w-20 overflow-hidden rounded-md border bg-muted">
                    <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
                  </div>
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                    No logo
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleLogoUpload(f);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingLogo}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploadingLogo ? "Uploading..." : logoFileId ? "Replace" : "Upload logo"}
                  </Button>
                  {logoFileId && (
                    <Button type="button" variant="ghost" size="sm" onClick={handleLogoRemove}>
                      <X className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  )}
                  <p className="text-[11px] text-muted-foreground">PNG, JPG, WebP or SVG · max 2MB</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice defaults */}
        <Card className="shadow-none dark:ring-0">
          <CardHeader>
            <CardTitle className="text-base">Invoice defaults</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Default currency</Label>
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
              <Label htmlFor="default_tax_rate">Default tax rate (%)</Label>
              <Input id="default_tax_rate" type="number" step="0.1" className="tabular-nums" {...register("default_tax_rate", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice_prefix">Invoice prefix *</Label>
              <Input id="invoice_prefix" {...register("invoice_prefix")} />
              {errors.invoice_prefix && <p className="text-sm text-destructive">{errors.invoice_prefix.message}</p>}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="default_payment_terms">Default payment terms</Label>
              <Textarea id="default_payment_terms" {...register("default_payment_terms")} />
            </div>
          </CardContent>
        </Card>

        {/* Bank accounts */}
        <Card className="shadow-none dark:ring-0">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Bank accounts</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendBank({ bank_name: "", account_name: "", account_number: "", currency: "IDR" })}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add bank
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {bankFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bank accounts added.</p>
            ) : (
              bankFields.map((field, index) => (
                <div key={field.id} className="grid items-end gap-3 rounded-md border p-3 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Bank name</Label>
                    <Input {...register(`bank_accounts.${index}.bank_name`)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Account name</Label>
                    <Input {...register(`bank_accounts.${index}.account_name`)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Account number</Label>
                    <Input {...register(`bank_accounts.${index}.account_number`)} />
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeBank(index)} aria-label="Remove bank">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Invoice footer */}
        <Card className="shadow-none dark:ring-0">
          <CardHeader>
            <CardTitle className="text-base">Invoice footer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="invoice_footer_notes">Footer notes</Label>
              <Textarea id="invoice_footer_notes" placeholder="Thank you for your business!" {...register("invoice_footer_notes")} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={upsertSettings.isPending} className="w-full sm:w-auto">
            {upsertSettings.isPending ? "Saving..." : "Save settings"}
          </Button>
        </div>
      </form>

      {/* Demo data */}
      <Card className="shadow-none dark:ring-0">
        <CardHeader>
          <CardTitle className="text-base">Demo data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Replace your data with a curated set of demo clients, invoices, expenses, and recurring
            templates. This wipes existing records for your account first.
          </p>
          <ConfirmDialog
            trigger={
              <Button type="button" variant="outline" disabled={seeding}>
                <Database className="mr-2 h-4 w-4" />
                {seeding ? "Seeding..." : "Load demo data"}
              </Button>
            }
            title="Replace all data with demo data?"
            description="This will delete your current clients, invoices, expenses, recurring templates, and settings, then create a fresh demo set. This cannot be undone."
            actionLabel="Replace"
            onConfirm={handleSeed}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-80" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="shadow-none dark:ring-0">
          <CardHeader>
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, f) => (
              <div key={f} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
