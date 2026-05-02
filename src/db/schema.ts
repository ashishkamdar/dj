import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  real,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";

// ── Central Tables (no tenant_id) ──────────────────────────────────────

export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  ownerName: text("owner_name").notNull(),
  ownerEmail: text("owner_email").notNull(),
  ownerPhone: text("owner_phone").default(""),
  status: text("status", {
    enum: ["pending", "active", "expired", "suspended"],
  }).notNull().default("pending"),
  subscriptionPlan: text("subscription_plan", {
    enum: ["free", "monthly", "yearly"],
  }).notNull().default("free"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const superAdmins = pgTable("super_admins", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tenantDomains = pgTable("tenant_domains", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  domain: text("domain").notNull().unique(),
  isPrimary: boolean("is_primary").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptionPayments = pgTable("subscription_payments", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  amount: numeric("amount").notNull(),
  date: text("date").notNull(),
  mode: text("mode", { enum: ["cash", "upi", "bank"] }).default("cash"),
  notes: text("notes"),
  recordedBy: integer("recorded_by").references(() => superAdmins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Tenant-Scoped Tables ───────────────────────────────────────────────

export const firms = pgTable("firms", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address").default(""),
  phone: text("phone").default(""),
  email: text("email"),
  logo: text("logo"),
  signature: text("signature").default(""),
  isGstRegistered: boolean("is_gst_registered").default(false),
  gstNumber: text("gst_number"),
  stateCode: text("state_code"),
  cgstPercent: real("cgst_percent").default(0),
  sgstPercent: real("sgst_percent").default(0),
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),
  bankIfsc: text("bank_ifsc"),
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  pin: text("pin").notNull(),
  role: text("role", { enum: ["admin", "staff"] }).default("staff"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  defaultUnit: text("default_unit").default("kg"),
  defaultRate: real("default_rate").default(0),
  hsnCode: text("hsn_code"),
  gstRatePercent: real("gst_rate_percent").default(0),
  category: text("category"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  shopName: text("shop_name").notNull(),
  ownerName: text("owner_name").default(""),
  phone: text("phone").default(""),
  address: text("address").default(""),
  isRecurring: boolean("is_recurring").default(false),
  defaultFirmId: integer("default_firm_id").references(() => firms.id),
  openingBalance: real("opening_balance").default(0),
  gstNumber: text("gst_number"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  firmId: integer("firm_id").notNull().references(() => firms.id),
  billingType: text("billing_type", { enum: ["gst", "non-gst", "catering"] }).notNull(),
  status: text("status", { enum: ["draft", "confirmed", "invoiced"] }).default("draft"),
  notes: text("notes"),
  eventDate: text("event_date"),
  eventName: text("event_name"),
  advancePaid: real("advance_paid").default(0),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: real("quantity").notNull(),
  unit: text("unit").default("kg"),
  rate: real("rate").notNull(),
  amount: real("amount").notNull(),
  itemStatus: text("item_status", { enum: ["received", "cooking", "cooked", "packed"] }).default("received"),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  firmId: integer("firm_id").notNull().references(() => firms.id),
  clientId: integer("client_id").notNull().references(() => clients.id),
  date: text("date").notNull(),
  subtotal: real("subtotal").notNull(),
  cgstAmount: real("cgst_amount").default(0),
  sgstAmount: real("sgst_amount").default(0),
  igstAmount: real("igst_amount").default(0),
  total: real("total").notNull(),
  balanceBf: real("balance_bf").default(0),
  grandTotal: real("grand_total").notNull(),
  size: text("size", { enum: ["A6", "A4"] }).default("A4"),
  pdfPath: text("pdf_path"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  clientId: integer("client_id").notNull().references(() => clients.id),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
  amount: real("amount").notNull(),
  date: text("date").notNull(),
  mode: text("mode", { enum: ["cash", "upi", "bank"] }).default("cash"),
  notes: text("notes"),
  receivedBy: integer("received_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
