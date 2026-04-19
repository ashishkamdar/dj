# Deepak's Food Business Management System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first Next.js + SQLite app for Deepak's wholesale food business — calendar-based order entry with automated GST/non-GST/catering invoice PDF generation.

**Architecture:** Next.js 15 App Router with server actions for all mutations. SQLite via better-sqlite3 + Drizzle ORM for data. Cookie-based PIN auth. @react-pdf/renderer for invoice PDFs. Catalyst Tailwind UI components (from `/Users/ashishkamdar/Downloads/Catalyst-tailwind-css-UI-Blocks-634/`) for all UI — adapting their exact Tailwind class patterns into React components. Mobile-first with bottom tab navigation, dark/light theme via next-themes.

**Tech Stack:** Next.js 15, TypeScript, SQLite/better-sqlite3, Drizzle ORM, Tailwind CSS 4, @heroicons/react, next-themes, @react-pdf/renderer, next-intl

**Catalyst UI Reference:** `/Users/ashishkamdar/Downloads/Catalyst-tailwind-css-UI-Blocks-634/` — 634 components. Use the Tailwind class patterns from these components extensively. Key references:
- **Sign-in form:** `react/ui-blocks/application-ui/forms/sign-in-forms/simple-card.jsx`
- **Sidebar nav:** `react/ui-blocks/application-ui/page-examples/home-screens/sidebar.jsx`
- **Calendar:** `react/ui-blocks/application-ui/data-display/calendars/month-view.jsx`
- **Tables:** `react/ui-blocks/application-ui/lists/tables/simple-in-card.jsx`
- **Stats cards:** `react/ui-blocks/application-ui/data-display/stats/simple-in-cards.jsx`
- **Tabs:** `react/ui-blocks/application-ui/navigation/tabs/simple.jsx`
- **Badges:** `react/ui-blocks/application-ui/elements/badges/flat.jsx`
- **Buttons:** `react/ui-blocks/application-ui/elements/buttons/primary-buttons.jsx`
- **Input groups:** `react/ui-blocks/application-ui/forms/input-groups/input-with-label.jsx`
- **Modal dialogs:** `react/ui-blocks/application-ui/overlays/modal-dialogs/simple-alert.jsx`
- **Stacked lists:** `react/ui-blocks/application-ui/lists/stacked-lists/simple.jsx`
- **Cards:** `react/ui-blocks/application-ui/layout/cards/basic-card.jsx`
- **Drawers:** `react/ui-blocks/application-ui/overlays/drawers/empty.jsx`
- **Notifications:** `react/ui-blocks/application-ui/overlays/notifications/simple.jsx`
- **Empty states:** `react/ui-blocks/application-ui/feedback/empty-states/simple.jsx`
- **Dropdowns:** `react/ui-blocks/application-ui/elements/dropdowns/simple.jsx`
- **Section headings:** `react/ui-blocks/application-ui/headings/section-headings/with-action.jsx`
- **Description lists:** `react/ui-blocks/application-ui/data-display/description-lists/left-aligned-in-card.jsx`
- **Progress bars:** `react/ui-blocks/application-ui/navigation/progress-bars/simple.jsx`
- **Alerts:** `react/ui-blocks/application-ui/feedback/alerts/with-description.jsx`
- **Form layouts:** `react/ui-blocks/application-ui/forms/form-layouts/stacked.jsx`
- **Select menus:** `react/ui-blocks/application-ui/forms/select-menus/simple-native.jsx`
- **Toggles:** `react/ui-blocks/application-ui/forms/toggles/simple-toggle.jsx`
- **Dividers:** `react/ui-blocks/application-ui/layout/dividers/with-label.jsx`
- **Feeds:** `react/ui-blocks/application-ui/lists/feeds/simple-with-icons.jsx`
- **Page headings:** `react/ui-blocks/application-ui/headings/page-headings/with-meta-and-actions.jsx`
- **Pagination:** `react/ui-blocks/application-ui/navigation/pagination/simple-card-footer.jsx`

When implementing any UI, first read the corresponding Catalyst component file above and adapt its exact Tailwind classes (especially the `dark:` variants) into your React/TSX code. This ensures visual consistency with the premium Catalyst design system.

---

## File Structure

```
src/
  app/
    layout.tsx                          — Root layout: html lang, body, ThemeProvider, fonts
    globals.css                         — Tailwind imports, custom CSS vars
    (auth)/
      login/
        page.tsx                        — PIN login screen with number pad
    (app)/
      layout.tsx                        — Authenticated layout: session check, bottom nav, sidebar on desktop
      calendar/
        page.tsx                        — Monthly calendar grid (home screen)
        [date]/
          page.tsx                      — Day view: orders for selected date
      orders/
        new/
          page.tsx                      — New order form
        [id]/
          page.tsx                      — Order detail view
          invoice/
            page.tsx                    — Invoice preview & generation
      clients/
        page.tsx                        — Client list with search/filter
        new/
          page.tsx                      — Add client form
        [id]/
          page.tsx                      — Client detail & ledger
          edit/
            page.tsx                    — Edit client form
      products/
        page.tsx                        — Product list with search
        new/
          page.tsx                      — Add product form
        [id]/
          edit/
            page.tsx                    — Edit product form
      analytics/
        page.tsx                        — Analytics dashboard with tabs
      settings/
        page.tsx                        — Settings hub
        firms/
          page.tsx                      — Firm list
          new/
            page.tsx                    — Add firm
          [id]/
            edit/
              page.tsx                  — Edit firm
        users/
          page.tsx                      — User management
        backup/
          page.tsx                      — Backup & restore
        preferences/
          page.tsx                      — Invoice preferences, language
    api/
      auth/
        login/
          route.ts                      — POST: verify PIN, set session cookie
        logout/
          route.ts                      — POST: clear session cookie
      invoices/
        [id]/
          pdf/
            route.ts                    — GET: generate and serve PDF
      backup/
        download/
          route.ts                      — GET: download SQLite DB file
        upload/
          route.ts                      — POST: upload and restore DB file
        list/
          route.ts                      — GET: list server-side backups
  components/
    ui/
      button.tsx                        — Primary, secondary, soft button variants
      input.tsx                         — Input with label, error state
      select.tsx                        — Native select with label
      badge.tsx                         — Status badges with color dots
      card.tsx                          — Card wrapper with header/footer variants
      modal.tsx                         — Modal dialog with backdrop
      drawer.tsx                        — Slide-over drawer panel
      notification.tsx                  — Toast notification
      empty-state.tsx                   — Empty state with icon and action
      dropdown.tsx                      — Dropdown menu
      toggle.tsx                        — Toggle switch
      spinner.tsx                       — Loading spinner
      search-input.tsx                  — Search input with icon
      stat-card.tsx                     — Stats display card
      table.tsx                         — Table with header, rows, responsive
      section-heading.tsx               — Section title with optional action
      page-heading.tsx                  — Page title with breadcrumb and actions
      tabs.tsx                          — Tab navigation component
      pagination.tsx                    — Pagination controls
    layout/
      bottom-nav.tsx                    — Mobile bottom tab navigation (4 tabs)
      sidebar.tsx                       — Desktop sidebar navigation
      theme-toggle.tsx                  — Dark/light theme switcher
    calendar/
      calendar-grid.tsx                 — Monthly calendar grid with order dots
      day-header.tsx                    — Day view header with date and actions
    orders/
      order-form.tsx                    — Order entry form with line items
      order-item-row.tsx                — Single line item row in order form
      order-card.tsx                    — Order summary card for day view
      order-status-updater.tsx          — Staff status update buttons
    invoices/
      invoice-preview.tsx               — On-screen invoice preview
      pdf-templates/
        non-gst-invoice.tsx             — @react-pdf Non-GST template
        gst-invoice.tsx                 — @react-pdf GST Tax Invoice template
        catering-invoice.tsx            — @react-pdf Catering Invoice template
    clients/
      client-card.tsx                   — Client summary card for list view
      ledger-table.tsx                  — Client ledger entries table
      payment-form.tsx                  — Add payment modal form
    analytics/
      daily-summary.tsx                 — Daily stats overview
      monthly-chart.tsx                 — Monthly revenue bar chart
      top-products.tsx                  — Top products table
      top-clients.tsx                   — Top clients table
  db/
    schema.ts                           — Drizzle schema: all tables
    index.ts                            — DB connection singleton
    migrate.ts                          — Run migrations script
    seed.ts                             — Seed initial data
    migrations/                         — Generated migration files
  lib/
    auth.ts                             — PIN hashing (bcrypt), session cookie helpers
    session.ts                          — getSession(), requireAuth(), requireAdmin()
    financial-year.ts                   — getCurrentFY(), getFYFromDate(), getFYRange()
    invoice-number.ts                   — generateInvoiceNumber() per firm per FY
    ledger.ts                           — getClientBalance(), getClientLedger()
    pdf.ts                              — renderInvoicePDF() dispatcher
    amount-words.ts                     — Convert number to Indian English words
    utils.ts                            — classNames(), formatCurrency(), formatDate()
  actions/
    auth.ts                             — login(), logout() server actions
    orders.ts                           — createOrder(), updateOrder(), deleteOrder()
    order-items.ts                      — updateItemStatus()
    clients.ts                          — createClient(), updateClient()
    products.ts                         — createProduct(), updateProduct()
    firms.ts                            — createFirm(), updateFirm()
    users.ts                            — createUser(), updateUser(), resetPin()
    invoices.ts                         — createInvoice(), getInvoice()
    payments.ts                         — createPayment()
    analytics.ts                        — getDailySummary(), getMonthlySummary(), etc.
    backup.ts                           — triggerBackup(), restoreBackup()
  messages/
    en.json                             — English translations
    hi.json                             — Hindi translations
  middleware.ts                         — Auth middleware: redirect to login if no session
drizzle.config.ts                       — Drizzle config pointing to SQLite
tailwind.config.ts                      — Tailwind config with dark mode class strategy
next.config.ts                          — Next.js config with next-intl
package.json
tsconfig.json
```

