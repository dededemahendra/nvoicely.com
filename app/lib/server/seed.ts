import { Client, Databases, ID, Query, Permission, Role } from "node-appwrite";

const DB_ID = process.env.APPWRITE_DATABASE_ID || "main";
const C = {
  INVOICES: "invoices",
  CLIENTS: "clients",
  EXPENSES: "expenses",
  RECURRING_TEMPLATES: "recurring_templates",
  SETTINGS: "settings",
} as const;

function getDb() {
  const endpoint = process.env.APPWRITE_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!endpoint || !projectId || !apiKey) {
    throw new Error(
      "Missing server env: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY"
    );
  }
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return new Databases(client);
}

const now = new Date();
const iso = (d: Date) => d.toISOString();
const day = (offset: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + offset);
  return iso(d);
};

function calc(items: { quantity: number; unit_price: number; tax_rate: number }[], discount = 0) {
  const subtotal = items.reduce((s, i) => s + Math.round(i.quantity * i.unit_price), 0);
  const tax = items.reduce(
    (s, i) => s + Math.round(i.quantity * i.unit_price * (i.tax_rate / 100)),
    0
  );
  return { subtotal, tax, total: subtotal + tax - discount };
}

function line(description: string, quantity: number, unit_price: number, tax_rate = 11) {
  return {
    id: ID.unique(),
    description,
    quantity,
    unit_price,
    tax_rate,
    amount: Math.round(quantity * unit_price),
  };
}

const clientsData = [
  { name: "Nebula Studio", email: "hello@nebula.studio", phone: "+62 811 2345 6789", company: "PT Nebula Kreatif", address_line1: "Jl. Wijaya II No. 14", city: "Jakarta Selatan", state: "DKI Jakarta", postal_code: "12160", country: "Indonesia", tax_id: "02.345.678.9-012.000" },
  { name: "Marlow & Finch", email: "accounts@marlowfinch.co", phone: "+65 6123 4567", company: "Marlow & Finch Pte Ltd", address_line1: "1 Raffles Place, #20-61", city: "Singapore", postal_code: "048616", country: "Singapore" },
  { name: "Harbor North", email: "billing@harbornorth.io", company: "Harbor North LLC", address_line1: "548 Market Street", address_line2: "PMB 72143", city: "San Francisco", state: "CA", postal_code: "94104", country: "United States" },
  { name: "Kopi Rakyat", email: "finance@kopirakyat.id", phone: "+62 812 9988 7766", company: "CV Kopi Rakyat Nusantara", address_line1: "Jl. Dago No. 88", city: "Bandung", country: "Indonesia" },
  { name: "Linden & Co.", email: "pay@lindenco.de", company: "Linden GmbH", address_line1: "Torstraße 140", city: "Berlin", postal_code: "10119", country: "Germany" },
] as const;

const expenseSeeds = [
  { category: "software", description: "Figma annual subscription", amount: 1_980_000, vendor: "Figma", currency: "IDR" as const, offset: -62 },
  { category: "software", description: "GitHub Team", amount: 680_000, vendor: "GitHub", currency: "IDR" as const, offset: -45 },
  { category: "software", description: "Linear workspace", amount: 320_000, vendor: "Linear", currency: "IDR" as const, offset: -30 },
  { category: "meals", description: "Client lunch — Nebula Studio", amount: 485_000, vendor: "Kaum", currency: "IDR" as const, offset: -18 },
  { category: "travel", description: "Grab to client office", amount: 88_000, vendor: "Grab", currency: "IDR" as const, offset: -12 },
  { category: "office", description: "External monitor — LG 27UL500", amount: 4_799_000, vendor: "Tokopedia", currency: "IDR" as const, offset: -54 },
  { category: "utilities", description: "Fiber internet — March", amount: 450_000, vendor: "Biznet", currency: "IDR" as const, offset: -8 },
  { category: "marketing", description: "LinkedIn Premium", amount: 720_000, vendor: "LinkedIn", currency: "IDR" as const, offset: -22 },
  { category: "freelancer", description: "Illustration commission", amount: 3_500_000, vendor: "Rania D.", currency: "IDR" as const, offset: -40 },
  { category: "banking", description: "Wise transfer fee", amount: 62_000, vendor: "Wise", currency: "IDR" as const, offset: -5 },
];

