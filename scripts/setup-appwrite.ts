/**
 * Idempotent Appwrite schema setup. Creates the `main` database, all
 * collections, attributes, and indexes used by the app. Safe to re-run —
 * existing resources are detected and skipped.
 *
 * Usage: npm run setup
 *
 * Required env (loaded from .env):
 *   APPWRITE_ENDPOINT
 *   APPWRITE_PROJECT_ID
 *   APPWRITE_API_KEY (with databases.write, collections.write,
 *                     attributes.write, indexes.write scopes)
 */
import "dotenv/config";
import { Client, Databases, Storage, Permission, Role, Compression } from "node-appwrite";

const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY } = process.env;
if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
  console.error("Missing env: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY");
  process.exit(1);
}

const DB_ID = "main";

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const db = new Databases(client);
const storage = new Storage(client);

const isExists = (err: any) =>
  err?.code === 409 || /already exists/i.test(err?.message ?? "");
const isMissing = (err: any) => err?.code === 404;

async function ensureDatabase() {
  try {
    await db.get(DB_ID);
    console.log(`✓ database '${DB_ID}' exists`);
  } catch (err) {
    if (!isMissing(err)) throw err;
    await db.create(DB_ID, "Main");
    console.log(`+ created database '${DB_ID}'`);
  }
}

