import { getTenants } from "@/actions/super-admin";
import { requireSuperAdmin } from "@/lib/super-admin-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const statusColors = {
  active: "green",
  pending: "yellow",
  expired: "red",
  suspended: "gray",
} as const;

export default async function TenantsPage() {
  await requireSuperAdmin();
  const tenants = await getTenants();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Tenants
        </h1>
        <Link href="/super-admin/tenants/new">
          <Button size="md">Add Tenant</Button>
        </Link>
      </div>

      {/* Desktop table */}
      <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:shadow-none dark:ring-white/10">
        {/* Mobile cards */}
        <div className="divide-y divide-gray-200 sm:hidden dark:divide-white/10">
          {tenants.map((tenant) => (
            <div key={tenant.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900 dark:text-white">
                  {tenant.name}
                </p>
                <Badge
                  color={
                    statusColors[
                      tenant.status as keyof typeof statusColors
                    ] ?? "gray"
                  }
                >
                  {tenant.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {tenant.slug} &middot;{" "}
                {tenant.subscriptionPlan ?? "free"} &middot;{" "}
                {tenant.subscriptionExpiresAt
                  ? new Date(tenant.subscriptionExpiresAt).toLocaleDateString()
                  : "No expiry"}
              </p>
              <div className="flex gap-3 pt-1">
                <Link
                  href={`/super-admin/tenants/${tenant.id}`}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  View
                </Link>
                <Link
                  href={`/super-admin/tenants/${tenant.id}/impersonate`}
                  className="text-sm font-medium text-amber-600 hover:text-amber-500 dark:text-amber-400"
                >
                  Impersonate
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <table className="hidden min-w-full divide-y divide-gray-200 sm:table dark:divide-white/10">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Slug
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Expires
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/10">
            {tenants.map((tenant) => (
              <tr key={tenant.id}>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                  {tenant.name}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {tenant.slug}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <Badge
                    color={
                      statusColors[
                        tenant.status as keyof typeof statusColors
                      ] ?? "gray"
                    }
                  >
                    {tenant.status}
                  </Badge>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {tenant.subscriptionPlan ?? "free"}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {tenant.subscriptionExpiresAt
                    ? new Date(
                        tenant.subscriptionExpiresAt,
                      ).toLocaleDateString()
                    : "-"}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/super-admin/tenants/${tenant.id}`}
                      className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                    >
                      View
                    </Link>
                    <Link
                      href={`/super-admin/tenants/${tenant.id}/impersonate`}
                      className="font-medium text-amber-600 hover:text-amber-500 dark:text-amber-400"
                    >
                      Impersonate
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {tenants.length === 0 && (
          <p className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No tenants yet.
          </p>
        )}
      </div>
    </div>
  );
}
