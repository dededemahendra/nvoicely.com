import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { nanoid } from "nanoid";
import { Trash2, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[35%]">Description</TableHead>
            <TableHead className="w-[10%]">Qty</TableHead>
            <TableHead className="w-[18%]">Unit Price</TableHead>
            <TableHead className="w-[10%]">Tax %</TableHead>
            <TableHead className="w-[18%] text-right">Amount</TableHead>
            <TableHead className="w-[9%]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field, index) => (
            <TableRow key={field.id}>
              <TableCell>
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
                  {...register(`line_items.${index}.tax_rate`, { valueAsNumber: true })}
                />
              </TableCell>
              <TableCell className="text-right font-mono">
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

      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        <Plus className="h-4 w-4 mr-1" />
        Add Item
      </Button>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-72 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span>{formatCurrency(taxAmount, currency)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Discount</span>
              <span>-{formatCurrency(discountAmount, currency)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-semibold text-base">
            <span>Total</span>
            <span>{formatCurrency(total, currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
