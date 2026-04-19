import { requireAuth } from "@/lib/session";
import { getOrdersByDate } from "@/actions/orders";
import { OrderCard } from "@/components/orders/order-card";
import { ShareOrdersButton } from "@/components/orders/share-orders-button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils";
import { formatOrderSummary } from "@/lib/order-summary";
import { ArrowLeftIcon, CalendarDaysIcon, PlusIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

function formatDayHeading(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function DayViewPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const user = await requireAuth();
  const { date } = await params;

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Invalid date format.
        </p>
      </div>
    );
  }

  const orders = await getOrdersByDate(date);
  const monthParam = date.slice(0, 7); // "YYYY-MM"

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const isAdmin = user.role === "admin";
  const summaryText = totalOrders > 0 ? formatOrderSummary(date, orders) : "";

  return (
    <div className="relative">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/calendar?month=${monthParam}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeftIcon className="size-4" />
          Back to calendar
        </Link>
        <div className="mt-2 flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatDayHeading(date)}
          </h1>
          {totalOrders > 0 && <ShareOrdersButton summaryText={summaryText} />}
        </div>
      </div>

      {/* Stats row */}
      {totalOrders > 0 && (
        <div className="mb-6 flex gap-4">
          <div className="rounded-lg bg-white px-4 py-3 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Orders
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {totalOrders}
            </p>
          </div>
          <div className="rounded-lg bg-white px-4 py-3 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Revenue
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
        </div>
      )}

      {/* Orders list */}
      {orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              id={order.id}
              shopName={order.shopName}
              items={order.items}
              totalAmount={order.totalAmount}
              status={order.status}
              billingType={order.billingType}
            />
          ))}
        </div>
      ) : (
        <div className="py-16">
          <EmptyState
            icon={CalendarDaysIcon}
            title="No orders for this day"
            description="Tap the + button to create an order."
          />
        </div>
      )}

      {/* FAB — admin only */}
      {isAdmin && (
        <Link
          href={`/orders/new?date=${date}`}
          className="fixed bottom-24 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 xl:bottom-8"
        >
          <PlusIcon className="size-7" />
        </Link>
      )}
    </div>
  );
}
