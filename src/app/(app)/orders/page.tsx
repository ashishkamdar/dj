import Link from "next/link";
import { requireAuth } from "@/lib/session";
import { listOrders, type OrderListRow } from "@/actions/orders";
import { getClients } from "@/actions/clients";
import { adminDb, schema } from "@/db";
import { eq } from "drizzle-orm";
import { SectionHeading } from "@/components/ui/section-heading";
import { Badge, type BadgeColor } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import { OrdersFilters } from "@/components/orders/orders-filters";

type SP = {
  from?: string;
  to?: string;
  clientId?: string;
  firmId?: string;
  billingType?: string;
  status?: string;
  q?: string;
};

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function thisMonthRange(now: Date) {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return {
    from: `${y}-${pad(m)}-01`,
    to: `${y}-${pad(m)}-${pad(lastDayOfMonth(y, m))}`,
  };
}

function thisYearRange(now: Date) {
  const y = now.getFullYear();
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

function detectPreset(
  from: string,
  to: string,
  presets: { thisMonth: { from: string; to: string }; thisYear: { from: string; to: string } },
): "thisMonth" | "thisYear" | "allTime" | "custom" {
  if (!from && !to) return "allTime";
  if (from === presets.thisMonth.from && to === presets.thisMonth.to)
    return "thisMonth";
  if (from === presets.thisYear.from && to === presets.thisYear.to)
    return "thisYear";
  return "custom";
}

const BILLING_BADGE: Record<string, { color: BadgeColor; label: string }> = {
  gst: { color: "blue", label: "GST" },
  "non-gst": { color: "gray", label: "Non-GST" },
  catering: { color: "purple", label: "Catering" },
};

const STATUS_BADGE: Record<string, { color: BadgeColor; label: string }> = {
  draft: { color: "gray", label: "Draft" },
  confirmed: { color: "yellow", label: "Confirmed" },
  invoiced: { color: "green", label: "Invoiced" },
};

function summarizeByMonth(rows: OrderListRow[]) {
  const byMonth = new Map<string, { count: number; total: number }>();
  for (const r of rows) {
    const key = r.date.slice(0, 7);
    const cur = byMonth.get(key) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += r.total;
    byMonth.set(key, cur);
  }
  return Array.from(byMonth.entries())
    .map(([key, v]) => {
      const [y, m] = key.split("-").map(Number);
      return { key, label: `${MONTH_NAMES[m - 1]} ${y}`, ...v };
    })
    .sort((a, b) => (a.key < b.key ? 1 : -1));
}

function buildCsvHref(sp: SP): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `/orders/export.csv?${qs}` : "/orders/export.csv";
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const session = await requireAuth();
  const sp = await searchParams;

  const now = new Date();
  const presets = { thisMonth: thisMonthRange(now), thisYear: thisYearRange(now) };

  // Apply default = this month if user has no params at all.
  const hasAnyFilter =
    sp.from || sp.to || sp.clientId || sp.firmId || sp.billingType || sp.status || sp.q;
  const from = sp.from ?? (hasAnyFilter ? "" : presets.thisMonth.from);
  const to = sp.to ?? (hasAnyFilter ? "" : presets.thisMonth.to);

  const filters = {
    from: from || undefined,
    to: to || undefined,
    clientId: sp.clientId ? Number(sp.clientId) : undefined,
    firmId: sp.firmId ? Number(sp.firmId) : undefined,
    billingType: sp.billingType as "gst" | "non-gst" | "catering" | undefined,
    status: sp.status as "draft" | "confirmed" | "invoiced" | undefined,
    q: sp.q,
  };

  const [rows, clients, firms] = await Promise.all([
    listOrders(filters),
    getClients(),
    adminDb
      .select({ id: schema.firms.id, name: schema.firms.name })
      .from(schema.firms)
      .where(eq(schema.firms.tenantId, session.tenantId)),
  ]);

  const totalCount = rows.length;
  const totalAmount = rows.reduce((s, r) => s + r.total, 0);
  const invoicedCount = rows.filter((r) => r.isInvoiced).length;
  const monthly = summarizeByMonth(rows);

  const activePreset = detectPreset(from, to, presets);
  const csvHref = buildCsvHref({
    ...sp,
    from: from || undefined,
    to: to || undefined,
  });

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Orders"
        description="Search, filter, and export your orders"
        action={
          <Link
            href="/calendar"
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 dark:bg-white/10 dark:text-gray-200 dark:ring-white/10 dark:hover:bg-white/15"
          >
            Calendar view
          </Link>
        }
      />

      <OrdersFilters
        clients={clients.map((c) => ({ value: String(c.id), label: c.shopName }))}
        firms={firms.map((f) => ({ value: String(f.id), label: f.name }))}
        initial={{
          from,
          to,
          clientId: sp.clientId ?? "",
          firmId: sp.firmId ?? "",
          billingType: sp.billingType ?? "",
          status: sp.status ?? "",
          q: sp.q ?? "",
        }}
        presets={presets}
        activePreset={activePreset}
        csvHref={csvHref}
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Orders" value={String(totalCount)} />
        <SummaryCard label="Total" value={formatCurrency(totalAmount)} />
        <SummaryCard
          label="Invoiced"
          value={`${invoicedCount} / ${totalCount}`}
        />
      </div>

      {/* Monthly breakdown — only show when range spans 2+ months */}
      {monthly.length > 1 && (
        <div className="rounded-lg bg-white p-4 ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Monthly breakdown
          </h3>
          <div className="mt-3 divide-y divide-gray-100 text-sm dark:divide-white/10">
            {monthly.map((m) => (
              <div key={m.key} className="flex items-center justify-between py-2">
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {m.label}
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-gray-500 dark:text-gray-400">
                    {m.count} {m.count === 1 ? "order" : "orders"}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(m.total)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table / list */}
      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardDocumentListIcon}
          title="No orders match your filters"
          description="Try widening the date range or clearing some filters."
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-lg ring-1 ring-black/5 md:block dark:ring-white/10">
            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-white/10">
              <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-white/5 dark:text-gray-400">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Order</th>
                  <th className="px-3 py-2 text-left font-medium">Client</th>
                  <th className="px-3 py-2 text-left font-medium">Firm</th>
                  <th className="px-3 py-2 text-left font-medium">Type</th>
                  <th className="px-3 py-2 text-right font-medium">Items</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-white/5 dark:bg-gray-900">
                {rows.map((r) => {
                  const billing = BILLING_BADGE[r.billingType];
                  const status = r.status ? STATUS_BADGE[r.status] : null;
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {formatDateShort(r.date)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Link
                          href={`/orders/${r.id}`}
                          className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          #{r.id}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-white">
                        {r.shopName ?? "—"}
                        {r.eventName && (
                          <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                            · {r.eventName}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                        {r.firmName ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        {billing && (
                          <Badge color={billing.color}>{billing.label}</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                        {r.itemsCount}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">
                        {formatCurrency(r.total)}
                      </td>
                      <td className="px-3 py-2">
                        {status && <Badge color={status.color}>{status.label}</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {rows.map((r) => {
              const billing = BILLING_BADGE[r.billingType];
              const status = r.status ? STATUS_BADGE[r.status] : null;
              return (
                <Link
                  key={r.id}
                  href={`/orders/${r.id}`}
                  className="block rounded-lg bg-white px-4 py-3 ring-1 ring-black/5 hover:bg-gray-50 dark:bg-gray-800/50 dark:ring-white/10 dark:hover:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {r.shopName ?? "—"}
                      </p>
                      {r.eventName && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {r.eventName}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        #{r.id} · {formatDateShort(r.date)} · {r.firmName ?? "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(r.total)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {r.itemsCount} {r.itemsCount === 1 ? "item" : "items"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {billing && <Badge color={billing.color}>{billing.label}</Badge>}
                    {status && <Badge color={status.color}>{status.label}</Badge>}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3 ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
        {value}
      </p>
    </div>
  );
}
