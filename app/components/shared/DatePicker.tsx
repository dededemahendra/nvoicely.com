import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";

interface DatePickerProps {
  /** Value as a `yyyy-MM-dd` string (matches the form fields). */
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  id,
  disabled,
}: DatePickerProps) {
  // Parse as local midnight to avoid the date shifting a day across timezones.
  // Slice to date-only so a full ISO string can't produce an invalid date.
  const parsed = value ? new Date(`${value.slice(0, 10)}T00:00:00`) : undefined;
  const date = parsed && !Number.isNaN(parsed.getTime()) ? parsed : undefined;
  const thisYear = new Date().getFullYear();
  const selectedYear = date ? date.getFullYear() : thisYear;
  const minYear = Math.min(thisYear - 5, selectedYear);
  const maxYear = Math.max(thisYear + 5, selectedYear);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd MMM yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            // Ignore deselect (re-click) so a required date field isn't cleared.
            if (d) onChange(format(d, "yyyy-MM-dd"));
          }}
          captionLayout="dropdown"
          startMonth={new Date(minYear, 0)}
          endMonth={new Date(maxYear, 11)}
          defaultMonth={date}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
