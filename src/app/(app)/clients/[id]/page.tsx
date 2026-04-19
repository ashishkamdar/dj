import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/session";
import { getClient } from "@/actions/clients";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const { id } = await params;
  const client = await getClient(Number(id));

  if (!client) {
    notFound();
  }

  const isAdmin = session.role === "admin";

  return (
    <div className="space-y-6">
      <SectionHeading
        title={client.shopName}
        description={client.ownerName || undefined}
        action={
          isAdmin ? (
            <Link href={`/clients/${client.id}/edit`}>
              <Button variant="secondary">Edit</Button>
            </Link>
          ) : undefined
        }
      />

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {client.isRecurring && <Badge color="green">Recurring</Badge>}
        {client.gstNumber && <Badge color="blue">GST Registered</Badge>}
      </div>

      {/* Info card */}
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
        <dl className="divide-y divide-gray-200 dark:divide-white/10">
          <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 first:pt-0">
            <dt className="text-sm font-medium text-gray-900 dark:text-gray-200">
              Phone
            </dt>
            <dd className="mt-1 text-sm text-gray-500 sm:col-span-2 sm:mt-0 dark:text-gray-400">
              {client.phone || "—"}
            </dd>
          </div>
          <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-900 dark:text-gray-200">
              Address
            </dt>
            <dd className="mt-1 text-sm text-gray-500 sm:col-span-2 sm:mt-0 dark:text-gray-400">
              {client.address || "—"}
            </dd>
          </div>
          <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-900 dark:text-gray-200">
              GSTIN
            </dt>
            <dd className="mt-1 text-sm text-gray-500 sm:col-span-2 sm:mt-0 dark:text-gray-400">
              {client.gstNumber || "—"}
            </dd>
          </div>
          <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 last:pb-0">
            <dt className="text-sm font-medium text-gray-900 dark:text-gray-200">
              Opening Balance
            </dt>
            <dd className="mt-1 text-sm text-gray-500 sm:col-span-2 sm:mt-0 dark:text-gray-400">
              {formatCurrency(client.openingBalance ?? 0)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Ledger placeholder */}
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Ledger
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Ledger entries will appear here once orders and payments are created.
        </p>
      </div>
    </div>
  );
}
