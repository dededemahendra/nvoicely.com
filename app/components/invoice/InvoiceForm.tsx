import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { nanoid } from "nanoid";
import { invoiceSchema, type InvoiceFormValues } from "~/lib/validators/invoice";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { CurrencySelect } from "~/components/shared/CurrencySelect";
import { LineItemsTable } from "~/components/invoice/LineItemsTable";
import type { Client, Invoice, CurrencyCode } from "~/types";

interface InvoiceFormProps {
  clients: Client[];
  defaultValues?: Invoice;
  onSubmit: (values: InvoiceFormValues) => void;
  isSubmitting: boolean;
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Meta Fields */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
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
            {errors.client_id && <p className="text-sm text-destructive">{errors.client_id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <CurrencySelect
              value={watch("currency") as CurrencyCode}
              onValueChange={(v) => setValue("currency", v)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue_date">Issue Date *</Label>
            <Input id="issue_date" type="date" {...register("issue_date")} />
            {errors.issue_date && <p className="text-sm text-destructive">{errors.issue_date.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date *</Label>
            <Input id="due_date" type="date" {...register("due_date")} />
            {errors.due_date && <p className="text-sm text-destructive">{errors.due_date.message}</p>}
          </div>
        </div>

        {/* Line Items */}
        <div className="space-y-2">
          <Label>Line Items</Label>
          <LineItemsTable />
          {errors.line_items?.message && (
            <p className="text-sm text-destructive">{errors.line_items.message}</p>
          )}
        </div>

        {/* Discount */}
        <div className="max-w-xs space-y-2">
          <Label htmlFor="discount_amount">Discount Amount</Label>
          <Input
            id="discount_amount"
            type="number"
            min="0"
            {...register("discount_amount", { valueAsNumber: true })}
          />
        </div>

        {/* Notes & Terms */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" placeholder="Notes visible on the invoice" {...register("notes")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment_terms">Payment Terms</Label>
            <Textarea
              id="payment_terms"
              placeholder="e.g. Payment due within 14 days"
              {...register("payment_terms")}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : defaultValues ? "Update Invoice" : "Create Invoice"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
