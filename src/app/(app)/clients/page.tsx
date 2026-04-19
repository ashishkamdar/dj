import Link from "next/link";
import { requireAuth } from "@/lib/session";
import { getClients } from "@/actions/clients";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { formatCurrency } from "@/lib/utils";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireAuth();
  const { q } = await searchParams;
  const clients = await getClients(q);
  const isAdmin = session.role === "admin";

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Clients"
        description="Manage your client directory"
        action={
          isAdmin ? (
            <Link href="/clients/new">
              <Button>Add Client</Button>
            </Link>
          ) : undefined
        }
      />

      {/* Search */}
      <form className="w-full">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by shop or owner name..."
          className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
        />
      </form>

      {clients.length === 0 ? (
        <EmptyState
          icon={UserGroupIcon}
          title="No clients found"
          description={
            q
              ? "Try a different search term."
              : "Get started by adding your first client."
          }
          action={
            isAdmin && !q ? (
              <Link href="/clients/new">
                <Button>Add Client</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="block rounded-lg bg-white px-4 py-4 shadow-sm ring-1 ring-black/5 hover:bg-gray-50 dark:bg-gray-800/50 dark:ring-white/10 dark:hover:bg-white/5"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {client.shopName}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatCurrency(client.openingBalance ?? 0)}
                </span>
              </div>
              {client.ownerName && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {client.ownerName}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {client.isRecurring && (
                  <Badge color="green">Recurring</Badge>
                )}
                {client.gstNumber && (
                  <Badge color="blue">GST</Badge>
                )}
                {client.phone && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {client.phone}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
