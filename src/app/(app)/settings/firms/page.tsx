import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { getFirms, setDefaultFirm } from "@/actions/firms";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { BuildingOfficeIcon } from "@heroicons/react/24/outline";

export default async function FirmsPage() {
  await requireAdmin();
  const firms = await getFirms();

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Firms"
        description="Manage your business firms"
        action={
          <Link href="/settings/firms/new">
            <Button>Add Firm</Button>
          </Link>
        }
      />

      {firms.length === 0 ? (
        <EmptyState
          icon={BuildingOfficeIcon}
          title="No firms"
          description="Get started by adding your first firm."
          action={
            <Link href="/settings/firms/new">
              <Button>Add Firm</Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* Mobile view */}
          <div className="space-y-3 sm:hidden">
            {firms.map((firm) => (
              <div
                key={firm.id}
                className="rounded-lg bg-white px-4 py-4 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10"
              >
                <Link
                  href={`/settings/firms/${firm.id}/edit`}
                  className="block"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {firm.name}
                    </span>
                    <div className="flex items-center gap-1">
                      {firm.isDefault && (
                        <Badge color="indigo">Default</Badge>
                      )}
                      <Badge color={firm.isGstRegistered ? "green" : "gray"}>
                        {firm.isGstRegistered ? "GST" : "Non-GST"}
                      </Badge>
                    </div>
                  </div>
                  {firm.phone && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {firm.phone}
                    </p>
                  )}
                </Link>
                {!firm.isDefault && (
                  <form
                    action={async () => {
                      "use server";
                      await setDefaultFirm(firm.id);
                    }}
                    className="mt-3 border-t border-gray-100 pt-2 dark:border-white/10"
                  >
                    <button
                      type="submit"
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      Set as default
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>

          {/* Desktop view */}
          <div className="hidden sm:block">
            <div className="overflow-hidden shadow-sm ring-1 ring-black/5 sm:rounded-lg dark:shadow-none dark:ring-white/10">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-white/10">
                <thead className="bg-gray-50 dark:bg-gray-800/75">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 dark:text-gray-200">
                      Name
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                      Phone
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                      GST Status
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                      GST Number
                    </th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Edit</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-white/10 dark:bg-gray-800/50">
                  {firms.map((firm) => (
                    <tr key={firm.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 dark:text-white">
                        <span className="inline-flex items-center gap-2">
                          {firm.name}
                          {firm.isDefault && (
                            <Badge color="indigo">Default</Badge>
                          )}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {firm.phone || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <Badge color={firm.isGstRegistered ? "green" : "gray"}>
                          {firm.isGstRegistered ? "GST" : "Non-GST"}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {firm.gstNumber || "—"}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex justify-end gap-3">
                          {!firm.isDefault && (
                            <form
                              action={async () => {
                                "use server";
                                await setDefaultFirm(firm.id);
                              }}
                            >
                              <button
                                type="submit"
                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                              >
                                Set as default
                              </button>
                            </form>
                          )}
                          <Link
                            href={`/settings/firms/${firm.id}/edit`}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
