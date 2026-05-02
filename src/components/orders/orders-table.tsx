"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import { Badge, type BadgeColor } from "@/components/ui/badge";
import { PaidCheckbox } from "./paid-checkbox";
import { deleteInvoices } from "@/actions/invoices";
import { deleteOrders, type OrderListRow } from "@/actions/orders";
import { formatCurrency, formatDateShort, cn } from "@/lib/utils";

type SortKey =
  | "date"
  | "id"
  | "client"
  | "firm"
  | "billingType"
  | "itemsCount"
  | "total"
  | "status"
  | "paid";
type SortDir = "asc" | "desc";

const STATUS_RANK: Record<string, number> = {
  draft: 0,
  confirmed: 1,
  invoiced: 2,
};

const BILLING_RANK: Record<string, number> = {
  "non-gst": 0,
  gst: 1,
  catering: 2,
};

function compare(a: OrderListRow, b: OrderListRow, key: SortKey): number {
  switch (key) {
    case "date":
      return a.date.localeCompare(b.date);
    case "id":
      return a.id - b.id;
    case "client":
      return (a.shopName ?? "").localeCompare(b.shopName ?? "");
    case "firm":
      return (a.firmName ?? "").localeCompare(b.firmName ?? "");
    case "billingType":
      return (
        (BILLING_RANK[a.billingType] ?? 99) -
        (BILLING_RANK[b.billingType] ?? 99)
      );
    case "itemsCount":
      return a.itemsCount - b.itemsCount;
    case "total":
      return a.total - b.total;
    case "status":
      return (STATUS_RANK[a.status ?? ""] ?? -1) - (STATUS_RANK[b.status ?? ""] ?? -1);
    case "paid":
      return Number(a.isPaid) - Number(b.isPaid);
  }
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

interface OrdersTableProps {
  rows: OrderListRow[];
}

export function OrdersTable({ rows }: OrdersTableProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [isPending, startTransition] = useTransition();

  const sortedRows = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const c = compare(a, b, sortKey);
      if (c !== 0) return c * dir;
      // Stable secondary sort by id desc so equal-key rows have a deterministic order.
      return b.id - a.id;
    });
  }, [rows, sortKey, sortDir]);

  function onSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "date" || key === "total" || key === "id" ? "desc" : "asc");
    }
  }

  const allRowIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const invoicedIds = useMemo(
    () => rows.filter((r) => r.isInvoiced).map((r) => r.id),
    [rows],
  );
  const allRowsSelected =
    allRowIds.length > 0 && allRowIds.every((id) => selected.has(id));

  function toggleAll() {
    if (allRowsSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allRowIds));
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

  function bulkDeleteOrders() {
    if (selected.size === 0) return;
    const n = selected.size;
    if (
      !confirm(
        `Delete ${n} order${n > 1 ? "s" : ""}?\n\nThis removes the order${n > 1 ? "s" : ""}, related invoice${n > 1 ? "s" : ""}, and items. Recorded payments stay against the client. This cannot be undone.`,
      )
    )
      return;
    const ids = [...selected];
    startTransition(async () => {
      await deleteOrders(ids);
      setSelected(new Set());
    });
  }

  function singleDeleteOrder(id: number) {
    if (
      !confirm(
        `Delete order #${id}?\n\nThis removes the order, related invoice (if any), and items. Recorded payments stay against the client. This cannot be undone.`,
      )
    )
      return;
    startTransition(async () => {
      await deleteOrders([id]);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
  }

  function deleteAllInvoicesInView() {
    if (invoicedIds.length === 0) return;
    const n = invoicedIds.length;
    if (
      !confirm(
        `Delete ALL ${n} invoice${n > 1 ? "s" : ""} in the current view?\n\nThe orders themselves stay; only the invoice documents are removed and orders revert to 'Confirmed'. This cannot be undone.`,
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
            onClick={deleteAllInvoicesInView}
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
            {selected.size} order{selected.size > 1 ? "s" : ""} selected
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
              onClick={bulkDeleteOrders}
              disabled={isPending}
              className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-400"
            >
              {isPending ? "Deleting..." : `Delete ${selected.size} order${selected.size > 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-lg ring-1 ring-black/5 md:block dark:ring-white/10">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-white/10">
          <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-white/5 dark:text-gray-400">
            <tr>
              <SortHeader label="Date" sortKey="date" current={sortKey} dir={sortDir} onSort={onSort} />
              <SortHeader label="Order" sortKey="id" current={sortKey} dir={sortDir} onSort={onSort} />
              <SortHeader label="Client" sortKey="client" current={sortKey} dir={sortDir} onSort={onSort} />
              <SortHeader label="Firm" sortKey="firm" current={sortKey} dir={sortDir} onSort={onSort} />
              <SortHeader label="Type" sortKey="billingType" current={sortKey} dir={sortDir} onSort={onSort} />
              <SortHeader label="Items" sortKey="itemsCount" current={sortKey} dir={sortDir} onSort={onSort} align="right" />
              <SortHeader label="Total" sortKey="total" current={sortKey} dir={sortDir} onSort={onSort} align="right" />
              <SortHeader label="Status" sortKey="status" current={sortKey} dir={sortDir} onSort={onSort} />
              <SortHeader label="Paid" sortKey="paid" current={sortKey} dir={sortDir} onSort={onSort} align="center" />
              <th className="px-3 py-2 text-center font-medium">
                <input
                  type="checkbox"
                  aria-label="Select all orders"
                  checked={allRowsSelected}
                  disabled={allRowIds.length === 0 || isPending}
                  onChange={toggleAll}
                  className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-white/20 dark:bg-white/5"
                />
              </th>
              <th className="px-3 py-2 text-center font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-white/5 dark:bg-gray-900">
            {sortedRows.map((r) => {
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
                    <input
                      type="checkbox"
                      aria-label={`Select order ${r.id}`}
                      checked={isSelected}
                      disabled={isPending}
                      onChange={() => toggleOne(r.id)}
                      className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-white/20 dark:bg-white/5"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => singleDeleteOrder(r.id)}
                      disabled={isPending}
                      title="Delete order"
                      aria-label={`Delete order ${r.id}`}
                      className="inline-flex size-6 items-center justify-center rounded-md text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                    >
                      <XMarkIcon className="size-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {sortedRows.map((r) => {
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
                    onClick={() => singleDeleteOrder(r.id)}
                    disabled={isPending}
                    title="Delete order"
                    className="inline-flex size-7 items-center justify-center rounded-md text-red-500 hover:bg-red-50 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    <XMarkIcon className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  current,
  dir,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  align?: "left" | "right" | "center";
}) {
  const active = current === sortKey;
  const justify =
    align === "right"
      ? "justify-end"
      : align === "center"
        ? "justify-center"
        : "justify-start";
  const Icon = active && dir === "asc" ? ChevronUpIcon : ChevronDownIcon;
  return (
    <th
      className={cn(
        "px-3 py-2 font-medium",
        align === "right"
          ? "text-right"
          : align === "center"
            ? "text-center"
            : "text-left",
      )}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex w-full items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200",
          justify,
          active && "text-gray-900 dark:text-white",
        )}
      >
        {label}
        <Icon
          className={cn(
            "size-3",
            active ? "opacity-100" : "opacity-30",
          )}
          aria-hidden="true"
        />
      </button>
    </th>
  );
}