---

## Phase 1: Project Foundation

### Task 1: Scaffold Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`

- [ ] **Step 1: Create Next.js project with TypeScript and Tailwind**

Run:
```bash
cd /Users/ashishkamdar/Projects/deepak_jaiswal
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes
```

Expected: Project scaffolded with `src/app/` directory, `package.json`, `tsconfig.json`, `tailwind.config.ts`

- [ ] **Step 2: Install core dependencies**

Run:
```bash
npm install better-sqlite3 drizzle-orm @heroicons/react next-themes bcryptjs
npm install -D drizzle-kit @types/better-sqlite3 @types/bcryptjs
```

Expected: All packages installed successfully

- [ ] **Step 3: Configure Tailwind for dark mode**

Update `tailwind.config.ts`:
```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 4: Set up root layout with ThemeProvider**

Update `src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DJ Foods",
  description: "Food Business Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} h-full bg-white dark:bg-gray-900`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Update globals.css for Tailwind v4**

Replace `src/app/globals.css` with:
```css
@import "tailwindcss";
```

- [ ] **Step 6: Create a minimal home page to verify setup**

Update `src/app/page.tsx`:
```tsx
export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        DJ Foods
      </h1>
    </div>
  );
}
```

- [ ] **Step 7: Verify dev server runs**

Run: `npm run dev`

Expected: Server starts at localhost:3000, page shows "DJ Foods" text

- [ ] **Step 8: Commit**

```bash
git add src/ package.json package-lock.json tsconfig.json tailwind.config.ts next.config.ts next-env.d.ts eslint.config.mjs .gitignore
git commit -m "feat: scaffold Next.js 15 project with Tailwind and dark mode"
```

---

### Task 2: Database Schema with Drizzle ORM

**Files:**
- Create: `src/db/schema.ts`, `src/db/index.ts`, `drizzle.config.ts`

- [ ] **Step 1: Create Drizzle config**

Create `drizzle.config.ts`:
```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/dj.db",
  },
});
```

- [ ] **Step 2: Create the complete database schema**

Create `src/db/schema.ts`:
```ts
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const firms = sqliteTable("firms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  address: text("address").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").default(""),
  logo: text("logo").default(""),
  isGstRegistered: integer("is_gst_registered", { mode: "boolean" }).notNull().default(false),
  gstNumber: text("gst_number").default(""),
  stateCode: text("state_code").default(""),
  bankName: text("bank_name").default(""),
  bankAccount: text("bank_account").default(""),
  bankIfsc: text("bank_ifsc").default(""),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  defaultUnit: text("default_unit").notNull().default("kg"),
  defaultRate: real("default_rate").notNull().default(0),
  hsnCode: text("hsn_code").default(""),
  gstRatePercent: real("gst_rate_percent").notNull().default(0),
  category: text("category").default(""),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shopName: text("shop_name").notNull(),
  ownerName: text("owner_name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  isRecurring: integer("is_recurring", { mode: "boolean" }).notNull().default(false),
  defaultFirmId: integer("default_firm_id").references(() => firms.id),
  openingBalance: real("opening_balance").notNull().default(0),
  gstNumber: text("gst_number").default(""),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  pin: text("pin").notNull(),
  role: text("role", { enum: ["admin", "staff"] }).notNull().default("staff"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  firmId: integer("firm_id").notNull().references(() => firms.id),
  billingType: text("billing_type", { enum: ["gst", "non-gst", "catering"] }).notNull(),
  status: text("status", { enum: ["draft", "confirmed", "invoiced"] }).notNull().default("draft"),
  notes: text("notes").default(""),
  eventDate: text("event_date"),
  eventName: text("event_name"),
  advancePaid: real("advance_paid").default(0),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull().default("kg"),
  rate: real("rate").notNull(),
  amount: real("amount").notNull(),
  itemStatus: text("item_status", { enum: ["received", "cooking", "cooked", "packed"] }).notNull().default("received"),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceNumber: text("invoice_number").notNull().unique(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  firmId: integer("firm_id").notNull().references(() => firms.id),
  clientId: integer("client_id").notNull().references(() => clients.id),
  date: text("date").notNull(),
  subtotal: real("subtotal").notNull(),
  cgstAmount: real("cgst_amount").notNull().default(0),
  sgstAmount: real("sgst_amount").notNull().default(0),
  igstAmount: real("igst_amount").notNull().default(0),
  total: real("total").notNull(),
  balanceBf: real("balance_bf").notNull().default(0),
  grandTotal: real("grand_total").notNull(),
  size: text("size", { enum: ["A6", "A4"] }).notNull().default("A4"),
  pdfPath: text("pdf_path").default(""),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull().references(() => clients.id),
  amount: real("amount").notNull(),
  date: text("date").notNull(),
  mode: text("mode", { enum: ["cash", "upi", "bank"] }).notNull().default("cash"),
  notes: text("notes").default(""),
  receivedBy: integer("received_by").references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});
```

- [ ] **Step 3: Create DB connection singleton**

Create `src/db/index.ts`:
```ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(path.join(dataDir, "dj.db"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { schema };
```

- [ ] **Step 4: Generate and run initial migration**

Run:
```bash
mkdir -p data
npx drizzle-kit generate
npx drizzle-kit push
```

Expected: Migration files created in `src/db/migrations/`, database file created at `data/dj.db`

- [ ] **Step 5: Add data/ to .gitignore**

Append to `.gitignore`:
```
data/
```

- [ ] **Step 6: Commit**

```bash
git add src/db/ drizzle.config.ts .gitignore
git commit -m "feat: add Drizzle ORM schema for all tables (firms, products, clients, users, orders, invoices, payments)"
```

---

### Task 3: Seed Data

**Files:**
- Create: `src/db/seed.ts`

- [ ] **Step 1: Create seed script**

Create `src/db/seed.ts`:
```ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { hashSync } from "bcryptjs";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(path.join(dataDir, "dj.db"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

async function seed() {
  console.log("Seeding database...");

  // Check if already seeded
  const existingUsers = db.select().from(schema.users).all();
  if (existingUsers.length > 0) {
    console.log("Database already seeded. Skipping.");
    return;
  }

  // Seed default firm
  const [firm] = db
    .insert(schema.firms)
    .values({
      name: "DJ Foods",
      address: "Update in settings",
      phone: "Update in settings",
      isGstRegistered: false,
    })
    .returning();
  console.log(`Created firm: ${firm.name}`);

  // Seed admin user (Deepak) with default PIN 1234
  const hashedPin = hashSync("1234", 10);
  const [admin] = db
    .insert(schema.users)
    .values({
      name: "Deepak",
      pin: hashedPin,
      role: "admin",
    })
    .returning();
  console.log(`Created admin user: ${admin.name} (default PIN: 1234)`);

  // Seed top products
  const productData = [
    { name: "Dhokla", defaultUnit: "kg", defaultRate: 180, category: "Snacks" },
    { name: "Patra", defaultUnit: "kg", defaultRate: 180, category: "Snacks" },
    { name: "Khandvi", defaultUnit: "kg", defaultRate: 180, category: "Snacks" },
    { name: "Kachori", defaultUnit: "kg", defaultRate: 200, category: "Snacks" },
    { name: "White Dhokla", defaultUnit: "kg", defaultRate: 180, category: "Snacks" },
  ];

  for (const product of productData) {
    const [p] = db.insert(schema.products).values(product).returning();
    console.log(`Created product: ${p.name} @ ₹${p.defaultRate}/${p.defaultUnit}`);
  }

  console.log("\nSeed complete!");
  console.log("Default admin PIN: 1234 (change this in settings!)");
}

seed().catch(console.error);
```

