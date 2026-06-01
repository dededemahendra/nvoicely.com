import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { nanoid } from "nanoid";
import { invoiceSchema, type InvoiceFormValues } from "~/lib/validators/invoice";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { CurrencySelect } from "~/components/shared/CurrencySelect";
import { DatePicker } from "~/components/shared/DatePicker";
import { LineItemsTable } from "~/components/invoice/LineItemsTable";
import type { Client, Invoice, CurrencyCode } from "~/types";

interface InvoiceFormProps {
  clients: Client[];
  defaultValues?: Invoice;
  onSubmit: (values: InvoiceFormValues) => void;
  isSubmitting: boolean;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      <div className="rounded-xl border bg-card p-4 md:p-5">{children}</div>
    </section>
  );
}

export function InvoiceForm({ clients, defaultValues, onSubmit, isSubmitting }: InvoiceFormProps) {
  const today = new Date().toISOString().split("T")[0];

  const methods = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: defaultValues
      ? {
          client_id: defaultValues.client_id,
          currency: defaultValues.currency,
          issue_date: defaultValues.issue_date.split("T")[0],
          due_date: defaultValues.due_date.split("T")[0],
          line_items: defaultValues.line_items,
          discount_amount: defaultValues.discount_amount ?? 0,
          notes: defaultValues.notes ?? "",
          payment_terms: defaultValues.payment_terms ?? "",
        }
      : {
          client_id: "",
          currency: "IDR" as CurrencyCode,
          issue_date: today,
          due_date: "",
          line_items: [
            {
              id: nanoid(),
              description: "",
              quantity: 1,
              unit_price: 0,
              tax_rate: 11,
              amount: 0,
            },
          ],
          discount_amount: 0,
          notes: "",
          payment_terms: "",
        },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = methods;

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 md:space-y-6">
        <Section title="Details">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Client *</Label>
              <Select value={watch("client_id")} onValueChange={(v) => setValue("client_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.$id} value={c.$id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.client_id && <p className="text-xs text-destructive">{errors.client_id.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Currency</Label>
              <CurrencySelect
                value={watch("currency") as CurrencyCode}
                onValueChange={(v) => setValue("currency", v)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="issue_date">Issue date *</Label>
              <DatePicker
                id="issue_date"
                value={watch("issue_date")}
                onChange={(v) => setValue("issue_date", v, { shouldValidate: true, shouldDirty: true })}
                placeholder="Select issue date"
              />
              {errors.issue_date && <p className="text-xs text-destructive">{errors.issue_date.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="due_date">Due date *</Label>
              <DatePicker
                id="due_date"
                value={watch("due_date")}
                onChange={(v) => setValue("due_date", v, { shouldValidate: true, shouldDirty: true })}
                placeholder="Select due date"
              />
              {errors.due_date && <p className="text-xs text-destructive">{errors.due_date.message}</p>}
            </div>
          </div>
        </Section>

        <Section title="Line items">
          <LineItemsTable />
          {errors.line_items?.message && (
            <p className="mt-2 text-xs text-destructive">{errors.line_items.message}</p>
          )}
        </Section>

        <Section title="Adjustments">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="discount_amount">Discount amount</Label>
              <Input
                id="discount_amount"
                type="number"
                min="0"
                inputMode="decimal"
                className="tabular-nums"
                {...register("discount_amount", { valueAsNumber: true })}
              />
            </div>
          </div>
        </Section>

        <Section title="Notes & terms">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Notes visible on the invoice" rows={4} {...register("notes")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment_terms">Payment terms</Label>
              <Textarea
                id="payment_terms"
                placeholder="e.g. Payment due within 14 days"
                rows={4}
                {...register("payment_terms")}
              />
            </div>
          </div>
        </Section>

        <div className="sticky bottom-16 z-20 -mx-4 flex items-center justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur md:bottom-0 md:mx-0 md:rounded-xl md:border md:px-4">
          <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
            {isSubmitting && <Spinner />}
            {isSubmitting ? "Saving..." : defaultValues ? "Update invoice" : "Create invoice"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
