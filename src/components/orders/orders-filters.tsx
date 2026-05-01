"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Option = { value: string; label: string };

interface OrdersFiltersProps {
  clients: Option[];
  firms: Option[];
  initial: {
    from: string;
    to: string;
    clientId: string;
    firmId: string;
    billingType: string;
    status: string;
    q: string;
  };
  presets: { thisMonth: { from: string; to: string }; thisYear: { from: string; to: string } };
  activePreset: "thisMonth" | "thisYear" | "allTime" | "custom";
  csvHref: string;
}

export function OrdersFilters({
  clients,
  firms,
  initial,
  presets,
  activePreset,
  csvHref,
}: OrdersFiltersProps) {
  const router = useRouter();
  const search = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [clientId, setClientId] = useState(initial.clientId);
  const [firmId, setFirmId] = useState(initial.firmId);
  const [billingType, setBillingType] = useState(initial.billingType);
  const [status, setStatus] = useState(initial.status);
  const [q, setQ] = useState(initial.q);

  function buildHref(next: Partial<{
    from: string;
    to: string;
    clientId: string;
    firmId: string;
    billingType: string;
    status: string;
    q: string;
  }>): string {
    const params = new URLSearchParams(search.toString());
    const merged = {
      from: next.from ?? from,
      to: next.to ?? to,
      clientId: next.clientId ?? clientId,
      firmId: next.firmId ?? firmId,
      billingType: next.billingType ?? billingType,
      status: next.status ?? status,
      q: next.q ?? q,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    const qs = params.toString();
    return qs ? `/orders?${qs}` : "/orders";
  }

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    const href = buildHref({});
    startTransition(() => router.push(href));
  }

  const presetChips: {
    key: typeof activePreset;
    label: string;
    href: string;
  }[] = [
    {
      key: "thisMonth",
      label: "This Month",
      href: buildHref({ from: presets.thisMonth.from, to: presets.thisMonth.to }),
    },
    {
      key: "thisYear",
      label: "This Year",
      href: buildHref({ from: presets.thisYear.from, to: presets.thisYear.to }),
    },
    { key: "allTime", label: "All Time", href: buildHref({ from: "", to: "" }) },
  ];

  return (
    <form
      onSubmit={applyFilters}
      className="space-y-4 rounded-lg bg-gray-50 p-4 ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10"
    >
      {/* Period chips */}
      <div className="flex flex-wrap gap-2">
        {presetChips.map((chip) => (
          <Link
            key={chip.key}
            href={chip.href}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors",
              activePreset === chip.key
                ? "bg-indigo-600 text-white ring-indigo-600 dark:bg-indigo-500 dark:ring-indigo-500"
                : "bg-white text-gray-700 ring-gray-300 hover:bg-gray-100 dark:bg-white/10 dark:text-gray-200 dark:ring-white/10 dark:hover:bg-white/15",
            )}
          >
            {chip.label}
          </Link>
        ))}
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500"
          />
        </label>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500"
          />
        </label>
      </div>

      {/* Dropdowns */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SimpleSelect
          label="Client"
          value={clientId}
          onChange={setClientId}
          options={[{ value: "", label: "All clients" }, ...clients]}
        />
        <SimpleSelect
          label="Firm"
          value={firmId}
          onChange={setFirmId}
          options={[{ value: "", label: "All firms" }, ...firms]}
        />
        <SimpleSelect
          label="Billing Type"
          value={billingType}
          onChange={setBillingType}
          options={[
            { value: "", label: "All types" },
            { value: "gst", label: "GST" },
            { value: "non-gst", label: "Non-GST" },
            { value: "catering", label: "Catering" },
          ]}
        />
        <SimpleSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "", label: "All statuses" },
            { value: "draft", label: "Draft" },
            { value: "confirmed", label: "Confirmed" },
            { value: "invoiced", label: "Invoiced" },
          ]}
        />
      </div>

      {/* Search */}
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
        Search (shop or event name)
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. Sharma wedding"
          className="mt-1 block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
        />
      </label>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Filtering..." : "Apply Filters"}
          </Button>
          <Link
            href="/orders"
            className="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 dark:bg-white/10 dark:text-gray-200 dark:ring-white/10 dark:hover:bg-white/15"
          >
            Reset
          </Link>
        </div>
        <a
          href={csvHref}
          className="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 dark:bg-white/10 dark:text-gray-200 dark:ring-white/10 dark:hover:bg-white/15"
        >
          Export CSV
        </a>
      </div>
    </form>
  );
}

function SimpleSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
}) {
  return (
    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-md bg-white py-1.5 pr-8 pl-3 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
