export const CURRENCIES = {
  IDR: { code: "IDR", symbol: "Rp", locale: "id-ID", divisor: 1 },
  USD: { code: "USD", symbol: "$", locale: "en-US", divisor: 100 },
  EUR: { code: "EUR", symbol: "\u20ac", locale: "de-DE", divisor: 100 },
  SGD: { code: "SGD", symbol: "S$", locale: "en-SG", divisor: 100 },
  AUD: { code: "AUD", symbol: "A$", locale: "en-AU", divisor: 100 },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const config = CURRENCIES[currency];
  const value = amount / config.divisor;

  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.code,
    minimumFractionDigits: config.divisor === 1 ? 0 : 2,
  }).format(value);
}

export function parseCurrency(value: string, currency: CurrencyCode): number {
  const config = CURRENCIES[currency];
  const num = parseFloat(value.replace(/[^0-9.]/g, ""));
  return Math.round(num * config.divisor);
}
