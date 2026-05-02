# Deepak's Food Business Management System — Implementation Plan

**Goal:** Build a mobile-first Next.js + SQLite app for Deepak's wholesale food business — calendar-based order entry with automated GST/non-GST/catering invoice PDF generation.

**Architecture:** Next.js App Router with server actions. SQLite via better-sqlite3 + Drizzle ORM. Cookie-based PIN auth. @react-pdf/renderer for invoice PDFs. Catalyst Tailwind UI components for styling. Mobile-first with bottom tab navigation, dark/light theme via next-themes.

**Tech Stack:** Next.js, TypeScript, SQLite/better-sqlite3, Drizzle ORM, Tailwind CSS 4, @heroicons/react, next-themes, @react-pdf/renderer, next-intl

**Live URL:** https://dj.areakpi.in
**Repo:** https://github.com/ashishkamdar/dj
**Server:** ssh nuremberg → /var/www/dj (PM2: dj-foods, port 3456, nginx proxy)

---

## Status: All Phases Complete (as of 2026-04-22)

Total commits: 32 | Source files: ~85 | Production build passing

---

## Phase 1: Project Foundation — DONE

- [x] **Task 1: Scaffold Next.js Project** — Next.js with TypeScript, Tailwind v4, dark mode, ThemeProvider
- [x] **Task 2: Database Schema** — Drizzle ORM, 8 tables (firms, products, clients, users, orders, order_items, invoices, payments), WAL mode, foreign keys
- [x] **Task 3: Seed Data** — Default firm "DJ Foods", admin user "Deepak" (PIN 1234), 5 starter products
- [x] **Task 4: Utility Functions** — cn(), formatCurrency (INR), formatDate, financial year helpers (Apr-Mar), amountToWords (Indian numbering)
- [x] **Task 5: Authentication** — PIN hashing (bcryptjs), cookie sessions (7-day), middleware redirect, requireAuth/requireAdmin
- [x] **Task 6: PIN Login Screen** — Number pad UI, 6 PIN dots with animation, error display
- [x] **Task 7: App Shell** — Mobile bottom nav (4 tabs), desktop sidebar (xl+), theme toggle, authenticated layout

## Phase 2: Core Data Management — DONE

- [x] **Task 8: Reusable UI Components** — 13 components: Button, Input, Select, Badge, Card, Modal, EmptyState, SectionHeading, SearchInput, StatCard, Toggle, Spinner, Notification
- [x] **Task 9: Products CRUD** — Server actions, list page (mobile cards + desktop table), add/edit forms, HSN/GST fields
- [x] **Task 10: Clients CRUD** — Server actions with search, list page, detail page with ledger, add/edit forms, recurring flag

## Phase 3: Calendar & Orders — DONE

- [x] **Task 11: Calendar View** — Monthly grid with order count dots, month navigation, today highlight, Catalyst styling
- [x] **Task 12: Day View & Order Entry** — Day view with stats row, order cards with edit/invoice/share icons, FAB for new order, dynamic line items form with auto-fill rates
- [x] **Task 12B: WhatsApp Order Summary** — Aggregates orders by product, navigator.share() with clipboard fallback
- [x] **Task 12C: Calendar Sync (.ics export)** — Generates .ics file with all orders for a date, each order as a VEVENT, works with iOS/Google/Android calendar apps *(added post-plan)*
- [x] **Task 12D: Edit Order** — Edit page at /orders/[id]/edit, pencil icon on order cards *(added post-plan)*
- [x] **Task 13: Order Status Updates** — Staff can update: received → cooking → cooked → packed, color-coded pills, server action with revalidation

## Phase 4: Invoice Generation — DONE

- [x] **Task 14: Invoice Numbering & Ledger** — Sequential per firm per FY (PREFIX/FY/SEQ), client balance calculation (opening + invoices − payments), client ledger per FY with debit/credit, payment recording (cash/UPI/bank), partial payment support
- [x] **Task 15: PDF Invoice Templates** — Non-GST, GST Tax Invoice (with CGST/SGST from firm settings), Catering (with event details + advance/balance due). A4 and A6 sizes. Signature image support.
- [x] **Task 16: Invoice Preview & Generation** — On-screen HTML preview, A4/A6 size selector, generate button, download PDF, share via WhatsApp

## Phase 5: Settings, Analytics, Backup, i18n — DONE