- [ ] **Step 2: Add seed script to package.json**

Add to `package.json` scripts:
```json
"db:seed": "npx tsx src/db/seed.ts",
"db:push": "npx drizzle-kit push",
"db:generate": "npx drizzle-kit generate",
"db:studio": "npx drizzle-kit studio"
```

- [ ] **Step 3: Install tsx for running TS scripts**

Run: `npm install -D tsx`

- [ ] **Step 4: Run the seed**

Run: `npm run db:push && npm run db:seed`

Expected: Output showing created firm, admin user, and 5 products

- [ ] **Step 5: Commit**

```bash
git add src/db/seed.ts package.json
git commit -m "feat: add seed script with default firm, admin user, and top products"
```

---

### Task 4: Utility Functions

**Files:**
- Create: `src/lib/utils.ts`, `src/lib/financial-year.ts`, `src/lib/amount-words.ts`

- [ ] **Step 1: Create utility helpers**

Create `src/lib/utils.ts`:
```ts
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
}

export function todayString(): string {
  return new Date().toISOString().split("T")[0];
}
```

- [ ] **Step 2: Create financial year helpers**

Create `src/lib/financial-year.ts`:
```ts
export interface FYRange {
  start: string; // "2025-04-01"
  end: string;   // "2026-03-31"
  label: string; // "2025-26"
}

export function getCurrentFY(): FYRange {
  return getFYFromDate(new Date());
}

export function getFYFromDate(date: Date): FYRange {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed

  // FY starts in April (month 3)
  const fyStartYear = month >= 3 ? year : year - 1;
  const fyEndYear = fyStartYear + 1;

  return {
    start: `${fyStartYear}-04-01`,
    end: `${fyEndYear}-03-31`,
    label: `${fyStartYear}-${String(fyEndYear).slice(2)}`,
  };
}

export function getFYRange(fyLabel: string): FYRange {
  // Parse "2025-26" → { start: "2025-04-01", end: "2026-03-31" }
  const [startYearStr] = fyLabel.split("-");
  const startYear = parseInt(startYearStr, 10);
  const endYear = startYear + 1;

  return {
    start: `${startYear}-04-01`,
    end: `${endYear}-03-31`,
    label: fyLabel,
  };
}
```

- [ ] **Step 3: Create amount-to-words converter**

Create `src/lib/amount-words.ts`:
```ts
const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
  "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function convertHundreds(num: number): string {
  let result = "";
  if (num >= 100) {
    result += ones[Math.floor(num / 100)] + " Hundred";
    num %= 100;
    if (num > 0) result += " and ";
  }
  if (num >= 20) {
    result += tens[Math.floor(num / 10)];
    num %= 10;
    if (num > 0) result += " " + ones[num];
  } else if (num > 0) {
    result += ones[num];
  }
  return result;
}

export function amountToWords(amount: number): string {
  if (amount === 0) return "Zero Rupees Only";

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let result = "";
  // Indian numbering: Crore, Lakh, Thousand, Hundred
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = rupees % 1000;

  if (crore > 0) result += convertHundreds(crore) + " Crore ";
  if (lakh > 0) result += convertHundreds(lakh) + " Lakh ";
  if (thousand > 0) result += convertHundreds(thousand) + " Thousand ";
  if (hundred > 0) result += convertHundreds(hundred);

  result = result.trim() + " Rupees";

  if (paise > 0) {
    result += " and " + convertHundreds(paise) + " Paise";
  }

  return result + " Only";
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/
git commit -m "feat: add utility functions (currency, dates, FY helpers, amount-to-words)"
```

---

### Task 5: Authentication — PIN Login

**Files:**
- Create: `src/lib/auth.ts`, `src/lib/session.ts`, `src/actions/auth.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/logout/route.ts`, `src/middleware.ts`

- [ ] **Step 1: Create auth helpers**

Create `src/lib/auth.ts`:
```ts
import { compareSync, hashSync } from "bcryptjs";

export function hashPin(pin: string): string {
  return hashSync(pin, 10);
}

export function verifyPin(pin: string, hash: string): boolean {
  return compareSync(pin, hash);
}
```

- [ ] **Step 2: Create session management**

Create `src/lib/session.ts`:
```ts
import { cookies } from "next/headers";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "dj-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

interface SessionUser {
  id: number;
  name: string;
  role: "admin" | "staff";
}

export async function setSession(userId: number): Promise<void> {
  const cookieStore = await cookies();
  // Simple session: store user ID (for a 10-user app, this is sufficient)
  const sessionData = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString("base64");
  cookieStore.set(SESSION_COOKIE, sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE);
  if (!cookie?.value) return null;

  try {
    const { userId } = JSON.parse(Buffer.from(cookie.value, "base64").toString());
    const user = db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        role: schema.users.role,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .get();

    if (!user || !db.select().from(schema.users).where(eq(schema.users.id, userId)).get()?.isActive) {
      return null;
    }

    return user as SessionUser;
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireAuth();
  if (session.role !== "admin") redirect("/calendar");
  return session;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
```

- [ ] **Step 3: Create login server action**

Create `src/actions/auth.ts`:
```ts
"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { verifyPin } from "@/lib/auth";
import { setSession, clearSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function loginAction(pin: string): Promise<{ error?: string }> {
  // Find user by checking PIN against all active users
  const activeUsers = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.isActive, true))
    .all();

  for (const user of activeUsers) {
    if (verifyPin(pin, user.pin)) {
      await setSession(user.id);
      redirect("/calendar");
    }
  }

  return { error: "Invalid PIN" };
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/login");
}
```

- [ ] **Step 4: Create auth middleware**

Create `src/middleware.ts`:
```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths
  if (pathname === "/login" || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Check for session cookie
  const session = request.cookies.get("dj-session");
  if (!session?.value) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/lib/session.ts src/actions/auth.ts src/middleware.ts
git commit -m "feat: add PIN-based auth with session cookies and middleware"
```

---

### Task 6: PIN Login Screen

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/layout.tsx`

Reference Catalyst component: `react/ui-blocks/application-ui/forms/sign-in-forms/simple-card.jsx` for styling patterns.

- [ ] **Step 1: Create auth layout**

Create `src/app/(auth)/layout.tsx`:
```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create PIN login page with number pad**

