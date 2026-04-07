export const EXPENSE_CATEGORIES = [
  { value: "software", label: "Software & Tools" },
  { value: "travel", label: "Travel" },
  { value: "office", label: "Office & Supplies" },
  { value: "marketing", label: "Marketing & Ads" },
  { value: "meals", label: "Meals & Entertainment" },
  { value: "utilities", label: "Utilities" },
  { value: "freelancer", label: "Subcontractors" },
  { value: "banking", label: "Banking & Fees" },
  { value: "other", label: "Other" },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["value"];
