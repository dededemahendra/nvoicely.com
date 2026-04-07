export const DB_ID = "main";

export const COLLECTIONS = {
  INVOICES: "invoices",
  CLIENTS: "clients",
  LINE_ITEMS: "line_items",
  EXPENSES: "expenses",
  RECURRING_TEMPLATES: "recurring_templates",
  SETTINGS: "settings",
} as const;

export const BUCKETS = {
  LOGOS: "logos",
  ATTACHMENTS: "attachments",
} as const;

export const FUNCTIONS = {
  SEND_INVOICE_EMAIL: "send-invoice-email",
  PROCESS_RECURRING: "process-recurring",
} as const;