Create `src/app/(auth)/login/page.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { loginAction } from "@/actions/auth";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleDigit(digit: string) {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      setError("");
    }
  }

  function handleBackspace() {
    setPin((prev) => prev.slice(0, -1));
    setError("");
  }

  function handleSubmit() {
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }
    startTransition(async () => {
      const result = await loginAction(pin);
      if (result?.error) {
        setError(result.error);
        setPin("");
      }
    });
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          DJ Foods
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Enter your PIN to continue
        </p>
      </div>

      {/* PIN dots */}
      <div className="flex justify-center gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`size-4 rounded-full transition-all duration-150 ${
              i < pin.length
                ? "bg-indigo-600 dark:bg-indigo-500 scale-110"
                : "bg-gray-200 dark:bg-white/10"
            }`}
          />
        ))}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-center text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => handleDigit(digit)}
            disabled={isPending}
            className="flex h-16 items-center justify-center rounded-xl bg-gray-50 text-2xl font-semibold text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 transition-colors hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:hover:bg-white/10 dark:active:bg-white/15"
          >
            {digit}
          </button>
        ))}
        <button
          type="button"
          onClick={handleBackspace}
          disabled={isPending}
          className="flex h-16 items-center justify-center rounded-xl bg-gray-50 text-lg font-medium text-gray-500 shadow-xs outline-1 -outline-offset-1 outline-gray-300 transition-colors hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 dark:bg-white/5 dark:text-gray-400 dark:outline-white/10 dark:hover:bg-white/10 dark:active:bg-white/15"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => handleDigit("0")}
          disabled={isPending}
          className="flex h-16 items-center justify-center rounded-xl bg-gray-50 text-2xl font-semibold text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 transition-colors hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:hover:bg-white/10 dark:active:bg-white/15"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || pin.length < 4}
          className="flex h-16 items-center justify-center rounded-xl bg-indigo-600 text-lg font-semibold text-white shadow-xs transition-colors hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:active:bg-indigo-600"
        >
          {isPending ? "..." : "→"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update root page to redirect**

Update `src/app/page.tsx`:
```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/calendar");
}
```

- [ ] **Step 4: Verify login flow works**

Run: `npm run dev`

Navigate to `localhost:3000/login`. Enter PIN 1234. Should redirect to `/calendar` (which will 404 for now — that's expected).

- [ ] **Step 5: Commit**

```bash
git add src/app/
git commit -m "feat: add PIN login screen with number pad and session auth"
```

---

### Task 7: App Shell — Bottom Navigation & Sidebar Layout

**Files:**
- Create: `src/app/(app)/layout.tsx`, `src/components/layout/bottom-nav.tsx`, `src/components/layout/sidebar.tsx`, `src/components/layout/theme-toggle.tsx`

Reference Catalyst components:
- Sidebar: `react/ui-blocks/application-ui/page-examples/home-screens/sidebar.jsx`
- Tabs: `react/ui-blocks/application-ui/navigation/tabs/simple.jsx`

- [ ] **Step 1: Create theme toggle component**

Create `src/components/layout/theme-toggle.tsx`:
```tsx
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="size-6" />;

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="rounded-md p-1.5 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-300"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <SunIcon className="size-5" />
      ) : (
        <MoonIcon className="size-5" />
      )}
    </button>
  );
}
```

- [ ] **Step 2: Create bottom navigation**

Create `src/components/layout/bottom-nav.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  CalendarDaysIcon,
  UserGroupIcon,
  CubeIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/24/outline";
import {
  CalendarDaysIcon as CalendarDaysSolid,
  UserGroupIcon as UserGroupSolid,
  CubeIcon as CubeSolid,
  EllipsisHorizontalIcon as EllipsisSolid,
} from "@heroicons/react/24/solid";

