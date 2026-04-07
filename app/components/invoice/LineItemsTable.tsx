import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { nanoid } from "nanoid";
import { Trash2, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Separator } from "~/components/ui/separator";
import { formatCurrency, type CurrencyCode } from "~/lib/currency";
import { calculateTotals } from "~/lib/invoice-calc";
import type { InvoiceFormValues } from "~/lib/validators/invoice";
import type { LineItem } from "~/types";

export function LineItemsTable() {
  const { control, register, setValue, getValues } = useFormContext<InvoiceFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "line_items" });
  const currency = useWatch({ control, name: "currency" }) as CurrencyCode;
  const lineItems = useWatch({ control, name: "line_items" }) as LineItem[];
  const discountAmount = useWatch({ control, name: "discount_amount" }) ?? 0;

  function addItem() {
    append({
      id: nanoid(),
      description: "",
      quantity: 1,
      unit_price: 0,
      tax_rate: 11,
      amount: 0,
    });
  }

  function recalcRow(index: number) {
    const qty = getValues(`line_items.${index}.quantity`) || 0;
    const price = getValues(`line_items.${index}.unit_price`) || 0;
    setValue(`line_items.${index}.amount`, Math.round(qty * price));
  }

  const { subtotal, taxAmount, total } = calculateTotals(lineItems ?? [], discountAmount);

  return (
    <div className="space-y-4">
      {/* Mobile: stacked cards */}
      <div className="space-y-2 md:hidden">
        {fields.map((field, index) => (
          <div key={field.id} className="rounded-xl border bg-card p-3 shadow-sm">
            <div className="flex items-start gap-2">
              <Input
                placeholder="Item description"
                className="flex-1"
                {...register(`line_items.${index}.description`)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                disabled={fields.length <= 1}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Qty</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  className="tabular-nums"
                  {...register(`line_items.${index}.quantity`, { valueAsNumber: true })}
                  onChange={(e) => {
                    register(`line_items.${index}.quantity`, { valueAsNumber: true }).onChange(e);
                    setTimeout(() => recalcRow(index), 0);
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Price</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  inputMode="decimal"
                  className="tabular-nums"
                  {...register(`line_items.${index}.unit_price`, { valueAsNumber: true })}
                  onChange={(e) => {
                    register(`line_items.${index}.unit_price`, { valueAsNumber: true }).onChange(e);
                    setTimeout(() => recalcRow(index), 0);
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Tax %</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  inputMode="decimal"
                  className="tabular-nums"
                  {...register(`line_items.${index}.tax_rate`, { valueAsNumber: true })}
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t pt-2 text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium tabular-nums">
                {formatCurrency(lineItems?.[index]?.amount ?? 0, currency)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-xl border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="w-[90px]">Qty</TableHead>
              <TableHead className="w-[140px]">Unit Price</TableHead>
              <TableHead className="w-[90px]">Tax %</TableHead>
              <TableHead className="w-[160px] text-right">Amount</TableHead>
              <TableHead className="w-[52px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id}>
                <TableCell className="min-w-0">
                  <Input
                    placeholder="Item description"
                    {...register(`line_items.${index}.description`)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="tabular-nums"
                    {...register(`line_items.${index}.quantity`, { valueAsNumber: true })}
                    onChange={(e) => {
                      register(`line_items.${index}.quantity`, { valueAsNumber: true }).onChange(e);
                      setTimeout(() => recalcRow(index), 0);
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    className="tabular-nums"
                    {...register(`line_items.${index}.unit_price`, { valueAsNumber: true })}
                    onChange={(e) => {
                      register(`line_items.${index}.unit_price`, { valueAsNumber: true }).onChange(e);
                      setTimeout(() => recalcRow(index), 0);
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    className="tabular-nums"
                    {...register(`line_items.${index}.tax_rate`, { valueAsNumber: true })}
                  />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(lineItems?.[index]?.amount ?? 0, currency)}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={addItem}
        className="w-full border-dashed md:w-auto"
      >
        <Plus className="h-4 w-4" />
        Add line item
      </Button>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-full space-y-2 rounded-xl border bg-card p-4 text-sm md:w-80">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{formatCurrency(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span className="tabular-nums">{formatCurrency(taxAmount, currency)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Discount</span>
              <span className="tabular-nums">-{formatCurrency(discountAmount, currency)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatCurrency(total, currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
