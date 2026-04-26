# Kachaa Pakka Multi-Tenancy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the single-tenant SQLite app into a multi-tenant SaaS with PostgreSQL + Row-Level Security, subdomain-based tenant routing, a super-admin panel, and server provisioning scripts.

**Architecture:** Shared PostgreSQL database with `tenant_id` on every tenant-scoped table. RLS policies enforce data isolation at the engine level. Middleware reads hostname to resolve tenant. Super-admin panel at `/super-admin` with separate email+password auth. Server setup via idempotent shell scripts.

**Tech Stack:** Next.js 16, TypeScript, PostgreSQL + node-postgres (`pg`), Drizzle ORM (PostgreSQL dialect), Row-Level Security, bcryptjs, PM2, Nginx, Let's Encrypt, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-04-26-multi-tenancy-design.md`

---

## File Structure

### New Files
```
.env.example                          — Environment variable template
scripts/
  setup/
    setup.sh                          — Master setup script (interactive)
    setup-system.sh                   — System packages, UFW, swap
    setup-node.sh                     — nvm + Node.js 24 + PM2
    setup-postgres.sh                 — PG install, DB, app user, RLS
    setup-nginx.sh                    — Reverse proxy, wildcard, gzip
    setup-ssl.sh                      — Certbot + auto-renewal
    setup-app.sh                      — Clone, install, migrate, seed, PM2
    setup-backups.sh                  — Daily pg_dump cron
  migrate-sqlite-to-pg.ts            — One-time SQLite → PG migration
src/
  db/
    index.ts                          — PG pool + tenant-aware DB helpers (rewrite)
    schema.ts                         — PG schema + tenant tables (rewrite)
    seed.ts                           — Seed super-admin + Deepak tenant (rewrite)
    rls.ts                            — RLS policy setup script
  lib/
    tenant.ts                         — Tenant resolution from hostname
    super-admin-session.ts            — Super-admin auth (email+password)
  actions/
    super-admin.ts                    — Super-admin server actions
    signup.ts                         — Tenant registration
  app/
    super-admin/
      layout.tsx                      — Super-admin layout (separate from tenant)
      login/page.tsx                  — Email + password login
      page.tsx                        — Dashboard
      tenants/page.tsx                — Tenant list
      tenants/[id]/page.tsx           — Tenant detail
      tenants/[id]/impersonate/route.ts — Start impersonation
      tenants/new/page.tsx            — Manual tenant creation
    signup/page.tsx                   — Self-service registration
  components/
    super-admin/
      tenant-table.tsx                — Tenant list table
      tenant-detail.tsx               — Tenant detail card
      stats-cards.tsx                 — Dashboard stat cards
      impersonation-banner.tsx        — "Viewing as" banner
  drizzle.config.ts                   — PG dialect (rewrite)
```

### Modified Files
```
package.json                          — Replace better-sqlite3 with pg
src/middleware.ts                      — Tenant resolution + status checks
src/lib/session.ts                    — Add tenantId to session
src/lib/auth.ts                       — No changes needed (bcrypt is DB-agnostic)
src/lib/ledger.ts                     — Async PG queries + tenantId
src/lib/invoice-number.ts             — Async PG queries + tenantId
src/lib/calendar-export.ts            — Async PG queries
src/actions/auth.ts                   — Tenant-scoped PIN login
src/actions/orders.ts                 — PG async + tenant-aware DB
src/actions/clients.ts                — PG async + tenant-aware DB
src/actions/products.ts               — PG async + tenant-aware DB
src/actions/firms.ts                  — PG async + tenant-aware DB
src/actions/invoices.ts               — PG async + tenant-aware DB
src/actions/payments.ts               — PG async + tenant-aware DB
src/actions/users.ts                  — PG async + tenant-aware DB
src/actions/order-items.ts            — PG async + tenant-aware DB
src/actions/analytics.ts              — PG async + tenant-aware DB
src/app/(app)/settings/backup/        — PG dump instead of SQLite file
src/messages/en.json                  — Add super-admin translations
src/messages/hi.json                  — Add super-admin translations
```

---

## Phase 1: Database Migration (SQLite → PostgreSQL)

### Task 1: Swap Dependencies

**Files:**
- Modify: `package.json`
- Modify: `drizzle.config.ts`
- Create: `.env.example`

- [ ] **Step 1: Update package.json**

Remove SQLite deps, add PostgreSQL deps:

```bash
npm uninstall better-sqlite3 @types/better-sqlite3
npm install pg drizzle-orm
npm install -D @types/pg
```

- [ ] **Step 2: Create .env.example**

```env
# Database
DATABASE_URL=postgres://kachaapakka_app:changeme@localhost:5432/kachaapakka

# Domain
SAAS_DOMAIN=

# Super Admin (used by seed script)
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=changeme

# App
PORT=3456
NODE_ENV=production
```

- [ ] **Step 3: Create .env for local development**

```env
DATABASE_URL=postgres://kachaapakka_app:localdev@localhost:5432/kachaapakka
SUPER_ADMIN_EMAIL=ashish@areakpi.in
SUPER_ADMIN_PASSWORD=admin123
PORT=3456
NODE_ENV=development
```

- [ ] **Step 4: Update drizzle.config.ts**

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 5: Add .env to .gitignore**

