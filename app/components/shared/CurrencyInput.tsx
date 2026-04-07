import { useState, useEffect } from "react";
import { Input } from "~/components/ui/input";
import { CURRENCIES, formatCurrency, type CurrencyCode } from "~/lib/currency";

interface CurrencyInputProps {
  currency: CurrencyCode;
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
}

export function CurrencyInput({ currency, value, onChange, className, placeholder }: CurrencyInputProps) {
  const config = CURRENCIES[currency];
  const [displayValue, setDisplayValue] = useState("");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDisplayValue(value ? formatCurrency(value, currency) : "");
    }
  }, [value, currency, focused]);

  const handleFocus = () => {
    setFocused(true);
    setDisplayValue(value ? String(value / config.divisor) : "");
  };

  const handleBlur = () => {
    setFocused(false);
    const parsed = parseFloat(displayValue.replace(/[^0-9.]/g, ""));
    if (!isNaN(parsed)) {
      onChange(Math.round(parsed * config.divisor));
    }
  };

  return (
    <Input
      className={className}
      placeholder={placeholder ?? `0`}
      value={displayValue}
      onChange={(e) => setDisplayValue(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
}
