"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { Badge } from "@/components/ui/badge";
import { deleteProducts } from "@/actions/products";
import { formatCurrency, cn } from "@/lib/utils";

interface ProductRow {
  id: number;
  name: string;
  defaultUnit: string | null;
  defaultRate: number | null;
  hsnCode: string | null;
  gstRatePercent: number | null;
  category: string | null;
}

interface ProductsTableProps {
  products: ProductRow[];
}

export function ProductsTable({ products }: ProductsTableProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isPending, startTransition] = useTransition();

  const allIds = useMemo(() => products.map((p) => p.id), [products]);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selected.has(id));

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  }

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function singleDelete(id: number, name: string) {
    if (
      !confirm(
        `Delete product "${name}"?\n\nIt will be hidden from product pickers and lists. Past orders that used this product keep their record. You can re-create the product later if needed.`,
      )
    )
      return;
    startTransition(async () => {
      await deleteProducts([id]);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
  }

  function bulkDelete() {
    if (selected.size === 0) return;
    const n = selected.size;
    if (
      !confirm(
        `Delete ${n} product${n > 1 ? "s" : ""}?\n\nThey'll be hidden from pickers and lists. Past orders keep their records.`,
      )
    )
      return;
    const ids = [...selected];
    startTransition(async () => {
      await deleteProducts(ids);
      setSelected(new Set());
    });
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-2 ring-1 ring-red-200 dark:bg-red-500/10 dark:ring-red-500/30">
          <span className="text-sm text-red-700 dark:text-red-300">
            {selected.size} product{selected.size > 1 ? "s" : ""} selected
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

      {/* Mobile cards */}
      <div className="space-y-3 sm:hidden">
        {products.map((p) => {
          const isSelected = selected.has(p.id);
          return (
            <div
              key={p.id}
              className={cn(
                "rounded-lg bg-white px-4 py-4 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10",
                isSelected && "ring-red-300 dark:ring-red-500/40",
              )}
            >
              <Link
                href={`/products/${p.id}/edit`}
                className="block"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {p.name}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {(p.defaultRate ?? 0) > 0
                      ? `${formatCurrency(p.defaultRate!)}/${p.defaultUnit}`
                      : p.defaultUnit}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.hsnCode && <Badge color="blue">HSN: {p.hsnCode}</Badge>}
                  {(p.gstRatePercent ?? 0) > 0 && (
                    <Badge color="indigo">GST: {p.gstRatePercent}%</Badge>
                  )}
                  {p.category && <Badge color="gray">{p.category}</Badge>}
                </div>
              </Link>
              <div className="mt-3 flex items-center justify-end gap-3 border-t border-gray-100 pt-2 dark:border-white/10">
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isPending}
                    onChange={() => toggleOne(p.id)}
                    className="size-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-white/20 dark:bg-white/5"
                  />
                  Select
                </label>
                <button
                  type="button"
                  onClick={() => singleDelete(p.id, p.name)}
                  disabled={isPending}
                  title="Delete product"
                  className="inline-flex size-7 items-center justify-center rounded-md text-red-500 hover:bg-red-50 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  <XMarkIcon className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden shadow-sm ring-1 ring-black/5 sm:block sm:rounded-lg dark:shadow-none dark:ring-white/10">
        <table className="min-w-full divide-y divide-gray-300 dark:divide-white/10">
          <thead className="bg-gray-50 dark:bg-gray-800/75">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 dark:text-gray-200">
                Name
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                Rate
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                Unit
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                HSN
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                GST%
              </th>
              <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-gray-200">
                <span className="sr-only">Edit</span>
              </th>
              <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-gray-200">
                <input
                  type="checkbox"
                  aria-label="Select all products"
                  checked={allSelected}
                  disabled={allIds.length === 0 || isPending}
                  onChange={toggleAll}
                  className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-white/20 dark:bg-white/5"
                />
              </th>
              <th className="py-3.5 pl-3 pr-4 text-center text-sm font-semibold text-gray-900 sm:pr-6 dark:text-gray-200" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-white/10 dark:bg-gray-800/50">
            {products.map((p) => {
              const isSelected = selected.has(p.id);
              return (
                <tr
                  key={p.id}
                  className={cn(
                    isSelected && "bg-red-50/40 dark:bg-red-500/5",
                  )}
                >
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 dark:text-white">
                    {p.name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {(p.defaultRate ?? 0) > 0 ? formatCurrency(p.defaultRate!) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {p.defaultUnit}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {p.hsnCode || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {p.gstRatePercent ?? 0}%
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium">
                    <Link
                      href={`/products/${p.id}/edit`}
                      className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      Edit
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-center">
                    <input
                      type="checkbox"
                      aria-label={`Select ${p.name}`}
                      checked={isSelected}
                      disabled={isPending}
                      onChange={() => toggleOne(p.id)}
                      className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-white/20 dark:bg-white/5"
                    />
                  </td>
                  <td className="whitespace-nowrap py-4 pl-3 pr-4 text-center sm:pr-6">
                    <button
                      type="button"
                      onClick={() => singleDelete(p.id, p.name)}
                      disabled={isPending}
                      title="Delete product"
                      aria-label={`Delete ${p.name}`}
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
    </div>
  );
}
