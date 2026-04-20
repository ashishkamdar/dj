import { requireAdmin } from "@/lib/session";
import { getOrder } from "@/actions/orders";
import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";
import { OrderForm } from "@/components/orders/order-form";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id: idStr } = await params;
  const orderId = parseInt(idStr, 10);
  if (isNaN(orderId)) notFound();

  const order = await getOrder(orderId);
  if (!order) notFound();

  // Load active firms
  const firms = db
    .select({ id: schema.firms.id, name: schema.firms.name })
    .from(schema.firms)
    .where(eq(schema.firms.isActive, true))
    .all();

  // Load active clients, recurring first
  const clients = db
    .select({
      id: schema.clients.id,
      shopName: schema.clients.shopName,
      isRecurring: schema.clients.isRecurring,
      defaultFirmId: schema.clients.defaultFirmId,
    })
    .from(schema.clients)
    .where(eq(schema.clients.isActive, true))
    .orderBy(desc(schema.clients.isRecurring))
    .all();

  // Load active products
  const products = db
    .select({
      id: schema.products.id,
      name: schema.products.name,
      defaultUnit: schema.products.defaultUnit,
      defaultRate: schema.products.defaultRate,
    })
    .from(schema.products)
    .where(eq(schema.products.isActive, true))
    .all();

  const formattedDate = new Date(order.date + "T00:00:00").toLocaleDateString(
    "en-IN",
    { day: "numeric", month: "long", year: "numeric" },
  );

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/calendar/${order.date}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeftIcon className="size-4" />
          Back to {formattedDate}
        </Link>
        <h1 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
          Edit Order
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {order.shopName} &middot; {formattedDate}
        </p>
      </div>

      <OrderForm
        date={order.date}
        firms={firms}
        clients={clients}
        products={products}
        order={{
          id: order.id,
          date: order.date,
          clientId: order.clientId,
          firmId: order.firmId,
          billingType: order.billingType,
          status: order.status,
          notes: order.notes,
          eventDate: order.eventDate,
          eventName: order.eventName,
          advancePaid: order.advancePaid,
          items: order.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            amount: item.amount,
          })),
        }}
      />
    </div>
  );
}
