"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { Badge, type BadgeColor } from "@/components/ui/badge";
import { PaidCheckbox } from "./paid-checkbox";
import { deleteInvoices } from "@/actions/invoices";
import { formatCurrency, formatDateShort, cn } from "@/lib/utils";
import type { OrderListRow } from "@/actions/orders";

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

interface OrdersTableProps {
  rows: OrderListRow[];
}

export function OrdersTable({ rows }: OrdersTableProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isPending, startTransition] = useTransition();

  const invoicedIds = useMemo(
    () => rows.filter((r) => r.isInvoiced).map((r) => r.id),
    [rows],
  );
  const allInvoicedSelected =
    invoicedIds.length > 0 && invoicedIds.every((id) => selected.has(id));

  function toggleAll() {
    if (allInvoicedSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(invoicedIds));
    }
  }

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function bulkDelete() {
    if (selected.size === 0) return;
    const n = selected.size;
    if (
      !confirm(
        `Delete ${n} invoice${n > 1 ? "s" : ""}?\n\nThe order${n > 1 ? "s" : ""} will revert to "Confirmed" status. This cannot be undone.`,
      )
    )
      return;
    const ids = [...selected];
    startTransition(async () => {
      await deleteInvoices(ids);
      setSelected(new Set());
    });
  }

  function singleDelete(id: number) {
    if (
      !confirm(
        "Delete this invoice? The order will revert to 'Confirmed' status. This cannot be undone.",
      )
    )
      return;
    startTransition(async () => {
      await deleteInvoices([id]);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
  }

  function deleteAllInView() {
    if (invoicedIds.length === 0) return;
    const n = invoicedIds.length;
    if (
      !confirm(
        `Delete ALL ${n} invoice${n > 1 ? "s" : ""} in the current view?\n\nThis covers every invoice for the orders currently filtered. Orders will revert to 'Confirmed' status. This cannot be undone.`,
      )
    )
      return;
    startTransition(async () => {
      await deleteInvoices(invoicedIds);
      setSelected(new Set());
    });
  }

  return (
    <div className="space-y-3">
      {invoicedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
          <span className="text-gray-600 dark:text-gray-300">
            {invoicedIds.length} invoice{invoicedIds.length > 1 ? "s" : ""} in this view
          </span>
          <button
            type="button"
            onClick={deleteAllInView}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 ring-1 ring-red-200 ring-inset hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:ring-red-500/30 dark:hover:bg-red-500/10"
          >
            {isPending ? "Deleting..." : `Delete all invoices (${invoicedIds.length})`}
          </button>
        </div>
      )}
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-2 ring-1 ring-red-200 dark:bg-red-500/10 dark:ring-red-500/30">
          <span className="text-sm text-red-700 dark:text-red-300">
            {selected.size} invoice{selected.size > 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              disabled={isPending}
              className="rounded-md bg-white px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 disabled:opacity-50 dark:bg-white/10 dark:text-gray-200 dark:ring-white/10"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={bulkDelete}
              disabled={isPending}
              className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-400"
            >
              {isPending ? "Deleting..." : `Delete ${selected.size}`}
            </button>
          </div>
        </div>
      )}

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
              <th className="px-3 py-2 text-center font-medium">Paid</th>
              <th className="px-3 py-2 text-center font-medium">
                <input
                  type="checkbox"
                  aria-label="Select all invoices"
                  checked={allInvoicedSelected}
                  disabled={invoicedIds.length === 0 || isPending}
                  onChange={toggleAll}
                  className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-white/20 dark:bg-white/5"
                />
              </th>
              <th className="px-3 py-2 text-center font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-white/5 dark:bg-gray-900">
            {rows.map((r) => {
              const billing = BILLING_BADGE[r.billingType];
              const status = r.status ? STATUS_BADGE[r.status] : null;
              const isSelected = selected.has(r.id);
              return (
                <tr
                  key={r.id}
                  className={cn(
                    "hover:bg-gray-50 dark:hover:bg-white/5",
                    isSelected && "bg-red-50/40 dark:bg-red-500/5",
                  )}
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
                  <td className="px-3 py-2 text-center">
                    <PaidCheckbox orderId={r.id} initialPaid={r.isPaid} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.isInvoiced && (
                      <input
                        type="checkbox"
                        aria-label={`Select invoice for order ${r.id}`}
                        checked={isSelected}
                        disabled={isPending}
                        onChange={() => toggleOne(r.id)}
                        className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-white/20 dark:bg-white/5"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.isInvoiced && (
                      <button
                        type="button"
                        onClick={() => singleDelete(r.id)}
                        disabled={isPending}
                        title="Delete invoice"
                        aria-label={`Delete invoice for order ${r.id}`}
                        className="inline-flex size-6 items-center justify-center rounded-md text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                      >
                        <XMarkIcon className="size-4" aria-hidden="true" />
                      </button>
                    )}
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
          const isSelected = selected.has(r.id);
          return (
            <div
              key={r.id}
              className={cn(
                "rounded-lg bg-white px-4 py-3 ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10",
                isSelected && "ring-red-300 dark:ring-red-500/40",
              )}
            >
              <Link
                href={`/orders/${r.id}`}
                className="block hover:bg-gray-50/50 dark:hover:bg-white/5"
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
              <div className="mt-2 flex items-center justify-between gap-2 border-t border-gray-100 pt-2 dark:border-white/10">
                <PaidCheckbox
                  orderId={r.id}
                  initialPaid={r.isPaid}
                  size="sm"
                  showLabel
                />
                {r.isInvoiced && (
                  <div className="flex items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isPending}
                        onChange={() => toggleOne(r.id)}
                        className="size-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-white/20 dark:bg-white/5"
                      />
                      Select
                    </label>
                    <button
                      type="button"
                      onClick={() => singleDelete(r.id)}
                      disabled={isPending}
                      title="Delete invoice"
                      className="inline-flex size-7 items-center justify-center rounded-md text-red-500 hover:bg-red-50 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                      <XMarkIcon className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
