# Deepak's Food Business Management System — Design Spec

**Date:** 2026-04-20
**Project:** dj.areakpi.in
**Repo:** https://github.com/ashishkamdar/dj
**Owner:** Deepak Jaiswal (food business), built by Ashish Kamdar

---

## 1. Overview

A mobile-first Next.js + SQLite application for Deepak's wholesale Gujarati food manufacturing business. Deepak supplies retail shops with products like Dhokla, Patra, Khandvi, Kachori, and 50+ other items.

**Primary value:** Automate invoice generation (GST and non-GST PDF invoices) from a calendar-based order entry system that mirrors Deepak's current mobile calendar workflow.

**Three business types:**
1. Official GST Billing
2. Non-GST Billing
3. Catering (event-based, menus, advance payments, per-plate pricing)

**Financial year:** April 1 to March 31

---

## 2. Users & Authentication

- **PIN-based login** — numeric PIN with on-screen number pad
- **10 users max:** 5 admins, 5 staff
- Each user has a unique PIN + name (individual tracking)
- Server-side cookie sessions (no JWT)

### Roles

| Capability | Admin | Staff |
|-----------|-------|-------|
| View calendar & orders | Yes | Yes |
| Create/edit orders | Yes | No |
| Update order item status | Yes | Yes |
| Generate invoices | Yes | No |
| Manage clients | Yes | No |
| Manage products | Yes | No |
| View analytics | Yes | No |
| Manage settings/users/firms | Yes | No |

---

## 3. Data Model

### Firms
| Field | Type | Notes |
|-------|------|-------|
| id | integer PK | Auto-increment |
| name | text | Firm/business name |
| address | text | Full address |
| phone | text | |
| email | text | Optional |
| logo | text | File path, optional |
| is_gst_registered | boolean | |
| gst_number | text | If GST registered |
| state_code | text | For CGST/SGST vs IGST |
| cgst_percent | real | CGST rate for GST invoices (e.g., 2.5) |
| sgst_percent | real | SGST rate for GST invoices (e.g., 2.5) |
| signature | text | File path to uploaded signature image |
| bank_name | text | For invoice footer |
| bank_account | text | |
| bank_ifsc | text | |
| is_active | boolean | Soft delete |
| created_at | datetime | |
| updated_at | datetime | |

### Products
| Field | Type | Notes |
|-------|------|-------|
| id | integer PK | |
| name | text | e.g., Dhokla, Patra, Khandvi |
| default_unit | text | kg (default), pieces, plates, trays |
| default_rate | real | Standard rate |
| hsn_code | text | From settings |
| gst_rate_percent | real | e.g., 5.0 |
| category | text | Optional grouping |
| is_active | boolean | |
| created_at | datetime | |
| updated_at | datetime | |

### Clients
| Field | Type | Notes |
|-------|------|-------|
| id | integer PK | |
| shop_name | text | Retail shop name |
| owner_name | text | |
| phone | text | |
| address | text | |
| is_recurring | boolean | Fixed daily orders |
| default_firm_id | integer FK | Usual billing firm |
| opening_balance | real | Balance when added to system |
| gst_number | text | Client's GSTIN if applicable |
| is_active | boolean | |
| created_at | datetime | |
| updated_at | datetime | |

### Users
| Field | Type | Notes |
|-------|------|-------|
| id | integer PK | |
| name | text | |
| pin | text | Hashed |
| role | text | admin / staff |
| is_active | boolean | |
| created_at | datetime | |

### Orders
| Field | Type | Notes |
|-------|------|-------|
| id | integer PK | |
| date | date | Order date (calendar date) |
| client_id | integer FK | |
| firm_id | integer FK | Billing firm |
| billing_type | text | gst / non-gst / catering |
| status | text | draft / confirmed / invoiced |
| notes | text | Optional |
| event_date | date | Catering only |
| event_name | text | Catering only |
| advance_paid | real | Catering only |
| created_by | integer FK | User who created |
| updated_by | integer FK | Last updater |
| created_at | datetime | |
| updated_at | datetime | |

### Order Items
| Field | Type | Notes |
|-------|------|-------|
| id | integer PK | |
| order_id | integer FK | |
| product_id | integer FK | |
| quantity | real | |
| unit | text | kg / pieces / plates / trays |
| rate | real | Can differ from default |
| amount | real | quantity × rate |
| item_status | text | received / cooking / cooked / packed |
| updated_by | integer FK | Staff who updated status |
| updated_at | datetime | |

### Invoices
| Field | Type | Notes |
|-------|------|-------|
| id | integer PK | |
| invoice_number | text | Auto: FIRM/FY/SEQ e.g., DJ/2025-26/001 |
| order_id | integer FK | |
| firm_id | integer FK | |
| client_id | integer FK | |
| date | date | Invoice date |
| subtotal | real | |
| cgst_amount | real | Intra-state |
| sgst_amount | real | Intra-state |
| igst_amount | real | Inter-state |
| total | real | |
| balance_bf | real | Balance brought forward |
| grand_total | real | total + balance_bf |
| size | text | A6 / A4 |
| pdf_path | text | Generated PDF path |
| created_by | integer FK | |
| created_at | datetime | |

