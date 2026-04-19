import {
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ── Firms ──────────────────────────────────────────────────────────────────
export const firms = sqliteTable("firms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  address: text("address").default(""),
  phone: text("phone").default(""),
  email: text("email"),
  logo: text("logo"),
  isGstRegistered: integer("is_gst_registered", { mode: "boolean" }).default(false),
  gstNumber: text("gst_number"),
  stateCode: text("state_code"),
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),
  bankIfsc: text("bank_ifsc"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// ── Products ───────────────────────────────────────────────────────────────
export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  defaultUnit: text("default_unit").default("kg"),
  defaultRate: real("default_rate").default(0),
  hsnCode: text("hsn_code"),
  gstRatePercent: real("gst_rate_percent").default(0),
  category: text("category"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// ── Clients ────────────────────────────────────────────────────────────────
export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shopName: text("shop_name").notNull(),
  ownerName: text("owner_name").default(""),
  phone: text("phone").default(""),
  address: text("address").default(""),
  isRecurring: integer("is_recurring", { mode: "boolean" }).default(false),
  defaultFirmId: integer("default_firm_id").references(() => firms.id),
  openingBalance: real("opening_balance").default(0),
  gstNumber: text("gst_number"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// ── Users ──────────────────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  pin: text("pin").notNull(),
  role: text("role", { enum: ["admin", "staff"] }).default("staff"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ── Orders ─────────────────────────────────────────────────────────────────
export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id),
  firmId: integer("firm_id")
    .notNull()
    .references(() => firms.id),
  billingType: text("billing_type", {
    enum: ["gst", "non-gst", "catering"],
  }).notNull(),
  status: text("status", {
    enum: ["draft", "confirmed", "invoiced"],
  }).default("draft"),
  notes: text("notes"),
  eventDate: text("event_date"),
  eventName: text("event_name"),
  advancePaid: real("advance_paid").default(0),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// ── Order Items ────────────────────────────────────────────────────────────
export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  quantity: real("quantity").notNull(),
  unit: text("unit").default("kg"),
  rate: real("rate").notNull(),
  amount: real("amount").notNull(),
  itemStatus: text("item_status", {
    enum: ["received", "cooking", "cooked", "packed"],
  }).default("received"),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// ── Invoices ───────────────────────────────────────────────────────────────
export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceNumber: text("invoice_number").notNull().unique(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),
  firmId: integer("firm_id")
    .notNull()
    .references(() => firms.id),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id),
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
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// ── Payments ───────────────────────────────────────────────────────────────
export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id),
  amount: real("amount").notNull(),
  date: text("date").notNull(),
  mode: text("mode", { enum: ["cash", "upi", "bank"] }).default("cash"),
  notes: text("notes"),
  receivedBy: integer("received_by").references(() => users.id),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});
