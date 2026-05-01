"use client";

import { useState, useEffect } from "react";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils";
import { getCurrentFY, getFYRange, type FYRange } from "@/lib/financial-year";
import {
  getDailySummary,
  getMonthlySummary,
  getProductAnalytics,
  getClientAnalytics,
  getOverviewSummary,
  type DailySummary,
  type MonthlySummary,
  type ProductAnalyticsRow,
  type ClientAnalyticsRow,
  type OverviewSummary,
  type OverviewPeriod,
} from "@/actions/analytics";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

const tabs = ["Overview", "Daily", "Monthly", "Products", "Clients"] as const;
type Tab = (typeof tabs)[number];

function todayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentMonthYear() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Analytics"
        description="View business insights and trends"
      />

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-white/10">
        <nav className="-mb-px flex gap-x-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap border-b-2 py-3 text-sm font-medium ${
                activeTab === tab
                  ? "border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "Overview" && <OverviewTab />}
      {activeTab === "Daily" && <DailyTab />}
      {activeTab === "Monthly" && <MonthlyTab />}
      {activeTab === "Products" && <ProductsTab />}
      {activeTab === "Clients" && <ClientsTab />}
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────

function getIsoWeek(d: Date): string {
  // Returns "YYYY-Www"
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const week =
    1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function OverviewTab() {
  const now = new Date();
  const [period, setPeriod] = useState<OverviewPeriod>("month");
  const [weekAnchor, setWeekAnchor] = useState(getIsoWeek(now));
  const [monthAnchor, setMonthAnchor] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  );
  const [yearAnchor, setYearAnchor] = useState(String(now.getFullYear()));
  const [data, setData] = useState<OverviewSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const anchor =
    period === "week"
      ? weekAnchor
      : period === "month"
        ? monthAnchor
        : yearAnchor;

  useEffect(() => {
    setLoading(true);
    getOverviewSummary(period, anchor).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [period, anchor]);

  return (
    <div className="space-y-6">
      {/* Period toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-md bg-gray-100 p-1 dark:bg-white/5">
          {(["week", "month", "year"] as OverviewPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                period === p
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        {period === "week" && (
          <input
            type="week"
            value={weekAnchor}
            onChange={(e) => setWeekAnchor(e.target.value)}
            className="rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500"
          />
        )}
        {period === "month" && (
          <input
            type="month"
            value={monthAnchor}
            onChange={(e) => setMonthAnchor(e.target.value)}
            className="rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500"
          />
        )}
        {period === "year" && (
          <select
            value={yearAnchor}
            onChange={(e) => setYearAnchor(e.target.value)}
            className="rounded-md bg-white py-1.5 pr-8 pl-3 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500"
          >
            {Array.from({ length: 4 }).map((_, i) => {
              const y = now.getFullYear() - i;
              return (
                <option key={y} value={y}>
                  {y}
                </option>
              );
            })}
          </select>
        )}
        {data && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {data.range.from} → {data.range.to}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="size-8" />
        </div>
      ) : data ? (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard label="Revenue" value={formatCurrency(data.revenue)} />
            <KpiCard label="Orders" value={String(data.orderCount)} />
            <KpiCard
              label="Avg Order Value"
              value={formatCurrency(data.avgOrderValue)}
            />
            <KpiCard
              label="Items Sold"
              value={`${Math.round(data.itemsSold * 10) / 10} kg`}
            />
            <KpiCard
              label="GST Collected"
              value={formatCurrency(data.gstCollected)}
            />
            <KpiCard
              label="Payments Received"
              value={formatCurrency(data.paymentsReceived)}
              tone="positive"
            />
            <KpiCard
              label="Outstanding (now)"
              value={formatCurrency(data.outstandingTotal)}
              tone={data.outstandingTotal > 0 ? "negative" : "neutral"}
            />
            <KpiCard label="Active Clients" value={String(data.activeClients)} />
          </div>

          {/* Billing-type split */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SplitCard
              label="Kaccha (Non-GST)"
              revenue={data.splits.kaccha.revenue}
              orders={data.splits.kaccha.orders}
              tone="amber"
            />
            <SplitCard
              label="Pakka (GST)"
              revenue={data.splits.pakka.revenue}
              orders={data.splits.pakka.orders}
              tone="indigo"
            />
            <SplitCard
              label="Catering"
              revenue={data.splits.catering.revenue}
              orders={data.splits.catering.orders}
              tone="purple"
            />
          </div>

          {/* Trend chart */}
          <div className="rounded-lg bg-white p-4 ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
            <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
              Revenue trend
            </h3>
            <TrendChart trend={data.trend} />
          </div>

          {/* Top lists */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <TopList
              title="Top Products"
              items={data.topProducts.map((p) => ({
                primary: p.name,
                secondary: `${Math.round(p.qty * 10) / 10} kg`,
                value: formatCurrency(p.revenue),
              }))}
              empty="No products in this period."
            />
            <TopList
              title="Top Clients"
              items={data.topClients.map((c) => ({
                primary: c.name,
                value: formatCurrency(c.revenue),
              }))}
              empty="No clients in this period."
            />
            <TopList
              title="Top Outstanding"
              items={data.topOutstanding.map((c) => ({
                primary: c.name,
                value: formatCurrency(c.balance),
                valueTone: "negative",
              }))}
              empty="All clients are settled."
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const valueClass =
    tone === "positive"
      ? "text-green-600 dark:text-green-400"
      : tone === "negative"
        ? "text-red-600 dark:text-red-400"
        : "text-gray-900 dark:text-white";
  return (
    <div className="rounded-lg bg-white p-3 ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-base font-semibold sm:text-lg ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function SplitCard({
  label,
  revenue,
  orders,
  tone,
}: {
  label: string;
  revenue: number;
  orders: number;
  tone: "amber" | "indigo" | "purple";
}) {
  const dot =
    tone === "amber"
      ? "bg-amber-500"
      : tone === "indigo"
        ? "bg-indigo-500"
        : "bg-purple-500";
  return (
    <div className="rounded-lg bg-white p-4 ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
      <div className="flex items-center gap-2">
        <span className={`size-2 rounded-full ${dot}`} aria-hidden="true" />
        <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
          {label}
        </p>
      </div>
      <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
        {formatCurrency(revenue)}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {orders} {orders === 1 ? "order" : "orders"}
      </p>
    </div>
  );
}

function TrendChart({
  trend,
}: {
  trend: { label: string; revenue: number }[];
}) {
  const max = Math.max(...trend.map((t) => t.revenue), 1);
  return (
    <div className="flex h-32 items-end gap-0.5">
      {trend.map((t, i) => (
        <div
          key={i}
          className="flex flex-1 flex-col items-center"
          title={`${t.label}: ${formatCurrency(t.revenue)}`}
        >
          <div
            className="w-full min-h-[1px] rounded-t bg-indigo-500 dark:bg-indigo-400"
            style={{ height: `${(t.revenue / max) * 100}%` }}
          />
          <span className="mt-1 text-[9px] text-gray-500 dark:text-gray-400">
            {t.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function TopList({
  title,
  items,
  empty,
}: {
  title: string;
  items: {
    primary: string;
    secondary?: string;
    value: string;
    valueTone?: "negative";
  }[];
  empty: string;
}) {
  return (
    <div className="rounded-lg bg-white p-4 ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
      <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">{empty}</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-white/10">
          {items.map((it, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {it.primary}
                </p>
                {it.secondary && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {it.secondary}
                  </p>
                )}
              </div>
              <p
                className={`shrink-0 text-sm font-semibold ${
                  it.valueTone === "negative"
                    ? "text-red-600 dark:text-red-400"
                    : "text-gray-900 dark:text-white"
                }`}
              >
                {it.value}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DailyTab() {
  const [date, setDate] = useState(todayString());
  const [data, setData] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getDailySummary(date).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [date]);

  return (
    <div className="space-y-6">
      <div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="block rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="size-8" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard name="Total Orders" value={data.totalOrders} />
            <StatCard
              name="Revenue"
              value={formatCurrency(data.totalRevenue)}
            />
            <StatCard name="Items Produced" value={Math.round(data.totalItems)} unit="qty" />
          </div>

          {data.statusBreakdown.length > 0 && (
            <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Order Status Breakdown
              </h3>
              <div className="flex flex-wrap gap-3">
                {data.statusBreakdown.map((s) => (
                  <div key={s.status} className="flex items-center gap-2">
                    <Badge
                      color={
                        s.status === "confirmed"
                          ? "green"
                          : s.status === "invoiced"
                            ? "blue"
                            : "yellow"
                      }
                    >
                      {s.status}
                    </Badge>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {s.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function MonthlyTab() {
  const { year: curYear, month: curMonth } = currentMonthYear();
  const [year, setYear] = useState(curYear);
  const [month, setMonth] = useState(curMonth);
  const [data, setData] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMonthlySummary(year, month).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [year, month]);

  const monthValue = `${year}-${String(month).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <div>
        <input
          type="month"
          value={monthValue}
          onChange={(e) => {
            const [y, m] = e.target.value.split("-");
            setYear(parseInt(y, 10));
            setMonth(parseInt(m, 10));
          }}
          className="block rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="size-8" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard name="Total Orders" value={data.orderCount} />
            <StatCard
              name="Total Revenue"
              value={formatCurrency(data.totalRevenue)}
            />
          </div>

          {/* Bar chart */}
          <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
              Daily Revenue
            </h3>
            {(() => {
              const maxValue = Math.max(
                ...data.dailyRevenue.map((d) => d.revenue),
                1
              );
              return (
                <div className="flex items-end gap-1 h-40">
                  {data.dailyRevenue.map(({ day, revenue }) => (
                    <div
                      key={day}
                      className="flex flex-col items-center flex-1"
                    >
                      <div
                        className="w-full bg-indigo-500 dark:bg-indigo-400 rounded-t min-h-[1px]"
                        style={{
                          height: `${(revenue / maxValue) * 100}%`,
                        }}
                      />
                      <span className="text-[10px] text-gray-500 mt-1">
                        {day}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Top Products */}
          {data.topProducts.length > 0 && (
            <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                Top 5 Products
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300 dark:divide-white/10">
                  <thead>
                    <tr>
                      <th className="py-2 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                        Product
                      </th>
                      <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-gray-200">
                        Qty
                      </th>
                      <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-gray-200">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                    {data.topProducts.map((p) => (
                      <tr key={p.name}>
                        <td className="py-2 pr-3 text-sm text-gray-900 dark:text-white">
                          {p.name}
                        </td>
                        <td className="px-3 py-2 text-right text-sm text-gray-500 dark:text-gray-400">
                          {p.qty}
                        </td>
                        <td className="px-3 py-2 text-right text-sm text-gray-500 dark:text-gray-400">
                          {formatCurrency(p.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top Clients */}
          {data.topClients.length > 0 && (
            <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                Top 5 Clients
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300 dark:divide-white/10">
                  <thead>
                    <tr>
                      <th className="py-2 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                        Client
                      </th>
                      <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-gray-200">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                    {data.topClients.map((c) => (
                      <tr key={c.name}>
                        <td className="py-2 pr-3 text-sm text-gray-900 dark:text-white">
                          {c.name}
                        </td>
                        <td className="px-3 py-2 text-right text-sm text-gray-500 dark:text-gray-400">
                          {formatCurrency(c.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function ProductsTab() {
  const fy = getCurrentFY();
  const [fyLabel, setFyLabel] = useState(fy.label);
  const [data, setData] = useState<ProductAnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const range = getFYRange(fyLabel);
    getProductAnalytics(range.start, range.end).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [fyLabel]);

  // Generate FY options: current FY and 2 previous
  const fyOptions = [];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const startYear = currentMonth >= 3 ? currentYear : currentYear - 1;
  for (let i = 0; i < 3; i++) {
    const y = startYear - i;
    fyOptions.push(`${y}-${String(y + 1).slice(-2)}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <select
          value={fyLabel}
          onChange={(e) => setFyLabel(e.target.value)}
          className="block rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500"
        >
          {fyOptions.map((opt) => (
            <option key={opt} value={opt}>
              FY {opt}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="size-8" />
        </div>
      ) : data.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-12">
          No product data for this period.
        </p>
      ) : (
        <div className="overflow-hidden shadow-sm ring-1 ring-black/5 sm:rounded-lg dark:shadow-none dark:ring-white/10">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300 dark:divide-white/10">
              <thead className="bg-gray-50 dark:bg-gray-800/75">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 dark:text-gray-200">
                    Product
                  </th>
                  <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-gray-200">
                    Qty Sold
                  </th>
                  <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-gray-200">
                    Revenue
                  </th>
                  <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-gray-200">
                    Avg Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-white/10 dark:bg-gray-800/50">
                {data.map((p) => (
                  <tr key={p.name}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 dark:text-white">
                      {p.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-gray-500 dark:text-gray-400">
                      {p.totalQty}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-gray-500 dark:text-gray-400">
                      {formatCurrency(p.totalRevenue)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-gray-500 dark:text-gray-400">
                      {formatCurrency(p.avgRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ClientsTab() {
  const fy = getCurrentFY();
  const [fyLabel, setFyLabel] = useState(fy.label);
  const [data, setData] = useState<ClientAnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const range = getFYRange(fyLabel);
    getClientAnalytics(range.start, range.end).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [fyLabel]);

  const fyOptions = [];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const startYear = currentMonth >= 3 ? currentYear : currentYear - 1;
  for (let i = 0; i < 3; i++) {
    const y = startYear - i;
    fyOptions.push(`${y}-${String(y + 1).slice(-2)}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <select
          value={fyLabel}
          onChange={(e) => setFyLabel(e.target.value)}
          className="block rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500"
        >
          {fyOptions.map((opt) => (
            <option key={opt} value={opt}>
              FY {opt}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="size-8" />
        </div>
      ) : data.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-12">
          No client data for this period.
        </p>
      ) : (
        <div className="overflow-hidden shadow-sm ring-1 ring-black/5 sm:rounded-lg dark:shadow-none dark:ring-white/10">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300 dark:divide-white/10">
              <thead className="bg-gray-50 dark:bg-gray-800/75">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 dark:text-gray-200">
                    Client
                  </th>
                  <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-gray-200">
                    Orders
                  </th>
                  <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-gray-200">
                    Revenue
                  </th>
                  <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-gray-200">
                    Outstanding
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-white/10 dark:bg-gray-800/50">
                {data.map((c) => (
                  <tr key={c.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 dark:text-white">
                      {c.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-gray-500 dark:text-gray-400">
                      {c.totalOrders}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-gray-500 dark:text-gray-400">
                      {formatCurrency(c.totalRevenue)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-gray-500 dark:text-gray-400">
                      {formatCurrency(c.outstandingBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