### Payments
| Field | Type | Notes |
|-------|------|-------|
| id | integer PK | |
| client_id | integer FK | |
| amount | real | |
| date | date | |
| mode | text | cash / upi / bank |
| notes | text | |
| received_by | integer FK | User |
| created_at | datetime | |

### Client Ledger (Derived)
Not a separate table — computed from:
- Opening balance (from clients table)
- + Invoice totals
- − Payment amounts
- = Current balance (carried forward)

---

## 4. Screens & Navigation

### Mobile-First Bottom Navigation (4 tabs)
1. **Calendar** (home icon) — Monthly calendar
2. **Clients** (people icon) — Client management
3. **Products** (box icon) — Product CRUD
4. **More** (menu icon) — Settings, Analytics, Users

### Screen Details

#### Login Screen
- Clean number pad for PIN entry
- Firm logo/name at top
- Dark/light theme support

#### Calendar Screen (Home)
- Monthly grid for current month
- Each date cell shows dot/count indicating number of orders
- Swipe or arrows for month navigation
- Tap date → Day View
- Default: current FY (April–March)

#### Day View
- Selected date at top
- List of orders grouped by client
- Each order shows: client name, items summary, total, status
- FAB (floating action button) to add new order
- Quick access to generate invoice per order
- **Share Orders button:** Formats all orders for the day into a clean text summary and opens WhatsApp share (or copy-to-clipboard). Format: Date header, then per-product summary (product name, total qty across all clients). Deepak sends this to his factory WhatsApp number.
- **Sync to Calendar button:** Exports all orders for the date as a `.ics` file. Each order becomes a separate calendar event (client name, amount, items). Opens in the phone's native calendar app (iOS Calendar, Google Calendar, Android). Maintains backward compatibility with Deepak's current workflow of using the mobile calendar.
- **Per-order action icons:** Edit (pencil), Invoice preview (eye), Share (share icon)

#### Order Entry (Admin only)
- Select client (searchable dropdown, recurring clients at top)
- Select firm & billing type (gst/non-gst/catering)
- Line items: product (searchable), quantity, unit (default kg), rate (pre-filled from product default, editable)
- Auto-calculate line amount and order total
- For catering: additional fields — event name, event date, advance paid
- Save as draft or confirm

#### Order Status (Staff accessible)
- List of order items for a given day
- Each item shows product, quantity, current status
- Staff taps to update: received → cooking → cooked → packed
- Color-coded status badges

#### Invoice Preview & Generation (Admin only)
- Preview invoice on-screen before generating
- Select size: A6 or A4
- Select firm (pre-filled from order)
- Shows: firm header, client details, line items, GST breakup (if applicable), subtotal, balance b/f, grand total
- Generate PDF button
- Share via WhatsApp or download

#### Client List
- Search by shop name or owner name
- Filter: all / recurring / with outstanding balance
- Tap → Client detail with ledger

#### Client Detail & Ledger
- Client info (shop name, owner, phone, address, GSTIN)
- Ledger tab: chronological list of invoices and payments
- Running balance shown (opening balance + invoices − payments = current balance)
- Add payment button
- Balance B/F is automatically calculated and shown on every new invoice

#### Payments Page (Admin only)
- Accessible from client detail page
- Record payment: amount, date, mode (cash/UPI/bank transfer), notes
- Payment history per client with running balance
- Supports partial payments (client pays less than invoice amount, remainder carries forward)
- Quick "Record Payment" button from client list for clients with outstanding balance

#### Product List (Admin only)
- Search products
- Each shows: name, default rate, unit, GST%, HSN
- Add/edit/deactivate products

#### Analytics (Admin only)
- **Daily:** total orders, revenue, items produced, status breakdown
- **Monthly:** revenue by day (bar chart), top products, top clients, vs previous month
- **Product:** per-product qty sold, revenue, avg rate, trend
- **Client:** per-client orders, revenue, outstanding balance
- **FY Reports:** firm-wise revenue, monthly trend, outstanding balances
- All filterable by date range, firm, billing type

#### Settings (Admin only)
- **Firms:** Add/edit firm profiles (name, address, GST details with CGST%/SGST% rates, bank details, logo, signature upload)
- **Invoice Preferences:** default size, invoice number prefix
- **HSN & GST Rates:** manage HSN codes with corresponding GST rates
- **User Management:** add/edit users, set PINs, assign roles

---

## 5. Invoice PDF Templates

### Non-GST Invoice
- Firm header (name, address, phone)
- Invoice number, date
- Client: shop name, address
- Table: S.No, Particular, Quantity, Unit, Rate, Amount
- Subtotal
- Balance B/F (brought forward)
- **Total Due**
- Bank details footer

