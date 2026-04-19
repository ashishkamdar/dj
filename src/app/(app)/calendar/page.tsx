import { requireAuth } from "@/lib/session";
import { getOrderCountsByMonth } from "@/actions/orders";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { todayString } from "@/lib/utils";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireAuth();
  const { month: monthParam } = await searchParams;

  const today = todayString();
  let year: number, month: number;

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    [year, month] = monthParam.split("-").map(Number);
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }

  const orderCounts = await getOrderCountsByMonth(year, month);

  return (
    <CalendarGrid
      year={year}
      month={month}
      orderCounts={orderCounts}
      today={today}
    />
  );
}
