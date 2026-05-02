import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { adminDb, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { getRecurringTemplate } from "@/actions/recurring";
import { RecurringTemplateForm } from "@/components/recurring/recurring-template-form";

export default async function EditRecurringPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { tenantId } = await requireAdmin();
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();

  const tpl = await getRecurringTemplate(id);
  if (!tpl) notFound();

  const [firms, clients, products] = await Promise.all([
    adminDb
      .select({
        id: schema.firms.id,
        name: schema.firms.name,
        isGstRegistered: schema.firms.isGstRegistered,
      })
      .from(schema.firms)
      .where(
        and(
          eq(schema.firms.tenantId, tenantId),
          eq(schema.firms.isActive, true),
        ),
      ),
    adminDb
      .select({
        id: schema.clients.id,
        shopName: schema.clients.shopName,
        defaultFirmId: schema.clients.defaultFirmId,
        isRecurring: schema.clients.isRecurring,
      })
      .from(schema.clients)
      .where(
        and(
          eq(schema.clients.tenantId, tenantId),
          eq(schema.clients.isActive, true),
        ),
      ),
    adminDb
      .select({
        id: schema.products.id,
        name: schema.products.name,
        defaultUnit: schema.products.defaultUnit,
        defaultRate: schema.products.defaultRate,
      })
      .from(schema.products)
      .where(
        and(
          eq(schema.products.tenantId, tenantId),
          eq(schema.products.isActive, true),
        ),
      ),
  ]);

  return (
    <div className="w-full max-w-full min-w-0">
      <div className="mb-6">
        <Link
          href="/recurring"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeftIcon className="size-4" />
          Back to Recurring
        </Link>
        <h1 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
          Edit schedule
        </h1>
      </div>

      <RecurringTemplateForm
        firms={firms}
        clients={clients}
        products={products}
        template={{
          id: tpl.id,
          clientId: tpl.clientId,
          firmId: tpl.firmId,
          name: tpl.name ?? "",
          daysOfWeek: tpl.daysOfWeek,
          billingType: tpl.billingType,
          notes: tpl.notes,
          items: tpl.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unit: i.unit,
            rate: i.rate,
          })),
        }}
      />
    </div>
  );
}
