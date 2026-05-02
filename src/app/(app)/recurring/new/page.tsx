import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { requireAdmin } from "@/lib/session";
import { adminDb, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { RecurringTemplateForm } from "@/components/recurring/recurring-template-form";

export default async function NewRecurringPage() {
  const { tenantId } = await requireAdmin();

  const [firms, clients, products] = await Promise.all([
    adminDb
      .select({
        id: schema.firms.id,
        name: schema.firms.name,
        isGstRegistered: schema.firms.isGstRegistered,
        isDefault: schema.firms.isDefault,
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
          eq(schema.clients.isRecurring, true),
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

  const defaultFirmId = firms.find((f) => f.isDefault)?.id ?? null;

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
          New schedule
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Only recurring clients are listed. Mark a client as recurring on the
          Client edit page first.
        </p>
      </div>

      <RecurringTemplateForm
        firms={firms}
        clients={clients}
        products={products}
        defaultFirmId={defaultFirmId}
      />
    </div>
  );
}
