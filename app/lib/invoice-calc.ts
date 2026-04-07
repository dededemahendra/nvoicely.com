import type { LineItem } from "~/types";

export function calculateLineItem(item: Omit<LineItem, "amount">): LineItem {
  return {
    ...item,
    amount: Math.round(item.quantity * item.unit_price),
  };
}

export function calculateTotals(
  lineItems: LineItem[],
  discountAmount = 0
) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);

  const taxAmount = lineItems.reduce((sum, item) => {
    return sum + Math.round(item.amount * (item.tax_rate / 100));
  }, 0);

  const total = subtotal + taxAmount - discountAmount;

  return { subtotal, taxAmount, discountAmount, total };
}
