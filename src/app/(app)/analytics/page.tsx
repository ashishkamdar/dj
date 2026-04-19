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
  type DailySummary,
  type MonthlySummary,
  type ProductAnalyticsRow,
  type ClientAnalyticsRow,
} from "@/actions/analytics";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

const tabs = ["Daily", "Monthly", "Products", "Clients"] as const;
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
  const [activeTab, setActiveTab] = useState<Tab>("Daily");

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

      {activeTab === "Daily" && <DailyTab />}
      {activeTab === "Monthly" && <MonthlyTab />}
      {activeTab === "Products" && <ProductsTab />}
      {activeTab === "Clients" && <ClientsTab />}
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
