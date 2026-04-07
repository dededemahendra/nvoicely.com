import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { CURRENCIES, type CurrencyCode } from "~/lib/currency";

interface CurrencySelectProps {
  value: CurrencyCode;
  onValueChange: (value: CurrencyCode) => void;
  disabled?: boolean;
}

export function CurrencySelect({ value, onValueChange, disabled }: CurrencySelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as CurrencyCode)} disabled={disabled}>
      <SelectTrigger className="w-[120px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.values(CURRENCIES).map((c) => (
          <SelectItem key={c.code} value={c.code}>
            {c.symbol} {c.code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
