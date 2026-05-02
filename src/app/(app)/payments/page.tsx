import { requireAdmin } from "@/lib/session";
import { adminDb, schema } from "@/db";
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { SectionHeading } from "@/components/ui/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { BanknotesIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { formatCurrency, formatDateShort, todayString } from "@/lib/utils";
import { getCurrentFY } from "@/lib/financial-year";
import { recordClientPayment } from "@/actions/payments";
import { PaidCheckbox } from "@/components/orders/paid-checkbox";

export default async function PaymentsPage() {
  const { tenantId } = await requireAdmin();
  const fy = getCurrentFY();
  const today = todayString();

  // 1. All active clients
  const clients = await adminDb
    .select({
      id: schema.clients.id,
      shopName: schema.clients.shopName,
      ownerName: schema.clients.ownerName,
      phone: schema.clients.phone,
      openingBalance: schema.clients.openingBalance,
    })
    .from(schema.clients)
    .where(
      and(
        eq(schema.clients.tenantId, tenantId),
        eq(schema.clients.isActive, true),
      ),
    );

  if (clients.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHeading
          title="Payments Received"
          description="Record payments and review balances per client"
        />
        <EmptyState
          icon={BanknotesIcon}
          title="No clients yet"
          description="Add a client first, then record payments here."
        />
      </div>
    );
  }

  const clientIds = clients.map((c) => c.id);

  // 2. All invoice totals (for balance) — anchored to client, not FY
  const allInvoices = await adminDb
    .select({
      clientId: schema.invoices.clientId,
      total: schema.invoices.total,
    })
    .from(schema.invoices)
    .where(
      and(
        eq(schema.invoices.tenantId, tenantId),
        inArray(schema.invoices.clientId, clientIds),
      ),
    );

  // 3. All payments — anchored to client, not FY
  const allPayments = await adminDb
    .select({
      clientId: schema.payments.clientId,
      amount: schema.payments.amount,
    })
    .from(schema.payments)
    .where(
      and(
        eq(schema.payments.tenantId, tenantId),
        inArray(schema.payments.clientId, clientIds),
      ),
    );

  // Compute balance per client = openingBalance + sum(invoices.total) - sum(payments.amount)
  const invByClient = new Map<number, number>();
  for (const i of allInvoices) {
    invByClient.set(i.clientId, (invByClient.get(i.clientId) ?? 0) + i.total);
  }
  const payByClient = new Map<number, number>();
  for (const p of allPayments) {
    payByClient.set(p.clientId, (payByClient.get(p.clientId) ?? 0) + p.amount);
  }
  const balanceByClient = new Map<number, number>();
  for (const c of clients) {
    const opening = c.openingBalance ?? 0;
    const invoices = invByClient.get(c.id) ?? 0;
    const payments = payByClient.get(c.id) ?? 0;
    balanceByClient.set(c.id, opening + invoices - payments);
  }

  // 4. Orders for current FY across all clients
  const fyOrders = await adminDb
    .select({
      id: schema.orders.id,
      date: schema.orders.date,
      clientId: schema.orders.clientId,
      status: schema.orders.status,
      billingType: schema.orders.billingType,
      invoiceTotal: schema.invoices.grandTotal,
    })
    .from(schema.orders)
    .leftJoin(schema.invoices, eq(schema.invoices.orderId, schema.orders.id))
    .where(
      and(
        eq(schema.orders.tenantId, tenantId),
        inArray(schema.orders.clientId, clientIds),
        gte(schema.orders.date, fy.start),
        lte(schema.orders.date, fy.end),
      ),
    )
    .orderBy(desc(schema.orders.id));

  const fyOrderIds = fyOrders.map((o) => o.id);

  // 5. Items + payments-per-order in one go
  const [itemAgg, paymentAgg] = fyOrderIds.length
    ? await Promise.all([
        adminDb
          .select({
            orderId: schema.orderItems.orderId,
            amount: schema.orderItems.amount,
          })
          .from(schema.orderItems)
          .where(inArray(schema.orderItems.orderId, fyOrderIds)),
        adminDb
          .select({
            orderId: schema.payments.orderId,
            amount: schema.payments.amount,
          })
          .from(schema.payments)
          .where(inArray(schema.payments.orderId, fyOrderIds)),
      ])
    : [[], []];

  const subtotalByOrder = new Map<number, number>();
  for (const it of itemAgg) {
    subtotalByOrder.set(
      it.orderId,
      (subtotalByOrder.get(it.orderId) ?? 0) + it.amount,
    );
  }
  const paidByOrder = new Map<number, number>();
  for (const p of paymentAgg) {
    if (p.orderId != null) {
      paidByOrder.set(
        p.orderId,
        (paidByOrder.get(p.orderId) ?? 0) + p.amount,
      );
    }
  }

  type ClientOrder = {
    id: number;
    date: string;
    status: string | null;
    billingType: string;
    total: number;
    paid: number;
    isPaid: boolean;
  };
  const ordersByClient = new Map<number, ClientOrder[]>();
  for (const o of fyOrders) {
    const total =
      o.invoiceTotal != null
        ? Number(o.invoiceTotal)
        : (subtotalByOrder.get(o.id) ?? 0);
    const paid = paidByOrder.get(o.id) ?? 0;
    const isPaid = total > 0 && paid + 0.01 >= total;
    const row: ClientOrder = {
      id: o.id,
      date: o.date,
      status: o.status,
      billingType: o.billingType,
      total,
      paid,
      isPaid,
    };
    const arr = ordersByClient.get(o.clientId) ?? [];
    arr.push(row);
    ordersByClient.set(o.clientId, arr);
  }

  // Sort: outstanding (positive) first, then advance (negative), then settled.
  // Within each group, by absolute balance desc.
  const sortedClients = [...clients].sort((a, b) => {
    const ba = balanceByClient.get(a.id) ?? 0;
    const bb = balanceByClient.get(b.id) ?? 0;
    const groupA = ba > 0 ? 0 : ba < 0 ? 1 : 2;
    const groupB = bb > 0 ? 0 : bb < 0 ? 1 : 2;
    if (groupA !== groupB) return groupA - groupB;
    return Math.abs(bb) - Math.abs(ba);
  });

  const totalOutstanding = [...balanceByClient.values()]
    .filter((b) => b > 0)
    .reduce((s, b) => s + b, 0);
  const totalAdvance = Math.abs(
    [...balanceByClient.values()].filter((b) => b < 0).reduce((s, b) => s + b, 0),
  );

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Payments Received"
        description={`Financial year ${fy.label} · click a client to record payments`}
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-white p-3 ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Outstanding (across clients)
          </p>
          <p className="mt-1 text-base font-semibold text-red-600 sm:text-lg dark:text-red-400">
            {formatCurrency(totalOutstanding)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-3 ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Advance held
          </p>
          <p className="mt-1 text-base font-semibold text-green-600 sm:text-lg dark:text-green-400">
            {formatCurrency(totalAdvance)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {sortedClients.map((c) => {
          const balance = balanceByClient.get(c.id) ?? 0;
          const orders = ordersByClient.get(c.id) ?? [];
          const isOutstanding = balance > 0;
          const isAdvance = balance < 0;
          const balanceLabel = isOutstanding
            ? "Outstanding"
            : isAdvance
              ? "Advance"
              : "Settled";
          const balanceColor = isOutstanding
            ? "text-red-600 dark:text-red-400"
            : isAdvance
              ? "text-green-600 dark:text-green-400"
              : "text-gray-500 dark:text-gray-400";
          const defaultAmount = isOutstanding
            ? balance.toFixed(2)
            : "";
          return (
            <details
              key={c.id}
              className="group overflow-hidden rounded-lg bg-white ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900 dark:text-white">
                    {c.shopName}
                  </p>
                  {c.ownerName && (
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {c.ownerName}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-sm font-semibold ${balanceColor}`}>
                    {formatCurrency(Math.abs(balance))}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {balanceLabel}
                  </p>
                </div>
                <ChevronDownIcon
                  className="size-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>

              <div className="border-t border-gray-100 bg-gray-50/50 p-4 dark:border-white/10 dark:bg-white/5">
                {/* Record payment form */}
                <form
                  action={recordClientPayment.bind(null, c.id)}
                  className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5"
                >
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Amount
                    <input
                      type="number"
                      name="amount"
                      inputMode="decimal"
                      pattern="[0-9.]*"
                      min="0.01"
                      step="0.01"
                      defaultValue={defaultAmount}
                      required
                      className="mt-1 block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/10 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500"
                    />
                  </label>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Date
                    <input
                      type="date"
                      name="date"
                      defaultValue={today}
                      required
                      className="mt-1 block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/10 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500"
                    />
                  </label>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Mode
                    <select
                      name="mode"
                      defaultValue="cash"
                      className="mt-1 block w-full rounded-md bg-white py-1.5 pr-8 pl-3 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/10 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="bank">Bank</option>
                    </select>
                  </label>
                  <label className="col-span-2 block text-xs font-medium text-gray-700 dark:text-gray-300 sm:col-span-1">
                    Notes
                    <input
                      type="text"
                      name="notes"
                      placeholder="optional"
                      className="mt-1 block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/10 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                    />
                  </label>
                  <div className="col-span-2 flex items-end sm:col-span-1">
                    <button
                      type="submit"
                      className="w-full cursor-pointer rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                    >
                      Record
                    </button>
                  </div>
                </form>

                {/* Orders */}
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Orders in FY {fy.label} ({orders.length})
                </h4>
                {orders.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    No orders for this client this financial year.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md ring-1 ring-black/5 dark:ring-white/10">
                    <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-white/10">
                      <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-white/5 dark:text-gray-400">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">#</th>
                          <th className="px-3 py-2 text-left font-medium">Date</th>
                          <th className="px-3 py-2 text-right font-medium">Total</th>
                          <th className="px-3 py-2 text-right font-medium">Received</th>
                          <th className="px-3 py-2 text-center font-medium">Paid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white dark:divide-white/5 dark:bg-gray-900">
                        {orders.map((o) => (
                          <tr
                            key={o.id}
                            className="hover:bg-gray-50 dark:hover:bg-white/5"
                          >
                            <td className="px-3 py-2 whitespace-nowrap font-medium text-indigo-600 dark:text-indigo-400">
                              <a
                                href={`/orders/${o.id}`}
                                className="hover:underline"
                              >
                                #{o.id}
                              </a>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300">
                              {formatDateShort(o.date)}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">
                              {formatCurrency(o.total)}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                              {o.paid > 0 ? formatCurrency(o.paid) : "—"}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <PaidCheckbox
                                orderId={o.id}
                                initialPaid={o.isPaid}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
