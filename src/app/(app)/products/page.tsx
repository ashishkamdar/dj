import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { getProducts } from "@/actions/products";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CubeIcon } from "@heroicons/react/24/outline";
import { ProductsTable } from "@/components/products/products-table";

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
        <ProductsTable products={products} />
      )}
    </div>
  );
}