- [x] **Task 17: Settings — Firms** — CRUD, multiple firms, GST/non-GST, CGST%/SGST% rate fields, bank details, signature upload (auto-applied to PDFs)
- [x] **Task 18: Settings — Users** — Add/edit users, PIN hashing, role assignment, PIN reset, activate/deactivate
- [x] **Task 19: Analytics Dashboard** — 4 tabs: Daily (stats + status breakdown), Monthly (CSS bar chart + top products/clients), Products (per-product FY summary), Clients (per-client FY summary with outstanding balance)
- [x] **Task 20: Backup & Restore** — Download SQLite DB file, upload restore with auto-backup safety, PIN confirmation
- [x] **Task 21: Multi-Language** — English + Hindi via next-intl, cookie-based locale, language switcher in settings, nav labels translated
- [x] **Task 22: Final Polish** — Loading spinners, 404 page, PWA manifest

## Post-Plan Additions (built during implementation)

- [x] **Firm-level CGST/SGST rates** — GST-registered firms set their own CGST% and SGST%, applied to invoice subtotal
- [x] **Signature upload** — Upload in firm settings, auto-applied to all PDF invoice templates
- [x] **Calendar .ics sync** — "Sync to Calendar" button on day view, backward compatible with Deepak's mobile calendar workflow
- [x] **Order edit from day view** — Pencil icon per order card, edit page pre-fills existing data
- [x] **Mobile overflow fixes** — Order form line items stacked vertically, order detail uses cards instead of table on mobile

---

## Deployment Notes

**To redeploy after code changes:**
```bash
ssh nuremberg
cd /var/www/dj
git pull
npm run build
pm2 restart dj-foods
```

**To rebuild from scratch:**
```bash
ssh nuremberg
cd /var/www
rm -rf dj
git clone https://github.com/ashishkamdar/dj.git
cd dj
npm install
mkdir -p data
npx drizzle-kit push
npm run db:seed
npm run build
pm2 start npm --name 'dj-foods' -- start -- -p 3456
```

**Default login:** PIN 1234 (admin user "Deepak")

---

## Pending / Future Work

- [ ] Get Deepak's actual full product list and update seed data
- [ ] Deepak to configure his firm details (name, address, GST number, CGST/SGST rates, bank details, signature) in Settings
- [ ] Test full invoice flow end-to-end with real data
- [ ] Review PDF invoice formatting with Deepak — ensure it matches his expectations
- [ ] Add more products as Deepak needs them (50+ products mentioned)
- [ ] Consider adding more clients as recurring daily orders start
- [ ] UI polish based on Deepak's feedback after real usage
- [ ] Backup cron job on server (daily auto-backup)

---

## Phase 5: Post-launch Iterations (2026-04-26 onwards)

Built in response to live feedback from Deepak using the app. All shipped to production.

### Multi-tenancy migration

- [x] Schema migrated from SQLite to Postgres with `tenant_id` on every tenant-scoped table
- [x] RLS policies via `app.tenant_id` setting (`src/db/rls.ts`); `withTenantDb()` wraps writes
- [x] Super-admin onboarding flow at `/super-admin`
- [x] Important: `npx drizzle-kit push` drops RLS policies — always re-run `npx tsx src/db/rls.ts` after a schema push (with `.env` sourced)

### Invoice / order improvements

- [x] **Invoice PDF letterhead** — show address/phone/email on every template; GSTIN only on GST invoice; CGST/SGST display the actual percentage from firm config
- [x] **Auto-derive billing type** — removed the manual Billing Type picker; firm's `is_gst_registered` now drives it
- [x] **Invoice delete** — per-row red ✕ on `/orders` (single delete) plus multi-select with select-all checkbox and a "Delete all invoices in view" bulk action
- [x] **Status simplification** — user policy: Confirmed = Invoiced. One-time SQL update applied; `deleteInvoices` reverts to `confirmed` (treated as same state)

### `/orders` index page

- [x] Sortable, filterable list view with: period chips (This Month / This Year / All Time + custom), client, firm, billing type, status, search
- [x] Click-to-sort on every column with chevron indicator; default sort = Order # desc
- [x] Summary tiles (Orders, Total, Received, Paid, Invoiced)
- [x] Monthly breakdown panel when range spans 2+ months
- [x] Per-row Paid checkbox creates/deletes a payment via `payments.order_id` FK
- [x] Per-row red ✕ deletes the entire order (cascade: invoice + items; payments unlink via SET NULL)
- [x] CSV export at `/orders/export.csv`
- [x] Linked from calendar header (List icon) and from More page on mobile