const tabs = [
  { name: "Calendar", href: "/calendar", icon: CalendarDaysIcon, activeIcon: CalendarDaysSolid },
  { name: "Clients", href: "/clients", icon: UserGroupIcon, activeIcon: UserGroupSolid },
  { name: "Products", href: "/products", icon: CubeIcon, activeIcon: CubeSolid },
  { name: "More", href: "/settings", icon: EllipsisHorizontalIcon, activeIcon: EllipsisSolid },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white pb-safe dark:border-white/10 dark:bg-gray-900 xl:hidden">
      <div className="flex h-16 items-center justify-around">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = isActive ? tab.activeIcon : tab.icon;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              )}
            >
              <Icon className="size-6" />
              <span>{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Create desktop sidebar**

Create `src/components/layout/sidebar.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { logoutAction } from "@/actions/auth";
import {
  CalendarDaysIcon,
  UserGroupIcon,
  CubeIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/outline";

const navigation = [
  { name: "Calendar", href: "/calendar", icon: CalendarDaysIcon },
  { name: "Clients", href: "/clients", icon: UserGroupIcon },
  { name: "Products", href: "/products", icon: CubeIcon },
  { name: "Analytics", href: "/analytics", icon: ChartBarIcon },
  { name: "Settings", href: "/settings", icon: Cog6ToothIcon },
];

interface SidebarProps {
  userName: string;
  userRole: string;
}

export function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="hidden xl:fixed xl:inset-y-0 xl:z-50 xl:flex xl:w-64 xl:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-gray-50 px-6 dark:border-white/10 dark:bg-gray-900">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white dark:bg-indigo-500">
            DJ
          </div>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            DJ Foods
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold",
                          isActive
                            ? "bg-gray-100 text-indigo-600 dark:bg-white/5 dark:text-white"
                            : "text-gray-700 hover:bg-gray-100 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "size-6 shrink-0",
                            isActive
                              ? "text-indigo-600 dark:text-white"
                              : "text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white"
                          )}
                        />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>

            {/* Bottom section */}
            <li className="-mx-2 mt-auto mb-4 space-y-2">
              <div className="flex items-center justify-between px-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {userName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {userRole}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <ThemeToggle />
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className="rounded-md p-1.5 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-300"
                      aria-label="Logout"
                    >
                      <ArrowRightStartOnRectangleIcon className="size-5" />
                    </button>
                  </form>
                </div>
              </div>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create authenticated app layout**

Create `src/app/(app)/layout.tsx`:
```tsx
import { requireAuth } from "@/lib/session";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Sidebar userName={user.name} userRole={user.role} />

      {/* Main content area */}
      <main className="pb-20 xl:pl-64 xl:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 5: Create placeholder calendar page**

Create `src/app/(app)/calendar/page.tsx`:
```tsx
import { requireAuth } from "@/lib/session";

export default async function CalendarPage() {
  const user = await requireAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Calendar
      </h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Welcome, {user.name}! Calendar view coming next.
      </p>
    </div>
  );
}
```

- [ ] **Step 6: Verify the full login → app shell flow**

Run: `npm run dev`

1. Go to `localhost:3000` → should redirect to `/login`
2. Enter PIN `1234` → should redirect to `/calendar`
3. Verify bottom nav shows on mobile viewport
4. Verify sidebar shows on desktop viewport (≥1280px)
5. Verify dark/light toggle works

- [ ] **Step 7: Commit**

```bash
git add src/components/ src/app/
git commit -m "feat: add app shell with mobile bottom nav, desktop sidebar, and theme toggle"
```

---

## Phase 2: Core Data Management (Products & Clients)

### Task 8: Reusable UI Components

**Files:**
- Create: `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/card.tsx`, `src/components/ui/empty-state.tsx`, `src/components/ui/section-heading.tsx`, `src/components/ui/modal.tsx`, `src/components/ui/search-input.tsx`, `src/components/ui/select.tsx`, `src/components/ui/spinner.tsx`, `src/components/ui/stat-card.tsx`, `src/components/ui/toggle.tsx`, `src/components/ui/notification.tsx`

Reference the Catalyst files listed in the header for exact Tailwind class patterns. Read each referenced file before implementing its component.

- [ ] **Step 1: Create button component**

Create `src/components/ui/button.tsx`:
```tsx
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "soft" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-semibold shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
          // Size
          size === "sm" && "rounded-md px-2.5 py-1.5 text-xs",
          size === "md" && "rounded-md px-3 py-2 text-sm",
          size === "lg" && "rounded-md px-4 py-2.5 text-sm",
          // Variants — matching Catalyst primary-buttons.jsx patterns
          variant === "primary" &&
            "bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500",
          variant === "secondary" &&
            "bg-white text-gray-900 inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20",
          variant === "soft" &&
            "bg-indigo-50 text-indigo-600 shadow-none hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20",
          variant === "danger" &&
            "bg-red-600 text-white hover:bg-red-500 focus-visible:outline-red-600 dark:bg-red-500 dark:shadow-none dark:hover:bg-red-400 dark:focus-visible:outline-red-500",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
```

- [ ] **Step 2: Create input component**

Create `src/components/ui/input.tsx`:
```tsx
import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm/6 font-medium text-gray-900 dark:text-gray-200"
          >
            {label}
          </label>
        )}
        <div className={label ? "mt-2" : ""}>
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500",
              error && "outline-red-500 focus:outline-red-600 dark:outline-red-400 dark:focus:outline-red-500",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
```

- [ ] **Step 3: Create select component**

Create `src/components/ui/select.tsx`:
```tsx
import { cn } from "@/lib/utils";
import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, id, ...props }, ref) => {
    const selectId = id || props.name;
    return (
      <div>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm/6 font-medium text-gray-900 dark:text-gray-200"
          >
            {label}
          </label>
        )}
        <div className={label ? "mt-2" : ""}>
          <select
            ref={ref}
            id={selectId}
            className={cn(
              "block w-full rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:*:bg-gray-800 dark:focus:outline-indigo-500",
              error && "outline-red-500 dark:outline-red-400",
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";
```

- [ ] **Step 4: Create badge component**

Create `src/components/ui/badge.tsx`:
```tsx
import { cn } from "@/lib/utils";

type BadgeColor = "gray" | "red" | "yellow" | "green" | "blue" | "indigo" | "purple";

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  className?: string;
}

const dotColors: Record<BadgeColor, string> = {
  gray: "fill-gray-500 dark:fill-gray-400",
  red: "fill-red-500 dark:fill-red-400",
  yellow: "fill-yellow-500 dark:fill-yellow-400",
  green: "fill-green-500 dark:fill-green-400",
  blue: "fill-blue-500 dark:fill-blue-400",
  indigo: "fill-indigo-500 dark:fill-indigo-400",
  purple: "fill-purple-500 dark:fill-purple-400",
};

export function Badge({ children, color = "gray", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-900 inset-ring inset-ring-gray-200 dark:text-white dark:inset-ring-white/10",
        className
      )}
    >
      <svg viewBox="0 0 6 6" aria-hidden="true" className={cn("size-1.5", dotColors[color])}>
        <circle r={3} cx={3} cy={3} />
      </svg>
      {children}
    </span>
  );
}
```

- [ ] **Step 5: Create card, empty-state, section-heading, search-input, modal, stat-card, toggle, spinner, notification components**

Create `src/components/ui/card.tsx`:
```tsx
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg bg-white shadow-sm outline-1 outline-black/5 dark:bg-gray-800/50 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn("border-b border-gray-200 px-4 py-5 sm:px-6 dark:border-white/10", className)}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: CardProps) {
  return (
    <div className={cn("px-4 py-5 sm:px-6", className)}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className }: CardProps) {
  return (
    <div className={cn("border-t border-gray-200 px-4 py-4 sm:px-6 dark:border-white/10", className)}>
      {children}
    </div>
  );
}
```

Create `src/components/ui/empty-state.tsx`:
```tsx
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("text-center py-12", className)}>
      {Icon && (
        <Icon className="mx-auto size-12 text-gray-400 dark:text-gray-500" />
      )}
      <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
```

Create `src/components/ui/section-heading.tsx`:
```tsx
interface SectionHeadingProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function SectionHeading({ title, description, action }: SectionHeadingProps) {
  return (
    <div className="sm:flex sm:items-center sm:justify-between">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
      {action && <div className="mt-4 sm:mt-0 sm:ml-4">{action}</div>}
    </div>
  );
}
```

Create `src/components/ui/search-input.tsx`:
```tsx
"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = "Search..." }: SearchInputProps) {
  return (
    <div className="relative">
      <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full rounded-md bg-white py-1.5 pr-3 pl-10 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
      />
    </div>
  );
}
```

Create `src/components/ui/modal.tsx`:
```tsx
"use client";

import { Fragment, useRef } from "react";
import { cn } from "@/lib/utils";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function Modal({ open, onClose, children, title, className }: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        ref={backdropRef}
        className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 transition-opacity"
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={cn(
            "relative w-full max-w-lg transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl sm:p-6 dark:bg-gray-800",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {title && (
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <XMarkIcon className="size-5" />
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
```

Create `src/components/ui/stat-card.tsx`:
```tsx
interface StatCardProps {
  name: string;
  value: string;
  unit?: string;
}

export function StatCard({ name, value, unit }: StatCardProps) {
  return (
    <div className="bg-white px-4 py-6 sm:px-6 lg:px-8 dark:bg-gray-900">
      <p className="text-sm/6 font-medium text-gray-500 dark:text-gray-400">{name}</p>
      <p className="mt-2 flex items-baseline gap-x-2">
        <span className="text-4xl font-semibold tracking-tight text-gray-900 dark:text-white">
          {value}
        </span>
        {unit && (
          <span className="text-sm text-gray-500 dark:text-gray-400">{unit}</span>
        )}
      </p>
    </div>
  );
}
```

Create `src/components/ui/toggle.tsx`:
```tsx
"use client";

import { cn } from "@/lib/utils";

interface ToggleProps {
  enabled: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  description?: string;
}

export function Toggle({ enabled, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between">
      {(label || description) && (
        <div>
          {label && (
            <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
          )}
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:focus-visible:outline-indigo-500",
          enabled ? "bg-indigo-600 dark:bg-indigo-500" : "bg-gray-200 dark:bg-white/10"
        )}
      >
        <span
          className={cn(
            "pointer-events-none relative inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out dark:bg-gray-200",
            enabled ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}
```

Create `src/components/ui/spinner.tsx`:
```tsx
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin size-5 text-indigo-600 dark:text-indigo-400", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
```

Create `src/components/ui/notification.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { CheckCircleIcon, XCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface NotificationProps {
  type: "success" | "error";
  title: string;
  message?: string;
  onClose: () => void;
}

export function Notification({ type, title, message, onClose }: NotificationProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const Icon = type === "success" ? CheckCircleIcon : XCircleIcon;
  const iconColor = type === "success" ? "text-green-400" : "text-red-400";

  return (
    <div className="fixed top-4 right-4 z-[100] w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-lg outline-1 outline-black/5 dark:bg-gray-800 dark:-outline-offset-1 dark:outline-white/10">
      <div className="p-4">
        <div className="flex items-start">
          <Icon className={`size-6 shrink-0 ${iconColor}`} />
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
            {message && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 inline-flex shrink-0 rounded-md text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/
git commit -m "feat: add reusable UI components (button, input, select, badge, card, modal, stats, toggle, etc.)"
```

---

### Task 9: Products CRUD

**Files:**
- Create: `src/actions/products.ts`, `src/app/(app)/products/page.tsx`, `src/app/(app)/products/new/page.tsx`, `src/app/(app)/products/[id]/edit/page.tsx`

- [ ] **Step 1: Create product server actions**

Create `src/actions/products.ts`:
```ts
"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getProducts(activeOnly = true) {
  const query = activeOnly
    ? db.select().from(schema.products).where(eq(schema.products.isActive, true)).all()
    : db.select().from(schema.products).all();
  return query;
}

export async function getProduct(id: number) {
  return db.select().from(schema.products).where(eq(schema.products.id, id)).get();
}

export async function createProduct(formData: FormData) {
  await requireAdmin();

  const name = formData.get("name") as string;
  const defaultUnit = formData.get("defaultUnit") as string;
  const defaultRate = parseFloat(formData.get("defaultRate") as string) || 0;
  const hsnCode = formData.get("hsnCode") as string || "";
  const gstRatePercent = parseFloat(formData.get("gstRatePercent") as string) || 0;
  const category = formData.get("category") as string || "";

  if (!name.trim()) return { error: "Product name is required" };

  db.insert(schema.products).values({
    name: name.trim(),
    defaultUnit,
    defaultRate,
    hsnCode,
    gstRatePercent,
    category,
  }).run();

  revalidatePath("/products");
  redirect("/products");
}

export async function updateProduct(id: number, formData: FormData) {
  await requireAdmin();

  const name = formData.get("name") as string;
  const defaultUnit = formData.get("defaultUnit") as string;
  const defaultRate = parseFloat(formData.get("defaultRate") as string) || 0;
  const hsnCode = formData.get("hsnCode") as string || "";
  const gstRatePercent = parseFloat(formData.get("gstRatePercent") as string) || 0;
  const category = formData.get("category") as string || "";

  if (!name.trim()) return { error: "Product name is required" };

  db.update(schema.products)
    .set({
      name: name.trim(),
      defaultUnit,
      defaultRate,
      hsnCode,
      gstRatePercent,
      category,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.products.id, id))
    .run();

  revalidatePath("/products");
  redirect("/products");
}

export async function toggleProductActive(id: number) {
  await requireAdmin();
  const product = db.select().from(schema.products).where(eq(schema.products.id, id)).get();
  if (!product) return;

  db.update(schema.products)
    .set({ isActive: !product.isActive, updatedAt: new Date().toISOString() })
    .where(eq(schema.products.id, id))
    .run();

  revalidatePath("/products");
}
```

- [ ] **Step 2: Create products list page**

Create `src/app/(app)/products/page.tsx`:
```tsx
import { requireAdmin } from "@/lib/session";
import { getProducts } from "@/actions/products";
import { formatCurrency } from "@/lib/utils";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CubeIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default async function ProductsPage() {
  await requireAdmin();
  const products = await getProducts();

  return (
    <div>
      <SectionHeading
        title="Products"
        description={`${products.length} products`}
        action={
          <Link href="/products/new">
            <Button>Add Product</Button>
          </Link>
        }
      />

      {products.length === 0 ? (
        <EmptyState
          icon={CubeIcon}
          title="No products yet"
          description="Get started by adding your first product."
          action={
            <Link href="/products/new">
              <Button>Add Product</Button>
            </Link>
          }
        />
      ) : (
        <div className="mt-6">
          {/* Mobile: stacked list */}
          <div className="space-y-3 sm:hidden">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}/edit`}
                className="block rounded-lg bg-white px-4 py-4 shadow-sm outline-1 outline-black/5 dark:bg-gray-800/50 dark:-outline-offset-1 dark:outline-white/10"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{product.name}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(product.defaultRate)}/{product.defaultUnit}
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {product.hsnCode && (
                    <Badge color="blue">HSN: {product.hsnCode}</Badge>
                  )}
                  {product.gstRatePercent > 0 && (
                    <Badge color="indigo">GST: {product.gstRatePercent}%</Badge>
                  )}
                  {product.category && (
                    <Badge color="gray">{product.category}</Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block">
            <div className="overflow-hidden shadow-sm outline-1 outline-black/5 sm:rounded-lg dark:shadow-none dark:-outline-offset-1 dark:outline-white/10">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-white/15">
                <thead className="bg-gray-50 dark:bg-gray-800/75">
                  <tr>
                    <th scope="col" className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-6 dark:text-gray-200">Name</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Rate</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Unit</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">HSN</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">GST%</th>
                    <th scope="col" className="py-3.5 pr-4 pl-3 sm:pr-6"><span className="sr-only">Edit</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-white/10 dark:bg-gray-800/50">
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-6 dark:text-white">{product.name}</td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">{formatCurrency(product.defaultRate)}</td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">{product.defaultUnit}</td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">{product.hsnCode || "—"}</td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">{product.gstRatePercent || "—"}</td>
                      <td className="py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                        <Link href={`/products/${product.id}/edit`} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">Edit</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create new product form page**

Create `src/app/(app)/products/new/page.tsx`:
```tsx
import { requireAdmin } from "@/lib/session";
import { createProduct } from "@/actions/products";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function NewProductPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Add Product</h1>
      <form action={createProduct} className="mt-6 space-y-6 max-w-lg">
        <Input label="Product Name" name="name" required placeholder="e.g., Dhokla" />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Default Unit"
            name="defaultUnit"
            options={[
              { value: "kg", label: "Kilograms (kg)" },
              { value: "pieces", label: "Pieces" },
              { value: "plates", label: "Plates" },
              { value: "trays", label: "Trays" },
            ]}
          />
          <Input label="Default Rate (₹)" name="defaultRate" type="number" step="0.01" placeholder="180" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="HSN Code" name="hsnCode" placeholder="e.g., 2106" />
          <Input label="GST Rate (%)" name="gstRatePercent" type="number" step="0.01" placeholder="5" />
        </div>
        <Input label="Category" name="category" placeholder="e.g., Snacks" />
        <div className="flex gap-3">
          <Button type="submit">Save Product</Button>
          <Link href="/products">
            <Button type="button" variant="secondary">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Create edit product page**

Create `src/app/(app)/products/[id]/edit/page.tsx`:
```tsx
import { requireAdmin } from "@/lib/session";
import { getProduct, updateProduct } from "@/actions/products";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const product = await getProduct(parseInt(id));
  if (!product) notFound();

  const updateWithId = updateProduct.bind(null, product.id);

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Product</h1>
      <form action={updateWithId} className="mt-6 space-y-6 max-w-lg">
        <Input label="Product Name" name="name" required defaultValue={product.name} />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Default Unit"
            name="defaultUnit"
            defaultValue={product.defaultUnit}
            options={[
              { value: "kg", label: "Kilograms (kg)" },
              { value: "pieces", label: "Pieces" },
              { value: "plates", label: "Plates" },
              { value: "trays", label: "Trays" },
            ]}
          />
          <Input label="Default Rate (₹)" name="defaultRate" type="number" step="0.01" defaultValue={product.defaultRate} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="HSN Code" name="hsnCode" defaultValue={product.hsnCode || ""} />
          <Input label="GST Rate (%)" name="gstRatePercent" type="number" step="0.01" defaultValue={product.gstRatePercent || 0} />
        </div>
        <Input label="Category" name="category" defaultValue={product.category || ""} />
        <div className="flex gap-3">
          <Button type="submit">Update Product</Button>
          <Link href="/products">
            <Button type="button" variant="secondary">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Verify product CRUD works**

Run: `npm run dev`

1. Navigate to `/products` → should show seeded products
2. Click "Add Product" → fill form → save → should appear in list
3. Click "Edit" on a product → modify → save → should update

- [ ] **Step 6: Commit**

```bash
git add src/actions/products.ts src/app/\(app\)/products/
git commit -m "feat: add products CRUD with list, create, and edit pages"
```

---

### Task 10: Clients CRUD

**Files:**
- Create: `src/actions/clients.ts`, `src/app/(app)/clients/page.tsx`, `src/app/(app)/clients/new/page.tsx`, `src/app/(app)/clients/[id]/page.tsx`, `src/app/(app)/clients/[id]/edit/page.tsx`

- [ ] **Step 1: Create client server actions**

Create `src/actions/clients.ts`:
```ts
"use server";

import { db, schema } from "@/db";
import { eq, like, or, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getClients(search?: string) {
  let query = db.select().from(schema.clients).where(eq(schema.clients.isActive, true));

  const results = query.all();

  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    return results.filter(
      (c) =>
        c.shopName.toLowerCase().includes(s) ||
        c.ownerName.toLowerCase().includes(s)
    );
  }

  return results;
}

export async function getClient(id: number) {
  return db.select().from(schema.clients).where(eq(schema.clients.id, id)).get();
}

export async function createClient(formData: FormData) {
  await requireAdmin();

  const shopName = formData.get("shopName") as string;
  const ownerName = formData.get("ownerName") as string || "";
  const phone = formData.get("phone") as string || "";
  const address = formData.get("address") as string || "";
  const isRecurring = formData.get("isRecurring") === "on";
  const defaultFirmId = formData.get("defaultFirmId") ? parseInt(formData.get("defaultFirmId") as string) : null;
  const openingBalance = parseFloat(formData.get("openingBalance") as string) || 0;
  const gstNumber = formData.get("gstNumber") as string || "";

  if (!shopName.trim()) return { error: "Shop name is required" };

  db.insert(schema.clients).values({
    shopName: shopName.trim(),
    ownerName,
    phone,
    address,
    isRecurring,
    defaultFirmId,
    openingBalance,
    gstNumber,
  }).run();

  revalidatePath("/clients");
  redirect("/clients");
}

export async function updateClient(id: number, formData: FormData) {
  await requireAdmin();

  const shopName = formData.get("shopName") as string;
  const ownerName = formData.get("ownerName") as string || "";
  const phone = formData.get("phone") as string || "";
  const address = formData.get("address") as string || "";
  const isRecurring = formData.get("isRecurring") === "on";
  const defaultFirmId = formData.get("defaultFirmId") ? parseInt(formData.get("defaultFirmId") as string) : null;
  const openingBalance = parseFloat(formData.get("openingBalance") as string) || 0;
  const gstNumber = formData.get("gstNumber") as string || "";

  if (!shopName.trim()) return { error: "Shop name is required" };

  db.update(schema.clients)
    .set({
      shopName: shopName.trim(),
      ownerName,
      phone,
      address,
      isRecurring,
      defaultFirmId,
      openingBalance,
      gstNumber,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.clients.id, id))
    .run();

  revalidatePath("/clients");
  redirect(`/clients/${id}`);
}
```

- [ ] **Step 2: Create clients list page**

Create `src/app/(app)/clients/page.tsx`:
```tsx
import { requireAuth } from "@/lib/session";
import { getClients } from "@/actions/clients";
import { formatCurrency } from "@/lib/utils";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireAuth();
  const { q } = await searchParams;
  const clients = await getClients(q);

  return (
    <div>
      <SectionHeading
        title="Clients"
        description={`${clients.length} clients`}
        action={
          user.role === "admin" ? (
            <Link href="/clients/new">
              <Button>Add Client</Button>
            </Link>
          ) : undefined
        }
      />

      {/* Search */}
      <form className="mt-4">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by shop or owner name..."
          className="block w-full rounded-md bg-white py-1.5 pr-3 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
        />
      </form>

      {clients.length === 0 ? (
        <EmptyState
          icon={UserGroupIcon}
          title="No clients found"
          description={q ? "Try a different search term." : "Get started by adding your first client."}
          action={
            !q && user.role === "admin" ? (
              <Link href="/clients/new">
                <Button>Add Client</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="mt-4 space-y-3">
          {clients.map((client) => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="block rounded-lg bg-white px-4 py-4 shadow-sm outline-1 outline-black/5 hover:bg-gray-50 dark:bg-gray-800/50 dark:-outline-offset-1 dark:outline-white/10 dark:hover:bg-white/5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{client.shopName}</p>
                  {client.ownerName && (
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{client.ownerName}</p>
                  )}
                </div>
                <div className="text-right">
                  {client.openingBalance !== 0 && (
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(client.openingBalance)}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                {client.isRecurring && <Badge color="green">Recurring</Badge>}
                {client.gstNumber && <Badge color="blue">GST</Badge>}
                {client.phone && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">{client.phone}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create client detail page with ledger placeholder**

Create `src/app/(app)/clients/[id]/page.tsx`:
```tsx
import { requireAuth } from "@/lib/session";
import { getClient } from "@/actions/clients";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const client = await getClient(parseInt(id));
  if (!client) notFound();

  return (
    <div>
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{client.shopName}</h1>
          {client.ownerName && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{client.ownerName}</p>
          )}
        </div>
        {user.role === "admin" && (
          <div className="mt-4 flex gap-3 sm:mt-0">
            <Link href={`/clients/${client.id}/edit`}>
              <Button variant="secondary">Edit</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Info card */}
      <div className="mt-6 overflow-hidden rounded-lg bg-white shadow-sm outline-1 outline-black/5 dark:bg-gray-800/50 dark:-outline-offset-1 dark:outline-white/10">
        <div className="px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">{client.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">{client.address || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">GSTIN</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">{client.gstNumber || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Opening Balance</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">{formatCurrency(client.openingBalance)}</dd>
            </div>
          </dl>
          <div className="mt-4 flex gap-2">
            {client.isRecurring && <Badge color="green">Recurring</Badge>}
          </div>
        </div>
      </div>

      {/* Ledger placeholder */}
      <div className="mt-8">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Ledger</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Ledger entries will appear here once orders and payments are created.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create new client and edit client pages**

Create `src/app/(app)/clients/new/page.tsx`:
```tsx
import { requireAdmin } from "@/lib/session";
import { createClient } from "@/actions/clients";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function NewClientPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Add Client</h1>
      <form action={createClient} className="mt-6 space-y-6 max-w-lg">
        <Input label="Shop Name" name="shopName" required placeholder="e.g., Sharma Sweets" />
        <Input label="Owner Name" name="ownerName" placeholder="e.g., Ramesh Sharma" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Phone" name="phone" type="tel" placeholder="9876543210" />
          <Input label="Opening Balance (₹)" name="openingBalance" type="number" step="0.01" defaultValue="0" />
        </div>
        <Input label="Address" name="address" placeholder="Shop address" />
        <Input label="GSTIN" name="gstNumber" placeholder="e.g., 24AABCU9603R1ZM" />
        <div className="flex items-center gap-3">
          <input
            id="isRecurring"
            type="checkbox"
            name="isRecurring"
            className="size-4 rounded-sm border-gray-300 text-indigo-600 focus:ring-indigo-600 dark:border-white/10 dark:bg-white/5"
          />
          <label htmlFor="isRecurring" className="text-sm text-gray-900 dark:text-gray-200">
            Recurring client (daily orders)
          </label>
        </div>
        <div className="flex gap-3">
          <Button type="submit">Save Client</Button>
          <Link href="/clients">
            <Button type="button" variant="secondary">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
```

Create `src/app/(app)/clients/[id]/edit/page.tsx`:
```tsx
import { requireAdmin } from "@/lib/session";
import { getClient, updateClient } from "@/actions/clients";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const client = await getClient(parseInt(id));
  if (!client) notFound();

  const updateWithId = updateClient.bind(null, client.id);

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Client</h1>
      <form action={updateWithId} className="mt-6 space-y-6 max-w-lg">
        <Input label="Shop Name" name="shopName" required defaultValue={client.shopName} />
        <Input label="Owner Name" name="ownerName" defaultValue={client.ownerName} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Phone" name="phone" type="tel" defaultValue={client.phone} />
          <Input label="Opening Balance (₹)" name="openingBalance" type="number" step="0.01" defaultValue={client.openingBalance} />
        </div>
        <Input label="Address" name="address" defaultValue={client.address} />
        <Input label="GSTIN" name="gstNumber" defaultValue={client.gstNumber || ""} />
        <div className="flex items-center gap-3">
          <input
            id="isRecurring"
            type="checkbox"
            name="isRecurring"
            defaultChecked={client.isRecurring}
            className="size-4 rounded-sm border-gray-300 text-indigo-600 focus:ring-indigo-600 dark:border-white/10 dark:bg-white/5"
          />
          <label htmlFor="isRecurring" className="text-sm text-gray-900 dark:text-gray-200">
            Recurring client (daily orders)
          </label>
        </div>
        <div className="flex gap-3">
          <Button type="submit">Update Client</Button>
          <Link href={`/clients/${client.id}`}>
            <Button type="button" variant="secondary">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Verify client CRUD**

Run: `npm run dev`

1. Navigate to `/clients` → should show empty state
2. Click "Add Client" → fill form → save → should appear in list
3. Click a client → see detail page
4. Click "Edit" → modify → save → should update

- [ ] **Step 6: Commit**

```bash
git add src/actions/clients.ts src/app/\(app\)/clients/
git commit -m "feat: add clients CRUD with list, detail, create, and edit pages"
```

---

## Phase 3: Calendar & Orders

### Task 11: Calendar View

**Files:**
- Create: `src/components/calendar/calendar-grid.tsx`, update `src/app/(app)/calendar/page.tsx`

Reference Catalyst: `react/ui-blocks/application-ui/data-display/calendars/month-view.jsx` — adapt the exact Tailwind classes for the grid, day cells, today highlight, month navigation, and mobile button view.

- [ ] **Step 1: Create calendar grid component**

Create `src/components/calendar/calendar-grid.tsx` — a React version of the Catalyst month-view calendar. Use the same `grid-cols-7` layout, `data-is-current-month`, `data-is-today`, `data-is-selected` patterns, dots for events on mobile, event list on desktop. Wire navigation with prev/next month buttons and "Today" button. Accept `orderCounts: Record<string, number>` prop mapping date strings to order counts. Use `ChevronLeftIcon`/`ChevronRightIcon` from `@heroicons/react/20/solid`.

- [ ] **Step 2: Create order count query**

Create `src/actions/orders.ts` with a `getOrderCountsByMonth(year: number, month: number)` function that queries the orders table, groups by date, and returns `Record<string, number>`.

- [ ] **Step 3: Wire calendar page**

Update `src/app/(app)/calendar/page.tsx` to use `CalendarGrid` component with order counts from the database. Accept `?month=YYYY-MM` search param for month navigation.

- [ ] **Step 4: Verify calendar renders and navigates**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add monthly calendar view with order count dots"
```

---

### Task 12: Day View & Order Entry

**Files:**
- Create: `src/app/(app)/calendar/[date]/page.tsx`, `src/components/orders/order-card.tsx`, `src/app/(app)/orders/new/page.tsx`, `src/components/orders/order-form.tsx`

- [ ] **Step 1: Create day view page** showing orders for selected date with FAB to add new order

- [ ] **Step 2: Create order card component** showing client name, items summary, total, status badge

- [ ] **Step 3: Create order form** with client selector (recurring clients first), firm/billing type selector, dynamic line items (product searchable, quantity, unit, rate, auto-calc amount), catering fields (conditional), save as draft/confirm

- [ ] **Step 4: Create order server actions** — `createOrder`, `updateOrder`, `deleteOrder` in `src/actions/orders.ts`

- [ ] **Step 5: Create order detail page** at `src/app/(app)/orders/[id]/page.tsx`

- [ ] **Step 6: Verify full flow** — calendar → tap date → day view → add order → see it in day view

- [ ] **Step 7: Commit**

```bash
git commit -m "feat: add day view and order entry with dynamic line items"
```

---

### Task 12B: WhatsApp Order Summary Share

**Files:**
- Create: `src/lib/order-summary.ts`, add share button to day view

- [ ] **Step 1: Create order summary formatter** — takes all orders for a date, aggregates by product (total qty across all clients), formats as clean text:
```
📋 Orders for 20-Apr-2026
━━━━━━━━━━━━━━━━━━━━
Dhokla — 25 kg
Patra — 15 kg
Khandvi — 8 kg
Kachori — 12 kg
━━━━━━━━━━━━━━━━━━━━
Total items: 4 | Total qty: 60 kg
```

- [ ] **Step 2: Add "Share to Factory" button** on day view — uses `navigator.share()` API on mobile (opens WhatsApp directly) with clipboard fallback on desktop

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add WhatsApp share for daily order summary to factory"
```

---

### Task 13: Order Status Updates (Staff)

**Files:**
- Create: `src/components/orders/order-status-updater.tsx`, `src/actions/order-items.ts`

- [ ] **Step 1: Create order item status update action**

- [ ] **Step 2: Create status updater component** — shows each item with status badge, tap to cycle: received → cooking → cooked → packed. Color-coded: gray → yellow → blue → green.

- [ ] **Step 3: Wire into order detail page** — staff sees status updater, admin sees full edit controls

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add order item status updates for staff (received → cooking → cooked → packed)"
```

---

## Phase 4: Invoice Generation

### Task 14: Invoice Number Generation & Ledger

**Files:**
- Create: `src/lib/invoice-number.ts`, `src/lib/ledger.ts`, `src/actions/invoices.ts`, `src/actions/payments.ts`

- [ ] **Step 1: Create invoice number generator** — format `PREFIX/FY/SEQ` (e.g., `DJ/2025-26/001`), auto-increment per firm per FY

- [ ] **Step 2: Create ledger calculation** — compute client balance from opening_balance + sum(invoice totals) - sum(payment amounts)

- [ ] **Step 3: Create invoice server actions** — `createInvoice` (calculate GST breakup, set balance b/f, generate number), `getInvoice`

- [ ] **Step 4: Create payment server actions** — `createPayment`, wire into client detail page

- [ ] **Step 5: Update client detail page** with actual ledger entries (invoices + payments chronologically)

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: add invoice numbering, ledger calculations, and payment tracking"
```

---

### Task 15: PDF Invoice Templates

**Files:**
- Create: `src/components/invoices/pdf-templates/non-gst-invoice.tsx`, `src/components/invoices/pdf-templates/gst-invoice.tsx`, `src/components/invoices/pdf-templates/catering-invoice.tsx`

- [ ] **Step 1: Install @react-pdf/renderer**

Run: `npm install @react-pdf/renderer`

- [ ] **Step 2: Create Non-GST invoice PDF template** — firm header, invoice number/date, client details, items table (S.No, Particular, Qty, Unit, Rate, Amount), subtotal, balance b/f, total due, bank details footer. Support A6 and A4 sizes.

- [ ] **Step 3: Create GST Tax Invoice PDF template** — "TAX INVOICE" title, GSTIN of both parties, items table with HSN column, CGST/SGST or IGST breakup, amount in words, A6/A4.

- [ ] **Step 4: Create Catering Invoice PDF template** — event details, menu items, advance paid, balance due, A6/A4.

- [ ] **Step 5: Create PDF API route** at `src/app/api/invoices/[id]/pdf/route.ts` — renders the appropriate template and returns PDF

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: add PDF invoice templates (non-GST, GST tax invoice, catering)"
```

---

### Task 16: Invoice Preview & Generation Screen

**Files:**
- Create: `src/app/(app)/orders/[id]/invoice/page.tsx`, `src/components/invoices/invoice-preview.tsx`

- [ ] **Step 1: Create invoice preview component** — on-screen preview matching the PDF layout

- [ ] **Step 2: Create invoice generation page** — size selector (A6/A4), preview, "Generate Invoice" button, download/share via WhatsApp link

- [ ] **Step 3: Wire from day view** — "Invoice" button on each order card

- [ ] **Step 4: Verify end-to-end** — create order → generate invoice → download PDF → verify formatting

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add invoice preview and PDF generation with download/share"
```

---

## Phase 5: Settings, Analytics, Backup, i18n

### Task 17: Settings — Firms Management

**Files:**
- Create: `src/actions/firms.ts`, `src/app/(app)/settings/page.tsx`, `src/app/(app)/settings/firms/page.tsx`, `src/app/(app)/settings/firms/new/page.tsx`, `src/app/(app)/settings/firms/[id]/edit/page.tsx`

- [ ] **Step 1: Create firm server actions** — CRUD

- [ ] **Step 2: Create settings hub page** — links to Firms, Users, Backup, Preferences

- [ ] **Step 3: Create firm list, add, edit pages**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add settings hub and firm management"
```

---

### Task 18: Settings — User Management

**Files:**
- Create: `src/actions/users.ts`, `src/app/(app)/settings/users/page.tsx`

- [ ] **Step 1: Create user server actions** — create user, update user, reset PIN

- [ ] **Step 2: Create user management page** — list users, add user (name, PIN, role), edit, deactivate

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add user management with PIN reset"
```

---

### Task 19: Analytics Dashboard

**Files:**
- Create: `src/actions/analytics.ts`, `src/app/(app)/analytics/page.tsx`, `src/components/analytics/daily-summary.tsx`, `src/components/analytics/monthly-chart.tsx`, `src/components/analytics/top-products.tsx`, `src/components/analytics/top-clients.tsx`

Reference Catalyst: `react/ui-blocks/application-ui/data-display/stats/simple-in-cards.jsx` for stats cards, `react/ui-blocks/application-ui/navigation/tabs/simple.jsx` for tab navigation between Daily/Monthly/Product/Client views.

- [ ] **Step 1: Create analytics server actions** — daily summary, monthly summary, product analytics, client analytics, filterable by date range/firm/billing type

- [ ] **Step 2: Create analytics page with tabs** — Daily, Monthly, Products, Clients

- [ ] **Step 3: Create stat cards and summary components**

- [ ] **Step 4: Create simple bar chart** for monthly revenue (CSS-based, no chart library needed for MVP)

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add analytics dashboard with daily/monthly/product/client views"
```

---

### Task 20: Backup & Restore

**Files:**
- Create: `src/app/(app)/settings/backup/page.tsx`, `src/app/api/backup/download/route.ts`, `src/app/api/backup/upload/route.ts`, `src/actions/backup.ts`

- [ ] **Step 1: Create backup download API** — streams the SQLite .db file as download

- [ ] **Step 2: Create backup upload/restore API** — accepts .db file, auto-backs up current DB first, replaces, requires PIN re-entry

- [ ] **Step 3: Create backup & restore settings page** — "Backup Now" button, upload restore form, list of server backups

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add backup & restore functionality"
```

---

### Task 21: Multi-Language Support (English + Hindi)

**Files:**
- Create: `src/messages/en.json`, `src/messages/hi.json`, update `next.config.ts`

- [ ] **Step 1: Install next-intl**

Run: `npm install next-intl`

- [ ] **Step 2: Create English translation file** with all UI strings

- [ ] **Step 3: Create Hindi translation file** with translated strings

- [ ] **Step 4: Configure next-intl** in next.config.ts and create provider

- [ ] **Step 5: Add language selector to settings/preferences**

- [ ] **Step 6: Update key components** to use translation keys instead of hardcoded strings

- [ ] **Step 7: Commit**

```bash
git commit -m "feat: add multi-language support (English + Hindi)"
```

---

### Task 22: Final Polish & Deployment Prep

- [ ] **Step 1: Add loading states** — loading.tsx files for each route group

- [ ] **Step 2: Add error boundaries** — error.tsx files

- [ ] **Step 3: Add not-found pages** — not-found.tsx with Catalyst 404 styling

- [ ] **Step 4: Add PWA manifest** for mobile home screen install

- [ ] **Step 5: Test responsive design** — verify all screens look good on mobile (375px), tablet (768px), desktop (1280px+)

- [ ] **Step 6: Test dark mode** — verify all screens in both themes

- [ ] **Step 7: Create production build**

Run: `npm run build`

- [ ] **Step 8: Final commit**

```bash
git commit -m "feat: add loading states, error boundaries, and polish for production"
```
