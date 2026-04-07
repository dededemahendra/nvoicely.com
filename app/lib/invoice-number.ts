export function generateInvoiceNumber(
  prefix: string,
  counter: number,
  year?: number
): string {
  const y = year ?? new Date().getFullYear();
  const padded = String(counter).padStart(4, "0");
  return `${prefix}-${y}-${padded}`;
}
