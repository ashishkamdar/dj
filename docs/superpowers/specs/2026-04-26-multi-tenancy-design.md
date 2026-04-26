# Kachaa Pakka — Multi-Tenancy Design Spec

**Date:** 2026-04-26
**Project:** Kachaa Pakka (formerly DJ Foods)
**Repo:** https://github.com/ashishkamdar/dj
**Owner:** Ashish Kamdar (platform owner), Deepak Jaiswal (first tenant)

---

## 1. Overview

Transform Kachaa Pakka from a single-tenant SQLite app into a multi-tenant SaaS product backed by PostgreSQL with Row-Level Security (RLS). Each tenant (a food business like Deepak's) gets a fully isolated instance with their own firms, products, clients, orders, invoices, and payments — all within a shared PostgreSQL database with engine-level data isolation.

**Current state:** Single-tenant on `dj.areakpi.in`, SQLite, PIN auth, ~85 source files.

**Target state:** Multi-tenant on PostgreSQL + RLS, subdomain-based tenant routing, super-admin panel, server provisioning scripts, smooth domain migration path.

---

## 2. Domain Architecture

### Current
- `areakpi.in` — Ashish's firm website (untouched)
- `dj.areakpi.in` — Deepak's instance (already live)

### Now (after this work)
- `dj.areakpi.in` — Deepak's tenant (mapped via `tenant_domains` table)
- `dj.areakpi.in/super-admin` — Ashish's super-admin panel (separate email+password auth)

### Future (when kachaapakka.com is purchased)
- `kachaapakka.com` — Landing page + signup
- `*.kachaapakka.com` — Tenant instances (wildcard DNS + SSL)
- `admin.kachaapakka.com` — Super-admin panel (moved from path-based)
- `dj.areakpi.in` — Continues working for Deepak (custom domain mapping, no disruption)

### Tenant Domain Resolution
A `tenant_domains` table maps full hostnames to tenants. Middleware resolution order:
1. Check `tenant_domains` for exact hostname match
2. If no match, extract subdomain from configured `SAAS_DOMAIN` env var
3. If neither, show landing/signup page

This means:
- Custom domains work by inserting a row (e.g., `dj.areakpi.in` → tenant 1)
- SaaS subdomains work automatically (e.g., `rajan.kachaapakka.com` → slug `rajan`)
- Transition to `kachaapakka.com` requires only setting `SAAS_DOMAIN` env var + DNS

---

## 3. Database Architecture

### PostgreSQL + Row-Level Security

Single database `kachaapakka` on the Nuremberg server. All tenant data in a shared schema with `tenant_id` columns. RLS policies enforce isolation at the engine level.

### Central Tables (no tenant_id)

#### tenants
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| slug | text UNIQUE | Subdomain identifier, e.g., `dj` |
| name | text | Business name, e.g., "Deepak Foods" |
| owner_name | text | Owner's name |
| owner_email | text | For notifications |
| owner_phone | text | |
| status | text | pending / active / expired / suspended |
| subscription_plan | text | free / monthly / yearly |
| subscription_expires_at | timestamptz | null = no expiry (free tier) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### super_admins
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| name | text | |
| email | text UNIQUE | |
| password | text | bcrypt hashed |
| created_at | timestamptz | |

#### tenant_domains
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| tenant_id | integer FK → tenants | |
| domain | text UNIQUE | Full hostname, e.g., `dj.areakpi.in` |
| is_primary | boolean | Default: true |
| created_at | timestamptz | |

#### subscription_payments
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| tenant_id | integer FK → tenants | |
| amount | numeric | |
| date | date | |
| mode | text | cash / upi / bank |
| notes | text | e.g., "Paid for 1 year" |
| recorded_by | integer FK → super_admins | |
| created_at | timestamptz | |

### Tenant-Scoped Tables (all get tenant_id)

Existing tables with `tenant_id integer NOT NULL REFERENCES tenants(id)` added:
- `firms`
- `users`
- `products`
- `clients`
- `orders`
- `order_items`
- `invoices`
- `payments`

All columns remain the same as the current SQLite schema. The only addition is `tenant_id`.

### Row-Level Security Policies

Applied to every tenant-scoped table:

```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id')::int)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::int);
```

Each request sets `SET LOCAL app.tenant_id = X` within a transaction. RLS ensures:
- SELECT only returns rows for the current tenant
- INSERT/UPDATE/DELETE only affects the current tenant's rows
- Even buggy application code cannot leak data across tenants

A separate PG role for the app user (not superuser) ensures RLS cannot be bypassed.

---

## 4. Request Flow & Tenant Resolution

```
Browser: dj.areakpi.in/calendar
    |
Nginx: proxy to app on port 3456
    |
Next.js Middleware:
    1. Read Host header -> "dj.areakpi.in"
    2. Check tenant_domains table -> tenant_id = 1
    3. Check tenant status:
       - pending -> show "Awaiting approval" page
       - suspended -> show "Account suspended" page
       - expired -> set read-only flag in cookie
       - active -> proceed
    4. If path starts with /super-admin -> check super_admin auth
    |
Server Action / Page:
    1. Read tenantId from session cookie
    2. Begin PG transaction
    3. SET LOCAL app.tenant_id = 1
    4. Run queries (RLS filters automatically)
    5. Commit
```

### Session Cookie
- Cookie name: `kp-session`
- Payload: `{ tenantId: number, userId: number, ts: number }`
- Base64 encoded, httpOnly, sameSite: lax, 7-day expiry
- Super-admin uses a separate cookie: `kp-super-session`

---

## 5. Authentication

### Tenant Users (PIN login)
- Unchanged from current flow
- PIN login on the tenant's subdomain
- Subdomain identifies the tenant, PIN identifies the user within that tenant
- PINs only need to be unique within a tenant (two tenants can have the same PIN)

### Super-Admin (email + password)
- Separate login at `/super-admin/login`
- Email + password (bcrypt)
- Separate session cookie (`kp-super-session`)
- Cannot use PIN login, cannot be confused with tenant users

### Impersonation
- Super-admin clicks "Login as" on a tenant from the admin panel
- System creates a temporary tenant session cookie with a flag: `impersonating: true`
- App shows a banner: "Viewing as: [Tenant Name] — Exit"
- Exit button clears the tenant session and returns to super-admin panel
- Impersonation sessions have a shorter expiry (1 hour)

---

## 6. Tenant Lifecycle

### Registration Flow
1. Visitor goes to landing page (future: `kachaapakka.com`, current: hidden/manual)
2. Fills in: business name, desired subdomain slug, owner name, email, phone
3. Slug validated: lowercase alphanumeric + hyphens, 3-30 chars, not reserved (admin, www, api, super-admin)
4. Tenant created with `status: pending`
5. Ashish sees it in super-admin panel
6. Ashish clicks "Approve"
7. System creates owner user (default PIN 1234), seeds empty data
8. Tenant can now access `slug.kachaapakka.com` (or custom domain if mapped)

### Tenant Statuses

| Status | Can login? | Can create data? | How it's set |
|--------|-----------|-----------------|--------------|
| pending | No — "Awaiting approval" page | No | On signup |
| active | Yes | Yes | Approved by super-admin |
| expired | Yes | No — read-only mode, renewal banner | subscription_expires_at passed |
| suspended | No — "Account suspended" page | No | Manually by super-admin |

### Subscription Tracking
- Manual — super-admin sets plan + expiry from admin panel
- No payment gateway integration
- `subscription_payments` table logs manual entries (date, amount, mode, notes)
- `subscription_expires_at: null` means free / no expiry (Deepak's case)
- Middleware checks expiry on each request

---

## 7. Super-Admin Panel

**Access:** `dj.areakpi.in/super-admin` (later: `admin.kachaapakka.com`)
**Auth:** Email + password, separate from tenant auth

### Dashboard
- Total tenants by status (active / pending / expired / suspended)
- Total orders across all tenants (today / this month)
- Total revenue tracked
- Recent signups awaiting approval

### Tenant List
- Searchable/filterable table
- Columns: name, slug, status, plan, expiry, last active, orders count
- Quick actions: approve, suspend, impersonate

### Tenant Detail
- Owner info (name, email, phone)
- Usage stats: products, clients, orders (month/total), invoices generated, last active
- Subscription: plan, start, expiry
- Payment history log
- Domain mappings
- Actions: impersonate, suspend/reactivate, extend subscription, edit details

### Impersonate
- "Login as" button on tenant detail
- Drops into tenant app as their admin user
- Banner with "Viewing as: [Name]" + exit button
- 1-hour session limit

### Manual Tenant Creation
- Form: business name, slug, owner name, email, phone, plan, expiry
- Creates tenant as `active` immediately (skips pending)
- Creates owner user with default PIN

---

## 8. Codebase Changes

### Database Layer (src/db/)
- `index.ts` — Replace SQLite singleton with PG connection pool (`node-postgres`). Export `getTenantDb(tenantId)` that returns a Drizzle instance with `SET LOCAL app.tenant_id` applied. Export `getAdminDb()` for super-admin queries (no RLS, connects as admin role).
- `schema.ts` — Add `tenantId` to all tenant-scoped tables. Add new tables: `tenants`, `superAdmins`, `tenantDomains`, `subscriptionPayments`.
- `seed.ts` — Seed super-admin account + Deepak's tenant with his data.
- `migrate.ts` — Drizzle migration runner.

### Middleware (src/middleware.ts)
- Hostname-based tenant resolution (tenant_domains first, then SAAS_DOMAIN subdomain)
- Tenant status checks (pending/suspended/expired/active)
- `/super-admin/*` routing to separate auth flow
- Read-only flag for expired tenants

### Session (src/lib/session.ts)
- Cookie: `kp-session` with `{ tenantId, userId, ts }`
- New: `kp-super-session` for super-admin
- New: `requireSuperAdmin()` guard
- `getSession()` returns `tenantId` alongside user info

### Server Actions (src/actions/*.ts)
- Replace `import { db } from "@/db"` with tenant-aware DB access
- Pattern: `const { tenantId } = await requireAuth(); const db = getTenantDb(tenantId);`
- No manual `WHERE tenant_id = ?` — RLS handles it
- Inserts must include `tenantId` in values (RLS WITH CHECK enforces this)

### New Routes
- `/super-admin/` — Dashboard
- `/super-admin/login` — Email + password login
- `/super-admin/tenants` — Tenant list
- `/super-admin/tenants/[id]` — Tenant detail
- `/super-admin/tenants/[id]/impersonate` — Start impersonation
- `/super-admin/tenants/new` — Manual tenant creation
- `/signup` — Self-service registration (can be hidden initially)

### What Stays the Same
- All UI components (buttons, inputs, cards, modals, etc.)
- Order form, calendar view, day view
- Invoice PDF generation (Non-GST, GST, Catering)
- Analytics pages
- Product/client/firm CRUD UI
- PIN login UI
- Dark/light theme
- Hindi/English i18n

---

## 9. Server Setup Scripts

A set of scripts in `scripts/setup/` that provision a fresh Ubuntu server:

### scripts/setup/setup.sh (master)
Interactive entrypoint. Prompts for domain, DB password, super-admin credentials, app port. Calls sub-scripts in order.

### scripts/setup/setup-system.sh
- apt update/upgrade
- Install essential packages (curl, git, build-essential, ufw)
- Configure UFW: allow 22, 80, 443
- Configure swap if < 2GB RAM

### scripts/setup/setup-node.sh
- Install nvm + Node.js 24 LTS
- Install PM2 globally

### scripts/setup/setup-postgres.sh
- Install PostgreSQL
- Create database `kachaapakka`
- Create app user with limited privileges (not superuser — so RLS is enforced)
- Enable RLS on all tenant-scoped tables
- Configure pg_hba.conf for local connections

### scripts/setup/setup-nginx.sh
- Install Nginx
- Generate reverse proxy config for the app
- Support single domain (e.g., `dj.areakpi.in`) or wildcard (`*.kachaapakka.com`)
- Rate limiting
- Gzip compression
- WebSocket support (for HMR in dev, not needed in prod but harmless)

### scripts/setup/setup-ssl.sh
- Install certbot
- Single domain cert (for `dj.areakpi.in`)
- Wildcard cert support when SaaS domain is configured (DNS challenge via Cloudflare or manual)
- Auto-renewal cron

### scripts/setup/setup-app.sh
- Clone repo
- npm install
- Copy `.env` from template with prompted values
- Run Drizzle migrations
- Seed super-admin + initial tenant
- npm run build
- PM2 start with startup hook

### scripts/setup/setup-backups.sh
- Daily `pg_dump` cron at 2am
- Stored in `/var/backups/kachaapakka/`
- Keep last 30 days, delete older
- Optional: compress with gzip

### Idempotency
All scripts check if their component is already installed/configured before acting. Safe to re-run on an existing server.

---

## 10. Migration Strategy (SQLite to PostgreSQL)

### scripts/migrate-sqlite-to-pg.ts
Node.js script using better-sqlite3 (read) and pg (write).

**Steps:**
1. Read SQLite `data/dj.db`
2. Create tenant record: `slug: dj, name: Kachaa Pakka, status: active, subscription_expires_at: null`
3. Insert domain mapping: `dj.areakpi.in` → tenant 1
4. Migrate tables in FK order: firms → users → products → clients → orders → order_items → invoices → payments
5. Add `tenant_id` to every row
6. Reset PG sequences to max(id) + 1
7. Verify row counts match

**Safety:**
- Runs in a single PG transaction (all or nothing)
- Checks if tenant `dj` already exists (idempotent)
- Does not delete the SQLite file
- Prints summary: rows migrated per table

**Downtime:** Stop app → run migration (~seconds) → deploy PG-backed code → start app. Under 2 minutes.

---

## 11. Environment Variables

```env
# Database
DATABASE_URL=postgres://kachaapakka_app:password@localhost/kachaapakka

# Domain
SAAS_DOMAIN=          # empty for now, set to kachaapakka.com later

# Super Admin (seeded on first run)
SUPER_ADMIN_EMAIL=ashish@areakpi.in
SUPER_ADMIN_PASSWORD=           # set during setup

# App
PORT=3456
NODE_ENV=production
```

---

## 12. Out of Scope

- Payment gateway integration (Razorpay, Stripe) — manual tracking for now
- Email notifications (signup confirmation, approval, expiry warnings) — future
- Tenant-level theming/branding (custom logo per tenant) — future
- API access / webhooks — future
- Rate limiting per tenant — future (Nginx global rate limiting covers basics)
- Tenant data export/deletion (GDPR) — future
