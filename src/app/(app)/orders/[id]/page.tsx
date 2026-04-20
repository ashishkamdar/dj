import { requireAuth } from "@/lib/session";
import { getOrder, deleteOrder } from "@/actions/orders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeftIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatusUpdater } from "@/components/orders/order-status-updater";

const statusColor: Record<string, "gray" | "blue" | "green"> = {
  draft: "gray",
  confirmed: "blue",
  invoiced: "green",
};

const billingTypeLabel: Record<string, string> = {
  gst: "GST",
  "non-gst": "Non-GST",
  catering: "Catering",
};

const billingTypeColor: Record<string, "indigo" | "gray" | "purple"> = {
  gst: "indigo",
  "non-gst": "gray",
  catering: "purple",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);

  if (isNaN(id)) notFound();

  const order = await getOrder(id);
  if (!order) notFound();

  const isAdmin = user.role === "admin";
  const resolvedStatus = order.status ?? "draft";

  const deleteAction = async () => {
    "use server";
    await deleteOrder(id);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/calendar/${order.date}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeftIcon className="size-4" />
          Back to {formatDate(order.date)}
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {order.shopName ?? "Unknown Client"}
          </h1>
          <Badge color={statusColor[resolvedStatus] ?? "gray"}>
            {resolvedStatus.charAt(0).toUpperCase() + resolvedStatus.slice(1)}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {formatDate(order.date)}
        </p>
      </div>

      {/* Order info */}
      <div className="mb-6 space-y-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
        <div className="flex justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Firm
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {order.firmName ?? "N/A"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Billing Type
          </span>
          <Badge color={billingTypeColor[order.billingType] ?? "gray"}>
            {billingTypeLabel[order.billingType] ?? order.billingType}
          </Badge>
        </div>
        {order.billingType === "catering" && (
          <>
            {order.eventName && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Event
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {order.eventName}
                </span>
              </div>
            )}
            {order.eventDate && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Event Date
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(order.eventDate)}
                </span>
              </div>
            )}
            {order.advancePaid !== null && order.advancePaid !== undefined && order.advancePaid > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Advance Paid
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrency(order.advancePaid)}
                </span>
              </div>
            )}
          </>
        )}
        {order.notes && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Notes
            </span>
            <span className="text-sm text-gray-900 dark:text-white">
              {order.notes}
            </span>
          </div>
        )}
      </div>

      {/* Items — mobile cards + desktop table */}
      <div className="mb-6">
        {/* Mobile: stacked cards */}
        <div className="space-y-2 sm:hidden">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10"
            >
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.productName ?? "Unknown"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {item.quantity} {item.unit} × {formatCurrency(item.rate)}
                </p>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatCurrency(item.amount)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-lg bg-gray-100 px-4 py-3 dark:bg-gray-800">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total</span>
            <span className="text-base font-semibold text-gray-900 dark:text-white">
              {formatCurrency(order.totalAmount)}
            </span>
          </div>
        </div>

        {/* Desktop: table */}
        <div className="hidden sm:block overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Product
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Qty
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Unit
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Rate
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {item.productName ?? "Unknown"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300">
                    {item.quantity}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {item.unit}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300">
                    {formatCurrency(item.rate)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <td
                  colSpan={4}
                  className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white"
                >
                  Total
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(order.totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Item status tracking */}
      {order.items.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            Item Status
          </h2>
          <OrderStatusUpdater
            items={order.items.map((item) => ({
              id: item.id,
              productName: item.productName ?? "Unknown",
              quantity: item.quantity,
              unit: item.unit ?? "kg",
              itemStatus: item.itemStatus ?? "received",
            }))}
          />
        </div>
      )}

      {/* Admin actions */}
      {isAdmin && (
        <div className="flex flex-wrap gap-3">
          <Link href={`/orders/${id}/invoice`}>
            <Button variant="primary">
              <DocumentTextIcon className="mr-1.5 size-4" />
              Invoice
            </Button>
          </Link>
          <Link href={`/orders/${id}/edit`}>
            <Button variant="secondary">Edit</Button>
          </Link>
          <form action={deleteAction}>
            <Button type="submit" variant="danger">
              Delete
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