Ensure `.env` is in `.gitignore` (keep `.env.example` tracked).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: swap SQLite deps for PostgreSQL (pg + drizzle)"
```

---

### Task 2: Rewrite Database Schema for PostgreSQL + Multi-Tenancy

**Files:**
- Rewrite: `src/db/schema.ts`

- [ ] **Step 1: Rewrite schema.ts with all tables**

```typescript
import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  real,
  timestamp,
  date,
  numeric,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
  })
    .notNull()
    .default("pending"),
  subscriptionPlan: text("subscription_plan", {
    enum: ["free", "monthly", "yearly"],
  })
    .notNull()
    .default("free"),
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
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  domain: text("domain").notNull().unique(),
  isPrimary: boolean("is_primary").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptionPayments = pgTable("subscription_payments", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  amount: numeric("amount").notNull(),
  date: text("date").notNull(),
  mode: text("mode", { enum: ["cash", "upi", "bank"] }).default("cash"),
  notes: text("notes"),
  recordedBy: integer("recorded_by").references(() => superAdmins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Tenant-Scoped Tables (all have tenant_id) ──────────────────────────

export const firms = pgTable("firms", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  pin: text("pin").notNull(),
  role: text("role", { enum: ["admin", "staff"] }).default("staff"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
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
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
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
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
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
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull(),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id),
  amount: real("amount").notNull(),
  date: text("date").notNull(),
  mode: text("mode", { enum: ["cash", "upi", "bank"] }).default("cash"),
  notes: text("notes"),
  receivedBy: integer("received_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

- [ ] **Step 2: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: rewrite schema for PostgreSQL with tenant_id on all tables"
```

---

### Task 3: Rewrite Database Connection Layer

**Files:**
- Rewrite: `src/db/index.ts`
- Create: `src/db/rls.ts`

- [ ] **Step 1: Rewrite src/db/index.ts**

```typescript
import { Pool, PoolClient } from "pg";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

// Admin DB — no RLS (for super-admin queries, migrations, seeding)
// Uses the pool directly with the app's connection string
export const adminDb = drizzle(pool, { schema });

// Tenant-aware DB — sets app.tenant_id so RLS kicks in
export async function withTenantDb<T>(
  tenantId: number,
  fn: (db: NodePgDatabase<typeof schema>) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL app.tenant_id = '${tenantId}'`);
    const db = drizzle(client, { schema });
    const result = await fn(db);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export { schema };
export type TenantDb = NodePgDatabase<typeof schema>;
```

- [ ] **Step 2: Create src/db/rls.ts**

Script to apply RLS policies to all tenant-scoped tables. Run once after migration.

```typescript
import { Pool } from "pg";

const TENANT_TABLES = [
  "firms",
  "users",
  "products",
  "clients",
  "orders",
  "order_items",
  "invoices",
  "payments",
];

async function setupRLS() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const client = await pool.connect();
  try {
    for (const table of TENANT_TABLES) {
      console.log(`Setting up RLS for ${table}...`);

      // Enable RLS
      await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);

      // Force RLS even for table owner (important!)
      await client.query(
        `ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`,
      );

      // Drop existing policy if any (idempotent)
      await client.query(
        `DROP POLICY IF EXISTS tenant_isolation ON ${table}`,
      );

      // Create isolation policy
      await client.query(`
        CREATE POLICY tenant_isolation ON ${table}
          USING (tenant_id = current_setting('app.tenant_id', true)::int)
          WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::int)
      `);
    }

    console.log("RLS setup complete for all tenant tables.");
  } finally {
    client.release();
    await pool.end();
  }
}

setupRLS().catch((err) => {
  console.error("RLS setup failed:", err);
  process.exit(1);
});
```

- [ ] **Step 3: Commit**

```bash
git add src/db/index.ts src/db/rls.ts
git commit -m "feat: PG connection pool with tenant-aware RLS wrapper"
```

---

### Task 4: Rewrite Session with Tenant Context

**Files:**
- Rewrite: `src/lib/session.ts`
- Create: `src/lib/tenant.ts`
- Create: `src/lib/super-admin-session.ts`

- [ ] **Step 1: Rewrite src/lib/session.ts**

```typescript
import { cookies } from "next/headers";
import { adminDb, schema } from "@/db";
import { and, eq } from "drizzle-orm";

const COOKIE_NAME = "kp-session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

interface SessionPayload {
  tenantId: number;
  userId: number;
  impersonating?: boolean;
  ts: number;
}

export interface SessionUser {
  tenantId: number;
  id: number;
  name: string;
  role: string;
  impersonating?: boolean;
}

export async function setSession(
  tenantId: number,
  userId: number,
  impersonating = false,
): Promise<void> {
  const payload: SessionPayload = {
    tenantId,
    userId,
    impersonating: impersonating || undefined,
    ts: Date.now(),
  };
  const value = Buffer.from(JSON.stringify(payload)).toString("base64");
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: impersonating ? 60 * 60 : MAX_AGE, // 1hr for impersonation
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) return null;

  try {
    const payload: SessionPayload = JSON.parse(
      Buffer.from(cookie.value, "base64").toString("utf-8"),
    );

    const user = await adminDb
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.id, payload.userId),
          eq(schema.users.tenantId, payload.tenantId),
        ),
      )
      .then((rows) => rows[0]);

    if (!user || !user.isActive) return null;

    return {
      tenantId: payload.tenantId,
      id: user.id,
      name: user.name,
      role: user.role ?? "staff",
      impersonating: payload.impersonating,
    };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }
  return session;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireAuth();
  if (session.role !== "admin") {
    const { redirect } = await import("next/navigation");
    redirect("/calendar");
  }
  return session;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
```

- [ ] **Step 2: Create src/lib/tenant.ts**

```typescript
import { adminDb, schema } from "@/db";
import { eq } from "drizzle-orm";

export interface TenantInfo {
  id: number;
  slug: string;
  name: string;
  status: string;
  subscriptionPlan: string;
  subscriptionExpiresAt: Date | null;
}

export async function resolveTenant(
  hostname: string,
): Promise<TenantInfo | null> {
  // 1. Check tenant_domains for exact match
  const domainMapping = await adminDb
    .select({
      tenantId: schema.tenantDomains.tenantId,
    })
    .from(schema.tenantDomains)
    .where(eq(schema.tenantDomains.domain, hostname))
    .then((rows) => rows[0]);

  if (domainMapping) {
    return getTenantById(domainMapping.tenantId);
  }

  // 2. Try subdomain from SAAS_DOMAIN
  const saasDomain = process.env.SAAS_DOMAIN;
  if (saasDomain && hostname.endsWith(`.${saasDomain}`)) {
    const slug = hostname.replace(`.${saasDomain}`, "");
    if (slug && !slug.includes(".")) {
      return getTenantBySlug(slug);
    }
  }

  return null;
}

async function getTenantById(id: number): Promise<TenantInfo | null> {
  const tenant = await adminDb
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, id))
    .then((rows) => rows[0]);

  if (!tenant) return null;

  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    status: tenant.status,
    subscriptionPlan: tenant.subscriptionPlan,
    subscriptionExpiresAt: tenant.subscriptionExpiresAt,
  };
}

async function getTenantBySlug(slug: string): Promise<TenantInfo | null> {
  const tenant = await adminDb
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, slug))
    .then((rows) => rows[0]);

  if (!tenant) return null;

  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    status: tenant.status,
    subscriptionPlan: tenant.subscriptionPlan,
    subscriptionExpiresAt: tenant.subscriptionExpiresAt,
  };
}

export function isTenantExpired(tenant: TenantInfo): boolean {
  if (!tenant.subscriptionExpiresAt) return false;
  return new Date() > tenant.subscriptionExpiresAt;
}
```

- [ ] **Step 3: Create src/lib/super-admin-session.ts**

```typescript
import { cookies } from "next/headers";
import { adminDb, schema } from "@/db";
import { eq } from "drizzle-orm";
import { compareSync } from "bcryptjs";

const COOKIE_NAME = "kp-super-session";
const MAX_AGE = 60 * 60 * 24; // 24 hours

interface SuperAdminPayload {
  adminId: number;
  ts: number;
}

export interface SuperAdmin {
  id: number;
  name: string;
  email: string;
}

export async function superAdminLogin(
  email: string,
  password: string,
): Promise<SuperAdmin | null> {
  const admin = await adminDb
    .select()
    .from(schema.superAdmins)
    .where(eq(schema.superAdmins.email, email.toLowerCase()))
    .then((rows) => rows[0]);

  if (!admin || !compareSync(password, admin.password)) return null;

  const payload: SuperAdminPayload = { adminId: admin.id, ts: Date.now() };
  const value = Buffer.from(JSON.stringify(payload)).toString("base64");
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/super-admin",
    maxAge: MAX_AGE,
  });

  return { id: admin.id, name: admin.name, email: admin.email };
}

export async function getSuperAdminSession(): Promise<SuperAdmin | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) return null;

  try {
    const payload: SuperAdminPayload = JSON.parse(
      Buffer.from(cookie.value, "base64").toString("utf-8"),
    );

    const admin = await adminDb
      .select()
      .from(schema.superAdmins)
      .where(eq(schema.superAdmins.id, payload.adminId))
      .then((rows) => rows[0]);

    if (!admin) return null;
    return { id: admin.id, name: admin.name, email: admin.email };
  } catch {
    return null;
  }
}

export async function requireSuperAdmin(): Promise<SuperAdmin> {
  const session = await getSuperAdminSession();
  if (!session) {
    const { redirect } = await import("next/navigation");
    redirect("/super-admin/login");
  }
  return session;
}

export async function clearSuperAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/session.ts src/lib/tenant.ts src/lib/super-admin-session.ts
git commit -m "feat: tenant-aware session, tenant resolver, super-admin auth"
```

---

### Task 5: Rewrite Middleware for Tenant Routing

**Files:**
- Rewrite: `src/middleware.ts`

- [ ] **Step 1: Rewrite src/middleware.ts**

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets — pass through
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/manifest.json" ||
    pathname === "/logo.svg" ||
    pathname.startsWith("/icon-")
  ) {
    return NextResponse.next();
  }

  // Super-admin routes — check super-admin session
  if (pathname.startsWith("/super-admin")) {
    if (pathname === "/super-admin/login") {
      return NextResponse.next();
    }
    const superSession = request.cookies.get("kp-super-session");
    if (!superSession?.value) {
      return NextResponse.redirect(
        new URL("/super-admin/login", request.url),
      );
    }
    return NextResponse.next();
  }

  // Signup page — public
  if (pathname === "/signup") {
    return NextResponse.next();
  }

  // Login page — public (tenant resolved server-side)
  if (pathname === "/login" || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // All other routes — require tenant session
  const session = request.cookies.get("kp-session");
  if (!session?.value) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: middleware with super-admin and tenant routing"
```

---

### Task 6: Convert All Server Actions to Async PostgreSQL

**Files:**
- Modify: `src/actions/auth.ts`
- Modify: `src/actions/orders.ts`
- Modify: `src/actions/products.ts`
- Modify: `src/actions/clients.ts`
- Modify: `src/actions/firms.ts`
- Modify: `src/actions/invoices.ts`
- Modify: `src/actions/payments.ts`
- Modify: `src/actions/users.ts`
- Modify: `src/actions/order-items.ts`
- Modify: `src/actions/analytics.ts`
- Modify: `src/lib/ledger.ts`
- Modify: `src/lib/invoice-number.ts`

The pattern for every action file is the same. Replace:
```typescript
import { db, schema } from "@/db";
// synchronous: db.select().from(...).all()
```
With:
```typescript
import { withTenantDb, schema } from "@/db";
import { requireAuth, requireAdmin } from "@/lib/session";
// async: await withTenantDb(tenantId, async (db) => { ... })
```

Every function that previously called `db` directly now:
1. Gets `tenantId` from session via `requireAuth()` or `requireAdmin()`
2. Wraps DB calls in `withTenantDb(tenantId, async (db) => { ... })`
3. All `.all()` calls become awaited (PG driver is async)
4. All `.get()` calls become `.then(rows => rows[0])` (PG has no `.get()`)
5. All `.run()` calls become awaited
6. Transactions use `withTenantDb` which already wraps in BEGIN/COMMIT
7. Inserts must include `tenantId` in values

- [ ] **Step 1: Rewrite src/actions/auth.ts**

```typescript
"use server";

import { adminDb, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { verifyPin } from "@/lib/auth";
import { setSession, clearSession } from "@/lib/session";
import { resolveTenant } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function loginAction(pin: string): Promise<{ error?: string }> {
  // Resolve tenant from hostname
  const headerList = await headers();
  const host = headerList.get("host") || "";
  const tenant = await resolveTenant(host);

  if (!tenant) return { error: "Unknown tenant" };
  if (tenant.status === "pending") return { error: "Account awaiting approval" };
  if (tenant.status === "suspended") return { error: "Account suspended" };

  const activeUsers = await adminDb
    .select()
    .from(schema.users)
    .where(
      and(
        eq(schema.users.tenantId, tenant.id),
        eq(schema.users.isActive, true),
      ),
    );

  for (const user of activeUsers) {
    if (verifyPin(pin, user.pin)) {
      await setSession(tenant.id, user.id);
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

- [ ] **Step 2: Rewrite src/actions/products.ts**

```typescript
"use server";

import { withTenantDb, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getProducts(activeOnly = true) {
  const { tenantId } = await requireAdmin();
  return withTenantDb(tenantId, async (db) => {
    if (activeOnly) {
      return db
        .select()
        .from(schema.products)
        .where(eq(schema.products.isActive, true));
    }
    return db.select().from(schema.products);
  });
}

export async function getProduct(id: number) {
  const { tenantId } = await requireAdmin();
  return withTenantDb(tenantId, async (db) => {
    const rows = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, id));
    return rows[0] ?? null;
  });
}

export async function createProduct(formData: FormData) {
  const { tenantId } = await requireAdmin();

  const name = formData.get("name") as string;
  if (!name || !name.trim()) throw new Error("Product name is required");

  const defaultUnit = (formData.get("defaultUnit") as string) || "kg";
  const defaultRate = parseFloat(formData.get("defaultRate") as string) || 0;
  const hsnCode = (formData.get("hsnCode") as string) || null;
  const gstRatePercent =
    parseFloat(formData.get("gstRatePercent") as string) || 0;
  const category = (formData.get("category") as string) || null;

  await withTenantDb(tenantId, async (db) => {
    await db.insert(schema.products).values({
      tenantId,
      name: name.trim(),
      defaultUnit,
      defaultRate,
      hsnCode,
      gstRatePercent,
      category,
    });
  });

  revalidatePath("/products");
  redirect("/products");
}

export async function updateProduct(id: number, formData: FormData) {
  const { tenantId } = await requireAdmin();

  const name = formData.get("name") as string;
  if (!name || !name.trim()) throw new Error("Product name is required");

  const defaultUnit = (formData.get("defaultUnit") as string) || "kg";
  const defaultRate = parseFloat(formData.get("defaultRate") as string) || 0;
  const hsnCode = (formData.get("hsnCode") as string) || null;
  const gstRatePercent =
    parseFloat(formData.get("gstRatePercent") as string) || 0;
  const category = (formData.get("category") as string) || null;

  await withTenantDb(tenantId, async (db) => {
    await db
      .update(schema.products)
      .set({
        name: name.trim(),
        defaultUnit,
        defaultRate,
        hsnCode,
        gstRatePercent,
        category,
      })
      .where(eq(schema.products.id, id));
  });

  revalidatePath("/products");
  redirect("/products");
}

export async function toggleProductActive(id: number) {
  const { tenantId } = await requireAdmin();

  await withTenantDb(tenantId, async (db) => {
    const rows = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, id));
    const product = rows[0];
    if (!product) throw new Error("Product not found");

    await db
      .update(schema.products)
      .set({ isActive: !product.isActive })
      .where(eq(schema.products.id, id));
  });

  revalidatePath("/products");
}
```

- [ ] **Step 3: Rewrite remaining actions**

Apply the same pattern to all remaining action files. For each file:
1. Replace `import { db, schema }` with `import { withTenantDb, schema }`
2. Get `tenantId` from `requireAuth()` or `requireAdmin()`
3. Wrap all DB operations in `withTenantDb(tenantId, async (db) => { ... })`
4. Add `tenantId` to all `.insert().values({...})` calls
5. Replace `.all()` with `await` (already returns array in PG)
6. Replace `.get()` with `.then(rows => rows[0])` or index `[0]`
7. Replace `.run()` with `await`

Files to convert (same pattern as products.ts above):
- `src/actions/clients.ts`
- `src/actions/firms.ts`
- `src/actions/orders.ts` — transactions are handled by `withTenantDb` already
- `src/actions/order-items.ts`
- `src/actions/invoices.ts`
- `src/actions/payments.ts`
- `src/actions/users.ts`
- `src/actions/analytics.ts`

- [ ] **Step 4: Rewrite src/lib/ledger.ts**

Convert from sync to async and add tenantId parameter:

```typescript
import { withTenantDb, schema } from "@/db";
import { eq } from "drizzle-orm";

export interface LedgerEntry {
  date: string;
  type: "invoice" | "payment" | "opening";
  description: string;
  debit: number;
  credit: number;
  balance: number;
  referenceId?: number;
}

export async function getClientBalance(
  tenantId: number,
  clientId: number,
): Promise<number> {
  return withTenantDb(tenantId, async (db) => {
    const rows = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.id, clientId));
    const client = rows[0];
    if (!client) return 0;

    let balance = client.openingBalance ?? 0;

    const invoices = await db
      .select({ total: schema.invoices.total })
      .from(schema.invoices)
      .where(eq(schema.invoices.clientId, clientId));
    for (const inv of invoices) {
      balance += inv.total;
    }

    const payments = await db
      .select({ amount: schema.payments.amount })
      .from(schema.payments)
      .where(eq(schema.payments.clientId, clientId));
    for (const pay of payments) {
      balance -= pay.amount;
    }

    return balance;
  });
}

export async function getClientLedger(
  tenantId: number,
  clientId: number,
  fyStart?: string,
  fyEnd?: string,
): Promise<LedgerEntry[]> {
  return withTenantDb(tenantId, async (db) => {
    const rows = await db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.id, clientId));
    const client = rows[0];
    if (!client) return [];

    const entries: LedgerEntry[] = [];

    entries.push({
      date: fyStart || "0000-00-00",
      type: "opening",
      description: "Opening Balance",
      debit:
        (client.openingBalance ?? 0) > 0 ? (client.openingBalance ?? 0) : 0,
      credit:
        (client.openingBalance ?? 0) < 0
          ? Math.abs(client.openingBalance ?? 0)
          : 0,
      balance: 0,
    });

    const invoices = await db
      .select({
        id: schema.invoices.id,
        date: schema.invoices.date,
        invoiceNumber: schema.invoices.invoiceNumber,
        total: schema.invoices.total,
      })
      .from(schema.invoices)
      .where(eq(schema.invoices.clientId, clientId));

    for (const inv of invoices) {
      if (fyStart && fyEnd && (inv.date < fyStart || inv.date > fyEnd))
        continue;
      entries.push({
        date: inv.date,
        type: "invoice",
        description: `Invoice ${inv.invoiceNumber}`,
        debit: inv.total,
        credit: 0,
        balance: 0,
        referenceId: inv.id,
      });
    }

    const payments = await db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.clientId, clientId));

    for (const pay of payments) {
      if (fyStart && fyEnd && (pay.date < fyStart || pay.date > fyEnd))
        continue;
      entries.push({
        date: pay.date,
        type: "payment",
        description: `Payment (${pay.mode})${pay.notes ? " - " + pay.notes : ""}`,
        debit: 0,
        credit: pay.amount,
        balance: 0,
        referenceId: pay.id,
      });
    }

    entries.sort((a, b) => a.date.localeCompare(b.date));

    let runningBalance = 0;
    for (const entry of entries) {
      runningBalance += entry.debit - entry.credit;
      entry.balance = runningBalance;
    }

    return entries;
  });
}
```

- [ ] **Step 5: Rewrite src/lib/invoice-number.ts**

```typescript
import { withTenantDb, schema } from "@/db";
import { eq, and, like } from "drizzle-orm";
import { getFYFromDate } from "./financial-year";

export async function generateInvoiceNumber(
  tenantId: number,
  firmId: number,
  date: string,
): Promise<string> {
  return withTenantDb(tenantId, async (db) => {
    const rows = await db
      .select()
      .from(schema.firms)
      .where(eq(schema.firms.id, firmId));
    const firm = rows[0];
    if (!firm) throw new Error("Firm not found");

    const fy = getFYFromDate(new Date(date + "T00:00:00"));
    const prefix =
      firm.name
        .replace(/[^A-Za-z]/g, "")
        .substring(0, 3)
        .toUpperCase() || "INV";

    const pattern = `${prefix}/${fy.label}/%`;
    const existing = await db
      .select()
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.firmId, firmId),
          like(schema.invoices.invoiceNumber, pattern),
        ),
      );

    const nextSeq = existing.length + 1;
    return `${prefix}/${fy.label}/${String(nextSeq).padStart(3, "0")}`;
  });
}
```

- [ ] **Step 6: Update all callers of ledger and invoice-number**

Any page or action that calls `getClientBalance()`, `getClientLedger()`, or `generateInvoiceNumber()` now needs to pass `tenantId` as the first argument. These are:
- `src/actions/invoices.ts` — `getClientBalance(tenantId, clientId)` and `generateInvoiceNumber(tenantId, firmId, date)`
- `src/actions/analytics.ts` — `getClientBalance(tenantId, clientId)` in `getClientAnalytics()`
- `src/app/(app)/clients/[id]/page.tsx` — `getClientLedger(tenantId, clientId, fyStart, fyEnd)`

- [ ] **Step 7: Commit**

```bash
git add src/actions/ src/lib/ledger.ts src/lib/invoice-number.ts
git commit -m "feat: convert all actions and libs to async PG with tenant isolation"
```

---

### Task 7: Rewrite Seed Script

**Files:**
- Rewrite: `src/db/seed.ts`

- [ ] **Step 1: Rewrite src/db/seed.ts**

```typescript
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { hashSync } from "bcryptjs";
import * as schema from "./schema";

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const db = drizzle(pool, { schema });

  // Check if already seeded
  const existingAdmins = await db.select().from(schema.superAdmins);
  if (existingAdmins.length > 0) {
    console.log("Database already seeded. Skipping.");
    await pool.end();
    return;
  }

  // 1. Create super admin
  const email = process.env.SUPER_ADMIN_EMAIL || "admin@example.com";
  const password = process.env.SUPER_ADMIN_PASSWORD || "admin123";

  const [superAdmin] = await db
    .insert(schema.superAdmins)
    .values({
      name: "Ashish",
      email: email.toLowerCase(),
      password: hashSync(password, 10),
    })
    .returning();
  console.log(`Created super admin: ${superAdmin.email}`);

  // 2. Create Deepak's tenant
  const [tenant] = await db
    .insert(schema.tenants)
    .values({
      slug: "dj",
      name: "Kachaa Pakka",
      ownerName: "Deepak Jaiswal",
      ownerEmail: "deepak@example.com",
      ownerPhone: "9999999999",
      status: "active",
      subscriptionPlan: "free",
      subscriptionExpiresAt: null,
    })
    .returning();
  console.log(`Created tenant: ${tenant.name} (slug: ${tenant.slug})`);

  // 3. Map domain
  await db.insert(schema.tenantDomains).values({
    tenantId: tenant.id,
    domain: "dj.areakpi.in",
    isPrimary: true,
  });
  console.log("Mapped domain: dj.areakpi.in");

  // 4. Create default firm for Deepak
  const [firm] = await db
    .insert(schema.firms)
    .values({
      tenantId: tenant.id,
      name: "Kachaa Pakka",
      address: "Ahmedabad, Gujarat",
      phone: "9999999999",
      isGstRegistered: false,
    })
    .returning();
  console.log(`Created firm: ${firm.name}`);

  // 5. Create admin user for Deepak
  const hashedPin = hashSync("1234", 10);
  const [user] = await db
    .insert(schema.users)
    .values({
      tenantId: tenant.id,
      name: "Deepak",
      pin: hashedPin,
      role: "admin",
    })
    .returning();
  console.log(`Created admin user: ${user.name} (PIN: 1234)`);

  // 6. Create products
  const productNames = [
    "Khaman Dhokla",
    "Khandvi",
    "Stuff Khandvi",
    "Paneer Khandvi",
    "Cheese Khandvi",
    "Sandwich Khaman",
    "Paneer Khaman",
    "Cheese Khaman",
    "Dabeli Dhokla",
    "Pav Bhaji Dhokla",
    "White Dhokla",
    "Khatta Dhokla",
    "Sandwich Dhokla",
    "Tirangi Dhokla",
    "Falg Dhokla",
    "Sezwan Dhokla",
    "Kanchipuram Dhokla",
    "Corn Dhokla",
    "Corn Capsicum Dhokla",
    "Rumali Dhokla",
    "Garden Dhokla",
    "Watti Dhokla Yellow",
    "Watti Dhokla Garden",
    "Watti Dhokla White",
    "Mungdal Watti Dhokla",
    "Mungdal Dhokla",
    "Mini Idli White",
    "Mini Idli Masala",
    "Mini Idli Green",
    "Mungdal Mini Idli",
    "Kotmirwadi",
  ];

  const productValues = productNames.map((name) => ({
    tenantId: tenant.id,
    name,
    defaultUnit: "kg" as const,
    defaultRate: 0,
  }));

  await db.insert(schema.products).values(productValues);
  console.log(`Created ${productNames.length} products`);

  console.log("\nSeed complete!");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat: seed script creates super-admin + Deepak tenant with products"
```

---

## Phase 2: Super-Admin Panel

### Task 8: Super-Admin Server Actions

**Files:**
- Create: `src/actions/super-admin.ts`
- Create: `src/actions/signup.ts`

- [ ] **Step 1: Create src/actions/super-admin.ts**

```typescript
"use server";

import { adminDb, schema, withTenantDb } from "@/db";
import { eq, sql, desc } from "drizzle-orm";
import {
  requireSuperAdmin,
  superAdminLogin,
  clearSuperAdminSession,
} from "@/lib/super-admin-session";
import { setSession } from "@/lib/session";
import { hashSync } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function superAdminLoginAction(
  email: string,
  password: string,
): Promise<{ error?: string }> {
  const admin = await superAdminLogin(email, password);
  if (!admin) return { error: "Invalid email or password" };
  redirect("/super-admin");
}

export async function superAdminLogoutAction(): Promise<void> {
  await clearSuperAdminSession();
  redirect("/super-admin/login");
}

export async function getTenants() {
  await requireSuperAdmin();
  return adminDb
    .select()
    .from(schema.tenants)
    .orderBy(desc(schema.tenants.createdAt));
}

export async function getTenant(id: number) {
  await requireSuperAdmin();
  const rows = await adminDb
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, id));
  return rows[0] ?? null;
}

export async function getTenantDomains(tenantId: number) {
  await requireSuperAdmin();
  return adminDb
    .select()
    .from(schema.tenantDomains)
    .where(eq(schema.tenantDomains.tenantId, tenantId));
}

export async function getTenantUsageStats(tenantId: number) {
  await requireSuperAdmin();

  const [productsCount] = await adminDb
    .select({ count: sql<number>`count(*)` })
    .from(schema.products)
    .where(eq(schema.products.tenantId, tenantId));

  const [clientsCount] = await adminDb
    .select({ count: sql<number>`count(*)` })
    .from(schema.clients)
    .where(eq(schema.clients.tenantId, tenantId));

  const [ordersCount] = await adminDb
    .select({ count: sql<number>`count(*)` })
    .from(schema.orders)
    .where(eq(schema.orders.tenantId, tenantId));

  const [invoicesCount] = await adminDb
    .select({ count: sql<number>`count(*)` })
    .from(schema.invoices)
    .where(eq(schema.invoices.tenantId, tenantId));

  return {
    products: productsCount?.count ?? 0,
    clients: clientsCount?.count ?? 0,
    orders: ordersCount?.count ?? 0,
    invoices: invoicesCount?.count ?? 0,
  };
}

export async function getSubscriptionPayments(tenantId: number) {
  await requireSuperAdmin();
  return adminDb
    .select()
    .from(schema.subscriptionPayments)
    .where(eq(schema.subscriptionPayments.tenantId, tenantId))
    .orderBy(desc(schema.subscriptionPayments.createdAt));
}

export async function approveTenant(tenantId: number) {
  const admin = await requireSuperAdmin();

  await adminDb
    .update(schema.tenants)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(schema.tenants.id, tenantId));

  // Create default admin user with PIN 1234
  const tenant = await getTenant(tenantId);
  if (tenant) {
    const hashedPin = hashSync("1234", 10);
    await adminDb.insert(schema.users).values({
      tenantId,
      name: tenant.ownerName,
      pin: hashedPin,
      role: "admin",
    });

    // Create default firm
    await adminDb.insert(schema.firms).values({
      tenantId,
      name: tenant.name,
      address: "",
      phone: tenant.ownerPhone ?? "",
    });
  }

  revalidatePath("/super-admin/tenants");
  revalidatePath(`/super-admin/tenants/${tenantId}`);
}

export async function suspendTenant(tenantId: number) {
  await requireSuperAdmin();
  await adminDb
    .update(schema.tenants)
    .set({ status: "suspended", updatedAt: new Date() })
    .where(eq(schema.tenants.id, tenantId));
  revalidatePath("/super-admin/tenants");
}

export async function reactivateTenant(tenantId: number) {
  await requireSuperAdmin();
  await adminDb
    .update(schema.tenants)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(schema.tenants.id, tenantId));
  revalidatePath("/super-admin/tenants");
}

export async function updateTenantSubscription(
  tenantId: number,
  formData: FormData,
) {
  const admin = await requireSuperAdmin();
  const plan = formData.get("plan") as string;
  const expiresAt = formData.get("expiresAt") as string;

  await adminDb
    .update(schema.tenants)
    .set({
      subscriptionPlan: plan as "free" | "monthly" | "yearly",
      subscriptionExpiresAt: expiresAt ? new Date(expiresAt) : null,
      updatedAt: new Date(),
    })
    .where(eq(schema.tenants.id, tenantId));

  revalidatePath(`/super-admin/tenants/${tenantId}`);
}

export async function recordSubscriptionPayment(
  tenantId: number,
  formData: FormData,
) {
  const admin = await requireSuperAdmin();
  const amount = formData.get("amount") as string;
  const date = formData.get("date") as string;
  const mode = formData.get("mode") as string;
  const notes = formData.get("notes") as string;

  await adminDb.insert(schema.subscriptionPayments).values({
    tenantId,
    amount,
    date,
    mode: mode as "cash" | "upi" | "bank",
    notes: notes || null,
    recordedBy: admin.id,
  });

  revalidatePath(`/super-admin/tenants/${tenantId}`);
}

export async function createTenantManually(formData: FormData) {
  const admin = await requireSuperAdmin();

  const slug = (formData.get("slug") as string).toLowerCase().trim();
  const name = formData.get("name") as string;
  const ownerName = formData.get("ownerName") as string;
  const ownerEmail = formData.get("ownerEmail") as string;
  const ownerPhone = (formData.get("ownerPhone") as string) || "";
  const plan = (formData.get("plan") as string) || "free";
  const expiresAt = formData.get("expiresAt") as string;

  // Validate slug
  if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(slug)) {
    throw new Error(
      "Slug must be 3-30 chars, lowercase alphanumeric and hyphens",
    );
  }
  const reserved = ["admin", "www", "api", "super-admin", "signup", "login"];
  if (reserved.includes(slug)) {
    throw new Error("This slug is reserved");
  }

  const [tenant] = await adminDb
    .insert(schema.tenants)
    .values({
      slug,
      name,
      ownerName,
      ownerEmail: ownerEmail.toLowerCase(),
      ownerPhone,
      status: "active",
      subscriptionPlan: plan as "free" | "monthly" | "yearly",
      subscriptionExpiresAt: expiresAt ? new Date(expiresAt) : null,
    })
    .returning();

  // Create default admin user
  const hashedPin = hashSync("1234", 10);
  await adminDb.insert(schema.users).values({
    tenantId: tenant.id,
    name: ownerName,
    pin: hashedPin,
    role: "admin",
  });

  // Create default firm
  await adminDb.insert(schema.firms).values({
    tenantId: tenant.id,
    name,
    address: "",
    phone: ownerPhone,
  });

  revalidatePath("/super-admin/tenants");
  redirect("/super-admin/tenants");
}

export async function impersonateTenant(tenantId: number) {
  await requireSuperAdmin();

  // Find the admin user for this tenant
  const rows = await adminDb
    .select()
    .from(schema.users)
    .where(eq(schema.users.tenantId, tenantId));

  const adminUser = rows.find((u) => u.role === "admin" && u.isActive);
  if (!adminUser) throw new Error("No active admin user for this tenant");

  // Set impersonation session
  await setSession(tenantId, adminUser.id, true);
  redirect("/calendar");
}

export async function getDashboardStats() {
  await requireSuperAdmin();

  const tenantsByStatus = await adminDb
    .select({
      status: schema.tenants.status,
      count: sql<number>`count(*)`,
    })
    .from(schema.tenants)
    .groupBy(schema.tenants.status);

  const [totalOrders] = await adminDb
    .select({ count: sql<number>`count(*)` })
    .from(schema.orders);

  const pendingTenants = await adminDb
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.status, "pending"))
    .orderBy(desc(schema.tenants.createdAt));

  return {
    tenantsByStatus: Object.fromEntries(
      tenantsByStatus.map((r) => [r.status, r.count]),
    ),
    totalOrders: totalOrders?.count ?? 0,
    pendingTenants,
  };
}
```

- [ ] **Step 2: Create src/actions/signup.ts**

```typescript
"use server";

import { adminDb, schema } from "@/db";
import { redirect } from "next/navigation";

export async function signupAction(
  formData: FormData,
): Promise<{ error?: string }> {
  const slug = (formData.get("slug") as string).toLowerCase().trim();
  const name = formData.get("name") as string;
  const ownerName = formData.get("ownerName") as string;
  const ownerEmail = formData.get("ownerEmail") as string;
  const ownerPhone = (formData.get("ownerPhone") as string) || "";

  // Validate slug
  if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(slug)) {
    return {
      error: "Subdomain must be 3-30 chars, lowercase letters, numbers, hyphens",
    };
  }
  const reserved = ["admin", "www", "api", "super-admin", "signup", "login"];
  if (reserved.includes(slug)) {
    return { error: "This subdomain is not available" };
  }

  // Check if slug is taken
  const existing = await adminDb
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, slug));
  if (existing.length > 0) {
    return { error: "This subdomain is already taken" };
  }

  await adminDb.insert(schema.tenants).values({
    slug,
    name,
    ownerName,
    ownerEmail: ownerEmail.toLowerCase(),
    ownerPhone,
    status: "pending",
    subscriptionPlan: "free",
  });

  redirect("/signup?success=true");
}
```

- [ ] **Step 3: Commit**

```bash
git add src/actions/super-admin.ts src/actions/signup.ts
git commit -m "feat: super-admin actions and tenant signup"
```

---

### Task 9: Super-Admin UI Pages

**Files:**
- Create: `src/app/super-admin/layout.tsx`
- Create: `src/app/super-admin/login/page.tsx`
- Create: `src/app/super-admin/page.tsx`
- Create: `src/app/super-admin/tenants/page.tsx`
- Create: `src/app/super-admin/tenants/[id]/page.tsx`
- Create: `src/app/super-admin/tenants/[id]/impersonate/route.ts`
- Create: `src/app/super-admin/tenants/new/page.tsx`
- Create: `src/components/super-admin/impersonation-banner.tsx`
- Create: `src/app/signup/page.tsx`

This task creates the super-admin UI. Each page follows the existing design system (Tailwind + dark mode). The pages are straightforward CRUD — tenant list, detail, create, dashboard stats.

- [ ] **Step 1: Create super-admin layout**

`src/app/super-admin/layout.tsx` — standalone layout (no sidebar/bottom-nav from tenant app). Simple header with "Kachaa Pakka Admin" + logout button. White/dark background.

- [ ] **Step 2: Create super-admin login page**

`src/app/super-admin/login/page.tsx` — email + password form, calls `superAdminLoginAction()`. Styled similarly to tenant PIN login but with email/password fields.

- [ ] **Step 3: Create super-admin dashboard**

`src/app/super-admin/page.tsx` — calls `getDashboardStats()`. Shows: stat cards (active/pending/expired/suspended tenant counts, total orders), pending signups list with approve buttons.

- [ ] **Step 4: Create tenant list page**

`src/app/super-admin/tenants/page.tsx` — calls `getTenants()`. Table with: name, slug, status badge, plan, expiry, actions (view, impersonate). Link to "Add Tenant" page.

- [ ] **Step 5: Create tenant detail page**

`src/app/super-admin/tenants/[id]/page.tsx` — calls `getTenant()`, `getTenantUsageStats()`, `getTenantDomains()`, `getSubscriptionPayments()`. Shows: owner info, usage stats, subscription form, payment log, action buttons (approve/suspend/impersonate).

- [ ] **Step 6: Create impersonate route**

`src/app/super-admin/tenants/[id]/impersonate/route.ts` — GET handler that calls `impersonateTenant(id)`.

- [ ] **Step 7: Create manual tenant creation page**

`src/app/super-admin/tenants/new/page.tsx` — form with: slug, business name, owner name, email, phone, plan, expiry date. Calls `createTenantManually()`.

- [ ] **Step 8: Create impersonation banner**

`src/components/super-admin/impersonation-banner.tsx` — client component that checks session for `impersonating: true`. Shows a fixed top banner: "Viewing as: [Tenant Name]" + exit button that clears the session and redirects to `/super-admin`.

Add this banner to `src/app/(app)/layout.tsx`.

- [ ] **Step 9: Create signup page**

`src/app/signup/page.tsx` — public form: business name, subdomain slug, owner name, email, phone. Shows success message after submission. Calls `signupAction()`.

- [ ] **Step 10: Commit**

```bash
git add src/app/super-admin/ src/app/signup/ src/components/super-admin/
git commit -m "feat: super-admin panel UI and tenant signup page"
```

---

### Task 10: Update Tenant App Pages for Async DB

**Files:**
- Modify: All page files in `src/app/(app)/` that call server actions

Since server actions are now async and return promises, any page that calls them with `await` already works. The main changes needed:

- [ ] **Step 1: Update order form data fetching**

`src/app/(app)/orders/new/page.tsx` and `src/app/(app)/orders/[id]/edit/page.tsx` — these fetch products and clients lists for the form. Ensure they call the updated async actions.

- [ ] **Step 2: Update client detail page**

`src/app/(app)/clients/[id]/page.tsx` — calls `getClientLedger()` which now needs `tenantId`. Get it from `requireAuth()`.

- [ ] **Step 3: Update backup/restore**

`src/app/(app)/settings/backup/` — replace SQLite file download with PG dump per tenant (or remove this feature for now and add a note that backups are managed by the admin).

- [ ] **Step 4: Test all pages load correctly**

Navigate through: login → calendar → day view → new order → products → clients → client detail → analytics → settings.

- [ ] **Step 5: Commit**

```bash
git add src/app/
git commit -m "feat: update all tenant pages for async PG queries"
```

---

## Phase 3: Server Setup Scripts

### Task 11: Server Provisioning Scripts

**Files:**
- Create: `scripts/setup/setup.sh`
- Create: `scripts/setup/setup-system.sh`
- Create: `scripts/setup/setup-node.sh`
- Create: `scripts/setup/setup-postgres.sh`
- Create: `scripts/setup/setup-nginx.sh`
- Create: `scripts/setup/setup-ssl.sh`
- Create: `scripts/setup/setup-app.sh`
- Create: `scripts/setup/setup-backups.sh`

- [ ] **Step 1: Create master setup.sh**

Interactive script that prompts for: app domain, SaaS domain (optional), PG password, super-admin email/password, app port. Saves answers to `/etc/kachaapakka/config.env`. Calls sub-scripts in order.

- [ ] **Step 2: Create setup-system.sh**

apt update, install essentials (curl, git, build-essential, ufw), configure UFW (22, 80, 443), add swap if < 2GB RAM.

- [ ] **Step 3: Create setup-node.sh**

Install nvm, Node.js 24 LTS, PM2 globally, PM2 startup hook.

- [ ] **Step 4: Create setup-postgres.sh**

Install PostgreSQL, create `kachaapakka` database, create `kachaapakka_app` user with password (NOT superuser — so RLS is enforced), configure `pg_hba.conf` for local md5 auth, restart PG.

- [ ] **Step 5: Create setup-nginx.sh**

Install Nginx. Generate config for single domain or wildcard. Reverse proxy to app port. Enable gzip, rate limiting. Symlink to sites-enabled.

- [ ] **Step 6: Create setup-ssl.sh**

Install certbot + nginx plugin. For single domain: `certbot --nginx -d domain`. For wildcard: instructions for DNS challenge. Auto-renewal via systemd timer (default with certbot).

- [ ] **Step 7: Create setup-app.sh**

Clone repo (or pull if exists), npm install, copy `.env` from config, run `npx drizzle-kit push`, run `npx tsx src/db/rls.ts`, run `npm run db:seed`, run `npm run build`, PM2 start/restart.

- [ ] **Step 8: Create setup-backups.sh**

Create `/var/backups/kachaapakka/`, write cron job: daily at 2am `pg_dump kachaapakka | gzip > /var/backups/kachaapakka/backup-$(date +%Y%m%d).sql.gz`, delete backups older than 30 days.

- [ ] **Step 9: Make all scripts executable and test**

```bash
chmod +x scripts/setup/*.sh
```

- [ ] **Step 10: Commit**

```bash
git add scripts/setup/
git commit -m "feat: server provisioning scripts (system, node, PG, nginx, SSL, app, backups)"
```

---

### Task 12: SQLite to PostgreSQL Migration Script

**Files:**
- Create: `scripts/migrate-sqlite-to-pg.ts`

- [ ] **Step 1: Create migration script**

```typescript
import Database from "better-sqlite3";
import { Pool } from "pg";
import path from "path";

const SQLITE_PATH = process.argv[2] || path.join(process.cwd(), "data", "dj.db");
const TENANT_SLUG = process.argv[3] || "dj";
const DOMAIN = process.argv[4] || "dj.areakpi.in";

async function migrate() {
  console.log(`Migrating SQLite (${SQLITE_PATH}) → PG tenant "${TENANT_SLUG}"...`);

  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check if tenant already exists
    const existing = await client.query(
      "SELECT id FROM tenants WHERE slug = $1",
      [TENANT_SLUG],
    );
    if (existing.rows.length > 0) {
      console.log(`Tenant "${TENANT_SLUG}" already exists. Skipping.`);
      return;
    }

    // Create tenant
    const { rows: [tenant] } = await client.query(
      `INSERT INTO tenants (slug, name, owner_name, owner_email, owner_phone, status, subscription_plan)
       VALUES ($1, 'Kachaa Pakka', 'Deepak Jaiswal', 'deepak@example.com', '9999999999', 'active', 'free')
       RETURNING id`,
      [TENANT_SLUG],
    );
    const tenantId = tenant.id;
    console.log(`Created tenant id=${tenantId}`);

    // Map domain
    await client.query(
      "INSERT INTO tenant_domains (tenant_id, domain, is_primary) VALUES ($1, $2, true)",
      [tenantId, DOMAIN],
    );

    // Migrate tables in FK order
    const tables = [
      { sqlite: "firms", pg: "firms", idCol: "id" },
      { sqlite: "users", pg: "users", idCol: "id" },
      { sqlite: "products", pg: "products", idCol: "id" },
      { sqlite: "clients", pg: "clients", idCol: "id" },
      { sqlite: "orders", pg: "orders", idCol: "id" },
      { sqlite: "order_items", pg: "order_items", idCol: "id" },
      { sqlite: "invoices", pg: "invoices", idCol: "id" },
      { sqlite: "payments", pg: "payments", idCol: "id" },
    ];

    for (const table of tables) {
      const rows = sqlite.prepare(`SELECT * FROM ${table.sqlite}`).all() as Record<string, unknown>[];
      if (rows.length === 0) {
        console.log(`  ${table.pg}: 0 rows (empty)`);
        continue;
      }

      for (const row of rows) {
        const cols = Object.keys(row);
        const pgCols = [...cols, "tenant_id"];
        const placeholders = pgCols.map((_, i) => `$${i + 1}`).join(", ");
        const values = [...cols.map((c) => row[c]), tenantId];

        await client.query(
          `INSERT INTO ${table.pg} (${pgCols.join(", ")}) VALUES (${placeholders})`,
          values,
        );
      }

      // Reset sequence
      const maxId = Math.max(...rows.map((r) => r[table.idCol] as number));
      await client.query(
        `SELECT setval(pg_get_serial_sequence('${table.pg}', '${table.idCol}'), $1)`,
        [maxId],
      );

      console.log(`  ${table.pg}: ${rows.length} rows migrated`);
    }

    await client.query("COMMIT");
    console.log("\nMigration complete!");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
    sqlite.close();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Add migration script to package.json**

```json
"db:migrate-sqlite": "npx tsx scripts/migrate-sqlite-to-pg.ts"
```

- [ ] **Step 3: Commit**

```bash
git add scripts/migrate-sqlite-to-pg.ts package.json
git commit -m "feat: SQLite to PG migration script for existing tenants"
```

---

### Task 13: Final Integration & Deploy

**Files:**
- Modify: `package.json` (scripts)
- Update: `src/app/(app)/layout.tsx` (impersonation banner)

- [ ] **Step 1: Update package.json scripts**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "db:seed": "npx tsx src/db/seed.ts",
    "db:push": "npx drizzle-kit push",
    "db:generate": "npx drizzle-kit generate",
    "db:studio": "npx drizzle-kit studio",
    "db:rls": "npx tsx src/db/rls.ts",
    "db:migrate-sqlite": "npx tsx scripts/migrate-sqlite-to-pg.ts"
  }
}
```

- [ ] **Step 2: Set up local PostgreSQL for development**

```bash
createdb kachaapakka
createuser kachaapakka_app -P  # set password
psql kachaapakka -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO kachaapakka_app;"
psql kachaapakka -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO kachaapakka_app;"
```

- [ ] **Step 3: Run initial migration and seed locally**

```bash
npx drizzle-kit push
npm run db:rls
npm run db:seed
```

- [ ] **Step 4: Test locally**

```bash
npm run dev
```

Test: login at localhost:3000 (tenant resolution will need a local domain or host override).

- [ ] **Step 5: Deploy to server**

```bash
git push origin main
ssh nuremberg
cd /var/www/dj
git pull
npm install
# Set up .env with DATABASE_URL
npx drizzle-kit push
npm run db:rls
# Migrate existing SQLite data
npm run db:migrate-sqlite
npm run build
pm2 restart dj-foods
```

- [ ] **Step 6: Verify production**

- `dj.areakpi.in` → Deepak's tenant loads, PIN 1234 works
- `dj.areakpi.in/super-admin` → admin login works
- All existing data migrated correctly

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: multi-tenancy complete — PG + RLS + super-admin + setup scripts"
```

---

## Pending / Future Work

- [ ] Buy `kachaapakka.com` domain and configure wildcard DNS
- [ ] Set `SAAS_DOMAIN=kachaapakka.com` in .env
- [ ] Move super-admin to `admin.kachaapakka.com`
- [ ] Add email notifications (signup, approval, expiry warning)
- [ ] Add payment gateway (Razorpay) for self-service subscriptions
- [ ] Per-tenant file storage (signatures, logos) in `/data/tenants/{slug}/`
- [ ] Tenant data export (GDPR compliance)
- [ ] Rate limiting per tenant