export async function seedUserData(userId: string) {
  if (!userId) throw new Error("userId required");
  const db = getDb();
  const userPerms = [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];

  async function wipe(collection: string) {
    const existing = await db.listDocuments(DB_ID, collection, [
      Query.equal("user_id", userId),
      Query.limit(200),
    ]);
    for (const doc of existing.documents) {
      await db.deleteDocument(DB_ID, collection, doc.$id);
    }
  }

  await wipe(C.INVOICES);
  await wipe(C.CLIENTS);
  await wipe(C.EXPENSES);
  await wipe(C.RECURRING_TEMPLATES);
  await wipe(C.SETTINGS);

  const settings = await db.createDocument(
    DB_ID,
    C.SETTINGS,
    ID.unique(),
    {
      user_id: userId,
      business_name: "Studio Ember",
      business_email: "hello@studioember.co",
      business_phone: "+62 811 0000 1111",
      business_address: "Jl. Senopati No. 42, Jakarta Selatan 12190",
      tax_id: "01.234.567.8-901.000",
      default_currency: "IDR",
      default_tax_rate: 11,
      default_payment_terms: "Payment due within 14 days of invoice date.",
      invoice_prefix: "INV",
      invoice_counter: 0,
      bank_accounts: JSON.stringify([
        { bank_name: "Bank Mandiri", account_name: "Studio Ember", account_number: "123-00-4567890-1", currency: "IDR" },
      ]),
      invoice_footer_notes: "Thank you for partnering with Studio Ember.",
    },
    userPerms
  );

  const clientIds: string[] = [];
  for (const c of clientsData) {
    const doc = await db.createDocument(
      DB_ID,
      C.CLIENTS,
      ID.unique(),
      { ...c, user_id: userId, created_at: iso(now) },
      userPerms
    );
    clientIds.push(doc.$id);
  }

  type Spec = {
    clientIdx: number;
    issueOffset: number;
    dueOffset: number;
    status: "draft" | "sent" | "paid" | "cancelled";
    currency: "IDR" | "USD" | "SGD" | "EUR";
    items: { description: string; quantity: number; unit_price: number; tax_rate?: number }[];
    discount?: number;
  };

  const invoiceSpecs: Spec[] = [
    { clientIdx: 0, issueOffset: -58, dueOffset: -44, status: "paid", currency: "IDR", items: [{ description: "Brand identity — discovery & strategy", quantity: 1, unit_price: 18_000_000 }, { description: "Logo suite (primary + marks)", quantity: 1, unit_price: 12_000_000 }] },
    { clientIdx: 1, issueOffset: -40, dueOffset: -26, status: "paid", currency: "SGD", items: [{ description: "Landing page design + build", quantity: 1, unit_price: 6800 }, { description: "CMS integration", quantity: 1, unit_price: 1400 }] },
    { clientIdx: 2, issueOffset: -22, dueOffset: -8, status: "sent", currency: "USD", items: [{ description: "Product design retainer — March", quantity: 80, unit_price: 95 }] },
    { clientIdx: 3, issueOffset: -14, dueOffset: 0, status: "sent", currency: "IDR", items: [{ description: "Packaging redesign — arabica line", quantity: 1, unit_price: 22_500_000 }, { description: "Print-ready artwork handoff", quantity: 1, unit_price: 3_500_000 }], discount: 1_500_000 },
    { clientIdx: 4, issueOffset: -6, dueOffset: 8, status: "sent", currency: "EUR", items: [{ description: "UX audit — checkout flow", quantity: 1, unit_price: 2400 }, { description: "Research synthesis deck", quantity: 1, unit_price: 900 }] },
    { clientIdx: 0, issueOffset: -2, dueOffset: 12, status: "draft", currency: "IDR", items: [{ description: "Social launch kit — 12 templates", quantity: 1, unit_price: 7_500_000 }] },
    { clientIdx: 1, issueOffset: -70, dueOffset: -56, status: "cancelled", currency: "SGD", items: [{ description: "Scoping workshop", quantity: 1, unit_price: 1200 }] },
  ];

  let counter = 0;
  for (const spec of invoiceSpecs) {
    counter += 1;
    const items = spec.items.map((i) => line(i.description, i.quantity, i.unit_price, i.tax_rate ?? 11));
    const { subtotal, tax, total } = calc(items, spec.discount ?? 0);
    const invoiceNumber = `INV-${String(counter).padStart(4, "0")}`;
    const issue_date = day(spec.issueOffset);
    const due_date = day(spec.dueOffset);

    await db.createDocument(
      DB_ID,
      C.INVOICES,
      ID.unique(),
      {
        user_id: userId,
        client_id: clientIds[spec.clientIdx],
        invoice_number: invoiceNumber,
        status: spec.status,
        issue_date,
        due_date,
        currency: spec.currency,
        exchange_rate_to_idr: 1,
        line_items: JSON.stringify(items),
        subtotal,
        tax_amount: tax,
        discount_amount: spec.discount ?? 0,
        total,
        notes: "",
        payment_terms: "Payment due within 14 days of invoice date.",
        ...(spec.status === "paid" ? { paid_at: day(spec.dueOffset - 2) } : {}),
        ...(spec.status === "sent" || spec.status === "paid" ? { sent_at: day(spec.issueOffset + 1) } : {}),
        created_at: issue_date,
        updated_at: issue_date,
      },
      userPerms
    );
  }

  await db.updateDocument(DB_ID, C.SETTINGS, settings.$id, { invoice_counter: counter });

  for (const e of expenseSeeds) {
    await db.createDocument(
      DB_ID,
      C.EXPENSES,
      ID.unique(),
      {
        user_id: userId,
        date: day(e.offset),
        category: e.category,
        description: e.description,
        amount: e.amount,
        currency: e.currency,
        exchange_rate_to_idr: 1,
        vendor: e.vendor,
        is_tax_deductible: true,
        created_at: day(e.offset),
      },
      userPerms
    );
  }

  const recurringSpecs = [
    { name: "Harbor North — monthly retainer", clientIdx: 2, frequency: "monthly" as const, currency: "USD" as const, next: 9, items: [line("Product design retainer", 80, 95, 0)], active: true },
    { name: "Kopi Rakyat — quarterly creative", clientIdx: 3, frequency: "quarterly" as const, currency: "IDR" as const, next: 28, items: [line("Creative direction & asset production", 1, 15_000_000, 11)], active: true },
    { name: "Linden & Co. — weekly audit", clientIdx: 4, frequency: "weekly" as const, currency: "EUR" as const, next: 3, items: [line("UX audit hours", 10, 120, 0)], active: false },
  ];

  for (const r of recurringSpecs) {
    await db.createDocument(
      DB_ID,
      C.RECURRING_TEMPLATES,
      ID.unique(),
      {
        user_id: userId,
        client_id: clientIds[r.clientIdx],
        name: r.name,
        frequency: r.frequency,
        next_run_date: day(r.next),
        currency: r.currency,
        tax_rate: r.items[0].tax_rate,
        line_items: JSON.stringify(r.items),
        notes: "",
        terms: "Payment due within 14 days.",
        auto_send: false,
        is_active: r.active,
        invoice_count: 0,
        created_at: iso(now),
      },
      userPerms
    );
  }

  return {
    clients: clientsData.length,
    invoices: invoiceSpecs.length,
    expenses: expenseSeeds.length,
    recurring: recurringSpecs.length,
  };
}
