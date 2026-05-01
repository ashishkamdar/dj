"use client";

import { cn } from "@/lib/utils";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  TableCellsIcon,
} from "@heroicons/react/20/solid";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CalendarGridProps {
  year: number;
  month: number; // 1-12
  orderCounts: Record<string, number>; // "2026-04-20" → 5
  today: string; // "2026-04-20"
}

interface CalendarDay {
  date: string;
  isCurrentMonth: boolean;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_NAMES_SHORT = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_NAMES_FULL = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function formatDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCalendarDays(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  // Start from Monday (adjust if first day is not Monday)
  let startDay = firstDay.getDay(); // 0=Sun, 1=Mon...
  startDay = startDay === 0 ? 6 : startDay - 1; // Convert to Mon=0

  const days: CalendarDay[] = [];

  // Previous month padding
  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, -i);
    days.push({ date: formatDateString(d), isCurrentMonth: false });
  }

  // Current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(year, month - 1, i);
    days.push({ date: formatDateString(d), isCurrentMonth: true });
  }

  // Next month padding to fill 42 cells
  while (days.length < 42) {
    const d = new Date(
      year,
      month,
      days.length - startDay - lastDay.getDate() + 1,
    );
    days.push({ date: formatDateString(d), isCurrentMonth: false });
  }

  return days;
}

function getMonthParam(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function getPrevMonth(year: number, month: number): string {
  if (month === 1) return getMonthParam(year - 1, 12);
  return getMonthParam(year, month - 1);
}

function getNextMonth(year: number, month: number): string {
  if (month === 12) return getMonthParam(year + 1, 1);
  return getMonthParam(year, month + 1);
}

function getDayNumber(dateStr: string): number {
  return parseInt(dateStr.split("-")[2], 10);
}

export function CalendarGrid({
  year,
  month,
  orderCounts,
  today,
}: CalendarGridProps) {
  const router = useRouter();
  const days = getCalendarDays(year, month);

  const todayYear = parseInt(today.split("-")[0], 10);
  const todayMonth = parseInt(today.split("-")[1], 10);
  const todayMonthParam = getMonthParam(todayYear, todayMonth);
  const currentMonthParam = getMonthParam(year, month);
  const isCurrentMonth = todayMonthParam === currentMonthParam;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between py-4">
        <h1 className="text-base font-semibold text-gray-900 dark:text-white">
          {MONTH_NAMES[month - 1]} {year}
        </h1>
        <div className="flex items-center gap-x-2 md:gap-x-4">
          {/* List view link */}
          <Link
            href={`/orders?from=${year}-${String(month).padStart(2, "0")}-01&to=${year}-${String(month).padStart(2, "0")}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-white px-3 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-gray-200 dark:shadow-none dark:ring-white/5 dark:hover:bg-white/15"
            title="View as list"
          >
            <TableCellsIcon className="size-5" aria-hidden="true" />
            <span className="hidden md:inline">List</span>
          </Link>
          {/* Today button (standalone) */}
          {!isCurrentMonth && (
            <Link
              href={`/calendar?month=${todayMonthParam}`}
              className="hidden rounded-md px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 md:block dark:text-white dark:hover:bg-white/10"
            >
              Today
            </Link>
          )}
          {/* Prev/Next button group */}
          <div className="relative flex items-center rounded-md bg-white shadow-sm ring-1 ring-gray-300 md:items-stretch dark:bg-white/10 dark:shadow-none dark:ring-white/5">
            <Link
              href={`/calendar?month=${getPrevMonth(year, month)}`}
              className="flex h-9 w-12 items-center justify-center rounded-l-md text-gray-400 hover:text-gray-500 focus:relative dark:hover:text-white"
            >
              <span className="sr-only">Previous month</span>
              <ChevronLeftIcon className="size-5" aria-hidden="true" />
            </Link>
            <span className="relative -mx-px h-5 w-px bg-gray-300 md:hidden dark:bg-white/10" />
            <Link
              href={`/calendar?month=${getNextMonth(year, month)}`}
              className="flex h-9 w-12 items-center justify-center rounded-r-md text-gray-400 hover:text-gray-500 focus:relative dark:hover:text-white"
            >
              <span className="sr-only">Next month</span>
              <ChevronRightIcon className="size-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px border-b border-gray-300 bg-gray-200 text-center text-xs/6 font-semibold text-gray-700 lg:flex-none dark:border-white/5 dark:bg-white/15 dark:text-gray-300">
        {DAY_NAMES_SHORT.map((short, i) => (
          <div
            key={i}
            className="flex justify-center bg-white py-2 dark:bg-gray-900"
          >
            <span className="sr-only">{DAY_NAMES_FULL[i]}</span>
            <span aria-hidden="true">{short}</span>
          </div>
        ))}
      </div>

      {/* Desktop grid */}
      <div className="hidden bg-gray-200 text-sm lg:grid lg:grid-cols-7 lg:gap-px dark:bg-white/10">
        {days.map((day) => {
          const isToday = day.date === today;
          const count = orderCounts[day.date] || 0;
          const dayNum = getDayNumber(day.date);

          return (
            <Link
              key={day.date}
              href={`/calendar/${day.date}`}
              className={cn(
                "group relative min-h-[6rem] px-3 py-2 transition-colors",
                day.isCurrentMonth
                  ? "bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800"
                  : "bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/50 dark:hover:bg-gray-800/50",
              )}
            >
              <time
                dateTime={day.date}
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-sm",
                  isToday &&
                    "bg-indigo-600 font-semibold text-white dark:bg-indigo-500",
                  !isToday &&
                    day.isCurrentMonth &&
                    "text-gray-900 dark:text-white",
                  !isToday &&
                    !day.isCurrentMonth &&
                    "text-gray-400 dark:text-gray-500",
                )}
              >
                {dayNum}
              </time>
              {count > 0 && (
                <div className="mt-1">
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-700/10 ring-inset dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/20">
                    {count} {count === 1 ? "order" : "orders"}
                  </span>
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Mobile grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 lg:hidden dark:bg-white/10">
        {days.map((day) => {
          const isToday = day.date === today;
          const count = orderCounts[day.date] || 0;
          const dayNum = getDayNumber(day.date);

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => router.push(`/calendar/${day.date}`)}
              className={cn(
                "flex h-14 flex-col items-center justify-center",
                day.isCurrentMonth
                  ? "bg-white dark:bg-gray-900"
                  : "bg-gray-50 dark:bg-gray-900/50",
              )}
            >
              <time
                dateTime={day.date}
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-sm",
                  isToday &&
                    "bg-indigo-600 font-semibold text-white dark:bg-indigo-500",
                  !isToday &&
                    day.isCurrentMonth &&
                    "text-gray-900 dark:text-white",
                  !isToday &&
                    !day.isCurrentMonth &&
                    "text-gray-400 dark:text-gray-500",
                )}
              >
                {dayNum}
              </time>
              {count > 0 && (
                <div className="mt-0.5 flex gap-0.5">
                  {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                    <span
                      key={i}
                      className="size-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"
                    />
                  ))}
                  {count > 3 && (
                    <span className="text-[8px] leading-none font-medium text-gray-500 dark:text-gray-400">
                      +
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
