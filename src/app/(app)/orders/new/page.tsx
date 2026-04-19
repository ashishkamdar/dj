import { requireAdmin } from "@/lib/session";
import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";
import { OrderForm } from "@/components/orders/order-form";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { todayString } from "@/lib/utils";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireAdmin();
  const { date: dateParam } = await searchParams;
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
    ? dateParam
    : todayString();

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

  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString(
    "en-IN",
    { day: "numeric", month: "long", year: "numeric" },
  );

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/calendar/${date}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeftIcon className="size-4" />
          Back to {formattedDate}
        </Link>
        <h1 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
          New Order
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Order for {formattedDate}
        </p>
      </div>

      <OrderForm
        date={date}
        firms={firms}
        clients={clients}
        products={products}
      />
    </div>
  );
}