async function ensureCollection(id: string, name: string) {
  try {
    await db.getCollection(DB_ID, id);
    console.log(`  ✓ collection ${id}`);
  } catch (err) {
    if (!isMissing(err)) throw err;
    await db.createCollection(DB_ID, id, name, [
      Permission.create(Role.users()),
      Permission.read(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ], true /* documentSecurity */);
    console.log(`  + created collection ${id}`);
  }
}

type AttrSpec =
  | { kind: "string"; key: string; size: number; required?: boolean; array?: boolean }
  | { kind: "integer"; key: string; required?: boolean; min?: number; max?: number; default?: number }
  | { kind: "float"; key: string; required?: boolean; default?: number }
  | { kind: "boolean"; key: string; required?: boolean; default?: boolean }
  | { kind: "datetime"; key: string; required?: boolean }
  | { kind: "enum"; key: string; elements: string[]; required?: boolean };

async function ensureAttribute(coll: string, spec: AttrSpec) {
  try {
    switch (spec.kind) {
      case "string":
        await db.createStringAttribute(DB_ID, coll, spec.key, spec.size, spec.required ?? false, undefined, spec.array ?? false);
        break;
      case "integer":
        await db.createIntegerAttribute(DB_ID, coll, spec.key, spec.required ?? false, spec.min, spec.max, spec.default);
        break;
      case "float":
        await db.createFloatAttribute(DB_ID, coll, spec.key, spec.required ?? false, undefined, undefined, spec.default);
        break;
      case "boolean":
        await db.createBooleanAttribute(DB_ID, coll, spec.key, spec.required ?? false, spec.default);
        break;
      case "datetime":
        await db.createDatetimeAttribute(DB_ID, coll, spec.key, spec.required ?? false);
        break;
      case "enum":
        await db.createEnumAttribute(DB_ID, coll, spec.key, spec.elements, spec.required ?? false);
        break;
    }
    console.log(`    + ${spec.key}`);
  } catch (err) {
    if (isExists(err)) return;
    throw err;
  }
}

async function ensureIndex(coll: string, key: string, attrs: string[], type: "key" | "unique" = "key") {
  try {
    await db.createIndex(DB_ID, coll, key, type, attrs);
    console.log(`    + index ${key}`);
  } catch (err) {
    if (isExists(err)) return;
    throw err;
  }
}

// ---------- schema ----------

async function setupClients() {
  await ensureCollection("clients", "Clients");
  const attrs: AttrSpec[] = [
    { kind: "string", key: "user_id", size: 64, required: true },
    { kind: "string", key: "name", size: 255, required: true },
    { kind: "string", key: "email", size: 255, required: true },
    { kind: "string", key: "phone", size: 50 },
    { kind: "string", key: "company", size: 255 },
    { kind: "string", key: "address_line1", size: 255 },
    { kind: "string", key: "address_line2", size: 255 },
    { kind: "string", key: "city", size: 100 },
    { kind: "string", key: "state", size: 100 },
    { kind: "string", key: "postal_code", size: 20 },
    { kind: "string", key: "country", size: 100 },
    { kind: "string", key: "tax_id", size: 100 },
    { kind: "string", key: "notes", size: 2000 },
    { kind: "datetime", key: "created_at", required: true },
  ];
  for (const a of attrs) await ensureAttribute("clients", a);
  await ensureIndex("clients", "by_user", ["user_id"]);
}

async function setupInvoices() {
  await ensureCollection("invoices", "Invoices");
  const attrs: AttrSpec[] = [
    { kind: "string", key: "user_id", size: 64, required: true },
    { kind: "string", key: "client_id", size: 64, required: true },
    { kind: "string", key: "invoice_number", size: 50, required: true },
    { kind: "enum", key: "status", elements: ["draft", "sent", "paid", "overdue", "cancelled"], required: true },
    { kind: "datetime", key: "issue_date", required: true },
    { kind: "datetime", key: "due_date", required: true },
    { kind: "string", key: "currency", size: 10, required: true },
    { kind: "float", key: "exchange_rate_to_idr" },
    { kind: "string", key: "line_items", size: 100000, required: true },
    { kind: "integer", key: "subtotal", required: true },
    { kind: "integer", key: "tax_amount", required: true },
    { kind: "integer", key: "discount_amount" },
    { kind: "integer", key: "total", required: true },
    { kind: "string", key: "notes", size: 5000 },
    { kind: "string", key: "payment_terms", size: 2000 },
    { kind: "datetime", key: "sent_at" },
    { kind: "datetime", key: "paid_at" },
    { kind: "string", key: "recurring_id", size: 64 },
    { kind: "datetime", key: "last_reminder_sent_at" },
    { kind: "integer", key: "reminder_count" },
    { kind: "datetime", key: "created_at", required: true },
    { kind: "datetime", key: "updated_at", required: true },
  ];
  for (const a of attrs) await ensureAttribute("invoices", a);
  await ensureIndex("invoices", "by_user", ["user_id"]);
  await ensureIndex("invoices", "by_status", ["status"]);
  await ensureIndex("invoices", "by_due_date", ["due_date"]);
  await ensureIndex("invoices", "by_client", ["client_id"]);
}

async function setupExpenses() {
  await ensureCollection("expenses", "Expenses");
  const attrs: AttrSpec[] = [
    { kind: "string", key: "user_id", size: 64, required: true },
    { kind: "datetime", key: "date", required: true },
    { kind: "string", key: "category", size: 50, required: true },
    { kind: "string", key: "description", size: 500, required: true },
    { kind: "integer", key: "amount", required: true },
    { kind: "string", key: "currency", size: 10, required: true },
    { kind: "float", key: "exchange_rate_to_idr" },
    { kind: "string", key: "vendor", size: 255 },
    { kind: "boolean", key: "is_tax_deductible" },
    { kind: "string", key: "receipt_file_id", size: 64 },
    { kind: "string", key: "invoice_id", size: 64 },
    { kind: "string", key: "notes", size: 2000 },
    { kind: "datetime", key: "created_at", required: true },
  ];
  for (const a of attrs) await ensureAttribute("expenses", a);
  await ensureIndex("expenses", "by_user", ["user_id"]);
  await ensureIndex("expenses", "by_date", ["date"]);
}

async function setupRecurring() {
  await ensureCollection("recurring_templates", "Recurring Templates");
  const attrs: AttrSpec[] = [
    { kind: "string", key: "user_id", size: 64, required: true },
    { kind: "string", key: "client_id", size: 64, required: true },
    { kind: "string", key: "name", size: 255, required: true },
    { kind: "enum", key: "frequency", elements: ["weekly", "monthly", "quarterly", "yearly"], required: true },
    { kind: "datetime", key: "next_run_date", required: true },
    { kind: "datetime", key: "end_date" },
    { kind: "string", key: "currency", size: 10, required: true },
    { kind: "float", key: "tax_rate" },
    { kind: "string", key: "line_items", size: 100000, required: true },
    { kind: "string", key: "notes", size: 2000 },
    { kind: "string", key: "terms", size: 2000 },
    { kind: "boolean", key: "auto_send" },
    { kind: "boolean", key: "is_active", required: true },
    { kind: "datetime", key: "last_run_date" },
    { kind: "integer", key: "invoice_count" },
    { kind: "datetime", key: "created_at", required: true },
  ];
  for (const a of attrs) await ensureAttribute("recurring_templates", a);
  await ensureIndex("recurring_templates", "by_user", ["user_id"]);
  await ensureIndex("recurring_templates", "by_active_next", ["is_active", "next_run_date"]);
}

async function setupSettings() {
  await ensureCollection("settings", "Settings");
  const attrs: AttrSpec[] = [
    { kind: "string", key: "user_id", size: 64, required: true },
    { kind: "string", key: "business_name", size: 255, required: true },
    { kind: "string", key: "business_email", size: 255 },
    { kind: "string", key: "business_phone", size: 50 },
    { kind: "string", key: "business_address", size: 1000 },
    { kind: "string", key: "tax_id", size: 100 },
    { kind: "string", key: "logo_file_id", size: 64 },
    { kind: "string", key: "default_currency", size: 10, required: true },
    { kind: "float", key: "default_tax_rate" },
    { kind: "string", key: "default_payment_terms", size: 2000 },
    { kind: "string", key: "invoice_prefix", size: 20, required: true },
    { kind: "integer", key: "invoice_counter", required: true },
    { kind: "string", key: "bank_accounts", size: 5000 },
    { kind: "string", key: "invoice_footer_notes", size: 2000 },
  ];
  for (const a of attrs) await ensureAttribute("settings", a);
  await ensureIndex("settings", "by_user", ["user_id"], "unique");
}

async function ensureBucket(
  id: string,
  name: string,
  opts: { maxFileSizeBytes: number; allowedExtensions: string[]; publicRead: boolean }
) {
  try {
    await storage.getBucket(id);
    console.log(`  ✓ bucket ${id}`);
  } catch (err: any) {
    if (err?.code === 403 && /plan/i.test(err?.message ?? "")) {
      console.log(`  ⚠ skipped bucket ${id} (plan limit)`);
      return;
    }
    if (!isMissing(err)) throw err;
    const perms = opts.publicRead
      ? [
          Permission.read(Role.any()),
          Permission.create(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users()),
        ]
      : [
          Permission.read(Role.users()),
          Permission.create(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users()),
        ];
    try {
      await storage.createBucket(
        id,
        name,
        perms,
        true,
        true,
        opts.maxFileSizeBytes,
        opts.allowedExtensions,
        Compression.None,
        false,
        true
      );
      console.log(`  + created bucket ${id}`);
    } catch (createErr: any) {
      if (createErr?.code === 403 && /plan/i.test(createErr?.message ?? "")) {
        console.log(`  ⚠ skipped bucket ${id} (plan limit)`);
        return;
      }
      throw createErr;
    }
  }
}

async function main() {
  console.log(`→ Setting up Appwrite at ${APPWRITE_ENDPOINT}`);
  await ensureDatabase();
  console.log("• collections");
  await setupClients();
  await setupInvoices();
  await setupExpenses();
  await setupRecurring();
  await setupSettings();
  console.log("• storage buckets");
  await ensureBucket("logos", "Logos", {
    maxFileSizeBytes: 2 * 1024 * 1024,
    allowedExtensions: ["jpg", "jpeg", "png", "webp", "svg"],
    publicRead: true,
  });
  await ensureBucket("attachments", "Attachments", {
    maxFileSizeBytes: 10 * 1024 * 1024,
    allowedExtensions: ["pdf", "jpg", "jpeg", "png", "webp"],
    publicRead: false,
  });
  console.log("✓ Setup complete. You can now run `npm run seed` or click 'Load demo data'.");
}

main().catch((err) => {
  console.error("✗ Setup failed:", err);
  process.exit(1);
});