### Analytics dashboard

- [x] New `Overview` tab on `/analytics` (now default) — KPI cards for Revenue, Orders, AOV, Items Sold, GST Collected, Payments Received, Outstanding (live), Active Clients
- [x] Kaccha (non-GST) / Pakka (GST) / Catering split
- [x] Daily / Monthly revenue trend bar chart
- [x] Top 5 Products / Clients / Outstanding clients
- [x] Period toggle: Week / Month / Year

### Recurring orders (`/recurring`)

- [x] Schema: `recurring_templates` (clientId, firmId, daysOfWeek 7-bit mask Sun=bit0, billingType, isActive) + `recurring_template_items`
- [x] `tenants.last_recurring_gen_at` (date) for idempotency; `orders.generated_from_template_id` flags auto-generated drafts
- [x] `ensureRecurringGenerated()` runs from the layout's banner component on every authenticated page load — catches up multiple missed days
- [x] Two tabs: Pending (today's drafts to confirm) and Schedules (templates)
- [x] Single-line amber banner above page content shows pending count, links to Pending tab; disappears at zero
- [x] Form has Daily / Weekdays / Weekends preset buttons in addition to per-day chips

### Payments (`/payments`)

- [x] One `<details>` accordion per active client (default closed)
- [x] Closed: shop name + outstanding/advance balance with colour coding
- [x] Open: inline Record-payment form (defaults to outstanding amount, today, cash mode) + table of orders in the current FY sorted by Order # desc with the existing Paid checkbox per row
- [x] Top-of-page summary: total Outstanding (red) and total Advance held (green) across clients
- [x] Sorted Outstanding → Advance → Settled, then by absolute balance desc
- [x] `recordClientPayment(clientId, formData)` action — non-redirecting, revalidates `/payments`, `/orders`, `/analytics`, and `/clients/[id]`

### `/orders/new` ergonomics

- [x] Quick-pick chips for recurring clients above the Client dropdown
- [x] Quick-add product chips above line items — tap once to add, tap again to +1 qty
- [x] Numeric keypad on Qty / Rate fields via `inputMode="decimal"` and `pattern="[0-9.]*"`
- [x] Tenant default firm pre-fills the Firm dropdown (precedence: client default > tenant default > empty)

### Firms

- [x] `firms.is_default` flag (only one per tenant). "Set as default" button on `/settings/firms` enforces single-default invariant in the action

### Products

- [x] Per-row red ✕ + select-all bulk delete on `/products` — soft delete via `is_active=false` so historical orders keep working

### PWA auto-update

- [x] Service worker served by `/sw.js` route handler with a `BUILD_VERSION` constant captured at server boot — every `pm2 restart` changes it, browsers reinstall, `controllerchange` triggers a one-time `location.reload()`
- [x] `RegisterSW` client component re-checks for updates on `visibilitychange` so resumed PWAs pick up new versions
- [x] No more reinstall-from-scratch needed on Deepak's phone after a deploy

### UI / layout durability

- [x] App-shell `overflow-x-clip` on the `(app)` layout's `<main>` and on `html`/`body` in `globals.css` — durable guard against horizontal page scroll
- [x] Form chip rows use `min-w-0` + `max-w-full` + truncate so long client/product names ellipsize inside pills

### Mobile nav hub

- [x] `/settings` page now doubles as the mobile More tab hub. New top-level pages (Orders, Recurring, Payments, Analytics) appear in a "Sections" grid above the existing Settings tiles so mobile users (whose bottom nav is Calendar / Clients / Products / More) can reach them.

---

## Operational Cheat-sheet

**Standard deploy** (no schema change):
```bash
ssh nuremberg 'cd /var/www/dj && git pull --ff-only && npm run build && pm2 restart dj-foods --update-env'
```

**Schema-change deploy** — drizzle-kit push drops RLS policies, must restore them:
```bash
ssh nuremberg "cd /var/www/dj && git pull --ff-only && \
  npx drizzle-kit push --verbose && \
  set -a && source .env && set +a && npx tsx src/db/rls.ts && \
  npm run build && pm2 restart dj-foods --update-env"
```

**App location on server:** `/var/www/dj` · PM2 process `dj-foods` (id 10) · port 3456 · nginx → dj.areakpi.in