### GST Invoice (Tax Invoice)
- Firm header with GSTIN, state
- "TAX INVOICE" title
- Invoice number (serial per firm per FY), date
- Client: shop name, address, GSTIN
- Table: S.No, Particular, HSN, Quantity, Unit, Rate, Taxable Amount
- CGST/SGST rates from the firm's settings (e.g., CGST 2.5% + SGST 2.5% applied on subtotal)
- Subtotal + Tax + Total
- Balance B/F
- **Grand Total**
- Amount in words
- Bank details, terms
- Firm's uploaded signature image (auto-applied, no manual signing needed)

### Catering Invoice
- Firm header
- Event details: name, date, venue
- Menu items with per-plate pricing
- Subtotal
- Advance paid
- **Balance Due**
- Terms & conditions

### Sizes
- **A6** (105×148mm) — compact receipt-style
- **A4** (210×297mm) — full page formal invoice
- User selects per invoice

---

## 6. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | SQLite via better-sqlite3 |
| ORM | Drizzle ORM |
| Styling | Tailwind CSS + Catalyst UI components (minimal style) |
| Theme | next-themes (dark/light) |
| PDF | @react-pdf/renderer |
| i18n | next-intl (English + Hindi) |
| Auth | Server-side cookie sessions, PIN-based |
| Deployment | Nuremberg server (ssh nuremberg), PM2/systemd |
| Repo | https://github.com/ashishkamdar/dj |

---

## 7. Project Structure

```
src/
  app/
    (auth)/login/              — PIN login
    (app)/                     — Authenticated layout (bottom nav)
      calendar/                — Monthly calendar + day view
      orders/[id]/             — Order detail, entry, invoice
      clients/                 — List, detail, ledger
        [id]/
      products/                — CRUD
      analytics/               — Dashboard & reports
      settings/                — Firms, users, preferences
        firms/
        users/
        products-config/       — HSN, GST rates
  components/
    ui/                        — Catalyst components (adapted)
    calendar/                  — Calendar grid, day cells
    orders/                    — Order form, item status
    invoices/                  — PDF templates (GST, non-GST, catering)
    analytics/                 — Charts, summary cards
  db/
    schema.ts                  — Drizzle schema definitions
    index.ts                   — DB connection singleton
    migrations/                — Drizzle migrations
    seed.ts                    — Initial data (top products, sample firm)
  lib/
    auth.ts                    — PIN hashing, session management
    invoice.ts                 — PDF generation logic
    financial-year.ts          — FY helpers (current FY, FY from date)
    ledger.ts                  — Client balance calculations
  types/
    index.ts                   — Shared TypeScript types
```

---

## 8. Deployment

- Source code on MacBook, pushed to GitHub
- Server: `ssh nuremberg` (root access)
- Production URL: dj.areakpi.in
- Build on server: `git pull && npm run build`
- Run: PM2 or systemd service
- SQLite DB file on server, periodic backup via cron
- Dark/light theme, mobile-first responsive (mobile → tablet → desktop)

---

## 9. Seed Data

Pre-populate on first run:
- **Products:** Dhokla, Patra, Khandvi, Kachori, White Dhokla (top sellers, default unit: kg)
- **Admin user:** Deepak (PIN to be set on first login)
- **Sample firm:** placeholder for Deepak to fill in settings

---

## 10. Backup & Restore

Available under **Settings → Backup & Restore** (Admin only).

### Backup
- **Manual backup:** One-tap "Backup Now" button downloads the SQLite .db file
- **Auto backup:** Daily automatic backup via cron on server, keeps last 30 days
- Backup files named: `dj-backup-YYYY-MM-DD-HHmmss.db`
- Stored in a dedicated backup directory on the server

### Restore
- **Upload restore:** Upload a .db backup file to restore
- **Confirmation dialog:** Shows backup date and size, requires PIN re-entry to confirm
- **Safety:** Current DB is auto-backed-up before any restore operation
- **Server backups list:** View available server-side backups, restore from any

---

## 11. Multi-Language Support

- **Languages:** English (default), Hindi
- **Setting:** Language selector in Settings, applies globally per device
- **Implementation:** `next-intl` for i18n, translation files in `messages/en.json` and `messages/hi.json`
- **Scope:** All UI labels, buttons, navigation, status badges, and system messages
- **Product/client names:** Stay as entered (not translated — these are proper nouns)
- **Invoices:** Can be generated in either language (selectable per invoice)

---

## 12. Calendar Sync

- **Sync to Calendar button** on day view exports all orders as `.ics` file
- Each order = one calendar event (client name, amount, items in description)
- Works with iOS Calendar, Google Calendar, Android calendar apps
- Maintains backward compatibility with Deepak's current mobile calendar workflow

---

## 13. Signature on Invoices

- Upload signature image in Settings → Firms → Edit → Signature section
- Signature auto-applied to all PDF invoices (Non-GST, GST, Catering)
- No physical signing needed — digital signature from settings

---

## 14. Out of Scope (for now)

- Online ordering by clients (this is admin/staff-only)
- Inventory/raw material tracking
- SMS/email notifications
- Barcode/QR scanning
