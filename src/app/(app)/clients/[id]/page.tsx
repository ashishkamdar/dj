import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/session";
import { getClient } from "@/actions/clients";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LedgerTable } from "@/components/clients/ledger-table";
import { formatCurrency } from "@/lib/utils";
import { getClientBalance, getClientLedger } from "@/lib/ledger";
import { getCurrentFY, getFYRange } from "@/lib/financial-year";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fy?: string }>;
}) {
  const session = await requireAuth();
  const { id } = await params;
  const { fy: fyParam } = await searchParams;
  const client = await getClient(Number(id));

  if (!client) {
    notFound();
  }

  const isAdmin = session.role === "admin";

  // Determine FY range
  const currentFY = getCurrentFY();
  const selectedFY = fyParam || currentFY.label;
  const fyRange = getFYRange(selectedFY);

  // Get balance and ledger
  const balance = await getClientBalance(session.tenantId, client.id);
  const ledger = await getClientLedger(session.tenantId, client.id, fyRange.start, fyRange.end);

  // Generate FY options (current + 2 previous)
  const fyOptions: string[] = [];
  const startYear = parseInt(currentFY.label.split("-")[0]);
  for (let i = 2; i >= 0; i--) {
    const y = startYear - i;
    const suffix = String(y + 1).slice(-2);
    fyOptions.push(`${y}-${suffix}`);
  }

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

      {/* Balance card */}
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Current Balance
            </p>
            <p
              className={`mt-1 text-2xl font-bold ${
                balance > 0
                  ? "text-red-600 dark:text-red-400"
                  : balance < 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-900 dark:text-white"
              }`}
            >
              {formatCurrency(Math.abs(balance))}
              {balance > 0 ? " Due" : balance < 0 ? " Advance" : ""}
            </p>
          </div>
          {isAdmin && (
            <Link href={`/clients/${client.id}/payment`}>
              <Button>Add Payment</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
        <dl className="divide-y divide-gray-200 dark:divide-white/10">
          <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 first:pt-0">
            <dt className="text-sm font-medium text-gray-900 dark:text-gray-200">
              Phone
            </dt>
            <dd className="mt-1 text-sm text-gray-500 sm:col-span-2 sm:mt-0 dark:text-gray-400">
              {client.phone || "\u2014"}
            </dd>
          </div>
          <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-900 dark:text-gray-200">
              Address
            </dt>
            <dd className="mt-1 text-sm text-gray-500 sm:col-span-2 sm:mt-0 dark:text-gray-400">
              {client.address || "\u2014"}
            </dd>
          </div>
          <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-900 dark:text-gray-200">
              GSTIN
            </dt>
            <dd className="mt-1 text-sm text-gray-500 sm:col-span-2 sm:mt-0 dark:text-gray-400">
              {client.gstNumber || "\u2014"}
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

      {/* Ledger */}
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Ledger
          </h3>
          <div className="flex gap-2">
            {fyOptions.map((fy) => (
              <Link
                key={fy}
                href={`/clients/${client.id}?fy=${fy}`}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  selectedFY === fy
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20"
                }`}
              >
                FY {fy}
              </Link>
            ))}
          </div>
        </div>
        <LedgerTable entries={ledger} />
      </div>
    </div>
  );
}
