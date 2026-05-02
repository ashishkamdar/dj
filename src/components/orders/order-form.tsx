"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { XMarkIcon, PlusIcon } from "@heroicons/react/24/outline";
import { createOrder, updateOrder } from "@/actions/orders";

interface Firm {
  id: number;
  name: string;
  isGstRegistered: boolean | null;
}

interface Client {
  id: number;
  shopName: string;
  isRecurring: boolean | null;
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

interface ExistingOrder {
  id: number;
  date: string;
  clientId: number;
  firmId: number;
  billingType: string;
  status: string | null;
  notes: string | null;
  eventDate: string | null;
  eventName: string | null;
  advancePaid: number | null;
  items: Array<{
    productId: number;
    quantity: number;
    unit: string | null;
    rate: number;
    amount: number;
  }>;
}

interface OrderFormProps {
  date: string;
  firms: Firm[];
  clients: Client[];
  products: Product[];
  order?: ExistingOrder;
  defaultFirmId?: number | null;
}

const UNIT_OPTIONS = [
  { value: "kg", label: "kg" },
  { value: "pieces", label: "pieces" },
  { value: "plates", label: "plates" },
  { value: "trays", label: "trays" },
];

// Billing type is auto-determined from firm's GST registration status

function emptyItem(): LineItem {
  return { productId: 0, quantity: 1, unit: "kg", rate: 0, amount: 0 };
}

export function OrderForm({
  date,
  firms,
  clients,
  products,
  order,
  defaultFirmId,
}: OrderFormProps) {
  const isEditing = !!order;

  const [clientId, setClientId] = useState<string>(
    order ? String(order.clientId) : "",
  );
  const initialFirmId = order
    ? String(order.firmId)
    : firms.length === 1
      ? String(firms[0].id)
      : defaultFirmId
        ? String(defaultFirmId)
        : "";
  const [firmId, setFirmId] = useState<string>(initialFirmId);
  const [notes, setNotes] = useState<string>(order?.notes ?? "");

  const [lineItems, setLineItems] = useState<LineItem[]>(
    order?.items?.length
      ? order.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unit: i.unit ?? "kg",
          rate: i.rate,
          amount: i.amount,
        }))
      : [emptyItem()],
  );

  const [submitting, setSubmitting] = useState(false);

  // Sort clients: recurring first
  const sortedClients = [...clients].sort((a, b) => {
    if (a.isRecurring && !b.isRecurring) return -1;
    if (!a.isRecurring && b.isRecurring) return 1;
    return a.shopName.localeCompare(b.shopName);
  });

  const clientOptions = sortedClients.map((c) => ({
    value: String(c.id),
    label: c.isRecurring ? `● ${c.shopName}` : c.shopName,
  }));

  const firmOptions = firms.map((f) => ({
    value: String(f.id),
    label: f.name,
  }));

  const productOptions = products.map((p) => ({
    value: String(p.id),
    label: p.name,
  }));

  // When client changes, auto-set firm if they have a default
  function handleClientChange(newClientId: string) {
    setClientId(newClientId);
    const client = clients.find((c) => c.id === parseInt(newClientId, 10));
    if (client?.defaultFirmId) {
      setFirmId(String(client.defaultFirmId));
    }
  }

  function quickAddProduct(productId: number) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setLineItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.productId === productId);
      if (existingIdx >= 0) {
        const next = [...prev];
        const cur = { ...next[existingIdx] };
        cur.quantity = (cur.quantity || 0) + 1;
        cur.amount = cur.quantity * cur.rate;
        next[existingIdx] = cur;
        return next;
      }
      const newItem: LineItem = {
        productId,
        quantity: 1,
        unit: product.defaultUnit ?? "kg",
        rate: product.defaultRate ?? 0,
        amount: product.defaultRate ?? 0,
      };
      const blankIdx = prev.findIndex((i) => i.productId === 0);
      if (blankIdx >= 0) {
        const next = [...prev];
        next[blankIdx] = newItem;
        return next;
      }
      return [...prev, newItem];
    });
  }

  function updateLineItem(index: number, updates: Partial<LineItem>) {
    setLineItems((prev) => {
      const newItems = [...prev];
      const item = { ...newItems[index], ...updates };

      // If product changed, auto-fill unit only (rate varies per client)
      if (updates.productId !== undefined) {
        const product = products.find((p) => p.id === updates.productId);
        if (product) {
          item.unit = product.defaultUnit ?? "kg";
        }
      }

      item.amount = item.quantity * item.rate;
      newItems[index] = item;
      return newItems;
    });
  }

  function addItem() {
    setLineItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index: number) {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  const total = lineItems.reduce((sum, item) => sum + item.amount, 0);

  // Auto-determine billing type from selected firm's GST status
  const selectedFirm = firms.find((f) => f.id === parseInt(firmId, 10));
  const billingType = selectedFirm?.isGstRegistered ? "gst" : "non-gst";

  async function handleSubmit(statusOverride: string) {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("date", date);
      formData.set("clientId", clientId);
      formData.set("firmId", firmId);
      formData.set("billingType", billingType);
      formData.set("status", statusOverride);
      formData.set("notes", notes);
      formData.set(
        "items",
        JSON.stringify(
          lineItems
            .filter((i) => i.productId > 0)
            .map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              unit: i.unit,
              rate: i.rate,
            })),
        ),
      );

      if (isEditing && order) {
        await updateOrder(order.id, formData);
      } else {
        await createOrder(formData);
      }
    } catch {
      setSubmitting(false);
    }
  }

  const validItems = lineItems.filter((i) => i.productId > 0);
  const canSubmit = clientId && firmId && validItems.length > 0 && !submitting;

  const recurringClients = sortedClients.filter((c) => c.isRecurring);

  return (
    <div className="w-full max-w-full min-w-0 space-y-6">
      {/* Quick-pick recurring clients */}
      {recurringClients.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200">
              Quick pick
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Recurring clients
            </p>
          </div>
          <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-lg bg-gray-50 p-2 ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
            {recurringClients.map((c) => {
              const selected = clientId === String(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleClientChange(String(c.id))}
                  className={
                    selected
                      ? "cursor-pointer rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-indigo-600 transition-colors hover:bg-indigo-500 dark:bg-indigo-500 dark:ring-indigo-500 dark:hover:bg-indigo-400"
                      : "cursor-pointer rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-gray-200 transition-colors hover:bg-indigo-50 hover:text-indigo-700 hover:ring-indigo-200 dark:bg-white/10 dark:text-gray-200 dark:ring-white/10 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-200"
                  }
                >
                  {c.shopName}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Client */}
      <Select
        label="Client"
        name="clientId"
        options={clientOptions}
        placeholder="Select a client"
        value={clientId}
        onChange={(e) => handleClientChange(e.target.value)}
      />

      {/* Firm */}
      <Select
        label="Firm"
        name="firmId"
        options={firmOptions}
        placeholder="Select a firm"
        value={firmId}
        onChange={(e) => setFirmId(e.target.value)}
      />

      {/* Quick add product chips */}
      {products.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200">
              Quick add
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Tap once to add · tap again to +1 qty
            </p>
          </div>
          <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-lg bg-gray-50 p-2 ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
            {products.map((p) => {
              const inOrder = lineItems.find((i) => i.productId === p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => quickAddProduct(p.id)}
                  className={
                    inOrder
                      ? "inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-indigo-600 transition-colors hover:bg-indigo-500 dark:bg-indigo-500 dark:ring-indigo-500 dark:hover:bg-indigo-400"
                      : "inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-gray-200 transition-colors hover:bg-indigo-50 hover:text-indigo-700 hover:ring-indigo-200 dark:bg-white/10 dark:text-gray-200 dark:ring-white/10 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-200"
                  }
                >
                  {p.name}
                  {inOrder && inOrder.quantity > 0 && (
                    <span className="text-[10px] tabular-nums opacity-90">
                      ×{inOrder.quantity}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Line Items */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200">
          Items
        </h3>
        <div className="mt-3 space-y-3">
          {lineItems.map((item, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50"
            >
              {/* Row 1: Product select + Amount + Remove */}
              <div className="flex items-center gap-2">
                <select
                  className="block min-w-0 flex-1 rounded-md bg-white py-1.5 pr-8 pl-3 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500"
                  value={item.productId || ""}
                  onChange={(e) =>
                    updateLineItem(index, {
                      productId: parseInt(e.target.value, 10) || 0,
                    })
                  }
                >
                  <option value="" disabled>
                    Product
                  </option>
                  {productOptions.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <span className="shrink-0 text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrency(item.amount)}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={lineItems.length <= 1}
                  className="shrink-0 rounded p-1 text-gray-400 hover:text-red-500 disabled:opacity-30 dark:text-gray-500 dark:hover:text-red-400"
                >
                  <XMarkIcon className="size-5" />
                </button>
              </div>

              {/* Row 2: Qty + Unit */}
              <div className="mt-2 flex gap-2">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="block w-full min-w-0 flex-1 rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500"
                  placeholder="Qty"
                  value={item.quantity || ""}
                  onChange={(e) =>
                    updateLineItem(index, {
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                />
                <select
                  className="block w-full min-w-0 flex-1 rounded-md bg-white py-1.5 pr-8 pl-3 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500"
                  value={item.unit}
                  onChange={(e) =>
                    updateLineItem(index, { unit: e.target.value })
                  }
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 3: Rate */}
              <div className="mt-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="block w-full max-w-[10rem] rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500"
                  placeholder="Rate"
                  value={item.rate || ""}
                  onChange={(e) =>
                    updateLineItem(index, {
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
          onClick={addItem}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          <PlusIcon className="size-4" />
          Add Item
        </button>
      </div>

      {/* Total */}
      <div className="flex items-center justify-between rounded-lg bg-gray-100 px-4 py-3 dark:bg-gray-800">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Order Total
        </span>
        <span className="text-lg font-semibold text-gray-900 dark:text-white">
          {formatCurrency(total)}
        </span>
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor="notes"
          className="block text-sm/6 font-medium text-gray-900 dark:text-gray-200"
        >
          Notes
        </label>
        <div className="mt-2">
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes..."
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={!canSubmit}
          onClick={() => handleSubmit("draft")}
        >
          {submitting ? "Saving..." : "Save as Draft"}
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={!canSubmit}
          onClick={() => handleSubmit("confirmed")}
        >
          {submitting ? "Saving..." : "Confirm Order"}
        </Button>
      </div>
    </div>
  );
}
