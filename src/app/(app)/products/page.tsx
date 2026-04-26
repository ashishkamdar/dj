import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { getProducts } from "@/actions/products";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CubeIcon } from "@heroicons/react/24/outline";
import { formatCurrency } from "@/lib/utils";

export default async function ProductsPage() {
  await requireAdmin();
  const products = await getProducts();

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Products"
        description="Manage your product catalog"
        action={
          <Link href="/products/new">
            <Button>Add Product</Button>
          </Link>
        }
      />

      {products.length === 0 ? (
        <EmptyState
          icon={CubeIcon}
          title="No products"
          description="Get started by adding your first product."
          action={
            <Link href="/products/new">
              <Button>Add Product</Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* Mobile view */}
          <div className="space-y-3 sm:hidden">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}/edit`}
                className="block rounded-lg bg-white px-4 py-4 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {product.name}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {(product.defaultRate ?? 0) > 0
                      ? `${formatCurrency(product.defaultRate!)}/${product.defaultUnit}`
                      : product.defaultUnit}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.hsnCode && (
                    <Badge color="blue">HSN: {product.hsnCode}</Badge>
                  )}
                  {(product.gstRatePercent ?? 0) > 0 && (
                    <Badge color="indigo">GST: {product.gstRatePercent}%</Badge>
                  )}
                  {product.category && (
                    <Badge color="gray">{product.category}</Badge>
                  )}
                </div>
              </Link>
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
                      Rate
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                      Unit
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                      HSN
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                      GST%
                    </th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Edit</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-white/10 dark:bg-gray-800/50">
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 dark:text-white">
                        {product.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {(product.defaultRate ?? 0) > 0 ? formatCurrency(product.defaultRate!) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {product.defaultUnit}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {product.hsnCode || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {product.gstRatePercent ?? 0}%
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <Link
                          href={`/products/${product.id}/edit`}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          Edit
                        </Link>
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
