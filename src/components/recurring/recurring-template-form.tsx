"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatCurrency, cn } from "@/lib/utils";
import { XMarkIcon, PlusIcon } from "@heroicons/react/24/outline";
import {
  createRecurringTemplate,
  updateRecurringTemplate,
} from "@/actions/recurring";

interface Firm {
  id: number;
  name: string;
  isGstRegistered: boolean | null;
}
interface Client {
  id: number;
  shopName: string;
  defaultFirmId: number | null;
}
interface Product {
  id: number;
  name: string;
  defaultUnit: string | null;
  defaultRate: number | null;
}
interface LineItem {
  productId: number;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface ExistingTemplate {
  id: number;
  clientId: number;
  firmId: number;
  name: string | null;
  daysOfWeek: number;
  billingType: string;
  notes: string | null;
  items: Array<{
    productId: number;
    quantity: number;
    unit: string | null;
    rate: number;
  }>;
}

interface Props {
  firms: Firm[];
  clients: Client[];
  products: Product[];
  template?: ExistingTemplate;
  defaultFirmId?: number | null;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_BITS = [1, 2, 4, 8, 16, 32, 64];
const UNIT_OPTIONS = [
  { value: "kg", label: "kg" },
  { value: "pieces", label: "pieces" },
  { value: "plates", label: "plates" },
  { value: "trays", label: "trays" },
];

function emptyItem(): LineItem {
  return { productId: 0, quantity: 1, unit: "kg", rate: 0, amount: 0 };
}

export function RecurringTemplateForm({
  firms,
  clients,
  products,
  template,
  defaultFirmId,
}: Props) {
  const isEdit = !!template;

  const [name, setName] = useState(template?.name ?? "");
  const [clientId, setClientId] = useState<string>(
    template ? String(template.clientId) : "",
  );
  const [firmId, setFirmId] = useState<string>(
    template
      ? String(template.firmId)
      : firms.length === 1
        ? String(firms[0].id)
        : defaultFirmId
          ? String(defaultFirmId)
          : "",
  );
  const [days, setDays] = useState<number>(template?.daysOfWeek ?? 0);
  const [notes, setNotes] = useState(template?.notes ?? "");
  const [items, setItems] = useState<LineItem[]>(
    template?.items?.length
      ? template.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unit: i.unit ?? "kg",
          rate: i.rate,
          amount: i.quantity * i.rate,
        }))
      : [emptyItem()],
  );
  const [submitting, setSubmitting] = useState(false);

  const sortedClients = [...clients].sort((a, b) =>
    a.shopName.localeCompare(b.shopName),
  );

  function handleClientChange(v: string) {
    setClientId(v);
    const c = clients.find((x) => x.id === parseInt(v, 10));
    if (c?.defaultFirmId) setFirmId(String(c.defaultFirmId));
  }

  function toggleDay(idx: number) {
    setDays((cur) => cur ^ DAY_BITS[idx]);
  }

  function quickAdd(productId: number) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setItems((prev) => {
      const existing = prev.findIndex((i) => i.productId === productId);
      if (existing >= 0) {
        const next = [...prev];
        const cur = { ...next[existing] };
        cur.quantity = (cur.quantity || 0) + 1;
        cur.amount = cur.quantity * cur.rate;
        next[existing] = cur;
        return next;
      }
      const newItem: LineItem = {
        productId,
        quantity: 1,
        unit: product.defaultUnit ?? "kg",
        rate: product.defaultRate ?? 0,
        amount: product.defaultRate ?? 0,
      };
      const blank = prev.findIndex((i) => i.productId === 0);
      if (blank >= 0) {
        const next = [...prev];
        next[blank] = newItem;
        return next;
      }
      return [...prev, newItem];
    });
  }

  function updateItem(idx: number, patch: Partial<LineItem>) {
    setItems((prev) => {
      const next = [...prev];
      const it = { ...next[idx], ...patch };
      if (patch.productId !== undefined) {
        const p = products.find((x) => x.id === patch.productId);
        if (p) it.unit = p.defaultUnit ?? "kg";
      }
      it.amount = it.quantity * it.rate;
      next[idx] = it;
      return next;
    });
  }

  function addRow() {
    setItems((p) => [...p, emptyItem()]);
  }
  function removeRow(idx: number) {
    if (items.length <= 1) return;
    setItems((p) => p.filter((_, i) => i !== idx));
  }

  const validItems = items.filter((i) => i.productId > 0);
  const selectedFirm = firms.find((f) => f.id === parseInt(firmId, 10));
  const billingType: "gst" | "non-gst" = selectedFirm?.isGstRegistered
    ? "gst"
    : "non-gst";

  const canSubmit =
    clientId && firmId && days > 0 && validItems.length > 0 && !submitting;

  async function submit() {
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("clientId", clientId);
      fd.set("firmId", firmId);
      fd.set("name", name);
      fd.set("daysOfWeek", String(days));
      fd.set("billingType", billingType);
      fd.set("notes", notes);
      fd.set(
        "items",
        JSON.stringify(
          validItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unit: i.unit,
            rate: i.rate,
          })),
        ),
      );
      if (isEdit && template) {
        await updateRecurringTemplate(template.id, fd);
      } else {
        await createRecurringTemplate(fd);
      }
      window.location.href = "/recurring";
    } catch (err) {
      setSubmitting(false);
      alert(err instanceof Error ? err.message : "Failed to save");
    }
  }

  const totalPerRun = items.reduce((s, i) => s + i.amount, 0);
  const dayCount = DAY_BITS.reduce((c, b) => c + ((days & b) ? 1 : 0), 0);

  return (
    <div className="w-full max-w-full min-w-0 space-y-6">
      {/* Recurring clients quick pick */}
      {sortedClients.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200">
            Client
          </h3>
          <Select
            name="clientId"
            options={sortedClients.map((c) => ({
              value: String(c.id),
              label: c.shopName,
            }))}
            placeholder="Select a client"
            value={clientId}
            onChange={(e) => handleClientChange(e.target.value)}
          />
        </div>
      )}

      {/* Firm */}
      <Select
        label="Firm"
        name="firmId"
        options={firms.map((f) => ({ value: String(f.id), label: f.name }))}
        placeholder="Select a firm"
        value={firmId}
        onChange={(e) => setFirmId(e.target.value)}
      />

      {/* Name (optional) */}
      <div>
        <label className="block text-sm/6 font-medium text-gray-900 dark:text-gray-200">
          Schedule name <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='e.g. "Daily morning order"'
          className="mt-2 block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500"
        />
      </div>

      {/* Days of week */}
      <div>
        <label className="block text-sm/6 font-medium text-gray-900 dark:text-gray-200">
          Repeat on
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {DAY_LABELS.map((label, idx) => {
            const on = (days & DAY_BITS[idx]) !== 0;
            return (
              <button
                key={label}
                type="button"
                onClick={() => toggleDay(idx)}
                className={cn(
                  "cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors",
                  on
                    ? "bg-indigo-600 text-white ring-indigo-600 dark:bg-indigo-500 dark:ring-indigo-500"
                    : "bg-white text-gray-700 ring-gray-200 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-white/10 dark:text-gray-200 dark:ring-white/10 dark:hover:bg-indigo-500/20",
                )}
              >
                {label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setDays(127)}
            className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium text-indigo-600 ring-1 ring-indigo-200 hover:bg-indigo-50 dark:text-indigo-300 dark:ring-indigo-500/30 dark:hover:bg-indigo-500/10"
          >
            Daily
          </button>
          <button
            type="button"
            onClick={() => setDays(0b0111110)}
            className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium text-indigo-600 ring-1 ring-indigo-200 hover:bg-indigo-50 dark:text-indigo-300 dark:ring-indigo-500/30 dark:hover:bg-indigo-500/10"
          >
            Weekdays
          </button>
          <button
            type="button"
            onClick={() => setDays(0b1000001)}
            className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium text-indigo-600 ring-1 ring-indigo-200 hover:bg-indigo-50 dark:text-indigo-300 dark:ring-indigo-500/30 dark:hover:bg-indigo-500/10"
          >
            Weekends
          </button>
        </div>
        {dayCount > 0 && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Will create one order on {dayCount}
            {dayCount === 1 ? " day" : " days"} of every week.
          </p>
        )}
      </div>

      {/* Quick-add */}
      {products.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200">
              Quick add
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Tap once · tap again to +1 qty
            </p>
          </div>
          <div className="mt-2 flex max-h-40 max-w-full min-w-0 flex-wrap gap-2 overflow-x-hidden overflow-y-auto rounded-lg bg-gray-50 p-2 ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
            {products.map((p) => {
              const inOrder = items.find((i) => i.productId === p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => quickAdd(p.id)}
                  className={cn(
                    "inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors",
                    inOrder
                      ? "bg-indigo-600 text-white ring-indigo-600 dark:bg-indigo-500 dark:ring-indigo-500"
                      : "bg-white text-gray-700 ring-gray-200 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-white/10 dark:text-gray-200 dark:ring-white/10 dark:hover:bg-indigo-500/20",
                  )}
                >
                  <span className="min-w-0 truncate">{p.name}</span>
                  {inOrder && inOrder.quantity > 0 && (
                    <span className="shrink-0 text-[10px] tabular-nums opacity-90">
                      ×{inOrder.quantity}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Line items */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200">
          Items per run
        </h3>
        <div className="mt-3 space-y-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="overflow-hidden rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50"
            >
              <div className="flex items-center gap-2">
                <select
                  className="block min-w-0 flex-1 rounded-md bg-white py-1.5 pr-8 pl-3 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500"
                  value={item.productId || ""}
                  onChange={(e) =>
                    updateItem(idx, {
                      productId: parseInt(e.target.value, 10) || 0,
                    })
                  }
                >
                  <option value="" disabled>
                    Product
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <span className="shrink-0 text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrency(item.amount)}
                </span>
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  disabled={items.length <= 1}
                  className="shrink-0 cursor-pointer rounded p-1 text-gray-400 hover:text-red-500 disabled:opacity-30 dark:text-gray-500 dark:hover:text-red-400"
                >
                  <XMarkIcon className="size-5" />
                </button>
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  pattern="[0-9.]*"
                  min="0.01"
                  step="0.01"
                  className="block w-full min-w-0 flex-1 rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500"
                  placeholder="Qty"
                  value={item.quantity || ""}
                  onChange={(e) =>
                    updateItem(idx, {
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                />
                <select
                  className="block w-full min-w-0 flex-1 rounded-md bg-white py-1.5 pr-8 pl-3 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500"
                  value={item.unit}
                  onChange={(e) => updateItem(idx, { unit: e.target.value })}
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-2">
                <input
                  type="number"
                  inputMode="decimal"
                  pattern="[0-9.]*"
                  min="0"
                  step="0.01"
                  className="block w-full max-w-[10rem] rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500"
                  placeholder="Rate"
                  value={item.rate || ""}
                  onChange={(e) =>
                    updateItem(idx, {
                      rate: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addRow}
          className="mt-3 inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          <PlusIcon className="size-4" />
          Add Item
        </button>
      </div>

      {/* Total per run */}
      <div className="flex items-center justify-between rounded-lg bg-gray-100 px-4 py-3 dark:bg-gray-800">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Total per run
        </span>
        <span className="text-lg font-semibold text-gray-900 dark:text-white">
          {formatCurrency(totalPerRun)}
        </span>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm/6 font-medium text-gray-900 dark:text-gray-200">
          Notes
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-2 block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
          placeholder="Optional"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={!canSubmit} onClick={submit}>
          {submitting ? "Saving..." : isEdit ? "Save changes" : "Create schedule"}
        </Button>
      </div>
    </div>
  );
}
